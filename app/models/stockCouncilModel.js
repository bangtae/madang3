// app/models/stockCouncilModel.js - 5대 서브주식에이전트 심의 리포트 모델
window.StockCouncilModel = {
  items: [],
  selectedAgent: 'all',
  searchQuery: '',

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/stock-council-reports', './data/stockCouncilReports.json'];
    }
    return [
      'http://localhost:8080/api/stock-council-reports',
      'http://192.168.219.115:8080/api/stock-council-reports',
      './data/stockCouncilReports.json'
    ];
  },

  async loadReports() {
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
    if (!loaded && window.PORTAL_DATA_STOCK_COUNCIL && Array.isArray(window.PORTAL_DATA_STOCK_COUNCIL)) {
      this.items = [...window.PORTAL_DATA_STOCK_COUNCIL];
      loaded = true;
    }

    // 3. Fallback to localStorage
    if (!loaded) {
      try {
        const local = localStorage.getItem('portal_stock_council_reports');
        if (local) {
          this.items = JSON.parse(local);
          loaded = true;
        }
      } catch (e) {}
    }

    // Cache locally
    if (this.items.length > 0) {
      try {
        localStorage.setItem('portal_stock_council_reports', JSON.stringify(this.items));
      } catch (e) {}
    }

    return this.items;
  },

  getFilteredReports() {
    return this.items.filter(item => {
      // Agent filter
      if (this.selectedAgent !== 'all' && item.agentId !== this.selectedAgent) {
        return false;
      }
      // Search query filter
      if (this.searchQuery && this.searchQuery.trim()) {
        const q = this.searchQuery.trim().toLowerCase();
        const matchStock = (item.stockName || '').toLowerCase().includes(q);
        const matchCode = (item.itemCode || '').toLowerCase().includes(q);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchSummary = (item.summary || '').toLowerCase().includes(q);
        const matchPersona = (item.persona || '').toLowerCase().includes(q);
        if (!matchStock && !matchCode && !matchTitle && !matchSummary && !matchPersona) {
          return false;
        }
      }
      return true;
    });
  },

  getReportById(id) {
    return this.items.find(r => r.id === id);
  },

  async requestOnDemandAnalysis(stockQuery) {
    const cleanStock = (stockQuery || '').trim();
    if (!cleanStock) throw new Error('종목명 또는 종목코드를 입력하세요.');

    const res = await fetch('/api/stock-council-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: cleanStock })
    });

    if (!res.ok) {
      throw new Error(`분석 요청 실패: HTTP ${res.status}`);
    }

    return await res.json();
  },

  getAgentStats() {
    const stats = {
      all: this.items.length,
      sub_stock_dankal: 0,
      sub_stock_growth: 0,
      sub_stock_cautious: 0,
      sub_stock_technical: 0,
      sub_stock_jurini: 0
    };
    for (const r of this.items) {
      if (stats[r.agentId] !== undefined) {
        stats[r.agentId]++;
      }
    }
    return stats;
  },

  // 종목별 5대 서브에이전트 합의 지표 및 레이더 데이터 산출
  getConsensusByStock() {
    const stockMap = {};

    // 1. 종목별로 리포트 그룹화 (최신순 우선)
    const sorted = [...this.items].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    for (const item of sorted) {
      const stockName = item.stockName || '기타';
      if (!stockMap[stockName]) {
        stockMap[stockName] = {
          stockName: stockName,
          itemCode: item.itemCode || '',
          latestDate: item.date || '',
          latestTime: item.time || '',
          factData: item.factData || {},
          reports: {},
          scores: {
            dankal: 75,
            growth: 75,
            cautious: 70,
            technical: 75,
            jurini: 70
          },
          stances: {
            dankal: 'bull',
            growth: 'bull',
            cautious: 'neutral',
            technical: 'bull',
            jurini: 'neutral'
          },
          snippets: {}
        };
      }

      // 에이전트별 최신 1건 저장
      const key = item.agentId.replace('sub_stock_', '');
      if (!stockMap[stockName].reports[item.agentId]) {
        stockMap[stockName].reports[item.agentId] = item;
        
        // 팩트 데이터 보강
        if (item.factData && Object.keys(item.factData).length > 0) {
          stockMap[stockName].factData = { ...stockMap[stockName].factData, ...item.factData };
        }
        if (item.itemCode) stockMap[stockName].itemCode = item.itemCode;

        // 점수 및 스탠스 파싱
        const md = item.markdown || item.summary || '';
        let score = 75;
        let stance = 'bull';
        let snippet = '';

        if (item.agentId === 'sub_stock_dankal') {
          const matchGrade = md.match(/종합\s*등급[:\s\*]*([A-Za-z\+\-]+)/i) || (item.grade || '').match(/([A-Za-z\+\-]+)/);
          const gradeStr = matchGrade ? matchGrade[1].toUpperCase() : '';
          if (gradeStr.includes('A+')) score = 95;
          else if (gradeStr.includes('A')) score = 88;
          else if (gradeStr.includes('B+')) score = 80;
          else if (gradeStr.includes('B')) score = 72;
          else if (gradeStr.includes('C')) score = 55;
          else score = 82;
          snippet = item.summary ? item.summary.split('\n')[0] : '5인 교차 심의 완료';
        } else if (item.agentId === 'sub_stock_growth') {
          const matchScore = md.match(/(?:혁신\s*지수|성장\s*지수)[:\s\*]*(\d+)(?:\s*\/\s*10)?/i);
          if (matchScore) {
            const raw = parseInt(matchScore[1], 10);
            score = raw <= 10 ? raw * 10 : Math.min(raw, 100);
          } else {
            score = md.includes('초고성장') || md.includes('지배적') ? 90 : 80;
          }
          snippet = '파괴적 혁신 및 전방 테크 성장성 분석';
        } else if (item.agentId === 'sub_stock_cautious') {
          const matchScore = md.match(/(?:안전마진|안전\s*지수)[:\s\*]*(\d+)(?:\s*\/\s*10)?/i);
          if (matchScore) {
            const raw = parseInt(matchScore[1], 10);
            score = raw <= 10 ? raw * 10 : Math.min(raw, 100);
          } else {
            score = md.includes('고배당') || md.includes('저평가') ? 85 : 70;
          }
          snippet = '안전마진 및 밸류에이션 리스크 감사';
        } else if (item.agentId === 'sub_stock_technical') {
          const matchScore = md.match(/(?:모멘텀\s*지수|수급\s*지수)[:\s\*]*(\d+)(?:\s*\/\s*10)?/i);
          if (matchScore) {
            const raw = parseInt(matchScore[1], 10);
            score = raw <= 10 ? raw * 10 : Math.min(raw, 100);
          } else {
            score = md.includes('쌍끌이') || md.includes('급증') ? 92 : 78;
          }
          snippet = '외인/기관 스마트머니 수급 및 모멘텀';
        } else if (item.agentId === 'sub_stock_jurini') {
          if (md.includes('초록') || md.includes('안심') || (item.grade || '').includes('초록')) {
            score = 90;
          } else if (md.includes('노랑') || (item.grade || '').includes('노랑')) {
            score = 65;
          } else if (md.includes('빨강') || (item.grade || '').includes('빨강')) {
            score = 45;
          } else {
            score = 75;
          }
          snippet = '초보자 눈높이 안심 신호등 가이드';
        }

        stance = score >= 80 ? 'bull' : (score >= 65 ? 'neutral' : 'bear');
        stockMap[stockName].scores[key] = score;
        stockMap[stockName].stances[key] = stance;
        stockMap[stockName].snippets[key] = snippet;
      }
    }

    // 2. 가중 종합 점수 및 합의 레이블 산출
    const result = Object.values(stockMap).map(stock => {
      const { dankal, growth, cautious, technical, jurini } = stock.scores;
      // 가중치: 단가(30%), 성장(20%), 신중(20%), 기술(20%), 주린이(10%)
      const consensusScore = Math.round(
        (dankal * 0.3) + (growth * 0.2) + (cautious * 0.2) + (technical * 0.2) + (jurini * 0.1)
      );

      let consensusBadge = { label: '신중 관망', gradeClass: 'neutral', icon: '⚖️' };
      if (consensusScore >= 85) {
        consensusBadge = { label: '강력 매수', gradeClass: 'strong-bull', icon: '🚀' };
      } else if (consensusScore >= 75) {
        consensusBadge = { label: '매수 우위', gradeClass: 'bull', icon: '📈' };
      } else if (consensusScore < 60) {
        consensusBadge = { label: '리스크 경계', gradeClass: 'bear', icon: '⚠️' };
      }

      return {
        ...stock,
        consensusScore,
        consensusBadge,
        reportCount: Object.keys(stock.reports).length
      };
    });

    // 종합 점수 내림차순 정렬
    return result.sort((a, b) => b.consensusScore - a.consensusScore);
  }
};
