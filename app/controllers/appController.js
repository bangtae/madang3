// app/controllers/appController.js - 애플리케이션 통합 컨트롤러

window.AppController = {
  currentTopView: 'main',
  currentSideView: 'dashboard',
  parsedBatchRows: [],

  init() {
    this.checkAuthGuard();
    this.bindEvents();
    this.refreshAllViews();
  },

  checkAuthGuard() {
    const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
    if (!rawUser) {
      window.location.href = 'login.html';
      return;
    }
    try {
      const user = JSON.parse(rawUser);
      const badge = document.getElementById('user-display-badge');
      if (badge && user.username) {
        badge.textContent = `${user.username} (${user.role || '개발자'})`;
      }
    } catch(e) {}
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
  },

  bindEvents() {
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (confirm('안전하게 로그아웃하시겠습니까?')) {
          sessionStorage.removeItem('portal_auth_user');
          localStorage.removeItem('portal_auth_user');
          window.location.href = 'login.html';
        }
      });
    }

    // 메인 대시보드 통계 카드 클릭 -> 해당 메뉴 화면 이동 숏컷
    const cardStatApis = document.getElementById('card-stat-apis');
    if (cardStatApis) {
      cardStatApis.addEventListener('click', () => {
        this.switchTopNav('api');
        this.switchSideNav('api-info');
      });
    }

    const cardStatAiServices = document.getElementById('card-stat-ai-services');
    if (cardStatAiServices) {
      cardStatAiServices.addEventListener('click', () => {
        this.switchTopNav('ai');
        this.switchSideNav('ai-models');
      });
    }

    const cardStatAiTerms = document.getElementById('card-stat-ai-terms');
    if (cardStatAiTerms) {
      cardStatAiTerms.addEventListener('click', () => {
        this.switchTopNav('ai');
        this.switchSideNav('ai-terms');
      });
    }

    const cardStatSapTerms = document.getElementById('card-stat-sap-terms');
    if (cardStatSapTerms) {
      cardStatSapTerms.addEventListener('click', () => {
        this.switchTopNav('work');
        this.switchSideNav('sap-terms');
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

    // 6. 데이터 강제 동기화 (밀어넣기) 및 다운로드 버튼 이벤트 (JSON / CSV)
    const btnSyncToFile = document.getElementById('btn-sync-to-file');
    const btnDownloadJson = document.getElementById('btn-download-json');
    const btnDownloadCsv = document.getElementById('btn-download-csv');

    if (btnSyncToFile) {
      btnSyncToFile.addEventListener('click', async () => {
        let apis = window.ApiModel.getApis();
        const fallbackApis = window.PORTAL_DATA_APIS || window.CONFIG.INITIAL_APIS || [];
        apis = window.ApiModel.mergeApis(apis, fallbackApis);
        window.ApiModel.apis = apis;

        if (!apis || apis.length === 0) {
          window.UiView.showToast('⚠️ 동기화할 API 데이터가 없습니다.', 'error');
          return;
        }

        btnSyncToFile.disabled = true;
        const originalText = btnSyncToFile.innerText;
        btnSyncToFile.innerText = '⏳ 밀어넣는 중...';

        try {
          // LocalStorage 저장 및 서버 apis.json / initialApis.js로 전송
          window.ApiModel.saveAllApis(apis);
          this.refreshAllViews();
          window.UiView.showToast(`✅ ${apis.length}개의 API 데이터가 서버 파일(apis.json & initialApis.js)로 성공적으로 밀어넣어졌습니다!`);
        } catch (err) {
          console.error(err);
          window.UiView.showToast('❌ 동기화 중 오류가 발생했습니다.', 'error');
        } finally {
          btnSyncToFile.disabled = false;
          btnSyncToFile.innerText = originalText;
        }
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

        try {
          const userManualSummary = document.getElementById('input-ai-summary')?.value.trim() || '';
          const res = await window.AiModel.analyzeUrl(url, userManualSummary);
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

            if (res.isExisting) {
              window.UiView.showToast('🔄 기존 차고 등록 모델의 최신 컨설팅 정보(특징/요금/경쟁모델)를 새로 자동 조사하여 반영했습니다!');
            } else {
              window.UiView.showToast('✨ AI 모델 컨설팅용 정밀 정보(특징·요금·경쟁모델·활용법)가 수동 입력 메모와 함께 자동 생성되었습니다!');
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

    const btnSyncAi = document.getElementById('btn-sync-ai-to-file');
    if (btnSyncAi) {
      btnSyncAi.addEventListener('click', async () => {
        if (!window.AiModel) return;
        let models = window.AiModel.getAiModels();
        const fallbackModels = window.PORTAL_DATA_AI_MODELS || [];
        models = window.AiModel.mergeModels(models, fallbackModels);

        btnSyncAi.disabled = true;
        const origText = btnSyncAi.innerText;
        btnSyncAi.innerText = '⏳ 밀어넣는 중...';
        try {
          window.AiModel.saveAllModels(models);
          this.loadAndRenderAiModels();
          window.UiView.showToast(`✅ ${models.length}개의 AI 모델 데이터가 서버 파일(aiModels.json & initialAiModels.js)로 밀어넣어졌습니다!`);
        } catch (e) {
          window.UiView.showToast('❌ 동기화 중 오류가 발생했습니다.');
        } finally {
          btnSyncAi.disabled = false;
          btnSyncAi.innerText = origText;
        }
      });
    }

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

    // 16. AI 용어 강제 파일 동기화 & JSON 다운로드
    const btnSyncTerms = document.getElementById('btn-sync-terms-to-file');
    if (btnSyncTerms) {
      btnSyncTerms.addEventListener('click', async () => {
        if (!window.AiTermModel) return;
        let terms = window.AiTermModel.getTerms();
        const fallbackTerms = window.PORTAL_DATA_AI_TERMS || [];
        terms = window.AiTermModel.mergeTerms(terms, fallbackTerms);

        btnSyncTerms.disabled = true;
        const origText = btnSyncTerms.innerText;
        btnSyncTerms.innerText = '⏳ 밀어넣는 중...';
        try {
          window.AiTermModel.saveAllTerms(terms);
          this.loadAndRenderAiTerms();
          window.UiView.showToast(`✅ ${terms.length}개의 AI 용어 데이터가 서버 파일(aiTerms.json & initialAiTerms.js)로 밀어넣어졌습니다!`);
        } catch (e) {
          window.UiView.showToast('❌ 동기화 중 오류가 발생했습니다.');
        } finally {
          btnSyncTerms.disabled = false;
          btnSyncTerms.innerText = origText;
        }
      });
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

    // 21. SAP 용어 강제 파일 동기화 & JSON 다운로드
    const btnSyncSapTerms = document.getElementById('btn-sync-sap-terms-to-file');
    if (btnSyncSapTerms) {
      btnSyncSapTerms.addEventListener('click', async () => {
        if (!window.SapTermModel) return;
        let terms = window.SapTermModel.getTerms();
        const fallbackTerms = window.PORTAL_DATA_SAP_TERMS || [];
        terms = window.SapTermModel.mergeTerms(terms, fallbackTerms);

        btnSyncSapTerms.disabled = true;
        const origText = btnSyncSapTerms.innerText;
        btnSyncSapTerms.innerText = '⏳ 밀어넣는 중...';
        try {
          window.SapTermModel.saveAllTerms(terms);
          this.loadAndRenderSapTerms();
          window.UiView.showToast(`✅ ${terms.length}개의 SAP 용어 데이터가 서버 파일(sapTerms.json & initialSapTerms.js)로 밀어넣어졌습니다!`);
        } catch (e) {
          window.UiView.showToast('❌ 동기화 중 오류가 발생했습니다.');
        } finally {
          btnSyncSapTerms.disabled = false;
          btnSyncSapTerms.innerText = origText;
        }
      });
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
    const sideAdmin = document.getElementById('side-menu-admin');

    if (view === 'main') {
      if (sideMain) sideMain.classList.remove('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('dashboard');
    } else if (view === 'api') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.remove('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('api-info');
    } else if (view === 'ai') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.remove('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('ai-models');
    } else if (view === 'agent-builder') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.remove('hidden');
      if (sideWork) sideWork.classList.add('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('agent-builder');
    } else if (view === 'work') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.remove('hidden');
      if (sideAdmin) sideAdmin.classList.add('hidden');
      this.switchSideNav('sap-terms');
    } else if (view === 'admin') {
      if (sideMain) sideMain.classList.add('hidden');
      if (sideApi) sideApi.classList.add('hidden');
      if (sideAi) sideAi.classList.add('hidden');
      if (sideWork) sideWork.classList.add('hidden');
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
    const viewAgentBuilder = document.getElementById('view-agent-builder');
    const viewIpWhitelist = document.getElementById('view-ip-whitelist');
    const viewIpBlacklist = document.getElementById('view-ip-blacklist');
    const viewIpLogs = document.getElementById('view-ip-logs');
    const viewBatchRegister = document.getElementById('view-batch-register');

    const hideAllViews = () => {
      if (viewDashboard) viewDashboard.classList.add('hidden');
      if (viewApiInfo) viewApiInfo.classList.add('hidden');
      if (viewAiModels) viewAiModels.classList.add('hidden');
      if (viewAiTerms) viewAiTerms.classList.add('hidden');
      if (viewSapTerms) viewSapTerms.classList.add('hidden');
      if (viewAgentBuilder) viewAgentBuilder.classList.add('hidden');
      if (viewIpWhitelist) viewIpWhitelist.classList.add('hidden');
      if (viewIpBlacklist) viewIpBlacklist.classList.add('hidden');
      if (viewIpLogs) viewIpLogs.classList.add('hidden');
      if (viewBatchRegister) viewBatchRegister.classList.add('hidden');
    };

    hideAllViews();

    if (sideView === 'dashboard') {
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
    } else if (sideView === 'agent-builder') {
      if (viewAgentBuilder) viewAgentBuilder.classList.remove('hidden');
      if (window.AgentBuilderView) {
        window.AgentBuilderView.init();
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
