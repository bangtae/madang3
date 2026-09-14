// app/models/githubTrendingModel.js - GitHub 트렌딩 및 madang 연계 개선 제안 모델
window.GithubTrendingModel = {
  data: null,
  repositories: [],
  proposals: [],
  isLoading: false,
  STORAGE_KEY: 'portal_github_trending',

  async init() {
    await this.loadData();
  },

  async loadData(forceRefresh = false) {
    if (this.isLoading) return this.data;
    this.isLoading = true;

    // 1. 로컬 스토리지 캐시 우선 확인 (강제 갱신이 아닌 경우)
    if (!forceRefresh) {
      try {
        const local = localStorage.getItem(this.STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && Array.isArray(parsed.repositories) && parsed.repositories.length > 0) {
            this.applyData(parsed);
          }
        }
      } catch (e) {}
    }

    // 2. 서버 REST API 최우선 시도
    try {
      const url = '/api/github-trending' + (forceRefresh ? '?refresh=1&t=' + Date.now() : '?t=' + Date.now());
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && Array.isArray(serverData.repositories) && serverData.repositories.length > 0) {
          this.applyData(serverData);
          this.cacheData(serverData);
          this.isLoading = false;
          return this.data;
        }
      }
    } catch (e) {}

    // 3. Initial JS 전역 변수 폴백 (초기 파일 로드 및 오프라인 대비)
    if (window.PORTAL_DATA_GITHUB_TRENDING && Array.isArray(window.PORTAL_DATA_GITHUB_TRENDING.repositories)) {
      this.applyData(window.PORTAL_DATA_GITHUB_TRENDING);
      this.cacheData(this.data);
      this.isLoading = false;
      return this.data;
    }

    this.isLoading = false;
    return this.data;
  },

  applyData(payload) {
    this.data = payload;
    this.repositories = payload.repositories || [];
    this.proposals = payload.proposals || [];
  },

  cacheData(payload) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  },

  getFilteredRepositories(category = 'All', searchTerm = '') {
    let list = this.repositories || [];
    if (category && category !== 'All') {
      list = list.filter(r => r.category === category);
    }
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(r => 
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.repo && r.repo.toLowerCase().includes(q)) ||
        (r.summary && r.summary.toLowerCase().includes(q)) ||
        (r.tag && r.tag.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q)) ||
        (r.whatIsIt && r.whatIsIt.toLowerCase().includes(q)) ||
        (r.beginnerGuide && r.beginnerGuide.toLowerCase().includes(q))
      );
    }
    return list;
  },

  getFilteredProposals(searchTerm = '') {
    let list = this.proposals || [];
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.target && p.target.toLowerCase().includes(q)) ||
        (p.benchmarking && p.benchmarking.toLowerCase().includes(q)) ||
        (p.problem && p.problem.toLowerCase().includes(q)) ||
        (p.solution && p.solution.toLowerCase().includes(q)) ||
        (p.expectedEffect && p.expectedEffect.toLowerCase().includes(q))
      );
    }
    return list;
  },

  getCategories() {
    const set = new Set();
    (this.repositories || []).forEach(r => {
      if (r.category) set.add(r.category);
    });
    return ['All', ...Array.from(set)];
  }
};