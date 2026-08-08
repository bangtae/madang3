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
    // 0. 사이드바 열기/닫기 (토글) 및 오버레이 이벤트
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('left-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar) {
          sidebar.classList.toggle('collapsed');
          sidebar.classList.toggle('mobile-open');
          if (sidebarOverlay) {
            sidebarOverlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
          }
        }
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        if (sidebar) {
          sidebar.classList.remove('mobile-open');
        }
        sidebarOverlay.classList.remove('active');
      });
    }

    // 1. 상단 메뉴 탭 전환 이벤트 ('메인', 'API')
    document.querySelectorAll('.nav-top-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.switchTopNav(view);
        this.closeMobileSidebar();
      });
    });

    // 2. 좌측 메뉴 탭 전환 이벤트 ('대시보드', 'API 정보')
    document.querySelectorAll('.nav-side-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sideView = e.currentTarget.getAttribute('data-side');
        this.switchSideNav(sideView);
        this.closeMobileSidebar();
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

    // 6. 데이터 동기화 및 카테고리별 다운로드 버튼 이벤트 (Upload / Sync / JSON / CSV)
    const btnForceUpload = document.getElementById('btn-force-upload');
    const btnSyncData = document.getElementById('btn-sync-data');
    const btnDownloadJson = document.getElementById('btn-download-json');
    const btnDownloadCsv = document.getElementById('btn-download-csv');

    if (btnForceUpload) {
      btnForceUpload.addEventListener('click', async () => {
        const localApis = window.ApiModel.getApisFromLocal();
        btnForceUpload.textContent = '⏳ 전송 중...';
        btnForceUpload.disabled = true;
        await window.ApiModel.syncToServer(localApis);
        btnForceUpload.textContent = '📤 98개 서버 업로드';
        btnForceUpload.disabled = false;
        window.UiView.showToast(`✅ 로컬 ${localApis.length}개 데이터가 서버(data/apis.json)로 백업 저장되었습니다!`);
      });
    }

    if (btnSyncData) {
      btnSyncData.addEventListener('click', async () => {
        btnSyncData.textContent = '⏳ 동기화 중...';
        btnSyncData.disabled = true;
        await window.ApiModel.initSync();
        btnSyncData.textContent = '🔄 데이터 동기화';
        btnSyncData.disabled = false;
        const count = window.ApiModel.getApis().length;
        window.UiView.showToast(`🔄 중앙 서버 동기화 완료! (총 ${count}개 API)`);
      });
    }

    if (btnDownloadJson) {
      btnDownloadJson.addEventListener('click', () => this.handleDownload('json'));
    }

    if (btnDownloadCsv) {
      btnDownloadCsv.addEventListener('click', () => this.handleDownload('csv'));
    }

    // 7. API 정보 수정 폼 제출 및 모달 닫기 이벤트
    const editForm = document.getElementById('edit-api-form');
    const btnCloseModal = document.getElementById('btn-close-edit-modal');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-input-id').value;
        const title = document.getElementById('edit-input-title').value;
        const serviceUrl = document.getElementById('edit-input-service-url').value;
        const docsUrl = document.getElementById('edit-input-docs-url').value;
        let category = document.getElementById('edit-input-category').value.trim() || '기타';

        window.ApiModel.updateApi(id, { title, serviceUrl, docsUrl, category });
        window.UiView.closeEditModal();
        window.UiView.showToast('✅ API 정보가 성공적으로 수정되었습니다!');
        this.refreshAllViews();
      });
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', () => window.UiView.closeEditModal());
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => window.UiView.closeEditModal());
  },

  /**
   * 카테고리별 API 정보 파일 다운로드
   * @param {'json' | 'csv'} type 
   */
  handleDownload(type) {
    const categoryVal = document.getElementById('category-filter')?.value || 'ALL';
    const apis = window.ApiModel.getApis();

    if (!window.DownloadHelper) {
      window.UiView.showToast('⚠️ 다운로드 모듈이 로드되지 않았습니다.');
      return;
    }

    let result;
    if (type === 'json') {
      result = window.DownloadHelper.downloadJson(apis, categoryVal);
    } else if (type === 'csv') {
      result = window.DownloadHelper.downloadCsv(apis, categoryVal);
    }

    if (result && result.success) {
      window.UiView.showToast(`📥 [${result.category}] API 정보 ${result.count}건 ${type.toUpperCase()} 다운로드 완료!`);
    } else if (result && result.message) {
      window.UiView.showToast(result.message);
    }
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

    window.UiView.renderApiCards(
      apis,
      (id) => {
        window.ApiModel.deleteApi(id);
        window.UiView.showToast('🗑️ API 정보가 삭제되었습니다.');
        this.refreshAllViews();
      },
      (targetApi) => {
        window.UiView.openEditModal(targetApi);
      }
    );
  },

  /**
   * 모바일 화면에서 사이드바 서랍 닫기
   */
  closeMobileSidebar() {
    const sidebar = document.getElementById('left-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }
};
