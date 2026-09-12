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

    // 2. 미국 대표 종목 (US Big Tech)
    const usMap = {
      'NVDA': 'NVDA', '엔비디아': 'NVDA', 'NVIDIA': 'NVDA',
      'TSLA': 'TSLA', '테슬라': 'TSLA', 'TESLA': 'TSLA',
      'AAPL': 'AAPL', '애플': 'AAPL', 'APPLE': 'AAPL',
      'MSFT': 'MSFT', '마이크로소프트': 'MSFT', 'MICROSOFT': 'MSFT',
      'GOOGL': 'GOOGL', '구글': 'GOOGL', '알파벳': 'GOOGL',
      'AMZN': 'AMZN', '아마존': 'AMZN',
      'META': 'META', '메타': 'META',
      'AVGO': 'AVGO', '브로드컴': 'AVGO',
      'PLTR': 'PLTR', '팔란티어': 'PLTR',
      'AMD': 'AMD', '에이엠디': 'AMD'
    };
    if (usMap[q.toUpperCase()]) return usMap[q.toUpperCase()];
    if (usMap[q]) return usMap[q];
    if (usMap[cleanQ]) return usMap[cleanQ];

    // 3. 대표 국장 종목 Fallback
    const defaultMap = {
      '루닛': '328130', '삼성전자': '005930', 'SK하이닉스': '000660', '현대차': '005380',
      '현대자동차': '005380', '알테오젠': '196170', '두산에너빌리티': '034020', 'NAVER': '035420',
      '네이버': '035420', '카카오': '035720', 'HLB': '028300', '에코프로': '086520',
      '에코프로비엠': '247540', '삼천당제약': '000250', '리노공업': '058470', '하이브': '352820',
      '한미반도체': '042700', '셀트리온': '068270', '기아': '000270', 'POSCO홀딩스': '005490'
    };
    if (defaultMap[q]) return defaultMap[q];
    if (defaultMap[cleanQ]) return defaultMap[cleanQ];

    if (/^[A-Z]{1,5}$/i.test(q)) return q.toUpperCase();

    return '';
  },

  resolveStockName(query) {
    if (!query || !query.trim()) return '';
    const q = query.trim();
    const usReverseMap = {
      'NVDA': 'NVIDIA (엔비디아)', 'TSLA': 'Tesla (테슬라)', 'AAPL': 'Apple (애플)',
      'MSFT': 'Microsoft (마이크로소프트)', 'GOOGL': 'Alphabet (알파벳)', 'AMZN': 'Amazon (아마존)',
      'META': 'Meta (메타)', 'AVGO': 'Broadcom (브로드컴)', 'PLTR': 'Palantir (팔란티어)', 'AMD': 'AMD (에이엠디)'
    };
    if (usReverseMap[q.toUpperCase()]) return usReverseMap[q.toUpperCase()];

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

  resolveEndpoints(apiPath) {
    const list = [];
    if (window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
      list.push(apiPath);
      if (window.location.origin) {
        const originUrl = `${window.location.origin}${apiPath}`;
        if (!list.includes(originUrl)) list.push(originUrl);
      }
    }
    list.push(`http://localhost:8080${apiPath}`);
    list.push(`http://192.168.219.115:8080${apiPath}`);
    return Array.from(new Set(list));
  },

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/stock-debates', `${window.location.origin}/api/stock-debates`, 'http://localhost:8080/api/stock-debates', 'http://192.168.219.115:8080/api/stock-debates', './data/stockDebateLogs.json'];
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
    } else {
      // 서버에서 로드되었더라도, 로컬스토리지의 사용자 직접소집 항목이 서버 재시작으로 누락되지 않도록 병합 보존
      try {
        const local = localStorage.getItem('portal_stock_debate_logs');
        if (local) {
          const localItems = JSON.parse(local);
          if (Array.isArray(localItems)) {
            localItems.forEach(localItem => {
              if (localItem && localItem.source_type === 'USER_SUMMON') {
                const exists = this.items.some(si => si.id === localItem.id);
                if (!exists) {
                  this.items.unshift(localItem);
                }
              }
            });
          }
        }
      } catch (e) {}
    }

    // 1111 등 비정상 유령 데이터 영구 제거
    this.items = (this.items || []).filter(d => d.item_code !== '1111' && d.stock_name !== '1111');

    // Cache locally
    try {
      localStorage.setItem('portal_stock_debate_logs', JSON.stringify(this.items));
    } catch (e) {}

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
      // Stock & Source filter
      if (this.selectedStock && this.selectedStock !== 'all') {
        if (this.selectedStock === 'src:AUTO_SCOUT') {
          const isAuto = item.source_type === 'AUTO_SCOUT' || (!item.source_type && item.item_code !== '000660');
          if (!isAuto) return false;
        } else if (this.selectedStock === 'src:USER_SUMMON') {
          const isUser = item.source_type === 'USER_SUMMON';
          if (!isUser) return false;
        } else if (this.selectedStock === 'mkt:KR') {
          const isUs = item.market_flag === 'US' || item.market === 'NASDAQ' || item.market === 'NYSE';
          if (isUs) return false;
        } else if (this.selectedStock === 'mkt:US') {
          const isUs = item.market_flag === 'US' || item.market === 'NASDAQ' || item.market === 'NYSE';
          if (!isUs) return false;
        } else {
          const matchCode = (item.item_code || '') === this.selectedStock;
          const matchName = (item.stock_name || '') === this.selectedStock;
          if (!matchCode && !matchName) return false;
        }
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
    const resolvedCode = this.resolveStockCode(rawQ);
    const resolvedName = this.resolveStockName(rawQ) || (resolvedCode ? rawQ : '');
    if (!resolvedCode && !resolvedName) {
      return { 
        success: false, 
        message: `'${rawQ}'은(는) 한국거래소(KRX) 또는 미국증시(NYSE/NASDAQ) 상장 종목 목록에서 찾을 수 없습니다. 올바른 종목명/티커(예: 현대차, 알테오젠, NVDA, TSLA) 또는 종목코드를 입력해주세요.` 
      };
    }
    this.isTriggering = true;
    try {
      const endpoints = this.resolveEndpoints('/api/stock-debates/trigger');
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
              topic: customTopic,
              source_type: 'USER_SUMMON'
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
        } else {
          // 비동기 백그라운드 소집 시 3초 후 데이터 재동기화
          setTimeout(() => { this.loadDebates(); }, 3000);
        }
        return { success: true, result, debate: result.debate, code: resolvedCode, message: result.message };
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
      const endpoints = this.resolveEndpoints(`/api/stock-debates?id=${encodeURIComponent(debateId)}`);
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
      const endpoints = this.resolveEndpoints('/api/stock-debates?all=true');
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

// 백그라운드 3분 주기 자동 발굴 체크 타이머
if (typeof window !== 'undefined' && !window._debateAutoInterval) {
  window._debateAutoInterval = setInterval(() => {
    if (window.StockDebateModel && typeof window.StockDebateModel.checkAutoThemeDebate === 'function') {
      window.StockDebateModel.checkAutoThemeDebate();
    }
  }, 3 * 60 * 1000);
}
