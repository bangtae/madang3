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
    this.scalpingStatusFile = path.join(this.dataDir, 'scalpingStatus.json');

    // [초단타 스캘핑 엔진] 국장 개장 실시간 거래대금 1위(10만원 이하) 상태 관리
    this.scalpingTimer = null;
    this.scalpingOpenWaitTimer = null;
    this.marketTimingTimer = null;
    this.alertLog = {};
    this.scalpingIntervalMs = 5000; // 5초 주기 초고속 감시
    this.scalpingConfig = {
      autoScheduleEnabled: false // 09:00 개장 자동 실행 스케줄
    };
    this.scalpingStatus = {
      isActive: false,
      isWaitingMarketOpen: false,
      targetProfitPct: 2.5,
      stopLossPct: -1.5,
      currentPosition: null,
      lastCheckAt: null,
      history: []
    };
    this.isEnteringScalp = false; // 초단타 진입 중복 방지 락
  }

  init() {
    const cfg = this.getConfig();
    if (cfg.isAutoTradingEnabled) {
      this.startDaemon();
    }
    // 저널에서 scalpingConfig 복원
    try {
      const journal = this.getJournalData();
      if (journal.scalpingConfig) {
        this.scalpingConfig = { ...this.scalpingConfig, ...journal.scalpingConfig };
      }
    } catch (e) {}

    // 초단타 상태 및 이력 영구 파일 복원
    this.loadScalpingStatus();

    // 마켓 타이밍 알림 & 스케줄 모니터링 데몬 시작
    this.startMarketTimingDaemon();
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
          customStrategies: Array.isArray(parsed.customStrategies) ? parsed.customStrategies : [],
          history: Array.isArray(parsed.history) ? parsed.history : [],
          stats: parsed.stats || { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, totalProfitKrw: 0 },
          scalpingConfig: parsed.scalpingConfig || { autoScheduleEnabled: false },
          lastCheckAt: parsed.lastCheckAt || null
        };
      }
    } catch (e) {
      console.warn('[StockAutoTrader] Failed to read journal file:', e.message);
    }
    return {
      currentPosition: null,
      customStrategies: [],
      history: [],
      stats: { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, totalProfitKrw: 0 },
      scalpingConfig: { autoScheduleEnabled: false },
      lastCheckAt: null
    };
  }

  saveJournalData(data) {
    try {
      if (!data.scalpingConfig && this.scalpingConfig) {
        data.scalpingConfig = this.scalpingConfig;
      }
      if (fs.existsSync(this.journalFile)) {
        try {
          const diskRaw = fs.readFileSync(this.journalFile, 'utf8');
          const diskData = JSON.parse(diskRaw);
          if (Array.isArray(diskData.customStrategies) && Array.isArray(data.customStrategies)) {
            const diskIds = new Set(diskData.customStrategies.map(s => s.id));
            data.customStrategies = data.customStrategies.filter(s => diskIds.has(s.id));
          }
        } catch (e) {}
      }
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
   * 🌟 [3대 전략 상호 중복 방지] 현재 활성화된(보유/대기/감시중) 모든 종목코드 Set 반환
   * @param {'CURRENT_POSITION'|'CUSTOM_STRATEGY'|'SCALPING'|null} excludeCategory 제외할 본인 카테고리
   * @returns {Set<string>}
   */
  getActiveTradingSymbols(excludeCategory = null) {
    const symbols = new Set();
    try {
      const journal = this.getJournalData();

      // 1. 실시간 집중 운용 포지션
      if (excludeCategory !== 'CURRENT_POSITION' && journal.currentPosition) {
        const sym = String(journal.currentPosition.itemCode || '').trim();
        if (sym && journal.currentPosition.status !== 'CLOSED') {
          symbols.add(sym);
        }
      }

      // 2. 관리자 맞춤 전략 운용 (감시중, 주문완료, 체결보유중인 활성 전략들)
      if (excludeCategory !== 'CUSTOM_STRATEGY' && Array.isArray(journal.customStrategies)) {
        for (const strat of journal.customStrategies) {
          const sym = String(strat.itemCode || '').trim();
          if (sym && strat.status !== 'CLOSED' && strat.status !== 'CANCELLED') {
            symbols.add(sym);
          }
        }
      }

      // 3. 초단타 스캘핑 운용 포지션
      if (excludeCategory !== 'SCALPING' && this.scalpingStatus?.currentPosition) {
        const sym = String(this.scalpingStatus.currentPosition.symbol || '').trim();
        if (sym && this.scalpingStatus.currentPosition.status !== 'CLOSED') {
          symbols.add(sym);
        }
      }
    } catch (e) {
      console.error('[StockAutoTrader] getActiveTradingSymbols error:', e.message);
    }
    return symbols;
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

      // 🌟 [3대 전략 중복 방지] 맞춤 전략 및 초단타에서 이미 운용 중인 종목 제외 세트 계산
      const crossExcludedSymbols = this.getActiveTradingSymbols('CURRENT_POSITION');

      let debateList = [];
      if (fs.existsSync(this.debateLogsFile)) {
        debateList = JSON.parse(fs.readFileSync(this.debateLogsFile, 'utf8'));
      }

      // 1. 현재 시각 기준 타깃 시장(KR 또는 US) 및 실시간 환율 판정
      const targetMarket = tossClient.getTargetMarketForTrading();
      const fxRate = await tossClient.fetchUsdkrwRate();
      console.log(`[StockAutoTrader] 종목 탐색 시작: 목표 시장 [${targetMarket}], 실시간 환율 [${fxRate}원/USD], 중복 제외 대상: [${Array.from(crossExcludedSymbols).join(', ')}]`);

      for (const d of debateList) {
        const itemCode = String(d.item_code || '').trim();
        if (!itemCode) continue;

        // 🌟 3대 전략 중복 방지: 맞춤 전략이나 초단타에서 운용 중인 종목이면 차순위 다음 토론 종목으로 자동 우회
        if (crossExcludedSymbols.has(itemCode)) {
          console.log(`[StockAutoTrader] 종목 우회: ${d.stock_name} (${itemCode}) - 맞춤 전략 또는 초단타에서 이미 운용 중이므로 차순위 탐색`);
          continue;
        }

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

      // 🌟 [관리자 맞춤 전략 독립 감시 엔진 실행] (10만원 제한 해제 및 독립 다중 포지션 운용)
      await this.processCustomStrategies(journal);

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
   * 관리자 맞춤 전략 등록 (신규 매수 감시 또는 기존 보유 종목 매도 감시 / 10만원 제한 해제)
   */
  registerCustomStrategy(data) {
    const journal = this.getJournalData();
    if (!Array.isArray(journal.customStrategies)) {
      journal.customStrategies = [];
    }

    const itemCode = String(data.itemCode || data.symbol || '').trim();
    const stockName = String(data.stockName || itemCode).trim();
    const market = data.market || (/^[0-9]{6}$/.test(itemCode) ? 'KR' : 'US');
    const isExistingHolding = Boolean(data.isExistingHolding || data.mode === 'HOLD' || data.triggerType === 'HOLDING');
    const triggerType = isExistingHolding ? 'HOLDING' : (data.triggerType || 'PULLBACK');
    const buyTriggerPrice = Number(data.buyTriggerPrice) || 0;
    const entryPrice = isExistingHolding ? (Number(data.entryPrice) || buyTriggerPrice || 0) : null;
    const quantity = Math.max(1, parseInt(data.quantity, 10) || 1);
    const targetPrice1 = Number(data.targetPrice1) || 0;
    const targetPrice2 = Number(data.targetPrice2) || null;
    const stopLossPrice = Number(data.stopLossPrice) || 0;
    const notes = data.notes || '';

    if (!itemCode) throw new Error('종목코드가 필요합니다.');

    // 🌟 [3대 전략 상호 중복 방지] 집중 운용 포지션 또는 초단타로 이미 운용 중인 종목인지 검증
    const crossActiveSymbols = this.getActiveTradingSymbols('CUSTOM_STRATEGY');
    if (crossActiveSymbols.has(itemCode)) {
      throw new Error(`[중복 등록 불가] '${stockName} (${itemCode})' 종목은 현재 실시간 집중 운용 포지션 또는 초단타 스캘핑에서 이미 운용 중입니다.`);
    }
    if (isExistingHolding) {
      if (!entryPrice || entryPrice <= 0) throw new Error('보유 중인 주식의 매수 평단가를 입력해주세요.');
    } else {
      if (triggerType !== 'IMMEDIATE' && buyTriggerPrice <= 0) throw new Error('매수 기준 가격이 올바르지 않습니다.');
    }
    if (targetPrice1 <= 0) throw new Error('1차 목표가는 필수입니다.');
    if (stopLossPrice <= 0) throw new Error('최종 손절가는 필수입니다.');

    const enableAveraging = Boolean(data.enableAveraging);
    const averagingPrice = Number(data.averagingPrice) || 0;
    const averagingQty = Math.max(1, parseInt(data.averagingQty, 10) || 1);

    if (enableAveraging) {
      if (averagingPrice <= 0) throw new Error('물타기(추가 매수) 기준 가격을 올바르게 입력해주세요.');
      if (averagingQty < 1) throw new Error('물타기 추가 매수 수량을 1주 이상 입력해주세요.');
    }

    const isKr = market === 'KR' || /^[0-9]{6}$/.test(itemCode);
    const fmtPrice = (p) => isKr ? `${Number(p).toLocaleString()}원` : `$${Number(p).toFixed(2)}`;

    const newStrategy = {
      id: `strat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      stockName,
      itemCode,
      market,
      isExistingHolding,
      triggerType,
      buyTriggerPrice: isExistingHolding ? entryPrice : buyTriggerPrice,
      quantity,
      remainingQty: quantity,
      targetPrice1,
      targetPrice2,
      stopLossPrice,
      enableAveraging,
      averagingPrice: enableAveraging ? averagingPrice : 0,
      averagingQty: enableAveraging ? averagingQty : 0,
      averagingStatus: enableAveraging ? 'WATCHING' : 'NONE',
      status: isExistingHolding ? 'FILLED' : 'WATCHING',
      entryPrice: isExistingHolding ? entryPrice : null,
      currentPrice: isExistingHolding ? entryPrice : buyTriggerPrice,
      unrealizedPnl: 0,
      returnPct: 0.0,
      orderId: null,
      orderHistory: isExistingHolding ? [{
        type: 'EXISTING_HOLDING_REGISTERED',
        quantity,
        price: entryPrice,
        timestamp: new Date().toISOString(),
        note: '관리자 기존 보유 종목 등록'
      }] : [],
      notes,
      note: isExistingHolding ? `기존 보유 종목 등록 (${quantity}주 보유중, 목표가/손절 실시간 감시)` : '신규 매수 감시 대기중',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };

    journal.customStrategies.unshift(newStrategy);
    fs.writeFileSync(this.journalFile, JSON.stringify(journal, null, 2), 'utf8');

    if (isExistingHolding) {
      telegramBot.sendGeneralMessage(
        `📦 <b>[토스증권] 관리자 기존 보유 종목 등록 완료!</b><br><br>` +
        `• <b>종목명:</b> ${stockName} (<code>${itemCode}</code>) [${isKr ? '국내' : '미국'}]<br>` +
        `• <b>보유 수량:</b> <b>${quantity}주</b><br>` +
        `• <b>매수 평단가:</b> ${fmtPrice(entryPrice)}<br>` +
        (enableAveraging ? `• <b>물타기 감시:</b> ${fmtPrice(averagingPrice)} 이하 시 +${averagingQty}주 추가 매수<br>` : '') +
        `• <b>1차 목표 청산가:</b> ${fmtPrice(targetPrice1)} (분할 익절)<br>` +
        (targetPrice2 ? `• <b>2차 목표 청산가:</b> ${fmtPrice(targetPrice2)} (잔여 익절)<br>` : '') +
        `• <b>최종 손절가:</b> ${fmtPrice(stopLossPrice)} (전량 손절)<br>` +
        (notes ? `• <b>전략 메모:</b> ${notes}<br>` : '') +
        `• <b>운용 상태:</b> <b>실시간 익절/손절 매도 감시 가동 (보유중)</b>`
      );
    } else {
      const triggerDesc = triggerType === 'PULLBACK' ? '눌림목 매수 (이하 도달 시)' : (triggerType === 'BREAKOUT' ? '돌파 매수 (이상 돌파 시)' : '즉시 매수');
      telegramBot.sendGeneralMessage(
        `🎯 <b>[토스증권] 관리자 맞춤 전략 신규 등록!</b><br><br>` +
        `• <b>종목명:</b> ${stockName} (<code>${itemCode}</code>) [${isKr ? '국내' : '미국'}]<br>` +
        `• <b>매수 조건:</b> ${triggerDesc}<br>` +
        `• <b>기준 매수가:</b> ${fmtPrice(buyTriggerPrice)} | <b>주문 수량:</b> ${quantity}주<br>` +
        `• <b>1차 목표 청산가:</b> ${fmtPrice(targetPrice1)} (분할 익절)<br>` +
        (targetPrice2 ? `• <b>2차 목표 청산가:</b> ${fmtPrice(targetPrice2)} (잔여 익절)<br>` : '') +
        `• <b>최종 손절가:</b> ${fmtPrice(stopLossPrice)} (전량 손절)<br>` +
        (notes ? `• <b>전략 비고:</b> ${notes}<br>` : '') +
        `• <b>상태:</b> <b>실시간 시세 감시 시작 (WATCHING)</b>`
      );
    }

    // 백그라운드 틱 즉시 1회 실행
    setTimeout(() => this.runTick(), 500);

    return newStrategy;
  }

  /**
   * 관리자 맞춤 전략 수정 (목표가, 손절가, 물타기, 수량, 기준가, 메모 등 업데이트)
   */
  updateCustomStrategy(id, data = {}) {
    const journal = this.getJournalData();
    if (!Array.isArray(journal.customStrategies)) {
      journal.customStrategies = [];
    }

    const stratIndex = journal.customStrategies.findIndex(s => s.id === id);
    if (stratIndex === -1) {
      throw new Error('해당 전략을 찾을 수 없습니다.');
    }

    const strat = journal.customStrategies[stratIndex];
    const isKr = strat.market === 'KR' || /^[0-9]{6}$/.test(strat.itemCode);
    const fmtPrice = (p) => isKr ? `${Number(p).toLocaleString()}원` : `$${Number(p).toFixed(2)}`;

    // 1. 종목명 / 메모
    if (data.stockName) strat.stockName = String(data.stockName).trim();
    if (data.notes !== undefined) strat.notes = String(data.notes).trim();

    // 2. 수량 (체결 전이거나 보유 종목인 경우 변경)
    if (data.quantity) {
      const newQty = Math.max(1, parseInt(data.quantity, 10) || 1);
      const diff = newQty - strat.quantity;
      strat.quantity = newQty;
      strat.remainingQty = Math.max(1, (strat.remainingQty || newQty) + (strat.status === 'WATCHING' ? 0 : diff));
      if (strat.status === 'WATCHING') {
        strat.remainingQty = newQty;
      }
    }

    // 3. 진입가 및 기준가
    if (strat.status === 'WATCHING') {
      if (data.buyTriggerPrice !== undefined && Number(data.buyTriggerPrice) > 0) {
        strat.buyTriggerPrice = Number(data.buyTriggerPrice);
      }
      if (data.triggerType) {
        strat.triggerType = data.triggerType;
      }
    } else if (strat.isExistingHolding) {
      if (data.entryPrice !== undefined && Number(data.entryPrice) > 0) {
        strat.entryPrice = Number(data.entryPrice);
        strat.buyTriggerPrice = strat.entryPrice;
        // 평단가 변경 시 손익 재계산
        if (strat.currentPrice && strat.currentPrice > 0) {
          strat.unrealizedPnl = (strat.currentPrice - strat.entryPrice) * (strat.remainingQty || strat.quantity);
          strat.returnPct = parseFloat((((strat.currentPrice - strat.entryPrice) / strat.entryPrice) * 100).toFixed(2));
        }
      }
    }

    // 4. 청산 목표가 & 손절가
    if (data.targetPrice1 !== undefined && Number(data.targetPrice1) > 0) {
      strat.targetPrice1 = Number(data.targetPrice1);
    }
    if (data.targetPrice2 !== undefined) {
      strat.targetPrice2 = Number(data.targetPrice2) > 0 ? Number(data.targetPrice2) : null;
    }
    if (data.stopLossPrice !== undefined && Number(data.stopLossPrice) > 0) {
      strat.stopLossPrice = Number(data.stopLossPrice);
    }

    // 5. 물타기(추가 매수) 옵션
    if (data.enableAveraging !== undefined) {
      strat.enableAveraging = Boolean(data.enableAveraging);
      if (strat.enableAveraging) {
        if (data.averagingPrice && Number(data.averagingPrice) > 0) {
          strat.averagingPrice = Number(data.averagingPrice);
        }
        if (data.averagingQty) {
          strat.averagingQty = Math.max(1, parseInt(data.averagingQty, 10) || 1);
        }
        if (strat.averagingStatus === 'NONE' || !strat.averagingStatus) {
          strat.averagingStatus = 'WATCHING';
        }
      } else {
        strat.averagingStatus = 'NONE';
      }
    }

    strat.lastUpdatedAt = new Date().toISOString();
    journal.customStrategies[stratIndex] = strat;
    fs.writeFileSync(this.journalFile, JSON.stringify(journal, null, 2), 'utf8');

    // 텔레그램 안내 메시지 발송
    telegramBot.sendGeneralMessage(
      `✏️ <b>[토스증권] 관리자 맞춤 전략 수정 완료!</b><br><br>` +
      `• <b>종목명:</b> ${strat.stockName} (<code>${strat.itemCode}</code>) [${strat.market || (isKr ? 'KR' : 'US')}]<br>` +
      `• <b>수량:</b> <b>${strat.remainingQty || strat.quantity}주</b><br>` +
      (strat.entryPrice ? `• <b>평단가:</b> ${fmtPrice(strat.entryPrice)}<br>` : `• <b>기준 매수가:</b> ${fmtPrice(strat.buyTriggerPrice)}<br>`) +
      `• <b>1차 목표가:</b> ${fmtPrice(strat.targetPrice1)}<br>` +
      (strat.targetPrice2 ? `• <b>2차 목표가:</b> ${fmtPrice(strat.targetPrice2)}<br>` : '') +
      `• <b>최종 손절가:</b> ${fmtPrice(strat.stopLossPrice)}<br>` +
      (strat.enableAveraging ? `• <b>물타기 설정:</b> ${fmtPrice(strat.averagingPrice)} 이하 시 +${strat.averagingQty}주<br>` : '') +
      (strat.notes ? `• <b>전략 비고:</b> ${strat.notes}<br>` : '') +
      `• <b>운용 상태:</b> ${strat.status}`
    );

    // 즉시 백그라운드 틱 1회 가동
    setTimeout(() => this.runTick(), 500);

    return strat;
  }

  /**
   * 관리자 맞춤 전략 취소 (미체결 감시 상태인 경우 목록 및 데이터에서 완전 삭제)
   */
  cancelCustomStrategy(id, force = false) {
    const journal = this.getJournalData();
    const stratIndex = (journal.customStrategies || []).findIndex(s => s.id === id);
    if (stratIndex === -1) throw new Error('해당 전략을 찾을 수 없습니다.');
    const strat = journal.customStrategies[stratIndex];
    if ((strat.status === 'FILLED' || strat.status === 'PARTIAL_EXIT') && !strat.isExistingHolding && !force) {
      throw new Error('자동 매수로 보유 중인 포지션은 토스증권 청산 후 정리해주세요. (단, 관리자 직접 등록 보유종목은 즉시 감시 취소 가능)');
    }
    // 감시 취소 시 목록 및 저장 데이터에서 완전 삭제
    journal.customStrategies.splice(stratIndex, 1);
    fs.writeFileSync(this.journalFile, JSON.stringify(journal, null, 2), 'utf8');
    telegramBot.sendGeneralMessage(`🚫 <b>[토스증권] 관리자 맞춤 전략 감시 취소 및 삭제</b><br>• 종목: ${strat.stockName} (${strat.itemCode})`);
    return { ...strat, status: 'CANCELLED', deleted: true };
  }

  /**
   * 관리자 맞춤 전략 목록 조회
   */
  getCustomStrategies() {
    const journal = this.getJournalData();
    return journal.customStrategies || [];
  }

  /**
   * 관리자 맞춤 전략 감시 및 자동 매매 집행 엔진 (독립 다중 포지션)
   */
  async processCustomStrategies(journal) {
    if (!Array.isArray(journal.customStrategies) || journal.customStrategies.length === 0) {
      return;
    }

    const cfg = this.getConfig();
    const activeStrats = journal.customStrategies.filter(s => s.status !== 'CLOSED' && s.status !== 'CANCELLED');
    if (activeStrats.length === 0) return;

    for (const strat of activeStrats) {
      try {
        const isKr = strat.market === 'KR' || /^[0-9]{6}$/.test(strat.itemCode);
        const fmtPrice = (p) => isKr ? `${Number(p).toLocaleString()}원` : `$${Number(p).toFixed(2)}`;
        const isMarketOpen = tossClient.isRegularMarketOpen(strat.market);

        // 1. 실시간 시세 수집
        let livePrice = 0;
        try {
          const quote = await tossClient.getQuote(strat.itemCode);
          if (quote && quote.lastPrice > 0) {
            livePrice = quote.lastPrice;
          }
        } catch (e) {}

        if (livePrice <= 0) {
          if (isKr) {
            try {
              const nRes = await fetch(`https://m.stock.naver.com/api/stock/${strat.itemCode}/basic`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
              if (nRes.ok) {
                const nData = await nRes.json();
                if (nData.closePrice) livePrice = parseFloat(String(nData.closePrice).replace(/,/g, ''));
              }
            } catch (e) {}
          } else {
            try {
              const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${strat.itemCode}?interval=1d`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
              if (yRes.ok) {
                const yData = await yRes.json();
                livePrice = yData?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
              }
            } catch (e) {}
          }
        }

        if (livePrice > 0) {
          strat.currentPrice = livePrice;
          if (strat.entryPrice && strat.entryPrice > 0) {
            const pnl = livePrice - strat.entryPrice;
            strat.unrealizedPnl = isKr ? Math.round(pnl * (strat.remainingQty || strat.quantity)) : parseFloat((pnl * (strat.remainingQty || strat.quantity)).toFixed(2));
            strat.returnPct = parseFloat((((livePrice - strat.entryPrice) / strat.entryPrice) * 100).toFixed(2));
          }
          strat.lastUpdatedAt = new Date().toISOString();
        }

        // ==========================================
        // A. 진입 감시 상태 (WATCHING)
        // ==========================================
        if (strat.status === 'WATCHING') {
          if (!isMarketOpen) {
            strat.note = '장마감 상태: 정규장 개장 후 지정 조건 도달 시 자동 매수 대기 중';
            continue;
          }

          let shouldBuy = false;
          let triggerReason = '';

          if (strat.triggerType === 'IMMEDIATE') {
            shouldBuy = true;
            triggerReason = '관리자 즉시 매수 실행';
          } else if (strat.triggerType === 'PULLBACK') {
            if (livePrice > 0 && livePrice <= strat.buyTriggerPrice) {
              shouldBuy = true;
              triggerReason = `눌림목 매수 도달 (현재가 ${fmtPrice(livePrice)} <= 기준가 ${fmtPrice(strat.buyTriggerPrice)})`;
            } else {
              strat.note = `눌림목 감시 중: 현재가 ${fmtPrice(livePrice)} (기준가 ${fmtPrice(strat.buyTriggerPrice)} 도달 시 매수)`;
            }
          } else if (strat.triggerType === 'BREAKOUT') {
            if (livePrice > 0 && livePrice >= strat.buyTriggerPrice) {
              shouldBuy = true;
              triggerReason = `돌파 매수 안착 (현재가 ${fmtPrice(livePrice)} >= 기준가 ${fmtPrice(strat.buyTriggerPrice)})`;
            } else {
              strat.note = `돌파 감시 중: 현재가 ${fmtPrice(livePrice)} (기준가 ${fmtPrice(strat.buyTriggerPrice)} 돌파 시 매수)`;
            }
          }

          if (shouldBuy && cfg.isAutoTradingEnabled) {
            // 🌟 [3대 전략 상호 중복 방지] 집중 운용 포지션 또는 초단타 포지션에서 이미 운용 중인 경우 매수 보류
            const crossSymbols = this.getActiveTradingSymbols('CUSTOM_STRATEGY');
            if (crossSymbols.has(strat.itemCode)) {
              console.warn(`[CustomStrategy] ${strat.stockName} (${strat.itemCode}) 매수 조건 도달했으나, 실시간 집중 운용 또는 초단타 포지션에서 이미 운용 중이므로 매수 발주 보류`);
              strat.note = `매수 조건 도달했으나 타 전략(집중운용/초단타) 운용 중으로 매수 대기`;
              continue;
            }

            console.log(`[CustomStrategy] 🚀 ${strat.stockName} (${strat.itemCode}) ${triggerReason} -> 매수 주문 발주 (${strat.quantity}주)`);
            const orderRes = await tossClient.submitOrder({
              symbol: strat.itemCode,
              side: 'BUY',
              orderType: 'MARKET',
              quantity: strat.quantity
            });

            if (orderRes && orderRes.success) {
              strat.status = 'BUY_ORDERED';
              strat.orderId = orderRes.data?.orderId || orderRes.orderId || null;
              strat.note = `토스증권 매수 주문 접수 완료 (${triggerReason}, ${strat.quantity}주)`;
              strat.orderHistory.push({
                type: 'BUY_SUBMITTED',
                quantity: strat.quantity,
                price: livePrice,
                orderId: strat.orderId,
                timestamp: new Date().toISOString(),
                reason: triggerReason
              });

              telegramBot.sendGeneralMessage(
                `🚀 <b>[토스증권] 관리자 맞춤 전략 매수 주문 발주!</b><br><br>` +
                `• <b>종목명:</b> ${strat.stockName} (<code>${strat.itemCode}</code>)<br>` +
                `• <b>주문 수량:</b> ${strat.quantity}주<br>` +
                `• <b>현재가:</b> ${fmtPrice(livePrice)}<br>` +
                `• <b>진입 근거:</b> ${triggerReason}<br>` +
                `• <b>주문번호:</b> <code>${strat.orderId}</code>`
              );
            } else {
              const errStr = typeof orderRes.error === 'object' ? JSON.stringify(orderRes.error) : String(orderRes.error || '');
              strat.note = `매수 주문 실패: ${errStr}`;
              console.error(`[CustomStrategy] 매수 주문 실패:`, errStr);
            }
          }
        }

        // ==========================================
        // B. 매수 주문 접수 후 체결 확인 (BUY_ORDERED)
        // ==========================================
        else if (strat.status === 'BUY_ORDERED') {
          let isFilled = false;
          let filledPrice = livePrice;

          if (strat.orderId) {
            const detail = await tossClient.getOrderDetail(strat.orderId);
            if (detail && (detail.status === 'FILLED' || (detail.execution && Number(detail.execution.filledQuantity) >= 1))) {
              isFilled = true;
              filledPrice = parseFloat(detail.execution?.averageFilledPrice) || livePrice;
            }
          }

          if (!isFilled) {
            const holdingsRes = await tossClient.getHoldings();
            const matchingItem = holdingsRes?.data?.items?.find(it => String(it.symbol).trim() === strat.itemCode && Number(it.quantity) >= strat.quantity);
            if (matchingItem) {
              isFilled = true;
              filledPrice = parseFloat(matchingItem.averagePurchasePrice) || livePrice;
            }
          }

          if (isFilled) {
            strat.status = 'FILLED';
            strat.entryPrice = filledPrice;
            strat.remainingQty = strat.quantity;
            strat.currentPrice = filledPrice;
            strat.filledAt = new Date().toISOString();
            strat.note = `매수 체결 완료 (체결단가: ${fmtPrice(filledPrice)}, ${strat.quantity}주 보유)`;
            strat.orderHistory.push({
              type: 'BUY_FILLED',
              quantity: strat.quantity,
              price: filledPrice,
              timestamp: new Date().toISOString()
            });

            telegramBot.sendGeneralMessage(
              `✅ <b>[토스증권] 관리자 맞춤 전략 매수 체결 완료!</b><br><br>` +
              `• <b>종목명:</b> ${strat.stockName} (<code>${strat.itemCode}</code>)<br>` +
              `• <b>보유 수량:</b> ${strat.quantity}주<br>` +
              `• <b>체결 단가:</b> ${fmtPrice(filledPrice)}<br>` +
              `• <b>1차 목표가:</b> ${fmtPrice(strat.targetPrice1)} (분할 익절)<br>` +
              (strat.targetPrice2 ? `• <b>2차 목표가:</b> ${fmtPrice(strat.targetPrice2)}<br>` : '') +
              `• <b>최종 손절가:</b> ${fmtPrice(strat.stopLossPrice)}<br>` +
              (strat.notes ? `• <b>전략 비고:</b> ${strat.notes}` : '')
            );
          }
        }

        // ==========================================
        // C. 보유 및 청산 감시 (FILLED / PARTIAL_EXIT)
        // ==========================================
        else if (strat.status === 'FILLED' || strat.status === 'PARTIAL_EXIT') {
          if (!isMarketOpen) {
            strat.note = `정규장 마감 대기 (현재가: ${fmtPrice(livePrice)}, 수익률: ${strat.returnPct}%)`;
            continue;
          }

          const remainingQty = strat.remainingQty || strat.quantity || 1;

          // 1) 최종 손절가 이탈 감시
          if (livePrice <= strat.stopLossPrice) {
            console.log(`[CustomStrategy] ⛔ ${strat.stockName} 손절선 이탈 (${livePrice} <= ${strat.stopLossPrice}) -> 잔여 ${remainingQty}주 전량 손절 매도`);
            const sellRes = await tossClient.submitOrder({
              symbol: strat.itemCode,
              side: 'SELL',
              orderType: 'MARKET',
              quantity: remainingQty
            });

            const pnl = isKr ? Math.round((livePrice - strat.entryPrice) * remainingQty) : parseFloat(((livePrice - strat.entryPrice) * remainingQty).toFixed(2));
            strat.status = 'CLOSED';
            strat.exitReason = 'STOP_LOSS';
            strat.exitPrice = livePrice;
            strat.closedAt = new Date().toISOString();
            strat.note = `최종 손절선 이탈 전량 손절 매도 완료 (손익: ${fmtPrice(pnl)})`;
            strat.orderHistory.push({
              type: 'SELL_STOP_LOSS',
              quantity: remainingQty,
              price: livePrice,
              pnl,
              timestamp: new Date().toISOString()
            });

            journal.history.unshift({
              id: `hist_${Date.now()}`,
              stockName: strat.stockName,
              itemCode: strat.itemCode,
              market: strat.market,
              type: 'CUSTOM_STRATEGY',
              entryPrice: strat.entryPrice,
              exitPrice: livePrice,
              quantity: strat.quantity,
              profitKrw: pnl,
              returnPct: strat.returnPct,
              exitReason: 'STOP_LOSS',
              startedAt: strat.createdAt,
              closedAt: new Date().toISOString(),
              note: `관리자 맞춤 전략 손절 매도 (${strat.notes || ''})`
            });

            telegramBot.sendGeneralMessage(
              `⛔ <b>[토스증권] 관리자 맞춤 전략 손절 매도 완료</b><br><br>` +
              `• <b>종목명:</b> ${strat.stockName} (<code>${strat.itemCode}</code>)<br>` +
              `• <b>매도 수량:</b> ${remainingQty}주 (전량 손절)<br>` +
              `• <b>매도가격:</b> ${fmtPrice(livePrice)} (진입가: ${fmtPrice(strat.entryPrice)})<br>` +
              `• <b>수익률 / 손익:</b> <b>${strat.returnPct}%</b> (${fmtPrice(pnl)})<br>` +
              `• <b>사유:</b> 최종 손절 기준가(${fmtPrice(strat.stopLossPrice)}) 이탈`
            );
            continue;
          }

          // 2) 물타기(추가 매수) 감시 (활성화 및 대기 중, 아직 1차 목표가 도달 전인 FILLED 상태)
          if (strat.status === 'FILLED' && strat.enableAveraging && strat.averagingStatus === 'WATCHING' && livePrice > 0 && livePrice <= strat.averagingPrice) {
            const addQty = strat.averagingQty || 1;
            console.log(`[CustomStrategy] 💧 ${strat.stockName} 물타기 기준가 도달 (${livePrice} <= ${strat.averagingPrice}) -> ${addQty}주 추가 매수 발주`);

            let isOrderOk = false;
            let actualFilledPrice = livePrice;

            if (cfg.isAutoTradingEnabled) {
              const orderRes = await tossClient.submitOrder({
                symbol: strat.itemCode,
                side: 'BUY',
                orderType: 'MARKET',
                quantity: addQty
              });
              if (orderRes && orderRes.success) {
                isOrderOk = true;
                actualFilledPrice = livePrice;
              } else {
                const errStr = typeof orderRes?.error === 'object' ? JSON.stringify(orderRes.error) : String(orderRes?.error || '');
                console.error(`[CustomStrategy] 물타기 추가 매수 발주 실패:`, errStr);
                strat.note = `물타기 추가 매수 주문 실패: ${errStr}`;
              }
            } else {
              // 모의/시뮬레이션 모드에서는 즉시 체결 처리
              isOrderOk = true;
            }

            if (isOrderOk) {
              const oldQty = strat.remainingQty || strat.quantity || 1;
              const oldEntry = strat.entryPrice;
              const newQty = oldQty + addQty;
              const calcEntry = ((oldQty * oldEntry) + (addQty * actualFilledPrice)) / newQty;
              const newEntryPrice = isKr ? Math.round(calcEntry) : parseFloat(calcEntry.toFixed(4));

              strat.averagingStatus = 'COMPLETED';
              strat.entryPrice = newEntryPrice;
              strat.quantity = (strat.quantity || oldQty) + addQty;
              strat.remainingQty = newQty;
              strat.note = `💧 물타기 추가 매수 체결 완료 (${addQty}주 체결, 평단가: ${fmtPrice(oldEntry)} -> ${fmtPrice(newEntryPrice)})`;

              strat.orderHistory.push({
                type: 'BUY_AVERAGING_DOWN',
                quantity: addQty,
                price: actualFilledPrice,
                oldEntryPrice: oldEntry,
                newEntryPrice: newEntryPrice,
                timestamp: new Date().toISOString()
              });

              telegramBot.sendGeneralMessage(
                `💧 <b>[토스증권] 관리자 맞춤 전략 물타기(추가 매수) 체결 완료!</b><br><br>` +
                `• <b>종목명:</b> ${strat.stockName} (<code>${strat.itemCode}</code>)<br>` +
                `• <b>추가 매수:</b> ${addQty}주 (체결가: ${fmtPrice(actualFilledPrice)})<br>` +
                `• <b>평단가 변동:</b> ${fmtPrice(oldEntry)} ➡️ <b>${fmtPrice(newEntryPrice)}</b> (인하)<br>` +
                `• <b>총 보유 수량:</b> <b>${newQty}주</b><br>` +
                `• <b>1차 목표가:</b> ${fmtPrice(strat.targetPrice1)} (유지)<br>` +
                `• <b>최종 손절가:</b> ${fmtPrice(strat.stopLossPrice)} (유지)`
              );
            }
          }

          // 3) 2차 목표가 도달 감시 (1차 익절 완료 후 2차 목표가가 지정되어 있는 경우)
          if (strat.status === 'PARTIAL_EXIT' && strat.targetPrice2 && livePrice >= strat.targetPrice2) {
            console.log(`[CustomStrategy] 🎯🎯 ${strat.stockName} 2차 목표가 달성 (${livePrice} >= ${strat.targetPrice2}) -> 잔여 ${remainingQty}주 전량 익절 매도`);
            const sellRes = await tossClient.submitOrder({
              symbol: strat.itemCode,
              side: 'SELL',
              orderType: 'MARKET',
              quantity: remainingQty
            });

            const pnl = isKr ? Math.round((livePrice - strat.entryPrice) * remainingQty) : parseFloat(((livePrice - strat.entryPrice) * remainingQty).toFixed(2));
            strat.status = 'CLOSED';
            strat.exitReason = 'TARGET_2_PROFIT';
            strat.exitPrice = livePrice;
            strat.closedAt = new Date().toISOString();
            strat.note = `2차 최종 목표가 달성 전량 익절 매도 완료 (손익: ${fmtPrice(pnl)})`;
            strat.orderHistory.push({
              type: 'SELL_TARGET_2',
              quantity: remainingQty,
              price: livePrice,
              pnl,
              timestamp: new Date().toISOString()
            });

            journal.history.unshift({
              id: `hist_${Date.now()}`,
              stockName: strat.stockName,
              itemCode: strat.itemCode,
              market: strat.market,
              type: 'CUSTOM_STRATEGY',
              entryPrice: strat.entryPrice,
              exitPrice: livePrice,
              quantity: remainingQty,
              profitKrw: pnl,
              returnPct: strat.returnPct,
              exitReason: 'TARGET_2_PROFIT',
              startedAt: strat.createdAt,
              closedAt: new Date().toISOString(),
              note: `관리자 맞춤 전략 2차 목표가 달성 익절`
            });

            telegramBot.sendGeneralMessage(
              `🎉 <b>[토스증권] 관리자 맞춤 전략 2차 최종 목표가 달성!</b><br><br>` +
              `• <b>종목명:</b> ${strat.stockName} (<code>${strat.itemCode}</code>)<br>` +
              `• <b>매도 수량:</b> ${remainingQty}주 (잔여 전량 익절)<br>` +
              `• <b>체결 가격:</b> ${fmtPrice(livePrice)}<br>` +
              `• <b>최종 수익률:</b> <b>+${strat.returnPct}%</b> (+${fmtPrice(pnl)})`
            );
            continue;
          }

          // 3) 1차 목표가 도달 감시 (FILLED 상태에서 1차 목표가 이상 도달 시)
          if (strat.status === 'FILLED' && livePrice >= strat.targetPrice1) {
            const sellQty = (strat.quantity >= 2 && strat.targetPrice2)
              ? Math.floor(strat.quantity / 2)
              : remainingQty;

            console.log(`[CustomStrategy] 🎯 ${strat.stockName} 1차 목표가 달성 (${livePrice} >= ${strat.targetPrice1}) -> ${sellQty}주 분할 익절 매도`);
            const sellRes = await tossClient.submitOrder({
              symbol: strat.itemCode,
              side: 'SELL',
              orderType: 'MARKET',
              quantity: sellQty
            });

            const pnl = isKr ? Math.round((livePrice - strat.entryPrice) * sellQty) : parseFloat(((livePrice - strat.entryPrice) * sellQty).toFixed(2));
            const isFullExit = sellQty >= remainingQty;

            strat.remainingQty = remainingQty - sellQty;
            strat.status = isFullExit ? 'CLOSED' : 'PARTIAL_EXIT';
            strat.note = isFullExit ? `1차 목표가 달성 전량 익절 매도 완료 (손익: ${fmtPrice(pnl)})` : `1차 목표가 달성 ${sellQty}주 분할 익절 완료 (잔여 ${strat.remainingQty}주 2차 목표가 감시, 실현손익: ${fmtPrice(pnl)})`;
            strat.orderHistory.push({
              type: 'SELL_TARGET_1',
              quantity: sellQty,
              price: livePrice,
              pnl,
              timestamp: new Date().toISOString()
            });

            journal.history.unshift({
              id: `hist_${Date.now()}`,
              stockName: strat.stockName,
              itemCode: strat.itemCode,
              market: strat.market,
              type: 'CUSTOM_STRATEGY',
              entryPrice: strat.entryPrice,
              exitPrice: livePrice,
              quantity: sellQty,
              profitKrw: pnl,
              returnPct: strat.returnPct,
              exitReason: 'TARGET_1_PROFIT',
              startedAt: strat.createdAt,
              closedAt: new Date().toISOString(),
              note: `관리자 맞춤 전략 1차 목표가 익절 (${sellQty}주)`
            });

            telegramBot.sendGeneralMessage(
              `🎯 <b>[토스증권] 관리자 맞춤 전략 1차 목표가 달성!</b><br><br>` +
              `• <b>종목명:</b> ${strat.stockName} (<code>${strat.itemCode}</code>)<br>` +
              `• <b>익절 수량:</b> ${sellQty}주 (${isFullExit ? '전량 익절' : `잔여 ${strat.remainingQty}주 2차 목표가 감시`})<br>` +
              `• <b>체결 가격:</b> ${fmtPrice(livePrice)}<br>` +
              `• <b>실현 수익률:</b> <b>+${strat.returnPct}%</b> (+${fmtPrice(pnl)})`
            );
          }
        }
      } catch (stratErr) {
        console.error(`[CustomStrategy] Error processing ${strat.itemCode}:`, stratErr);
      }
    }

    this.saveJournalData(journal);
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

  // ==========================================
  // [NEW] 국장 개장 거래대금 1위(10만원 이하) 초단타 스캘핑 엔진
  // ==========================================

  loadScalpingStatus() {
    try {
      if (fs.existsSync(this.scalpingStatusFile)) {
        const raw = fs.readFileSync(this.scalpingStatusFile, 'utf8');
        const parsed = JSON.parse(raw);
        this.scalpingStatus = {
          isActive: Boolean(parsed.isActive),
          isWaitingMarketOpen: Boolean(parsed.isWaitingMarketOpen),
          targetProfitPct: parsed.targetProfitPct || 2.5,
          stopLossPct: parsed.stopLossPct || -1.5,
          currentPosition: parsed.currentPosition || null,
          lastCheckAt: parsed.lastCheckAt || null,
          history: Array.isArray(parsed.history) ? parsed.history : []
        };
        console.log(`[ScalpingEngine] Loaded scalpingStatus from disk (${this.scalpingStatus.history.length} trades in history)`);
        // 진행 중이던 포지션 감시 타이머 복구
        if (this.scalpingStatus.isActive && this.scalpingStatus.currentPosition) {
          this.startScalpingMonitorTimer();
        }
      }
    } catch (e) {
      console.warn('[ScalpingEngine] Failed to load scalpingStatus.json:', e.message);
    }
  }

  saveScalpingStatus() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.scalpingStatusFile, JSON.stringify(this.scalpingStatus, null, 2), 'utf8');
    } catch (e) {
      console.error('[ScalpingEngine] Failed to save scalpingStatus.json:', e.message);
    }
  }

  getScalpingStatus() {
    return {
      ...this.scalpingStatus,
      autoScheduleEnabled: Boolean(this.scalpingConfig?.autoScheduleEnabled),
      currentSession: tossClient.getCurrentMarketSession(),
      isMarketOpen: tossClient.isRegularMarketOpen('KR'),
      serverTime: new Date().toISOString()
    };
  }

  setAutoSchedule(enabled) {
    this.scalpingConfig.autoScheduleEnabled = Boolean(enabled);
    const journal = this.getJournalData();
    journal.scalpingConfig = this.scalpingConfig;
    this.saveJournalData(journal);

    const nextTradingDay = tossClient.getNextKrTradingDay();
    const timePrompt = `${nextTradingDay.formattedText} 아침 09:00 정각`;

    telegramBot.sendGeneralMessage(
      enabled
        ? `⏰ <b>[초단타 스케줄러] 09:00 정규장 개장 자동 실행 활성화</b>\n${timePrompt}에 텔레그램 알림과 함께 거래대금 1위 종목이 전자동 매수됩니다.`
        : `⏸️ <b>[초단타 스케줄러] 09:00 개장 자동 실행 해제</b>\n개장 알림 수신 후 관리 화면에서 수동으로 실행하세요.`
    );

    return {
      success: true,
      autoScheduleEnabled: this.scalpingConfig.autoScheduleEnabled,
      nextTradingDay: nextTradingDay.formattedText,
      message: enabled
        ? `09:00 개장 자동 실행 스케줄이 활성화되었습니다. (${timePrompt} 자동 실행 예정)`
        : '09:00 개장 자동 실행 스케줄이 해제되었습니다.'
    };
  }

  startMarketTimingDaemon() {
    if (this.marketTimingTimer) clearInterval(this.marketTimingTimer);
    this.marketTimingTimer = setInterval(() => {
      this.checkMarketTimingsAndNotify();
    }, 30000); // 30초마다 체크
    setTimeout(() => this.checkMarketTimingsAndNotify(), 3000);
  }

  async checkMarketTimingsAndNotify() {
    const now = new Date();
    const kst = tossClient.getKstDate(now);
    const day = kst.getDay(); // 0: 일, 6: 토
    if (day === 0 || day === 6) return; // 주말 휴장
    if (tossClient.isKrHoliday(kst)) return; // 공휴일 휴장

    const ymd = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
    const h = kst.getHours();
    const m = kst.getMinutes();
    const totalMinutes = h * 60 + m;
    const isDst = tossClient.isUsDstActive(now);

    // 1. 07:55 KST (475분) - 🌅 [NXT 프리마켓 개장 5분 전]
    const key0755 = `${ymd}-NXT_0755`;
    if (totalMinutes === 475 && !this.alertLog[key0755]) {
      this.alertLog[key0755] = true;
      telegramBot.sendGeneralMessage(
        `🌅 <b>[NXT 넥스트레이드 프리마켓 개장 5분 전]</b>\n\n` +
        `• <b>운영 세션:</b> 프리마켓 실시간 접속매매 (08:00 ~ 08:50)\n` +
        `• <b>특징:</b> 정규장 시작 전 호재성 갭상승 종목의 얼리버드 거래\n` +
        `• <b>주의:</b> 08:50부터는 시가 보호를 위해 신규 호가가 일시 정지됩니다.`
      );
    }

    // 2. 08:55 KST (535분) - 🚀 [국장 정규장 개장 5분 전]
    const key0855 = `${ymd}-KRX_0855`;
    if (totalMinutes === 535 && !this.alertLog[key0855]) {
      this.alertLog[key0855] = true;
      const autoMsg = this.scalpingConfig.autoScheduleEnabled
        ? `<b>개장 자동 실행 스케줄 ON</b> (09:00 정각에 자동 매수 발주가 집행됩니다)`
        : `<b>수동 실행 모드</b> (개장 후 관리 화면에서 [⚡ 초단타 실행] 버튼을 눌러주세요)`;

      telegramBot.sendGeneralMessage(
        `🚀 <b>[국내 정규장 개장 5분 전 - 초단타 골든타임 준비!]</b>\n\n` +
        `• <b>골든타임:</b> 09:00 ~ 09:30 (하루 중 거래대금/변동성 최고점)\n` +
        `• <b>전략:</b> 실시간 거래대금 1위(10만원 이하) 1주 매수 ➔ +2.5% 익절 / -1.5% 손절\n` +
        `• <b>현재 설정:</b> ${autoMsg}`
      );
    }

    // 3. 09:00 KST (540분) - ⚡ [국장 정규장 개장! 초단타 골든타임]
    const key0900 = `${ymd}-KRX_0900`;
    if (totalMinutes === 540 && !this.alertLog[key0900]) {
      this.alertLog[key0900] = true;
      telegramBot.sendGeneralMessage(
        `⚡ <b>[국내 정규장 개장!] 초단타 최강 골든타임(09:00~09:30) 시작</b>\n\n` +
        `• 한국거래소(KRX) 및 NXT 메인마켓이 공식 개장했습니다.\n` +
        `• 토스증권 실시간 차트 거래대금 랭킹 1위 종목 초단타 진입 적기입니다!`
      );

      // 자동 스케줄이 켜져있거나 이미 대기 중인 경우 -> 즉시 진입 실행!
      if (this.scalpingConfig.autoScheduleEnabled || this.scalpingStatus.isWaitingMarketOpen) {
        if (this.scalpingOpenWaitTimer) {
          clearInterval(this.scalpingOpenWaitTimer);
          this.scalpingOpenWaitTimer = null;
        }
        if (this.scalpingStatus.currentPosition || this.isEnteringScalp) {
          console.log('[ScalpingEngine] Auto schedule triggered at 09:00, but position or entry already active. Skipping duplicate entry.');
        } else {
          console.log('[ScalpingEngine] Auto schedule triggered at 09:00! Executing entry...');
          this.scalpingStatus.isActive = true;
          this.scalpingStatus.isWaitingMarketOpen = false;
          this.saveScalpingStatus();
          setTimeout(async () => {
            await this.executeScalpingEntry();
          }, 2000); // 개장 후 2초 후 랭킹 집계 즉시 포착
        }
      }
    }

    // 4. 미국장 개장 5분 전 (서머타임: 22:25 KST / 겨울철: 23:25 KST)
    const usNotifyMinutes = isDst ? 22 * 60 + 25 : 23 * 60 + 25;
    const keyUs = `${ymd}-US_PRE`;
    if (totalMinutes === usNotifyMinutes && !this.alertLog[keyUs]) {
      this.alertLog[keyUs] = true;
      telegramBot.sendGeneralMessage(
        `🇺🇸 <b>[미국 정규장 개장 5분 전 - 글로벌 시황 알림]</b>\n\n` +
        `• <b>운영 시간:</b> ${isDst ? '22:30 ~ 익일 05:00 KST (서머타임)' : '23:30 ~ 익일 06:00 KST'}\n` +
        `• <b>글로벌 테크주:</b> NVDA, AAPL, TSLA 등 주요 나스닥/S&P500 거래가 시작됩니다.\n` +
        `• 국내 초단타 포지션은 마감 상태이며 야간 글로벌 시황을 모니터링합니다.`
      );
    }
  }

  async startScalping(manualTrigger = false) {
    if (this.scalpingStatus.isActive && this.scalpingStatus.currentPosition) {
      return {
        success: false,
        message: '이미 초단타 포지션이 운용 중입니다.',
        status: this.getScalpingStatus()
      };
    }

    this.scalpingStatus.isActive = true;
    const isKrOpen = tossClient.isRegularMarketOpen('KR');

    if (!isKrOpen) {
      const nextTradingDay = tossClient.getNextKrTradingDay();
      const timePrompt = `${nextTradingDay.formattedText} 09:00`;

      // 국장 미개장 (09:00 이전 또는 장마감 후): 09:00 정규장 개장 대기 모드 활성화
      this.scalpingStatus.isWaitingMarketOpen = true;
      this.scalpingStatus.currentPosition = null;
      this.saveScalpingStatus();

      if (this.scalpingOpenWaitTimer) clearInterval(this.scalpingOpenWaitTimer);
      this.scalpingOpenWaitTimer = setInterval(async () => {
        if (!this.scalpingStatus.isActive) {
          clearInterval(this.scalpingOpenWaitTimer);
          return;
        }
        if (tossClient.isRegularMarketOpen('KR')) {
          if (this.scalpingStatus.currentPosition || this.isEnteringScalp) {
            clearInterval(this.scalpingOpenWaitTimer);
            this.scalpingOpenWaitTimer = null;
            this.scalpingStatus.isWaitingMarketOpen = false;
            this.saveScalpingStatus();
            return;
          }
          console.log('[ScalpingEngine] Market open detected! Executing scalping entry...');
          const entryRes = await this.executeScalpingEntry();
          if (entryRes && entryRes.success) {
            clearInterval(this.scalpingOpenWaitTimer);
            this.scalpingOpenWaitTimer = null;
            this.scalpingStatus.isWaitingMarketOpen = false;
            this.saveScalpingStatus();
          } else {
            console.log('[ScalpingEngine] Live rankings data not ready yet... will retry in 5s');
          }
        }
      }, 5000); // 5초마다 개장 여부 폴링

      telegramBot.sendGeneralMessage(
        '⚡ <b>[토스증권 국장 개장 초단타 스캘핑 대기]</b>\n\n' +
        '• <b>운용 모드:</b> 09:00 정규장 개장 자동 대기 활성화\n' +
        `• <b>실행 예정:</b> ${timePrompt} 개장 직후\n` +
        '• <b>대상 기준:</b> 개장 직후 실시간 거래대금 1위 (10만원 이하)\n' +
        '• <b>원칙:</b> 1주 시장가 매수 ➔ <b>익절 +2.5%</b> / <b>손절 -1.5%</b> 자동 청산'
      );

      return {
        success: true,
        message: `09:00 국장 개장 대기 모드가 활성화되었습니다. ${timePrompt} 개장 즉시 거래대금 1위 종목을 매수합니다.`,
        status: this.getScalpingStatus()
      };
    }

    // 장중(09:00~15:30): 지금 즉시 거래대금 1위 발굴 및 매수 진입
    this.scalpingStatus.isWaitingMarketOpen = false;
    this.saveScalpingStatus();
    const entryResult = await this.executeScalpingEntry();
    return entryResult;
  }

  stopScalping() {
    if (this.scalpingTimer) {
      clearInterval(this.scalpingTimer);
      this.scalpingTimer = null;
    }
    if (this.scalpingOpenWaitTimer) {
      clearInterval(this.scalpingOpenWaitTimer);
      this.scalpingOpenWaitTimer = null;
    }
    this.scalpingStatus.isActive = false;
    this.scalpingStatus.isWaitingMarketOpen = false;
    this.saveScalpingStatus();

    telegramBot.sendGeneralMessage('⏹️ <b>[토스증권 국장 초단타 스캘핑 엔진 중지]</b>\n관리자에 의해 초단타 감시가 중지되었습니다.');
    return {
      success: true,
      message: '초단타 스캘핑 엔진이 중지되었습니다.',
      status: this.getScalpingStatus()
    };
  }

  async executeScalpingEntry() {
    // 🌟 [중복 매수 원천 차단 1] 이미 초단타 포지션이 존재하는 경우 진입 차단
    if (this.scalpingStatus.currentPosition) {
      console.warn('[ScalpingEngine] Current scalping position already exists. Skipping entry.');
      return {
        success: false,
        message: '이미 초단타 포지션이 운용 중입니다.',
        status: this.getScalpingStatus()
      };
    }

    // 🌟 [중복 매수 원천 차단 2] 이미 진입 프로세스가 진행 중인 경우 뮤텍스 락으로 중복 발주 차단
    if (this.isEnteringScalp) {
      console.warn('[ScalpingEngine] Scalp entry already in progress. Skipping duplicate call.');
      return {
        success: false,
        message: '초단타 매수 진입 처리가 이미 진행 중입니다.',
        status: this.getScalpingStatus()
      };
    }

    this.isEnteringScalp = true;
    try {
      // 🌟 [3대 전략 상호 중복 방지] 집중 운용 및 맞춤 전략에서 운용 중인 종목 제외 (차순위 자동 우회)
      const excludeSymbols = Array.from(this.getActiveTradingSymbols('SCALPING'));
      console.log(`[ScalpingEngine] Finding top trading amount stock under 100k KRW (excluded from other strategies: [${excludeSymbols.join(', ')}])...`);

      const targetStock = await tossClient.findScalpingTargetStock(100000, excludeSymbols);

      if (!targetStock) {
        console.warn('[ScalpingEngine] No eligible stock found under 100,000 KRW');
        return {
          success: false,
          message: '조건에 맞는 10만원 이하 거래대금 1위 종목(타 전략 중복 제외 후)을 찾지 못했습니다.',
          status: this.getScalpingStatus()
        };
      }

      // 토스증권 API 시장가 1주 매수 주문 전송
      const buyRes = await tossClient.submitOrder({
        symbol: targetStock.symbol,
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 1,
        clientOrderId: `SCALP-${Date.now()}`
      });

      const entryPrice = targetStock.currentPrice > 0 ? targetStock.currentPrice : 10000;
      const targetPrice = Math.round(entryPrice * 1.025); // +2.5% 익절
      const stopPrice = Math.round(entryPrice * 0.985);   // -1.5% 손절

      this.scalpingStatus.currentPosition = {
        symbol: targetStock.symbol,
        stockName: targetStock.stockName,
        market: 'KR',
        currency: 'KRW',
        quantity: 1,
        entryPrice,
        currentPrice: entryPrice,
        targetPrice,
        stopLossPrice: stopPrice,
        returnPct: 0.0,
        unrealizedPnl: 0,
        orderId: buyRes.orderId || null,
        enteredAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        status: 'MONITORING'
      };

      this.scalpingStatus.isActive = true;
      this.scalpingStatus.isWaitingMarketOpen = false;
      this.saveScalpingStatus();

      telegramBot.sendGeneralMessage(
        `⚡ <b>[국장 거래대금 1위 초단타 스캘핑 진입!]</b>\n\n` +
        `• <b>종목명:</b> ${targetStock.stockName} (<code>${targetStock.symbol}</code>)\n` +
        `• <b>매수 단가:</b> ${entryPrice.toLocaleString()}원 (1주)\n` +
        `• <b>목표 익절가(+2.5%):</b> <b>${targetPrice.toLocaleString()}원</b>\n` +
        `• <b>최종 손절가(-1.5%):</b> <b>${stopPrice.toLocaleString()}원</b>\n` +
        `• <b>감시 모드:</b> 5초 실시간 시세 초고속 감시`
      );

      // 5초 감시 타이머 가동
      this.startScalpingMonitorTimer();

      return {
        success: true,
        message: `${targetStock.stockName} (${targetStock.symbol}) 1주 초단타 매수 진입 완료 (+2.5% 익절 / -1.5% 손절 감시 시작)`,
        position: this.scalpingStatus.currentPosition,
        status: this.getScalpingStatus()
      };
    } catch (err) {
      console.error('[ScalpingEngine] executeScalpingEntry error:', err.message);
      return { success: false, error: err.message, status: this.getScalpingStatus() };
    } finally {
      this.isEnteringScalp = false;
    }
  }

  startScalpingMonitorTimer() {
    if (this.scalpingTimer) clearInterval(this.scalpingTimer);
    this.scalpingTimer = setInterval(async () => {
      await this.checkScalpingPosition();
    }, this.scalpingIntervalMs);
  }

  async checkScalpingPosition() {
    const pos = this.scalpingStatus.currentPosition;
    if (!pos || !this.scalpingStatus.isActive) {
      if (this.scalpingTimer) {
        clearInterval(this.scalpingTimer);
        this.scalpingTimer = null;
      }
      return;
    }

    try {
      const quote = await tossClient.getQuote(pos.symbol);
      if (!quote || quote.lastPrice <= 0) return;

      const livePrice = quote.lastPrice;
      const entryPrice = pos.entryPrice;
      const pnl = livePrice - entryPrice;
      const returnPct = parseFloat(((pnl / entryPrice) * 100).toFixed(2));

      pos.currentPrice = livePrice;
      pos.unrealizedPnl = pnl;
      pos.returnPct = returnPct;
      pos.lastCheckedAt = new Date().toISOString();

      // 1. 목표가(+2.5%) 달성 -> 시장가 익절 매도
      if (livePrice >= pos.targetPrice) {
        console.log(`[ScalpingEngine] Target reached for ${pos.stockName} (${livePrice} >= ${pos.targetPrice})! Selling...`);
        const sellRes = await tossClient.submitOrder({
          symbol: pos.symbol,
          side: 'SELL',
          orderType: 'MARKET',
          quantity: 1,
          clientOrderId: `SCALP-TP-${Date.now()}`
        });

        telegramBot.sendGeneralMessage(
          `🎯 <b>[토스증권] 국장 초단타 목표가 익절 달성! (+2.5%)</b>\n\n` +
          `• <b>종목명:</b> ${pos.stockName} (<code>${pos.symbol}</code>)\n` +
          `• <b>매수 단가:</b> ${entryPrice.toLocaleString()}원\n` +
          `• <b>청산 가격:</b> ${livePrice.toLocaleString()}원\n` +
          `• <b>실현 손익:</b> <b>+${pnl.toLocaleString()}원 (+${returnPct}%)</b>`
        );

        const closedRecord = {
          ...pos,
          exitPrice: livePrice,
          realizedPnl: pnl,
          returnPct,
          exitReason: 'TAKE_PROFIT',
          closedAt: new Date().toISOString()
        };

        this.scalpingStatus.history.unshift(closedRecord);
        if (this.scalpingStatus.history.length > 50) {
          this.scalpingStatus.history = this.scalpingStatus.history.slice(0, 50);
        }
        this.scalpingStatus.currentPosition = null;
        this.scalpingStatus.isActive = false;
        this.saveScalpingStatus();

        // 🌟 [주식 매매일지에도 영구 기록 동기화]
        this.recordScalpingToJournal(pos, livePrice, pnl, returnPct, 'TAKE_PROFIT', '🎯 초단타 +2.5% 목표가 익절', sellRes?.orderId);

        if (this.scalpingTimer) {
          clearInterval(this.scalpingTimer);
          this.scalpingTimer = null;
        }
        return;
      }

      // 2. 손절가(-1.5%) 이탈 -> 시장가 즉시 손절
      if (livePrice <= pos.stopLossPrice) {
        console.log(`[ScalpingEngine] Stop loss hit for ${pos.stockName} (${livePrice} <= ${pos.stopLossPrice})! Selling...`);
        const sellRes = await tossClient.submitOrder({
          symbol: pos.symbol,
          side: 'SELL',
          orderType: 'MARKET',
          quantity: 1,
          clientOrderId: `SCALP-SL-${Date.now()}`
        });

        telegramBot.sendGeneralMessage(
          `⛔ <b>[토스증권] 국장 초단타 손절선 이탈 청산 (-1.5%)</b>\n\n` +
          `• <b>종목명:</b> ${pos.stockName} (<code>${pos.symbol}</code>)\n` +
          `• <b>매수 단가:</b> ${entryPrice.toLocaleString()}원\n` +
          `• <b>청산 가격:</b> ${livePrice.toLocaleString()}원\n` +
          `• <b>실현 손익:</b> <b>${pnl.toLocaleString()}원 (${returnPct}%)</b>`
        );

        const closedRecord = {
          ...pos,
          exitPrice: livePrice,
          realizedPnl: pnl,
          returnPct,
          exitReason: 'STOP_LOSS',
          closedAt: new Date().toISOString()
        };

        this.scalpingStatus.history.unshift(closedRecord);
        if (this.scalpingStatus.history.length > 50) {
          this.scalpingStatus.history = this.scalpingStatus.history.slice(0, 50);
        }
        this.scalpingStatus.currentPosition = null;
        this.scalpingStatus.isActive = false;
        this.saveScalpingStatus();

        // 🌟 [주식 매매일지에도 영구 기록 동기화]
        this.recordScalpingToJournal(pos, livePrice, pnl, returnPct, 'STOP_LOSS', '⛔ 초단타 -1.5% 손절 청산', sellRes?.orderId);

        if (this.scalpingTimer) {
          clearInterval(this.scalpingTimer);
          this.scalpingTimer = null;
        }
      }
    } catch (err) {
      console.error('[ScalpingEngine] checkScalpingPosition error:', err.message);
    }
  }

  recordScalpingToJournal(pos, exitPrice, realizedPnl, returnPct, reasonCode, reasonTitle, sellOrderId) {
    try {
      const journal = this.getJournalData();
      const journalItem = {
        id: `SCALP-${Date.now()}`,
        stockName: pos.stockName,
        itemCode: pos.symbol,
        market: 'KR',
        currency: 'KRW',
        entryFxRate: null,
        exitFxRate: null,
        totalQuantity: 1,
        averagePrice: pos.entryPrice,
        exitPrice: exitPrice,
        investedAmount: pos.entryPrice,
        proceedsAmount: exitPrice,
        realizedPnl: realizedPnl,
        realizedPnlKrw: realizedPnl,
        returnPct: returnPct,
        reasonCode: reasonCode,
        reasonTitle: reasonTitle,
        orderId: pos.orderId,
        sellOrderId: sellOrderId || null,
        startedAt: pos.enteredAt,
        closedAt: new Date().toISOString(),
        note: `국장 개장 실시간 거래대금 1위 초단타 스캘핑 (${reasonCode === 'TAKE_PROFIT' ? '익절' : '손절'})`
      };

      journal.history.unshift(journalItem);
      if (journal.history.length > 100) journal.history = journal.history.slice(0, 100);

      const stats = journal.stats;
      stats.totalTrades++;
      if (realizedPnl > 0) stats.winTrades++;
      else if (realizedPnl < 0) stats.lossTrades++;
      stats.winRate = stats.totalTrades > 0 ? parseFloat(((stats.winTrades / stats.totalTrades) * 100).toFixed(1)) : 0;
      stats.totalProfitKrw += realizedPnl;

      this.saveJournalData(journal);
    } catch (err) {
      console.warn('[ScalpingEngine] Failed to record to stock journal:', err.message);
    }
  }
}

module.exports = new StockAutoTrader();
