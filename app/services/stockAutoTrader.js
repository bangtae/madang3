// app/services/stockAutoTrader.js - AI 끝장토론 종목 기반 토스증권 자동매매 및 매매일지 관리 엔진 (1종목 1주 단일 매매)
const fs = require('fs');
const path = require('path');
const tossClient = require('../utils/tossInvestClient');
const telegramBot = require('../utils/telegramBotHelper');
const gcsStorage = require('../utils/gcsStorageHelper');

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
    this.debateReservationsFile = path.join(this.dataDir, 'debateReservations.json');

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

  async init() {
    // 🌟 GCS 영구 클라우드 스토리지에서 최신 매매일지, 스캘핑 상태, AI 끝장토론 예약매수 큐 동기화
    try {
      await gcsStorage.syncTradingJournalFromGcs(this.journalFile);
      await gcsStorage.syncScalpingStatusFromGcs(this.scalpingStatusFile);
      await gcsStorage.syncDebateReservationsFromGcs(this.debateReservationsFile);
    } catch (e) {
      console.warn('[StockAutoTrader] GCS startup sync warning:', e.message);
    }

    const cfg = this.getConfig();
    if (cfg.isAutoTradingEnabled) {
      this.startDaemon();
    }
    // 저널에서 scalpingConfig 복원 및 AI 끝장토론 예약 포지션 독립 분리 마이그레이션
    try {
      const journal = this.getJournalData();
      if (journal.scalpingConfig) {
        this.scalpingConfig = { ...this.scalpingConfig, ...journal.scalpingConfig };
      }
      this.ensureFilledDebatePositions(journal);
      this.saveJournalData(journal);
    } catch (e) {
      console.warn('[StockAutoTrader] Migration warning:', e.message);
    }

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

  getCurrentMonthKey() {
    const d = new Date();
    // KST 기준 연-월 (UTC+9)
    const kstTime = new Date(d.getTime() + (9 * 60 * 60 * 1000));
    const year = kstTime.getUTCFullYear();
    const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  checkMonthlyRollover(journal) {
    if (!journal) return false;
    const currentMonth = this.getCurrentMonthKey();
    if (!journal.currentMonth) {
      journal.currentMonth = currentMonth;
      if (!journal.monthlyArchives) journal.monthlyArchives = {};
      return false;
    }

    if (journal.currentMonth !== currentMonth) {
      const prevMonth = journal.currentMonth;
      console.log(`[StockAutoTrader] 🗓️ 새 달 롤오버 감지: ${prevMonth} -> ${currentMonth}`);

      if (!journal.monthlyArchives) journal.monthlyArchives = {};
      journal.monthlyArchives[prevMonth] = {
        month: prevMonth,
        history: Array.isArray(journal.history) ? [...journal.history] : [],
        stats: journal.stats ? { ...journal.stats } : { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, totalProfitKrw: 0 },
        archivedAt: new Date().toISOString()
      };

      // 당월 초기화
      journal.currentMonth = currentMonth;
      journal.history = [];
      journal.stats = {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0,
        totalProfitKrw: 0
      };
      journal.lastUpdatedAt = new Date().toISOString();
      this.saveJournalData(journal);

      try {
        telegramBot.sendGeneralMessage(
          `🗓️ <b>[토스증권 AI 자동매매] ${currentMonth}월 매매일지 자동 초기화</b><br><br>` +
          `• 이전 달(<b>${prevMonth}</b>) 매매 이력은 월별 보관함에 안전하게 보존되었습니다.<br>` +
          `• 당월 매매 통계 및 이력이 0으로 리셋되어 새 달의 운용이 시작됩니다.`
        );
      } catch (tErr) {}

      return true;
    }
    return false;
  }

  recalculateStats(journal) {
    if (!journal || !Array.isArray(journal.history)) return;
    const list = journal.history;
    const totalTrades = list.length;
    let winTrades = 0;
    let lossTrades = 0;
    let totalProfitKrw = 0;

    for (const it of list) {
      const pnlKrw = Number(it.realizedPnlKrw || it.profitKrw || it.realizedPnl) || 0;
      totalProfitKrw += pnlKrw;
      if (pnlKrw > 0) winTrades++;
      else if (pnlKrw < 0) lossTrades++;
    }

    const winRate = totalTrades > 0 ? parseFloat(((winTrades / totalTrades) * 100).toFixed(1)) : 0.0;
    journal.stats = {
      totalTrades,
      winTrades,
      lossTrades,
      winRate,
      totalProfitKrw
    };
  }

  /**
   * 🌟 AI 끝장토론 예약 체결 포지션(멀티 종목) 동기화 및 잘못 들어간 currentPosition 복원
   */
  ensureFilledDebatePositions(journal) {
    if (!journal) return;
    if (!Array.isArray(journal.reservationPositions)) journal.reservationPositions = [];

    // 1. 기존 currentPosition에 남아있는 AI끝장토론 포지션 자동 마이그레이션
    if (journal.currentPosition && journal.currentPosition.strategyNote && journal.currentPosition.strategyNote.includes('AI끝장토론')) {
      const oldPos = journal.currentPosition;
      if (!journal.reservationPositions.some(p => p.stockCode === oldPos.stockCode)) {
        journal.reservationPositions.push({
          id: `RESPOS-${Date.now()}-${oldPos.stockCode}`,
          reservationId: oldPos.reservationId || null,
          stockCode: oldPos.stockCode,
          stockName: oldPos.stockName,
          market: oldPos.market,
          currency: oldPos.currency,
          quantity: oldPos.quantity || 1,
          entryPrice: oldPos.entryPrice,
          entryPriceKrw: oldPos.entryPriceKrw,
          currentPrice: oldPos.currentPrice || oldPos.entryPrice,
          currentPriceKrw: oldPos.currentPriceKrw || oldPos.entryPriceKrw,
          targetPrice: oldPos.targetPrice,
          stopLossPrice: oldPos.stopLossPrice,
          unrealizedPnl: oldPos.unrealizedPnl || 0,
          unrealizedPnlKrw: oldPos.unrealizedPnlKrw || 0,
          returnPct: oldPos.returnPct || 0,
          status: 'HOLDING',
          orderId: oldPos.orderId,
          enteredAt: oldPos.enteredAt || new Date().toISOString(),
          targetProfitPct: oldPos.targetProfitPct || 3.0,
          stopLossPct: oldPos.stopLossPct || -2.0,
          strategyTitle: '⚡ 시초가 우선 체결 (1주)',
          exitStrategyTitle: oldPos.strategyNote || '적응형 매도',
          strategyNote: oldPos.strategyNote || 'AI끝장토론 체결 포지션'
        });
      }
      journal.currentPosition = null;
    }

    // 2. debateReservations.json의 FILLED 종목들을 reservationPositions에 자동 복원
    try {
      const reservations = this.getDebateReservations();
      const filledDebates = reservations.filter(r => r.status === 'FILLED');
      const history = Array.isArray(journal.history) ? journal.history : [];
      let reservationsChanged = false;

      for (const res of filledDebates) {
        const inReservation = journal.reservationPositions.some(p => p.stockCode === res.itemCode || p.reservationId === res.id);
        const inHistory = history.some(h => h.itemCode === res.itemCode && h.strategyType === 'DEBATE_RESERVATION');

        if (inHistory) {
          // 이미 history에 청산 이력이 있는 경우, debateReservations.json 상태도 CLOSED로 자동 동기화하여 중복 체결 방지
          res.status = 'CLOSED';
          res.closedAt = res.closedAt || new Date().toISOString();
          reservationsChanged = true;
          continue;
        }

        if (!inReservation && !inHistory) {
          const filledPrice = res.finalFilledPrice || res.orders?.[0]?.price || res.currentPriceKrw || 0;
          const exitPlan = res.exitPlan || {};
          const isKr = res.market === 'KR';
          const targetPrice = isKr
            ? Math.round(filledPrice * (1 + (exitPlan.targetProfitPct || 3.0) / 100))
            : parseFloat((filledPrice * (1 + (exitPlan.targetProfitPct || 3.0) / 100)).toFixed(2));
          const stopLossPrice = isKr
            ? Math.round(filledPrice * (1 + (exitPlan.stopLossPct || -2.0) / 100))
            : parseFloat((filledPrice * (1 + (exitPlan.stopLossPct || -2.0) / 100)).toFixed(2));

          journal.reservationPositions.push({
            id: `RESPOS-${Date.now()}-${res.itemCode}`,
            reservationId: res.id,
            stockCode: res.itemCode,
            stockName: res.stockName,
            market: res.market,
            currency: res.currency || 'KRW',
            quantity: res.finalFilledQty || res.totalQuantity || 1,
            entryPrice: filledPrice,
            entryPriceKrw: filledPrice,
            currentPrice: filledPrice,
            currentPriceKrw: filledPrice,
            targetPrice: targetPrice,
            stopLossPrice: stopLossPrice,
            unrealizedPnl: 0,
            unrealizedPnlKrw: 0,
            returnPct: 0,
            status: 'HOLDING',
            orderId: res.orderResults?.[0]?.orderId || `ORD-${res.id}`,
            enteredAt: res.filledAt || res.submittedAt || new Date().toISOString(),
            targetProfitPct: exitPlan.targetProfitPct || 3.0,
            stopLossPct: exitPlan.stopLossPct || -2.0,
            strategyTitle: res.strategyTitle || '⚡ 시초가 우선 체결 (1주)',
            exitStrategyTitle: exitPlan.exitStrategyTitle || '적응형 매도',
            strategyNote: `AI끝장토론 [${res.strategyTitle || '예약매수'}] 체결 포지션`
          });
        }
      }

      if (reservationsChanged) {
        this.saveDebateReservations(reservations);
      }
    } catch (e) {
      console.warn('[StockAutoTrader] ensureFilledDebatePositions error:', e.message);
    }
  }

  /**
   * 🌟 중복 적재된 AI 끝장토론 청산 이력 클린업 및 통계 정상화
   */
  cleanupDebateHistory(journal) {
    if (!journal || !Array.isArray(journal.history)) return;
    const seen = new Set();
    const cleanHistory = [];
    for (const h of journal.history) {
      if (h.strategyType === 'DEBATE_RESERVATION') {
        const key = `${h.itemCode}-${(h.startedAt || '').slice(0, 10)}`;
        if (seen.has(key)) continue; // 중복 건너뜀
        seen.add(key);
      }
      cleanHistory.push(h);
    }
    if (cleanHistory.length !== journal.history.length) {
      journal.history = cleanHistory;
      this.recalculateStats(journal);
    }
  }

  getJournalData() {
    try {
      if (fs.existsSync(this.journalFile)) {
        const raw = fs.readFileSync(this.journalFile, 'utf8');
        const parsed = JSON.parse(raw);
        const journal = {
          currentMonth: parsed.currentMonth || this.getCurrentMonthKey(),
          monthlyArchives: parsed.monthlyArchives || {},
          currentPosition: parsed.currentPosition || null,
          reservationPositions: Array.isArray(parsed.reservationPositions) ? parsed.reservationPositions : [],
          customStrategies: Array.isArray(parsed.customStrategies) ? parsed.customStrategies : [],
          history: Array.isArray(parsed.history) ? parsed.history : [],
          stats: parsed.stats || { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, totalProfitKrw: 0 },
          scalpingConfig: parsed.scalpingConfig || { autoScheduleEnabled: false },
          lastCheckAt: parsed.lastCheckAt || null
        };
        this.checkMonthlyRollover(journal);
        this.cleanupDebateHistory(journal);
        this.ensureFilledDebatePositions(journal);
        return journal;
      }
    } catch (e) {
      console.warn('[StockAutoTrader] Failed to read journal file:', e.message);
    }
    const defaultJournal = {
      currentMonth: this.getCurrentMonthKey(),
      monthlyArchives: {},
      currentPosition: null,
      reservationPositions: [],
      customStrategies: [],
      history: [],
      stats: { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, totalProfitKrw: 0 },
      scalpingConfig: { autoScheduleEnabled: false },
      lastCheckAt: null
    };
    this.ensureFilledDebatePositions(defaultJournal);
    return defaultJournal;
  }

  saveJournalData(data) {
    try {
      if (!data.currentMonth) data.currentMonth = this.getCurrentMonthKey();
      if (!data.monthlyArchives) data.monthlyArchives = {};
      if (!Array.isArray(data.reservationPositions)) data.reservationPositions = [];
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
          if (diskData.monthlyArchives && typeof diskData.monthlyArchives === 'object') {
            data.monthlyArchives = { ...diskData.monthlyArchives, ...data.monthlyArchives };
          }
        } catch (e) {}
      }
      this.recalculateStats(data);
      fs.writeFileSync(this.journalFile, JSON.stringify(data, null, 2), 'utf8');
      // 🌟 GCS 영구 백업 비동기 동기화
      gcsStorage.saveTradingJournalToGcs(data).catch(e => console.warn('[StockAutoTrader] GCS journal backup error:', e.message));
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

        const cur = journal.currentPosition;

        // 🌟 [핵심 안전장치: 개인 보유 주식 절대 보호]
        // 시스템이 직접 AI 자동매매로 매수한 포지션(cur)이 존재할 때만 해당 종목을 동기화함.
        // 사용자가 토스 앱에서 직접 매수한 주식은 절대 AI 포지션으로 임의 등록하지 않음!
        if (cur && cur.itemCode) {
          const matchedHolding = activeHoldings.find(h => String(h.symbol).trim() === cur.itemCode);
          if (matchedHolding) {
            const quantity = Number(matchedHolding.quantity) || 1;
            const avgPrice = parseFloat(matchedHolding.averagePurchasePrice) || parseFloat(matchedHolding.lastPrice) || cur.averagePrice;
            const lastPrice = parseFloat(matchedHolding.lastPrice) || avgPrice;
            const isKr = (matchedHolding.marketCountry === 'KR') || /^[0-9]{6}$/.test(cur.itemCode);
            const currency = matchedHolding.currency || (isKr ? 'KRW' : 'USD');

            let fxRate = cur.fxRate || 1350;
            if (!isKr || currency === 'USD') {
              try {
                const liveFx = await tossClient.fetchUsdkrwRate();
                if (liveFx && liveFx > 500) fxRate = liveFx;
              } catch (e) {}
            }

            const krwPrice = currency === 'KRW' ? Math.round(lastPrice) : Math.round(lastPrice * fxRate);
            const usdPrice = currency === 'USD' ? lastPrice : parseFloat((krwPrice / fxRate).toFixed(2));
            const avgKrw = currency === 'KRW' ? Math.round(avgPrice) : Math.round(avgPrice * fxRate);

            cur.status = 'FILLED';
            cur.quantity = quantity;
            cur.averagePrice = avgPrice;
            cur.currentPrice = lastPrice;
            cur.krwPrice = krwPrice;
            cur.usdPrice = usdPrice;
            cur.fxRate = fxRate;
            cur.totalInvestedKrw = avgKrw * quantity;
            cur.unrealizedPnl = Math.round((lastPrice - avgPrice) * (currency === 'KRW' ? quantity : (quantity * fxRate)));
            cur.returnPct = avgPrice > 0 ? parseFloat((((lastPrice - avgPrice) / avgPrice) * 100).toFixed(2)) : 0.0;
            cur.lastUpdatedAt = new Date().toISOString();

            // 🌟 [AI 끝장토론 최신 업데이트 실시간 동기화]
            await this.syncLatestDebateWithPosition(journal);

            this.saveJournalData(journal);
            return true;
          } else if (cur.status === 'FILLED') {
            // 시스템 포지션이었던 주식이 실계좌에서 사라진 경우 -> 토스 앱/외부에서 수동 매도 체결 감지 (일지만 정리)
            console.log(`[StockAutoTrader] 시스템 포지션(${cur.stockName})의 실계좌 잔고 0 감지 -> 매매일지 외부 매도 기록`);
            await this.recordExternalExit(cur, journal, 'EXTERNAL_SELL', '토스증권 앱/외부 매도 체결 감지');
            return false;
          }
        }

        // 🌟 [유령 매도 자동 복구 메커니즘]
        // 시스템 집중 포지션(cur)이 비어있는데, journal.history에 최근 FOCUSED 매도 기록이 있고
        // 해당 종목이 실제 토스 잔고(activeHoldings)에 여전히 남아있다면 (주문 실패 후 유령 매도 처리된 경우 복구)
        if (!cur || !cur.itemCode) {
          const ghostHistoryIndex = (journal.history || []).findIndex(h => h.strategyType === 'FOCUSED');
          if (ghostHistoryIndex !== -1) {
            const ghostHist = journal.history[ghostHistoryIndex];
            const matchedHolding = activeHoldings.find(h => String(h.symbol).trim() === ghostHist.itemCode);
            if (matchedHolding && Number(matchedHolding.quantity) > 0) {
              console.log(`[StockAutoTrader] 🚨 유령 매도 감지: ${ghostHist.stockName} (${ghostHist.itemCode})가 실계좌에 ${matchedHolding.quantity}주 여전히 보유 중입니다. 집중 포지션으로 자동 복구합니다.`);

              // 1. 유령 매매 이력 삭제
              journal.history.splice(ghostHistoryIndex, 1);

              // 2. 통계 원복
              if (journal.stats && ghostHist.realizedPnlKrw) {
                journal.stats.totalTrades = Math.max(0, (journal.stats.totalTrades || 1) - 1);
                if (ghostHist.realizedPnlKrw > 0) journal.stats.winTrades = Math.max(0, (journal.stats.winTrades || 1) - 1);
                else if (ghostHist.realizedPnlKrw < 0) journal.stats.lossTrades = Math.max(0, (journal.stats.lossTrades || 1) - 1);
                journal.stats.totalProfitKrw = (journal.stats.totalProfitKrw || 0) - ghostHist.realizedPnlKrw;
                journal.stats.winRate = journal.stats.totalTrades > 0 ? parseFloat(((journal.stats.winTrades / journal.stats.totalTrades) * 100).toFixed(1)) : 0;
              }

              // 3. 집중 포지션 복구
              const quantity = Number(matchedHolding.quantity) || 1;
              const avgPrice = parseFloat(matchedHolding.averagePurchasePrice) || parseFloat(matchedHolding.lastPrice) || ghostHist.averagePrice;
              const lastPrice = parseFloat(matchedHolding.lastPrice) || avgPrice;
              const isKr = (matchedHolding.marketCountry === 'KR') || /^[0-9]{6}$/.test(ghostHist.itemCode);
              const currency = matchedHolding.currency || (isKr ? 'KRW' : 'USD');
              let fxRate = ghostHist.entryFxRate || 1350;

              const krwPrice = currency === 'KRW' ? Math.round(lastPrice) : Math.round(lastPrice * fxRate);
              const usdPrice = currency === 'USD' ? lastPrice : parseFloat((krwPrice / fxRate).toFixed(2));
              const avgKrw = currency === 'KRW' ? Math.round(avgPrice) : Math.round(avgPrice * fxRate);

              journal.currentPosition = {
                stockName: matchedHolding.name || ghostHist.stockName,
                itemCode: ghostHist.itemCode,
                market: ghostHist.market || (isKr ? 'KR' : 'US'),
                currency,
                status: 'FILLED',
                quantity,
                entryPrice: ghostHist.entryPrice || avgPrice,
                averagePrice: avgPrice,
                currentPrice: lastPrice,
                krwPrice,
                usdPrice,
                fxRate,
                targetPrice: isKr ? Math.round(avgPrice * 1.15) : parseFloat((avgPrice * 1.15).toFixed(2)),
                stopLossPrice: isKr ? Math.round(avgPrice * 0.95) : parseFloat((avgPrice * 0.95).toFixed(2)),
                totalInvestedKrw: avgKrw * quantity,
                unrealizedPnl: Math.round((lastPrice - avgPrice) * (currency === 'KRW' ? quantity : (quantity * fxRate))),
                returnPct: avgPrice > 0 ? parseFloat((((lastPrice - avgPrice) / avgPrice) * 100).toFixed(2)) : 0.0,
                orderId: ghostHist.orderId || 'RESTORED',
                debateId: ghostHist.debateId || null,
                debateSummary: ghostHist.debateSummary || '',
                startedAt: ghostHist.startedAt || new Date().toISOString(),
                filledAt: ghostHist.startedAt || new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
                note: `토스증권 실제 잔고 보유 확인에 따른 정상 원복 (${quantity}주 보유)`
              };

              await this.syncLatestDebateWithPosition(journal);
              this.saveJournalData(journal);

              telegramBot.sendGeneralMessage(
                `🔄 <b>[토스증권 AI 자동매매] 실시간 집중 포지션 자동 정상 복구</b><br><br>` +
                `• <b>종목명:</b> ${journal.currentPosition.stockName} (<code>${journal.currentPosition.itemCode}</code>)<br>` +
                `• <b>보유 수량:</b> <b>${quantity}주</b> (평단가: ${avgPrice.toLocaleString()}원)<br>` +
                `• <b>현재가:</b> ${lastPrice.toLocaleString()}원<br>` +
                `• <b>안내:</b> 토스증권 실제 계좌에 2주 정상 보유 중임이 확인되어 매매일지 유령 매도 이력을 삭제하고 집중 운용 포지션으로 안전하게 원복했습니다.`
              );
              return true;
            }
          }
        }

        // 실계좌에 주식이 존재하지만 시스템 포지션이 아니라면 (사용자 직접 매수 주식 또는 스캘핑 주식)
        // AI 자동매매는 해당 종목을 절대 건드리지 않고 보호하며, 중복 매수만 차단함.
        if (activeHoldings.length > 0) {
          return true;
        }
      }

      // 2. 보유 주식이 없다면, 시스템 포지션의 미체결 매수 주문 확인
      const openOrders = await tossClient.getOpenOrders();
      if (Array.isArray(openOrders) && openOrders.length > 0 && journal.currentPosition) {
        const cur = journal.currentPosition;
        const buyOrders = openOrders.filter(o => o.side === 'BUY' && o.symbol === cur.itemCode);
        if (buyOrders.length > 0) {
          const ord = buyOrders[0];
          cur.orderId = ord.orderId;
          cur.status = 'RESERVED';
          await this.syncLatestDebateWithPosition(journal);
          this.saveJournalData(journal);
          return true;
        }
      }

      // 포지션이 있는 경우 최신 토론 동기화 유지
      if (journal.currentPosition) {
        await this.syncLatestDebateWithPosition(journal);
      }

      return Boolean(journal.currentPosition);
    } catch (e) {
      console.warn('[StockAutoTrader] syncHoldingsWithToss error:', e.message);
      return Boolean(journal.currentPosition);
    }
  }

  /**
   * 실시간 집중 운용 포지션 종목에 대해 AI 끝장토론실(stockDebateLogs.json)의 최신 토론 내용 자동 동기화
   * 새 토론 감지 시 텔레그램 알림 발송
   */
  async syncLatestDebateWithPosition(journal) {
    if (!journal || !journal.currentPosition) return false;
    const cur = journal.currentPosition;
    const itemCode = String(cur.itemCode || '').trim();
    const stockName = String(cur.stockName || '').trim();
    if (!itemCode && !stockName) return false;

    try {
      let debateList = [];
      if (fs.existsSync(this.debateLogsFile)) {
        try {
          debateList = JSON.parse(fs.readFileSync(this.debateLogsFile, 'utf8'));
        } catch (pe) {}
      }
      if (!Array.isArray(debateList) || debateList.length === 0) {
        const fallbackJs = path.join(this.dataDir, 'initialStockDebateLogs.js');
        if (fs.existsSync(fallbackJs)) {
          try {
            const raw = fs.readFileSync(fallbackJs, 'utf8');
            const jsonText = raw.replace(/^window\.PORTAL_DATA_STOCK_DEBATES\s*=\s*/, '').replace(/;\s*$/, '');
            debateList = JSON.parse(jsonText);
          } catch (fe) {}
        }
      }
      if (!Array.isArray(debateList) || debateList.length === 0) return false;

      // 해당 종목의 토론만 매칭 (종목코드 또는 종목명)
      const matched = debateList.filter(d => {
        const dCode = String(d.item_code || d.code || '').trim();
        const dName = String(d.stock_name || d.name || '').trim();
        return (itemCode && dCode === itemCode) ||
               (stockName && (dName === stockName || dName.includes(stockName) || stockName.includes(dName)));
      });

      if (matched.length === 0) return false;

      // 토론 시간 파싱 함수
      const parseDebateTime = (item) => {
        if (!item) return 0;
        const tStr = item.updated_at || item.timestamp || item.created_at || '';
        if (!tStr) return 0;
        let parsed = Date.parse(tStr.replace(' ', 'T'));
        if (!isNaN(parsed) && parsed > 0) return parsed;
        const shortMatch = tStr.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{1,2})/);
        if (shortMatch) {
          const year = new Date().getFullYear();
          return new Date(year, parseInt(shortMatch[1], 10) - 1, parseInt(shortMatch[2], 10), parseInt(shortMatch[3], 10), parseInt(shortMatch[4], 10)).getTime();
        }
        return 0;
      };

      matched.sort((a, b) => parseDebateTime(b) - parseDebateTime(a));
      const latest = matched[0];
      if (!latest) return false;

      const latestId = latest.id || `debate-${latest.item_code}`;
      const latestAction = latest.action_title || latest.final_action || '⚖️ AI 끝장토론 의결';
      const latestSummary = latest.verdict_summary || latest.summary || latest.topic || '끝장토론 종목 의결 매수 진행 중';
      const latestTopic = latest.topic || '';
      const latestAt = latest.updated_at || latest.timestamp || latest.created_at || '';

      let isUpdated = false;
      const prevNotifiedId = cur.lastDebateNotifiedId;

      if (cur.latestDebateId !== latestId || cur.latestDebateSummary !== latestSummary) {
        cur.latestDebateId = latestId;
        cur.latestDebateAction = latestAction;
        cur.latestDebateSummary = latestSummary;
        cur.latestDebateTopic = latestTopic;
        cur.latestDebateAt = latestAt;
        cur.debateSummary = latestSummary; // 기존 UI 호환
        isUpdated = true;
      }

      // 🎯 [공식 목표가 및 손절가 추출 연동]
      let detectedTargetPrice = 0;

      // 1. 투자심의위원회(stockCouncilReports.json) 리포트에서 탐색
      if (fs.existsSync(this.councilReportsFile)) {
        try {
          const reports = JSON.parse(fs.readFileSync(this.councilReportsFile, 'utf8'));
          if (Array.isArray(reports)) {
            const matchedRep = reports.find(r => {
              const rCode = String(r.itemCode || r.code || '').trim();
              const rName = String(r.stockName || '').trim();
              return (itemCode && rCode === itemCode) || (stockName && (rName === stockName || rName.includes(stockName)));
            });
            if (matchedRep) {
              const rawTp = matchedRep.factData?.targetPrice || matchedRep.truthData?.targetPrice;
              if (rawTp) {
                const num = parseFloat(String(rawTp).replace(/[^0-9.]/g, ''));
                if (num > 0) detectedTargetPrice = num;
              }
            }
          }
        } catch (cre) {}
      }

      // 2. 끝장토론 factCheck / truthData 에서 탐색
      if (!detectedTargetPrice && latest.factCheck?.truthData?.targetPrice) {
        const rawTp = latest.factCheck.truthData.targetPrice;
        const num = parseFloat(String(rawTp).replace(/[^0-9.]/g, ''));
        if (num > 0) detectedTargetPrice = num;
      }

      // 3. 목표가 및 손절가 실시간 갱신
      if (detectedTargetPrice > 0 && cur.targetPrice !== detectedTargetPrice) {
        cur.targetPrice = detectedTargetPrice;
        isUpdated = true;
      }

      // 손절가는 현재 평균 매입단가 기준 -5% 자동 연동
      const currentAvg = cur.averagePrice || cur.entryPrice || 0;
      if (currentAvg > 0) {
        const expectedStopLoss = cur.currency === 'USD' ? parseFloat((currentAvg * 0.95).toFixed(2)) : Math.round(currentAvg * 0.95);
        if (cur.stopLossPrice !== expectedStopLoss) {
          cur.stopLossPrice = expectedStopLoss;
          isUpdated = true;
        }
      }

      // 💧 [끝장토론 분할의결 조건부 1회 추가 매수(물타기) 상태 세팅]
      cur.enableAveraging = true;
      cur.averagingQty = 1;
      cur.averagingTriggerPct = -4.0;
      if (currentAvg > 0) {
        cur.averagingPrice = cur.currency === 'USD' ? parseFloat((currentAvg * 0.96).toFixed(2)) : Math.round(currentAvg * 0.96);
      }
      const curQty = Number(cur.quantity) || 1;
      if (curQty >= 2) {
        if (cur.averagingStatus !== 'FILLED') {
          cur.averagingStatus = 'FILLED';
          cur.averagingNote = '분할 추매 체결 완료 (총 2주 운용 중)';
          isUpdated = true;
        }
      } else if (!cur.averagingStatus || cur.averagingStatus === 'DISABLED') {
        cur.averagingStatus = 'WATCHING';
        isUpdated = true;
      }

      // 🌟 [새 토론 감지 시 텔레그램 알림 발송]
      if (prevNotifiedId !== latestId) {
        cur.lastDebateNotifiedId = latestId;
        isUpdated = true;

        try {
          const isFilled = cur.status === 'FILLED';
          const statusText = isFilled ? `보유 중 (${cur.quantity || 1}주)` : '예약/접수 대기 중';
          const msg = [
            `🔥 <b>[실시간 집중 포지션 AI 끝장토론 업데이트!]</b>`,
            ``,
            `• <b>종목명</b>: ${cur.stockName} (${cur.itemCode})`,
            `• <b>운용 상태</b>: ${statusText}`,
            `• <b>토론 주제</b>: ${latestTopic ? latestTopic.slice(0, 80) : '서브에이전트 팩트 공방 및 의결'}`,
            `• <b>최신 의결</b>: <code>${latestAction}</code>`,
            `• <b>위원회 요약</b>: ${latestSummary ? latestSummary.slice(0, 160) : '-'}`,
            `• <b>토론 일시</b>: ${latestAt || '실시간 최신'}`,
            ``,
            `💡 <i>주식 매매일지 > 실시간 집중 운용 포지션에서 [🔥 AI 끝장토론 바로보기]로 12턴 대화를 확인하실 수 있습니다.</i>`
          ].join('\n');

          await telegramBot.sendGeneralMessage(msg, 'HTML');
          console.log(`[StockAutoTrader] 실시간 포지션 종목(${cur.stockName}) 최신 끝장토론(${latestId}) 텔레그램 알림 전송 완료`);
        } catch (tErr) {
          console.warn('[StockAutoTrader] 텔레그램 알림 발송 에러:', tErr.message);
        }
      }

      if (isUpdated) {
        this.saveJournalData(journal);
      }
      return isUpdated;
    } catch (err) {
      console.error('[StockAutoTrader] syncLatestDebateWithPosition error:', err.message);
      return false;
    }
  }

  /**
   * 외부/앱에서 수동 매도된 종목의 매매일지 안전 정리 (토스증권에 매도 주문을 날리지 않음)
   */
  async recordExternalExit(pos, journal, reasonCode, reasonTitle) {
    const exitPrice = pos.currentPrice || pos.averagePrice;
    const isUs = pos.market === 'US' || pos.currency === 'USD';
    const exitFxRate = pos.fxRate || 1350;
    const realizedPnl = exitPrice - pos.averagePrice;
    const returnPct = pos.averagePrice > 0 ? parseFloat(((realizedPnl / pos.averagePrice) * 100).toFixed(2)) : 0.0;
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
      sellOrderId: 'EXTERNAL',
      startedAt: pos.startedAt,
      closedAt: nowStr,
      note: `${reasonTitle} 완료`
    };

    journal.history.unshift(journalItem);
    journal.currentPosition = null;
    this.saveJournalData(journal);
    return journalItem;
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

          const isMarketOpen = tossClient.isRegularMarketOpen(pos.market);

          // (1) 목표가(+15%) 달성 -> 전량 익절 매도
          if (livePrice >= pos.targetPrice) {
            if (cfg.isAutoTradingEnabled) {
              if (isMarketOpen) {
                await this.executeExit(pos, journal, 'PROFIT_TARGET', '🎯 목표가 달성 익절 매도');
              } else {
                console.log(`[StockAutoTrader] ${pos.stockName} 목표가 도달하였으나 ${pos.market} 정규장 마감으로 매도 보류`);
                this.saveJournalData(journal);
              }
            } else {
              this.saveJournalData(journal);
            }
          }
          // (2) 손절선(-5%) 도달 -> 전량 손절 매도
          else if (livePrice <= pos.stopLossPrice) {
            if (cfg.isAutoTradingEnabled) {
              if (isMarketOpen) {
                await this.executeExit(pos, journal, 'STOP_LOSS', '⛔ 손절선 도달 손절 매도');
              } else {
                console.log(`[StockAutoTrader] ${pos.stockName} 손절선 도달하였으나 ${pos.market} 정규장 마감으로 매도 보류`);
                this.saveJournalData(journal);
              }
            } else {
              this.saveJournalData(journal);
            }
          }
          // (3) 🌟 [끝장토론 분할의결 조건 충족 시 1회 추가 매수 (물타기)]
          else if (pos.enableAveraging && pos.averagingStatus === 'WATCHING' && (Number(pos.quantity) || 1) === 1 && pos.averagingPrice > 0 && livePrice <= pos.averagingPrice) {
            const isMarketOpen = tossClient.isRegularMarketOpen(pos.market);
            if (isMarketOpen && cfg.isAutoTradingEnabled) {
              console.log(`[StockAutoTrader] 💧 ${pos.stockName} 끝장토론 분할의결 추매 조건 도달 (${livePrice} <= ${pos.averagingPrice}) -> 1주 추가 매수 발주 착수`);
              try {
                const addOrder = await tossClient.order(pos.itemCode, 'BUY', 1, 'MARKET');
                if (addOrder && (addOrder.orderId || addOrder.success)) {
                  pos.averagingStatus = 'ORDERED';
                  pos.averagingOrderId = addOrder.orderId || null;
                  pos.lastUpdatedAt = new Date().toISOString();
                  this.saveJournalData(journal);

                  telegramBot.sendGeneralMessage(
                    `💧 <b>[토스증권 AI 자동매매] 끝장토론 분할의결 1주 추가 매수 발주</b><br><br>` +
                    `• <b>종목명:</b> ${pos.stockName} (<code>${pos.itemCode}</code>)<br>` +
                    `• <b>현재가:</b> ${livePrice.toLocaleString()}원 (추매 기준가: ${pos.averagingPrice.toLocaleString()}원 이하 도달)<br>` +
                    `• <b>추매 수량:</b> 1주 추가 (총 2주 운용 확대)<br>` +
                    `• <b>주문번호:</b> <code>${pos.averagingOrderId || '접수완료'}</code><br>` +
                    `체결 완료 시 평단가 및 손익선이 자동 재조정됩니다.`
                  );
                }
              } catch (addErr) {
                console.warn('[StockAutoTrader] 분할 추매 발주 에러:', addErr.message);
                this.saveJournalData(journal);
              }
            } else {
              this.saveJournalData(journal);
            }
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
   * 전량 청산 매도 (목표가 익절 / 손절선 손절 / 비상 매도)
   */
  async executeExit(pos, journal, reasonCode, reasonTitle) {
    const isMarketOpen = tossClient.isRegularMarketOpen(pos.market);
    if (!isMarketOpen) {
      console.warn(`[StockAutoTrader] ${reasonTitle} 매도 취소: ${pos.market} 정규장이 열려있지 않습니다.`);
      return false;
    }

    const exitQty = Number(pos.quantity) || 1;
    let orderResult = await tossClient.submitOrder({
      symbol: pos.itemCode,
      side: 'SELL',
      orderType: 'MARKET',
      quantity: exitQty
    });

    if (!orderResult || !orderResult.success) {
      const errMsg = orderResult?.error || '토스증권 API 주문 응답 실패';
      console.error(`[StockAutoTrader] ${reasonTitle} 매도 주문 실패:`, errMsg);
      telegramBot.sendGeneralMessage(
        `🚨 <b>[토스증권 AI 자동매매] ${pos.stockName} 매도 주문 실패 경고!</b><br><br>` +
        `• <b>종목명:</b> ${pos.stockName} (<code>${pos.itemCode}</code>)<br>` +
        `• <b>사유:</b> ${reasonTitle} 조건 충족<br>` +
        `• <b>실패 원인:</b> <code>${errMsg}</code><br>` +
        `⚠️ <i>토스증권 매도 주문이 접수/체결되지 않았으므로 포지션을 청산하지 않고 안전하게 유지합니다.</i>`
      );
      return false;
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
    const realizedPnlPerShare = exitPrice - pos.averagePrice;
    const realizedPnl = Math.round(realizedPnlPerShare * exitQty * 100) / 100;
    const returnPct = parseFloat(((realizedPnlPerShare / pos.averagePrice) * 100).toFixed(2));
    const realizedPnlKrw = isUs ? Math.round(realizedPnl * exitFxRate) : Math.round(realizedPnl);
    const totalInvested = isUs ? Math.round(pos.averagePrice * exitQty * exitFxRate) : Math.round(pos.averagePrice * exitQty);
    const totalProceeds = isUs ? Math.round(exitPrice * exitQty * exitFxRate) : Math.round(exitPrice * exitQty);
    const nowStr = new Date().toISOString();

    const journalItem = {
      id: `JRN-${Date.now()}`,
      strategyType: 'FOCUSED',
      stockName: pos.stockName,
      itemCode: pos.itemCode,
      market: pos.market,
      currency: pos.currency || (isUs ? 'USD' : 'KRW'),
      entryFxRate: isUs ? (pos.fxRate || null) : null,
      exitFxRate: isUs ? exitFxRate : null,
      totalQuantity: exitQty,
      averagePrice: pos.averagePrice,
      exitPrice,
      investedAmount: totalInvested,
      proceedsAmount: totalProceeds,
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

            if (!sellRes || !sellRes.success) {
              const errMsg = sellRes?.error || '주문 응답 실패';
              console.error(`[CustomStrategy] ${strat.stockName} 손절 매도 주문 실패:`, errMsg);
              telegramBot.sendGeneralMessage(`🚨 <b>[토스증권] ${strat.stockName} 맞춤전략 손절 주문 실패</b><br>원인: <code>${errMsg}</code>`);
              continue;
            }

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
              strategyType: 'CUSTOM',
              stockName: strat.stockName,
              itemCode: strat.itemCode,
              market: strat.market,
              type: 'CUSTOM_STRATEGY',
              entryPrice: strat.entryPrice,
              exitPrice: livePrice,
              quantity: strat.quantity,
              profitKrw: pnl,
              realizedPnlKrw: pnl,
              returnPct: strat.returnPct,
              exitReason: 'STOP_LOSS',
              reasonCode: 'STOP_LOSS',
              reasonTitle: '⛔ 맞춤 전략 손절 매도',
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

            if (!sellRes || !sellRes.success) {
              const errMsg = sellRes?.error || '주문 응답 실패';
              console.error(`[CustomStrategy] ${strat.stockName} 2차 목표가 매도 주문 실패:`, errMsg);
              telegramBot.sendGeneralMessage(`🚨 <b>[토스증권] ${strat.stockName} 맞춤전략 2차 익절 주문 실패</b><br>원인: <code>${errMsg}</code>`);
              continue;
            }

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
              strategyType: 'CUSTOM',
              stockName: strat.stockName,
              itemCode: strat.itemCode,
              market: strat.market,
              type: 'CUSTOM_STRATEGY',
              entryPrice: strat.entryPrice,
              exitPrice: livePrice,
              quantity: remainingQty,
              profitKrw: pnl,
              realizedPnlKrw: pnl,
              returnPct: strat.returnPct,
              exitReason: 'TARGET_2_PROFIT',
              reasonCode: 'TAKE_PROFIT',
              reasonTitle: '🎯 맞춤 전략 2차 목표가 달성 익절',
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

            if (!sellRes || !sellRes.success) {
              const errMsg = sellRes?.error || '주문 응답 실패';
              console.error(`[CustomStrategy] ${strat.stockName} 1차 목표가 매도 주문 실패:`, errMsg);
              telegramBot.sendGeneralMessage(`🚨 <b>[토스증권] ${strat.stockName} 맞춤전략 1차 분할익절 주문 실패</b><br>원인: <code>${errMsg}</code>`);
              continue;
            }

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
              strategyType: 'CUSTOM',
              stockName: strat.stockName,
              itemCode: strat.itemCode,
              market: strat.market,
              type: 'CUSTOM_STRATEGY',
              entryPrice: strat.entryPrice,
              exitPrice: livePrice,
              quantity: sellQty,
              profitKrw: pnl,
              realizedPnlKrw: pnl,
              returnPct: strat.returnPct,
              exitReason: 'TARGET_1_PROFIT',
              reasonCode: 'TAKE_PROFIT',
              reasonTitle: '🎯 맞춤 전략 1차 목표가 익절',
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
        // 1. 진행 중이던 포지션 감시 타이머 복구
        if (this.scalpingStatus.isActive && this.scalpingStatus.currentPosition) {
          this.startScalpingMonitorTimer();
        }
        // 2. 🌟 개장 대기 중이던 상태 복구 및 기개장 시 즉시 진입
        else if (this.scalpingStatus.isActive && this.scalpingStatus.isWaitingMarketOpen) {
          const session = tossClient.getCurrentScalpingSession();
          const market = this.scalpingStatus.waitingMarket || session.market;
          if (tossClient.isRegularMarketOpen(market)) {
            console.log(`[ScalpingEngine] Server recovered while ${market} market is already open! Executing entry immediately...`);
            this.scalpingStatus.isWaitingMarketOpen = false;
            this.saveScalpingStatus();
            setTimeout(async () => {
              await this.executeScalpingEntry(market);
            }, 1000);
          } else {
            console.log(`[ScalpingEngine] Server recovered during ${market} market wait. Resuming wait timer...`);
            if (this.scalpingOpenWaitTimer) clearInterval(this.scalpingOpenWaitTimer);
            this.scalpingOpenWaitTimer = setInterval(async () => {
              if (!this.scalpingStatus.isActive) {
                clearInterval(this.scalpingOpenWaitTimer);
                return;
              }
              const checkMarket = this.scalpingStatus.waitingMarket || market;
              if (tossClient.isRegularMarketOpen(checkMarket)) {
                if (this.scalpingStatus.currentPosition || this.isEnteringScalp) {
                  clearInterval(this.scalpingOpenWaitTimer);
                  this.scalpingOpenWaitTimer = null;
                  this.scalpingStatus.isWaitingMarketOpen = false;
                  this.saveScalpingStatus();
                  return;
                }
                const entryRes = await this.executeScalpingEntry(checkMarket);
                if (entryRes && entryRes.success) {
                  clearInterval(this.scalpingOpenWaitTimer);
                  this.scalpingOpenWaitTimer = null;
                  this.scalpingStatus.isWaitingMarketOpen = false;
                  this.saveScalpingStatus();
                }
              }
            }, 5000);
          }
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
      // 🌟 GCS 영구 백업 비동기 동기화
      gcsStorage.saveScalpingStatusToGcs(this.scalpingStatus).catch(e => console.warn('[ScalpingEngine] GCS scalping backup error:', e.message));
    } catch (e) {
      console.error('[ScalpingEngine] Failed to save scalpingStatus.json:', e.message);
    }
  }

  getScalpingStatus() {
    const scalpingSession = tossClient.getCurrentScalpingSession();
    return {
      ...this.scalpingStatus,
      autoScheduleEnabled: Boolean(this.scalpingConfig?.autoScheduleEnabled),
      scalpingSession,
      currentSession: tossClient.getCurrentMarketSession(),
      isMarketOpen: scalpingSession.isOpen,
      serverTime: new Date().toISOString()
    };
  }

  setAutoSchedule(enabled) {
    this.scalpingConfig.autoScheduleEnabled = Boolean(enabled);
    const journal = this.getJournalData();
    journal.scalpingConfig = this.scalpingConfig;
    this.saveJournalData(journal);

    const nextKr = tossClient.getNextKrTradingDay();
    const nextUs = tossClient.getNextUsTradingDay();
    const timePrompt = `국장(${nextKr.formattedText} 09:00) 및 미장(${nextUs.formattedText})`;

    telegramBot.sendGeneralMessage(
      enabled
        ? `⏰ <b>[초단타 스케줄러] 한미 정규장 개장 자동 실행 활성화</b>\n매 영업일 아침 09:00(국장) 및 밤 22:30/23:30(미장) 개장 직후 거래대금 1위 종목이 전자동 매수 집행됩니다.`
        : `⏸️ <b>[초단타 스케줄러] 한미 개장 자동 실행 해제</b>\n개장 알림 수신 후 관리 화면에서 수동으로 실행하세요.`
    );

    return {
      success: true,
      autoScheduleEnabled: this.scalpingConfig.autoScheduleEnabled,
      nextTradingDay: nextKr.formattedText,
      nextUsTradingDay: nextUs.formattedText,
      message: enabled
        ? `한미 개장 자동 실행 스케줄이 활성화되었습니다. (${timePrompt} 자동 실행 예정)`
        : '한미 개장 자동 실행 스케줄이 해제되었습니다.'
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

    // 🌟 [AI 끝장토론 예약매수 엔진] 개장 시점 자동 발주, 체결 감시, 실시간 익절/손절 감시
    try {
      await this.processScheduledReservations();
      await this.checkReservationExecutions();
      await this.monitorReservationPositions();
    } catch (rErr) {
      console.warn('[StockAutoTrader] Reservation scheduler check error:', rErr.message);
    }

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

    // 3. 09:00~09:30 KST (540~570분) - ⚡ [국장 정규장 개장! 초단타 골든타임]
    const key0900 = `${ymd}-KRX_0900`;
    if (totalMinutes >= 540 && totalMinutes < 570) {
      if (!this.alertLog[key0900]) {
        this.alertLog[key0900] = true;
        telegramBot.sendGeneralMessage(
          `⚡ <b>[국내 정규장 개장!] 초단타 최강 골든타임(09:00~09:30) 시작</b>\n\n` +
          `• 한국거래소(KRX) 및 NXT 메인마켓이 공식 개장했습니다.\n` +
          `• 토스증권 실시간 차트 거래대금 랭킹 1위 종목 초단타 진입 적기입니다!`
        );
      }

      // 자동 스케줄이 켜져있거나 이미 대기 중인 경우 -> 즉시 진입 실행!
      const keyAutoEntryKr = `${ymd}-KRX_AUTO_ENTRY`;
      if ((this.scalpingConfig.autoScheduleEnabled || this.scalpingStatus.isWaitingMarketOpen) && !this.alertLog[keyAutoEntryKr]) {
        if (this.scalpingOpenWaitTimer) {
          clearInterval(this.scalpingOpenWaitTimer);
          this.scalpingOpenWaitTimer = null;
        }
        if (this.scalpingStatus.currentPosition || this.isEnteringScalp) {
          this.alertLog[keyAutoEntryKr] = true;
          console.log('[ScalpingEngine] Auto schedule triggered during golden time, but position or entry already active.');
        } else {
          this.alertLog[keyAutoEntryKr] = true;
          console.log('[ScalpingEngine] Auto schedule triggered during 09:00~09:30 golden time! Executing entry...');
          this.scalpingStatus.isActive = true;
          this.scalpingStatus.isWaitingMarketOpen = false;
          this.saveScalpingStatus();
          setTimeout(async () => {
            await this.executeScalpingEntry('KR');
          }, 2000); // 랭킹 집계 즉시 포착
        }
      }
    }

    // 4. 미국장 개장 5분 전 (서머타임: 22:25 KST / 겨울철: 23:25 KST)
    const usNotifyMinutes = isDst ? 22 * 60 + 25 : 23 * 60 + 25;
    const keyUs = `${ymd}-US_PRE`;
    if (totalMinutes >= usNotifyMinutes && totalMinutes < usNotifyMinutes + 5 && !this.alertLog[keyUs]) {
      this.alertLog[keyUs] = true;
      const autoMsg = this.scalpingConfig.autoScheduleEnabled
        ? `<b>개장 자동 실행 스케줄 ON</b> (${isDst ? '22:30' : '23:30'} 정각에 미국 주식 자동 매수 발주가 집행됩니다)`
        : `<b>수동 실행 모드</b> (개장 후 관리 화면에서 [⚡ 미장 초단타 실행] 버튼을 눌러주세요)`;

      telegramBot.sendGeneralMessage(
        `🇺🇸 <b>[미국 정규장 개장 5분 전 - 초단타 골든타임 준비!]</b>\n\n` +
        `• <b>운영 시간:</b> ${isDst ? '22:30 ~ 익일 05:00 KST (서머타임)' : '23:30 ~ 익일 06:00 KST'}\n` +
        `• <b>전략:</b> 나스닥/S&P 실시간 거래대금 1위(1주 $100 이하) 매수 ➔ +2.5% 익절 / -1.5% 손절\n` +
        `• <b>현재 설정:</b> ${autoMsg}`
      );
    }

    // 5. 미국장 정규장 개장 골든타임 (서머타임: 22:30 KST / 겨울철: 23:30 KST) - ⚡ [미장 초단타 골든타임]
    const usOpenMinutes = isDst ? 22 * 60 + 30 : 23 * 60 + 30;
    const keyUsOpen = `${ymd}-US_OPEN`;
    if (totalMinutes >= usOpenMinutes && totalMinutes < usOpenMinutes + 60) {
      if (!this.alertLog[keyUsOpen]) {
        this.alertLog[keyUsOpen] = true;
        telegramBot.sendGeneralMessage(
          `⚡ <b>[미국 정규장 개장!] 미장 초단타 골든타임(${isDst ? '22:30~00:00' : '23:30~01:00'}) 시작</b>\n\n` +
          `• 뉴욕증권거래소(NYSE) 및 나스닥(NASDAQ)이 공식 개장했습니다.\n` +
          `• 토스증권 실시간 차트 거래대금 상위($100 이하) 초단타 진입 적기입니다!`
        );
      }

      // 자동 스케줄이 켜져있거나 미장 대기 중인 경우 -> 미장 즉시 진입 실행!
      const keyAutoEntryUs = `${ymd}-US_AUTO_ENTRY`;
      if ((this.scalpingConfig.autoScheduleEnabled || this.scalpingStatus.isWaitingMarketOpen) && !this.alertLog[keyAutoEntryUs]) {
        if (this.scalpingOpenWaitTimer) {
          clearInterval(this.scalpingOpenWaitTimer);
          this.scalpingOpenWaitTimer = null;
        }
        if (this.scalpingStatus.currentPosition || this.isEnteringScalp) {
          this.alertLog[keyAutoEntryUs] = true;
          console.log('[ScalpingEngine] Auto schedule triggered at US open, but position or entry already active.');
        } else {
          this.alertLog[keyAutoEntryUs] = true;
          console.log('[ScalpingEngine] Auto schedule triggered during US golden time! Executing entry for US stock...');
          this.scalpingStatus.isActive = true;
          this.scalpingStatus.isWaitingMarketOpen = false;
          this.saveScalpingStatus();
          setTimeout(async () => {
            await this.executeScalpingEntry('US');
          }, 3000); // 랭킹 집계 즉시 포착
        }
      }
    }
  }

  async startScalping(manualTrigger = false, targetMarket = null) {
    if (this.scalpingStatus.isActive && this.scalpingStatus.currentPosition) {
      return {
        success: false,
        message: '이미 초단타 포지션이 운용 중입니다.',
        status: this.getScalpingStatus()
      };
    }

    this.scalpingStatus.isActive = true;

    // 현재 세션 감지 (KR vs US)
    const session = tossClient.getCurrentScalpingSession();
    const market = targetMarket || session.market;
    const isMarketOpen = tossClient.isRegularMarketOpen(market);

    if (!isMarketOpen) {
      const isUs = market === 'US';
      const promptText = session.nextOpenPrompt;

      this.scalpingStatus.isWaitingMarketOpen = true;
      this.scalpingStatus.waitingMarket = market;
      this.scalpingStatus.currentPosition = null;
      this.saveScalpingStatus();

      if (this.scalpingOpenWaitTimer) clearInterval(this.scalpingOpenWaitTimer);
      this.scalpingOpenWaitTimer = setInterval(async () => {
        if (!this.scalpingStatus.isActive) {
          clearInterval(this.scalpingOpenWaitTimer);
          return;
        }
        const checkMarket = this.scalpingStatus.waitingMarket || market;
        if (tossClient.isRegularMarketOpen(checkMarket)) {
          if (this.scalpingStatus.currentPosition || this.isEnteringScalp) {
            clearInterval(this.scalpingOpenWaitTimer);
            this.scalpingOpenWaitTimer = null;
            this.scalpingStatus.isWaitingMarketOpen = false;
            this.saveScalpingStatus();
            return;
          }
          console.log(`[ScalpingEngine] ${checkMarket} Market open detected! Executing scalping entry...`);
          const entryRes = await this.executeScalpingEntry(checkMarket);
          if (entryRes && entryRes.success) {
            clearInterval(this.scalpingOpenWaitTimer);
            this.scalpingOpenWaitTimer = null;
            this.scalpingStatus.isWaitingMarketOpen = false;
            this.saveScalpingStatus();
          } else {
            console.log(`[ScalpingEngine] Live ${checkMarket} rankings data not ready yet... will retry in 5s`);
          }
        }
      }, 5000); // 5초마다 개장 여부 폴링

      const marketLabel = isUs ? '미장(나스닥/S&P)' : '국장(KRX)';
      const priceLimit = isUs ? '총 예산 $100 이하' : '총 예산 10만원 이하';

      telegramBot.sendGeneralMessage(
        `⚡ <b>[토스증권 ${marketLabel} 개장 초단타 스캘핑 대기]</b>\n\n` +
        `• <b>운용 모드:</b> ${marketLabel} 개장 자동 대기 활성화\n` +
        `• <b>실행 예정:</b> ${promptText} 개장 직후\n` +
        `• <b>대상 기준:</b> 개장 직후 실시간 거래대금 1위 (${priceLimit})\n` +
        '• <b>원칙:</b> 예산 한도 내 자동 수량 시장가 매수 ➔ <b>30분 단위 타임디케이 청산</b>'
      );

      return {
        success: true,
        message: `${marketLabel} 개장 대기 모드가 활성화되었습니다. ${promptText} 개장 즉시 거래대금 1위 종목을 매수합니다.`,
        status: this.getScalpingStatus()
      };
    }

    // 장중: 지금 즉시 거래대금 1위 발굴 및 매수 진입
    this.scalpingStatus.isWaitingMarketOpen = false;
    this.saveScalpingStatus();
    const entryResult = await this.executeScalpingEntry(market);
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

    telegramBot.sendGeneralMessage('⏹️ <b>[토스증권 초단타 스캘핑 엔진 중지]</b>\n관리자에 의해 초단타 감시가 중지되었습니다.');
    return {
      success: true,
      message: '초단타 스캘핑 엔진이 중지되었습니다.',
      status: this.getScalpingStatus()
    };
  }

  async executeScalpingEntry(preferredMarket = null) {
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
      const session = tossClient.getCurrentScalpingSession();
      const market = preferredMarket || session.market;
      const isUs = market === 'US';
      const maxPrice = isUs ? 100.0 : 100000;
      const excludeSymbols = Array.from(this.getActiveTradingSymbols('SCALPING'));

      console.log(`[ScalpingEngine] Finding top trading amount candidates for ${market} (maxPrice: ${maxPrice}, excluded: [${excludeSymbols.join(', ')}])...`);

      const candidates = await tossClient.findScalpingCandidates(market, maxPrice, excludeSymbols);

      if (!candidates || candidates.length === 0) {
        const limitText = isUs ? '$100 이하' : '10만원 이하';
        console.warn(`[ScalpingEngine] No eligible stock found for ${market} under ${limitText}`);
        return {
          success: false,
          message: `조건에 맞는 ${limitText} ${isUs ? '미장' : '국장'} 거래대금 상위 종목(레버리지/인버스 제외)을 찾지 못했습니다.`,
          status: this.getScalpingStatus()
        };
      }

      let buyRes = null;
      let targetStock = null;
      let quantity = 1;
      let totalInvested = 0;
      let entryPrice = 0;

      // 최대 3순위까지 순차적으로 주문 시도 (거부 시 차순위 자동 재시도)
      const maxAttempts = Math.min(candidates.length, 3);
      for (let i = 0; i < maxAttempts; i++) {
        const cand = candidates[i];
        const candPrice = cand.currentPrice > 0 ? cand.currentPrice : (isUs ? 10.0 : 10000);
        const maxBudget = isUs ? 100.0 : 100000;
        const candQty = Math.max(1, Math.floor(maxBudget / candPrice));

        console.log(`[ScalpingEngine] Attempting buy #${i + 1}/${maxAttempts}: ${cand.stockName} (${cand.symbol}) ${candQty}주 @ ${candPrice}...`);

        const orderRes = await tossClient.submitOrder({
          symbol: cand.symbol,
          side: 'BUY',
          orderType: 'MARKET',
          quantity: candQty,
          clientOrderId: `SCALP-${Date.now()}`
        });

        // 🌟 [엄격한 증권사 주문 결과 검증] 성공 시에만 포지션 확정
        if (orderRes && orderRes.success) {
          buyRes = orderRes;
          targetStock = cand;
          quantity = candQty;
          entryPrice = candPrice;
          totalInvested = isUs ? parseFloat((candPrice * candQty).toFixed(2)) : (candPrice * candQty);
          console.log(`[ScalpingEngine] Buy order SUCCESS for ${cand.stockName} (orderId: ${orderRes.orderId})`);
          break;
        } else {
          const errMsg = orderRes?.error || `HTTP ${orderRes?.status || 'Unknown'}`;
          console.error(`[ScalpingEngine] Buy order REJECTED for ${cand.stockName} (${cand.symbol}):`, errMsg);

          const hasNext = (i + 1 < maxAttempts);
          const nextPrompt = hasNext ? `• <b>대응:</b> 차순위(${i + 2}위: <b>${candidates[i + 1].stockName}</b>) 종목으로 즉시 재시도합니다...` : '• <b>대응:</b> 모든 후보 종목 주문이 거부되어 안전하게 진입을 중단합니다.';

          telegramBot.sendGeneralMessage(
            `⚠️ <b>[토스증권 초단타 매수 주문 실패]</b>\n\n` +
            `• <b>시도 종목:</b> ${cand.stockName} (<code>${cand.symbol}</code>)\n` +
            `• <b>수량:</b> ${candQty}주 (단가: ${candPrice.toLocaleString()}원)\n` +
            `• <b>거부 사유:</b> <code>${errMsg}</code>\n` +
            `${nextPrompt}`
          );
        }
      }

      // 모든 후보 주문 실패 시 포지션 미생성 및 안전 종료
      if (!buyRes || !buyRes.success || !targetStock) {
        this.scalpingStatus.isActive = false;
        this.scalpingStatus.currentPosition = null;
        this.saveScalpingStatus();
        return {
          success: false,
          message: '초단타 후보 종목들의 증권사 매수 주문이 모두 거부되었습니다.',
          status: this.getScalpingStatus()
        };
      }

      let targetPrice, stopPrice;
      if (isUs) {
        targetPrice = parseFloat((entryPrice * 1.025).toFixed(2));
        stopPrice = parseFloat((entryPrice * 0.985).toFixed(2));
      } else {
        targetPrice = Math.round(entryPrice * 1.025);
        stopPrice = Math.round(entryPrice * 0.985);
      }

      this.scalpingStatus.currentPosition = {
        symbol: targetStock.symbol,
        stockName: targetStock.stockName,
        market,
        currency: targetStock.currency || (isUs ? 'USD' : 'KRW'),
        quantity: quantity,
        entryPrice,
        totalInvested,
        currentPrice: entryPrice,
        targetPrice,
        stopLossPrice: stopPrice,
        targetPct: 2.5,
        stopLossPct: -1.5,
        decayStage: 1,
        elapsedMinutes: 0,
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

      const formattedEntry = isUs ? `$${entryPrice}` : `${entryPrice.toLocaleString()}원`;
      const formattedTotalInvested = isUs ? `$${totalInvested}` : `${totalInvested.toLocaleString()}원`;
      const formattedTarget = isUs ? `$${targetPrice}` : `${targetPrice.toLocaleString()}원`;
      const formattedStop = isUs ? `$${stopPrice}` : `${stopPrice.toLocaleString()}원`;
      const marketTitle = isUs ? '🇺🇸 [미장 거래대금 1위 초단타 스캘핑 진입!]' : '⚡ [국장 거래대금 1위 초단타 스캘핑 진입!]';

      telegramBot.sendGeneralMessage(
        `${marketTitle}\n\n` +
        `• <b>종목명:</b> ${targetStock.stockName} (<code>${targetStock.symbol}</code>)\n` +
        `• <b>매수 수량:</b> <b>${quantity}주</b> (단가: ${formattedEntry} / 총액: <b>${formattedTotalInvested}</b>)\n` +
        `• <b>초기 목표가(+2.5%):</b> <b>${formattedTarget}</b>\n` +
        `• <b>초기 손절가(-1.5%):</b> <b>${formattedStop}</b>\n` +
        `• <b>동적 밴드 압축:</b> 30분(+1.5%/-1.0%) ➔ 60분(+0.8%/-0.5%) ➔ 90분/장마감 강제청산\n` +
        `• <b>감시 모드:</b> 5초 실시간 시세 초고속 감시`
      );

      // 5초 감시 타이머 가동
      this.startScalpingMonitorTimer();

      return {
        success: true,
        message: `${targetStock.stockName} (${targetStock.symbol}) ${quantity}주 (총액: ${formattedTotalInvested}) 초단타 매수 진입 완료 (+2.5% 익절 / -1.5% 손절 감시 시작)`,
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

  clearScalpingPosition() {
    if (this.scalpingTimer) {
      clearInterval(this.scalpingTimer);
      this.scalpingTimer = null;
    }
    if (this.scalpingOpenWaitTimer) {
      clearInterval(this.scalpingOpenWaitTimer);
      this.scalpingOpenWaitTimer = null;
    }
    const prev = this.scalpingStatus.currentPosition;
    this.scalpingStatus.currentPosition = null;
    this.scalpingStatus.isActive = false;
    this.scalpingStatus.isWaitingMarketOpen = false;
    this.saveScalpingStatus();

    if (prev) {
      telegramBot.sendGeneralMessage(
        `🧹 <b>[토스증권 초단타 포지션 정상화 완료]</b>\n\n` +
        `• 이전 미체결 포지션(<b>${prev.stockName}</b>)이 안전하게 초기화되었습니다.\n` +
        `• 실제 토스 계좌 잔고와 포털 상태가 100% 정상 동기화되었습니다.`
      );
    }

    return {
      success: true,
      message: '초단타 포지션이 성공적으로 초기화되었습니다.',
      status: this.getScalpingStatus()
    };
  }

  startScalpingMonitorTimer() {
    if (this.scalpingTimer) {
      clearInterval(this.scalpingTimer);
    }
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

      const isUs = pos.market === 'US' || pos.currency === 'USD';
      const quantity = Number(pos.quantity) || 1;
      const livePrice = isUs ? parseFloat(quote.lastPrice.toFixed(2)) : quote.lastPrice;
      const entryPrice = pos.entryPrice;
      const priceDiff = livePrice - entryPrice;
      const rawPnl = priceDiff * quantity;
      const pnl = isUs ? parseFloat(rawPnl.toFixed(2)) : Math.round(rawPnl);
      const returnPct = parseFloat(((priceDiff / entryPrice) * 100).toFixed(2));

      pos.currentPrice = livePrice;
      pos.unrealizedPnl = pnl;
      pos.returnPct = returnPct;
      pos.lastCheckedAt = new Date().toISOString();

      const fxRate = isUs ? (await tossClient.fetchUsdkrwRate()) : 1;
      const pnlKrw = isUs ? Math.round(pnl * fxRate) : pnl;
      const entryStr = isUs ? `$${entryPrice}` : `${entryPrice.toLocaleString()}원`;
      const liveStr = isUs ? `$${livePrice}` : `${livePrice.toLocaleString()}원`;
      const pnlStr = isUs ? `+$${pnl} (약 +${pnlKrw.toLocaleString()}원)` : `+${pnl.toLocaleString()}원`;
      const lossStr = isUs ? `-$${Math.abs(pnl)} (약 -${Math.abs(pnlKrw).toLocaleString()}원)` : `${pnl.toLocaleString()}원`;
      const marketLabel = isUs ? '미장' : '국장';

      // 🌟 [동적 타임디케이(Time Decay) 보유 시간 및 4단계 산출]
      const now = Date.now();
      const enteredAtMs = pos.enteredAt ? new Date(pos.enteredAt).getTime() : now;
      const elapsedMinutes = Math.max(0, Math.floor((now - enteredAtMs) / 60000));
      pos.elapsedMinutes = elapsedMinutes;

      let stage = 1;
      let targetPct = 2.5;
      let stopLossPct = -1.5;

      if (elapsedMinutes >= 90) {
        stage = 4; // 90분 이상 타임아웃 강제 청산
      } else if (elapsedMinutes >= 60) {
        stage = 3;
        targetPct = 0.8;
        stopLossPct = -0.5;
      } else if (elapsedMinutes >= 30) {
        stage = 2;
        targetPct = 1.5;
        stopLossPct = -1.0;
      }

      // 동적 목표가 및 손절가 계산
      let dynamicTargetPrice, dynamicStopPrice;
      if (isUs) {
        dynamicTargetPrice = parseFloat((entryPrice * (1 + targetPct / 100)).toFixed(2));
        dynamicStopPrice = parseFloat((entryPrice * (1 + stopLossPct / 100)).toFixed(2));
      } else {
        dynamicTargetPrice = Math.round(entryPrice * (1 + targetPct / 100));
        dynamicStopPrice = Math.round(entryPrice * (1 + stopLossPct / 100));
      }
      pos.targetPrice = dynamicTargetPrice;
      pos.stopLossPrice = dynamicStopPrice;
      pos.targetPct = targetPct;
      pos.stopLossPct = stopLossPct;

      const dynamicTargetStr = isUs ? `$${dynamicTargetPrice}` : `${dynamicTargetPrice.toLocaleString()}원`;
      const dynamicStopStr = isUs ? `$${dynamicStopPrice}` : `${dynamicStopPrice.toLocaleString()}원`;

      // 🔔 [단계 승격 시 텔레그램 알림 1회 발송]
      if (stage <= 3 && pos.decayStage !== stage) {
        pos.decayStage = stage;
        this.saveScalpingStatus();

        telegramBot.sendGeneralMessage(
          `⏰ <b>[토스증권] ${marketLabel} 초단타 ${stage === 2 ? '30분' : '60분'} 경과 - 밴드 압축!</b>\n\n` +
          `• <b>종목명:</b> ${pos.stockName} (<code>${pos.symbol}</code>)\n` +
          `• <b>보유 수량:</b> ${quantity}주 (${elapsedMinutes}분 경과, 제${stage}단계 압축 적용)\n` +
          `• <b>신규 목표 익절가(+${targetPct}%):</b> <b>${dynamicTargetStr}</b>\n` +
          `• <b>신규 손절가(${stopLossPct}%):</b> <b>${dynamicStopStr}</b>\n` +
          `• <b>현재가:</b> ${liveStr} (${returnPct >= 0 ? '+' : ''}${returnPct}%)\n\n` +
          `💡 <i>횡보 지연 방지를 위해 매매 기준선을 타이트하게 압축 조정했습니다.</i>`
        );
      }

      // ==========================================
      // 청산 우선순위 판정
      // ==========================================

      // 1. [우선순위 1: 90분 타임아웃 강제 청산]
      if (elapsedMinutes >= 90) {
        console.log(`[ScalpingEngine] 90-minute timeout reached for ${pos.stockName} (${elapsedMinutes}m)! Force selling ${quantity} shares...`);
        const sellRes = await tossClient.submitOrder({
          symbol: pos.symbol,
          side: 'SELL',
          orderType: 'MARKET',
          quantity: quantity,
          clientOrderId: `SCALP-TO-${Date.now()}`
        });

        telegramBot.sendGeneralMessage(
          `⏰ <b>[토스증권] ${marketLabel} 초단타 90분 타임아웃 강제 청산 완료!</b>\n\n` +
          `• <b>종목명:</b> ${pos.stockName} (<code>${pos.symbol}</code>)\n` +
          `• <b>청산 수량:</b> <b>${quantity}주</b> (전량 매도)\n` +
          `• <b>보유 시간:</b> ${elapsedMinutes}분 (최대 보유 시간 90분 도달)\n` +
          `• <b>매수 단가:</b> ${entryStr}\n` +
          `• <b>청산 가격:</b> ${liveStr}\n` +
          `• <b>실현 손익:</b> <b>${returnPct >= 0 ? pnlStr : lossStr} (${returnPct >= 0 ? '+' : ''}${returnPct}%)</b>\n\n` +
          `💡 <i>자금 묶임 방지를 위해 시장가로 전량 매도 완료했습니다.</i>`
        );

        await this.handleScalpingExit(pos, livePrice, pnl, pnlKrw, returnPct, 'TIME_OUT', `⏰ 초단타 90분 타임아웃 강제 청산 (${marketLabel})`, sellRes?.orderId, fxRate);
        return;
      }

      // 2. [우선순위 2: 장 마감 15분 전 오버나잇 차단 강제 청산]
      if (tossClient.isMarketClosingSoon(pos.market)) {
        console.log(`[ScalpingEngine] Market closing soon for ${pos.stockName}! Force selling ${quantity} shares to prevent overnight...`);
        const sellRes = await tossClient.submitOrder({
          symbol: pos.symbol,
          side: 'SELL',
          orderType: 'MARKET',
          quantity: quantity,
          clientOrderId: `SCALP-MKTCLOSE-${Date.now()}`
        });

        telegramBot.sendGeneralMessage(
          `🚨 <b>[토스증권] ${marketLabel} 정규장 마감 15분 전 오버나잇 방지 강제 청산!</b>\n\n` +
          `• <b>종목명:</b> ${pos.stockName} (<code>${pos.symbol}</code>)\n` +
          `• <b>청산 수량:</b> <b>${quantity}주</b> (전량 매도)\n` +
          `• <b>매수 단가:</b> ${entryStr}\n` +
          `• <b>청산 가격:</b> ${liveStr}\n` +
          `• <b>실현 손익:</b> <b>${returnPct >= 0 ? pnlStr : lossStr} (${returnPct >= 0 ? '+' : ''}${returnPct}%)</b>\n\n` +
          `⚠️ <i>당일 청산 원칙 준수를 위해 장 마감 전 전량 시장가 매도했습니다.</i>`
        );

        await this.handleScalpingExit(pos, livePrice, pnl, pnlKrw, returnPct, 'MARKET_CLOSE_EXIT', `🚨 정규장 마감 오버나잇 방지 강제 청산 (${marketLabel})`, sellRes?.orderId, fxRate);
        return;
      }

      // 3. [우선순위 3: 동적 목표가 달성 -> 시장가 익절 매도]
      if (livePrice >= dynamicTargetPrice) {
        console.log(`[ScalpingEngine] Target reached for ${pos.stockName} (${livePrice} >= ${dynamicTargetPrice}, Stage ${stage})! Selling ${quantity} shares...`);
        const sellRes = await tossClient.submitOrder({
          symbol: pos.symbol,
          side: 'SELL',
          orderType: 'MARKET',
          quantity: quantity,
          clientOrderId: `SCALP-TP-${Date.now()}`
        });

        telegramBot.sendGeneralMessage(
          `🎯 <b>[토스증권] ${marketLabel} 초단타 목표가 익절 달성! (+${targetPct}%, ${stage}단계)</b>\n\n` +
          `• <b>종목명:</b> ${pos.stockName} (<code>${pos.symbol}</code>)\n` +
          `• <b>익절 수량:</b> <b>${quantity}주</b> (전량 매도)\n` +
          `• <b>보유 시간:</b> ${elapsedMinutes}분\n` +
          `• <b>매수 단가:</b> ${entryStr}\n` +
          `• <b>청산 가격:</b> ${liveStr}\n` +
          `• <b>실현 손익:</b> <b>${pnlStr} (+${returnPct}%)</b>`
        );

        await this.handleScalpingExit(pos, livePrice, pnl, pnlKrw, returnPct, 'TAKE_PROFIT', `🎯 초단타 +${targetPct}% 목표가 익절 (제${stage}단계, ${marketLabel})`, sellRes?.orderId, fxRate);
        return;
      }

      // 4. [우선순위 4: 동적 손절가 이탈 -> 시장가 즉시 손절]
      if (livePrice <= dynamicStopPrice) {
        console.log(`[ScalpingEngine] Stop loss hit for ${pos.stockName} (${livePrice} <= ${dynamicStopPrice}, Stage ${stage})! Selling ${quantity} shares...`);
        const sellRes = await tossClient.submitOrder({
          symbol: pos.symbol,
          side: 'SELL',
          orderType: 'MARKET',
          quantity: quantity,
          clientOrderId: `SCALP-SL-${Date.now()}`
        });

        telegramBot.sendGeneralMessage(
          `⛔ <b>[토스증권] ${marketLabel} 초단타 손절선 이탈 청산 (${stopLossPct}%, ${stage}단계)</b>\n\n` +
          `• <b>종목명:</b> ${pos.stockName} (<code>${pos.symbol}</code>)\n` +
          `• <b>손절 수량:</b> <b>${quantity}주</b> (전량 매도)\n` +
          `• <b>보유 시간:</b> ${elapsedMinutes}분\n` +
          `• <b>매수 단가:</b> ${entryStr}\n` +
          `• <b>청산 가격:</b> ${liveStr}\n` +
          `• <b>실현 손익:</b> <b>${lossStr} (${returnPct}%)</b>`
        );

        await this.handleScalpingExit(pos, livePrice, pnl, pnlKrw, returnPct, 'STOP_LOSS', `⛔ 초단타 ${stopLossPct}% 손절 청산 (제${stage}단계, ${marketLabel})`, sellRes?.orderId, fxRate);
      }
    } catch (err) {
      console.error('[ScalpingEngine] checkScalpingPosition error:', err.message);
    }
  }

  async handleScalpingExit(pos, exitPrice, realizedPnl, realizedPnlKrw, returnPct, exitReason, reasonTitle, sellOrderId, fxRate) {
    const closedRecord = {
      ...pos,
      exitPrice,
      realizedPnl,
      realizedPnlKrw,
      returnPct,
      exitReason,
      closedAt: new Date().toISOString()
    };

    this.scalpingStatus.history.unshift(closedRecord);
    if (this.scalpingStatus.history.length > 50) {
      this.scalpingStatus.history = this.scalpingStatus.history.slice(0, 50);
    }
    this.scalpingStatus.currentPosition = null;
    this.scalpingStatus.isActive = false;
    this.saveScalpingStatus();

    this.recordScalpingToJournal(pos, exitPrice, realizedPnl, returnPct, exitReason, reasonTitle, sellOrderId, fxRate);

    if (this.scalpingTimer) {
      clearInterval(this.scalpingTimer);
      this.scalpingTimer = null;
    }
  }

  recordScalpingToJournal(pos, exitPrice, realizedPnl, returnPct, reasonCode, reasonTitle, sellOrderId, fxRate = 1) {
    try {
      const journal = this.getJournalData();
      const isUs = pos.market === 'US' || pos.currency === 'USD';
      const effectiveFx = isUs ? (fxRate || 1350) : null;
      const realizedPnlKrw = isUs ? Math.round(realizedPnl * effectiveFx) : realizedPnl;

      let exitDesc = '익절';
      if (reasonCode === 'STOP_LOSS') exitDesc = '손절';
      else if (reasonCode === 'TIME_OUT') exitDesc = '타임아웃청산';
      else if (reasonCode === 'MARKET_CLOSE_EXIT') exitDesc = '장마감청산';

      const qty = Number(pos.quantity) || 1;
      const investedAmount = isUs ? parseFloat((pos.entryPrice * qty).toFixed(2)) : (pos.entryPrice * qty);
      const proceedsAmount = isUs ? parseFloat((exitPrice * qty).toFixed(2)) : (exitPrice * qty);

      const journalItem = {
        id: `SCALP-${Date.now()}`,
        strategyType: 'SCALPING',
        stockName: pos.stockName,
        itemCode: pos.symbol,
        market: pos.market || 'KR',
        currency: pos.currency || 'KRW',
        entryFxRate: effectiveFx,
        exitFxRate: effectiveFx,
        totalQuantity: qty,
        averagePrice: pos.entryPrice,
        exitPrice: exitPrice,
        investedAmount: investedAmount,
        proceedsAmount: proceedsAmount,
        realizedPnl: realizedPnl,
        realizedPnlKrw: realizedPnlKrw,
        returnPct: returnPct,
        reasonCode: reasonCode,
        reasonTitle: reasonTitle,
        orderId: pos.orderId,
        sellOrderId: sellOrderId || null,
        startedAt: pos.enteredAt,
        closedAt: new Date().toISOString(),
        note: `${isUs ? '미장' : '국장'} 개장 실시간 거래대금 1위 초단타 스캘핑 (${exitDesc})`
      };

      journal.history.unshift(journalItem);
      if (journal.history.length > 200) journal.history = journal.history.slice(0, 200);

      this.saveJournalData(journal);
    } catch (err) {
      console.warn('[ScalpingEngine] Failed to record to stock journal:', err.message);
    }
  }

  // =========================================================================
  // ⚔️ AI 끝장토론 토스증권 예약매수 3대 전략 관리 엔진 (관리자 전용)
  // =========================================================================

  /**
   * 예약매수 큐 데이터 로드
   */
  getDebateReservations() {
    try {
      if (fs.existsSync(this.debateReservationsFile)) {
        const raw = fs.readFileSync(this.debateReservationsFile, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('[DebateReservation] Error reading reservations file:', e.message);
    }
    return [];
  }

  /**
   * 예약매수 큐 데이터 저장 및 GCS 백업
   */
  saveDebateReservations(reservations) {
    try {
      if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
      fs.writeFileSync(this.debateReservationsFile, JSON.stringify(reservations, null, 2), 'utf8');
      gcsStorage.saveDebateReservationsToGcs(reservations).catch(e => {
        console.warn('[DebateReservation] GCS background save warning:', e.message);
      });
      return true;
    } catch (e) {
      console.error('[DebateReservation] Error saving reservations file:', e.message);
      return false;
    }
  }

  /**
   * 토론 내용(지지선, DART 수급, 테마 등) 분석 기반 3대 전략 가격 및 매도 계획 도출
   */
  calculateDebateReservationStrategy(debateItem, strategyType, liveQuote, fxRate = 1350) {
    const isKrStock = /^[0-9]{6}$/.test(debateItem.item_code);
    const currency = isKrStock ? 'KRW' : 'USD';
    const rawPrice = liveQuote && liveQuote.lastPrice > 0 ? liveQuote.lastPrice : parseFloat(String(debateItem.current_price || '0').replace(/[^0-9.]/g, ''));

    let krwPrice = 0;
    let usdPrice = 0;
    if (currency === 'USD') {
      usdPrice = rawPrice;
      krwPrice = Math.round(usdPrice * fxRate);
    } else {
      krwPrice = Math.round(rawPrice);
      usdPrice = parseFloat((krwPrice / fxRate).toFixed(2));
    }

    // 10만원 이하 검증 (규칙 엄수)
    if (krwPrice > 100000) {
      throw new Error(`원화 환산가(${krwPrice.toLocaleString()}원)가 10만원 이하 매매 제한을 초과합니다.`);
    }

    // 토론 내 지지선 분석 (기술분석가, 단가 에이전트 발언 파싱)
    let dipPct = 1.5; // 기본 -1.5% 눌림목
    let supportPrice = 0;
    if (Array.isArray(debateItem.turns)) {
      for (const turn of debateItem.turns) {
        const msg = turn.message || '';
        const mSupport = msg.match(/(?:지지선|눌림목|분할단가|하단)\s*[:：]?\s*([0-9,]+)\s*원/);
        if (mSupport && mSupport[1]) {
          const parsedSup = parseInt(mSupport[1].replace(/,/g, ''), 10);
          if (parsedSup > 0 && parsedSup < krwPrice && parsedSup >= krwPrice * 0.90) {
            supportPrice = parsedSup;
            break;
          }
        }
      }
    }

    // 체결 후 적응형 매도(익절/손절) 전략 계산 (주도 테마 & 거래대금 연동)
    const judge = debateItem.judge_decision || {};
    const themes = Array.isArray(judge.daily_themes) ? judge.daily_themes : [];
    const winnerScore = parseFloat(judge.winner_total_score || 0);

    // AI, 반도체, 전력, 원전 등 강력 테마나 점수 120점 이상 고득점 종목 판정
    const hasCoreTheme = themes.some(t => ['AI', '반도체', '원전', '전력', '로봇', '바이오'].includes(t));
    const isStrongThemeStock = hasCoreTheme || winnerScore >= 120;

    let targetProfitPct = 3.0; // 기본 빠른 회전 모드 (+3.0%)
    let stopLossPct = -2.0;    // 기본 단기 손절선 (-2.0%)
    let exitStrategyTitle = '⚡ 단기 빠른 회전 모드 (익절 +3.0% / 손절 -2.0%)';

    if (isStrongThemeStock) {
      targetProfitPct = 12.0; // 강력 주도 테마 추세 스윙 모드 (+12.0%)
      stopLossPct = -5.0;     // 손절 여유 (-5.0%)
      exitStrategyTitle = '🚀 강력 주도 테마 추세 스윙 모드 (목표가 +12.0% / 손절선 -5.0%)';
    }

    let orders = [];

    if (strategyType === 'SMART_DIP') {
      // 1️⃣ 스마트 눌림목 예약매수 (무조건 1주)
      let buyPriceKrw = supportPrice > 0 ? supportPrice : Math.round(krwPrice * (1 - dipPct / 100));
      let buyPriceUsd = isKrStock ? 0 : parseFloat((usdPrice * (1 - dipPct / 100)).toFixed(2));
      const finalPrice = isKrStock ? buyPriceKrw : buyPriceUsd;

      orders.push({
        subIndex: 1,
        title: '📉 스마트 눌림목 지정가 (1주)',
        price: finalPrice,
        priceKrw: buyPriceKrw,
        quantity: 1,
        orderType: 'LIMIT',
        desc: supportPrice > 0
          ? `기술분석가 지지선(${supportPrice.toLocaleString()}원) 체결 예약 (1주)`
          : `현재가 대비 -${dipPct}% 눌림목(${buyPriceKrw.toLocaleString()}원) 체결 예약 (1주)`
      });
    } else if (strategyType === 'MARKET_OPEN') {
      // 2️⃣ 시초가 우선 체결 예약매수 (무조건 1주)
      orders.push({
        subIndex: 1,
        title: '⚡ 시초가 우선 체결 (1주)',
        price: rawPrice,
        priceKrw: krwPrice,
        quantity: 1,
        orderType: 'LIMIT',
        desc: `개장(09:00) 시초가/동시호가 우선 체결 지정가(${krwPrice.toLocaleString()}원) 예약 (1주)`
      });
    } else if (strategyType === 'SPLIT_BUY') {
      // 3️⃣ 2회 분할 예약매수 (각 1주)
      // 1차: 현재가 수준 1주
      orders.push({
        subIndex: 1,
        title: '🪜 1차 진입 (현재가 1주)',
        price: rawPrice,
        priceKrw: krwPrice,
        quantity: 1,
        orderType: 'LIMIT',
        desc: `1차: 현재가 수준(${krwPrice.toLocaleString()}원) 즉시 진입 1주`
      });

      // 2차: 지지선 또는 -2% 눌림목 1주
      const split2Krw = supportPrice > 0 ? supportPrice : Math.round(krwPrice * 0.98);
      const split2Usd = isKrStock ? 0 : parseFloat((usdPrice * 0.98).toFixed(2));
      orders.push({
        subIndex: 2,
        title: '🪜 2차 지지선 눌림목 (1주)',
        price: isKrStock ? split2Krw : split2Usd,
        priceKrw: split2Krw,
        quantity: 1,
        orderType: 'LIMIT',
        desc: `2차: 지지선/눌림목 -2%(${split2Krw.toLocaleString()}원) 안전 분할 1주`
      });
    } else {
      throw new Error(`지원하지 않는 예약 전략 유형입니다: ${strategyType}`);
    }

    return {
      strategyType,
      strategyTitle: strategyType === 'SMART_DIP' ? '📉 스마트 눌림목 예약매수 (1주)' : (strategyType === 'MARKET_OPEN' ? '⚡ 시초가 우선 체결 (1주)' : '🪜 2회 분할 예약매수 (각 1주)'),
      itemCode: debateItem.item_code,
      stockName: debateItem.stock_name,
      currency,
      currentPrice: rawPrice,
      currentPriceKrw: krwPrice,
      orders,
      totalQuantity: orders.reduce((sum, o) => sum + o.quantity, 0),
      totalBudgetKrw: orders.reduce((sum, o) => sum + (o.priceKrw * o.quantity), 0),
      exitPlan: {
        targetProfitPct,
        stopLossPct,
        exitStrategyTitle,
        isStrongThemeStock,
        matchedThemes: themes.slice(0, 3)
      }
    };
  }

  /**
   * AI 끝장토론 예약매수 신청 접수 (관리자 전용)
   */
  async createDebateReservation({ debateId, itemCode, strategyType, adminUser = 'admin' }) {
    let debateList = [];
    if (fs.existsSync(this.debateLogsFile)) {
      debateList = JSON.parse(fs.readFileSync(this.debateLogsFile, 'utf8'));
    }

    const debateItem = debateList.find(d => (debateId && d.id === debateId) || (itemCode && d.item_code === itemCode));
    if (!debateItem) {
      throw new Error(`해당 종목의 AI 끝장토론 기록을 찾을 수 없습니다. (코드: ${itemCode || debateId})`);
    }

    const cleanCode = String(debateItem.item_code || '').trim();
    const liveQuote = await tossClient.getQuote(cleanCode);
    const fxRate = await tossClient.fetchUsdkrwRate();

    const plan = this.calculateDebateReservationStrategy(debateItem, strategyType, liveQuote, fxRate);

    const reservations = this.getDebateReservations();

    // 중복 대기 확인 (동일 종목 동일 전략 이미 PENDING 상태인지 확인)
    const existing = reservations.find(r => r.itemCode === cleanCode && r.strategyType === strategyType && r.status === 'PENDING');
    if (existing) {
      throw new Error(`이미 동일 종목에 [${plan.strategyTitle}] 예약매수가 대기 중입니다. (예약 ID: ${existing.id})`);
    }

    const newReservation = {
      id: `RES-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      debateId: debateItem.id || `debate-${cleanCode}`,
      itemCode: cleanCode,
      stockName: debateItem.stock_name,
      market: /^[0-9]{6}$/.test(cleanCode) ? 'KR' : 'US',
      strategyType: plan.strategyType,
      strategyTitle: plan.strategyTitle,
      currency: plan.currency,
      currentPrice: plan.currentPrice,
      currentPriceKrw: plan.currentPriceKrw,
      orders: plan.orders,
      totalQuantity: plan.totalQuantity,
      totalBudgetKrw: plan.totalBudgetKrw,
      exitPlan: plan.exitPlan,
      status: 'PENDING', // PENDING -> ORDER_SUBMITTED -> FILLED / CANCELLED / EXPIRED
      orderResults: [],
      createdBy: adminUser,
      createdAt: new Date().toISOString(),
      scheduledTargetSession: /^[0-9]{6}$/.test(cleanCode) ? 'KRX_REGULAR_OPEN' : 'US_REGULAR_OPEN',
      note: `AI끝장토론 의결 기반 예약매수 (5대 에이전트 공방 분석)`
    };

    reservations.unshift(newReservation);
    this.saveDebateReservations(reservations);

    // 텔레그램 알림 전송
    const orderDescLines = plan.orders.map(o => `• <b>${o.title}:</b> ${o.price.toLocaleString()}원 × ${o.quantity}주 (${o.desc})`).join('\n');
    telegramBot.sendGeneralMessage(
      `🎯 <b>[토스증권 AI 끝장토론 예약매수 접수 완료]</b>\n\n` +
      `• <b>종목명:</b> ${newReservation.stockName} (${newReservation.itemCode})\n` +
      `• <b>전략 유형:</b> ${newReservation.strategyTitle}\n` +
      `• <b>현재가:</b> ${newReservation.currentPriceKrw.toLocaleString()}원\n` +
      `• <b>예약 발주 계획:</b>\n${orderDescLines}\n` +
      `• <b>총 예약 수량:</b> ${newReservation.totalQuantity}주 (총 ${newReservation.totalBudgetKrw.toLocaleString()}원)\n` +
      `• <b>체결 후 매도 전략:</b> ${plan.exitPlan.exitStrategyTitle}\n\n` +
      `⏰ 개장 골든타임(08:00 프리마켓 또는 08:55 동시호가)에 토스증권 API로 자동 발주됩니다.`
    );

    return {
      success: true,
      reservation: newReservation,
      message: `[${newReservation.stockName}] ${newReservation.strategyTitle} 예약매수가 성공적으로 접수되었습니다. 개장 시 자동 발주됩니다.`
    };
  }

  /**
   * 예약매수 취소 (관리자 전용)
   */
  async cancelDebateReservation(reservationId, adminUser = 'admin') {
    const reservations = this.getDebateReservations();
    const item = reservations.find(r => r.id === reservationId);
    if (!item) {
      throw new Error(`해당 예약 주문을 찾을 수 없습니다. (${reservationId})`);
    }

    if (item.status === 'FILLED') {
      throw new Error('이미 전량 체결된 주문은 예약 취소할 수 없습니다.');
    }

    // 만약 이미 토스증권에 발주 제출된 상태라면 실제 증권사 주문 취소 호출
    if (item.status === 'ORDER_SUBMITTED' && Array.isArray(item.orderResults)) {
      for (const ord of item.orderResults) {
        if (ord.orderId) {
          try {
            await tossClient.cancelOrder(ord.orderId);
            console.log(`[DebateReservation] Cancelled Toss order ${ord.orderId} for reservation ${reservationId}`);
          } catch (e) {
            console.warn(`[DebateReservation] Toss order cancel warning:`, e.message);
          }
        }
      }
    }

    item.status = 'CANCELLED';
    item.cancelledAt = new Date().toISOString();
    item.cancelledBy = adminUser;

    this.saveDebateReservations(reservations);

    telegramBot.sendGeneralMessage(
      `🗑️ <b>[토스증권 AI 예약매수 취소 완료]</b>\n\n` +
      `• <b>종목명:</b> ${item.stockName} (${item.itemCode})\n` +
      `• <b>전략:</b> ${item.strategyTitle}\n` +
      `• <b>예약 ID:</b> <code>${item.id}</code>`
    );

    return {
      success: true,
      message: `[${item.stockName}] 예약매수가 성공적으로 취소되었습니다.`
    };
  }

  /**
   * 개장 골든타임 시 예약 큐에서 대기 중인 주문 자동 발주
   */
  async processScheduledReservations() {
    const reservations = this.getDebateReservations();
    const pendingList = reservations.filter(r => r.status === 'PENDING');
    if (pendingList.length === 0) return;

    const now = new Date();
    const kst = tossClient.getKstDate(now);
    const day = kst.getDay();
    if (day === 0 || day === 6) return; // 주말

    const h = kst.getHours();
    const m = kst.getMinutes();
    const totalMinutes = h * 60 + m;

    // 국장 발주 허용 시간: 08:00~08:50 (NXT 프리마켓) 또는 08:50~15:20 (KRX 개장/정규장)
    const isKrOrderWindow = (totalMinutes >= 480 && totalMinutes <= 920);

    for (const res of pendingList) {
      if (res.market === 'KR' && isKrOrderWindow) {
        console.log(`[DebateReservation] 🚀 예약 주문 자동 발주 시작: ${res.stockName} (${res.itemCode}) - ${res.strategyTitle}`);
        const orderResults = [];

        for (const ord of res.orders) {
          try {
            const submitRes = await tossClient.submitOrder({
              symbol: res.itemCode,
              side: 'BUY',
              orderType: ord.orderType || 'LIMIT',
              quantity: ord.quantity || 1,
              price: ord.price || ord.priceKrw,
              clientOrderId: `RES-${res.id.slice(-6)}-${ord.subIndex}`
            });

            orderResults.push({
              subIndex: ord.subIndex,
              title: ord.title,
              orderId: submitRes.orderId,
              clientOrderId: submitRes.clientOrderId,
              submittedPrice: ord.price,
              quantity: ord.quantity,
              submittedAt: new Date().toISOString(),
              isSuccess: true
            });
          } catch (ordErr) {
            console.error(`[DebateReservation] Order submit failed for ${res.stockName}:`, ordErr.message);
            orderResults.push({
              subIndex: ord.subIndex,
              title: ord.title,
              error: ordErr.message,
              isSuccess: false
            });
          }
        }

        const anySuccess = orderResults.some(o => o.isSuccess);
        if (anySuccess) {
          res.status = 'ORDER_SUBMITTED';
          res.orderResults = orderResults;
          res.submittedAt = new Date().toISOString();

          telegramBot.sendGeneralMessage(
            `🚀 <b>[토스증권 예약매수 자동 발주 완료]</b>\n\n` +
            `• <b>종목명:</b> ${res.stockName} (${res.itemCode})\n` +
            `• <b>전략:</b> ${res.strategyTitle}\n` +
            `• <b>발주 주문 번호:</b> ${orderResults.filter(o => o.orderId).map(o => o.orderId).join(', ')}\n` +
            `• <b>체결 감시:</b> 체결 완료 시 자동 익절/손절 매매일지로 인계됩니다.`
          );
        }
      }
    }

    this.saveDebateReservations(reservations);
  }

  /**
   * 발주 완료된 예약 주문 체결 감시 및 포지션 자동 인계
   */
  async checkReservationExecutions() {
    const reservations = this.getDebateReservations();
    const submittedList = reservations.filter(r => r.status === 'ORDER_SUBMITTED');
    if (submittedList.length === 0) return;

    for (const res of submittedList) {
      let isFilled = false;
      let filledPrice = 0;
      let filledQty = 0;

      for (const ord of res.orderResults) {
        if (!ord.orderId) continue;
        try {
          const detail = await tossClient.getOrderDetail(ord.orderId);
          if (detail && (detail.status === 'FILLED' || detail.executedQuantity > 0)) {
            isFilled = true;
            filledQty += (detail.executedQuantity || ord.quantity || 1);
            filledPrice = detail.averageExecutionPrice || ord.submittedPrice;
            ord.status = 'FILLED';
            ord.filledPrice = filledPrice;
          }
        } catch (e) {
          // 조회 실패 시 건너뜀
        }
      }

      if (isFilled) {
        res.status = 'FILLED';
        res.filledAt = new Date().toISOString();
        res.finalFilledPrice = filledPrice;
        res.finalFilledQty = filledQty;

        console.log(`[DebateReservation] 🎉 예약매수 전량 체결 확인: ${res.stockName} (${filledQty}주 @ ${filledPrice}원)`);

        // 🌟 [독립 분리 모드] 집중운용포지션과 분리하여 '예약 운용 포지션(멀티 종목)'으로 독립 등록
        try {
          const journal = this.getJournalData();
          if (!Array.isArray(journal.reservationPositions)) journal.reservationPositions = [];

          // 기존 currentPosition에 잘못 들어가 있던 파수AI 등 예약 포지션 자동 마이그레이션
          if (journal.currentPosition && journal.currentPosition.strategyNote && journal.currentPosition.strategyNote.includes('AI끝장토론')) {
            const oldPos = journal.currentPosition;
            if (!journal.reservationPositions.some(p => p.stockCode === oldPos.stockCode)) {
              journal.reservationPositions.push({
                id: `RESPOS-${Date.now()}-${oldPos.stockCode}`,
                reservationId: res.id,
                stockCode: oldPos.stockCode,
                stockName: oldPos.stockName,
                market: oldPos.market,
                currency: oldPos.currency,
                quantity: oldPos.quantity || 1,
                entryPrice: oldPos.entryPrice,
                entryPriceKrw: oldPos.entryPriceKrw,
                currentPrice: oldPos.currentPrice || oldPos.entryPrice,
                currentPriceKrw: oldPos.currentPriceKrw || oldPos.entryPriceKrw,
                targetPrice: oldPos.targetPrice,
                stopLossPrice: oldPos.stopLossPrice,
                unrealizedPnl: oldPos.unrealizedPnl || 0,
                unrealizedPnlKrw: oldPos.unrealizedPnlKrw || 0,
                returnPct: oldPos.returnPct || 0,
                status: 'HOLDING',
                orderId: oldPos.orderId,
                enteredAt: oldPos.enteredAt || new Date().toISOString(),
                targetProfitPct: oldPos.targetProfitPct || 3.0,
                stopLossPct: oldPos.stopLossPct || -2.0,
                strategyTitle: res.strategyTitle,
                exitStrategyTitle: oldPos.strategyNote || '적응형 매도'
              });
            }
            journal.currentPosition = null; // 집중운용포지션 초기화 (순수 자동매매 전용 복원)
          }

          const isKr = res.market === 'KR';
          const fx = await tossClient.fetchUsdkrwRate();
          const exitPlan = res.exitPlan || {};

          const targetPrice = isKr
            ? Math.round(filledPrice * (1 + (exitPlan.targetProfitPct || 3.0) / 100))
            : parseFloat((filledPrice * (1 + (exitPlan.targetProfitPct || 3.0) / 100)).toFixed(2));
          const stopLossPrice = isKr
            ? Math.round(filledPrice * (1 + (exitPlan.stopLossPct || -2.0) / 100))
            : parseFloat((filledPrice * (1 + (exitPlan.stopLossPct || -2.0) / 100)).toFixed(2));

          const existingPos = journal.reservationPositions.find(p => p.stockCode === res.itemCode);
          if (!existingPos) {
            journal.reservationPositions.push({
              id: `RESPOS-${Date.now()}-${res.itemCode}`,
              reservationId: res.id,
              stockCode: res.itemCode,
              stockName: res.stockName,
              market: res.market,
              currency: res.currency,
              quantity: filledQty,
              entryPrice: filledPrice,
              entryPriceKrw: isKr ? filledPrice : Math.round(filledPrice * fx),
              currentPrice: filledPrice,
              currentPriceKrw: isKr ? filledPrice : Math.round(filledPrice * fx),
              targetPrice: targetPrice,
              stopLossPrice: stopLossPrice,
              unrealizedPnl: 0,
              unrealizedPnlKrw: 0,
              returnPct: 0,
              status: 'HOLDING',
              orderId: res.orderResults[0]?.orderId || `ORD-${Date.now()}`,
              enteredAt: new Date().toISOString(),
              targetProfitPct: exitPlan.targetProfitPct || 3.0,
              stopLossPct: exitPlan.stopLossPct || -2.0,
              strategyTitle: res.strategyTitle,
              exitStrategyTitle: exitPlan.exitStrategyTitle || '적응형 매도',
              strategyNote: `AI끝장토론 [${res.strategyTitle}] 체결 포지션`
            });
          }

          this.saveJournalData(journal);

          telegramBot.sendGeneralMessage(
            `🎉 <b>[토스증권 AI 끝장토론 예약 포지션 독립 등록 완료]</b>\n\n` +
            `• <b>종목명:</b> ${res.stockName} (${res.itemCode})\n` +
            `• <b>체결단가:</b> ${filledPrice.toLocaleString()}원 × ${filledQty}주\n` +
            `• <b>목표가 (익절):</b> ${targetPrice.toLocaleString()}원 (+${exitPlan.targetProfitPct || 3.0}%)\n` +
            `• <b>손절선 (손절):</b> ${stopLossPrice.toLocaleString()}원 (${exitPlan.stopLossPct || -2.0}%)\n` +
            `• <b>매도 전략:</b> ${exitPlan.exitStrategyTitle}\n\n` +
            `매매일지의 독립 예약 포지션 섹션에서 실시간 손익과 익절/손절이 자동 감시됩니다.`
          );
        } catch (jErr) {
          console.error('[DebateReservation] Error transferring to reservation position:', jErr.message);
        }
      }
    }

    this.saveDebateReservations(reservations);
  }

  /**
   * 🌟 AI 끝장토론 예약 운용 포지션(멀티 종목) 실시간 시세 추적 및 자동 익절/손절 매도 감시
   */
  async monitorReservationPositions() {
    const journal = this.getJournalData();
    if (!Array.isArray(journal.reservationPositions) || journal.reservationPositions.length === 0) {
      return;
    }

    // 🌟 [핵심 안전장치] 토스증권 실제 계좌 잔고 우선 대조
    let activeHoldingsMap = new Map();
    let holdingsChecked = false;
    try {
      const holdingsRes = await tossClient.getHoldings();
      if (holdingsRes && holdingsRes.success && holdingsRes.data && Array.isArray(holdingsRes.data.items)) {
        holdingsChecked = true;
        for (const item of holdingsRes.data.items) {
          const qty = Number(item.quantity) || 0;
          if (qty > 0 && item.symbol) {
            activeHoldingsMap.set(String(item.symbol).trim(), item);
          }
        }
      }
    } catch (hErr) {
      console.warn('[DebateReservation] Failed to fetch live holdings for verification:', hErr.message);
    }

    const fxRate = await tossClient.fetchUsdkrwRate();
    const remainingPositions = [];
    const reservations = this.getDebateReservations();
    let reservationsUpdated = false;

    for (const pos of journal.reservationPositions) {
      if (pos.status !== 'HOLDING') continue;

      // 🌟 [실계좌 실측 검증] 실제 토스 계좌에 해당 주식이 더 이상 존재하지 않는 경우 -> 이미 매도 완료됨
      if (holdingsChecked && !activeHoldingsMap.has(String(pos.stockCode).trim())) {
        console.log(`[DebateReservation] 종목 ${pos.stockName}(${pos.stockCode}) 실계좌 잔고 0 감지 -> 감시 종료 및 예약 청산 완료 처리`);
        const targetRes = reservations.find(r => r.id === pos.reservationId || r.itemCode === pos.stockCode);
        if (targetRes && targetRes.status !== 'CLOSED') {
          targetRes.status = 'CLOSED';
          targetRes.closedAt = new Date().toISOString();
          targetRes.exitReason = '토스증권 실계좌 매도 완료 감지';
          reservationsUpdated = true;
        }
        continue; // remainingPositions에 추가하지 않고 즉시 청산 종료 (반복 발주/알림 스팸 원천 차단)
      }

      try {
        const quote = await tossClient.getQuote(pos.stockCode);
        if (quote && quote.lastPrice > 0) {
          const livePrice = quote.lastPrice;
          pos.currentPrice = livePrice;
          const isKr = pos.market === 'KR';
          pos.currentPriceKrw = isKr ? livePrice : Math.round(livePrice * fxRate);

          const pnlPerShare = livePrice - pos.entryPrice;
          const returnPct = parseFloat(((pnlPerShare / pos.entryPrice) * 100).toFixed(2));
          pos.returnPct = returnPct;
          pos.unrealizedPnl = parseFloat((pnlPerShare * pos.quantity).toFixed(2));
          pos.unrealizedPnlKrw = isKr ? Math.round(pos.unrealizedPnl) : Math.round(pos.unrealizedPnl * fxRate);

          // 1. 목표가 도달 익절 매도 판정
          const isTargetReached = (livePrice >= pos.targetPrice);
          // 2. 손절선 도달 손절 매도 판정
          const isStopLossReached = (livePrice <= pos.stopLossPrice);

          if (isTargetReached || isStopLossReached) {
            const isProfit = isTargetReached;
            const reasonCode = isProfit ? 'TAKE_PROFIT' : 'STOP_LOSS';
            const reasonTitle = isProfit
              ? `🎯 AI 끝장토론 예약매매 목표가(+${pos.targetProfitPct}%) 익절 청산`
              : `⛔ AI 끝장토론 예약매매 손절선(${pos.stopLossPct}%) 손절 청산`;

            console.log(`[DebateReservation] ${reasonTitle}: ${pos.stockName} (${returnPct}%, 현재가 ${livePrice}원)`);

            let sellOrderId = null;
            try {
              const sellRes = await tossClient.submitOrder({
                symbol: pos.stockCode,
                side: 'SELL',
                orderType: 'MARKET',
                quantity: pos.quantity,
                clientOrderId: `EX-${pos.stockCode}-${Date.now().toString().slice(-6)}`
              });
              sellOrderId = sellRes?.orderId || null;
            } catch (sellErr) {
              console.error(`[DebateReservation] Exit order failed for ${pos.stockName}:`, sellErr.message);
            }

            // debateReservations.json 상태를 CLOSED로 영구 갱신하여 부활 방지
            const targetRes = reservations.find(r => r.id === pos.reservationId || r.itemCode === pos.stockCode);
            if (targetRes) {
              targetRes.status = 'CLOSED';
              targetRes.closedAt = new Date().toISOString();
              targetRes.exitPrice = livePrice;
              targetRes.exitReason = reasonTitle;
              targetRes.realizedPnlKrw = parseFloat(((livePrice - pos.entryPrice) * pos.quantity).toFixed(2));
              targetRes.returnPct = returnPct;
              reservationsUpdated = true;
            }

            // 매매일지 history에 청산 이력 1회만 영구 기록
            const investedAmount = isKr ? (pos.entryPrice * pos.quantity) : (pos.entryPriceKrw * pos.quantity);
            const proceedsAmount = isKr ? (livePrice * pos.quantity) : (pos.currentPriceKrw * pos.quantity);
            const realizedPnl = parseFloat((proceedsAmount - investedAmount).toFixed(2));

            if (!Array.isArray(journal.history)) journal.history = [];
            const alreadyLogged = journal.history.some(h => h.itemCode === pos.stockCode && h.strategyType === 'DEBATE_RESERVATION');
            if (!alreadyLogged) {
              const journalItem = {
                id: `DEBATE-EXIT-${Date.now()}-${pos.stockCode}`,
                strategyType: 'DEBATE_RESERVATION',
                stockName: pos.stockName,
                itemCode: pos.stockCode,
                market: pos.market,
                currency: pos.currency,
                entryFxRate: fxRate,
                exitFxRate: fxRate,
                totalQuantity: pos.quantity,
                averagePrice: pos.entryPrice,
                exitPrice: livePrice,
                investedAmount: investedAmount,
                proceedsAmount: proceedsAmount,
                realizedPnl: realizedPnl,
                realizedPnlKrw: realizedPnl,
                returnPct: returnPct,
                reasonCode: reasonCode,
                reasonTitle: reasonTitle,
                orderId: pos.orderId,
                sellOrderId: sellOrderId || null,
                startedAt: pos.enteredAt,
                closedAt: new Date().toISOString(),
                note: `AI 끝장토론 [${pos.strategyTitle || '예약매수'}] 자동 청산 (${pos.exitStrategyTitle || '적응형 매도'})`
              };
              journal.history.unshift(journalItem);
            }

            // 실제 매도 발주에 성공했을 때만 텔레그램 알림 1회 발송
            if (sellOrderId) {
              telegramBot.sendGeneralMessage(
                `${isProfit ? '🎯' : '⛔'} <b>[토스증권 AI 끝장토론 예약 포지션 자동 청산]</b>\n\n` +
                `• <b>종목명:</b> ${pos.stockName} (${pos.stockCode})\n` +
                `• <b>청산 사유:</b> ${reasonTitle}\n` +
                `• <b>매수가:</b> ${pos.entryPrice.toLocaleString()}원 ➔ <b>매도가:</b> ${livePrice.toLocaleString()}원\n` +
                `• <b>수익률:</b> <b>${returnPct > 0 ? '+' : ''}${returnPct}%</b> (${realizedPnl.toLocaleString()}원)\n` +
                `• <b>보유 수량:</b> ${pos.quantity}주 전량 매도 완료`
              );
            }

            continue; // 청산 완료되었으므로 remainingPositions에 추가하지 않음
          }
        }
      } catch (err) {
        console.warn(`[DebateReservation] Quote/monitoring error for ${pos.stockName}:`, err.message);
      }

      remainingPositions.push(pos);
    }

    if (reservationsUpdated) {
      this.saveDebateReservations(reservations);
    }

    journal.reservationPositions = remainingPositions;
    this.saveJournalData(journal);
  }
}

module.exports = new StockAutoTrader();
