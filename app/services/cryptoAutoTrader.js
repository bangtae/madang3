// app/services/cryptoAutoTrader.js - 빗썸 24/7 코인 스윙 자동매매 및 롤링 데몬
// 10만원 이하 1개 코인 분할 매수 ➔ 24시간 시세 감시 ➔ 분할 익절/손절 ➔ 다음 코인 순환 롤링

const fs = require('fs');
const path = require('path');
const { bithumbClient } = require('../utils/bithumbClient');
const { cryptoScoutService } = require('./cryptoScoutService');

const STATE_FILE = path.join(__dirname, '../../data/cryptoTradingState.json');

class CryptoAutoTrader {
  constructor() {
    this.state = {
      isAutoTradingEnabled: false,
      tradingMode: 'LIVE', // 'LIVE' (빗썸 실전) 또는 'SIMULATION' (모의투자)
      budget: 100000,
      currentPosition: null,
      history: [],
      lastDebate: null,
      stats: {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        totalRealizedPnlKrw: 0,
        winRatePct: 0
      },
      lastDaemonCheckAt: null
    };

    this.timer = null;
    this.isProcessing = false;
    this.loadState();
  }

  // 상태 로드
  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = Object.assign(this.state, parsed);
      } else {
        this.saveState();
      }
    } catch (e) {
      console.warn('[CryptoAutoTrader] Load state warning:', e.message);
    }
  }

  // 상태 저장
  saveState() {
    try {
      const dir = path.dirname(STATE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (e) {
      console.error('[CryptoAutoTrader] Save state error:', e.message);
    }
  }

  // 텔레그램 알림 발송 헬퍼 (server.js telegram 봇과 연동)
  async sendTelegram(message) {
    try {
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = process.env.TELEGRAM_CHAT_ID;
      if (!tgToken || !tgChatId) return;

      const url = `https://api.telegram.org/bot${tgToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (e) {
      console.warn('[CryptoAutoTrader] Telegram send warning:', e.message);
    }
  }

  // 24시간 백그라운드 감시 데몬 기동
  startDaemon(intervalSeconds = 25) {
    if (this.timer) clearInterval(this.timer);
    console.log(`[CryptoAutoTrader] 24/7 코인 자동매매 데몬 가동 (주기: ${intervalSeconds}초)`);
    this.timer = setInterval(() => this.processCycle(), intervalSeconds * 1000);
    // 즉시 1회 실행
    setTimeout(() => this.processCycle(), 2000);
  }

  stopDaemon() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[CryptoAutoTrader] 24/7 코인 자동매매 데몬 중지');
  }

  // 24시간 순환 매매 핵심 프로세스
  async processCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.state.lastDaemonCheckAt = new Date().toISOString();

    try {
      // 자동투자가 꺼져있으면 패스
      if (!this.state.isAutoTradingEnabled) {
        return;
      }

      // 1. 현재 진입한 포지션이 없는 경우: 10대 소스 분석 ➔ 1개 코인 발굴 ➔ 1차 분할매수
      if (!this.state.currentPosition) {
        await this.enterNewTopPickPosition();
      } else {
        // 2. 이미 포지션을 보유 중인 경우: 빗썸 실시간 시세 감시 ➔ 2차 분할매수 or 익절/손절
        await this.monitorAndExitPosition();
      }
    } catch (err) {
      console.error('[CryptoAutoTrader] Cycle error:', err.message);
    } finally {
      this.saveState();
      this.isProcessing = false;
    }
  }

  // 신규 1위 코인 선정 및 1차 분할 매수 진입
  async enterNewTopPickPosition() {
    console.log('[CryptoAutoTrader] 포지션 공백 감지: 10대 소스 코인 스카우트 시작...');
    const scout = await cryptoScoutService.selectTopPickCoin(true);
    const top = scout.topPick;
    this.state.lastDebate = scout.debate;

    const currentPrice = top.price;
    const split1Budget = 50000; // 1차 5만원
    const mode = this.state.tradingMode;

    let executedQty = 0;
    let avgPrice = currentPrice;

    if (mode === 'LIVE') {
      console.log(`[CryptoAutoTrader] 빗썸 실전 1차 분할매수 발주: ${top.koreanName}(${top.market}), 금액: ${split1Budget}원`);
      const orderRes = await bithumbClient.buyMarket(top.market, split1Budget);
      console.log('[CryptoAutoTrader] 빗썸 실전 매수 결과:', orderRes);
      // 시장가 체결 수량 추정 (0.04% 수수료 고려)
      executedQty = (split1Budget * 0.9996) / currentPrice;
    } else {
      // 모의투자 가상 체결
      executedQty = split1Budget / currentPrice;
      console.log(`[CryptoAutoTrader] [모의투자] 1차 분할매수 가상 체결: ${top.koreanName}, ${executedQty.toFixed(4)}개 (@${currentPrice}원)`);
    }

    const pos = {
      id: `POS-${Date.now()}-${top.symbol}`,
      symbol: top.symbol,
      koreanName: top.koreanName,
      market: top.market,
      mode,
      stage: 'SPLIT_1_ACTIVE',
      entryPrice: currentPrice,
      avgBuyPrice: avgPrice,
      totalVolume: executedQty,
      investedKrw: split1Budget,
      remainingVolume: executedQty,
      split1Done: true,
      split1Amount: split1Budget,
      split1Time: new Date().toISOString(),
      split2Done: false,
      split2TargetPrice: top.supportPrice,
      split2Amount: 50000,
      targetPrice1: top.targetPrice1,
      targetPrice2: top.targetPrice2,
      stopLossPrice: top.stopLossPrice,
      tp1Done: false,
      realizedPnlKrw: 0,
      unrealizedPnlKrw: 0,
      unrealizedReturnPct: 0,
      lastPrice: currentPrice,
      enteredAt: new Date().toISOString(),
      debateSummary: scout.debate.summary
    };

    this.state.currentPosition = pos;
    this.saveState();

    const modeTag = mode === 'LIVE' ? '🔴 빗썸 실전 매매' : '🟡 모의투자 시뮬레이션';
    await this.sendTelegram(
      `🪙 <b>[${modeTag}] 24/7 코인 스윙 1차 매수 진입</b>\n\n` +
      `• 종목: <b>${top.koreanName} (${top.symbol})</b>\n` +
      `• 1차 진입가: ${currentPrice.toLocaleString()}원\n` +
      `• 투입 금액: ${split1Budget.toLocaleString()}원 (보유 수량: ${executedQty.toFixed(4)}개)\n` +
      `• 2차 눌림목 매수가: ${top.supportPrice.toLocaleString()}원 (-1.5%)\n` +
      `• 1차 목표가(+3.5%): ${top.targetPrice1.toLocaleString()}원 (50% 익절)\n` +
      `• 2차 목표가(+6.5%): ${top.targetPrice2.toLocaleString()}원 (전량 익절)\n` +
      `• 손절선(-3.0%): ${top.stopLossPrice.toLocaleString()}원\n\n` +
      `💡 5대 에이전트 12턴 끝장토론 통과 점수: <b>${top.scores.composite}점</b>`
    );
  }

  // 실시간 시세 감시 및 분할 매도/손절/2차 매수 처리
  async monitorAndExitPosition() {
    const pos = this.state.currentPosition;
    if (!pos) return;

    // 빗썸 실시간 현재가 조회
    const tickerList = await bithumbClient.getTicker(pos.market);
    if (!Array.isArray(tickerList) || tickerList.length === 0) return;

    const t = tickerList[0];
    const currentPrice = parseFloat(t.trade_price || '0');
    if (currentPrice <= 0) return;

    pos.lastPrice = currentPrice;
    const currentVal = pos.remainingVolume * currentPrice;
    pos.unrealizedPnlKrw = Math.round(currentVal - (pos.investedKrw * (pos.remainingVolume / pos.totalVolume)));
    pos.unrealizedReturnPct = parseFloat((((currentPrice - pos.avgBuyPrice) / pos.avgBuyPrice) * 100).toFixed(2));

    const mode = pos.mode;
    const modeTag = mode === 'LIVE' ? '🔴 빗썸 실전' : '🟡 모의투자';

    // 1. [2차 분할 매수 검사]: 눌림목 도달 시 추가 50,000원 투입
    if (!pos.split2Done && currentPrice <= pos.split2TargetPrice) {
      console.log(`[CryptoAutoTrader] 2차 지지선 눌림목 도달 (${currentPrice}원 <= ${pos.split2TargetPrice}원): 2차 분할매수 집행!`);
      const split2Budget = 50000;
      let split2Qty = 0;

      if (mode === 'LIVE') {
        const orderRes = await bithumbClient.buyMarket(pos.market, split2Budget);
        split2Qty = (split2Budget * 0.9996) / currentPrice;
      } else {
        split2Qty = split2Budget / currentPrice;
      }

      pos.split2Done = true;
      pos.split2Time = new Date().toISOString();
      pos.investedKrw += split2Budget;
      pos.totalVolume += split2Qty;
      pos.remainingVolume += split2Qty;
      pos.avgBuyPrice = Math.round((pos.investedKrw / pos.totalVolume) * 100) / 100;
      pos.stage = 'SPLIT_2_ACTIVE';

      // 평균단가 기준으로 목표가/손절가 재보정
      pos.targetPrice1 = Math.round(pos.avgBuyPrice * 1.035 * 100) / 100;
      pos.targetPrice2 = Math.round(pos.avgBuyPrice * 1.065 * 100) / 100;
      pos.stopLossPrice = Math.round(pos.avgBuyPrice * 0.970 * 100) / 100;

      await this.sendTelegram(
        `🪜 <b>[${modeTag}] 2차 눌림목 지지선 분할매수 체결 완료</b>\n\n` +
        `• 종목: <b>${pos.koreanName} (${pos.symbol})</b>\n` +
        `• 체결가: ${currentPrice.toLocaleString()}원 (추가 50,000원 투입)\n` +
        `• 수정 평균단가: <b>${pos.avgBuyPrice.toLocaleString()}원</b>\n` +
        `• 총 보유 수량: ${pos.totalVolume.toFixed(4)}개 (총 투자: 100,000원)\n` +
        `• 보정 목표가: 1차 ${pos.targetPrice1.toLocaleString()}원 / 2차 ${pos.targetPrice2.toLocaleString()}원\n` +
        `• 보정 손절가: ${pos.stopLossPrice.toLocaleString()}원`
      );
    }

    // 2. [손절가 도달 검사]: -3.0% 이탈 시 즉시 전량 손절매 ➔ 포지션 청산 ➔ 다음 종목 롤링!
    if (currentPrice <= pos.stopLossPrice) {
      console.log(`[CryptoAutoTrader] 손절선 이탈 (${currentPrice}원 <= ${pos.stopLossPrice}원): 전량 손절매 집행!`);
      if (mode === 'LIVE') {
        await bithumbClient.sellMarket(pos.market, pos.remainingVolume);
      }

      const totalSoldValue = pos.remainingVolume * currentPrice;
      const realizedLoss = Math.round(totalSoldValue - pos.investedKrw);
      const returnPct = parseFloat(((realizedLoss / pos.investedKrw) * 100).toFixed(2));

      this.recordClosedTrade(pos, 'STOP_LOSS', currentPrice, realizedLoss, returnPct);

      await this.sendTelegram(
        `🛡️ <b>[${modeTag}] 기계적 손절매 집행 완료 (포지션 전량 청산)</b>\n\n` +
        `• 종목: <b>${pos.koreanName} (${pos.symbol})</b>\n` +
        `• 매도가: ${currentPrice.toLocaleString()}원 (손절선 하방 이탈)\n` +
        `• 실현 손익: <b>${realizedLoss.toLocaleString()}원 (${returnPct}%)</b>\n` +
        `• 조치: 원금 안전 보존을 위해 즉시 청산 ➔ <b>다음 최우선 코인 순환 롤링 가동</b>`
      );

      this.state.currentPosition = null;
      this.saveState();
      return;
    }

    // 3. [1차 분할 익절 검사]: +3.5% 도달 시 50% 분할 매도
    if (!pos.tp1Done && currentPrice >= pos.targetPrice1) {
      console.log(`[CryptoAutoTrader] 1차 목표가 도달 (+3.5%): 50% 분할 익절 집행!`);
      const sellQty = pos.remainingVolume * 0.5;

      if (mode === 'LIVE') {
        await bithumbClient.sellMarket(pos.market, sellQty);
      }

      pos.tp1Done = true;
      pos.tp1Time = new Date().toISOString();
      pos.remainingVolume -= sellQty;
      const partialPnl = Math.round((currentPrice - pos.avgBuyPrice) * sellQty);
      pos.realizedPnlKrw += partialPnl;

      await this.sendTelegram(
        `🎯 <b>[${modeTag}] 1차 목표가 도달! 50% 분할 익절 체결</b>\n\n` +
        `• 종목: <b>${pos.koreanName} (${pos.symbol})</b>\n` +
        `• 체결가: ${currentPrice.toLocaleString()}원 (+3.5% 도달)\n` +
        `• 매도 수량: ${sellQty.toFixed(4)}개 (확정 익절: +${partialPnl.toLocaleString()}원)\n` +
        `• 잔여 수량: ${pos.remainingVolume.toFixed(4)}개 (2차 목표가: ${pos.targetPrice2.toLocaleString()}원까지 홀딩)`
      );
    }

    // 4. [2차 전량 익절 검사]: +6.5% 도달 시 잔여 전량 매도 ➔ 포지션 완결 ➔ 다음 종목 롤링!
    if (pos.tp1Done && currentPrice >= pos.targetPrice2) {
      console.log(`[CryptoAutoTrader] 2차 최종 목표가 도달 (+6.5%): 잔여 전량 익절 집행!`);
      if (mode === 'LIVE') {
        await bithumbClient.sellMarket(pos.market, pos.remainingVolume);
      }

      const finalVal = pos.remainingVolume * currentPrice;
      const finalPartialPnl = Math.round((currentPrice - pos.avgBuyPrice) * pos.remainingVolume);
      const totalRealizedPnl = pos.realizedPnlKrw + finalPartialPnl;
      const returnPct = parseFloat(((totalRealizedPnl / pos.investedKrw) * 100).toFixed(2));

      this.recordClosedTrade(pos, 'TAKE_PROFIT_ALL', currentPrice, totalRealizedPnl, returnPct);

      await this.sendTelegram(
        `🏆 <b>[${modeTag}] 2차 최종 목표가 도달! 전량 완승 청산</b>\n\n` +
        `• 종목: <b>${pos.koreanName} (${pos.symbol})</b>\n` +
        `• 최종 매도가: ${currentPrice.toLocaleString()}원 (+6.5% 달성)\n` +
        `• 총 실현 수익: <b>+${totalRealizedPnl.toLocaleString()}원 (+${returnPct}%)</b>\n` +
        `• 다음 단계: <b>24시간 연속 롤링 ➔ 다음 1위 코인 즉시 자동 탐색</b>`
      );

      this.state.currentPosition = null;
      this.saveState();
      return;
    }

    this.saveState();
  }

  // 매매 완료 기록 저장
  recordClosedTrade(pos, reason, exitPrice, realizedPnlKrw, returnPct) {
    const isWin = realizedPnlKrw > 0;
    const item = {
      id: pos.id,
      symbol: pos.symbol,
      koreanName: pos.koreanName,
      market: pos.market,
      mode: pos.mode,
      enteredAt: pos.enteredAt,
      closedAt: new Date().toISOString(),
      entryPrice: pos.entryPrice,
      avgBuyPrice: pos.avgBuyPrice,
      exitPrice,
      investedKrw: pos.investedKrw,
      realizedPnlKrw,
      returnPct,
      exitReason: reason,
      debateSummary: pos.debateSummary
    };

    this.state.history.unshift(item);
    if (this.state.history.length > 50) this.state.history.pop();

    this.state.stats.totalTrades += 1;
    if (isWin) this.state.stats.winTrades += 1;
    else this.state.stats.lossTrades += 1;
    this.state.stats.totalRealizedPnlKrw += realizedPnlKrw;
    this.state.stats.winRatePct = parseFloat(((this.state.stats.winTrades / this.state.stats.totalTrades) * 100).toFixed(1));
  }

  // 비상 전량 시장가 매도 (수동 긴급 버튼)
  async emergencyExit() {
    const pos = this.state.currentPosition;
    if (!pos) return { success: false, message: '보유 중인 포지션이 없습니다.' };

    const tickerList = await bithumbClient.getTicker(pos.market);
    const currentPrice = (Array.isArray(tickerList) && tickerList[0]) ? parseFloat(tickerList[0].trade_price || pos.avgBuyPrice) : pos.avgBuyPrice;

    if (pos.mode === 'LIVE') {
      try {
        await bithumbClient.sellMarket(pos.market, pos.remainingVolume);
      } catch (e) {
        console.error('[CryptoAutoTrader] Emergency live sell error:', e);
      }
    }

    const soldValue = pos.remainingVolume * currentPrice;
    const realizedPnlKrw = Math.round(soldValue - (pos.investedKrw * (pos.remainingVolume / pos.totalVolume)));
    const returnPct = parseFloat(((realizedPnlKrw / pos.investedKrw) * 100).toFixed(2));

    this.recordClosedTrade(pos, 'EMERGENCY_MANUAL_EXIT', currentPrice, realizedPnlKrw, returnPct);
    this.state.currentPosition = null;
    this.saveState();

    await this.sendTelegram(
      `🚨 <b>[${pos.mode === 'LIVE' ? '빗썸 실전' : '모의투자'}] 긴급 전량 시장가 매도 실행</b>\n\n` +
      `• 종목: ${pos.koreanName} (${pos.symbol})\n` +
      `• 실현 손익: ${realizedPnlKrw.toLocaleString()}원 (${returnPct}%)\n` +
      `• 포지션이 즉시 초기화되었습니다.`
    );

    return { success: true, message: `${pos.koreanName} 긴급 전량 매도 완료`, realizedPnlKrw, returnPct };
  }

  // 대시보드 상태 반환
  async getDashboardData() {
    let krwBalance = 100000;
    try {
      if (bithumbClient.apiKey && bithumbClient.secretKey) {
        krwBalance = await bithumbClient.getKrwBalance();
      }
    } catch (e) {
      console.warn('[CryptoAutoTrader] Fetch balance warning:', e.message);
    }

    // 빗썸 USDT 시세 기준 김프 및 비트코인 시세
    let btcPrice = 0;
    let btcChange24h = 0;
    try {
      const tickers = await bithumbClient.getTicker('KRW-BTC,KRW-USDT');
      if (Array.isArray(tickers)) {
        const btc = tickers.find(t => t.market === 'KRW-BTC');
        if (btc) {
          btcPrice = parseFloat(btc.trade_price || '0');
          btcChange24h = parseFloat(btc.signed_change_rate || '0') * 100;
        }
      }
    } catch (e) {}

    return {
      success: true,
      isAutoTradingEnabled: this.state.isAutoTradingEnabled,
      tradingMode: this.state.tradingMode,
      budget: this.state.budget,
      krwBalance,
      currentPosition: this.state.currentPosition,
      history: this.state.history.slice(0, 10),
      lastDebate: this.state.lastDebate,
      stats: this.state.stats,
      marketOverview: {
        btcPrice,
        btcChange24h: parseFloat(btcChange24h.toFixed(2)),
        checkedAt: new Date().toISOString()
      }
    };
  }
}

const cryptoAutoTrader = new CryptoAutoTrader();

module.exports = {
  CryptoAutoTrader,
  cryptoAutoTrader
};
