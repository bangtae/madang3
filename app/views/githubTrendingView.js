// app/views/githubTrendingView.js - GitHub 트렌딩 & 오픈소스 레이더 뷰 컴포넌트
window.GithubTrendingView = {
  activeCategory: 'All',
  searchTerm: '',

  init() {
    this.render();
    this.bindEvents();
  },

  render() {
    const container = document.getElementById('view-github-trending');
    if (!container) return;

    const totalRepos = window.GithubTrendingModel ? window.GithubTrendingModel.repositories.length : 0;
    const categories = window.GithubTrendingModel ? window.GithubTrendingModel.getCategories() : ['All'];
    const totalCategories = Math.max(0, categories.length - 1);
    const updatedAt = (window.GithubTrendingModel && window.GithubTrendingModel.data && window.GithubTrendingModel.data.updatedAt)
      ? new Date(window.GithubTrendingModel.data.updatedAt).toLocaleString('ko-KR')
      : '최신 동기화됨';

    container.innerHTML = `
      <div class="github-trending-container">
        <!-- 상단 헤더 -->
        <div class="trending-header-card">
          <div class="trending-header-left">
            <div class="trending-title-row">
              <span class="trending-icon-badge">🐙</span>
              <h2>GitHub 트렌딩 & 오픈소스 레이더</h2>
              <span class="trending-live-pill">
                <span class="pulse-dot"></span> 라이브 랭킹 연동
              </span>
            </div>
            <p class="trending-header-desc">
              전 세계 개발자들이 지금 가장 열광하는 <strong>인기 오픈소스 저장소</strong>를 초보자 눈높이에서 알기 쉽게 분석하고, 
              각 저장소의 핵심 기능과 <strong>실전 활용 가이드</strong>를 제공합니다.
            </p>
            <div class="trending-meta-row">
              <span class="meta-item">🕒 최근 갱신: <strong>${updatedAt}</strong></span>
              <span class="meta-item">🌐 공식 데이터 소스: <a href="https://github.com/trending" target="_blank" rel="noopener" class="source-link">github.com/trending ↗</a></span>
            </div>
          </div>
          <div class="trending-header-stats">
            <div class="stat-pill-box">
              <span class="stat-val">${totalRepos}</span>
              <span class="stat-lbl">인기 오픈소스</span>
            </div>
            <div class="stat-pill-box highlight">
              <span class="stat-val">${totalCategories}개</span>
              <span class="stat-lbl">전문 분야 테마</span>
            </div>
          </div>
        </div>

        <!-- 본문 랭킹 영역 -->
        <div class="trending-tab-content">
          ${this.renderRankingTab()}
        </div>
      </div>
    `;

    this.bindDynamicEvents();
  },

  renderRankingTab() {
    const categories = window.GithubTrendingModel ? window.GithubTrendingModel.getCategories() : ['All'];
    const repos = window.GithubTrendingModel ? window.GithubTrendingModel.getFilteredRepositories(this.activeCategory, this.searchTerm) : [];

    return `
      <div class="ranking-tab-wrapper">
        <!-- 검색 및 카테고리 필터 툴바 -->
        <div class="trending-toolbar">
          <div class="category-pills-scroll">
            ${categories.map(cat => `
              <button class="trending-cat-pill ${this.activeCategory === cat ? 'active' : ''}" data-category="${cat}">
                ${cat === 'All' ? '🌟 전체 보기' : cat}
              </button>
            `).join('')}
          </div>
          <div class="trending-search-input-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="input-trending-search" placeholder="저장소명, 언어, 설명, 초보자 가이드 검색..." value="${this.escapeHtml(this.searchTerm)}" />
            ${this.searchTerm ? `<button type="button" id="btn-clear-trending-search" class="btn-clear-txt">&times;</button>` : ''}
          </div>
        </div>

        <!-- 랭킹 그리드 카드 목록 -->
        ${repos.length === 0 ? `
          <div class="empty-trending-box">
            <div class="empty-icon">📂</div>
            <h3>검색 결과가 없습니다.</h3>
            <p>검색어를 변경하거나 카테고리 필터를 '전체'로 재설정해 보세요.</p>
          </div>
        ` : `
          <div class="trending-grid">
            ${repos.map(r => this.renderRepoCard(r)).join('')}
          </div>
        `}
      </div>
    `;
  },

  renderRepoCard(r) {
    const rankClass = r.rank === 1 ? 'gold' : (r.rank === 2 ? 'silver' : (r.rank === 3 ? 'bronze' : ''));
    const whatCanDoList = Array.isArray(r.whatCanDo) ? r.whatCanDo : [];

    return `
      <div class="trending-repo-card ${rankClass}">
        <div class="repo-card-top">
          <div class="rank-badge ${rankClass}">#${r.rank}</div>
          <div class="repo-meta-right">
            <span class="meta-tag-pill">${this.escapeHtml(r.tag || r.category)}</span>
            <span class="meta-lang-pill">💻 ${this.escapeHtml(r.language || 'Multi')}</span>
          </div>
        </div>

        <div class="repo-title-row">
          <h3 class="repo-name">
            <a href="${this.escapeHtml(r.url)}" target="_blank" rel="noopener" title="GitHub 원본 저장소 방문">
              ${this.escapeHtml(r.repo)}
            </a>
          </h3>
          <div class="repo-stats-row">
            <span class="stat-badge star" title="GitHub Stars">⭐ ${r.stars}</span>
            <span class="stat-badge fork" title="GitHub Forks">🍴 ${r.forks}</span>
          </div>
        </div>

        <p class="repo-summary-text">${this.escapeHtml(r.summary)}</p>

        <!-- 1. 초보자 3초 완벽 이해 가이드 -->
        <div class="guide-box beginner-highlight">
          <div class="guide-header">
            <span class="guide-icon">💡</span>
            <strong>초보자를 위한 쉬운 해설 (어떤 소스인가요?)</strong>
          </div>
          <p class="guide-body">${this.escapeHtml(r.whatIsIt)}</p>
        </div>

        <!-- 2. 이걸로 무엇을 만들고 할 수 있나요? -->
        <div class="guide-box practical-use">
          <div class="guide-header">
            <span class="guide-icon">🎯</span>
            <strong>이 소스로 무엇을 만들고 할 수 있나요?</strong>
          </div>
          <ul class="guide-bullets">
            ${whatCanDoList.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>

        <!-- 3. 한 줄 요약 팁 -->
        <div class="guide-box quick-takeaway">
          <span class="takeaway-badge">📌 1줄 핵심</span>
          <span class="takeaway-text">${this.escapeHtml(r.beginnerGuide)}</span>
        </div>

        <div class="repo-card-bottom">
          <a href="${this.escapeHtml(r.url)}" target="_blank" rel="noopener" class="btn-github-link">
            <span>GitHub 소스코드 열람하기</span>
            <span class="arrow">↗</span>
          </a>
        </div>
      </div>
    `;
  },

  bindEvents() {},

  bindDynamicEvents() {
    // 1. 카테고리 필터 버튼 이벤트
    document.querySelectorAll('#view-github-trending .trending-cat-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.getAttribute('data-category');
        if (cat) {
          this.activeCategory = cat;
          this.render();
        }
      });
    });

    // 2. 검색 입력 이벤트
    const searchInput = document.getElementById('input-trending-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        const container = document.querySelector('#view-github-trending .trending-tab-content');
        if (container) {
          container.innerHTML = this.renderRankingTab();
          this.bindDynamicEvents();
          const newIn = document.getElementById('input-trending-search');
          if (newIn) {
            newIn.focus();
            newIn.setSelectionRange(newIn.value.length, newIn.value.length);
          }
        }
      });
    }

    // 3. 검색어 초기화 버튼
    const btnClear = document.getElementById('btn-clear-trending-search');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        this.searchTerm = '';
        this.render();
      });
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
