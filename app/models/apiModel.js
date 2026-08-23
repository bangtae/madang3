// app/models/apiModel.js - LocalStorage 및 중앙 서버(apis.json) 양방향 동기화 데이터 관리 모듈

window.ApiModel = {
  apis: [],
  isSyncing: false,

  /**
   * 서버 REST API URL 및 폴백 URL 목록 구하기
   */
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
    if (Array.isArray(this.apis) && this.apis.length > 0) {
      return this.apis;
    }
    const localApis = this.getApisFromLocal();
    const fallbackApis = window.PORTAL_DATA_APIS || (window.CONFIG ? window.CONFIG.INITIAL_APIS : []) || [];
    const merged = this.mergeApis(localApis, fallbackApis);
    this.apis = merged;
    return this.apis;
  },

  /**
   * LocalStorage 데이터 가져오기
   */
  getApisFromLocal() {
    const fallbackApis = (Array.isArray(window.PORTAL_DATA_APIS) && window.PORTAL_DATA_APIS.length > 0)
      ? window.PORTAL_DATA_APIS
      : (window.CONFIG ? window.CONFIG.INITIAL_APIS : []) || [];

    const rawData = localStorage.getItem(window.CONFIG ? window.CONFIG.STORAGE_KEY : 'portal_api_items');
    if (!rawData) {
      if (fallbackApis.length > 0) {
        localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(fallbackApis));
      }
      return fallbackApis;
    }
    try {
      let parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed) || parsed.length < 10) {
        if (fallbackApis.length > 0) {
          localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(fallbackApis));
          return fallbackApis;
        }
      }
      return parsed;
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
   * 서버 및 Supabase 클라우드 DB와 양방향/실시간 동기화
   */
  async initSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const localApis = this.getApisFromLocal();

    // 1. Supabase Cloud DB 연동 우선 확인
    if (window.isSupabaseEnabled()) {
      try {
        const supabase = window.getSupabaseClient();
        const { data, error } = await supabase.from('apis').select('*').order('created_at', { ascending: false });
        
        if (!error && Array.isArray(data)) {
          if (data.length === 0 && localApis.length > 0) {
            // DB가 비어있는 경우 기존 데이터 자동 시딩(Seeding)
            const seedPayload = localApis.map(item => ({
              id: item.id || `api_${Date.now()}_${Math.random()}`,
              title: item.title,
              category: item.category || '기타',
              service_url: item.serviceUrl || '',
              description: item.docsUrl || item.description || '',
              tags: item.tags || []
            }));
            await supabase.from('apis').upsert(seedPayload);
            this.apis = localApis;
          } else {
            // DB 데이터를 앱 포맷으로 변환
            const formattedApis = data.map(dbItem => ({
              id: dbItem.id,
              title: dbItem.title,
              category: dbItem.category,
              serviceUrl: dbItem.service_url,
              docsUrl: dbItem.description,
              tags: dbItem.tags,
              isNotice: dbItem.is_notice,
              createdAt: dbItem.created_at
            }));
            this.apis = formattedApis;
          }
          localStorage.setItem(window.CONFIG.STORAGE_KEY, JSON.stringify(this.apis));
          
          // Realtime 다중 사용자 실시간 동기화 리스너 등록
          this.subscribeRealtime();
          this.isSyncing = false;
          if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
            window.AppController.refreshAllViews();
          }
          return;
        }
      } catch (e) {
        console.warn('[Supabase Sync Error] Supabase DB 조회 실패. 폴백 동기화 시도:', e);
      }
    }

    // 2. Supabase 미연동 시 기존 REST API & LocalStorage 동기화
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
   * Supabase Realtime 다중 사용자 동시 갱신 구독
   */
  subscribeRealtime() {
    if (!window.isSupabaseEnabled() || this.realtimeSubscribed) return;
    try {
      const supabase = window.getSupabaseClient();
      supabase
        .channel('public:apis')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apis' }, payload => {
          console.log('[Realtime DB Update] API 변경 감지:', payload);
          // 실시간 DB 변경 시 목록 재로드
          this.initSync();
        })
        .subscribe();
      this.realtimeSubscribed = true;
    } catch (e) {
      console.warn('[Realtime Subscription Error]:', e);
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

    // Supabase DB에 신규 항목 추가
    if (window.isSupabaseEnabled()) {
      const supabase = window.getSupabaseClient();
      supabase.from('apis').insert([{
        id: newApi.id,
        title: newApi.title,
        category: newApi.category,
        service_url: newApi.serviceUrl,
        description: newApi.docsUrl
      }]).then(({ error }) => {
        if (error) console.error('Supabase API Insert Error:', error);
      });
    }

    return newApi;
  },

  /**
   * API 데이터 삭제
   */
  deleteApi(id) {
    const apis = this.getApis().filter(item => item.id !== id);
    this.saveAllApis(apis);

    // Supabase DB에서 삭제
    if (window.isSupabaseEnabled()) {
      const supabase = window.getSupabaseClient();
      supabase.from('apis').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase API Delete Error:', error);
      });
    }

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

      // Supabase DB에 수정사항 반영
      if (window.isSupabaseEnabled()) {
        const supabase = window.getSupabaseClient();
        supabase.from('apis').update({
          title: updatedData.title,
          category: updatedData.category || '기타',
          service_url: updatedData.serviceUrl,
          description: updatedData.docsUrl
        }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase API Update Error:', error);
        });
      }

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

      if (window.isSupabaseEnabled()) {
        const supabase = window.getSupabaseClient();
        supabase.from('apis').update({ category: newCategory }).eq('category', oldCategory);
      }
    }
    return updatedCount;
  },

  /**
   * 엑셀 등에서 추출된 API 리스트를 일괄 등록 / 업데이트 (Upsert)
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

      // Supabase 일괄 Upsert
      if (window.isSupabaseEnabled()) {
        const supabase = window.getSupabaseClient();
        const payload = apis.map(item => ({
          id: item.id,
          title: item.title,
          category: item.category || '기타',
          service_url: item.serviceUrl || '',
          description: item.docsUrl || ''
        }));
        supabase.from('apis').upsert(payload);
      }
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

// DOM 준비 시 서버 및 Supabase 동기화 자동 시작
document.addEventListener('DOMContentLoaded', () => {
  window.ApiModel.initSync();
});
