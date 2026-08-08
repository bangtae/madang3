// app/models/apiModel.js - LocalStorage 데이터 관리 모듈

window.ApiModel = {
  /**
   * 저장된 전체 API 목록 조회 (없을 경우 초기 더미데이터 로드)
   */
  getApis() {
    const rawData = localStorage.getItem(window.CONFIG.STORAGE_KEY);
    if (!rawData) {
      this.saveAllApis(window.CONFIG.INITIAL_APIS);
      return window.CONFIG.INITIAL_APIS;
    }
    try {
      return JSON.parse(rawData);
    } catch (e) {
      console.error('LocalStorage parse error:', e);
      return [];
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
   * 전체 API 데이터 저장
   */
  saveAllApis(apis) {
    localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(apis));
  }
};
