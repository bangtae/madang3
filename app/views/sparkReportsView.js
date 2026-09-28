// app/views/sparkReportsView.js - Gemini Spark 경제/거시 보고서 뷰 & Threads 타래 발행
(function(window) {
  'use strict';

  const SparkReportsView = {
    initialized: false,
    currentData: null,
    selectedReportId: null,
    currentSummaryResult: null,

    isAdmin() {
      const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
      if (!rawUser) return false;
      try {
        const user = JSON.parse(rawUser);
        return Boolean(!user.isGuest && (user.role === '최고 관리자' || user.username === 'admin'));
      } catch (e) {
        return false;
      }
    },

    init() {
      if (this.initialized) {
        this.loadReports();
        return;
      }
      this.initialized = true;

      this.bindEvents();
      this.loadReports();
    },

    bindEvents() {
      // 1. Google Drive 즉시 수집 버튼
      const btnSync = document.getElementById('btn-spark-sync-drive');
      if (btnSync) {
        btnSync.addEventListener('click', () => this.handleDriveSync());
      }

      // 2. 설정 모달 열기
      const btnConfig = document.getElementById('btn-spark-open-config');
      if (btnConfig) {
        btnConfig.addEventListener('click', () => this.openConfigModal());
      }

      // 3. 설정 저장
      const formConfig = document.getElementById('form-spark-config');
      if (formConfig) {
        formConfig.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveConfig();
        });
      }

      // 4. 내용요약 4.1 AI 변환 버튼
      const btnSummarize = document.getElementById('btn-spark-run-summarize');
      if (btnSummarize) {
        btnSummarize.addEventListener('click', () => this.handleSummarize41());
      }

      // 5. 스레드 타래 발행 버튼
      const btnPublish = document.getElementById('btn-spark-publish-threads');
      if (btnPublish) {
        btnPublish.addEventListener('click', () => this.handlePublishThreads());
      }

      // 6. 기본 샘플 복원 버튼
      const btnResetSeed = document.getElementById('btn-spark-reset-seed');
      if (btnResetSeed) {
        btnResetSeed.addEventListener('click', () => this.handleResetSeed());
      }

      // 7. 모달 닫기 버튼들
      document.querySelectorAll('.spark-modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
          const modal = btn.closest('.spark-modal-backdrop');
          if (modal) modal.style.display = 'none';
        });
      });
    },

    async loadReports(forceRefresh = false) {
      const container = document.getElementById('spark-reports-container');
      if (!container) return;

      if (!this.currentData || forceRefresh) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <div class="spinner" style="margin: 0 auto 12px; width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            최신 Gemini Spark 경제·거시 보고서를 불러오는 중입니다...
          </div>
        `;
      }

      try {
        const res = await fetch('/api/spark-reports/latest');
        const json = await res.json();
        if (json.success && json.data) {
          this.currentData = json.data;
          this.renderView();
        } else {
          container.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 20px; color: #f87171; text-align: center;">
              보고서 데이터를 불러오지 못했습니다: ${json.error || '알 수 없는 오류'}
            </div>
          `;
        }
      } catch (e) {
        container.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 20px; color: #f87171; text-align: center;">
            통신 오류가 발생했습니다: ${e.message}
          </div>
        `;
      }
    },

    renderView() {
      const container = document.getElementById('spark-reports-container');
      if (!container || !this.currentData) return;

      const isAdm = this.isAdmin();
      const data = this.currentData;
      const reports = data.reports || [];
      const weekLabel = data.weekLabel || '주간 경제·거시 심층 보고서';
      const updatedDate = data.updatedAt ? new Date(data.updatedAt).toLocaleString('ko-KR') : '방금 전';

      // 선택된 보고서가 없으면 첫 번째 보고서 기본 선택
      if (!this.selectedReportId && reports.length > 0) {
        this.selectedReportId = reports[0].id;
      }
      const activeReport = reports.find(r => r.id === this.selectedReportId) || reports[0];

      let tabsHtml = '';
      reports.forEach(r => {
        const isActive = activeReport && r.id === activeReport.id;
        tabsHtml += `
          <button type="button" class="spark-report-tab ${isActive ? 'active' : ''}" data-report-id="${r.id}" style="
            display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: all 0.2s;
            background: ${isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.6)'};
            border: 1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'};
            color: ${isActive ? '#38bdf8' : '#cbd5e1'};
            font-size: 0.85rem; font-weight: ${isActive ? '700' : '500'}; white-space: nowrap; flex-shrink: 0;
          ">
            <span>${r.icon || '📄'}</span>
            <span>${r.categoryLabel || r.title}</span>
          </button>
        `;
      });

      const summarizeBtnHtml = isAdm
        ? `<button type="button" id="btn-spark-run-summarize" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.85rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; cursor: pointer; color: #fff; font-weight: 700; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            <span>🧵 핵심 요약 가공 &amp; 스레드 생성</span>
          </button>`
        : '';

      let contentHtml = '';
      if (activeReport) {
        contentHtml = `
          <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 24px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 16px; margin-bottom: 20px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                    ${activeReport.categoryLabel || '경제 지표'}
                  </span>
                  <span style="font-size: 0.8rem; color: #94a3b8;">수집 출처: Gemini Spark (자동 수집 완료)</span>
                </div>
                <h3 style="margin: 0; font-size: 1.3rem; color: #f8fafc; font-weight: 700;">
                  ${activeReport.icon || '📊'} ${activeReport.title}
                </h3>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${summarizeBtnHtml}
                <button type="button" id="btn-spark-copy-content" class="btn btn-secondary" style="padding: 8px 12px; font-size: 0.82rem; background: rgba(51, 65, 85, 0.8); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; cursor: pointer; color: #cbd5e1;">
                  📋 원문 복사
                </button>
              </div>
            </div>

            <div class="spark-markdown-body" style="font-size: 0.95rem; line-height: 1.7; color: #e2e8f0;">
              ${this.parseMarkdown(activeReport.content)}
            </div>
          </div>
        `;
      }

      const headerDesc = isAdm
        ? '매주 월요일 09시 Gemini Spark가 분석한 거시경제·금융·IT·부동산 보고서를 구글 드라이브에서 자동 수집하고 원본을 안전하게 완전 삭제합니다.'
        : 'Gemini Spark가 분석한 국내외 최신 거시경제·금융·IT·부동산 심층 지표를 열람할 수 있습니다.';

      const adminButtonsHtml = isAdm
        ? `<div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" id="btn-spark-sync-drive" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: #0284c7; border: none; border-radius: 8px; color: #fff; font-size: 0.88rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
              <span>⚡ Google Drive 즉시 수집</span>
            </button>
            <button type="button" id="btn-spark-open-config" class="btn btn-secondary" style="padding: 9px 14px; background: rgba(51, 65, 85, 0.8); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #cbd5e1; font-size: 0.88rem; cursor: pointer;">
              ⚙️ 연동 설정
            </button>
            <button type="button" id="btn-spark-reset-seed" class="btn btn-secondary" style="padding: 9px 12px; background: rgba(51, 65, 85, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #94a3b8; font-size: 0.82rem; cursor: pointer;" title="스크린샷 7개 기본 보고서로 복원">
              🔄 기본 복원
            </button>
          </div>`
        : '';

      container.innerHTML = `
        <!-- 상단 헤더 배너 -->
        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 14px; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700;">
                  ✨ Spark 주간 최신본 동기화
                </span>
                <span style="font-size: 0.8rem; color: #94a3b8;">마지막 갱신: <strong style="color: #cbd5e1;">${updatedDate}</strong></span>
              </div>
              <h2 style="margin: 0; font-size: 1.45rem; color: #f8fafc; font-weight: 800; letter-spacing: -0.5px;">
                📊 ${weekLabel}
              </h2>
              <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #94a3b8;">
                ${headerDesc}
              </p>
            </div>
            ${adminButtonsHtml}
          </div>
        </div>

        <!-- 보고서 탭 목록 -->
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px; -webkit-overflow-scrolling: touch;">
          ${tabsHtml}
        </div>

        <!-- 본문 리포트 상세 영역 -->
        ${contentHtml}

        <!-- 내용요약 4.1 & Threads 타래 모달 -->
        <div id="spark-summary-modal" class="spark-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); z-index: 9999; justify-content: center; align-items: center; padding: 12px;">
          <div style="background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; width: 100%; max-width: 760px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: rgba(30, 41, 59, 0.5);">
              <h3 style="margin: 0; font-size: 1.05rem; color: #f8fafc; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                <span>🧵</span> 스레드(Threads) 핵심 요약 프리뷰
              </h3>
              <button type="button" class="spark-modal-close" style="background: none; border: none; font-size: 1.6rem; color: #94a3b8; cursor: pointer; padding: 2px 8px; line-height: 1;">&times;</button>
            </div>

            <div id="spark-summary-modal-body" style="padding: 16px 18px; overflow-y: auto; flex: 1;">
              <!-- 동적 생성 -->
            </div>

            <!-- 모바일 최적화 세로 스택형 푸터 -->
            <div style="display: flex; flex-direction: column; gap: 10px; padding: 14px 18px; border-top: 1px solid rgba(255, 255, 255, 0.1); background: rgba(15, 23, 42, 0.95);">
              <div style="font-size: 0.78rem; color: #94a3b8; line-height: 1.4; text-align: center; background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                ⚠️ 1포스트당 5줄 기준 자동 분할 (5줄 초과 시 댓글 타래로 순차 등록)
              </div>
              <div style="display: flex; gap: 8px; width: 100%;">
                <button type="button" class="spark-modal-close btn btn-secondary" style="flex: 1; padding: 10px 14px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 600; text-align: center; background: rgba(51, 65, 85, 0.8); border: 1px solid rgba(255, 255, 255, 0.15); color: #cbd5e1;">닫기</button>
                <button type="button" id="btn-spark-publish-threads" class="btn btn-primary" style="flex: 2; padding: 10px 14px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #059669); border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); font-size: 0.88rem; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  🚀 스레드(Threads) 타래 일괄 발행
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 설정 모달 -->
        <div id="spark-config-modal" class="spark-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 9999; justify-content: center; align-items: center; padding: 20px;">
          <div style="background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); background: rgba(30, 41, 59, 0.5);">
              <h3 style="margin: 0; font-size: 1.15rem; color: #f8fafc; font-weight: 700;">⚙️ Gemini Spark & Drive 연동 설정</h3>
              <button type="button" class="spark-modal-close" style="background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer;">&times;</button>
            </div>
            <form id="form-spark-config" style="padding: 24px;">
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 6px; font-weight: 600;">Google Drive 전용 수집 폴더명</label>
                <input type="text" id="spark-cfg-folder-name" value="Madang_Spark_Drop" style="width: 100%; padding: 10px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f8fafc; font-size: 0.9rem;">
                <small style="color: #94a3b8; font-size: 0.78rem;">구글 드라이브 내에 생성한 폴더 이름 (기본값: Madang_Spark_Drop)</small>
              </div>
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 6px; font-weight: 600;">Google Drive 폴더 ID (선택)</label>
                <input type="text" id="spark-cfg-folder-id" placeholder="URL 끝부분의 33자리 고유 ID (선택 사항)" style="width: 100%; padding: 10px; background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #f8fafc; font-size: 0.9rem;">
              </div>
              <div style="margin-bottom: 20px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px;">
                <label style="display: flex; align-items: center; gap: 8px; color: #38bdf8; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                  <input type="checkbox" id="spark-cfg-auto-delete" checked style="width: 16px; height: 16px;">
                  <span>수집 완료 후 구글 드라이브 임시 파일 즉시 완전 삭제 (권장)</span>
                </label>
                <div style="margin-top: 4px; font-size: 0.78rem; color: #94a3b8;">
                  마당3 서버에 안전하게 저장된 직후 구글 드라이브의 원본 Docs/Sheets 임시 파일을 삭제하여 드라이브 용량을 깨끗하게 유지합니다.
                </div>
              </div>

              <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 14px; margin-bottom: 20px;">
                <div style="font-size: 0.82rem; font-weight: 700; color: #f8fafc; margin-bottom: 6px;">💡 Gemini Spark 프롬프트 추가 문구 팁:</div>
                <div style="font-size: 0.78rem; color: #cbd5e1; line-height: 1.5; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; user-select: all;">
                  "분석 완료 후 결과 보고서를 구글 드라이브의 'Madang_Spark_Drop' 폴더에 Google Docs 파일로 저장해줘."
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="spark-modal-close btn btn-secondary" style="padding: 8px 16px; border-radius: 8px; cursor: pointer;">취소</button>
                <button type="submit" class="btn btn-primary" style="padding: 8px 18px; border-radius: 8px; background: #0284c7; border: none; color: #fff; font-weight: 700; cursor: pointer;">저장하기</button>
              </div>
            </form>
          </div>
        </div>
      `;

      // 탭 클릭 이벤트 바인딩
      container.querySelectorAll('.spark-report-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const repId = tab.getAttribute('data-report-id');
          if (repId) {
            this.selectedReportId = repId;
            this.renderView();
          }
        });
      });

      // 복사 버튼 바인딩
      const btnCopy = document.getElementById('btn-spark-copy-content');
      if (btnCopy && activeReport) {
        btnCopy.addEventListener('click', () => {
          navigator.clipboard.writeText(activeReport.content).then(() => {
            alert('📋 보고서 원문 내용이 클립보드에 복사되었습니다.');
          });
        });
      }

      this.bindEvents();
    },

    // 간단한 마크다운 파서 (H2, H3, bold, list, hr 지원)
    parseMarkdown(text) {
      if (!text) return '';
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^### (.*$)/gim, '<h4 style="color: #38bdf8; margin: 18px 0 8px 0; font-size: 1.05rem; font-weight: 700;">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 style="color: #f1f5f9; margin: 24px 0 12px 0; font-size: 1.2rem; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px;">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 style="color: #f8fafc; margin: 28px 0 16px 0; font-size: 1.35rem; font-weight: 800;">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #38bdf8; font-weight: 700;">$1</strong>')
        .replace(/^- (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 4px; color: #cbd5e1;">$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 4px; color: #cbd5e1;">$1</li>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');
      return html;
    },

    async handleDriveSync() {
      const btn = document.getElementById('btn-spark-sync-drive');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Drive 수집 및 삭제 중...</span>';
      }

      try {
        const res = await fetch('/api/spark-reports/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.success) {
          alert(`🎉 ${data.message || 'Google Drive 수집이 완료되었습니다.'}`);
          await this.loadReports(true);
        } else {
          alert(`수집 실패: ${data.message || data.error || 'Google 연동 상태를 확인해주세요.'}`);
        }
      } catch (e) {
        alert('동기화 통신 오류: ' + e.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡ Google Drive 즉시 수집</span>';
        }
      }
    },

    async handleSummarize41() {
      const reports = this.currentData?.reports || [];
      const activeReport = reports.find(r => r.id === this.selectedReportId) || reports[0];
      if (!activeReport) return;

      const modal = document.getElementById('spark-summary-modal');
      const body = document.getElementById('spark-summary-modal-body');
      if (!modal || !body) return;

      modal.style.display = 'flex';
      body.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
          <div class="spinner" style="margin: 0 auto 12px; width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          '내용요약 4.1' 전문 큐레이터 엔진으로 거시 지표 분석 및 스레드 타래를 분할 중입니다...
        </div>
      `;

      try {
        const res = await fetch('/api/spark-reports/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: activeReport.id, target: '생뷰님' })
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.threadsThread)) {
          this.currentSummaryResult = data;
          this.renderThreadsPreview(data);
        } else {
          body.innerHTML = `<div style="color: #f87171; padding: 20px; text-align: center;">요약 생성 실패: ${data.message || data.error}</div>`;
        }
      } catch (e) {
        body.innerHTML = `<div style="color: #f87171; padding: 20px; text-align: center;">통신 오류: ${e.message}</div>`;
      }
    },

    renderThreadsPreview(data) {
      const body = document.getElementById('spark-summary-modal-body');
      if (!body) return;

      const threadPosts = data.threadsThread || [];
      let postsHtml = '';

      threadPosts.forEach((p, idx) => {
        const isRoot = idx === 0;
        postsHtml += `
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid ${isRoot ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 12px; padding: 16px; margin-bottom: 14px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="background: ${isRoot ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${isRoot ? '#818cf8' : '#34d399'}; border: 1px solid ${isRoot ? 'rgba(99, 102, 241, 0.4)' : 'rgba(16, 185, 129, 0.4)'}; padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">
                ${p.badge || `타래 ${idx + 1}`}
              </span>
              <span style="font-size: 0.75rem; color: ${p.charCount > 480 ? '#f87171' : '#94a3b8'};">
                ${p.charCount} / 500자 (안전 범위)
              </span>
            </div>
            <textarea class="spark-thread-edit" data-idx="${idx}" style="width: 100%; box-sizing: border-box; height: 110px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #f8fafc; font-size: 0.88rem; line-height: 1.5; padding: 10px; resize: vertical;">${p.text}</textarea>
          </div>
        `;
      });

      body.innerHTML = `
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 10px; padding: 12px 16px; margin-bottom: 18px; font-size: 0.85rem; color: #cbd5e1;">
          <strong style="color: #818cf8;">📌 핵심 요약 적용 완료:</strong> 1포스트당 5줄 기준으로 정돈되었습니다. 5줄 초과 시 댓글 타래로 순차 발행됩니다. 필요시 내용을 수정한 후 하단의 [발행] 버튼을 누르세요.
        </div>
        ${postsHtml}
      `;
    },

    async handlePublishThreads() {
      if (!this.currentSummaryResult || !Array.isArray(this.currentSummaryResult.threadsThread)) {
        alert('먼저 요약 생성을 진행해주세요.');
        return;
      }

      // 수정된 텍스트 반영
      const edits = document.querySelectorAll('.spark-thread-edit');
      edits.forEach(textarea => {
        const idx = parseInt(textarea.getAttribute('data-idx'), 10);
        if (this.currentSummaryResult.threadsThread[idx]) {
          this.currentSummaryResult.threadsThread[idx].text = textarea.value.trim();
          this.currentSummaryResult.threadsThread[idx].charCount = textarea.value.trim().length;
        }
      });

      const btn = document.getElementById('btn-spark-publish-threads');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ 스레드 타래 순차 등록 중...</span>';
      }

      try {
        const res = await fetch('/api/spark-reports/publish-threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadsThread: this.currentSummaryResult.threadsThread })
        });
        const data = await res.json();
        if (data.success) {
          alert(`🎉 ${data.message}\n(루트 포스트 ID: ${data.rootPostId || '등록 완료'})`);
          const modal = document.getElementById('spark-summary-modal');
          if (modal) modal.style.display = 'none';
        } else {
          alert(`발행 실패: ${data.message || data.error}`);
        }
      } catch (e) {
        alert('발행 통신 오류: ' + e.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '🚀 스레드(Threads) 타래 일괄 발행';
        }
      }
    },

    async openConfigModal() {
      const modal = document.getElementById('spark-config-modal');
      if (!modal) return;
      modal.style.display = 'flex';

      try {
        const res = await fetch('/api/spark-reports/config');
        const data = await res.json();
        if (data.success && data.config) {
          const cfg = data.config;
          const elName = document.getElementById('spark-cfg-folder-name');
          const elId = document.getElementById('spark-cfg-folder-id');
          const elDel = document.getElementById('spark-cfg-auto-delete');
          if (elName) elName.value = cfg.driveFolderName || 'Madang_Spark_Drop';
          if (elId) elId.value = cfg.driveFolderId || '';
          if (elDel) elDel.checked = cfg.autoDeleteAfterImport !== false;
        }
      } catch (e) {
        console.warn('[SparkReportsView] Config load fail:', e);
      }
    },

    async saveConfig() {
      const folderName = (document.getElementById('spark-cfg-folder-name')?.value || '').trim();
      const folderId = (document.getElementById('spark-cfg-folder-id')?.value || '').trim();
      const autoDelete = document.getElementById('spark-cfg-auto-delete')?.checked ?? true;

      try {
        const res = await fetch('/api/spark-reports/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driveFolderName: folderName,
            driveFolderId: folderId,
            autoDeleteAfterImport: autoDelete
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('🎉 Gemini Spark 연동 설정이 성공적으로 저장되었습니다.');
          const modal = document.getElementById('spark-config-modal');
          if (modal) modal.style.display = 'none';
        } else {
          alert('설정 저장 실패: ' + (data.message || data.error));
        }
      } catch (e) {
        alert('설정 저장 통신 오류: ' + e.message);
      }
    },

    async handleResetSeed() {
      if (!confirm('스크린샷의 7개 기본 경제·거시 보고서 데이터로 복원하시겠습니까?')) return;
      try {
        const res = await fetch('/api/spark-reports/reset-seed', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('🎉 7개 기본 보고서로 복원되었습니다.');
          await this.loadReports(true);
        }
      } catch (e) {
        alert('복원 오류: ' + e.message);
      }
    }
  };

  window.SparkReportsView = SparkReportsView;
})(window);
