// app/controllers/appController.js - 애플리케이션 통합 컨트롤러

window.AppController = {
  currentTopView: 'main',
  currentSideView: 'dashboard',
  parsedBatchRows: [],

  async init() {
    this.detectUserClientIp();
    await this.loadMenuConfig();
    this.checkAuthGuard();
    this.bindEvents();
    if (window.StockTempModel) {
      await window.StockTempModel.loadStockTempData();
    }
    if (window.StockTempView) {
      window.StockTempView.init();
    }
    if (window.ThreadsAgentModel) {
      await window.ThreadsAgentModel.loadTokenConfig();
    }
    if (window.ThreadsAgentView) {
      window.ThreadsAgentView.init();
    }
    if (window.SapSuiteModel) {
      await window.SapSuiteModel.init();
    }
    if (window.SapSuiteView) {
      window.SapSuiteView.init();
    }
    this.refreshAllViews();

    this.refreshThreadsAgentStatus();
    
    // 5초마다 에이전트 상태 자동 폴링
    setInterval(() => {
      this.refreshThreadsAgentStatus();
    }, 5000);

    // URL Hash 자동 라우팅 지원 (#life -> 생활 탭 바로 열기)
    if (window.location.hash) {
      const hashNav = window.location.hash.replace('#', '').trim().toLowerCase();
      if (['main', 'api', 'ai', 'work', 'invest', 'life', 'admin'].includes(hashNav)) {
        setTimeout(() => this.switchTopNav(hashNav), 50);
      }
    }
  },

  async detectUserClientIp() {
    try {
      const res = await fetch('/api/my-ip');
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          window.userClientIp = data.ip;
          return data.ip;
        }
      }
    } catch (e) {
      console.warn('[AppController] Failed to auto-detect client IP:', e);
    }
    return window.userClientIp || '127.0.0.1';
  },

  checkAuthGuard() {
    const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
    let user = { isGuest: true, username: '게스트', role: '선택 접속' };
    if (rawUser) {
      try { user = JSON.parse(rawUser); } catch(e) {}
    }

    const badge = document.getElementById('user-display-badge');
    const btnSwitchAdmin = document.getElementById('btn-switch-admin');
    const btnLogout = document.getElementById('btn-logout');

    if (user.isGuest) {
      document.body.classList.add('is-guest-mode');
      if (badge) badge.textContent = `⚡ 게스트 (선택 접속 / 읽기 전용)`;
      if (btnSwitchAdmin) btnSwitchAdmin.classList.remove('hidden');
      if (btnLogout) btnLogout.classList.add('hidden');
    } else {
      document.body.classList.remove('is-guest-mode');
      if (badge) badge.textContent = `⚡ ${user.username} (${user.role || '최고 관리자'})`;
      if (btnSwitchAdmin) btnSwitchAdmin.classList.add('hidden');
      if (btnLogout) btnLogout.classList.remove('hidden');
    }
    this.applyMenuPermissions();
  },

  scrollToBoardList(targetId) {
    setTimeout(() => {
      const el = document.getElementById(targetId) || document.querySelector('.api-list-header');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  },

  refreshAllViews() {
    const apis = window.ApiModel.getApis();
    const aiModels = window.AiModel ? window.AiModel.getAiModels() : [];
    const aiTerms = window.AiTermModel ? window.AiTermModel.getTerms() : [];
    const sapTerms = window.SapTermModel ? window.SapTermModel.getTerms() : [];
    window.UiView.renderDashboard(apis, aiModels, aiTerms, sapTerms);
    window.UiView.updateCategoryFilter(apis);
    this.applySearchAndFilter();
    this.loadAndRenderAiModels();
    this.loadAndRenderAiTerms();
    this.loadAndRenderSapTerms();
    if (window.StockTempView && typeof window.StockTempView.renderView === 'function') {
      window.StockTempView.renderView();
    }
  },

  failedPassCount: 0,

  bindEvents() {
    // 관리자 전환 모달 및 권한 변경 이벤트
    const btnSwitchAdmin = document.getElementById('btn-switch-admin');
    const adminModal = document.getElementById('admin-auth-modal');
    const btnAdminClose = document.getElementById('btn-admin-auth-close');
    const adminForm = document.getElementById('admin-auth-form');
    const adminErr = document.getElementById('admin-auth-error');

    const checkIpBlockedGuard = () => {
      const currentIp = window.userClientIp || '127.0.0.1';
      if (!window.IpModel) return false;
      const blockedList = window.IpModel.getBlockedIps();
      return blockedList.includes(currentIp);
    };

    const grantAdminRole = () => {
      const currentIp = window.userClientIp || '127.0.0.1';
      if (checkIpBlockedGuard()) {
        if (adminErr) {
          adminErr.innerHTML = `⛔ <strong>접속 차단됨!</strong> 현재 IP(<code>${currentIp}</code>)는 <strong>IP 블랙리스트</strong>에 등록되어 있어 관리자로 전환할 수 없습니다.`;
          adminErr.style.display = 'block';
        }
        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast(`⛔ [차단] 현재 IP(${currentIp})는 블랙리스트에 등록되어 관리자 전환이 불가능합니다.`, 'danger');
        }
        return false;
      }

      this.failedPassCount = 0;
      const adminUser = {
        username: 'admin',
        role: '최고 관리자',
        isGuest: false,
        loginAt: new Date().toISOString()
      };
      sessionStorage.setItem('portal_auth_user', JSON.stringify(adminUser));
      localStorage.setItem('portal_auth_user', JSON.stringify(adminUser));
      this.checkAuthGuard();
      if (adminModal) adminModal.classList.add('hidden');
      if (window.UiView && window.UiView.showToast) {
        window.UiView.showToast('🎉 관리자 권한으로 성공적으로 전환되었습니다!');
      }
      return true;
    };

    if (btnSwitchAdmin) {
      btnSwitchAdmin.addEventListener('click', () => {
        if (adminErr) adminErr.style.display = 'none';
        const currentIp = window.userClientIp || '127.0.0.1';
        if (checkIpBlockedGuard()) {
          if (adminErr) {
            adminErr.innerHTML = `⛔ <strong>접속 차단됨!</strong> 현재 IP(<code>${currentIp}</code>)는 <strong>IP 블랙리스트</strong>에 등록되어 있어 관리자 전환이 불가능합니다.`;
            adminErr.style.display = 'block';
          }
        }
        if (adminModal) adminModal.classList.remove('hidden');
        const passInput = document.getElementById('input-admin-pass');
        if (passInput) passInput.value = '';
      });
    }

    if (btnAdminClose) {
      btnAdminClose.addEventListener('click', () => {
        if (adminModal) adminModal.classList.add('hidden');
      });
    }

    if (adminForm) {
      adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = document.getElementById('input-admin-pass').value.trim();

        // 패스워드 검증: qkdxo0369!
        if (p === 'qkdxo0369!') {
          grantAdminRole();
        } else {
          this.failedPassCount = (this.failedPassCount || 0) + 1;

          if (this.failedPassCount >= 5) {
            // 5회 실패 시 접속한 실제 클라이언트 IP를 블랙리스트에 자동 추가하여 차단 조치
            const applyBlock = (targetIp) => {
              if (window.IpModel && window.IpModel.addBlockedIp) {
                window.IpModel.addBlockedIp(targetIp);
              }

              if (adminErr) {
                adminErr.innerHTML = `⛔ <strong>접속 차단 조치!</strong> 비밀번호 5회 연속 오류로 현재 IP(<code>${targetIp}</code>)가 <strong>IP 블랙리스트 관리 메뉴</strong>에 등록되어 차단되었습니다.`;
                adminErr.style.display = 'block';
              }

              if (window.UiView && window.UiView.showToast) {
                window.UiView.showToast(`⛔ [차단] 비밀번호 5회 오류로 IP(${targetIp})가 블랙리스트에 추가되었습니다.`, 'danger');
              }

              // 뷰 갱신 (블랙리스트 관리 화면에 최신 반영)
              if (this.loadAndRenderIpRules) this.loadAndRenderIpRules();
            };

            if (window.userClientIp) {
              applyBlock(window.userClientIp);
            } else {
              this.detectUserClientIp().then((ip) => applyBlock(ip || '127.0.0.1'));
            }
          } else {
            const remaining = 5 - this.failedPassCount;
            if (adminErr) {
              adminErr.textContent = `⚠️ 비밀번호가 일치하지 않습니다. (오류 횟수: ${this.failedPassCount}/5회 - ${remaining}회 남음)`;
              adminErr.style.display = 'block';
            }
          }
        }
      });
    }

    // 게스트 모드로 전환 버튼
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('게스트(읽기 전용) 모드로 전환하시겠습니까?')) {
          const guestUser = {
            username: '게스트',
            role: '선택 접속',
            isGuest: true,
            loginAt: new Date().toISOString()
          };
          sessionStorage.setItem('portal_auth_user', JSON.stringify(guestUser));
          localStorage.setItem('portal_auth_user', JSON.stringify(guestUser));
          this.checkAuthGuard();
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast('👁️ 게스트 모드로 전환되었습니다.');
          }
        }
      });
    }

    // 메인 대시보드 통계 카드 클릭 -> 해당 메뉴 게스트/읽기전용 게시판 목록 화면 이동 숏컷
    const cardStatApis = document.getElementById('card-stat-apis');
    if (cardStatApis) {
      cardStatApis.addEventListener('click', () => {
        this.switchTopNav('api');
        this.switchSideNav('api-info');
        this.scrollToBoardList('search-input');
      });
    }

    const cardStatAiServices = document.getElementById('card-stat-ai-services');
    if (cardStatAiServices) {
      cardStatAiServices.addEventListener('click', () => {
        this.switchTopNav('ai');
        this.switchSideNav('ai-models');
        this.scrollToBoardList('search-ai-input');
      });
    }

    const cardStatAiTerms = document.getElementById('card-stat-ai-terms');
    if (cardStatAiTerms) {
      cardStatAiTerms.addEventListener('click', () => {
        this.switchTopNav('ai');
        this.switchSideNav('ai-terms');
        this.scrollToBoardList('search-ai-terms-input');
      });
    }

    const cardStatSapTerms = document.getElementById('card-stat-sap-terms');
    if (cardStatSapTerms) {
      cardStatSapTerms.addEventListener('click', () => {
        this.switchTopNav('work');
        this.switchSideNav('sap-terms');
        this.scrollToBoardList('search-sap-terms-input');
      });
    }

    const cardStatSapSuite = document.getElementById('card-stat-sap-suite');
    if (cardStatSapSuite) {
      cardStatSapSuite.addEventListener('click', () => {
        this.switchTopNav('work');
        this.switchSideNav('sap-suite');
      });
    }


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

    // 3. 메뉴 권한 설정 저장 / 초기화 버튼 이벤트
    const btnSaveMenuConfig = document.getElementById('btn-save-menu-config');
    if (btnSaveMenuConfig) {
      btnSaveMenuConfig.addEventListener('click', () => {
        const updated = (this.menuConfig || []).map(item => {
          const guestChk = document.querySelector(`.chk-guest-toggle[data-id="${item.id}"]`);
          const adminChk = document.querySelector(`.chk-admin-toggle[data-id="${item.id}"]`);
          return {
            ...item,
            guest: guestChk ? guestChk.checked : item.guest,
            admin: adminChk ? adminChk.checked : item.admin
          };
        });
        this.saveMenuConfig(updated);
      });
    }

    const btnResetMenuConfig = document.getElementById('btn-reset-menu-config');
    if (btnResetMenuConfig) {
      btnResetMenuConfig.addEventListener('click', () => {
        if (confirm('메뉴 권한 설정을 초기 기본값으로 복원하시겠습니까?')) {
          const defaultConfig = [
            { id: "api-info", name: "API 정보", icon: "📚", category: "main", statCardId: "card-stat-apis", guest: true, admin: true, description: "API 정보 목록 및 세부 개발 명세 조회" },
            { id: "ai-models", name: "AI 서비스 정보", icon: "🤖", category: "ai", statCardId: "card-stat-ai-services", guest: true, admin: true, description: "최신 AI 모델 및 서비스 정보 목록 조회" },
            { id: "ai-terms", name: "AI 용어 & 마인드맵", icon: "🧠", category: "ai", statCardId: "card-stat-ai-terms", guest: true, admin: true, description: "AI 관련 기술 개념 및 마인드맵 학습" },
            { id: "sap-terms", name: "SAP 용어 & 마인드맵", icon: "🏢", category: "work", statCardId: "card-stat-sap-terms", guest: true, admin: true, description: "SAP ERP 코어 모듈 및 기술 용어 마인드맵" },
            { id: "sap-suite", name: "SAP Integration Suite", icon: "⚡", category: "work", statCardId: "card-stat-sap-suite", guest: true, admin: true, description: "SAP Cloud Integration 최신 소식 및 Groovy/iFlow 컨설팅·개발 도우미" },
            { id: "agent-builder", name: "AI 에이전트 Builder", icon: "🧩", category: "ai", guest: true, admin: true, description: "자원 조합 및 시스템 워크플로우 설계도 생성" },

            { id: "ip-whitelist", name: "IP 화이트리스트", icon: "🛡️", category: "admin", guest: false, admin: true, description: "접속 허용 IP 주소 관리" },
            { id: "ip-blacklist", name: "IP 블랙리스트", icon: "⛔", category: "admin", guest: false, admin: true, description: "접속 차단 IP 주소 관리" },
            { id: "ip-logs", name: "외부 유입 IP 로그", icon: "🌐", category: "admin", guest: false, admin: true, description: "서버 외부 접속 차단/허용 로그 기록" },
            { id: "batch-register", name: "API정보 일괄등록", icon: "📥", category: "admin", guest: false, admin: true, description: "엑셀 파일 업로드를 통한 API bulk 등록" },
            { id: "menu-config", name: "메뉴 권한 설정", icon: "⚙️", category: "admin", guest: false, admin: true, description: "게스트 및 관리자 모드 메뉴 노출 설정" }
          ];
          this.saveMenuConfig(defaultConfig);
          this.renderMenuConfigTable();
        }
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

    // 6. 데이터 다운로드 버튼 이벤트 (JSON / CSV)
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

    // 7-2. 카테고리 일괄 변경 모달 열기/닫기 및 폼 제출 이벤트
    const btnOpenCategoryBatch = document.getElementById('btn-open-category-batch-modal');
    const categoryBatchForm = document.getElementById('category-batch-form');
    const btnCloseCategoryBatch = document.getElementById('btn-close-category-batch-modal');
    const btnCancelCategoryBatch = document.getElementById('btn-cancel-category-batch');

    if (btnOpenCategoryBatch) {
      btnOpenCategoryBatch.addEventListener('click', () => {
        const apis = window.ApiModel.getApis();
        window.UiView.openCategoryBatchModal(apis);
      });
    }

    if (categoryBatchForm) {
      categoryBatchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldCategory = document.getElementById('batch-old-category')?.value;
        const newCategory = document.getElementById('batch-new-category')?.value.trim();

        if (!oldCategory) {
          window.UiView.showToast('⚠️ 변경할 기존 카테고리를 선택하세요.');
          return;
        }
        if (!newCategory) {
          window.UiView.showToast('⚠️ 새로운 카테고리 이름을 입력하세요.');
          return;
        }

        const updatedCount = window.ApiModel.batchUpdateCategory(oldCategory, newCategory);
        window.UiView.closeCategoryBatchModal();
        if (updatedCount > 0) {
          window.UiView.showToast(`✅ [${oldCategory}] 카테고리의 API ${updatedCount}건이 '${newCategory}'(으)로 일괄 변경되었습니다!`);
        } else {
          window.UiView.showToast('⚠️ 해당 카테고리에 속한 API가 없습니다.');
        }
        this.refreshAllViews();
      });
    }

    if (btnCloseCategoryBatch) btnCloseCategoryBatch.addEventListener('click', () => window.UiView.closeCategoryBatchModal());
    if (btnCancelCategoryBatch) btnCancelCategoryBatch.addEventListener('click', () => window.UiView.closeCategoryBatchModal());

    // 8. IP 화이트리스트 신규 등록 폼 제출 이벤트
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

    // 9. IP 블랙리스트 폼 제출 이벤트
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

    const btnTestTelegramAlert = document.getElementById('btn-test-telegram-alert');
    if (btnTestTelegramAlert) {
      btnTestTelegramAlert.addEventListener('click', async () => {
        try {
          const fakeIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
          const res = await fetch('/api/telegram/test-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: fakeIp })
          });
          const data = await res.json();
          window.UiView.showToast(data.message || '📲 텔레그램 알림을 발송했습니다.');
        } catch (e) {
          window.UiView.showToast('⚠️ 텔레그램 알림 발송 중 오류가 발생했습니다.');
        }
      });
    }

    // 11. API 일괄등록 엑셀 파일 이벤트
    const btnDownloadSampleExcel = document.getElementById('btn-download-sample-excel');
    if (btnDownloadSampleExcel) {
      btnDownloadSampleExcel.addEventListener('click', () => {
        if (window.ExcelHelper) {
          window.ExcelHelper.downloadSampleTemplate();
        }
      });
    }

    const btnSelectExcel = document.getElementById('btn-select-excel-file');
    const excelFileInput = document.getElementById('excel-file-input');
    const dropzone = document.getElementById('excel-dropzone');
    const btnRemoveExcel = document.getElementById('btn-remove-excel-file');
    const btnClearBatchExcel = document.getElementById('btn-clear-batch-excel');
    const btnProcessBatchExcel = document.getElementById('btn-process-batch-excel');

    if (btnSelectExcel && excelFileInput) {
      btnSelectExcel.addEventListener('click', (e) => {
        e.stopPropagation();
        excelFileInput.click();
      });
    }

    if (dropzone) {
      dropzone.addEventListener('click', () => {
        if (excelFileInput && document.getElementById('excel-selected-file-info')?.classList.contains('hidden')) {
          excelFileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
          this.handleExcelFile(files[0]);
        }
      });
    }

    if (excelFileInput) {
      excelFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleExcelFile(e.target.files[0]);
        }
      });
    }

    if (btnRemoveExcel) {
      btnRemoveExcel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearExcelBatchState();
      });
    }

    if (btnClearBatchExcel) {
      btnClearBatchExcel.addEventListener('click', () => {
        this.clearExcelBatchState();
      });
    }

    if (btnProcessBatchExcel) {
      btnProcessBatchExcel.addEventListener('click', () => {
        this.processBatchExcel();
      });
    }

    // 12. AI 모델 URL 자동 분석 & 등록 폼 및 버튼 이벤트
    const btnAnalyzeAiUrl = document.getElementById('btn-analyze-ai-url');
    if (btnAnalyzeAiUrl) {
      btnAnalyzeAiUrl.addEventListener('click', async () => {
        const urlInput = document.getElementById('input-ai-url');
        const url = urlInput?.value.trim();
        if (!url) {
          window.UiView.showToast('⚠️ 분석할 AI 모델 URL을 입력하세요.');
          return;
        }

        btnAnalyzeAiUrl.disabled = true;
        const origText = btnAnalyzeAiUrl.innerText;
        btnAnalyzeAiUrl.innerText = '⏳ 자동 분석 중...';

        // 실시간 프로그레스 패널 및 타이머 컨트롤
        const progressPanel = document.getElementById('ai-url-analysis-progress');
        const statusTextEl = document.getElementById('ai-progress-status');
        const timerEl = document.getElementById('ai-progress-timer');
        const fillEl = document.getElementById('ai-progress-fill');

        if (progressPanel) progressPanel.classList.remove('hidden');

        const startTime = performance.now();
        const timerInterval = setInterval(() => {
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
          if (timerEl) timerEl.textContent = `⏱️ ${elapsed}s`;
        }, 100);

        const updateProgressStep = (stepIdx, msg) => {
          if (statusTextEl) statusTextEl.textContent = `⏳ [Step ${stepIdx}/4] ${msg}`;
          const pct = stepIdx * 25;
          if (fillEl) fillEl.style.width = `${pct}%`;

          for (let i = 1; i <= 4; i++) {
            const stepEl = document.getElementById(`pstep-${i}`);
            if (stepEl) {
              if (i < stepIdx) {
                stepEl.className = 'pstep done';
              } else if (i === stepIdx) {
                stepEl.className = 'pstep active';
              } else {
                stepEl.className = 'pstep';
              }
            }
          }
        };

        try {
          const userManualSummary = document.getElementById('input-ai-summary')?.value.trim() || '';
          const res = await window.AiModel.analyzeUrl(url, userManualSummary, (stepIdx, msg) => {
            updateProgressStep(stepIdx, msg);
          });

          clearInterval(timerInterval);
          const totalSec = ((performance.now() - startTime) / 1000).toFixed(1);
          if (timerEl) timerEl.textContent = `✅ ${totalSec}s`;

          if (res && res.success) {
            document.getElementById('input-ai-title').value = res.title || '';
            document.getElementById('input-ai-developer').value = res.developer || '';

            const catSelect = document.getElementById('input-ai-category');
            if (catSelect && res.category) {
              let hasOpt = Array.from(catSelect.options).some(o => o.value === res.category);
              if (!hasOpt) {
                const opt = document.createElement('option');
                opt.value = res.category;
                opt.textContent = res.category;
                catSelect.appendChild(opt);
              }
              catSelect.value = res.category;
            }

            document.getElementById('input-ai-tags').value = Array.isArray(res.tags) ? res.tags.join(', ') : (res.tags || '');
            
            const autoSum = res.summary || '';
            let condensedManual = userManualSummary ? userManualSummary.trim() : '';
            if (condensedManual.length > 150) {
              const lines = condensedManual.split(/\r?\n/).filter(l => l.trim() && !/^주요\s*(특징|기능)/i.test(l.trim()));
              const combined = lines.join(' ');
              const sentences = combined.split(/(?<=[.!?])\s+/);
              let resText = '';
              for (const s of sentences) {
                if ((resText + ' ' + s).trim().length <= 160) {
                  resText = (resText + ' ' + s).trim();
                } else { break; }
              }
              condensedManual = resText || (combined.substring(0, 150).trim() + '...');
            }

            if (condensedManual && autoSum && !autoSum.includes(condensedManual)) {
              document.getElementById('input-ai-summary').value = `${condensedManual}\n\n📌 [자동 분석 요약]\n${autoSum}`;
            } else {
              document.getElementById('input-ai-summary').value = autoSum || condensedManual;
            }

            document.getElementById('input-ai-garage-ideas').value = res.garageIdeas || '';
            document.getElementById('input-ai-quickstart').value = res.quickStart || '';
            document.getElementById('input-ai-pricing').value = res.pricing || '';
            if (document.getElementById('input-ai-country')) document.getElementById('input-ai-country').value = res.country || '🇺🇸 미국';
            if (document.getElementById('input-ai-similar')) document.getElementById('input-ai-similar').value = res.similarModels || '';
            document.getElementById('input-ai-docs-url').value = res.docsUrl || url;

            updateProgressStep(4, '⚡ 분석 완료! 폼 필드가 성공적으로 자동 완성되었습니다.');

            if (res.isCached) {
              window.UiView.showToast('⚡ [캐시] 이전에 분석한 URL 정보로 0.1초 만에 완료되었습니다!');
            } else if (res.isExisting) {
              window.UiView.showToast('🔄 기존 차고 등록 모델의 최신 컨설팅 정보(특징/요금/경쟁모델)를 새로 자동 조사하여 반영했습니다!');
            } else {
              window.UiView.showToast('✨ AI 모델 URL 정보를 성공적으로 조사하여 입력 폼을 자동 완성했습니다!');
            }
          } else if (res && res.message && res.message.includes('도박/피싱')) {
            window.UiView.showToast(res.message);
          } else {
            // Smart Universal Exception Engine: 백엔드 타임아웃 또는 미등록 URL도 100% 자동 생성 카드 처리
            const fallbackKb = window.AiModel ? window.AiModel.getExpertAiKnowledge(url) : null;
            if (fallbackKb) {
              document.getElementById('input-ai-title').value = fallbackKb.title || '';
              document.getElementById('input-ai-developer').value = fallbackKb.developer || '';
              const catSelect = document.getElementById('input-ai-category');
              if (catSelect && fallbackKb.category) {
                let hasOpt = Array.from(catSelect.options).some(o => o.value === fallbackKb.category);
                if (!hasOpt) {
                  const opt = document.createElement('option');
                  opt.value = fallbackKb.category;
                  opt.textContent = fallbackKb.category;
                  catSelect.appendChild(opt);
                }
                catSelect.value = fallbackKb.category;
              }
              document.getElementById('input-ai-tags').value = Array.isArray(fallbackKb.tags) ? fallbackKb.tags.join(', ') : (fallbackKb.tags || '');
              
              const fbSum = fallbackKb.summary || '';
              if (userManualSummary && fbSum && !fbSum.includes(userManualSummary)) {
                document.getElementById('input-ai-summary').value = `${userManualSummary}\n\n📌 [자동 분석 요약]\n${fbSum}`;
              } else {
                document.getElementById('input-ai-summary').value = fbSum || userManualSummary;
              }

              document.getElementById('input-ai-garage-ideas').value = fallbackKb.garageIdeas || '';
              document.getElementById('input-ai-quickstart').value = fallbackKb.quickStart || '';
              document.getElementById('input-ai-pricing').value = fallbackKb.pricing || '';
              if (document.getElementById('input-ai-country')) document.getElementById('input-ai-country').value = fallbackKb.country || '🇺🇸 미국';
              if (document.getElementById('input-ai-similar')) document.getElementById('input-ai-similar').value = fallbackKb.similarModels || '';
              document.getElementById('input-ai-docs-url').value = fallbackKb.docsUrl || url;
              window.UiView.showToast('✨ AI 모델 정보가 스마트 예외 처리 엔진을 통해 성공적으로 자동 생성되었습니다!');
            }
          }
        } catch (err) {
          console.error('[Analyze Exception]', err);
          const fallbackKb = window.AiModel ? window.AiModel.getExpertAiKnowledge(url) : null;
          if (fallbackKb) {
            document.getElementById('input-ai-title').value = fallbackKb.title || '';
            document.getElementById('input-ai-developer').value = fallbackKb.developer || '';
            const catSelect = document.getElementById('input-ai-category');
            if (catSelect && fallbackKb.category) {
              let hasOpt = Array.from(catSelect.options).some(o => o.value === fallbackKb.category);
              if (!hasOpt) {
                const opt = document.createElement('option');
                opt.value = fallbackKb.category;
                opt.textContent = fallbackKb.category;
                catSelect.appendChild(opt);
              }
              catSelect.value = fallbackKb.category;
            }
            document.getElementById('input-ai-tags').value = Array.isArray(fallbackKb.tags) ? fallbackKb.tags.join(', ') : (fallbackKb.tags || '');
            
            const userManualSummary = document.getElementById('input-ai-summary')?.value.trim() || '';
            const fbSum = fallbackKb.summary || '';
            if (userManualSummary && fbSum && !fbSum.includes(userManualSummary)) {
              document.getElementById('input-ai-summary').value = `${userManualSummary}\n\n📌 [자동 분석 요약]\n${fbSum}`;
            } else {
              document.getElementById('input-ai-summary').value = fbSum || userManualSummary;
            }

            document.getElementById('input-ai-garage-ideas').value = fallbackKb.garageIdeas || '';
            document.getElementById('input-ai-quickstart').value = fallbackKb.quickStart || '';
            document.getElementById('input-ai-pricing').value = fallbackKb.pricing || '';
            if (document.getElementById('input-ai-country')) document.getElementById('input-ai-country').value = fallbackKb.country || '🇺🇸 미국';
            if (document.getElementById('input-ai-similar')) document.getElementById('input-ai-similar').value = fallbackKb.similarModels || '';
            document.getElementById('input-ai-docs-url').value = fallbackKb.docsUrl || url;
            window.UiView.showToast('✨ AI 모델 정보가 스마트 예외 처리 엔진을 통해 성공적으로 자동 생성되었습니다!');
          }
        } finally {
          btnAnalyzeAiUrl.disabled = false;
          btnAnalyzeAiUrl.innerText = origText;
        }
      });
    }

    const aiUrlForm = document.getElementById('ai-url-form');
    if (aiUrlForm) {
      aiUrlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const serviceUrl = document.getElementById('input-ai-url').value.trim();
        const title = document.getElementById('input-ai-title').value.trim();
        const developer = document.getElementById('input-ai-developer').value.trim();
        const category = document.getElementById('input-ai-category').value;
        const tags = document.getElementById('input-ai-tags').value.trim();
        const summary = document.getElementById('input-ai-summary').value.trim();
        const garageIdeas = document.getElementById('input-ai-garage-ideas').value.trim();
        const quickStart = document.getElementById('input-ai-quickstart').value.trim();
        const pricing = document.getElementById('input-ai-pricing').value.trim();
        const country = document.getElementById('input-ai-country')?.value.trim() || '🇺🇸 미국';
        const similarModels = document.getElementById('input-ai-similar')?.value.trim() || '';
        const docsUrl = document.getElementById('input-ai-docs-url').value.trim() || serviceUrl;

        const result = window.AiModel.addAiModel({
          title, developer, country, similarModels, serviceUrl, docsUrl, category, tags, summary, garageIdeas, quickStart, pricing
        });

        if (result && result.isUpdate) {
          window.UiView.showToast('🔄 기존 등록된 AI 모델 정보가 최신 내용으로 성공적으로 갱신(업데이트)되었습니다!');
        } else {
          window.UiView.showToast('✅ 신규 AI 모델 정보가 차고(Garage)에 성공적으로 등록되었습니다!');
        }

        aiUrlForm.reset();
        const searchAiInput = document.getElementById('search-ai-input');
        const categoryAiFilter = document.getElementById('category-ai-filter');
        if (searchAiInput) searchAiInput.value = '';
        if (categoryAiFilter) categoryAiFilter.value = 'ALL';
        this.loadAndRenderAiModels();
      });
    }

    const searchAiInput = document.getElementById('search-ai-input');
    const categoryAiFilter = document.getElementById('category-ai-filter');

    if (searchAiInput) searchAiInput.addEventListener('input', () => this.applyAiSearchAndFilter());
    if (categoryAiFilter) categoryAiFilter.addEventListener('change', () => this.applyAiSearchAndFilter());

    const btnDownloadAiJson = document.getElementById('btn-download-ai-json');
    if (btnDownloadAiJson) {
      btnDownloadAiJson.addEventListener('click', () => {
        if (!window.AiModel) return;
        const models = window.AiModel.getAiModels();
        const jsonStr = JSON.stringify(models, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_models_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.UiView.showToast(`📥 AI 모델 정보 ${models.length}건 JSON 다운로드 완료!`);
      });
    }

    // 13. AI 용어 신규 등록 폼 제출
    const aiTermForm = document.getElementById('ai-term-form');
    if (aiTermForm) {
      aiTermForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const term = document.getElementById('input-term-name').value.trim();
        const parentTerm = document.getElementById('input-term-parent').value;
        const summary = document.getElementById('input-term-summary').value.trim();

        if (!window.AiTermModel) return;
        const result = window.AiTermModel.addTerm({
          term, parentTerm, summary
        });

        if (result && result.isUpdate) {
          window.UiView.showToast(`🔄 기존 등록된 용어 '${term}'의 내용이 최신 정보로 갱신되었습니다!`);
        } else {
          window.UiView.showToast(`✨ 신규 AI 용어 '${term}'이(가) 등록되었습니다!`);
        }

        aiTermForm.reset();
        this.loadAndRenderAiTerms();
      });
    }

    // 14. AI 용어 수정 폼 제출
    const editTermForm = document.getElementById('edit-term-form');
    const btnCloseEditTermModal = document.getElementById('btn-close-edit-term-modal');
    const btnCancelEditTerm = document.getElementById('btn-cancel-edit-term');

    if (editTermForm) {
      editTermForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-term-id').value;
        const term = document.getElementById('edit-term-name').value.trim();
        const parentTerm = document.getElementById('edit-term-parent').value;
        const summary = document.getElementById('edit-term-summary').value.trim();

        if (window.AiTermModel) {
          window.AiTermModel.updateTerm(id, {
            term, parentTerm, summary
          });
          window.UiView.closeEditTermModal();
          window.UiView.showToast('✅ AI 용어 정보가 수정되었습니다!');
          this.loadAndRenderAiTerms();
        }
      });
    }

    if (btnCloseEditTermModal) btnCloseEditTermModal.addEventListener('click', () => window.UiView.closeEditTermModal());
    if (btnCancelEditTerm) btnCancelEditTerm.addEventListener('click', () => window.UiView.closeEditTermModal());

    // 15. AI 용어 검색 및 카테고리 필터 (마인드맵 카메라 중앙 포커싱 & 양방향 동기화)
    const searchTermInput = document.getElementById('search-term-input');
    const categoryTermFilter = document.getElementById('category-term-filter');
    const mindmapSearchInput = document.getElementById('mindmap-search-input');
    const btnResetMindmap = document.getElementById('btn-reset-mindmap');
    const btnCloseTermDetail = document.getElementById('btn-close-term-detail');

    const handleSearchInput = (val, sourceInput) => {
      // 1. 타 검색 입력창 값 동기화
      if (sourceInput === 'mindmap' && searchTermInput && searchTermInput.value !== val) {
        searchTermInput.value = val;
      } else if (sourceInput === 'list' && mindmapSearchInput && mindmapSearchInput.value !== val) {
        mindmapSearchInput.value = val;
      }

      // 2. 마인드맵 카메라 자동 포커싱 (해당 노드로 이동 & 줌인 & 글로우 강조)
      if (window.MindmapView) {
        window.MindmapView.searchAndFocusNode(val);
      }

      // 3. 하단 카드 목록 필터링
      this.applyAiTermSearchAndFilter();
    };

    if (mindmapSearchInput) {
      mindmapSearchInput.addEventListener('input', (e) => {
        handleSearchInput(e.target.value, 'mindmap');
      });
    }

    if (searchTermInput) {
      searchTermInput.addEventListener('input', (e) => {
        handleSearchInput(e.target.value, 'list');
      });
    }

    if (categoryTermFilter) {
      categoryTermFilter.addEventListener('change', () => this.applyAiTermSearchAndFilter());
    }

    const selectMindmapLayout = document.getElementById('select-mindmap-layout');
    const btnArrangeMindmap = document.getElementById('btn-arrange-mindmap');

    if (btnArrangeMindmap) {
      btnArrangeMindmap.addEventListener('click', () => {
        const layoutType = selectMindmapLayout ? selectMindmapLayout.value : 'radial';
        if (window.MindmapView) {
          window.MindmapView.arrangeNodes(layoutType, true);
          window.UiView.showToast('✨ 마인드맵 노드가 깔끔하게 자동 정렬되었습니다!');
        }
      });
    }

    if (selectMindmapLayout) {
      selectMindmapLayout.addEventListener('change', (e) => {
        const layoutType = e.target.value;
        if (window.MindmapView) {
          window.MindmapView.arrangeNodes(layoutType, true);
        }
      });
    }

    if (btnResetMindmap) {
      btnResetMindmap.addEventListener('click', () => {
        if (window.MindmapView) {
          window.MindmapView.resetCamera();
          const layoutType = selectMindmapLayout ? selectMindmapLayout.value : 'radial';
          window.MindmapView.arrangeNodes(layoutType, true);
          window.UiView.showToast('🎯 마인드맵 위치와 줌 비율이 초기화되었습니다.');
        }
      });
    }

    if (btnCloseTermDetail) {
      btnCloseTermDetail.addEventListener('click', () => window.UiView.hideTermDetailPanel());
    }

    const btnDownloadTermsJson = document.getElementById('btn-download-terms-json');
    if (btnDownloadTermsJson) {
      btnDownloadTermsJson.addEventListener('click', () => {
        if (!window.AiTermModel) return;
        const terms = window.AiTermModel.getTerms();
        const jsonStr = JSON.stringify(terms, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_terms_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.UiView.showToast(`📥 AI 용어 목록 ${terms.length}건 JSON 다운로드 완료!`);
      });
    }

    // 17. SAP 용어 신규 등록 폼 제출
    const sapTermForm = document.getElementById('sap-term-form');
    if (sapTermForm) {
      sapTermForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const term = document.getElementById('input-sap-term-name').value.trim();
        const category = document.getElementById('select-sap-term-category').value;
        const parentTerm = document.getElementById('input-sap-term-parent').value;
        const summary = document.getElementById('input-sap-term-summary').value.trim();

        if (!window.SapTermModel) return;
        const result = window.SapTermModel.addTerm({
          term, category, parentTerm, summary
        });

        if (result && result.isUpdate) {
          window.UiView.showToast(`🔄 기존 등록된 SAP 용어 '${term}'의 내용이 최신 정보로 갱신되었습니다!`);
        } else {
          window.UiView.showToast(`✨ 신규 SAP 용어 '${term}'이(가) 등록되었습니다!`);
        }

        sapTermForm.reset();
        this.loadAndRenderSapTerms();
      });
    }

    // 18. SAP 용어 수정 폼 제출
    const editSapTermForm = document.getElementById('edit-sap-term-form');
    const btnCloseEditSapTermModal = document.getElementById('btn-close-edit-sap-term-modal');
    const btnCancelEditSapTerm = document.getElementById('btn-cancel-edit-sap-term');

    if (editSapTermForm) {
      editSapTermForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-sap-term-id').value;
        const term = document.getElementById('edit-sap-term-name').value.trim();
        const category = document.getElementById('edit-sap-term-category').value;
        const parentTerm = document.getElementById('edit-sap-term-parent').value;
        const summary = document.getElementById('edit-sap-term-summary').value.trim();

        if (window.SapTermModel) {
          window.SapTermModel.updateTerm(id, {
            term, category, parentTerm, summary
          });
          window.UiView.closeEditSapTermModal();
          window.UiView.showToast('✅ SAP 용어 정보가 수정되었습니다!');
          this.loadAndRenderSapTerms();
        }
      });
    }

    if (btnCloseEditSapTermModal) btnCloseEditSapTermModal.addEventListener('click', () => window.UiView.closeEditSapTermModal());
    if (btnCancelEditSapTerm) btnCancelEditSapTerm.addEventListener('click', () => window.UiView.closeEditSapTermModal());

    // 20. SAP 용어 검색 및 마인드맵 인터랙션
    const searchSapTermInput = document.getElementById('search-sap-term-input');
    const categorySapTermFilter = document.getElementById('category-sap-term-filter');
    const sapMindmapSearchInput = document.getElementById('sap-mindmap-search-input');
    const btnResetSapMindmap = document.getElementById('btn-reset-sap-mindmap');
    const btnCloseSapTermDetail = document.getElementById('btn-close-sap-term-detail');

    const handleSapSearchInput = (val, sourceInput) => {
      if (sourceInput === 'mindmap' && searchSapTermInput && searchSapTermInput.value !== val) {
        searchSapTermInput.value = val;
      } else if (sourceInput === 'list' && sapMindmapSearchInput && sapMindmapSearchInput.value !== val) {
        sapMindmapSearchInput.value = val;
      }

      if (window.SapMindmapView) {
        window.SapMindmapView.searchAndFocusNode(val);
      }

      this.applySapTermSearchAndFilter();
    };

    if (sapMindmapSearchInput) {
      sapMindmapSearchInput.addEventListener('input', (e) => {
        handleSapSearchInput(e.target.value, 'mindmap');
      });
    }

    if (searchSapTermInput) {
      searchSapTermInput.addEventListener('input', (e) => {
        handleSapSearchInput(e.target.value, 'list');
      });
    }

    if (categorySapTermFilter) {
      categorySapTermFilter.addEventListener('change', () => this.applySapTermSearchAndFilter());
    }

    const selectSapMindmapLayout = document.getElementById('sap-select-mindmap-layout');
    const btnArrangeSapMindmap = document.getElementById('btn-arrange-sap-mindmap');

    if (btnArrangeSapMindmap) {
      btnArrangeSapMindmap.addEventListener('click', () => {
        const layoutType = selectSapMindmapLayout ? selectSapMindmapLayout.value : 'radial';
        if (window.SapMindmapView) {
          window.SapMindmapView.arrangeLayout(layoutType);
          window.UiView.showToast('✨ SAP 마인드맵 노드가 깔끔하게 자동 정렬되었습니다!');
        }
      });
    }

    if (selectSapMindmapLayout) {
      selectSapMindmapLayout.addEventListener('change', (e) => {
        const layoutType = e.target.value;
        if (window.SapMindmapView) {
          window.SapMindmapView.arrangeLayout(layoutType);
        }
      });
    }

    if (btnResetSapMindmap) {
      btnResetSapMindmap.addEventListener('click', () => {
        if (window.SapMindmapView) {
          window.SapMindmapView.resetCamera();
          const layoutType = selectSapMindmapLayout ? selectSapMindmapLayout.value : 'radial';
          window.SapMindmapView.arrangeLayout(layoutType);
          window.UiView.showToast('🎯 SAP 마인드맵 위치와 줌 비율이 초기화되었습니다.');
        }
      });
    }

    if (btnCloseSapTermDetail) {
      btnCloseSapTermDetail.addEventListener('click', () => window.UiView.hideSapTermDetailPanel());
    }

    const btnDownloadSapTermsJson = document.getElementById('btn-download-sap-terms-json');
    if (btnDownloadSapTermsJson) {
      btnDownloadSapTermsJson.addEventListener('click', () => {
        if (!window.SapTermModel) return;
        const terms = window.SapTermModel.getTerms();
        const jsonStr = JSON.stringify(terms, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sap_terms_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.UiView.showToast(`📥 SAP 용어 목록 ${terms.length}건 JSON 다운로드 완료!`);
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
    const sideAi = document.getElementById('side-menu-ai');
    const sideWork = document.getElementById('side-menu-work');
    const sideInvest = document.getElementById('side-menu-invest');
    const sideLife = document.getElementById('side-menu-life');
    const sideAdmin = document.getElementById('side-menu-admin');

    if (view === 'main') {
      if (sideMain) sideMain.classList.remove('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideInvest) sideInvest.classList.add('hidden');
      if (sideLife) sideLife.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('dashboard');
    } else if (view === 'api') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.remove('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideInvest) sideInvest.classList.add('hidden');
      if (sideLife) sideLife.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('api-info');
    } else if (view === 'ai') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.remove('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideInvest) sideInvest.classList.add('hidden');
      if (sideLife) sideLife.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('ai-models');
    } else if (view === 'agent-builder') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.remove('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideInvest) sideInvest.classList.add('hidden');
      if (sideLife) sideLife.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('agent-builder');
    } else if (view === 'work') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.remove('hidden');
      if (sideInvest) sideInvest.classList.add('hidden');
      if (sideLife) sideLife.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('sap-terms');
    } else if (view === 'invest') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideInvest) sideInvest.classList.remove('hidden');
      if (sideLife) sideLife.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('stock-temp');
    } else if (view === 'life') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideInvest) sideInvest.classList.add('hidden');
      if (sideLife) sideLife.classList.remove('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('monster-defense');
    } else if (view === 'admin') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideInvest) sideInvest.classList.add('hidden');
      if (sideLife) sideLife.classList.add('hidden');
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
    const viewAiModels = document.getElementById('view-ai-models');
    const viewAiTerms = document.getElementById('view-ai-terms');
    const viewSapTerms = document.getElementById('view-sap-terms');
    const viewSapSuite = document.getElementById('view-sap-suite');
    const viewAgentBuilder = document.getElementById('view-agent-builder');
    const viewIpWhitelist = document.getElementById('view-ip-whitelist');
    const viewIpBlacklist = document.getElementById('view-ip-blacklist');
    const viewIpLogs = document.getElementById('view-ip-logs');
    const viewBatchRegister = document.getElementById('view-batch-register');
    const viewMenuConfig = document.getElementById('view-menu-config');
    const viewTechStack = document.getElementById('view-tech-stack');
    const viewStockTemp = document.getElementById('view-stock-temp');
    const viewThreadsAgent = document.getElementById('view-threads-agent');
    const viewMonsterDefense = document.getElementById('view-monster-defense');

    const hideAllViews = () => {
      if (viewDashboard) viewDashboard.classList.add('hidden');
      if (viewApiInfo) viewApiInfo.classList.add('hidden');
      if (viewAiModels) viewAiModels.classList.add('hidden');
      if (viewAiTerms) viewAiTerms.classList.add('hidden');
      if (viewSapTerms) viewSapTerms.classList.add('hidden');
      if (viewSapSuite) viewSapSuite.classList.add('hidden');
      if (viewAgentBuilder) viewAgentBuilder.classList.add('hidden');

      if (viewIpWhitelist) viewIpWhitelist.classList.add('hidden');
      if (viewIpBlacklist) viewIpBlacklist.classList.add('hidden');
      if (viewIpLogs) viewIpLogs.classList.add('hidden');
      if (viewBatchRegister) viewBatchRegister.classList.add('hidden');
      if (viewMenuConfig) viewMenuConfig.classList.add('hidden');
      if (viewTechStack) viewTechStack.classList.add('hidden');
      if (viewStockTemp) viewStockTemp.classList.add('hidden');
      if (viewThreadsAgent) viewThreadsAgent.classList.add('hidden');
      if (viewMonsterDefense) viewMonsterDefense.classList.add('hidden');
    };

    // 다른 뷰로 이동 시 게임 루프 일시정지 (리소스 절약)
    if (sideView !== 'monster-defense' && window.MonsterDefenseView) {
      window.MonsterDefenseView.pause();
    }

    hideAllViews();

    if (sideView === 'monster-defense') {
      if (viewMonsterDefense) viewMonsterDefense.classList.remove('hidden');
      if (window.MonsterDefenseView) {
        setTimeout(() => {
          window.MonsterDefenseView.init();
        }, 50);
      }
    } else if (sideView === 'threads-agent') {
      if (viewThreadsAgent) viewThreadsAgent.classList.remove('hidden');
      this.refreshThreadsAgentView();
    } else if (sideView === 'stock-temp') {
      if (viewStockTemp) viewStockTemp.classList.remove('hidden');
      if (window.StockTempModel && window.StockTempView) {
        window.StockTempModel.loadStockTempData().then(() => {
          window.StockTempView.renderView();
        });
      }
    } else if (sideView === 'dashboard') {
      if (viewDashboard) viewDashboard.classList.remove('hidden');
      this.refreshAllViews();
    } else if (sideView === 'api-info') {
      if (viewApiInfo) viewApiInfo.classList.remove('hidden');
      this.applySearchAndFilter();
    } else if (sideView === 'ai-models') {
      if (viewAiModels) viewAiModels.classList.remove('hidden');
      this.loadAndRenderAiModels();
    } else if (sideView === 'ai-terms') {
      if (viewAiTerms) viewAiTerms.classList.remove('hidden');
      this.loadAndRenderAiTerms();
      if (window.MindmapView) {
        setTimeout(() => {
          window.MindmapView.resizeCanvas();
          window.MindmapView.render();
        }, 50);
      }
    } else if (sideView === 'sap-terms') {
      if (viewSapTerms) viewSapTerms.classList.remove('hidden');
      this.loadAndRenderSapTerms();
      if (window.SapMindmapView) {
        setTimeout(() => {
          window.SapMindmapView.resizeCanvas();
          window.SapMindmapView.render();
        }, 50);
      }
    } else if (sideView === 'sap-suite') {
      if (viewSapSuite) viewSapSuite.classList.remove('hidden');
      if (window.SapSuiteView) {
        window.SapSuiteView.init();
      }
    } else if (sideView === 'agent-builder') {

      if (viewAgentBuilder) viewAgentBuilder.classList.remove('hidden');
      if (window.AgentBuilderView) {
        window.AgentBuilderView.init();
      }
    } else if (sideView === 'tech-stack') {
      if (viewTechStack) viewTechStack.classList.remove('hidden');
      if (window.TechStackView) {
        window.TechStackView.init();
      }
    } else if (sideView === 'ip-whitelist') {
      if (viewIpWhitelist) viewIpWhitelist.classList.remove('hidden');
      this.loadAndRenderIpWhitelist();
    } else if (sideView === 'ip-blacklist') {
      if (viewIpBlacklist) viewIpBlacklist.classList.remove('hidden');
      this.loadAndRenderIpBlacklist();
    } else if (sideView === 'ip-logs') {
      if (viewIpLogs) viewIpLogs.classList.remove('hidden');
      this.loadAndRenderAccessLogs();
    } else if (sideView === 'batch-register') {
      if (viewBatchRegister) viewBatchRegister.classList.remove('hidden');
    } else if (sideView === 'menu-config') {
      if (viewMenuConfig) viewMenuConfig.classList.remove('hidden');
      this.renderMenuConfigTable();
    }
  },

  async refreshThreadsAgentStatus() {
    if (!window.ThreadsAgentModel) return;
    const status = await window.ThreadsAgentModel.fetchStatus();
    await window.ThreadsAgentModel.fetchSapStatus();
    const dDayInfo = window.ThreadsAgentModel.getTokenDDay();
    if (window.ThreadsAgentView) {
      window.ThreadsAgentView.renderHeaderQuickBar(status, dDayInfo);
      if (this.currentSideView === 'threads-agent') {
        window.ThreadsAgentView.renderMainView();
      }
    }
  },

  async refreshThreadsAgentView() {
    if (!window.ThreadsAgentModel) return;
    await window.ThreadsAgentModel.loadTokenConfig();
    await window.ThreadsAgentModel.loadSapConfig();
    await window.ThreadsAgentModel.fetchStatus();
    await window.ThreadsAgentModel.fetchSapStatus();
    await window.ThreadsAgentModel.fetchSources();
    await window.ThreadsAgentModel.fetchPosts();
    await window.ThreadsAgentModel.fetchRuntimeConfig();
    if (window.ThreadsAgentView) {
      window.ThreadsAgentView.renderMainView();
    }
  },

  /**
   * 메뉴 권한 설정 로드 (API & localStorage)
   */
  async loadMenuConfig() {
    try {
      const res = await fetch('/api/menu-config');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.menuConfig = data;
          localStorage.setItem('portal_menu_config', JSON.stringify(data));
          return;
        }
      }
    } catch (e) {
      console.warn('[AppController] Failed to fetch menu config from API:', e);
    }
    const local = localStorage.getItem('portal_menu_config');
    if (local) {
      try {
        this.menuConfig = JSON.parse(local);
        return;
      } catch (e) {}
    }
    this.menuConfig = [
      { id: "api-info", name: "API 정보", icon: "📚", category: "main", statCardId: "card-stat-apis", guest: true, admin: true, description: "API 정보 목록 및 세부 개발 명세 조회" },
      { id: "ai-models", name: "AI 서비스 정보", icon: "🤖", category: "ai", statCardId: "card-stat-ai-services", guest: true, admin: true, description: "최신 AI 모델 및 서비스 정보 목록 조회" },
      { id: "ai-terms", name: "AI 용어 & 마인드맵", icon: "🧠", category: "ai", statCardId: "card-stat-ai-terms", guest: true, admin: true, description: "AI 관련 기술 개념 및 마인드맵 학습" },
      { id: "sap-terms", name: "SAP 용어 & 마인드맵", icon: "🏢", category: "work", statCardId: "card-stat-sap-terms", guest: true, admin: true, description: "SAP ERP 코어 모듈 및 기술 용어 마인드맵" },
      { id: "sap-suite", name: "SAP Integration Suite", icon: "⚡", category: "work", statCardId: "card-stat-sap-suite", guest: true, admin: true, description: "SAP Cloud Integration 최신 소식 및 Groovy/iFlow 컨설팅·개발 도우미" },
      { id: "agent-builder", name: "AI 에이전트 Builder", icon: "🧩", category: "ai", guest: true, admin: true, description: "자원 조합 및 시스템 워크플로우 설계도 생성" },

      { id: "ip-whitelist", name: "IP 화이트리스트", icon: "🛡️", category: "admin", guest: false, admin: true, description: "접속 허용 IP 주소 관리" },
      { id: "ip-blacklist", name: "IP 블랙리스트", icon: "⛔", category: "admin", guest: false, admin: true, description: "접속 차단 IP 주소 관리" },
      { id: "ip-logs", name: "외부 유입 IP 로그", icon: "🌐", category: "admin", guest: false, admin: true, description: "서버 외부 접속 차단/허용 로그 기록" },
      { id: "batch-register", name: "API정보 일괄등록", icon: "📥", category: "admin", guest: false, admin: true, description: "엑셀 파일 업로드를 통한 API bulk 등록" },
      { id: "menu-config", name: "메뉴 권한 설정", icon: "⚙️", category: "admin", guest: false, admin: true, description: "게스트 및 관리자 모드 메뉴 노출 설정" }
    ];
  },

  /**
   * 메뉴 권한 설정 저장
   */
  async saveMenuConfig(newConfig) {
    this.menuConfig = newConfig;
    localStorage.setItem('portal_menu_config', JSON.stringify(newConfig));
    try {
      await fetch('/api/menu-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } catch (e) {
      console.warn('[AppController] Failed to save menu config to backend:', e);
    }
    this.applyMenuPermissions();
    if (window.UiView && window.UiView.showToast) {
      window.UiView.showToast('💾 메뉴 권한 설정이 성공적으로 저장되었습니다!');
    }
  },

  /**
   * 게스트/관리자 권한 설정에 따른 UI 메뉴 및 대시보드 통계 카드 실시간 표시/숨김 적용
   */
  applyMenuPermissions() {
    const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
    let isGuest = true;
    if (rawUser) {
      try { isGuest = !!JSON.parse(rawUser).isGuest; } catch (e) {}
    }
    const roleKey = isGuest ? 'guest' : 'admin';
    const configMap = {};
    (this.menuConfig || []).forEach(item => {
      configMap[item.id] = item[roleKey] !== false;
    });

    // 1. 메인 대시보드 통계 카드 완전 숨김/노출
    (this.menuConfig || []).forEach(item => {
      if (item.statCardId) {
        const card = document.getElementById(item.statCardId);
        if (card) {
          if (configMap[item.id]) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        }
      }
    });

    // 2. 사이드바 메뉴 버튼 (data-side) 숨김/노출
    const sideButtons = document.querySelectorAll('.nav-side-btn');
    sideButtons.forEach(btn => {
      const sideTarget = btn.getAttribute('data-side');
      if (!sideTarget || sideTarget === 'dashboard') return;
      const isAllowed = configMap[sideTarget] !== false;
      if (isAllowed) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });

    // 3. 상단 Nav 및 사이드바 그룹 제어
    const checkGroupVisible = (sideGroupId) => {
      const groupEl = document.getElementById(sideGroupId);
      if (!groupEl) return false;
      const btns = Array.from(groupEl.querySelectorAll('.nav-side-btn'));
      return btns.some(b => b.style.display !== 'none');
    };

    const topApiNav = document.getElementById('nav-top-api');
    const topAiNav = document.getElementById('nav-top-ai');
    const topWorkNav = document.getElementById('nav-top-work');
    const topInvestNav = document.getElementById('nav-top-invest');
    const topLifeNav = document.getElementById('nav-top-life');
    const topAdminNav = document.getElementById('nav-top-admin');

    if (topApiNav) topApiNav.style.display = checkGroupVisible('side-menu-api') ? '' : 'none';
    if (topAiNav) topAiNav.style.display = checkGroupVisible('side-menu-ai') ? '' : 'none';
    if (topWorkNav) topWorkNav.style.display = checkGroupVisible('side-menu-work') ? '' : 'none';
    if (topInvestNav) topInvestNav.style.display = checkGroupVisible('side-menu-invest') ? '' : 'none';
    if (topLifeNav) topLifeNav.style.display = checkGroupVisible('side-menu-life') ? '' : 'none';
    if (topAdminNav) topAdminNav.style.display = (!isGuest && checkGroupVisible('side-menu-admin')) ? '' : 'none';
  },

  /**
   * 메뉴 권한 설정 화면 테이블 렌더링
   */
  renderMenuConfigTable() {
    const tbody = document.getElementById('menu-config-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    (this.menuConfig || []).forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="menu-config-item-title">
            <span class="icon">${item.icon || '📄'}</span>
            <span>${item.name}</span>
          </div>
        </td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${item.description || ''}</td>
        <td style="text-align: center;">
          <label class="switch-label">
            <input type="checkbox" class="chk-guest-toggle" data-id="${item.id}" ${item.guest ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
        </td>
        <td style="text-align: center;">
          <label class="switch-label">
            <input type="checkbox" class="chk-admin-toggle" data-id="${item.id}" ${item.admin ? 'checked' : ''} ${item.id === 'menu-config' ? 'disabled' : ''} />
            <span class="slider"></span>
          </label>
        </td>
      `;
      tbody.appendChild(tr);
    });
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
   * 선택되거나 드롭된 엑셀 파일 분석 및 미리보기 처리
   */
  async handleExcelFile(file) {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      window.UiView.showToast('⚠️ .xlsx 또는 .xls 포맷의 엑셀 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 정보 UI 업데이트
    const filenameEl = document.getElementById('excel-filename');
    const filesizeEl = document.getElementById('excel-filesize');
    const fileInfoBox = document.getElementById('excel-selected-file-info');
    const dropzonePrompt = document.getElementById('dropzone-prompt');

    if (filenameEl) filenameEl.textContent = file.name;
    if (filesizeEl) filesizeEl.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
    if (dropzonePrompt) dropzonePrompt.classList.add('hidden');
    if (fileInfoBox) fileInfoBox.classList.remove('hidden');

    if (!window.ExcelHelper) {
      window.UiView.showToast('⚠️ 엑셀 파서 모듈을 찾을 수 없습니다.');
      return;
    }

    window.UiView.showToast('⏳ 엑셀 데이터를 분석 중입니다...');
    const result = await window.ExcelHelper.parseExcelFile(file);

    if (!result.success) {
      window.UiView.showToast(`⚠️ ${result.error}`);
      this.clearExcelBatchState();
      return;
    }

    if (result.rows.length === 0) {
      window.UiView.showToast('⚠️ 엑셀 파일에서 읽을 수 있는 데이터가 없습니다.');
      this.clearExcelBatchState();
      return;
    }

    this.parsedBatchRows = result.rows;
    const existingApis = window.ApiModel.getApis();
    window.UiView.renderExcelPreview(result.rows, existingApis);

    const validCount = result.rows.filter(r => r.serviceUrl).length;
    const linkExtractedCount = result.rows.filter(r => r.isServiceUrlHyperlink).length;
    let toastMsg = `✅ 총 ${result.rows.length}개 행이 파싱되었습니다 (유효: ${validCount}건).`;
    if (linkExtractedCount > 0) {
      toastMsg += ` 🔗 ${linkExtractedCount}건의 하이퍼링크 Target 주소 추출 성공!`;
    }
    window.UiView.showToast(toastMsg);
  },

  /**
   * 분석된 엑셀 데이터를 데이터베이스(ApiModel)에 실제 일괄 반영 (Upsert)
   */
  processBatchExcel() {
    if (!this.parsedBatchRows || this.parsedBatchRows.length === 0) {
      window.UiView.showToast('⚠️ 처리할 엑셀 데이터가 없습니다. 먼저 엑셀 파일을 선택하세요.');
      return;
    }

    const validRows = this.parsedBatchRows.filter(r => r.serviceUrl);

    if (validRows.length === 0) {
      window.UiView.showToast('⚠️ 서비스 URL이 존재하는 유효한 API 정보가 없습니다.');
      return;
    }

    const result = window.ApiModel.batchUpsertApis(validRows);

    window.UiView.showToast(
      `🎉 엑셀 일괄 등록 완료! (신규: ${result.addedCount}건, 업데이트: ${result.updatedCount}건, 총 등록: ${result.totalApis}건)`
    );

    this.clearExcelBatchState();
    this.refreshAllViews();
  },

  /**
   * 엑셀 업로드 상태 및 미리보기 초기화
   */
  clearExcelBatchState() {
    this.parsedBatchRows = [];

    const excelFileInput = document.getElementById('excel-file-input');
    if (excelFileInput) excelFileInput.value = '';

    const dropzonePrompt = document.getElementById('dropzone-prompt');
    const fileInfoBox = document.getElementById('excel-selected-file-info');
    const previewContainer = document.getElementById('excel-preview-container');

    if (dropzonePrompt) dropzonePrompt.classList.remove('hidden');
    if (fileInfoBox) fileInfoBox.classList.add('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
  },

  /**
   * AI 모델 목록 조회 및 UI 렌더링
   */
  loadAndRenderAiModels() {
    if (!window.AiModel) return;
    const models = window.AiModel.getAiModels();
    this.applyAiSearchAndFilter(models);
  },

  /**
   * AI 모델 검색 및 카테고리 필터링 적용
   */
  applyAiSearchAndFilter(rawModels) {
    const models = rawModels || (window.AiModel ? window.AiModel.getAiModels() : []);
    const searchVal = (document.getElementById('search-ai-input')?.value || '').trim().toLowerCase();
    const categoryVal = document.getElementById('category-ai-filter')?.value || 'ALL';

    const filtered = models.filter(item => {
      const matchCategory = (categoryVal === 'ALL' || item.category === categoryVal);
      const tagsStr = Array.isArray(item.tags) ? item.tags.join(' ') : (item.tags || '');
      const searchTarget = [
        item.title, item.developer, item.summary, item.country,
        item.similarModels, item.garageIdeas, item.quickStart,
        item.pricing, item.serviceUrl, tagsStr
      ].filter(Boolean).join(' ').toLowerCase();

      const matchSearch = !searchVal || searchTarget.includes(searchVal);

      return matchCategory && matchSearch;
    });

    window.UiView.renderAiModels(
      filtered,
      (id) => {
        window.AiModel.deleteAiModel(id);
        window.UiView.showToast('🗑️ AI 모델 정보가 삭제되었습니다.');
        this.loadAndRenderAiModels();
      },
      (id) => {
        const allModels = window.AiModel.getAiModels();
        const targetModel = allModels.find(m => m.id === id);
        if (targetModel) {
          document.getElementById('input-ai-url').value = targetModel.serviceUrl || '';
          document.getElementById('input-ai-title').value = targetModel.title || '';
          document.getElementById('input-ai-developer').value = targetModel.developer || '';
          
          const catSelect = document.getElementById('input-ai-category');
          if (catSelect && targetModel.category) {
            let hasOpt = Array.from(catSelect.options).some(o => o.value === targetModel.category);
            if (!hasOpt) {
              const opt = document.createElement('option');
              opt.value = targetModel.category;
              opt.textContent = targetModel.category;
              catSelect.appendChild(opt);
            }
            catSelect.value = targetModel.category;
          }

          document.getElementById('input-ai-tags').value = Array.isArray(targetModel.tags) ? targetModel.tags.join(', ') : (targetModel.tags || '');
          document.getElementById('input-ai-summary').value = targetModel.summary || '';
          document.getElementById('input-ai-garage-ideas').value = targetModel.garageIdeas || '';
          document.getElementById('input-ai-quickstart').value = targetModel.quickStart || '';
          document.getElementById('input-ai-pricing').value = targetModel.pricing || '';
          if (document.getElementById('input-ai-country')) document.getElementById('input-ai-country').value = targetModel.country || '🇺🇸 미국';
          if (document.getElementById('input-ai-similar')) document.getElementById('input-ai-similar').value = targetModel.similarModels || '';
          document.getElementById('input-ai-docs-url').value = targetModel.docsUrl || targetModel.serviceUrl || '';

          const formCard = document.querySelector('#view-ai-models .form-card');
          if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
          window.UiView.showToast('✏️ AI 모델 정보가 양식에 불러와졌습니다. 내용 수정 후 등록 버튼을 누르세요!');
        }
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
  },

  /**
   * AI 용어 목록 및 마인드맵 그래픽 렌더링
   */
  loadAndRenderAiTerms() {
    if (!window.AiTermModel) return;

    const terms = window.AiTermModel.getTerms();
    window.UiView.updateParentTermOptions(terms);

    if (window.MindmapView) {
      window.MindmapView.init('mindmap-canvas', 'mindmap-container');
      window.MindmapView.setTerms(terms, (selectedTerm) => {
        window.UiView.showTermDetailPanel(selectedTerm, terms, (connTerm) => {
          if (window.MindmapView && connTerm) {
            window.MindmapView.searchAndFocusNode(connTerm.term);
          }
        });
      });
    }

    this.applyAiTermSearchAndFilter();
  },

  /**
   * AI 용어 검색 및 카테고리 필터링 적용
   */
  applyAiTermSearchAndFilter() {
    if (!window.AiTermModel) return;

    const rawSearch = (document.getElementById('search-term-input')?.value || '').trim();
    let terms = window.AiTermModel.getTerms();

    if (rawSearch) {
      const normalize = (str) => (str || '').toLowerCase().replace(/[\s\(\)\/_\-\[\]]/g, '');
      const searchVal = normalize(rawSearch);

      terms = terms.filter(t => 
        normalize(t.term).includes(searchVal) ||
        normalize(t.summary).includes(searchVal) ||
        normalize(t.parentTerm).includes(searchVal)
      );
    }

    window.UiView.renderAiTermCards(
      terms,
      (id) => {
        window.AiTermModel.deleteTerm(id);
        this.loadAndRenderAiTerms();
        window.UiView.showToast('🗑️ AI 용어가 삭제되었습니다.');
      },
      (targetTerm) => {
        const allTerms = window.AiTermModel.getTerms();
        window.UiView.openEditTermModal(targetTerm, allTerms);
      }
    );
  },

  /**
   * SAP 용어 목록 및 마인드맵 그래픽 렌더링
   */
  loadAndRenderSapTerms() {
    if (!window.SapTermModel) return;

    const terms = window.SapTermModel.getTerms();
    window.UiView.updateSapParentTermOptions(terms);

    if (window.SapMindmapView) {
      window.SapMindmapView.init('sap-mindmap-canvas', 'sap-mindmap-container');
      window.SapMindmapView.setTerms(terms, (selectedTerm) => {
        window.UiView.showSapTermDetailPanel(selectedTerm, terms, (connTerm) => {
          if (window.SapMindmapView && connTerm) {
            window.SapMindmapView.searchAndFocusNode(connTerm.term);
          }
        });
      });
    }

    this.applySapTermSearchAndFilter();
  },

  /**
   * SAP 용어 검색 및 카테고리 필터링 적용
   */
  applySapTermSearchAndFilter() {
    if (!window.SapTermModel) return;

    const rawSearch = (document.getElementById('search-sap-term-input')?.value || '').trim();
    const categoryVal = document.getElementById('category-sap-term-filter')?.value || 'ALL';
    let terms = window.SapTermModel.getTerms();

    if (categoryVal !== 'ALL') {
      terms = terms.filter(t => t.category === categoryVal);
    }

    if (rawSearch) {
      const normalize = (str) => (str || '').toLowerCase().replace(/[\s\(\)\/_\-\[\]]/g, '');
      const searchVal = normalize(rawSearch);

      terms = terms.filter(t => 
        normalize(t.term).includes(searchVal) ||
        normalize(t.summary).includes(searchVal) ||
        normalize(t.parentTerm).includes(searchVal)
      );
    }

    window.UiView.renderSapTermCards(
      terms,
      (id) => {
        window.SapTermModel.deleteTerm(id);
        this.loadAndRenderSapTerms();
        window.UiView.showToast('🗑️ SAP 용어가 삭제되었습니다.');
      },
      (targetTerm) => {
        const allTerms = window.SapTermModel.getTerms();
        window.UiView.openEditSapTermModal(targetTerm, allTerms);
      }
    );
  }
};
