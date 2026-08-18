// app/models/sapTermModel.js - LocalStorage 및 중앙 서버(sapTerms.json) 양방향 동기화 SAP 용어 데이터 관리 모듈

window.SapTermModel = {
  sapTerms: [],
  isSyncing: false,

  STORAGE_KEY: 'portal_sap_terms',

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/sap-terms', './data/sapTerms.json'];
    }
    return [
      'http://localhost:8080/api/sap-terms',
      'http://192.168.219.115:8080/api/sap-terms',
      './data/sapTerms.json'
    ];
  },

  getApiUrl() {
    return this.getApiUrls()[0];
  },

  getTermsFromLocal() {
    const fallbackTerms = window.PORTAL_DATA_SAP_TERMS || [];
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (!rawData) {
      if (fallbackTerms.length > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fallbackTerms));
      }
      return fallbackTerms;
    }
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return fallbackTerms;
    } catch (e) {
      return fallbackTerms;
    }
  },

  getTerms() {
    const localTerms = this.getTermsFromLocal();
    const fallbackTerms = window.PORTAL_DATA_SAP_TERMS || [];
    const merged = this.mergeTerms(localTerms, fallbackTerms);
    this.sapTerms = merged;
    return this.sapTerms;
  },

  /**
   * 로컬 데이터와 서버 데이터 병합 (중복 용어명 제거 및 최신화)
   */
  mergeTerms(listA = [], listB = []) {
    const combined = [...(listA || []), ...(listB || [])];
    const seen = new Set();
    const result = [];

    for (const item of combined) {
      const normKey = (item.term || '').trim().toLowerCase();
      if (!normKey) continue;
      if (!seen.has(normKey)) {
        seen.add(normKey);
        result.push(item);
      }
    }
    return result;
  },

  async initSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const localTerms = this.getTermsFromLocal();
    let synced = false;

    const urls = this.getApiUrls();
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-cache'
        });

        if (res.ok) {
          const text = await res.text();
          const cleanText = text.replace(/^\uFEFF/, '').trim();
          const serverTerms = JSON.parse(cleanText || '[]');
          if (Array.isArray(serverTerms) && serverTerms.length > 0) {
            const merged = this.mergeTerms(localTerms, serverTerms);
            this.sapTerms = merged;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
            this.syncToServer(merged);
            synced = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!synced) {
      const fallbackTerms = window.PORTAL_DATA_SAP_TERMS || [];
      const merged = this.mergeTerms(localTerms, fallbackTerms);
      this.sapTerms = merged;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
    }

    this.isSyncing = false;
    if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
      window.AppController.refreshAllViews();
    }
  },

  async syncToServer(terms) {
    try {
      const serverUrl = this.getApiUrl();
      await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terms)
      });
    } catch (e) {
      console.warn('[Sync SAP Terms] 서버에 SAP 용어 데이터를 동기화하지 못했습니다:', e);
    }
  },

  saveAllTerms(terms) {
    this.sapTerms = terms;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(terms));
    this.syncToServer(terms);
  },

  /**
   * 신규 SAP 용어 추가 또는 동일 용어 수정 (Upsert)
   */
  addTerm(data) {
    const terms = this.getTerms();
    const normTarget = (data.term || '').trim().toLowerCase();

    const existingIndex = terms.findIndex(t => (t.term || '').trim().toLowerCase() === normTarget);

    let isUpdate = false;
    let resultTerm = null;

    if (existingIndex !== -1) {
      isUpdate = true;
      terms[existingIndex] = {
        ...terms[existingIndex],
        term: data.term || terms[existingIndex].term,
        category: data.category || terms[existingIndex].category || '모듈 / 코어',
        parentTerm: data.parentTerm !== undefined ? data.parentTerm : terms[existingIndex].parentTerm,
        summary: data.summary || terms[existingIndex].summary,
        importance: data.importance || terms[existingIndex].importance || '핵심 기초',
        relatedTerms: Array.isArray(data.relatedTerms) ? data.relatedTerms : (terms[existingIndex].relatedTerms || []),
        docsUrl: data.docsUrl || terms[existingIndex].docsUrl || 'https://www.sap.com',
        updatedAt: new Date().toISOString()
      };
      resultTerm = terms[existingIndex];
    } else {
      resultTerm = {
        id: 'sap_term_' + Date.now(),
        term: data.term || '신규 SAP 용어',
        category: data.category || '모듈 / 코어',
        parentTerm: data.parentTerm || '',
        summary: data.summary || 'SAP 용어 및 업무 가이드 설명입니다.',
        importance: data.importance || '핵심 기초',
        relatedTerms: Array.isArray(data.relatedTerms) ? data.relatedTerms : [],
        docsUrl: data.docsUrl || 'https://www.sap.com',
        createdAt: new Date().toISOString()
      };
      terms.unshift(resultTerm);
    }

    this.saveAllTerms(terms);
    return { isUpdate, term: resultTerm };
  },

  updateTerm(id, updateData) {
    const terms = this.getTerms();
    const idx = terms.findIndex(t => t.id === id);
    if (idx !== -1) {
      terms[idx] = {
        ...terms[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      this.saveAllTerms(terms);
      return terms[idx];
    }
    return null;
  },

  deleteTerm(id) {
    let terms = this.getTerms();
    terms = terms.filter(t => t.id !== id);
    this.saveAllTerms(terms);
  },

  /**
   * LLM & 지능형 NLP 엔진 기반 SAP 용어 자동 분석
   */
  async analyzeTerm(termInput, userSummary = '') {
    if (!termInput || !termInput.trim()) {
      return { success: false, message: '분석할 SAP 용어 또는 모듈명을 입력해 주세요.' };
    }

    const cleanTerm = termInput.trim();
    let analyzeUrl = '/api/analyze-sap-term';
    if (!window.location.protocol.startsWith('http')) {
      analyzeUrl = 'http://localhost:8080/api/analyze-sap-term';
    }

    try {
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: cleanTerm, userSummary })
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData && resData.success) {
          return resData;
        }
      }
    } catch (e) {
      console.warn('[Analyze SAP Term API Error] 백엔드 분석 실패, 로컬 NLP 규칙 적용:', e);
    }

    // 로컬 폴백 SAP NLP 엔진
    return this.fallbackLocalNlpAnalyze(cleanTerm, userSummary);
  },

  fallbackLocalNlpAnalyze(term, userSummary) {
    const lower = term.toLowerCase();
    let category = '모듈 / 코어';
    let parentTerm = 'SAP ERP';
    let importance = '핵심 기초';
    let relatedTerms = ['SAP S/4HANA', 'ABAP', 'SAP BTP'];
    let summary = userSummary || `'${term}'은(는) SAP 엔터프라이즈 환경에서 주요한 비즈니스 개념 및 업무 모듈 기술입니다.`;
    let docsUrl = 'https://ko.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(term);

    if (lower.includes('abap') || lower.includes('cds') || lower.includes('rap') || lower.includes('fiori') || lower.includes('ui5') || lower.includes('odata')) {
      category = '개발 / ABAP';
      parentTerm = lower.includes('fiori') || lower.includes('ui5') || lower.includes('odata') ? 'SAP Fiori / SAPUI5' : 'ABAP (Advanced Business Application Programming)';
      importance = '중급 기술';
      relatedTerms = ['ABAP', 'SAP Fiori / SAPUI5', 'OData Service'];
    } else if (lower.includes('btp') || lower.includes('hana') || lower.includes('basis') || lower.includes('cloud')) {
      category = '아키텍처 / 플랫폼';
      parentTerm = lower.includes('hana') ? 'SAP S/4HANA' : 'SAP ERP';
      importance = '핵심 기초';
      relatedTerms = ['HANA DB', 'SAP BTP (Business Technology Platform)'];
    } else if (lower.includes('sac') || lower.includes('analytics') || lower.includes('bw') || lower.includes('bi')) {
      category = '데이터 / 분석';
      parentTerm = 'SAP BTP (Business Technology Platform)';
      importance = '응용 / 서비스';
      relatedTerms = ['SAP Analytics Cloud (SAC)', 'SAP BTP'];
    } else if (lower.includes('mm') || lower.includes('sd') || lower.includes('fi') || lower.includes('co') || lower.includes('pp') || lower.includes('hr')) {
      category = '모듈 / 코어';
      parentTerm = 'SAP S/4HANA';
      importance = '핵심 기초';
      relatedTerms = ['SAP S/4HANA', 'MM (Materials Management / 자재관리)', 'SD (Sales & Distribution / 영업관리)'];
    }

    return {
      success: true,
      term,
      category,
      parentTerm,
      importance,
      relatedTerms,
      summary,
      docsUrl
    };
  }
};

// DOM 로드 시 로컬 스토리지 초기화 및 서버 동기화 수행
document.addEventListener('DOMContentLoaded', () => {
  if (window.SapTermModel) {
    window.SapTermModel.getTerms();
    window.SapTermModel.initSync();
  }
});
