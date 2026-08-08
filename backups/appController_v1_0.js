// app/controllers/appController.js - 애플리케이션 통합 컨트롤러

window.AppController = {
  currentTopView: 'main',
  currentSideView: 'dashboard',

  init() {
    this.bindEvents();
    this.refreshAllViews();
  },

  refreshAllViews() {
    const apis = window.ApiModel.getApis();
    window.UiView.renderDashboard(apis);
    window.UiView.updateCategoryFilter(apis);
    this.applySearchAndFilter();
  },

  bindEvents() {
    // 1. 상단 메뉴 탭 전환 이벤트 ('메인', 'API')
    document.querySelectorAll('.nav-top-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.switchTopNav(view);
      });
    });

    // 2. 좌측 메뉴 탭 전환 이벤트 ('대시보드', 'API 정보')
    document.querySelectorAll('.nav-side-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sideView = e.currentTarget.getAttribute('data-side');
        this.switchSideNav(sideView);
      });
    });

    // 3. AI 자동 카테고리 추천 버튼
    const btnAutoCategory = document.getElementById('btn-auto-category');
    if (btnAutoCategory) {
      btnAutoCategory.addEventListener('click', async () => {
        const serviceUrl = document.getElementById('input-service-url')?.value || '';
        const docsUrl = document.getElementById('input-docs-url')?.value || '';

        if (!serviceUrl && !docsUrl) {
          window.UiView.showToast('⚠️ 서비스 URL이나 사용법 URL을 입력해 주세요.');
          return;
        }

        btnAutoCategory.textContent = '⏳ 분석 중...';
        btnAutoCategory.disabled = true;

        const category = await window.LlmHelper.recommendCategory(serviceUrl, docsUrl);
        const catInput = document.getElementById('input-category');
        if (catInput) catInput.value = category;

        window.UiView.showToast(`✨ AI가 추천한 카테고리: [${category}]`);
        btnAutoCategory.textContent = '✨ AI 추천';
        btnAutoCategory.disabled = false;
      });
    }

    // 4. API 신규 등록 폼 제출
    const form = document.getElementById('api-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('input-title').value;
        const serviceUrl = document.getElementById('input-service-url').value;
        const docsUrl = document.getElementById('input-docs-url').value;
        let category = document.getElementById('input-category').value.trim();

        if (!category) {
          category = '기타';
        }

        window.ApiModel.addApi({ title, serviceUrl, docsUrl, category });
        window.UiView.showToast('✅ API 정보가 성공적으로 등록되었습니다!');
        form.reset();
        this.refreshAllViews();
      });
    }

    // 5. 검색 및 카테고리 필터 이벤트
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    if (searchInput) searchInput.addEventListener('input', () => this.applySearchAndFilter());
    if (categoryFilter) categoryFilter.addEventListener('change', () => this.applySearchAndFilter());
  },

  /**
   * 상단 메뉴 전환 로직
   */
  switchTopNav(view) {
    this.currentTopView = view;

    // 헤더 버튼 상태 업데이트
    document.querySelectorAll('.nav-top-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });

    const sideMain = document.getElementById('side-menu-main');
    const sideApi = document.getElementById('side-menu-api');

    if (view === 'main') {
      if (sideMain) sideMain.classList.remove('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      this.switchSideNav('dashboard');
    } else if (view === 'api') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.remove('hidden');
      this.switchSideNav('api-info');
    }
  },

  /**
   * 좌측 메뉴 전환 로직
   */
  switchSideNav(sideView) {
    this.currentSideView = sideView;

    // 사이드바 버튼 활성화 상태
    document.querySelectorAll('.nav-side-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-side') === sideView);
    });

    // 본문 섹션 표시/숨김
    const viewDashboard = document.getElementById('view-dashboard');
    const viewApiInfo = document.getElementById('view-api-info');

    if (sideView === 'dashboard') {
      if (viewDashboard) viewDashboard.classList.remove('hidden');
      if (viewApiInfo) viewApiInfo.classList.add('hidden');
    } else if (sideView === 'api-info') {
      if (viewDashboard) viewDashboard.classList.add('hidden');
      if (viewApiInfo) viewApiInfo.classList.remove('hidden');
    }
  },

  /**
   * 검색어 및 카테고리 필터링 적용
   */
  applySearchAndFilter() {
    const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase();
    const catVal = document.getElementById('category-filter')?.value || 'ALL';

    let apis = window.ApiModel.getApis();

    if (catVal !== 'ALL') {
      apis = apis.filter(item => item.category === catVal);
    }

    if (searchVal) {
      apis = apis.filter(item => item.title.toLowerCase().includes(searchVal) || item.serviceUrl.toLowerCase().includes(searchVal));
    }

    window.UiView.renderApiCards(apis, (id) => {
      window.ApiModel.deleteApi(id);
      window.UiView.showToast('🗑️ API 정보가 삭제되었습니다.');
      this.refreshAllViews();
    });
  }
};
