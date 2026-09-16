// app/services/stockAutoTrader.js - AI 끝장토론 종목 기반 토스증권 자동매매 및 매매일지 관리 엔진 (1종목 1주 단일 매매)
const fs = require('fs');
const path = require('path');
const tossClient = require('../utils/tossInvestClient');
const telegramBot = require('../utils/telegramBotHelper');

class StockAutoTrader {
  constructor() {
    this.timer = null;
    this.isTicking = false;
    this.tickIntervalMs = 300000; // 5분 주기 감시
    this.dataDir = path.join(__dirname, '..', '..', 'data');
    this.journalFile = path.join(this.dataDir, 'stockTradingJournal.json');
    this.configFile = path.join(this.dataDir, 'tossConfig.json');
    this.debateLogsFile = path.join(this.dataDir, 'stockDebateLogs.json');
    this.councilReportsFile = path.join(this.dataDir, 'stockCouncilReports.json');
  }

  init() {
    const cfg = this.getConfig();
    if (cfg.isAutoTradingEnabled) {
      this.startDaemon();
    }
  }

  getConfig() {
    return tossClient.getConfig();
  }

  saveConfig(newCfg) {
    return tossClient.saveConfig(newCfg);
  }

  getJournalData() {
    try {
      if (fs.existsSync(this.journalFile)) {
        const raw = fs.readFileSync(this.journalFile, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          currentPosition: parsed.currentPosition || null,
          history: Array.isArray(parsed.history) ? parsed.history : [],
          stats: parsed.stats || { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, totalProfitKrw: 0 },
          lastCheckAt: parsed.lastCheckAt || null
        };
      }
    } catch (e) {
      console.warn('[StockAutoTrader] Failed to read journal file:', e.message);
    }
    return {
      currentPosition: null,
      history: [],
      stats: { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, totalProfitKrw: 0 },
      lastCheckAt: null
    };
  }

