// app/models/stockTempModel.js - K증시 온도 데이터 모델 & DB 연동 & 키워드 자동 추출 & Realtime 동기화 모듈

window.StockTempModel = {
  items: [],
  STORAGE_KEY: 'portal_stock_temp_items',
  DELETED_KEY: 'portal_stock_temp_deleted_ids',
  realtimeSubscribed: false,

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/stock-temp', './data/stockTemp.json'];
    }
    return [
      'http://localhost:8080/api/stock-temp',
      'http://192.168.219.115:8080/api/stock-temp',
      './data/stockTemp.json'
    ];
  },

  getDeletedIds() {
    try {
      const local = localStorage.getItem(this.DELETED_KEY);
      if (local) {
        const arr = JSON.parse(local);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch (e) {}
    return new Set();
  },

  saveDeletedIds(deletedSet) {
    try {
      localStorage.setItem(this.DELETED_KEY, JSON.stringify(Array.from(deletedSet)));
    } catch (e) {}
  },

  /**
   * Supabase Realtime 채널 구독 (다른 사용자 작성 글 실시간 자동 화면 갱신)
   */
  subscribeRealtime() {
    if (this.realtimeSubscribed) return;
    if (window.isSupabaseEnabled && window.isSupabaseEnabled()) {
      const supabase = window.getSupabaseClient();
      if (!supabase) return;
      try {
        supabase
          .channel('stock_temp_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stock_temp' },
            async (payload) => {
              console.log('⚡ [StockTempModel] Supabase Realtime event received:', payload);
              await this.loadStockTempData();
              if (window.StockTempView && typeof window.StockTempView.renderView === 'function') {
                window.StockTempView.renderView();
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('⚡ [StockTempModel] Supabase Realtime 채널 실시간 수신 연결 완료!');
              this.realtimeSubscribed = true;
            }
          });
      } catch (e) {
        console.warn('[StockTempModel] Realtime subscription failed:', e);
      }
    }
  },

  /**
   * 온도 지수 산출 (0~100℃)
   */
  calculateTemp(goodCount, badCount) {
    const g = parseInt(goodCount, 10) || 0;
    const b = parseInt(badCount, 10) || 0;
    const total = g + b;
    if (total <= 0) return 50;
    return Math.min(100, Math.max(0, Math.round((g / total) * 100)));
  },

  /**
   * 온도 구간별 상태 정보 (이모지, 레이블, 색상)
   */
  getTempStatus(temp) {
    const t = parseInt(temp, 10) || 50;
    if (t >= 80) return { label: '열광', emoji: '🔥', class: 'status-hot', color: '#ef4444' };
    if (t >= 60) return { label: '온화', emoji: '☀️', class: 'status-warm', color: '#f59e0b' };
    if (t >= 40) return { label: '보합', emoji: '☁️', class: 'status-neutral', color: '#38bdf8' };
    if (t >= 20) return { label: '쌀쌀', emoji: '🌧️', class: 'status-cool', color: '#818cf8' };
    return { label: '혹한', emoji: '❄️', class: 'status-freezing', color: '#6366f1' };
  },

  /**
   * 주요 증시 키워드 태그 자동 추출 엔진
   */
  extractKeywords(title = '', summary = '', detail = '', userTags = []) {
    const text = `${title} ${summary} ${detail}`;
    const dictionary = [
      '반도체', '외국인순매수', '기관매수', '개인매수', '금리동결', '금리인하', '금리인상',
      '인플레이션', '바이오', '환율상승', '환율변동성', '환율하락', '2차전지', '방산', '방산수주',
      '조선', '조선주', '밸류업', '주주환원', '로봇', '로봇산업', 'HBM', '엔비디아', '수출호조',
      '차익실현', '관망세', '지정학적리스크', '어닝서프라이즈', '임상성공', '중국부양책', '금융주',
      '실적호조', '고금리', '국제유가', '유가급등', 'AI테마', '정책수혜', '코스피', '코스닥', '대장주',
      '철강', '화학', '소비재', '헬스케어', '스마트팩토리', '주주친화'
    ];

    const foundSet = new Set();

    dictionary.forEach(word => {
      if (text.includes(word)) {
        foundSet.add(word);
      }
    });

    const acronymMatches = text.match(/\b[A-Z]{2,8}\b/g) || [];
    acronymMatches.forEach(acronym => foundSet.add(acronym));

    const initialTags = Array.isArray(userTags)
      ? userTags
      : (typeof userTags === 'string' ? userTags.split(',').map(s => s.trim()).filter(Boolean) : []);

    initialTags.forEach(tag => {
      if (tag) foundSet.add(tag);
    });

    if (foundSet.size === 0 && title) {
      const words = title.split(/\s+/).map(w => w.replace(/[^\w가-힣]/g, '')).filter(w => w.length >= 2);
      words.slice(0, 4).forEach(w => foundSet.add(w));
    }

    return Array.from(foundSet);
  },

  /**
   * 전체 K증시 온도 데이터 조회 (삭제 항목 필터링 및 병합)
   */
  async loadStockTempData() {
    const urls = this.getApiUrls();
    const deletedSet = this.getDeletedIds();
    let serverData = [];
    let localData = [];
    let supabaseData = [];

    // 1. LocalStorage 데이터 확인
    const local = localStorage.getItem(this.STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) localData = parsed;
      } catch (e) {}
    }

    // 2. Server API / File 데이터 확인
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            serverData = json;
            break;
          }
        }
      } catch (e) {}
    }

    // 3. Supabase DB 확인
    if (window.isSupabaseEnabled && window.isSupabaseEnabled()) {
      const supabase = window.getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.from('stock_temp').select('*');
          if (!error && Array.isArray(data)) {
            supabaseData = data.map(row => ({
              id: row.id,
              date: row.date,
              timePeriod: row.time_period || (row.datetime && row.datetime.includes('오전') ? '오전' : '오후'),
              datetime: row.datetime || `${row.date} ${row.time_period || '오후'}`,
              title: row.title,
              goodCount: row.good_count,
              badCount: row.bad_count,
              temp: row.temp,
              summary: row.summary,
              detail: row.detail,
              tags: row.tags,
              createdAt: row.created_at
            }));
          }
        } catch (e) {}
      }
    }

    // 4. 로컬, 서버, Supabase 데이터 병합 (삭제된 ID 제외 및 중복 제거)
    const map = new Map();
    [...serverData, ...supabaseData, ...localData].forEach(item => {
      if (item && item.id && !deletedSet.has(item.id)) {
        map.set(item.id, item);
      }
    });

    let merged = Array.from(map.values());

    this.items = this.normalizeItems(merged);
    this.saveToLocal(this.items);
    await this.syncToServer(this.items);
    
    // Realtime 구독 시도
    this.subscribeRealtime();

    return this.items;
  },

  getItems() {
    if (Array.isArray(this.items)) {
      return this.normalizeItems(this.items);
    }
    const local = localStorage.getItem(this.STORAGE_KEY);
    if (local) {
      try { this.items = JSON.parse(local); } catch (e) {}
    }
    return this.normalizeItems(this.items || []);
  },

  normalizeItems(list) {
    if (!Array.isArray(list)) return [];
    const deletedSet = this.getDeletedIds();

    return list
      .filter(item => item && item.id && !deletedSet.has(item.id))
      .map(item => {
        const g = parseInt(item.goodCount, 10) || 0;
        const b = parseInt(item.badCount, 10) || 0;
        const temp = this.calculateTemp(g, b);

        const dateOnly = (item.date || (item.datetime ? item.datetime.split(' ')[0] : new Date().toISOString().split('T')[0])).trim();
        
        let period = item.timePeriod;
        if (!period) {
          if (item.datetime && item.datetime.includes('오전')) period = '오전';
          else period = '오후';
        }

        const displayDt = `${dateOnly} ${period}`;
        const sortTime = period === '오전' ? '09:00:00' : '15:30:00';
        const sortKey = new Date(`${dateOnly}T${sortTime}`).getTime();

        return {
          ...item,
          date: dateOnly,
          timePeriod: period,
          datetime: displayDt,
          sortKey: isNaN(sortKey) ? 0 : sortKey,
          goodCount: g,
          badCount: b,
          temp,
          tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',').map(s => s.trim()).filter(Boolean) : [])
        };
      }).sort((a, b) => b.sortKey - a.sortKey);
  },

  /**
   * 주간(7일), 월간(30일), 년간(365일) 기간 필터 데이터
   */
  getFilteredItems(period = 'month') {
    const items = this.getItems();
    if (period === 'all') return items;

    const now = new Date();
    let daysLimit = 30;
    if (period === 'week') daysLimit = 7;
    else if (period === 'year') daysLimit = 365;

    const cutoff = new Date(now.getTime() - (daysLimit * 24 * 60 * 60 * 1000));
    const filtered = items.filter(item => {
      const itemDate = new Date(item.date);
      return !isNaN(itemDate.getTime()) && itemDate >= cutoff;
    });

    return filtered.length > 0 ? filtered : items;
  },

  /**
   * 대시보드 인사이트 통계 집계
   */
  getMetrics(itemList) {
    const list = itemList || this.getItems();
    if (list.length === 0) {
      return { avgTemp: 50, todayTemp: 50, goodSum: 0, badSum: 0, topTags: [] };
    }

    const todayItem = list[0];
    const todayTemp = todayItem ? todayItem.temp : 50;

    let totalTemp = 0;
    let goodSum = 0;
    let badSum = 0;
    const tagCountMap = {};

    list.forEach(item => {
      totalTemp += item.temp;
      goodSum += item.goodCount;
      badSum += item.badCount;
      if (Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (tag) tagCountMap[tag] = (tagCountMap[tag] || 0) + 1;
        });
      }
    });

    const avgTemp = Math.round(totalTemp / list.length);
    const topTags = Object.entries(tagCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);

    return {
      avgTemp,
      todayTemp,
      todayItem,
      goodSum,
      badSum,
      totalRecords: list.length,
      topTags
    };
  },

  /**
   * 데이터 저장 / 업데이트 (고유 ID 생성 & 삭제 블랙리스트 자동 해제)
   */
  async saveRecord(recordData) {
    let items = this.getItems();
    const dateOnly = (recordData.date || new Date().toISOString().split('T')[0]).trim();
    const period = (recordData.timePeriod || '오후').trim();
    const displayDt = `${dateOnly} ${period}`;
    const mainTitle = (recordData.title || recordData.summary || `${displayDt} K증시 분위기`).trim();

    // 고유 ID 생성 (신규 작성 시 타임스탬프 결합으로 이전 삭제 ID와의 충돌 방지)
    const targetId = recordData.id || `st-${dateOnly}-${period === '오전' ? 'am' : 'pm'}-${Date.now().toString(36)}`;

    // 삭제 블랙리스트 해제
    const deletedSet = this.getDeletedIds();
    if (deletedSet.has(targetId)) {
      deletedSet.delete(targetId);
      this.saveDeletedIds(deletedSet);
    }

    const existingIndex = items.findIndex(i => i.id === targetId);

    const good = parseInt(recordData.goodCount, 10) || 0;
    const bad = parseInt(recordData.badCount, 10) || 0;
    const temp = this.calculateTemp(good, bad);

    // 키워드 태그 자동 추출
    const autoTags = this.extractKeywords(mainTitle, mainTitle, recordData.detail, recordData.tags);

    const itemToSave = {
      id: targetId,
      date: dateOnly,
      timePeriod: period,
      datetime: displayDt,
      title: mainTitle,
      goodCount: good,
      badCount: bad,
      temp,
      summary: mainTitle,
      detail: recordData.detail || '',
      tags: autoTags,
      createdAt: recordData.createdAt || new Date().toISOString()
    };

    if (existingIndex >= 0) {
      items[existingIndex] = itemToSave;
    } else {
      items.unshift(itemToSave);
    }

    this.items = this.normalizeItems(items);
    this.saveToLocal(this.items);
    await this.syncToSupabase(itemToSave, 'upsert');
    await this.syncToServer(this.items);
    return itemToSave;
  },

  /**
   * 레코드 영구 삭제 (deletedIds 블랙리스트 등록으로 재복구 방지)
   */
  async deleteRecord(id) {
    if (!id) return false;

    // 1. 삭제 대상 ID 블랙리스트 등록
    const deletedSet = this.getDeletedIds();
    deletedSet.add(id);
    this.saveDeletedIds(deletedSet);

    // 2. 메모리 및 로컬스토리지 삭제
    let items = this.getItems();
    const targetItem = items.find(item => item.id === id);
    items = items.filter(item => item.id !== id);
    this.items = this.normalizeItems(items);
    this.saveToLocal(this.items);

    // 3. Supabase DB 삭제
    if (targetItem) {
      await this.syncToSupabase(targetItem, 'delete');
    }

    // 4. 서버 파일 API 동기화
    await this.syncToServer(this.items);
    return true;
  },

  saveToLocal(items) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[StockTempModel] LocalStorage write error:', e);
    }
  },

  async syncToServer(items) {
    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch('/api/stock-temp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items)
        });
      } catch (e) {
        console.warn('[StockTempModel] Server sync error:', e);
      }
    }
  },

  async syncToSupabase(item, action = 'upsert') {
    if (window.isSupabaseEnabled && window.isSupabaseEnabled()) {
      const supabase = window.getSupabaseClient();
      if (!supabase) return;
      try {
        if (action === 'delete') {
          await supabase.from('stock_temp').delete().eq('id', item.id);
        } else {
          await supabase.from('stock_temp').upsert({
            id: item.id,
            date: item.date,
            datetime: item.datetime,
            title: item.title,
            good_count: item.goodCount,
            bad_count: item.badCount,
            temp: item.temp,
            summary: item.summary,
            detail: item.detail,
            tags: item.tags,
            created_at: item.createdAt || new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('[StockTempModel] Supabase DB sync exception:', e);
      }
    }
  }
};
