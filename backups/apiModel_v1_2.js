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
   * 저장된 전체 API 목록 조회
   */
  getApis() {
    const localApis = this.getApisFromLocal();
    if (this.apis && this.apis.length > 0) {
      return this.apis;
    }
    this.apis = localApis;
    return this.apis;
  },

  /**
   * LocalStorage 데이터 직접 가져오기 (file:// 로컬 모드 포함 100% 보장)
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
      if (Array.isArray(parsed) && parsed.length >= fallbackApis.length) {
        return parsed;
      }
      localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(fallbackApis));
      return fallbackApis;
    } catch (e) {
      return fallbackApis;
    }
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
            this.apis = serverApis;
            localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(serverApis));
            synced = true;
            break;
          }
        }
      } catch (e) {
        // 다음 폴백 URL로 시도
      }
    }

    if (!synced) {
      this.apis = localApis;
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
