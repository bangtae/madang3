// app/views/madangProposalsView.js - madang3 & madang6 시스템 연계 개선 제안서 뷰 (관리자 전용)
window.MadangProposalsView = {
  searchTerm: '',
  activePriority: 'All',

  init() {
    this.render();
    this.bindEvents();
  },

  render() {
    const container = document.getElementById('view-madang-proposals');
    if (!container) return;

    const proposals = window.GithubTrendingModel ? window.GithubTrendingModel.proposals : [];
    const totalProps = proposals.length;
    const updatedAt = (window.GithubTrendingModel && window.GithubTrendingModel.data && window.GithubTrendingModel.data.updatedAt)
      ? new Date(window.GithubTrendingModel.data.updatedAt).toLocaleString('ko-KR')
      : '최신 동기화됨';

    const filteredProposals = this.getFilteredList();

    container.innerHTML = `
      <div class="proposals-view-container" style="max-width: 1400px; margin: 0 auto; padding-bottom: 40px;">
        <!-- 상단 헤더 카드 -->
        <div class="trending-header-card" style="margin-bottom: 24px;">
          <div class="trending-header-left">
            <div class="trending-title-row">
              <span class="trending-icon-badge">🚀</span>
              <h2>madang 시스템 개선 제안서</h2>
              <span class="trending-live-pill" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                🔒 관리자 전용 아키텍처 제안서
              </span>
            </div>
            <p class="trending-header-desc">
              최근 글로벌 GitHub 트렌딩 상위권을 휩쓸고 있는 <strong>표준 Skill Registry 규격, 결정론적 하이브리드 검증, 초경량 로컬 MoE 런너, 옴니채널 제어 아키텍처</strong>를 
              <strong>madang3 포털 및 madang6 멀티에이전트</strong>에 즉시 벤치마킹·도입하기 위한 구체적인 기술 명세와 실전 로드맵입니다.
            </p>
            <div class="trending-meta-row">
              <span class="meta-item">🕒 최근 갱신: <strong>${updatedAt}</strong></span>
              <span class="meta-item">🎯 연계 대상: <strong>madang3 웹 포털 / madang6 AI 서브에이전트 군단</strong></span>
            </div>
          </div>
          <div class="trending-header-stats">
            <div class="stat-pill-box highlight" style="min-width: 130px;">
              <span class="stat-val">${totalProps}</span>
              <span class="stat-lbl">시스템 개선 제안</span>
            </div>
            <div class="stat-pill-box" style="min-width: 130px;">
              <span class="stat-val">4대</span>
              <span class="stat-lbl">핵심 로드맵 축</span>
            </div>
          </div>
        </div>

        <!-- 툴바 (검색 및 필터) -->
        <div class="trending-toolbar" style="margin-bottom: 20px;">
          <div class="category-pills-scroll">
            <button class="trending-cat-pill ${this.activePriority === 'All' ? 'active' : ''}" data-priority="All">
              🌟 전체 제안 (${totalProps})
            </button>
            <button class="trending-cat-pill ${this.activePriority === '최우선' ? 'active' : ''}" data-priority="최우선">
              🔥 최우선 (즉시 도입)
            </button>
            <button class="trending-cat-pill ${this.activePriority === '우선' ? 'active' : ''}" data-priority="우선">
              ⚡ 우선
            </button>
            <button class="trending-cat-pill ${this.activePriority === '상' ? 'active' : ''}" data-priority="상">
              📈 상 (확장)
            </button>
          </div>
          <div class="trending-search-input-box" style="flex: 1; max-width: 450px;">
            <span class="search-icon">🔍</span>
            <input type="text" id="input-proposal-search" placeholder="제안명, 대상, 벤치마킹 소스, 해결책 검색..." value="${this.escapeHtml(this.searchTerm)}" />
            ${this.searchTerm ? `<button type="button" id="btn-clear-proposal-search" class="btn-clear-txt">&times;</button>` : ''}
          </div>
        </div>

        <!-- 제안서 목록 그리드 -->
        <div class="proposals-tab-wrapper">
          ${filteredProposals.length === 0 ? `
            <div class="empty-trending-box">
              <div class="empty-icon">📂</div>
              <h3>일치하는 개선 제안이 없습니다.</h3>
              <p>검색어를 변경하거나 필터를 '전체'로 재설정해 보세요.</p>
            </div>
          ` : `
            <div class="proposals-grid">
              ${filteredProposals.map((p, idx) => this.renderProposalCard(p, idx + 1)).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.bindDynamicEvents();
  },

  getFilteredList() {
    let list = window.GithubTrendingModel ? window.GithubTrendingModel.proposals : [];
    if (!list) list = [];

    // 우선순위 필터
    if (this.activePriority && this.activePriority !== 'All') {
      list = list.filter(p => p.priority && p.priority.includes(this.activePriority));
    }

    // 검색어 필터
    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.target && p.target.toLowerCase().includes(q)) ||
        (p.benchmarking && p.benchmarking.toLowerCase().includes(q)) ||
        (p.problem && p.problem.toLowerCase().includes(q)) ||
        (p.solution && p.solution.toLowerCase().includes(q)) ||
        (p.expectedEffect && p.expectedEffect.toLowerCase().includes(q)) ||
        (Array.isArray(p.actionItems) && p.actionItems.some(item => item.toLowerCase().includes(q)))
      );
    }

    return list;
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
            <span class="val target-val" style="color: #67e8f9; font-weight: 600;">${this.escapeHtml(p.target)}</span>
          </div>
          <div class="meta-tag">
            <span class="lbl">벤치마킹 소스:</span>
            <span class="val bench-val" style="color: #cbd5e1;">🐙 ${this.escapeHtml(p.benchmarking)}</span>
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
    // 1. 우선순위 필터 버튼 이벤트
    document.querySelectorAll('#view-madang-proposals .trending-cat-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const priority = e.currentTarget.getAttribute('data-priority');
        if (priority) {
          this.activePriority = priority;
          this.render();
        }
      });
    });

    // 2. 검색 입력 이벤트
    const searchInput = document.getElementById('input-proposal-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.render();
        const newIn = document.getElementById('input-proposal-search');
        if (newIn) {
          newIn.focus();
          newIn.setSelectionRange(newIn.value.length, newIn.value.length);
        }
      });
    }

    // 3. 검색 초기화 버튼
    const btnClear = document.getElementById('btn-clear-proposal-search');
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
