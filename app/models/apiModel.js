// app/models/apiModel.js - LocalStorage 및 중앙 서버(apis.json) 양방향 동기화 데이터 관리 모듈

window.ApiModel = {
  apis: [],
  isSyncing: false,

  /**
   * 서버 REST API URL 구하기 (HTTP 모드 및 file:// 로컬 모드 모두 지원)
   */
  getApiUrl() {
    if (window.location.protocol.startsWith('http')) {
      return '/api/apis';
    }
    return 'http://192.168.219.115:8080/api/apis';
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
   * LocalStorage 데이터 직접 가져오기
   */
  getApisFromLocal() {
    const rawData = localStorage.getItem(window.CONFIG.STORAGE_KEY);
    if (!rawData) return window.CONFIG.INITIAL_APIS || [];
    try {
      const parsed = JSON.parse(rawData);
      return (Array.isArray(parsed) && parsed.length > 0) ? parsed : (window.CONFIG.INITIAL_APIS || []);
    } catch (e) {
      return window.CONFIG.INITIAL_APIS || [];
    }
  },

  /**
   * 서버 데이터와 LocalStorage 양방향 동기화
   */
  async initSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const localApis = this.getApisFromLocal();

    try {
      const serverUrl = this.getApiUrl();
      const res = await fetch(serverUrl, { 
        method: 'GET', 
        headers: { 'Accept': 'application/json' },
        cache: 'no-cache'
      });

      if (res.ok) {
        const serverApis = await res.json();
        if (Array.isArray(serverApis) && serverApis.length > 0) {
          // 로컬에 98개 등 더 많은 데이터가 있고 서버엔 더 적은 데이터(예: 더미 2개)만 있는 경우
          if (localApis.length > serverApis.length) {
            console.log(`[Sync] 로컬 데이터(${localApis.length}개)가 서버(${serverApis.length}개)보다 많아 서버로 업로드 동기화합니다.`);
            await this.syncToServer(localApis);
            this.apis = localApis;
          } else {
            // 서버 데이터가 더 최신이거나 같으면 서버 데이터 반영
            this.apis = serverApis;
            localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(serverApis));
          }
        } else if (localApis.length > 0) {
          // 서버 데이터 파일이 비어 있으면 로컬 데이터를 서버로 업로드
          console.log(`[Sync] 서버 데이터가 비어있어 로컬 데이터(${localApis.length}개)를 서버로 저장합니다.`);
          await this.syncToServer(localApis);
          this.apis = localApis;
        }
      }
    } catch (e) {
      console.log('[Sync] 서버 연결을 건너뜁니다 (오프라인 모드):', e);
      this.apis = localApis;
    } finally {
      this.isSyncing = false;
      if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
        window.AppController.refreshAllViews();
      }
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