  saveJournalData(data) {
    try {
      fs.writeFileSync(this.journalFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('[StockAutoTrader] Failed to save journal file:', e.message);
    }
  }

  startDaemon() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.runTick(), this.tickIntervalMs);
    console.log('[StockAutoTrader] Daemon started (5m interval - 1종목 1주 예약/매수 감시)');
    setTimeout(() => this.runTick(), 1000);
  }

  stopDaemon() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[StockAutoTrader] Daemon stopped');
  }

  /**
   * 자동매매 ON / OFF 토글
   */
  toggleAutoTrading(enabled) {
    const cfg = tossClient.saveConfig({ isAutoTradingEnabled: enabled });
    if (enabled) {
      this.startDaemon();
      telegramBot.sendGeneralMessage('🤖 <b>[토스증권 AI 자동매매 가동]</b><br>• 운용 원칙: 1회 1종목 <b>1주(10만원 이하)</b> 단일 매매<br>• 장마감 시: <b>예약매수 접수중</b> 상태 등록 후 개장 시 전송<br>• 정규장 시: 즉시 1주 매수 주문 및 체결 후 매매일지 등록<br>• 목표가(+15%) 익절 / 손절가(-5%) 청산 엄수');
    } else {
      this.stopDaemon();
      telegramBot.sendGeneralMessage('⏸️ <b>[토스증권 AI 자동매매 일시정지]</b><br>자동매매 엔진이 <b>정지(OFF)</b>되었습니다.');
    }
    return cfg;
  }

  /**
   * 끝장토론실에서 10만원 이하 매수 적합 최신 1종목 탐색 (국장/미장 세션 분리 및 환율 10만원 엄격 적용)
   */
  async findNextCandidateStock() {
    try {
      // 🌟 [1종목 1주 단일 매매 안전 장치] 이미 보유 포지션이 있는 경우 신규 종목 탐색 원천 차단
      const journal = this.getJournalData();
      if (journal.currentPosition) {
        console.log(`[StockAutoTrader] 현재 포지션(${journal.currentPosition.stockName}) 운용 중 - 신규 종목 탐색 중단 (1종목 1주 단일 투자 원칙 엄수)`);
        return null;
      }

      let debateList = [];
      if (fs.existsSync(this.debateLogsFile)) {
        debateList = JSON.parse(fs.readFileSync(this.debateLogsFile, 'utf8'));
      }

      // 1. 현재 시각 기준 타깃 시장(KR 또는 US) 및 실시간 환율 판정
      const targetMarket = tossClient.getTargetMarketForTrading();
      const fxRate = await tossClient.fetchUsdkrwRate();
      console.log(`[StockAutoTrader] 종목 탐색 시작: 목표 시장 [${targetMarket}], 실시간 환율 [${fxRate}원/USD]`);

      for (const d of debateList) {
        const itemCode = String(d.item_code || '').trim();
        if (!itemCode) continue;

        // 매수 의결 종목 판별
        const isBuyAction = (d.final_action && d.final_action.includes('BUY')) ||
          (d.action_title && (d.action_title.includes('매수') || d.action_title.includes('분할')));

        if (!isBuyAction) continue;

        const isKrStock = /^[0-9]{6}$/.test(itemCode);
        const itemMarket = isKrStock ? 'KR' : 'US';

        // 🌟 핵심: 현재 목표 시장 세션(KR vs US)과 일치하는 종목만 선정
        if (itemMarket !== targetMarket) {
          continue;
        }

        // 토스증권 실시간 현재가 조회 (추측 배제)
        let rawLivePrice = 0;
        let currency = isKrStock ? 'KRW' : 'USD';
        const quote = await tossClient.getQuote(itemCode);
        if (quote && quote.lastPrice > 0) {
          rawLivePrice = quote.lastPrice;
          if (quote.currency) currency = quote.currency;
        } else {
          console.warn(`[StockAutoTrader] 토스증권 실시간 시세 조회 불가 (${itemCode}) - IP 허용 여부 및 토큰 확인 필요`);
          break; // 토스증권 API 연결/인증 실패 시 무한 루프 방지
        }

        // 🌟 핵심: 통화 구분 및 원화 환산가 계산
        let usdPrice = 0;
        let krwPrice = 0;

        if (currency === 'USD' || itemMarket === 'US') {
          usdPrice = rawLivePrice;
          krwPrice = Math.round(usdPrice * fxRate);
        } else {
          krwPrice = Math.round(rawLivePrice);
          usdPrice = parseFloat((krwPrice / fxRate).toFixed(2));
        }

        // 🌟 10만원 이하 종목만 엄격 필터링 (미국 주식도 원화 환산 10만원 이하만 통과)
        if (krwPrice <= 0 || krwPrice > 100000) {
          console.log(`[StockAutoTrader] 10만원 초과 제외: ${d.stock_name} (${itemCode}) - 원화 환산 ${krwPrice.toLocaleString()}원`);
          continue;
        }

        // 목표가 (+15%) 및 손절가 (-5%) 계산 (통화별 금액)
        let targetPrice = isKrStock ? Math.round(krwPrice * 1.15) : parseFloat((usdPrice * 1.15).toFixed(2));
        let stopLossPrice = isKrStock ? Math.round(krwPrice * 0.95) : parseFloat((usdPrice * 0.95).toFixed(2));

        if (Array.isArray(d.turns)) {
          for (const t of d.turns) {
            const msg = t.message || '';
            if (msg.includes('손절선 -5%')) stopLossPrice = isKrStock ? Math.round(krwPrice * 0.95) : parseFloat((usdPrice * 0.95).toFixed(2));
            else if (msg.includes('손절선 -7%')) stopLossPrice = isKrStock ? Math.round(krwPrice * 0.93) : parseFloat((usdPrice * 0.93).toFixed(2));
            else if (msg.includes('손절선 -10%')) stopLossPrice = isKrStock ? Math.round(krwPrice * 0.90) : parseFloat((usdPrice * 0.90).toFixed(2));
          }
        }

        return {
          id: d.id,
          stockName: d.stock_name,
          itemCode,
          market: itemMarket,
          currency,
          fxRate,
          usdPrice,
          krwPrice,
          currentPrice: isKrStock ? krwPrice : usdPrice,
          targetPrice,
          stopLossPrice,
          targetPriceKrw: Math.round(krwPrice * 1.15),
          stopLossPriceKrw: Math.round(krwPrice * 0.95),
          summary: d.verdict_summary || d.topic || 'AI 끝장토론 매수 의결'
        };
      }
    } catch (e) {
      console.error('[StockAutoTrader] findNextCandidateStock error:', e.message);
    }
    return null;
  }

  /**
   * 토스증권 실제 계좌 잔고(보유 주식) 및 미체결 주문 동기화
   * 1회 1종목 1주 단일 투자 원칙 엄수를 위해 실계좌 상태를 매매일지 Source of Truth로 반영
   * @param {Object} journal - 매매일지 데이터 객체
   * @returns {Promise<boolean>} true면 활성 포지션 또는 미체결 주문이 존재함
   */
  async syncHoldingsWithToss(journal) {
    if (!tossClient.isConfigured()) return Boolean(journal?.currentPosition);

    try {
      // 1. 토스증권 실제 보유 종목(잔고) 조회
      const holdingsRes = await tossClient.getHoldings();
      if (holdingsRes && holdingsRes.success && holdingsRes.data) {
        const items = holdingsRes.data.items || [];
        const activeHoldings = items.filter(it => Number(it.quantity) > 0);

        if (activeHoldings.length > 0) {
          // 실계좌에 1개 이상의 주식이 실제로 체결 보유되어 있음!
          const topHolding = activeHoldings[0];
          const symbol = String(topHolding.symbol).trim();
          const quantity = Number(topHolding.quantity) || 1;
          const avgPrice = parseFloat(topHolding.averagePurchasePrice) || parseFloat(topHolding.lastPrice) || 0;
          const lastPrice = parseFloat(topHolding.lastPrice) || avgPrice;
          const isKr = (topHolding.marketCountry === 'KR') || /^[0-9]{6}$/.test(symbol);
          const currency = topHolding.currency || (isKr ? 'KRW' : 'USD');

          let fxRate = journal.currentPosition?.fxRate || 1350;
          if (!isKr || currency === 'USD') {
            try {
              const liveFx = await tossClient.fetchUsdkrwRate();
              if (liveFx && liveFx > 500) fxRate = liveFx;
            } catch (e) {}
          }

          const krwPrice = currency === 'KRW' ? Math.round(lastPrice) : Math.round(lastPrice * fxRate);
          const usdPrice = currency === 'USD' ? lastPrice : parseFloat((krwPrice / fxRate).toFixed(2));
          const avgKrw = currency === 'KRW' ? Math.round(avgPrice) : Math.round(avgPrice * fxRate);

          const cur = journal.currentPosition;
          const isSameStock = cur && cur.itemCode === symbol && cur.status === 'FILLED';

          if (!isSameStock) {
            console.log(`[StockAutoTrader] 🔄 토스증권 실계좌 보유 주식 감지 [${topHolding.name || symbol}] - 매매일지 FILLED 포지션 자동 복원/동기화`);
            journal.currentPosition = {
              stockName: topHolding.name || cur?.stockName || symbol,
              itemCode: symbol,
              market: isKr ? 'KR' : 'US',
              currency,
              fxRate,
              usdPrice,
              krwPrice,
              status: 'FILLED',
              quantity,
              entryPrice: avgPrice,
              averagePrice: avgPrice,
              currentPrice: lastPrice,
              totalInvestedKrw: avgKrw * quantity,
              unrealizedPnl: Math.round((lastPrice - avgPrice) * (currency === 'KRW' ? quantity : (quantity * fxRate))),
              returnPct: avgPrice > 0 ? parseFloat((((lastPrice - avgPrice) / avgPrice) * 100).toFixed(2)) : 0.0,
              targetPrice: currency === 'KRW' ? Math.round(avgPrice * 1.15) : parseFloat((avgPrice * 1.15).toFixed(2)),
              stopLossPrice: currency === 'KRW' ? Math.round(avgPrice * 0.95) : parseFloat((avgPrice * 0.95).toFixed(2)),
              targetPriceKrw: Math.round(avgKrw * 1.15),
              stopLossPriceKrw: Math.round(avgKrw * 0.95),
              orderId: (cur && cur.itemCode === symbol) ? cur.orderId : null,
              debateId: (cur && cur.itemCode === symbol) ? cur.debateId : null,
              debateSummary: (cur && cur.itemCode === symbol) ? cur.debateSummary : '토스증권 실계좌 보유 종목',
              startedAt: (cur && cur.itemCode === symbol && cur.startedAt) || new Date().toISOString(),
              filledAt: (cur && cur.itemCode === symbol && cur.filledAt) || new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
              note: `토스증권 실계좌 보유 잔고 자동 동기화 (${topHolding.name || symbol} ${quantity}주 보유 중)`
            };
            this.saveJournalData(journal);
          } else {
            // 이미 동기화된 종목인 경우 실시간 시세 및 평가손익 업데이트
            cur.currentPrice = lastPrice;
            cur.krwPrice = krwPrice;
            cur.usdPrice = usdPrice;
            cur.fxRate = fxRate;
            cur.unrealizedPnl = Math.round((lastPrice - avgPrice) * (currency === 'KRW' ? quantity : (quantity * fxRate)));
            cur.returnPct = avgPrice > 0 ? parseFloat((((lastPrice - avgPrice) / avgPrice) * 100).toFixed(2)) : 0.0;
            cur.lastUpdatedAt = new Date().toISOString();
            this.saveJournalData(journal);
          }
          return true; // 실보유 주식 존재 -> 신규 매수 절대 차단
        } else if (journal.currentPosition && journal.currentPosition.status === 'FILLED') {
          // 실계좌 보유 주식이 0개인데 매매일지에 FILLED 포지션이 남아있다면 -> 토스증권 외부/앱에서 매도 체결된 것임
          console.log(`[StockAutoTrader] 토스 실계좌 보유 주식 0건 감지 -> 기존 포지션(${journal.currentPosition.stockName}) 청산 반영`);
          await this.executeExit(journal.currentPosition, journal, 'EXTERNAL_SELL', '토스증권 앱/외부 매도 체결 감지');
          return false;
        }
      }

      // 2. 보유 주식이 없다면, 토스증권 미체결/접수된 매수 주문이 있는지 확인
      const openOrders = await tossClient.getOpenOrders();
      if (Array.isArray(openOrders) && openOrders.length > 0) {
        const buyOrders = openOrders.filter(o => o.side === 'BUY');
        if (buyOrders.length > 0) {
          const ord = buyOrders[0];
          if (!journal.currentPosition) {
            const isKr = /^[0-9]{6}$/.test(ord.symbol);
            const ordPrice = parseFloat(ord.price) || 0;
            journal.currentPosition = {
              stockName: ord.symbol,
              itemCode: ord.symbol,
              market: isKr ? 'KR' : 'US',
              currency: ord.currency || (isKr ? 'KRW' : 'USD'),
              status: 'RESERVED',
              quantity: Number(ord.quantity) || 1,
              entryPrice: ordPrice,
              averagePrice: ordPrice,
              currentPrice: ordPrice,
              orderId: ord.orderId,
              startedAt: ord.orderedAt || new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
              note: `토스증권 미체결 매수 주문 동기화 (주문번호: ${ord.orderId})`
            };
            this.saveJournalData(journal);
          }
          return true; // 미체결 주문 진행 중 -> 신규 매수 차단
        }
      }

      return Boolean(journal.currentPosition);
    } catch (e) {
      console.warn('[StockAutoTrader] syncHoldingsWithToss error:', e.message);
      return Boolean(journal.currentPosition);
    }
  }

  /**
   * 주기적 감시 및 트레이딩 실행 루프 (Tick)
   */
  async runTick() {
    if (this.isTicking) return;
    this.isTicking = true;

    const journal = this.getJournalData();
    const cfg = this.getConfig();
    journal.lastCheckAt = new Date().toISOString();

    try {
      // 🌟 [1단계 실증] 토스증권 실제 계좌 잔고 및 미체결 주문 최우선 동기화
      const hasActiveTossPosition = await this.syncHoldingsWithToss(journal);

      let pos = journal.currentPosition;

      // 🌟 자가 치유 검증: 비정상 데이터 또는 시장 세션 불일치 시 자동 리셋 (단, 실계좌 보유 FILLED는 보존)
      if (pos && pos.status === 'RESERVED' && !pos.orderId) {
        const targetMarket = tossClient.getTargetMarketForTrading();
        const fxRate = pos.fxRate || 1350;
        const isUs = pos.market === 'US' || !/^[0-9]{6}$/.test(pos.itemCode);
        const realKrwPrice = isUs ? Math.round((pos.usdPrice || pos.currentPrice) * fxRate) : (pos.currentPrice || 0);

        if (realKrwPrice > 100000 || (isUs && pos.currentPrice < 1000 && !pos.currency) || (pos.market !== targetMarket)) {
          console.log(`[StockAutoTrader] 세션 변경 또는 부적합 포지션 자동 리셋: ${pos.stockName} (시장: ${pos.market} -> 목표: ${targetMarket}, 실환산가: ${realKrwPrice}원)`);
          journal.currentPosition = null;
          pos = null;
          this.saveJournalData(journal);
        }
      }

      // 🌟 [2단계] 활성 포지션 또는 실계좌 보유 주식이 있는 경우 -> 신규 매수 원천 차단 및 기존 포지션 관리만 수행
      if (hasActiveTossPosition || pos) {
        if (!pos) {
          this.saveJournalData(journal);
          return;
        }

        // A. 포지션이 'RESERVED'(예약매수 접수중 또는 미체결) 상태인 경우
        if (pos.status === 'RESERVED') {
          const isMarketOpen = tossClient.isRegularMarketOpen(pos.market);

          // 아직 주문이 나가지 않은 장마감 후 예약건인데 정규장이 열린 경우 -> 실제 주문 발주
          if (isMarketOpen && !pos.orderId) {
            console.log(`[StockAutoTrader] ${pos.market === 'US' ? '미국' : '국내'} 정규장 개장 감지 - 예약 종목(${pos.stockName}) 1주 주문 발주`);
            const orderResult = await tossClient.submitOrder({
              symbol: pos.itemCode,
              side: 'BUY',
              orderType: 'MARKET',
              quantity: 1
            });

            if (orderResult.success) {
              pos.orderId = orderResult.orderId;
              pos.lastUpdatedAt = new Date().toISOString();
              pos.note = `토스증권 실주문 접수 완료 (주문번호: ${pos.orderId})`;
              this.saveJournalData(journal);
              telegramBot.sendGeneralMessage(`📡 <b>[토스증권 AI 자동매매] 정규장 개장 실주문 접수</b><br>• 종목: ${pos.stockName} (<code>${pos.itemCode}</code>) 1주<br>• 주문번호: <code>${pos.orderId}</code><br>체결 여부를 실시간 감시합니다.`);
            } else {
              const errText = typeof orderResult.error === 'object' ? (orderResult.error.message || JSON.stringify(orderResult.error)) : String(orderResult.error || '알 수 없는 오류');
              console.error(`[StockAutoTrader] 정규장 주문 발주 실패:`, errText);
              pos.note = `주문 발주 재시도 대기: ${errText}`;
              this.saveJournalData(journal);
            }
          }
          // 이미 주문이 발주된 상태라면 -> 체결 여부 확인
          else if (pos.orderId) {
            const detail = await tossClient.getOrderDetail(pos.orderId);
            if (detail && (detail.status === 'FILLED' || (detail.execution && Number(detail.execution.filledQuantity) >= 1))) {
              const filledPrice = parseFloat(detail.execution.averageFilledPrice) || pos.currentPrice || pos.entryPrice;
              pos.status = 'FILLED';
              pos.entryPrice = filledPrice;
              pos.averagePrice = filledPrice;
              pos.currentPrice = filledPrice;
              pos.totalInvestedKrw = pos.currency === 'USD' ? Math.round(filledPrice * (pos.fxRate || 1350)) : filledPrice;
              pos.targetPrice = pos.currency === 'USD' ? parseFloat((filledPrice * 1.15).toFixed(2)) : Math.round(filledPrice * 1.15);
              pos.stopLossPrice = pos.currency === 'USD' ? parseFloat((filledPrice * 0.95).toFixed(2)) : Math.round(filledPrice * 0.95);
              pos.filledAt = (detail.execution && detail.execution.filledAt) || new Date().toISOString();
              pos.lastUpdatedAt = new Date().toISOString();
              const priceStr = pos.currency === 'USD' ? `$${filledPrice.toFixed(2)} (약 ${pos.totalInvestedKrw.toLocaleString()}원)` : `${filledPrice.toLocaleString()}원`;
              pos.note = `토스증권 실제 매수 체결 완료 (체결가: ${priceStr})`;
              this.saveJournalData(journal);

              telegramBot.sendGeneralMessage(
                `✅ <b>[토스증권 AI 자동매매] 1주 매수 체결 완료!</b><br><br>` +
                `• <b>종목명:</b> ${pos.stockName} (<code>${pos.itemCode}</code>)<br>` +
                `• <b>체결 수량:</b> 1주 (단일 매매 원칙)<br>` +
                `• <b>실제 체결단가:</b> <b>${priceStr}</b><br>` +
                `• <b>익절 목표가(+15%):</b> ${pos.targetPrice}<br>` +
                `• <b>손절 기준가(-5%):</b> ${pos.stopLossPrice}<br>` +
                `• <b>토스 주문번호:</b> <code>${pos.orderId}</code>`
              );
            }
          }
        }
        // B. 포지션이 'FILLED'(매수 체결 완료) 상태인 경우 -> 실시간 시세 및 익절/손절 감시
        else if (pos.status === 'FILLED') {
          const quote = await tossClient.getQuote(pos.itemCode);
          const livePrice = (quote && quote.lastPrice > 0) ? quote.lastPrice : pos.currentPrice;

          // 미국 주식인 경우 실시간 환율 갱신하여 원화 평가액 최신화
          if (pos.currency === 'USD' || pos.market === 'US') {
            try {
              const currentFx = await tossClient.fetchUsdkrwRate();
              if (currentFx && currentFx > 500) pos.fxRate = currentFx;
            } catch (e) {}
          }

          pos.currentPrice = livePrice;
          const pnl = livePrice - pos.averagePrice;
          pos.unrealizedPnl = (pos.currency === 'USD' || pos.market === 'US') ? Math.round(pnl * (pos.fxRate || 1350)) : Math.round(pnl);
          // 🌟 순수 주가 기준 수익률(+15% 익절 / -5% 손절 판정)
          pos.returnPct = parseFloat((((livePrice - pos.averagePrice) / pos.averagePrice) * 100).toFixed(2));
          pos.lastUpdatedAt = new Date().toISOString();

          // (1) 목표가(+15%) 달성 -> 전량(1주) 익절 매도
          if (livePrice >= pos.targetPrice) {
            await this.executeExit(pos, journal, 'PROFIT_TARGET', '🎯 목표가 달성 익절 매도');
          }
          // (2) 손절선(-5%) 도달 -> 전량(1주) 손절 매도
          else if (livePrice <= pos.stopLossPrice) {
            await this.executeExit(pos, journal, 'STOP_LOSS', '⛔ 손절선 도달 손절 매도');
          } else {
            this.saveJournalData(journal);
          }
        }
        return;
      }

      // 🌟 [3단계] 보유 포지션 및 미체결 주문이 완전히 0인 경우에만 신규 1종목 탐색 및 주문 착수
      if (!cfg.isAutoTradingEnabled) {
        this.saveJournalData(journal);
        return;
      }

      const candidate = await this.findNextCandidateStock();
      if (candidate) {
        await this.initiateSingleOrder(candidate, journal);
      } else {
        this.saveJournalData(journal);
      }
    } catch (err) {
      console.error('[StockAutoTrader] runTick Error:', err);
    } finally {
      this.isTicking = false;
    }
  }

  /**
   * 10만원 이하 1주 주문 착수 (장시간 체크: 정규장 외 -> 예약매수중, 정규장 -> 즉시 주문 접수)
   */
  async initiateSingleOrder(candidate, journal) {
    const isMarketOpen = tossClient.isRegularMarketOpen(candidate.market);
    const nowStr = new Date().toISOString();
    const price = candidate.currentPrice;
    const isKr = candidate.market === 'KR';
    const isUs = !isKr;
    const priceDisplay = isUs
      ? `$${candidate.usdPrice.toFixed(2)} (약 ${candidate.krwPrice.toLocaleString()}원)`
      : `${candidate.krwPrice.toLocaleString()}원`;

    // A. 장마감 후 또는 비영업일 -> 예약매수 등록
    if (!isMarketOpen) {
      const scheduleMsg = isKr
        ? '정규장 마감 후 예약매수 접수중 (익일 09:00 국장 개장 시 토스증권 1주 실주문 발주 예정)'
        : '정규장 마감 후 예약매수 접수중 (오늘 22:30 미장 개장 시 토스증권 1주 실주문 발주 예정)';

      const position = {
        stockName: candidate.stockName,
        itemCode: candidate.itemCode,
        market: candidate.market,
        currency: candidate.currency,
        fxRate: candidate.fxRate,
        usdPrice: candidate.usdPrice,
        krwPrice: candidate.krwPrice,
        status: 'RESERVED',
        quantity: 1,
        entryPrice: price,
        averagePrice: price,
        currentPrice: price,
        totalInvestedKrw: candidate.krwPrice,
        unrealizedPnl: 0,
        returnPct: 0.0,
        targetPrice: candidate.targetPrice,
        stopLossPrice: candidate.stopLossPrice,
        targetPriceKrw: candidate.targetPriceKrw,
        stopLossPriceKrw: candidate.stopLossPriceKrw,
        orderId: null,
        reservationType: 'AFTER_MARKET_SCHEDULED',
        debateId: candidate.id,
        debateSummary: candidate.summary,
        startedAt: nowStr,
        lastUpdatedAt: nowStr,
        note: scheduleMsg
      };

      journal.currentPosition = position;
      this.saveJournalData(journal);

      telegramBot.sendGeneralMessage(
        `⏰ <b>[토스증권 AI 자동매매] 장마감 후 예약매수 접수</b><br><br>` +
        `• <b>종목명:</b> ${candidate.stockName} (<code>${candidate.itemCode}</code>) [${isKr ? '국내주식' : '미국주식'}]<br>` +
        `• <b>주문 수량:</b> 1주 (10만원 이하 단일 매매)<br>` +
        `• <b>현재 기준가:</b> ${priceDisplay}<br>` +
        `• <b>진행 상태:</b> <b>예약매수 접수중 (RESERVED)</b><br>` +
        `• <b>안내:</b> ${scheduleMsg}`
      );
      return;
    }

    // B. 정규장 운영 시간 -> 토스증권 실제 주문 발주
    let orderResult = await tossClient.submitOrder({
      symbol: candidate.itemCode,
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 1
    });

    if (!orderResult.success) {
      const errText = typeof orderResult.error === 'object'
        ? (orderResult.error.message || JSON.stringify(orderResult.error))
        : String(orderResult.error || '알 수 없는 오류');
      console.error(`[StockAutoTrader] 실제 매수 주문 실패 (${candidate.stockName}):`, errText);
      telegramBot.sendGeneralMessage(`⚠️ <b>[토스증권 주문 오류]</b> ${candidate.stockName} 매수 주문 실패: ${errText}`);
      return;
    }

    const position = {
      stockName: candidate.stockName,
      itemCode: candidate.itemCode,
      market: candidate.market,
      currency: candidate.currency,
      fxRate: candidate.fxRate,
      usdPrice: candidate.usdPrice,
      krwPrice: candidate.krwPrice,
      status: 'RESERVED',
      quantity: 1,
      entryPrice: price,
      averagePrice: price,
      currentPrice: price,
      totalInvestedKrw: candidate.krwPrice,
      unrealizedPnl: 0,
      returnPct: 0.0,
      targetPrice: candidate.targetPrice,
      stopLossPrice: candidate.stopLossPrice,
      targetPriceKrw: candidate.targetPriceKrw,
      stopLossPriceKrw: candidate.stopLossPriceKrw,
      orderId: orderResult.orderId,
      debateId: candidate.id,
      debateSummary: candidate.summary,
      startedAt: nowStr,
      lastUpdatedAt: nowStr,
      note: `${isKr ? '국내주식 정규장(09:00~15:30)' : '미국주식 정규장(22:30~05:00)'} 1주 매수 주문 접수 완료 (주문번호: ${orderResult.orderId})`
    };

    journal.currentPosition = position;
    this.saveJournalData(journal);

    telegramBot.sendGeneralMessage(
      `📡 <b>[토스증권 AI 자동매매] 1주 매수 주문 접수</b><br><br>` +
      `• <b>종목명:</b> ${candidate.stockName} (<code>${candidate.itemCode}</code>)<br>` +
      `• <b>주문 수량:</b> 1주 (10만원 이하 단일 매매)<br>` +
      `• <b>기준 가격:</b> ${priceDisplay}<br>` +
      `• <b>토스 주문번호:</b> <code>${orderResult.orderId}</code><br>` +
      `체결 즉시 매매일지가 매수체결 완료로 업데이트됩니다.`
    );
  }

  /**
   * 전량(1주) 청산 매도 (목표가 익절 / 손절선 손절 / 비상 매도)
   */
  async executeExit(pos, journal, reasonCode, reasonTitle) {
    let orderResult = await tossClient.submitOrder({
      symbol: pos.itemCode,
      side: 'SELL',
      orderType: 'MARKET',
      quantity: 1
    });

    if (!orderResult.success) {
      console.error(`[StockAutoTrader] ${reasonTitle} 매도 주문 실패:`, orderResult.error);
    }

    const exitPrice = pos.currentPrice;
    const isUs = pos.market === 'US' || pos.currency === 'USD';
    let exitFxRate = pos.fxRate || 1350;
    if (isUs) {
      try {
        const liveFx = await tossClient.fetchUsdkrwRate();
        if (liveFx && liveFx > 500) exitFxRate = liveFx;
      } catch (e) {}
    }
    const realizedPnl = exitPrice - pos.averagePrice;
    const returnPct = parseFloat(((realizedPnl / pos.averagePrice) * 100).toFixed(2));
    const realizedPnlKrw = isUs ? Math.round(realizedPnl * exitFxRate) : Math.round(realizedPnl);
    const nowStr = new Date().toISOString();

    const journalItem = {
      id: `JRN-${Date.now()}`,
      stockName: pos.stockName,
      itemCode: pos.itemCode,
      market: pos.market,
      currency: pos.currency || (isUs ? 'USD' : 'KRW'),
      entryFxRate: isUs ? (pos.fxRate || null) : null,
      exitFxRate: isUs ? exitFxRate : null,
      totalQuantity: 1,
      averagePrice: pos.averagePrice,
      exitPrice,
      investedAmount: pos.averagePrice,
      proceedsAmount: exitPrice,
      realizedPnl,
      realizedPnlKrw,
      returnPct,
      reasonCode,
      reasonTitle,
      orderId: pos.orderId,
      sellOrderId: orderResult.orderId || null,
      startedAt: pos.startedAt,
      closedAt: nowStr,
      note: `${reasonTitle} 완료`
    };

    journal.history.unshift(journalItem);
    journal.currentPosition = null;

    // 누적 통계 업데이트
    const stats = journal.stats;
    stats.totalTrades++;
    if (realizedPnl > 0) stats.winTrades++;
    else if (realizedPnl < 0) stats.lossTrades++;
    stats.winRate = stats.totalTrades > 0 ? parseFloat(((stats.winTrades / stats.totalTrades) * 100).toFixed(1)) : 0;
    stats.totalProfitKrw += realizedPnlKrw;

    this.saveJournalData(journal);

    // 텔레그램 알림 전송
    const isWin = realizedPnl >= 0;
    const pnlSign = isWin ? '+' : '';
    const emoji = isWin ? '🎯' : '⛔';
    const priceStrBuy = isUs ? `$${pos.averagePrice.toFixed(2)}` : `${pos.averagePrice.toLocaleString()}원`;
    const priceStrSell = isUs ? `$${exitPrice.toFixed(2)}` : `${exitPrice.toLocaleString()}원`;
    const pnlStr = isUs ? `${pnlSign}$${realizedPnl.toFixed(2)} (약 ${pnlSign}${realizedPnlKrw.toLocaleString()}원, ${pnlSign}${returnPct}%)` : `${pnlSign}${realizedPnl.toLocaleString()}원 (${pnlSign}${returnPct}%)`;

    const tgMsg = `${emoji} <b>[토스증권 AI 자동매매] ${reasonTitle} 완료!</b><br><br>` +
      `• <b>종목명:</b> ${journalItem.stockName} (<code>${journalItem.itemCode}</code>)<br>` +
      `• <b>매수단가:</b> ${priceStrBuy}<br>` +
      `• <b>매도단가:</b> ${priceStrSell} (1주 전량 청산)<br>` +
      `• <b>실현 손익:</b> <b>${pnlStr}</b><br><br>` +
      `✨ 포지션 청산 완료. 다음 AI 끝장토론 발굴 종목(10만원 이하)을 자동 탐색하여 1주 매매를 이어갑니다.`;
    telegramBot.sendGeneralMessage(tgMsg);

    return journalItem;
  }

  /**
   * 사용자 비상 전량 매도
   */
  async emergencySell() {
    const journal = this.getJournalData();
    const pos = journal.currentPosition;
    if (!pos) {
      return { success: false, message: '현재 보유 중인 포지션이 없습니다.' };
    }
    const result = await this.executeExit(pos, journal, 'EMERGENCY_SELL', '🚨 사용자 비상 전량 매도');
    return { success: true, message: `${pos.stockName} 1주 전량 매도가 완료되었습니다.`, item: result };
  }
}

module.exports = new StockAutoTrader();
