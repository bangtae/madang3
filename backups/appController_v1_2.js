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
          const isMobile = window.innerWidth <= 768;
          if (isMobile) {
            sidebar.classList.toggle('mobile-open');
            if (sidebarOverlay) {
              sidebarOverlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
            }
          } else {
            sidebar.classList.toggle('collapsed');
            sidebar.classList.remove('mobile-open');
            if (sidebarOverlay) {
              sidebarOverlay.classList.remove('active');
            }
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

    // 6. 카테고리별 다운로드 버튼 이벤트 (JSON / CSV)
    const btnDownloadJson = document.getElementById('btn-download-json');
    const btnDownloadCsv = document.getElementById('btn-download-csv');

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

    // 8. IP 화이트리스트 신규 등록 폼 제출 및 저장 이벤트
    const ipForm = document.getElementById('ip-form');
    if (ipForm) {
      ipForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ipInput = document.getElementById('input-ip-address');
        const newIp = ipInput?.value || '';

        if (!window.IpModel) return;
        const res = window.IpModel.addIp(newIp);
        if (res.message) {
          window.UiView.showToast(res.message);
        }
        if (res.success) {
          ipForm.reset();
          this.loadAndRenderIpWhitelist();
        }
      });
    }

    const btnSaveIps = document.getElementById('btn-save-ips');
    if (btnSaveIps) {
      btnSaveIps.addEventListener('click', async () => {
        if (!window.IpModel) return;
        btnSaveIps.textContent = '⏳ 저장 중...';
        btnSaveIps.disabled = true;
        await window.IpModel.saveAllowedIps(window.IpModel.getIps());
        btnSaveIps.textContent = '💾 서버에 저장';
        btnSaveIps.disabled = false;
        window.UiView.showToast('✅ IP 화이트리스트가 서버(allowed_ips.json)에 성공적으로 저장되었습니다!');
      });
    }

    // 9. IP 블랙리스트 폼 제출 및 저장 이벤트
    const ipBlockedForm = document.getElementById('ip-blocked-form');
    if (ipBlockedForm) {
      ipBlockedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ipInput = document.getElementById('input-blocked-ip-address');
        const newIp = ipInput?.value || '';

        if (!window.IpModel) return;
        const res = window.IpModel.addBlockedIp(newIp);
        if (res.message) {
          window.UiView.showToast(res.message);
        }
        if (res.success) {
          ipBlockedForm.reset();
          this.loadAndRenderIpBlacklist();
        }
      });
    }

    const btnSaveBlockedIps = document.getElementById('btn-save-blocked-ips');
    if (btnSaveBlockedIps) {
      btnSaveBlockedIps.addEventListener('click', async () => {
        if (!window.IpModel) return;
        btnSaveBlockedIps.textContent = '⏳ 저장 중...';
        btnSaveBlockedIps.disabled = true;
        await window.IpModel.saveBlockedIps(window.IpModel.getBlockedIps());
        btnSaveBlockedIps.textContent = '💾 서버에 저장';
        btnSaveBlockedIps.disabled = false;
        window.UiView.showToast('⛔ IP 블랙리스트가 서버(blocked_ips.json)에 성공적으로 저장되었습니다!');
      });
    }

    // 10. 외부 유입 IP 접속 로그 버튼 이벤트 (새로고침 / 전체삭제)
    const btnRefreshLogs = document.getElementById('btn-refresh-logs');
    if (btnRefreshLogs) {
      btnRefreshLogs.addEventListener('click', () => {
        this.loadAndRenderAccessLogs();
        window.UiView.showToast('🔄 접속 로그를 새로고침했습니다.');
      });
    }

    const btnClearLogs = document.getElementById('btn-clear-logs');
    if (btnClearLogs) {
      btnClearLogs.addEventListener('click', async () => {
        if (confirm('정말로 모든 접속 기록을 삭제하시겠습니까?')) {
          await window.IpModel.clearAccessLogs();
          this.loadAndRenderAccessLogs();
          window.UiView.showToast('🗑️ 접속 로그 기록이 전체 삭제되었습니다.');
        }
      });
    }
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
    const sideAdmin = document.getElementById('side-menu-admin');

    if (view === 'main') {
      if (sideMain) sideMain.classList.remove('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('dashboard');
    } else if (view === 'api') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.remove('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('api-info');
    } else if (view === 'admin') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.remove('hidden');
      this.switchSideNav('ip-whitelist');
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
    const viewIpWhitelist = document.getElementById('view-ip-whitelist');
    const viewIpBlacklist = document.getElementById('view-ip-blacklist');
    const viewIpLogs = document.getElementById('view-ip-logs');

    if (sideView === 'dashboard') {
      if (viewDashboard) viewDashboard.classList.remove('hidden');
      if (viewApiInfo) viewApiInfo.classList.add('hidden');
      if (viewIpWhitelist) viewIpWhitelist.classList.add('hidden');
      if (viewIpBlacklist) viewIpBlacklist.classList.add('hidden');
      if (viewIpLogs) viewIpLogs.classList.add('hidden');
      this.refreshAllViews();
    } else if (sideView === 'api-info') {
      if (viewDashboard) viewDashboard.classList.add('hidden');
      if (viewApiInfo) viewApiInfo.classList.remove('hidden');
      if (viewIpWhitelist) viewIpWhitelist.classList.add('hidden');
      if (viewIpBlacklist) viewIpBlacklist.classList.add('hidden');
      if (viewIpLogs) viewIpLogs.classList.add('hidden');
      this.applySearchAndFilter();
    } else if (sideView === 'ip-whitelist') {
      if (viewDashboard) viewDashboard.classList.add('hidden');
      if (viewApiInfo) viewApiInfo.classList.add('hidden');
      if (viewIpWhitelist) viewIpWhitelist.classList.remove('hidden');
      if (viewIpBlacklist) viewIpBlacklist.classList.add('hidden');
      if (viewIpLogs) viewIpLogs.classList.add('hidden');
      this.loadAndRenderIpWhitelist();
    } else if (sideView === 'ip-blacklist') {
      if (viewDashboard) viewDashboard.classList.add('hidden');
      if (viewApiInfo) viewApiInfo.classList.add('hidden');
      if (viewIpWhitelist) viewIpWhitelist.classList.add('hidden');
      if (viewIpBlacklist) viewIpBlacklist.classList.remove('hidden');
      if (viewIpLogs) viewIpLogs.classList.add('hidden');
      this.loadAndRenderIpBlacklist();
    } else if (sideView === 'ip-logs') {
      if (viewDashboard) viewDashboard.classList.add('hidden');
      if (viewApiInfo) viewApiInfo.classList.add('hidden');
      if (viewIpWhitelist) viewIpWhitelist.classList.add('hidden');
      if (viewIpBlacklist) viewIpBlacklist.classList.add('hidden');
      if (viewIpLogs) viewIpLogs.classList.remove('hidden');
      this.loadAndRenderAccessLogs();
    }
  },

  /**
   * IP 화이트리스트 목록 조회 및 UI 렌더링
   */
  async loadAndRenderIpWhitelist() {
    if (!window.IpModel) return;
    const ips = await window.IpModel.fetchAllowedIps();
    window.UiView.renderIpWhitelist(ips, (targetIp) => {
      window.IpModel.deleteIp(targetIp);
      window.UiView.showToast(`🗑️ [${targetIp}] IP가 화이트리스트에서 삭제되었습니다.`);
      this.loadAndRenderIpWhitelist();
    });
  },

  /**
   * IP 블랙리스트 목록 조회 및 UI 렌더링
   */
  async loadAndRenderIpBlacklist() {
    if (!window.IpModel) return;
    const ips = await window.IpModel.fetchBlockedIps();
    window.UiView.renderIpBlacklist(ips, (targetIp) => {
      window.IpModel.deleteBlockedIp(targetIp);
      window.UiView.showToast(`🔓 [${targetIp}] IP 차단이 해제되었습니다.`);
      this.loadAndRenderIpBlacklist();
    });
  },

  /**
   * 외부 유입 IP 접속 로그 목록 조회 및 UI 렌더링
   */
  async loadAndRenderAccessLogs() {
    if (!window.IpModel) return;
    const logs = await window.IpModel.fetchAccessLogs();
    window.UiView.renderAccessLogs(
      logs,
      (targetIp) => {
        // 허용 버튼 클릭 -> 화이트리스트 추가
        const res = window.IpModel.addIp(targetIp);
        if (res.message) window.UiView.showToast(res.message);
        this.loadAndRenderAccessLogs();
      },
      (targetIp) => {
        // 차단 버튼 클릭 -> 블랙리스트 추가
        const res = window.IpModel.addBlockedIp(targetIp);
        if (res.message) window.UiView.showToast(res.message);
        this.loadAndRenderAccessLogs();
      }
    );
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
