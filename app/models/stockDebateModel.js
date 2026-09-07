// app/models/stockDebateModel.js - AI 끝장 토론실 (Debate Arena) 데이터 모델
window.StockDebateModel = {
  items: [],
  selectedStock: 'all',
  searchQuery: '',
  isTriggering: false,

  resolveStockCode(query) {
    if (!query) return '005930';
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
      '에코프로비엠': '247540', '삼천당제약': '000250', '리노공업': '058470', '하이브': '352820'
    };
    if (defaultMap[q]) return defaultMap[q];
    if (defaultMap[cleanQ]) return defaultMap[cleanQ];

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
          if (Array.isArray(data) && data.length > 0) {
            this.items = data;
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

    return this.items;
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
    this.isTriggering = true;
    const resolvedCode = this.resolveStockCode(stockQuery);
    try {
      const endpoints = ['/api/stock-debates/trigger', 'http://localhost:8080/api/stock-debates/trigger'];
      let res = null;
      for (const ep of endpoints) {
        try {
          res = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ stock: resolvedCode, originalQuery: stockQuery, topic: customTopic })
          });
          if (res.ok) break;
        } catch (e) {}
      }

      if (res && res.ok) {
        const result = await res.json();
        // Wait 2.0s for python process to complete sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.loadDebates();
        return { success: true, result, code: resolvedCode };
      } else {
        return { success: false, message: '서버 연결 실패 또는 에이전트 응답 지연' };
      }
    } catch (e) {
      return { success: false, message: e.message };
    } finally {
      this.isTriggering = false;
    }
  }
};
