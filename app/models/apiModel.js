// app/models/apiModel.js - LocalStorage 및 중앙 서버(apis.json) 양방향 동기화 데이터 관리 모듈

window.ApiModel = {
  apis: [],
  isSyncing: false,

  /**
   * 서버 REST API URL 및 폴백 URL 목록 구하기
   */
  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/apis', './data/apis.json'];
    }
    return [
      'http://localhost:8080/api/apis',
      'http://192.168.219.115:8080/api/apis',
      './data/apis.json'
    ];
  },

  getApiUrl() {
    return this.getApiUrls()[0];
  },

  /**
   * 저장된 전체 API 목록 조회 (로컬 저장소 + 기본 236개 API 100% 보장 병합)
   */
  getApis() {
    const localApis = this.getApisFromLocal();
    const fallbackApis = window.PORTAL_DATA_APIS || (window.CONFIG ? window.CONFIG.INITIAL_APIS : []) || [];
    const merged = this.mergeApis(localApis, fallbackApis);
    this.apis = merged;
    return this.apis;
  },

  /**
   * LocalStorage 데이터 직접 가져오기 (기존 등록 데이터 유실 방지)
   */
  getApisFromLocal() {
    const fallbackApis = window.PORTAL_DATA_APIS || window.CONFIG.INITIAL_APIS || [];
    const rawData = localStorage.getItem(window.CONFIG.STORAGE_KEY);
    if (!rawData) {
      localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(fallbackApis));
      return fallbackApis;
    }
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 기존 저장이 데모 2개뿐이거나 fallback보다 적으면 병합하여 풍부한 데이터 제공
        if (parsed.length < fallbackApis.length) {
          const merged = this.mergeApis(parsed, fallbackApis);
          localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
      return fallbackApis;
    } catch (e) {
      return fallbackApis;
    }
  },

  /**
   * API 데이터 손실 없는 양방향 통합 병합
   */
  mergeApis(listA = [], listB = []) {
    const map = new Map();
    const cleanUrl = url => (url || '').trim().toLowerCase().replace(/\/+$/, '');

    for (const item of [...(listB || []), ...(listA || [])]) {
      if (!item) continue;
      const key = item.id || (item.serviceUrl ? cleanUrl(item.serviceUrl) : null) || item.title;
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  },

  /**
   * 서버 데이터와 LocalStorage 양방향 동기화
   */
  async initSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const localApis = this.getApisFromLocal();
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
          const serverApis = JSON.parse(cleanText || '[]');
          if (Array.isArray(serverApis) && serverApis.length > 0) {
            const merged = this.mergeApis(localApis, serverApis);
            this.apis = merged;
            localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(merged));
            this.syncToServer(merged);
            synced = true;
            break;
          }
        }
      } catch (e) {
        // 다음 폴백 URL로 시도
      }
    }

    if (!synced) {
      const fallbackApis = window.PORTAL_DATA_APIS || window.CONFIG.INITIAL_APIS || [];
      const merged = this.mergeApis(localApis, fallbackApis);
      this.apis = merged;
      localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(merged));
    }

    this.isSyncing = false;
    if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
      window.AppController.refreshAllViews();
    }
  },

  /**
   * 서버 (data/apis.json)로 데이터 저장 전송
   */
  async syncToServer(apis) {
    try {
      const serverUrl = this.getApiUrl();
      await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apis)
      });
    } catch (e) {
      console.warn('[Sync] 서버에 데이터를 동기화하지 못했습니다:', e);
    }
  },

  /**
   * 신규 API 데이터 추가
   */
  addApi(apiData) {
    const apis = this.getApis();
    const newApi = {
      id: `api_${Date.now()}`,
      title: apiData.title,
      serviceUrl: apiData.serviceUrl,
      docsUrl: apiData.docsUrl,
      category: apiData.category || '기타',
      createdAt: new Date().toISOString()
    };
    apis.unshift(newApi);
    this.saveAllApis(apis);
    return newApi;
  },

  /**
   * API 데이터 삭제
   */
  deleteApi(id) {
    const apis = this.getApis().filter(item => item.id !== id);
    this.saveAllApis(apis);
    return apis;
  },

  /**
   * API 데이터 수정
   */
  updateApi(id, updatedData) {
    const apis = this.getApis();
    const index = apis.findIndex(item => item.id === id);
    if (index !== -1) {
      apis[index] = {
        ...apis[index],
        title: updatedData.title,
        serviceUrl: updatedData.serviceUrl,
        docsUrl: updatedData.docsUrl,
        category: updatedData.category || '기타',
        updatedAt: new Date().toISOString()
      };
      this.saveAllApis(apis);
      return apis[index];
    }
    return null;
  },

  /**
   * 지정한 카테고리에 속한 모든 API의 카테고리 이름을 일괄 변경
   */
  batchUpdateCategory(oldCategory, newCategory) {
    if (!oldCategory || !newCategory) return 0;
    const apis = this.getApis();
    let updatedCount = 0;

    apis.forEach(item => {
      if (item.category === oldCategory) {
        item.category = newCategory;
        item.updatedAt = new Date().toISOString();
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      this.saveAllApis(apis);
    }
    return updatedCount;
  },

  /**
   * 엑셀 등에서 추출된 API 리스트를 일괄 등록 / 업데이트 (Upsert)
   * serviceUrl 기준으로 기존 등록된 URL이 존재하면 업데이트, 없으면 신규 추가
   * 기존 등록된 다른 API 항목들은 삭제되거나 손상되지 않음
   * @param {Array} incomingApis - [{ title, serviceUrl, docsUrl, category }, ...]
   * @returns {{ addedCount: number, updatedCount: number, totalProcessed: number, totalApis: number }}
   */
  batchUpsertApis(incomingApis) {
    if (!Array.isArray(incomingApis) || incomingApis.length === 0) {
      return { addedCount: 0, updatedCount: 0, totalProcessed: 0, totalApis: this.getApis().length };
    }

    const apis = [...this.getApis()];
    let addedCount = 0;
    let updatedCount = 0;

    const normalizeUrl = (url) => (url || '').trim().toLowerCase().replace(/\/+$/, '');

    incomingApis.forEach(incoming => {
      if (!incoming.serviceUrl) return;

      const normIncomingUrl = normalizeUrl(incoming.serviceUrl);
      const existingIndex = apis.findIndex(item => normalizeUrl(item.serviceUrl) === normIncomingUrl);

      if (existingIndex !== -1) {
        // 기존 중복 항목 업데이트 (기존 id, createdAt 보존)
        apis[existingIndex] = {
          ...apis[existingIndex],
          title: incoming.title || apis[existingIndex].title,
          serviceUrl: incoming.serviceUrl,
          docsUrl: incoming.docsUrl || apis[existingIndex].docsUrl || '',
          category: incoming.category || apis[existingIndex].category || '기타',
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        // 신규 항목 등록
        const newApi = {
          id: `api_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          title: incoming.title || '이름 없음',
          serviceUrl: incoming.serviceUrl,
          docsUrl: incoming.docsUrl || '',
          category: incoming.category || '기타',
          createdAt: new Date().toISOString()
        };
        apis.unshift(newApi);
        addedCount++;
      }
    });

    if (addedCount > 0 || updatedCount > 0) {
      this.saveAllApis(apis);
    }

    return {
      addedCount,
      updatedCount,
      totalProcessed: incomingApis.length,
      totalApis: apis.length
    };
  },

  /**
   * 전체 API 데이터 저장 (LocalStorage + 서버 apis.json)
   */
  saveAllApis(apis) {
    this.apis = apis;
    localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(apis));
    this.syncToServer(apis);
  }
};

// DOM 준비 시 서버 동기화 자동 시작
document.addEventListener('DOMContentLoaded', () => {
  window.ApiModel.initSync();
});
