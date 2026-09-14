// app/views/githubTrendingView.js - GitHub 트렌딩 & 오픈소스 레이더 뷰 컴포넌트
window.GithubTrendingView = {
  currentTab: 'ranking', // 'ranking' (인기 랭킹 및 쉬운 해설), 'proposals' (madang3/6 개선 제안서)
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
    const totalProps = window.GithubTrendingModel ? window.GithubTrendingModel.proposals.length : 0;
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
              <strong>madang3 포털 및 madang6 멀티에이전트</strong>에 즉시 벤치마킹할 수 있는 실전 시스템 개선 로드맵을 제공합니다.
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
              <span class="stat-val">${totalProps}</span>
              <span class="stat-lbl">madang 개선 제안</span>
            </div>
          </div>
        </div>

        <!-- 서브 탭 내비게이션 -->
        <div class="trending-tab-nav">
          <button class="trending-tab-btn ${this.currentTab === 'ranking' ? 'active' : ''}" data-tab="ranking">
            🏆 인기 저장소 랭킹 & 쉬운 해설 (${totalRepos})
          </button>
          <button class="trending-tab-btn ${this.currentTab === 'proposals' ? 'active' : ''}" data-tab="proposals">
            🚀 madang3 / madang6 시스템 개선 제안서 (${totalProps})
          </button>
        </div>

        <!-- 탭 본문 영역 -->
        <div class="trending-tab-content">
          ${this.currentTab === 'ranking' ? this.renderRankingTab() : this.renderProposalsTab()}
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

  renderProposalsTab() {
    const proposals = window.GithubTrendingModel ? window.GithubTrendingModel.getFilteredProposals(this.searchTerm) : [];

    return `
      <div class="proposals-tab-wrapper">
        <div class="proposals-banner">
          <div class="banner-icon">💡</div>
          <div class="banner-text">
            <h3>madang3 & madang6 시스템 연계 혁신 제안서</h3>
            <p>최근 깃허브 트렌딩 상위권을 휩쓸고 있는 <strong>표준 Skill Registry 규격, 결정론적 하이브리드 검증, 초경량 로컬 MoE 런너, 옴니채널 메시징 아키텍처</strong>를 우리 madang 포털과 백그라운드 멀티에이전트에 적용하기 위한 구체적인 기술 명세와 실전 로드맵입니다.</p>
          </div>
        </div>

        <div class="proposals-grid">
          ${proposals.map((p, idx) => this.renderProposalCard(p, idx + 1)).join('')}
        </div>
      </div>
    `;
  },

  renderProposalCard(p, num) {
    const actionItems = Array.isArray(p.actionItems) ? p.actionItems : [];
    const expectedEffectLines = (p.expectedEffect || '').split('\n').filter(Boolean);

    return `
      <div class="proposal-card">
        <div class="proposal-card-header">
          <div class="header-left">
            <span class="proposal-num">제안 #${num}</span>
            <span class="proposal-badge">${this.escapeHtml(p.badge)}</span>
            <span class="proposal-priority">${this.escapeHtml(p.priority)}</span>
          </div>
          <span class="proposal-status">${this.escapeHtml(p.status)}</span>
        </div>

        <h3 class="proposal-title">${this.escapeHtml(p.title)}</h3>

        <div class="proposal-meta-tags">
          <div class="meta-tag">
            <span class="lbl">적용 대상:</span>
            <span class="val target-val">${this.escapeHtml(p.target)}</span>
          </div>
          <div class="meta-tag">
            <span class="lbl">벤치마킹 소스:</span>
            <span class="val bench-val">🐙 ${this.escapeHtml(p.benchmarking)}</span>
          </div>
        </div>

        <div class="proposal-detail-section problem-box">
          <h4>⚠️ 현재 시스템의 한계 및 문제점</h4>
          <p>${this.escapeHtml(p.problem)}</p>
        </div>

        <div class="proposal-detail-section solution-box">
          <h4>🛠️ 오픈소스 트렌딩 기반 해결책</h4>
          <p>${this.escapeHtml(p.solution)}</p>
        </div>

        <div class="proposal-detail-section effect-box">
          <h4>📈 기대 효과 및 도입 이점</h4>
          <ul class="effect-list">
            ${expectedEffectLines.map(line => `<li>${this.escapeHtml(line)}</li>`).join('')}
          </ul>
        </div>

        <div class="proposal-detail-section roadmap-box">
          <h4>📋 실전 구현 액션 아이템 (실행 로드맵)</h4>
          <div class="action-steps">
            ${actionItems.map((item, i) => `
              <div class="action-step-item">
                <span class="step-badge">Step ${i+1}</span>
                <span class="step-desc">${this.escapeHtml(item)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {},

  bindDynamicEvents() {
    // 1. 서브 탭 클릭 이벤트
    document.querySelectorAll('.trending-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        if (tab && tab !== this.currentTab) {
          this.currentTab = tab;
          this.render();
        }
      });
    });

    // 2. 카테고리 필터 버튼 이벤트
    document.querySelectorAll('.trending-cat-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.getAttribute('data-category');
        if (cat) {
          this.activeCategory = cat;
          this.render();
        }
      });
    });

    // 3. 검색 입력 이벤트
    const searchInput = document.getElementById('input-trending-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        const container = document.querySelector('.trending-tab-content');
        if (container) {
          container.innerHTML = this.currentTab === 'ranking' ? this.renderRankingTab() : this.renderProposalsTab();
          this.bindDynamicEvents();
          const newIn = document.getElementById('input-trending-search');
          if (newIn) {
            newIn.focus();
            newIn.setSelectionRange(newIn.value.length, newIn.value.length);
          }
        }
      });
    }

    // 4. 검색어 초기화 버튼
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
