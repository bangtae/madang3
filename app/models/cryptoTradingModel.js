// app/models/cryptoTradingModel.js - 코인 자동화투자 클라이언트 데이터 모델
// 빗썸 Open API 24/7 분할 스윙 매매 및 AI 끝장토론 상태 연동

window.CryptoTradingModel = {
  isAutoTradingEnabled: false,
  tradingMode: 'LIVE', // 'LIVE' | 'SIMULATION'
  budget: 100000,
  krwBalance: 100000,
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
  marketOverview: {
    btcPrice: 0,
    btcChange24h: 0,
    checkedAt: null
  },
  isLoading: false,

  // 대시보드 상태 로드
  async loadDashboard() {
    this.isLoading = true;
    try {
      const res = await fetch('/api/crypto/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          this.isAutoTradingEnabled = !!data.isAutoTradingEnabled;
          this.tradingMode = data.tradingMode || 'LIVE';
          this.budget = data.budget || 100000;
          this.krwBalance = data.krwBalance || 0;
          this.currentPosition = data.currentPosition || null;
          this.history = Array.isArray(data.history) ? data.history : [];
          this.lastDebate = data.lastDebate || null;
          this.stats = data.stats || this.stats;
          this.marketOverview = data.marketOverview || this.marketOverview;
        }
      }
    } catch (e) {
      console.warn('[CryptoTradingModel] Load dashboard error:', e);
    } finally {
      this.isLoading = false;
    }
    return this;
  },

  // 24시간 자동투자 ON / OFF 토글
  async toggleAutoTrading(enabled) {
    try {
      const res = await fetch('/api/crypto/toggle-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          this.isAutoTradingEnabled = !!data.isAutoTradingEnabled;
          return { success: true, isAutoTradingEnabled: this.isAutoTradingEnabled };
        }
      }
    } catch (e) {
      console.error('[CryptoTradingModel] Toggle auto error:', e);
    }
    return { success: false, message: '자동투자 상태 변경에 실패했습니다.' };
  },

  // 실전(LIVE) / 모의(SIMULATION) 매매 모드 변경
  async setTradingMode(mode) {
    try {
      const res = await fetch('/api/crypto/set-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          this.tradingMode = data.tradingMode;
          return { success: true, tradingMode: this.tradingMode };
        }
      }
    } catch (e) {
      console.error('[CryptoTradingModel] Set mode error:', e);
    }
    return { success: false, message: '매매 모드 변경에 실패했습니다.' };
  },

  // 온디맨드 1회 코인 발굴 & 12턴 끝장토론 수동 트리거
  async triggerScoutAndDebate() {
    this.isLoading = true;
    try {
      const res = await fetch('/api/crypto/trigger-debate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          this.lastDebate = data.debate || null;
          if (data.topPick) {
            this.topPickPreview = data.topPick;
          }
          return { success: true, data };
        }
      }
    } catch (e) {
      console.error('[CryptoTradingModel] Trigger debate error:', e);
    } finally {
      this.isLoading = false;
    }
    return { success: false, message: '코인 발굴 및 토론 소집에 실패했습니다.' };
  },

  // 비상 전량 시장가 매도
  async emergencyExit() {
    try {
      const res = await fetch('/api/crypto/emergency-exit', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        await this.loadDashboard();
        return data;
      }
    } catch (e) {
      console.error('[CryptoTradingModel] Emergency exit error:', e);
    }
    return { success: false, message: '긴급 매도 요청 처리에 실패했습니다.' };
  }
};
