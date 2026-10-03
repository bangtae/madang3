// app/views/threadsAgentView.js - AI 에이전트 정보 뷰 렌더러 (9대 에이전트 상태 모니터링 & 실행 제어)

window.ThreadsAgentView = {
  pollingTimer: null,

  init() {
    this.bindEvents();
    this.startAutoPolling();
  },

  startAutoPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(async () => {
      // 뷰가 활성화되어 있는 경우에만 주기적 백그라운드 갱신
      const container = document.getElementById('view-threads-agent');
      if (container && container.style.display !== 'none') {
        const model = window.ThreadsAgentModel;
        if (model && model.fetchSystemAgents) {
          await model.fetchSystemAgents();
          this.updateLiveBadgesOnly();
        }
      }
    }, 5000);
  },

  renderHeaderQuickBar(status, dDayInfo) {
    const badgeEl = document.getElementById('agent-header-status-badge');
    const ddayEl = document.getElementById('agent-header-dday-badge');

    const model = window.ThreadsAgentModel;
    const sysSum = model ? model.systemAgentsSummary : null;

    if (badgeEl) {
      if (sysSum && sysSum.totalCount > 0) {
        badgeEl.className = sysSum.runningCount > 0 ? 'agent-status-badge badge-running' : 'agent-status-badge badge-stopped';
        badgeEl.innerHTML = `<span class="status-dot"></span> 🤖 에이전트 ${sysSum.runningCount}/${sysSum.totalCount} 가동 중`;
      } else if (status.is_offline) {
        badgeEl.className = 'agent-status-badge badge-offline';
        badgeEl.innerHTML = '<span class="status-dot"></span> ⚠️ 오프라인';
      } else if (status.is_running) {
        badgeEl.className = 'agent-status-badge badge-running';
        badgeEl.innerHTML = '<span class="status-dot"></span> 🟢 가동 중';
      } else {
        badgeEl.className = 'agent-status-badge badge-stopped';
        badgeEl.innerHTML = '<span class="status-dot"></span> 🔴 정지됨';
      }
    }

    if (ddayEl) {
      if (dDayInfo.isExpired) {
        ddayEl.className = 'agent-dday-badge dday-expired';
        ddayEl.innerHTML = `⚠️ 토큰 만료됨 (D-0)`;
      } else if (dDayInfo.isWarning) {
        ddayEl.className = 'agent-dday-badge dday-warning';
        ddayEl.innerHTML = `⏳ Threads 토큰 D-${dDayInfo.dDay}`;
      } else {
        ddayEl.className = 'agent-dday-badge dday-normal';
        ddayEl.innerHTML = `🔑 Threads 토큰 D-${dDayInfo.dDay}`;
      }
      ddayEl.title = `토큰 만료 예정일: ${dDayInfo.expiryDateStr}`;
    }
  },

  async renderMainView() {
    const container = document.getElementById('view-threads-agent');
    if (!container) return;

    const model = window.ThreadsAgentModel;
    const status = model.agentStatus || {};
    const sapStatus = model.sapAgentStatus || {};
    const dDayInfo = model.getTokenDDay();
    const cfg = model.tokenConfig || {};
    const sapCfg = model.sapAgentConfig || {};

    const sysAgents = model.systemAgents || [];
    const getAgent = (id) => sysAgents.find(a => a.id === id) || { id, is_running: false, pid: null };

    // 12대 에이전트 인스턴스 매핑
    const agThreads = getAgent('threads');
    const agSap = getAgent('sap');
    const agSupervisor = getAgent('supervisor');
    const agLead = getAgent('lead_orchestrator');
    const agAiServiceUpdater = getAgent('ai_service_updater');
    const agTrendScout = getAgent('trend_scout');
    const agDebateWorker = getAgent('stock_debate_arena');
    const agDanka = getAgent('sub_danka');
    const agGrowth = getAgent('sub_growth');
    const agCautious = getAgent('sub_cautious');
    const agTechnical = getAgent('sub_technical');
    const agJurini = getAgent('sub_jurini');

    // 스케줄 & 배치 시간 메타 박스 HTML 렌더러 헬퍼
    const renderScheduleBox = (agent, defaultIntervalText, defaultNextRunText) => {
      const sch = agent.schedule || {};
      const intervalText = sch.interval_text || defaultIntervalText || '설정 정보 없음';
      const scheduleDetail = sch.schedule_detail || '';
      const lastDoneIso = agent.last_completed_iso;
      const lastDuration = agent.execution_duration;
      
      let lastDoneStr = '이력 없음';
      if (lastDoneIso) {
        try {
          const d = new Date(lastDoneIso);
          lastDoneStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
          if (lastDuration) {
            lastDoneStr += ` (소요 ${Math.round(lastDuration)}초)`;
          }
        } catch (e) {
          lastDoneStr = lastDoneIso;
        }
      }

      const nextRunStr = agent.next_run_time || defaultNextRunText || (sch.type === 'daemon' ? '상시 가동 (실시간)' : '온디맨드/스케줄 대기');

      return `
        <div class="agent-schedule-meta-box" style="background: rgba(15, 23, 42, 0.7); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); font-size: 0.78rem; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="color: #94a3b8; font-weight: 600;">⏱️ 스케줄 주기:</span>
            <span style="color: #38bdf8; font-weight: 700; text-align: right;">${intervalText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="color: #94a3b8; font-weight: 600;">🕒 직전 완료:</span>
            <span style="color: #cbd5e1; font-family: monospace;">${lastDoneStr}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="color: #94a3b8; font-weight: 600;">⏳ 다음 예정:</span>
            <span style="color: #a3e635; font-weight: 600;">${nextRunStr}</span>
          </div>
          ${scheduleDetail ? `<div style="font-size: 0.72rem; color: #64748b; margin-top: 2px; border-top: 1px dashed rgba(255,255,255,0.06); padding-top: 4px;">💡 ${scheduleDetail}</div>` : ''}
        </div>
      `;
    };

    const subCouncilList = [agDanka, agGrowth, agCautious, agTechnical, agJurini];
    const subCouncilRunningCount = subCouncilList.filter(a => a.is_running).length;

    // 입력창 포커스 중일 때는 전체 재렌더링 대신 상태 배지만 스마트 업데이트
    const activeEl = document.activeElement;
    if (activeEl && container.contains(activeEl) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      this.updateLiveBadgesOnly();
      return;
    }

    const sapBadgeClass = sapStatus.is_running || agSap.is_running 
      ? 'badge-running' 
      : (sapStatus.task_state === 'Ready' ? 'badge-ready' : (sapStatus.task_state === 'Disabled' ? 'badge-stopped' : 'badge-offline'));
    const sapBadgeText = sapStatus.is_running || agSap.is_running 
      ? `🟢 가동 중 ${agSap.pid ? `(PID: ${agSap.pid})` : ''}` 
      : (sapStatus.task_state === 'Ready' ? '⚪ 스케줄 대기 (Ready)' : (sapStatus.task_state === 'Disabled' ? '🔴 비활성화됨' : `⚠️ ${sapStatus.task_state || '정지됨'}`));

    container.innerHTML = `
      <div class="view-header">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2>🤖 AI 에이전트 정보</h2>
            <p>사내 12대 AI 에이전트의 실시간 가동 상태, Base URL, API 토큰 만료 정보 조회 및 온디맨드 분석 제어</p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span id="system-agents-summary-pill" class="agent-badge badge-running" style="font-size: 0.85rem; padding: 6px 14px;">
              🟢 12대 에이전트 중 <b>${model.systemAgentsSummary ? model.systemAgentsSummary.runningCount : 0}개</b> 가동 중
            </span>
            <button type="button" id="btn-agent-refresh-view" class="btn btn-secondary btn-sm" style="padding: 6px 12px;">🔄 전체 새로고침</button>
          </div>
        </div>
      </div>

      <!-- 하이브리드 듀얼 호스트 가동 상태 배너 -->
      <div class="host-hybrid-status-banner" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 18px;">
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🌐</span>
            <div>
              <div style="font-size: 0.88rem; font-weight: 700; color: #34d399;">GCP 클라우드 VM (24/7 상시 가동)</div>
              <div style="font-size: 0.74rem; color: #94a3b8;">1호 Threads AI 뉴스, 2호 SAP, 6호 트렌드 감시 상주</div>
            </div>
          </div>
          <span class="agent-badge badge-running" style="font-size: 0.75rem;">🟢 24/7 ONLINE</span>
        </div>
        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">💻</span>
            <div>
              <div style="font-size: 0.88rem; font-weight: 700; color: #38bdf8;">로컬 개발 노트북 (장 운영 배치)</div>
              <div style="font-size: 0.74rem; color: #94a3b8;">주식 총괄·끝장토론, AI업데이터, 5대 서브에이전트 전담</div>
            </div>
          </div>
          <span class="agent-badge ${agSupervisor.is_running || agLead.is_running ? 'badge-running' : 'badge-ready'}" style="font-size: 0.75rem;">
            ${agSupervisor.is_running || agLead.is_running ? '🟢 장중 연결됨' : '⚪ 대기/휴면'}
          </span>
        </div>
      </div>

      <!-- 에이전트 바로가기 퀵 네비게이션 -->
      <div class="agent-quick-nav-bar" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; padding: 10px 14px; background: rgba(15, 23, 42, 0.6); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); align-items: center;">
        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600;">⚡ 바로가기:</span>
        <a href="#card-threads-agent" class="btn btn-sm" style="font-size: 0.78rem; padding: 3px 8px; text-decoration: none; border: 1px solid rgba(16, 185, 129, 0.6); color: #34d399; font-weight: 700; background: rgba(16, 185, 129, 0.15);">🌐 1호 Threads</a>
        <a href="#card-sap-agent" class="btn btn-sm" style="font-size: 0.78rem; padding: 3px 8px; text-decoration: none; border: 1px solid rgba(16, 185, 129, 0.6); color: #34d399; font-weight: 700; background: rgba(16, 185, 129, 0.15);">🌐 2호 SAP</a>
        <a href="#card-supervisor-agent" class="btn btn-sm btn-outline" style="font-size: 0.78rem; padding: 3px 8px; text-decoration: none;">3호 감독관</a>
        <a href="#card-lead-agent" class="btn btn-sm btn-outline" style="font-size: 0.78rem; padding: 3px 8px; text-decoration: none;">4호 메인주식</a>
        <a href="#card-ai-service-updater-agent" class="btn btn-sm" style="font-size: 0.78rem; padding: 3px 10px; text-decoration: none; border: 1px solid rgba(56, 189, 248, 0.6); color: #38bdf8; font-weight: 700; background: rgba(56, 189, 248, 0.15);">🤖 5호 AI Service</a>
        <a href="#card-trend-scout-agent" class="btn btn-sm" style="font-size: 0.78rem; padding: 3px 10px; text-decoration: none; border: 1px solid rgba(16, 185, 129, 0.6); color: #34d399; font-weight: 700; background: rgba(16, 185, 129, 0.15);">🌐 6호 트렌드 감시</a>
        <a href="#card-debate-worker-agent" class="btn btn-sm" style="font-size: 0.78rem; padding: 3px 10px; text-decoration: none; border: 1px solid rgba(244, 63, 94, 0.6); color: #fb7185; font-weight: 700; background: rgba(244, 63, 94, 0.15);">⚔️ 7호 끝장토론 워커</a>
        <a href="#card-sub-council-group" class="btn btn-sm btn-outline" style="font-size: 0.78rem; padding: 3px 8px; text-decoration: none;">8호 5대 서브에이전트</a>
      </div>

      <!-- 모듈형 에이전트 카드 그리드 -->
      <div class="agent-cards-grid">
        
        <!-- 1호: Threads AI 뉴스 에이전트 카드 -->
        <div class="card agent-card agent-module-card" id="card-threads-agent" style="border: 1px solid rgba(16, 185, 129, 0.3);">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 1.4rem;">📰</span>
                <h3 class="card-title" style="margin: 0;">1호: Threads AI 뉴스 에이전트</h3>
                <span class="agent-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.72rem;">🌐 GCP Cloud (24/7)</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">실시간 증시 뉴스·공시 요약 브리핑 및 Threads 자동 포스팅</p>
            </div>
            <span id="threads-card-badge" class="agent-badge ${agThreads.is_running ? 'badge-running' : (status.is_running ? 'badge-running' : 'badge-stopped')}">
              ${agThreads.is_running ? `🟢 가동 중 (PID: ${agThreads.pid || '-'})` : (status.is_running ? '🟢 가동 중' : '🔴 정지됨')}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- 스케줄 및 배치 시간 정보 메타 박스 -->
            ${renderScheduleBox(agThreads, '상시 데몬 (실시간 감시)', '상시 가동 (실시간)')}

            <!-- 온디맨드 뉴스 브리핑 즉시 실행 -->
            <div class="agent-control-box">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <label style="font-size: 0.82rem; color: #cbd5e1; font-weight: 600; margin: 0;">⚡ 뉴스 수집 &amp; 브리핑 발행</label>
                <button type="button" id="btn-threads-trigger" class="btn btn-outline btn-sm" style="padding: 6px 14px; font-size: 0.82rem;" title="1회 즉시 수집 및 브리핑 발행">
                  ⚡ 즉시 트리거
                </button>
              </div>
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 0;">

            <!-- Base URL 및 실시간 Ping 테스트 -->
            <div>
              <label style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
                <span>🌐 에이전트 Base URL</span>
                <span id="threads-ping-result" class="ping-badge" style="display: none;"></span>
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="token-agent-url" class="form-control" style="font-size: 0.84rem; padding: 7px 10px; flex: 1;" value="${cfg.agentBaseUrl || 'http://127.0.0.1:8000'}" placeholder="예: http://127.0.0.1:8000">
                <button type="button" id="btn-threads-ping" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-size: 0.8rem; padding: 0 12px;">
                  🔗 Ping 테스트
                </button>
              </div>
            </div>

            <!-- Threads API 토큰 60일 만료 관리 섹션 -->
            <div class="agent-token-section">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 0.82rem; color: #cbd5e1; font-weight: 600;">
                  <span>🔑 API 토큰 60일 만료 관리</span>
                </label>
                <span class="${dDayInfo.isWarning ? 'agent-badge dday-warning' : 'agent-badge dday-normal'}" style="font-size: 0.74rem; padding: 2px 8px;">
                  ${dDayInfo.isExpired ? '⚠️ 토큰 만료됨' : `D-${dDayInfo.dDay}일`}
                </span>
              </div>
              <form id="form-token-config" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 2px; display: block;">발급 일자</label>
                    <input type="date" id="token-issued-date" class="form-control" style="font-size: 0.8rem; padding: 5px 8px;" value="${cfg.tokenIssuedDate || ''}">
                  </div>
                  <div>
                    <label style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 2px; display: block;">유효 기간(일)</label>
                    <input type="number" id="token-valid-days" class="form-control" style="font-size: 0.8rem; padding: 5px 8px;" value="${cfg.validDays || 60}" min="1" max="180">
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn-sm" style="padding: 6px 10px; font-size: 0.8rem;">
                  💾 토큰 설정 저장
                </button>
              </form>
            </div>

            <!-- 통계 요약 -->
            <div style="background: rgba(15, 23, 42, 0.5); padding: 8px 12px; border-radius: 6px; font-size: 0.78rem; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>수집 기사: <b style="color: #38bdf8;">${status.statistics ? (status.statistics.total_articles_crawled || 0) : 0}건</b></div>
              <div>발행 포스트: <b style="color: #34d399;">${status.statistics ? (status.statistics.total_posts_generated || 0) : 0}건</b></div>
            </div>
          </div>
        </div>

        <!-- 2호: SAP Integration Suite 에이전트 카드 -->
        <div class="card agent-card agent-module-card" id="card-sap-agent" style="border: 1px solid rgba(16, 185, 129, 0.3);">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 1.4rem;">⚙️</span>
                <h3 class="card-title" style="margin: 0; color: #34d399;">2호: SAP Integration Suite 에이전트</h3>
                <span class="agent-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.72rem;">🌐 GCP Cloud (12시간 배치)</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">SCN 커뮤니티 및 공식 뉴스 피드 자동 수집 &amp; 포털 동기화 데몬</p>
            </div>
            <span id="sap-card-badge" class="agent-badge ${sapBadgeClass}">
              ${sapBadgeText}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- 스케줄 및 배치 시간 정보 메타 박스 -->
            ${renderScheduleBox(agSap, '12시간 주기 (하루 2회: 09:00, 21:00 KST)', agSap.next_run_time || sapStatus.next_run_time)}

            <!-- 온디맨드 뉴스 즉시 수집 -->
            <div class="agent-control-box">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <label style="font-size: 0.82rem; color: #cbd5e1; font-weight: 600; margin: 0;">⚡ SAP 뉴스 피드 동기화</label>
                <button type="button" id="btn-sap-trigger" class="btn btn-outline btn-sm" style="padding: 6px 14px; font-size: 0.82rem;" title="1회 즉시 뉴스 피드 수집">
                  ⚡ 즉시 수집
                </button>
              </div>
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 0;">

            <!-- Base URL 및 실시간 Ping 테스트 -->
            <div>
              <label style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
                <span>🌐 포털 Base URL</span>
                <span id="sap-ping-result" class="ping-badge" style="display: none;"></span>
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="sap-agent-url" class="form-control" style="font-size: 0.84rem; padding: 7px 10px; flex: 1;" value="${sapCfg.agentBaseUrl || 'http://127.0.0.1:8080'}" placeholder="예: http://127.0.0.1:8080">
                <button type="button" id="btn-sap-ping" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-size: 0.8rem; padding: 0 12px;">
                  🔗 Ping 테스트
                </button>
              </div>
            </div>

            <!-- SAP 에이전트 파라미터 폼 -->
            <form id="form-sap-config" style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <label style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 2px; display: block;">수집 주기 (분, 720 = 하루 2회)</label>
                  <input type="number" id="sap-agent-interval" class="form-control" style="font-size: 0.8rem; padding: 5px 8px;" value="${sapCfg.intervalMinutes || 720}" min="5" max="1440">
                </div>
                <div>
                  <label style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 2px; display: block;">스케줄러 작업명</label>
                  <input type="text" class="form-control" style="font-size: 0.8rem; padding: 5px 8px; background: rgba(255,255,255,0.04); color: #94a3b8;" value="${sapCfg.taskName || 'SAPIntegrationSuiteAgent'}" readonly>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-sm" style="padding: 6px 10px; font-size: 0.8rem;">
                💾 SAP 에이전트 설정 저장
              </button>
            </form>

            <!-- 통계 요약 -->
            <div style="background: rgba(15, 23, 42, 0.5); padding: 8px 12px; border-radius: 6px; font-size: 0.78rem; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>수집 뉴스: <b id="sap-stat-news" style="color: #38bdf8;">${sapStatus.total_news_count || 0}건</b></div>
              <div>다음 실행: <span id="sap-stat-next" style="color: #cbd5e1;">${agSap.next_run_time || sapStatus.next_run_time || '로그온 시 / 대기'}</span></div>
            </div>
          </div>
        </div>

        <!-- 3호: AI 통합 감독관 (Supervisor & Watchdog) 카드 -->
        <div class="card agent-card agent-module-card" id="card-supervisor-agent">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 1.4rem;">🛡️</span>
                <h3 class="card-title" style="margin: 0;">3호: AI 통합 감독관 (Supervisor)</h3>
                <span class="agent-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.72rem;">💻 로컬 노트북</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">주식 서브에이전트단 감시·자동 복구(Watchdog) 및 텔레그램 경보 총괄</p>
            </div>
            <span id="badge-agent-supervisor" class="agent-badge ${agSupervisor.is_running ? 'badge-running' : 'badge-stopped'}">
              ${agSupervisor.is_running ? `🟢 가동 중 (PID: ${agSupervisor.pid || '-'})` : '🔴 정지됨'}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- 스케줄 및 배치 시간 정보 메타 박스 -->
            ${renderScheduleBox(agSupervisor, '5초 감시 / 60분 정기 브리핑', '상시 가동 (실시간)')}

            <div style="background: rgba(15, 23, 42, 0.5); padding: 12px; border-radius: 8px; font-size: 0.8rem; line-height: 1.6; color: #94a3b8;">
              <div style="margin-bottom: 4px;"><span style="color: #cbd5e1; font-weight: 600;">📌 실행 위치:</span> <code>madang6/agent_supervisor/main.py</code></div>
              <div style="margin-bottom: 4px;"><span style="color: #cbd5e1; font-weight: 600;">📌 주요 역할:</span> 5대 서브에이전트 비정상 종료 시 자동 재기동, 실시간 헬스체크</div>
              <div><span style="color: #cbd5e1; font-weight: 600;">📌 알림 채널:</span> 텔레그램 실시간 이상 탐지 및 상태 보고 브로드캐스트</div>
            </div>
          </div>
        </div>

        <!-- 4호: 메인 주식 총괄 에이전트 (Lead Orchestrator) 카드 -->
        <div class="card agent-card agent-module-card" id="card-lead-agent">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 1.4rem;">📈</span>
                <h3 class="card-title" style="margin: 0;">4호: 메인 주식 &amp; 가상자산 총괄 에이전트 (Lead)</h3>
                <span class="agent-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.72rem;">💻 로컬 / 클라우드</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">증시 지표 감시, 빗썸 코인 10대 소스 멀티팩터 심의 및 1개 종목 10만원 분할 스윙 최종 의결</p>
            </div>
            <span id="badge-agent-lead_orchestrator" class="agent-badge ${agLead.is_running ? 'badge-running' : 'badge-stopped'}">
              ${agLead.is_running ? `🟢 가동 중 (PID: ${agLead.pid || '-'})` : '🔴 정지됨'}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- 스케줄 및 배치 시간 정보 메타 박스 -->
            ${renderScheduleBox(agLead, '평일 장중 1시간 주기 배치', agLead.next_run_time || '평일 장중 1시간 주기')}

            <div style="background: rgba(15, 23, 42, 0.5); padding: 12px; border-radius: 8px; font-size: 0.8rem; line-height: 1.6; color: #94a3b8;">
              <div style="margin-bottom: 4px;"><span style="color: #cbd5e1; font-weight: 600;">📌 실행 위치:</span> <code>madang6/메인주식총괄에이전트/main.py --interval 60</code></div>
              <div style="margin-bottom: 4px;"><span style="color: #cbd5e1; font-weight: 600;">📌 탐색 모드:</span> 60초 주기 자동 순환 시장 분석 및 합의 도출</div>
              <div><span style="color: #cbd5e1; font-weight: 600;">📌 데이터 연동:</span> <code>data/stockCouncilReports.json</code> 자동 합성</div>
            </div>
          </div>
        </div>

        <!-- 5호: AI 서비스 정보 업데이트 에이전트 (AI Service Update Agent) 카드 -->
        <div class="card agent-card agent-module-card agent-card-wide" id="card-ai-service-updater-agent" style="grid-column: 1 / -1; border: 1.5px solid rgba(56, 189, 248, 0.45); background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.9)); box-shadow: 0 4px 20px rgba(56, 189, 248, 0.12);">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.6rem; padding: 6px; background: rgba(56, 189, 248, 0.15); border-radius: 8px;">🤖</span>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <h3 class="card-title" style="margin: 0; font-size: 1.15rem; color: #38bdf8;">5호: AI 서비스 정보 업데이트 에이전트 (AI Service Update Agent)</h3>
                    <span class="agent-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.72rem;">💻 로컬 노트북</span>
                  </div>
                  <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: #94a3b8;">
                    포털 등록 AI 모델 9대 핵심 스펙 실시간 팩트체크, 웹 검증 및 Supabase 클라우드/텔레그램 동기화 데몬
                  </p>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="ai-updater-card-badge" class="agent-badge ${agAiServiceUpdater.is_running ? 'badge-running' : 'badge-stopped'}" style="font-size: 0.85rem; padding: 6px 12px;">
                ${agAiServiceUpdater.is_running ? `🟢 가동 중 (PID: ${agAiServiceUpdater.pid || '-'})` : '🔴 정지됨'}
              </span>
            </div>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px; padding-top: 14px;">
            <!-- 스케줄 및 배치 시간 정보 메타 박스 -->
            ${renderScheduleBox(agAiServiceUpdater, '매월 1일 시작 ➔ 1시간 주기 순회', agAiServiceUpdater.next_run_time || '익월 1일 00:00 KST')}

            <div class="agent-meta-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 실행 스크립트</span>
                <div style="font-size: 0.85rem; font-family: monospace; color: #38bdf8; margin-top: 3px;">ai_service_updater.py</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 작업 디렉터리</span>
                <div style="font-size: 0.85rem; font-family: monospace; color: #cbd5e1; margin-top: 3px;">C:\Users\bangt\Downloads\madang6</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 실행 모드</span>
                <div style="font-size: 0.85rem; color: #a3e635; margin-top: 3px;">1시간 주기 백그라운드 순회 / 온디맨드 1회 즉시 실행</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 동기화 타겟</span>
                <div style="font-size: 0.85rem; color: #facc15; margin-top: 3px;">Supabase ai_services & 텔레그램 실시간 리포트</div>
              </div>
            </div>

            <!-- 제어 버튼 액션 바 -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <button type="button" id="btn-start-ai-updater" class="btn btn-primary btn-sm" ${agAiServiceUpdater.is_running ? 'disabled' : ''}>
                ▶️ 데몬 가동
              </button>
              <button type="button" id="btn-stop-ai-updater" class="btn btn-outline btn-sm" ${!agAiServiceUpdater.is_running ? 'disabled' : ''}>
                ⏹️ 데몬 정지
              </button>
              <button type="button" id="btn-trigger-ai-updater" class="btn btn-secondary btn-sm" style="background: rgba(56, 189, 248, 0.18); border: 1px solid rgba(56, 189, 248, 0.45); color: #38bdf8; font-weight: 700;">
                ⚡ 즉시 1회 팩트체크 & 업데이트 실행
              </button>
            </div>

            <div id="ai-updater-action-status" class="debate-status-alert hidden" style="display: none; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem;"></div>
          </div>
        </div>

        <!-- 6호: 국내/해외 검색·트렌드 1순위 감시 에이전트 (Trend Scout Agent) -->
        <div class="card agent-card agent-module-card" id="card-trend-scout-agent" style="border: 1px solid rgba(16, 185, 129, 0.3);">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid rgba(245, 158, 11, 0.2); padding-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-size: 1.6rem; padding: 6px; background: rgba(245, 158, 11, 0.15); border-radius: 8px;">🔥</span>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <h3 class="card-title" style="margin: 0; font-size: 1.15rem; color: #fbbf24;">6호: 검색·트렌드 1순위 감시 에이전트 (Trend Scout)</h3>
                    <span class="agent-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.72rem;">🌐 GCP Cloud (24/7)</span>
                  </div>
                  <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: #94a3b8;">
                    국내/해외 17개 핵심 검색·트렌드 소스 1순위 변동 1시간 주기 감시, 텔레그램 다이제스트 발송 및 포털 동기화
                  </p>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="trend-scout-card-badge" class="agent-badge ${agTrendScout.is_running ? 'badge-running' : 'badge-stopped'}" style="font-size: 0.85rem; padding: 6px 12px;">
                ${agTrendScout.is_running ? `🟢 가동 중 (PID: ${agTrendScout.pid || '-'})` : '🔴 정지됨'}
              </span>
            </div>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px; padding-top: 14px;">
            <!-- 스케줄 및 배치 시간 정보 메타 박스 -->
            ${renderScheduleBox(agTrendScout, '1시간 주기 순회 (1순위 변동 시 알림)', agTrendScout.next_run_time || '1시간 주기 순회')}

            <div class="agent-meta-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 실행 스크립트</span>
                <div style="font-size: 0.85rem; font-family: monospace; color: #fbbf24; margin-top: 3px;">trend_scout_agent.py</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 작업 디렉터리</span>
                <div style="font-size: 0.85rem; font-family: monospace; color: #cbd5e1; margin-top: 3px;">C:\Users\bangt\Downloads\madang6</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 실행 모드</span>
                <div style="font-size: 0.85rem; color: #a3e635; margin-top: 3px;">1시간 주기 정기 순회 / 온디맨드 즉시 실행</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 동기화 타겟</span>
                <div style="font-size: 0.85rem; color: #facc15; margin-top: 3px;">텔레그램 실시간 알림 & data/trend_scout_latest.json</div>
              </div>
            </div>

            <!-- 제어 버튼 액션 바 -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <button type="button" id="btn-start-trend-scout" class="btn btn-primary btn-sm" ${agTrendScout.is_running ? 'disabled' : ''}>
                ▶️ 데몬 가동
              </button>
              <button type="button" id="btn-stop-trend-scout" class="btn btn-outline btn-sm" ${!agTrendScout.is_running ? 'disabled' : ''}>
                ⏹️ 데몬 정지
              </button>
              <button type="button" id="btn-trigger-trend-scout" class="btn btn-secondary btn-sm" style="background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.45); color: #fbbf24; font-weight: 700;">
                ⚡ 즉시 1회 트렌드 수집 &amp; 알림 실행
              </button>
              <button type="button" id="btn-goto-trend-menu" class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); margin-left: auto;">
                🌐 실시간 트렌드 바로가기 &rarr;
              </button>
            </div>

            <div id="trend-scout-action-status" class="debate-status-alert hidden" style="display: none; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem;"></div>
          </div>
        </div>

        <!-- 7호: AI 끝장 토론실 정기 소집 에이전트 (Debate Arena Worker) -->
        <div class="card agent-card agent-module-card" id="card-debate-worker-agent">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid rgba(244, 63, 94, 0.2); padding-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.6rem; padding: 6px; background: rgba(244, 63, 94, 0.15); border-radius: 8px;">⚔️</span>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <h3 class="card-title" style="margin: 0; font-size: 1.15rem; color: #fb7185;">7호: AI 끝장 토론실 정기 소집 워커 (주식 &amp; 코인 24/7)</h3>
                    <span class="agent-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.72rem;">💻 로컬 / 클라우드</span>
                  </div>
                  <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: #94a3b8;">
                    Next장·정규장·미국장 개장 30분 전 주식 토론 및 24시간 빗썸 코인 12턴 난타전 자동 소집/기록
                  </p>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="debate-worker-card-badge" class="agent-badge ${agDebateWorker.is_running ? 'badge-running' : 'badge-stopped'}" style="font-size: 0.85rem; padding: 6px 12px;">
                ${agDebateWorker.is_running ? `🟢 가동 중 (PID: ${agDebateWorker.pid || '-'})` : '🔴 정지됨'}
              </span>
            </div>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px; padding-top: 14px;">
            <!-- 스케줄 및 배치 시간 정보 메타 박스 -->
            ${renderScheduleBox(agDebateWorker, '개장 30분 전 및 1시간 주기 배치', agDebateWorker.next_run_time || 'Next장/정규장/미국장 개장 30분 전')}

            <div class="agent-meta-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 실행 스크립트</span>
                <div style="font-size: 0.85rem; font-family: monospace; color: #fb7185; margin-top: 3px;">hourly_debate_worker.py</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 작업 디렉터리</span>
                <div style="font-size: 0.85rem; font-family: monospace; color: #cbd5e1; margin-top: 3px;">C:\Users\bangt\Downloads\madang6</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 실행 모드</span>
                <div style="font-size: 0.85rem; color: #a3e635; margin-top: 3px;">개장 30분 전 및 1시간 주기 배치 / 온디맨드 1회 즉시 실행</div>
              </div>
              <div class="meta-item">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📌 연동 타겟</span>
                <div style="font-size: 0.85rem; color: #facc15; margin-top: 3px;">텔레그램 끝장토론 브리핑 & data/stockCouncilReports.json</div>
              </div>
            </div>

            <!-- 제어 버튼 액션 바 -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <button type="button" id="btn-start-debate-worker" class="btn btn-primary btn-sm" ${agDebateWorker.is_running ? 'disabled' : ''}>
                ▶️ 데몬 가동
              </button>
              <button type="button" id="btn-stop-debate-worker" class="btn btn-outline btn-sm" ${!agDebateWorker.is_running ? 'disabled' : ''}>
                ⏹️ 데몬 정지
              </button>
              <button type="button" id="btn-trigger-debate-worker" class="btn btn-secondary btn-sm" style="background: rgba(244, 63, 94, 0.18); border: 1px solid rgba(244, 63, 94, 0.45); color: #fb7185; font-weight: 700;">
                ⚡ 즉시 1회 끝장토론 자동 실행
              </button>
              <button type="button" id="btn-goto-debate-arena-menu" class="btn btn-outline btn-sm" style="color: #f43f5e; border-color: rgba(244, 63, 94, 0.4); margin-left: auto;">
                🔥 AI 끝장 토론실 바로가기 &rarr;
              </button>
            </div>

            <div id="debate-worker-action-status" class="debate-status-alert hidden" style="display: none; padding: 10px 14px; border-radius: 6px; font-size: 0.85rem;"></div>
          </div>
        </div>

        <!-- 8호: 5대 주식 & 코인 전문 분석단 통합 모듈 카드 -->
        <div class="card agent-card agent-module-card agent-card-wide" id="card-sub-council-group" style="grid-column: 1 / -1;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 1.5rem;">🏛️</span>
                <h3 class="card-title" style="margin: 0;">8호: 5대 주식 &amp; 코인 전문 분석단 정보 및 상태 모니터링</h3>
                <span class="agent-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.72rem;">💻 로컬 / 클라우드</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: #94a3b8;">
                단가 · 성장론자 · 신중론자 · 기술적분석가 · 주린이 5인의 주식 심의 및 24시간 빗썸 코인 10대 소스 멀티팩터 분석 프로세스 모니터링
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="sub-council-overall-badge" class="agent-badge ${subCouncilRunningCount === 5 ? 'badge-running' : (subCouncilRunningCount > 0 ? 'badge-warning' : 'badge-stopped')}">
                ${subCouncilRunningCount === 5 ? '🟢 5인 전원 가동 중' : (subCouncilRunningCount > 0 ? `🟡 ${subCouncilRunningCount}/5인 가동 중` : '🔴 5인 전원 정지됨')}
              </span>
            </div>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 18px;">
            
            <!-- 5인 에이전트 상태 정보 리스트 -->
            <div class="sub-agents-control-table" style="display: flex; flex-direction: column; gap: 10px;">
              ${[
                { id: 'sub_danka', name: '단가 분석 에이전트', icon: '⚖️', desc: '적정 단가 및 가치 평가 심의 (주식 & 코인 유통비율·밸류)', agent: agDanka },
                { id: 'sub_growth', name: '성장론자 에이전트', icon: '🚀', desc: '미래 성장 모멘텀 및 핫섹터(AI/L1/DeFi) 자금 유입 분석', agent: agGrowth },
                { id: 'sub_cautious', name: '신중론자 에이전트', icon: '🛡️', desc: '다운사이드 리스크 및 김프·펀딩비 절대 거부권(VETO)', agent: agCautious },
                { id: 'sub_technical', name: '기술적분석가 에이전트', icon: '📊', desc: '차트 지지선, RSI, 숏스퀴즈 수급 및 손익비(TP/SL) 타점', agent: agTechnical },
                { id: 'sub_jurini', name: '주린이 에이전트', icon: '🌱', desc: '초보자 관점 직관성, 코인판 개미 심리 및 뇌동매매 방지', agent: agJurini }
              ].map(item => `
                <div class="sub-agent-row" id="row-${item.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); gap: 12px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                    <span style="font-size: 1.5rem;">${item.icon}</span>
                    <div>
                      <div style="font-weight: 600; font-size: 0.9rem; color: #f1f5f9;">${item.name}</div>
                      <div style="font-size: 0.76rem; color: #94a3b8;">${item.desc}</div>
                      <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 3px;">
                        ⏱️ 스케줄: 온디맨드 호출 / 끝장 토론 소집 시 실시간 가동
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
                    <span id="badge-agent-${item.id}" class="agent-badge ${item.agent.is_running ? 'badge-running' : 'badge-stopped'}" style="font-size: 0.78rem; padding: 4px 10px;">
                      ${item.agent.is_running ? `🟢 가동 중 (PID: ${item.agent.pid || '-'})` : '🔴 정지됨'}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>

          </div>
        </div>

      </div>
    `;

    this.bindViewEvents();
  },

  updateLiveBadgesOnly() {
    const model = window.ThreadsAgentModel;
    if (!model) return;

    const sysAgents = model.systemAgents || [];
    const getAgent = (id) => sysAgents.find(a => a.id === id) || { id, is_running: false, pid: null };

    // 1. 전체 상단 뱃지 갱신
    const summaryPill = document.getElementById('system-agents-summary-pill');
    if (summaryPill && model.systemAgentsSummary) {
      summaryPill.innerHTML = `🟢 12대 에이전트 중 <b>${model.systemAgentsSummary.runningCount}개</b> 가동 중`;
    }

    // 2. 개별 에이전트 뱃지 및 버튼 활성/비활성 상태 갱신
    sysAgents.forEach(agent => {
      const badge = document.getElementById(`badge-agent-${agent.id}`);
      if (badge) {
        badge.className = `agent-badge ${agent.is_running ? 'badge-running' : 'badge-stopped'}`;
        badge.textContent = agent.is_running ? `🟢 가동 중 (PID: ${agent.pid || '-'})` : '🔴 정지됨';
      }
    });

    // 3. Threads 카드 전용 뱃지
    const thAgent = getAgent('threads');
    const thBadge = document.getElementById('threads-card-badge');
    if (thBadge) {
      thBadge.className = `agent-badge ${thAgent.is_running ? 'badge-running' : 'badge-stopped'}`;
      thBadge.textContent = thAgent.is_running ? `🟢 가동 중 (PID: ${thAgent.pid || '-'})` : '🔴 정지됨';
    }

    // 4. SAP 카드 전용 뱃지
    const sapAgent = getAgent('sap');
    const sapBadge = document.getElementById('sap-card-badge');
    if (sapBadge) {
      sapBadge.className = `agent-badge ${sapAgent.is_running ? 'badge-running' : 'badge-stopped'}`;
      sapBadge.textContent = sapAgent.is_running ? `🟢 가동 중 (PID: ${sapAgent.pid || '-'})` : '🔴 정지됨';
    }

    // 5. 5대 서브에이전트 종합 뱃지
    const subCouncilIds = ['sub_danka', 'sub_growth', 'sub_cautious', 'sub_technical', 'sub_jurini'];
    const runningSubCount = subCouncilIds.filter(id => getAgent(id).is_running).length;
    const councilOverallBadge = document.getElementById('sub-council-overall-badge');
    if (councilOverallBadge) {
      councilOverallBadge.className = `agent-badge ${runningSubCount === 5 ? 'badge-running' : (runningSubCount > 0 ? 'badge-warning' : 'badge-stopped')}`;
      councilOverallBadge.textContent = runningSubCount === 5 ? '🟢 5인 전원 가동 중' : (runningSubCount > 0 ? `🟡 ${runningSubCount}/5인 가동 중` : '🔴 5인 전원 정지됨');
    }

    // 6. AI 서비스 업데이트 에이전트 카드 뱃지
    const aiUpdaterAgent = getAgent('ai_service_updater');
    const aiUpdaterBadge = document.getElementById('ai-updater-card-badge');
    if (aiUpdaterBadge) {
      aiUpdaterBadge.className = `agent-badge ${aiUpdaterAgent.is_running ? 'badge-running' : 'badge-stopped'}`;
      aiUpdaterBadge.textContent = aiUpdaterAgent.is_running ? `🟢 가동 중 (PID: ${aiUpdaterAgent.pid || '-'})` : '🔴 정지됨';
    }

    // 7. 트렌드 감시 에이전트 카드 뱃지
    const trendAgent = getAgent('trend_scout');
    const trendBadge = document.getElementById('trend-scout-card-badge');
    if (trendBadge) {
      trendBadge.className = `agent-badge ${trendAgent.is_running ? 'badge-running' : 'badge-stopped'}`;
      trendBadge.textContent = trendAgent.is_running ? `🟢 가동 중 (PID: ${trendAgent.pid || '-'})` : '🔴 정지됨';
    }

    // 8. 끝장토론 워커 에이전트 카드 뱃지
    const debateWorkerAgent = getAgent('stock_debate_arena');
    const debateWorkerBadge = document.getElementById('debate-worker-card-badge');
    if (debateWorkerBadge) {
      debateWorkerBadge.className = `agent-badge ${debateWorkerAgent.is_running ? 'badge-running' : 'badge-stopped'}`;
      debateWorkerBadge.textContent = debateWorkerAgent.is_running ? `🟢 가동 중 (PID: ${debateWorkerAgent.pid || '-'})` : '🔴 정지됨';
    }
  },

  bindEvents() {
    // 공통 이벤트 바인딩
  },

  bindViewEvents() {
    const model = window.ThreadsAgentModel;
    if (!model) return;

    // --- 1호 Threads 에이전트 Ping 및 설정 ---
    const btnThreadsPing = document.getElementById('btn-threads-ping');
    if (btnThreadsPing) {
      btnThreadsPing.addEventListener('click', async () => {
        const urlInput = document.getElementById('token-agent-url');
        const pingBox = document.getElementById('threads-ping-result');
        if (!urlInput || !pingBox) return;

        pingBox.style.display = 'inline-flex';
        pingBox.className = 'ping-badge ping-testing';
        pingBox.textContent = '⏳ 연결 확인 중...';

        const result = await model.pingUrl(urlInput.value);
        if (result.success) {
          pingBox.className = 'ping-badge ping-success';
          pingBox.textContent = `🟢 연결 성공 (${result.latencyMs}ms)`;
        } else {
          pingBox.className = 'ping-badge ping-fail';
          pingBox.textContent = `🔴 ${result.message || '연결 실패'}`;
        }
      });
    }

    const formToken = document.getElementById('form-token-config');
    if (formToken) {
      formToken.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCfg = {
          agentBaseUrl: document.getElementById('token-agent-url').value,
          tokenIssuedDate: document.getElementById('token-issued-date').value,
          validDays: parseInt(document.getElementById('token-valid-days').value || 60, 10)
        };
        const res = await model.saveTokenConfig(newCfg);
        alert(res.message || 'Threads 에이전트 설정이 저장되었습니다.');
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    const btnThreadsTrigger = document.getElementById('btn-threads-trigger');
    if (btnThreadsTrigger) {
      btnThreadsTrigger.addEventListener('click', async () => {
        btnThreadsTrigger.disabled = true;
        btnThreadsTrigger.textContent = '⏳ 즉시 발행 중...';
        const res = await model.triggerOnce();
        alert(res.message || '즉시 발행 트리거 요청이 전송되었습니다.');
        btnThreadsTrigger.disabled = false;
        btnThreadsTrigger.textContent = '⚡ 즉시 트리거';
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    // --- 2호 SAP 에이전트 Ping 및 설정 ---
    const btnSapPing = document.getElementById('btn-sap-ping');
    if (btnSapPing) {
      btnSapPing.addEventListener('click', async () => {
        const urlInput = document.getElementById('sap-agent-url');
        const pingBox = document.getElementById('sap-ping-result');
        if (!urlInput || !pingBox) return;

        pingBox.style.display = 'inline-flex';
        pingBox.className = 'ping-badge ping-testing';
        pingBox.textContent = '⏳ 연결 확인 중...';

        const result = await model.pingUrl(urlInput.value);
        if (result.success) {
          pingBox.className = 'ping-badge ping-success';
          pingBox.textContent = `🟢 연결 성공 (${result.latencyMs}ms)`;
        } else {
          pingBox.className = 'ping-badge ping-fail';
          pingBox.textContent = `🔴 ${result.message || '연결 실패'}`;
        }
      });
    }

    const formSap = document.getElementById('form-sap-config');
    if (formSap) {
      formSap.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCfg = {
          agentBaseUrl: document.getElementById('sap-agent-url').value,
          intervalMinutes: parseInt(document.getElementById('sap-agent-interval').value || 720, 10),
          taskName: 'SAPIntegrationSuiteAgent'
        };
        const res = await model.saveSapConfig(newCfg);
        alert(res.message || 'SAP 에이전트 설정이 저장되었습니다.');
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    const btnSapTrigger = document.getElementById('btn-sap-trigger');
    if (btnSapTrigger) {
      btnSapTrigger.addEventListener('click', async () => {
        btnSapTrigger.disabled = true;
        btnSapTrigger.textContent = '⏳ 뉴스 수집 중...';
        const res = await model.triggerSapAgent();
        alert(res.message || 'SAP 뉴스 즉시 수집이 시작되었습니다.');
        btnSapTrigger.disabled = false;
        btnSapTrigger.textContent = '⚡ 즉시 수집';
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    // --- 6호 AI 서비스 정보 업데이트 에이전트 제어 이벤트 ---
    const showAiUpdaterStatus = (msg, isSuccess) => {
      const statusBox = document.getElementById('ai-updater-action-status');
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.className = isSuccess ? 'debate-status-alert alert-success' : 'debate-status-alert alert-danger';
        statusBox.style.backgroundColor = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        statusBox.style.border = isSuccess ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)';
        statusBox.style.color = isSuccess ? '#34d399' : '#f87171';
        statusBox.innerHTML = `${isSuccess ? '✅' : '⚠️'} ${msg}`;
        setTimeout(() => {
          if (statusBox) statusBox.style.display = 'none';
        }, 5000);
      }
    };

    const btnStartAiUpdater = document.getElementById('btn-start-ai-updater');
    if (btnStartAiUpdater) {
      btnStartAiUpdater.addEventListener('click', async () => {
        btnStartAiUpdater.disabled = true;
        btnStartAiUpdater.textContent = '⏳ 기동 중...';
        const res = await model.startSystemAgent('ai_service_updater');
        showAiUpdaterStatus(res.message || 'AI 서비스 정보 업데이트 에이전트 기동 요청 완료', res.success !== false);
        await this.renderMainView();
      });
    }

    const btnStopAiUpdater = document.getElementById('btn-stop-ai-updater');
    if (btnStopAiUpdater) {
      btnStopAiUpdater.addEventListener('click', async () => {
        btnStopAiUpdater.disabled = true;
        btnStopAiUpdater.textContent = '⏳ 정지 중...';
        const res = await model.stopSystemAgent('ai_service_updater');
        showAiUpdaterStatus(res.message || 'AI 서비스 정보 업데이트 에이전트 정지 완료', res.success !== false);
        await this.renderMainView();
      });
    }

    const btnTriggerAiUpdater = document.getElementById('btn-trigger-ai-updater');
    if (btnTriggerAiUpdater) {
      btnTriggerAiUpdater.addEventListener('click', async () => {
        btnTriggerAiUpdater.disabled = true;
        btnTriggerAiUpdater.textContent = '⏳ 팩트체크/갱신 기동 중...';
        const res = await model.triggerAiServiceUpdate();
        showAiUpdaterStatus(res.message || '1회 즉시 팩트체크 및 업데이트 작업이 백그라운드에서 시작되었습니다.', res.success !== false);
        setTimeout(async () => {
          if (btnTriggerAiUpdater) {
            btnTriggerAiUpdater.disabled = false;
            btnTriggerAiUpdater.textContent = '⚡ 즉시 1회 팩트체크 & 업데이트 실행';
          }
          await this.renderMainView();
        }, 1500);
      });
    }

    // --- 6호 검색·트렌드 감시 에이전트 (Trend Scout) 제어 이벤트 ---
    const showTrendScoutStatus = (msg, isSuccess) => {
      const statusBox = document.getElementById('trend-scout-action-status');
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.className = isSuccess ? 'debate-status-alert alert-success' : 'debate-status-alert alert-danger';
        statusBox.style.backgroundColor = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        statusBox.style.border = isSuccess ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)';
        statusBox.style.color = isSuccess ? '#34d399' : '#f87171';
        statusBox.innerHTML = `${isSuccess ? '✅' : '⚠️'} ${msg}`;
        setTimeout(() => {
          if (statusBox) statusBox.style.display = 'none';
        }, 5000);
      }
    };

    const btnStartTrendScout = document.getElementById('btn-start-trend-scout');
    if (btnStartTrendScout) {
      btnStartTrendScout.addEventListener('click', async () => {
        btnStartTrendScout.disabled = true;
        btnStartTrendScout.textContent = '⏳ 기동 중...';
        const res = await model.startSystemAgent('trend_scout');
        showTrendScoutStatus(res.message || '트렌드 감시 에이전트 기동 요청 완료', res.success !== false);
        await this.renderMainView();
      });
    }

    const btnStopTrendScout = document.getElementById('btn-stop-trend-scout');
    if (btnStopTrendScout) {
      btnStopTrendScout.addEventListener('click', async () => {
        btnStopTrendScout.disabled = true;
        btnStopTrendScout.textContent = '⏳ 정지 중...';
        const res = await model.stopSystemAgent('trend_scout');
        showTrendScoutStatus(res.message || '트렌드 감시 에이전트 정지 완료', res.success !== false);
        await this.renderMainView();
      });
    }

    const btnTriggerTrendScout = document.getElementById('btn-trigger-trend-scout');
    if (btnTriggerTrendScout) {
      btnTriggerTrendScout.addEventListener('click', async () => {
        btnTriggerTrendScout.disabled = true;
        btnTriggerTrendScout.textContent = '⏳ 트렌드 감시 기동 중...';
        const res = await model.triggerTrendScoutAgent();
        showTrendScoutStatus(res.message || '1회 즉시 트렌드 감시 및 알림 작업이 백그라운드에서 시작되었습니다.', res.success !== false);
        setTimeout(async () => {
          if (btnTriggerTrendScout) {
            btnTriggerTrendScout.disabled = false;
            btnTriggerTrendScout.textContent = '⚡ 즉시 1회 트렌드 수집 & 알림 실행';
          }
          await this.renderMainView();
        }, 1500);
      });
    }

    const btnGotoTrend = document.getElementById('btn-goto-trend-menu');
    if (btnGotoTrend) {
      btnGotoTrend.addEventListener('click', () => {
        if (window.AppController && window.AppController.switchTopNav) {
          window.AppController.switchTopNav('life');
          const trendSideBtn = document.querySelector('[data-side="trend-ranking"]');
          if (trendSideBtn) trendSideBtn.click();
        }
      });
    }

    // --- 7호 AI 끝장 토론실 정기 소집 워커 (Debate Worker) 제어 이벤트 ---
    const showDebateWorkerStatus = (msg, isSuccess) => {
      const statusBox = document.getElementById('debate-worker-action-status');
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.className = isSuccess ? 'debate-status-alert alert-success' : 'debate-status-alert alert-danger';
        statusBox.style.backgroundColor = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        statusBox.style.border = isSuccess ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)';
        statusBox.style.color = isSuccess ? '#34d399' : '#f87171';
        statusBox.innerHTML = `${isSuccess ? '✅' : '⚠️'} ${msg}`;
        setTimeout(() => {
          if (statusBox) statusBox.style.display = 'none';
        }, 5000);
      }
    };

    const btnStartDebateWorker = document.getElementById('btn-start-debate-worker');
    if (btnStartDebateWorker) {
      btnStartDebateWorker.addEventListener('click', async () => {
        btnStartDebateWorker.disabled = true;
        btnStartDebateWorker.textContent = '⏳ 기동 중...';
        const res = await model.startSystemAgent('stock_debate_arena');
        showDebateWorkerStatus(res.message || '끝장토론 워커 기동 요청 완료', res.success !== false);
        await this.renderMainView();
      });
    }

    const btnStopDebateWorker = document.getElementById('btn-stop-debate-worker');
    if (btnStopDebateWorker) {
      btnStopDebateWorker.addEventListener('click', async () => {
        btnStopDebateWorker.disabled = true;
        btnStopDebateWorker.textContent = '⏳ 정지 중...';
        const res = await model.stopSystemAgent('stock_debate_arena');
        showDebateWorkerStatus(res.message || '끝장토론 워커 정지 완료', res.success !== false);
        await this.renderMainView();
      });
    }

    const btnTriggerDebateWorker = document.getElementById('btn-trigger-debate-worker');
    if (btnTriggerDebateWorker) {
      btnTriggerDebateWorker.addEventListener('click', async () => {
        btnTriggerDebateWorker.disabled = true;
        btnTriggerDebateWorker.textContent = '⏳ 끝장토론 기동 중...';
        const res = await model.triggerDebateWorkerAgent();
        showDebateWorkerStatus(res.message || '1회 즉시 끝장토론 소집 및 기록 작업이 백그라운드에서 시작되었습니다.', res.success !== false);
        setTimeout(async () => {
          if (btnTriggerDebateWorker) {
            btnTriggerDebateWorker.disabled = false;
            btnTriggerDebateWorker.textContent = '⚡ 즉시 1회 끝장토론 자동 실행';
          }
          await this.renderMainView();
        }, 1500);
      });
    }

    const btnGotoDebateArena = document.getElementById('btn-goto-debate-arena-menu');
    if (btnGotoDebateArena) {
      btnGotoDebateArena.addEventListener('click', () => {
        if (window.AppController && window.AppController.switchTopNav) {
          window.AppController.switchTopNav('invest');
          const debateSideBtn = document.querySelector('[data-side="stock-debate"]');
          if (debateSideBtn) debateSideBtn.click();
          if (window.StockDebateView) window.StockDebateView.render();
        }
      });
    }

    // --- Common Refresh Event ---
    const btnRefreshView = document.getElementById('btn-agent-refresh-view');
    if (btnRefreshView) {
      btnRefreshView.addEventListener('click', async () => {
        btnRefreshView.disabled = true;
        btnRefreshView.textContent = '⏳ 갱신 중...';
        await window.AppController.refreshThreadsAgentStatus();
        this.updateLiveBadgesOnly();
        btnRefreshView.disabled = false;
        btnRefreshView.textContent = '🔄 전체 새로고침';
      });
    }
  }
};
