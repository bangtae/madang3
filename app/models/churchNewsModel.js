// app/models/churchNewsModel.js - 수원은혜교회 및 합동총회 소식 데이터 관리 모델

window.ChurchNewsModel = {
  STORAGE_KEY: 'portal_church_news_cache',
  data: null,
  isSyncing: false,

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/church-news', './data/church_news.json'];
    }
    return [
      'http://localhost:8080/api/church-news',
      'http://192.168.219.115:8080/api/church-news',
      './data/church_news.json'
    ];
  },

  async init() {
    await this.loadData();
  },

  async loadData(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        try {
          this.data = JSON.parse(cached);
        } catch (e) {}
      }
    }

    const urls = this.getApiUrls();
    for (const url of urls) {
      try {
        const res = await fetch(url + (forceRefresh ? `?t=${Date.now()}` : ''), { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && (json.suwon || json.gapck)) {
            this.data = json;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(json));
            return this.data;
          }
        }
      } catch (err) {
        // try next
      }
    }

    if (!this.data) {
      this.data = this.getDefaultFallbackData();
    }
    return this.data;
  },

  async syncWithServer() {
    if (this.isSyncing) return this.data;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/church-news/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json && (json.suwon || json.gapck)) {
          this.data = json;
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(json));
          return this.data;
        }
      }
    } catch (e) {
      console.warn('[ChurchNewsModel] sync failed, fallback to loadData:', e);
    } finally {
      this.isSyncing = false;
    }
    return await this.loadData(true);
  },

  getSuwonData() {
    return this.data?.suwon || { name: '수원은혜교회', quickLinks: [], items: [] };
  },

  getGapckData() {
    return this.data?.gapck || { name: '대한예수교장로회 총회 (GAPCK)', quickLinks: [], items: [] };
  },

  getLastUpdated() {
    return this.data?.lastUpdated || '최근 동기화됨';
  },

  getDefaultFallbackData() {
    return {
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19),
      suwon: {
        name: "수원은혜교회",
        mainUrl: "https://www.suwongrace-ch.org",
        pastor: "황유석 담임목사",
        address: "경기 수원시 장안구 대평로 118 수원은혜교회",
        quickLinks: [
          { id: "pastor", title: "담임목사 소개", url: "https://www.suwongrace-ch.org/62", icon: "👤", desc: "황유석 담임목사 목회철학 및 약력" },
          { id: "bulletin", title: "교회 주보", url: "https://www.suwongrace-ch.org/25", icon: "📜", desc: "매주 업데이트되는 최신 주보 열람" },
          { id: "news", title: "교회 소식", url: "https://www.suwongrace-ch.org/1808865845", icon: "📢", desc: "공지사항 및 공동체 안내" },
          { id: "column", title: "담임목사 칼럼", url: "https://www.suwongrace-ch.org/99", icon: "✍️", desc: "목회 서신과 은혜의 신앙 글" },
          { id: "events", title: "교회 행사 & 일정", url: "https://www.suwongrace-ch.org/63", icon: "🎉", desc: "연간 및 월간 행사 일정 안내" },
          { id: "sermon", title: "주일 설교 영상", url: "https://www.suwongrace-ch.org/78", icon: "📖", desc: "주일 예배 및 설교 다시보기" },
          { id: "worship_time", "title": "예배시간 안내", url: "https://www.suwongrace-ch.org/1554592017", icon: "⏰", desc: "주일/수요/새벽예배 시간표" },
          { id: "map", title: "오시는 길 & 안내", url: "https://www.suwongrace-ch.org/34", icon: "📍", desc: "교회 위치 및 대중교통 안내" }
        ],
        items: [
          { id: "sw-1", category: "교회소식", title: "2026년 하반기 공동체 사역 및 주일예배 안내", date: "2026-09-14", url: "https://www.suwongrace-ch.org/1808865845", desc: "은혜와 사랑으로 함께하는 수원은혜교회 예배 및 공동체 소식입니다." },
          { id: "sw-2", category: "주보", title: "수원은혜교회 주일 1·2·3부 온라인 주보", date: "2026-09-13", url: "https://www.suwongrace-ch.org/25", desc: "예배 순서, 금주의 성경봉독 말씀, 헌금 위원 및 교회 광고." },
          { id: "sw-3", category: "목회칼럼", title: "황유석 담임목사 칼럼 - 믿음의 경주와 은혜의 삶", date: "2026-09-10", url: "https://www.suwongrace-ch.org/99", desc: "삶의 자리에서 하나님의 인도하심을 신뢰하며 나아가는 지혜를 나눕니다." },
          { id: "sw-4", category: "설교", title: "주일 대예배 실시간 말씀 및 설교 영상", date: "2026-09-13", url: "https://www.suwongrace-ch.org/78", desc: "주일 예배 설교 풀버전 영상 및 요약 말씀 다시보기." },
          { id: "sw-5", category: "행사", title: "가을 특별 새벽기도회 및 다음세대 연합 캠프 안내", date: "2026-09-08", url: "https://www.suwongrace-ch.org/63", desc: "성도 여러분의 많은 기도와 적극적인 참여를 부탁드립니다." }
        ]
      },
      gapck: {
        name: "대한예수교장로회 총회 (GAPCK)",
        mainUrl: "https://gapck.org",
        description: "대한예수교장로회(합동) 총회 본부",
        quickLinks: [
          { id: "ga_main", title: "총회 본부 홈페이지", url: "https://gapck.org/", icon: "🏛️", desc: "총회 메인 포털 사이트" },
          { id: "ga_board", title: "총회 공지사항", url: "https://gapck.org/board/classic", icon: "📣", desc: "교단 주요 공고 및 행정 소식" },
          { id: "ga_org", title: "총회 조직 & 임원", url: "https://gapck.org/organization", icon: "👥", desc: "총회 임원회 및 상비부 조직" },
          { id: "ga_presbytery", title: "전국 노회 현황", url: "https://gapck.org/presbytery", icon: "🗺️", desc: "전국 지역별 노회 정보 조회" },
          { id: "ga_history", title: "총회 역사관", url: "https://gapck.org/history", icon: "📚", desc: "한국 장로교 합동 교단 역사" },
          { id: "ga_archives", title: "총회 문서 자료실", url: "https://gapck.org/ga-archives", icon: "📁", desc: "행정 서식, 규정집, 표준 문서 다운로드" },
          { id: "ga_edu", title: "총회 교육 & 고시", url: "https://gapck.org/customer-support", icon: "🎓", desc: "신학 교육 및 목사고시 안내" },
          { id: "ga_welfare", title: "총회 복지재단", url: "http://welfare.gapck.org/", icon: "🤝", desc: "교역자 연금 및 복지 사업 안내" }
        ],
        items: [
          { id: "ga-1", category: "총회공지", title: "제110회기 총회 정책 방향 및 주요 회의 소집 공고", date: "2026-09-15", url: "https://gapck.org/board/classic", desc: "교단 산하 지교회 및 노회를 위한 총회 임원회 결의 및 정책 알림입니다." },
          { id: "ga-2", category: "총회행정", title: "총회 세례교인헌금 시행 및 행정 보고 표준 지침 안내", date: "2026-09-12", url: "https://gapck.org/board/classic", desc: "110회기 교단 발전을 위한 세례교인헌금 납부 절차 및 협조 요청 안내문." },
          { id: "ga-3", category: "자료실", title: "교회 행정 및 정관 표준 서식 최신 개정본 배포", date: "2026-09-05", url: "https://gapck.org/ga-archives", desc: "합동 교단 표준 회의록, 이명 증명서 등 교회 필수 서식 다운로드." },
          { id: "ga-4", category: "고시/지원", title: "2026년도 하반기 강도사 및 총회 고시 일정 공고", date: "2026-09-02", url: "https://gapck.org/customer-support", desc: "총회 고시위원회 시행 일정, 접수 방법 및 제출 서류 목록." }
        ]
      }
    };
  }
};
