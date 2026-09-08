// app/models/stockDebateModel.js - AI 끝장 토론실 (Debate Arena) 데이터 모델
window.StockDebateModel = {
  items: [],
  selectedStock: 'all',
  searchQuery: '',
  isTriggering: false,

  resolveStockCode(query) {
    if (!query || !query.trim()) return '';
    const q = query.trim();
    if (/^\d{6}$/.test(q)) return q;
    
    // 1. KRX 전 종목 마스터 확인 (2,759개 종목)
    const krxMap = window.PORTAL_KRX_STOCK_MAP || {};
    if (krxMap[q]) return krxMap[q];
    if (krxMap[q.toLowerCase()]) return krxMap[q.toLowerCase()];
    const cleanQ = q.replace(/\s+/g, '');
    if (krxMap[cleanQ]) return krxMap[cleanQ];

    // 2. 대표 종목 Fallback
    const defaultMap = {
      '루닛': '328130', '삼성전자': '005930', 'SK하이닉스': '000660', '현대차': '005380',
      '현대자동차': '005380', '알테오젠': '196170', '두산에너빌리티': '034020', 'NAVER': '035420',
      '네이버': '035420', '카카오': '035720', 'HLB': '028300', '에코프로': '086520',
      '에코프로비엠': '247540', '삼천당제약': '000250', '리노공업': '058470', '하이브': '352820',
      '한미반도체': '042700', '셀트리온': '068270', '기아': '000270', 'POSCO홀딩스': '005490'
    };
    if (defaultMap[q]) return defaultMap[q];
    if (defaultMap[cleanQ]) return defaultMap[cleanQ];

    return q;
  },

  resolveStockName(query) {
    if (!query || !query.trim()) return '';
    const q = query.trim();
    const reverseMap = {
      '005930': '삼성전자', '000660': 'SK하이닉스', '005380': '현대차', '196170': '알테오젠',
      '034020': '두산에너빌리티', '035420': 'NAVER', '035720': '카카오', '028300': 'HLB',
      '086520': '에코프로', '247540': '에코프로비엠', '000250': '삼천당제약', '058470': '리노공업',
      '352820': '하이브', '328130': '루닛', '042700': '한미반도체', '068270': '셀트리온',
      '000270': '기아', '005490': 'POSCO홀딩스'
    };
    if (reverseMap[q]) return reverseMap[q];
    const krxMap = window.PORTAL_KRX_STOCK_MAP || {};
    for (const [name, code] of Object.entries(krxMap)) {
      if (code === q) return name;
    }
    if (/^\d{6}$/.test(q)) return q;
    return q;
  },

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/stock-debates', './data/stockDebateLogs.json'];
    }
    return [
      'http://localhost:8080/api/stock-debates',
      'http://192.168.219.115:8080/api/stock-debates',
      './data/stockDebateLogs.json'
    ];
  },

  async loadDebates() {
    // 1. Try API endpoints
    const urls = this.getApiUrls();
    let loaded = false;

    for (const url of urls) {
      try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            this.items = data;
            loaded = true;
            break;
          } else if (data && typeof data === 'object' && data.id) {
            this.items = [data];
            loaded = true;
            break;
          }
        }
      } catch (e) {
        // Try next
      }
    }

    // 2. Fallback to window global if available
    if (!loaded && window.PORTAL_DATA_STOCK_DEBATES && Array.isArray(window.PORTAL_DATA_STOCK_DEBATES)) {
      this.items = [...window.PORTAL_DATA_STOCK_DEBATES];
      loaded = true;
    }

    // 3. Fallback to localStorage
    if (!loaded) {
      try {
        const local = localStorage.getItem('portal_stock_debate_logs');
        if (local) {
          this.items = JSON.parse(local);
          loaded = true;
        }
      } catch (e) {}
    }

    // Cache locally
    if (this.items.length > 0) {
      try {
        localStorage.setItem('portal_stock_debate_logs', JSON.stringify(this.items));
      } catch (e) {}
    }

    // 4. 1시간 주기 핵심 테마 검증 2.1 자동 갱신 백그라운드 체크
    this.checkAutoThemeDebate();

    return this.items;
  },

  isCheckingAuto: false,
  async checkAutoThemeDebate() {
    if (this.isCheckingAuto) return;
    this.isCheckingAuto = true;
    try {
      // 서버의 마지막 자동 토론 생성 시간 및 경과 시간 확인
      const res = await fetch('/api/stock-debates/last-auto-status');
      if (res.ok) {
        const status = await res.json();
        if (status.needsTrigger && !status.isRunning) {
          console.log('[DebateModel] 1시간 경과 감지: 핵심 테마 검증 2.1 자동 토론 요청 발주...');
          const autoRes = await fetch('/api/stock-debates/auto-theme-debate', { method: 'POST' });
          if (autoRes.ok) {
            const result = await autoRes.json();
            if (result.success && result.debate) {
              const idx = this.items.findIndex(d => d.id === result.debate.id);
              if (idx < 0) this.items.unshift(result.debate);
              if (window.StockDebateView && typeof window.StockDebateView.render === 'function') {
                window.StockDebateView.render();
              }
            }
          }
        }
      }
    } catch (e) {
      // 무시 (오프라인 등)
    } finally {
      this.isCheckingAuto = false;
    }
  },

  getFilteredDebates() {
    return this.items.filter(item => {
      // Stock filter
      if (this.selectedStock !== 'all') {
        const matchCode = (item.item_code || '') === this.selectedStock;
        const matchName = (item.stock_name || '') === this.selectedStock;
        if (!matchCode && !matchName) return false;
      }

      // Search query filter
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.trim().toLowerCase();
        const matchStock = (item.stock_name || '').toLowerCase().includes(q);
        const matchCode = (item.item_code || '').includes(q);
        const matchTopic = (item.topic || '').toLowerCase().includes(q);
        const matchVerdict = (item.verdict_summary || '').toLowerCase().includes(q);
        const matchTurns = (item.turns || []).some(t => 
          (t.message || '').toLowerCase().includes(q) || 
          (t.speaker || '').toLowerCase().includes(q)
        );
        if (!matchStock && !matchCode && !matchTopic && !matchVerdict && !matchTurns) {
          return false;
        }
      }

      return true;
    });
  },

  async triggerDebate(stockQuery, customTopic = '') {
    const rawQ = String(stockQuery || '').trim();
    if (!rawQ) {
      return { success: false, message: '분석할 주식 종목명이나 종목코드를 입력해주세요.' };
    }
    this.isTriggering = true;
    const resolvedCode = this.resolveStockCode(rawQ);
    const resolvedName = this.resolveStockName(rawQ) || rawQ;
    try {
      const endpoints = ['/api/stock-debates/trigger', 'http://localhost:8080/api/stock-debates/trigger'];
      let res = null;
      for (const ep of endpoints) {
        try {
          res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ 
              stock: resolvedCode, 
              stock_name: resolvedName, 
              originalQuery: stockQuery, 
              topic: customTopic 
            })
          });
          if (res.ok) break;
        } catch (e) {}
      }

      if (res && res.ok) {
        const result = await res.json();
        if (result.debate && result.debate.id) {
          const existingIdx = this.items.findIndex(d => d.id === result.debate.id);
          if (existingIdx >= 0) this.items[existingIdx] = result.debate;
          else this.items.unshift(result.debate);

          try {
            localStorage.setItem('portal_stock_debate_logs', JSON.stringify(this.items));
          } catch (e) {}

          if (window.StockDebateView && typeof window.StockDebateView.render === 'function') {
            window.StockDebateView.render();
          }
        }
        return { success: true, result, debate: result.debate, code: resolvedCode };
      } else {
        return { success: false, message: '서버 연결 실패 또는 에이전트 응답 지연' };
      }
    } catch (e) {
      return { success: false, message: e.message };
    } finally {
      this.isTriggering = false;
    }
  },

  async deleteDebate(debateId) {
    if (!debateId) return false;
    try {
      const endpoints = [
        `/api/stock-debates?id=${encodeURIComponent(debateId)}`,
        `http://localhost:8080/api/stock-debates?id=${encodeURIComponent(debateId)}`
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { method: 'DELETE' });
          if (res.ok) break;
        } catch (e) {}
      }
      // 로컬 배열에서도 즉시 제거
      this.items = this.items.filter(d => d.id !== debateId);
      try {
        localStorage.setItem('portal_stock_debate_logs', JSON.stringify(this.items));
      } catch (e) {}
      return true;
    } catch (e) {
      console.error('Failed to delete debate:', e);
      return false;
    }
  },

  async clearAllDebates() {
    try {
      const endpoints = [
        '/api/stock-debates?all=true',
        'http://localhost:8080/api/stock-debates?all=true'
      ];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { method: 'DELETE' });
          if (res.ok) break;
        } catch (e) {}
      }
      this.items = [];
      try {
        localStorage.removeItem('portal_stock_debate_logs');
      } catch (e) {}
      return true;
    } catch (e) {
      console.error('Failed to clear debates:', e);
      return false;
    }
  }
};
