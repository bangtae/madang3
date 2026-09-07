// app/views/threadsAgentView.js - AI 에이전트 목록 및 통합 관리 뷰 렌더러 (9대 에이전트 통합 제어)

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
    const btnStart = document.getElementById('btn-header-agent-start');
    const btnStop = document.getElementById('btn-header-agent-stop');

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

    if (btnStart && btnStop) {
      if (status.is_running) {
        btnStart.style.display = 'none';
        btnStop.style.display = 'inline-flex';
      } else {
        btnStart.style.display = 'inline-flex';
        btnStop.style.display = 'none';
      }
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

    // 9대 에이전트 인스턴스 매핑
    const agThreads = getAgent('threads');
    const agSap = getAgent('sap');
    const agSupervisor = getAgent('supervisor');
    const agLead = getAgent('lead_orchestrator');
    const agDanka = getAgent('sub_danka');
    const agGrowth = getAgent('sub_growth');
    const agCautious = getAgent('sub_cautious');
    const agTechnical = getAgent('sub_technical');
    const agJurini = getAgent('sub_jurini');

    const subCouncilList = [agDanka, agGrowth, agCautious, agTechnical, agJurini];
    const subCouncilRunningCount = subCouncilList.filter(a => a.is_running).length;

    // 입력창 포커스 중일 때는 전체 재렌더링 대신 상태 배지와 통계만 스마트 업데이트
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
            <h2>🤖 AI 에이전트 목록 및 통합 관리</h2>
            <p>madang6 사내 에이전트 전체(9종)의 실시간 OS 프로세스 감지, 시작/중지 및 온디맨드 제어를 원클릭으로 수행합니다.</p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span id="system-agents-summary-pill" class="agent-badge badge-running" style="font-size: 0.85rem; padding: 6px 14px;">
              🟢 9대 에이전트 중 <b>${model.systemAgentsSummary ? model.systemAgentsSummary.runningCount : 0}개</b> 가동 중
            </span>
            <button type="button" id="btn-agent-refresh-view" class="btn btn-secondary btn-sm" style="padding: 6px 12px;">🔄 전체 새로고침</button>
          </div>
        </div>
      </div>

      <!-- 모듈형 에이전트 카드 그리드 -->
      <div class="agent-cards-grid">
        
        <!-- 1호: Threads AI 뉴스 에이전트 카드 -->
        <div class="card agent-card agent-module-card" id="card-threads-agent">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.4rem;">📰</span>
                <h3 class="card-title" style="margin: 0;">1호: Threads AI 뉴스 에이전트</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">실시간 증시 뉴스·공시 요약 브리핑 및 Threads 자동 포스팅</p>
            </div>
            <span id="threads-card-badge" class="agent-badge ${agThreads.is_running ? 'badge-running' : (status.is_running ? 'badge-running' : 'badge-stopped')}">
              ${agThreads.is_running ? `🟢 가동 중 (PID: ${agThreads.pid || '-'})` : (status.is_running ? '🟢 가동 중' : '🔴 정지됨')}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- 에이전트 가동 / 중지 컨트롤 -->
            <div class="agent-control-box">
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">⚡ 프로세스 제어</label>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn btn-success btn-sys-agent-start" data-agent-id="threads" style="flex: 1; min-width: 100px; padding: 8px 10px; font-size: 0.84rem;" ${agThreads.is_running ? 'disabled' : ''}>
                  ▶ 기동
                </button>
                <button type="button" class="btn btn-danger btn-sys-agent-stop" data-agent-id="threads" style="flex: 1; min-width: 100px; padding: 8px 10px; font-size: 0.84rem;" ${!agThreads.is_running ? 'disabled' : ''}>
                  ⏹ 중지
                </button>
                <button type="button" id="btn-threads-trigger" class="btn btn-outline" style="padding: 8px 12px; font-size: 0.84rem;" title="1회 즉시 수집 및 브리핑 발행">
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
        <div class="card agent-card agent-module-card" id="card-sap-agent">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.4rem;">⚙️</span>
                <h3 class="card-title" style="margin: 0;">2호: SAP Integration Suite 에이전트</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">SCN 커뮤니티 및 공식 뉴스 피드 자동 수집 &amp; 포털 동기화 데몬</p>
            </div>
            <span id="sap-card-badge" class="agent-badge ${sapBadgeClass}">
              ${sapBadgeText}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- 에이전트 가동 / 중지 컨트롤 -->
            <div class="agent-control-box">
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">⚡ 프로세스 &amp; 스케줄 제어</label>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn btn-success btn-sys-agent-start" data-agent-id="sap" style="flex: 1; min-width: 100px; padding: 8px 10px; font-size: 0.84rem;" ${agSap.is_running ? 'disabled' : ''}>
                  ▶ 기동
                </button>
                <button type="button" class="btn btn-danger btn-sys-agent-stop" data-agent-id="sap" style="flex: 1; min-width: 100px; padding: 8px 10px; font-size: 0.84rem;" ${!agSap.is_running ? 'disabled' : ''}>
                  ⏹ 중지
                </button>
                <button type="button" id="btn-sap-trigger" class="btn btn-outline" style="padding: 8px 12px; font-size: 0.84rem;" title="1회 즉시 뉴스 피드 수집">
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
                  <label style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 2px; display: block;">수집 주기 (분)</label>
                  <input type="number" id="sap-agent-interval" class="form-control" style="font-size: 0.8rem; padding: 5px 8px;" value="${sapCfg.intervalMinutes || 60}" min="5" max="1440">
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
              <div>다음 실행: <span id="sap-stat-next" style="color: #cbd5e1;">${sapStatus.next_run_time || '로그온 시 / 대기'}</span></div>
            </div>
          </div>
        </div>

        <!-- 3호: AI 통합 감독관 (Supervisor & Watchdog) 카드 -->
        <div class="card agent-card agent-module-card" id="card-supervisor-agent">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.4rem;">🛡️</span>
                <h3 class="card-title" style="margin: 0;">3호: AI 통합 감독관 (Supervisor)</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">주식 서브에이전트단 감시·자동 복구(Watchdog) 및 텔레그램 경보 총괄</p>
            </div>
            <span id="badge-agent-supervisor" class="agent-badge ${agSupervisor.is_running ? 'badge-running' : 'badge-stopped'}">
              ${agSupervisor.is_running ? `🟢 가동 중 (PID: ${agSupervisor.pid || '-'})` : '🔴 정지됨'}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="agent-control-box">
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">⚡ 감독관 프로세스 제어</label>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-success btn-sys-agent-start" data-agent-id="supervisor" style="flex: 1; padding: 9px 12px; font-size: 0.85rem;" ${agSupervisor.is_running ? 'disabled' : ''}>
                  ▶ 감독관 기동
                </button>
                <button type="button" class="btn btn-danger btn-sys-agent-stop" data-agent-id="supervisor" style="flex: 1; padding: 9px 12px; font-size: 0.85rem;" ${!agSupervisor.is_running ? 'disabled' : ''}>
                  ⏹ 감독관 중지
                </button>
              </div>
            </div>

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
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.4rem;">📈</span>
                <h3 class="card-title" style="margin: 0;">4호: 메인 주식 총괄 에이전트 (Lead)</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">시장 지표 감시, 5대 심의 리포트 종합 합성 및 최종 매매 합의 오케스트레이션</p>
            </div>
            <span id="badge-agent-lead_orchestrator" class="agent-badge ${agLead.is_running ? 'badge-running' : 'badge-stopped'}">
              ${agLead.is_running ? `🟢 가동 중 (PID: ${agLead.pid || '-'})` : '🔴 정지됨'}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="agent-control-box">
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">⚡ 총괄 프로세스 제어</label>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-success btn-sys-agent-start" data-agent-id="lead_orchestrator" style="flex: 1; padding: 9px 12px; font-size: 0.85rem;" ${agLead.is_running ? 'disabled' : ''}>
                  ▶ 총괄 기동
                </button>
                <button type="button" class="btn btn-danger btn-sys-agent-stop" data-agent-id="lead_orchestrator" style="flex: 1; padding: 9px 12px; font-size: 0.85rem;" ${!agLead.is_running ? 'disabled' : ''}>
                  ⏹ 총괄 중지
                </button>
              </div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.5); padding: 12px; border-radius: 8px; font-size: 0.8rem; line-height: 1.6; color: #94a3b8;">
              <div style="margin-bottom: 4px;"><span style="color: #cbd5e1; font-weight: 600;">📌 실행 위치:</span> <code>madang6/메인주식총괄에이전트/main.py --interval 60</code></div>
              <div style="margin-bottom: 4px;"><span style="color: #cbd5e1; font-weight: 600;">📌 탐색 모드:</span> 60초 주기 자동 순환 시장 분석 및 합의 도출</div>
              <div><span style="color: #cbd5e1; font-weight: 600;">📌 데이터 연동:</span> <code>data/stockCouncilReports.json</code> 자동 합성</div>
            </div>
          </div>
        </div>

        <!-- 5호: 5대 주식 서브에이전트단 통합 모듈 카드 -->
        <div class="card agent-card agent-module-card agent-card-wide" id="card-sub-council-group" style="grid-column: 1 / -1;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.5rem;">🏛️</span>
                <h3 class="card-title" style="margin: 0;">5호: 5대 주식 서브에이전트단 통합 관리</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.84rem; color: #94a3b8;">
                단가 · 성장론자 · 신중론자 · 기술적분석가 · 주린이 5인의 실시간 프로세스 개별/일괄 제어 및 온디맨드 심의 발주
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="sub-council-overall-badge" class="agent-badge ${subCouncilRunningCount === 5 ? 'badge-running' : (subCouncilRunningCount > 0 ? 'badge-warning' : 'badge-stopped')}">
                ${subCouncilRunningCount === 5 ? '🟢 5인 전원 가동 중' : (subCouncilRunningCount > 0 ? `🟡 ${subCouncilRunningCount}/5인 가동 중` : '🔴 5인 전원 정지됨')}
              </span>
            </div>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 18px;">
            
            <!-- 상단: 5대 에이전트 일괄 제어 툴바 -->
            <div style="background: rgba(30, 41, 59, 0.7); padding: 14px 18px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <span style="font-weight: 600; font-size: 0.9rem; color: #f8fafc; display: block;">⚡ 5대 서브에이전트단 일괄 컨트롤</span>
                <span style="font-size: 0.78rem; color: #94a3b8;">모든 서브에이전트를 백그라운드 프로세스로 한 번에 기동하거나 정지합니다.</span>
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" id="btn-sub-council-start-all" class="btn btn-success" style="padding: 9px 16px; font-size: 0.86rem; font-weight: 600;">
                  ▶ 5대 에이전트 일괄 가동
                </button>
                <button type="button" id="btn-sub-council-stop-all" class="btn btn-danger" style="padding: 9px 16px; font-size: 0.86rem; font-weight: 600;">
                  ⏹ 5대 에이전트 일괄 중지
                </button>
              </div>
            </div>

            <!-- 중간: 5인 에이전트 개별 제어 리스트 -->
            <div class="sub-agents-control-table" style="display: flex; flex-direction: column; gap: 10px;">
              ${[
                { id: 'sub_danka', name: '단가 분석 에이전트', icon: '⚖️', desc: '적정 단가 및 가치 평가 심의', agent: agDanka },
                { id: 'sub_growth', name: '성장론자 에이전트', icon: '🚀', desc: '미래 성장 모멘텀 및 확장성 분석', agent: agGrowth },
                { id: 'sub_cautious', name: '신중론자 에이전트', icon: '🛡️', desc: '다운사이드 리스크 및 재무 안전성 점검', agent: agCautious },
                { id: 'sub_technical', name: '기술적분석가 에이전트', icon: '📊', desc: '차트 패턴 및 수급·이평선 지표 분석', agent: agTechnical },
                { id: 'sub_jurini', name: '주린이 에이전트', icon: '🌱', desc: '초보자 관점 직관성 및 대중 심리 점검', agent: agJurini }
              ].map(item => `
                <div class="sub-agent-row" id="row-${item.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); gap: 12px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 12px; min-width: 240px;">
                    <span style="font-size: 1.5rem;">${item.icon}</span>
                    <div>
                      <div style="font-weight: 600; font-size: 0.9rem; color: #f1f5f9;">${item.name}</div>
                      <div style="font-size: 0.76rem; color: #94a3b8;">${item.desc}</div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
                    <span id="badge-agent-${item.id}" class="agent-badge ${item.agent.is_running ? 'badge-running' : 'badge-stopped'}" style="font-size: 0.78rem; padding: 4px 10px;">
                      ${item.agent.is_running ? `🟢 가동 중 (PID: ${item.agent.pid || '-'})` : '🔴 정지됨'}
                    </span>
                    <button type="button" class="btn btn-success btn-sm btn-sys-agent-start" data-agent-id="${item.id}" style="padding: 5px 12px; font-size: 0.78rem;" ${item.agent.is_running ? 'disabled' : ''}>
                      ▶ 기동
                    </button>
                    <button type="button" class="btn btn-danger btn-sm btn-sys-agent-stop" data-agent-id="${item.id}" style="padding: 5px 12px; font-size: 0.78rem;" ${!item.agent.is_running ? 'disabled' : ''}>
                      ⏹ 중지
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 0;">

            <!-- 하단: 온디맨드 즉시 분석 발주 컨트롤 -->
            <div class="agent-control-box" style="background: rgba(15, 23, 42, 0.4); padding: 14px 18px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
                <label style="font-size: 0.85rem; color: #cbd5e1; font-weight: 600; margin: 0;">
                  ⚡ 5대 에이전트 온디맨드 즉시 분석 발주
                </label>
                <button type="button" id="btn-goto-stock-council" class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 5px 12px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">
                  🏛️ 심의실 리포트 열람 바로가기 &rarr;
                </button>
              </div>

              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <input type="text" id="input-admin-stock-query" class="form-control" style="font-size: 0.86rem; padding: 8px 12px; flex: 1; min-width: 200px;" placeholder="종목명 또는 코드 (예: 삼성전자, 005930, 현대차, SK하이닉스...)" />
                <button type="button" id="btn-admin-stock-analyze" class="btn btn-primary" style="white-space: nowrap; padding: 8px 16px; font-size: 0.86rem; font-weight: 600;">
                  ⚡ 즉시 분석 발주
                </button>
              </div>
              <div id="admin-stock-status-banner" class="council-status-banner" style="display: none; margin-top: 10px; font-size: 0.82rem; padding: 10px 14px; border-radius: 6px;"></div>
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
      summaryPill.innerHTML = `🟢 9대 에이전트 중 <b>${model.systemAgentsSummary.runningCount}개</b> 가동 중`;
    }

    // 2. 개별 에이전트 뱃지 및 버튼 활성/비활성 상태 갱신
    sysAgents.forEach(agent => {
      const badge = document.getElementById(`badge-agent-${agent.id}`);
      if (badge) {
        badge.className = `agent-badge ${agent.is_running ? 'badge-running' : 'badge-stopped'}`;
        badge.textContent = agent.is_running ? `🟢 가동 중 (PID: ${agent.pid || '-'})` : '🔴 정지됨';
      }

      // 시작/중지 버튼 활성화 토글
      const btnStart = document.querySelector(`.btn-sys-agent-start[data-agent-id="${agent.id}"]`);
      const btnStop = document.querySelector(`.btn-sys-agent-stop[data-agent-id="${agent.id}"]`);
      if (btnStart) btnStart.disabled = agent.is_running;
      if (btnStop) btnStop.disabled = !agent.is_running;
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
  },

  bindEvents() {
    const btnStart = document.getElementById('btn-header-agent-start');
    const btnStop = document.getElementById('btn-header-agent-stop');

    if (btnStart) {
      btnStart.addEventListener('click', async () => {
        const res = await window.ThreadsAgentModel.startSystemAgent('threads');
        alert(res.message || 'Threads 에이전트 가동을 시작했습니다.');
        window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', async () => {
        const res = await window.ThreadsAgentModel.stopSystemAgent('threads');
        alert(res.message || 'Threads 에이전트를 정지했습니다.');
        window.AppController.refreshThreadsAgentStatus();
      });
    }
  },

  bindViewEvents() {
    const model = window.ThreadsAgentModel;
    if (!model) return;

    // --- 단일 에이전트 시작 / 중지 공통 버튼 이벤트 바인딩 ---
    document.querySelectorAll('.btn-sys-agent-start').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agentId = btn.getAttribute('data-agent-id');
        if (!agentId) return;
        btn.disabled = true;
        const origText = btn.innerHTML;
        btn.innerHTML = '⏳...';

        const res = await model.startSystemAgent(agentId);
        btn.innerHTML = origText;
        if (res.message) {
          console.log(`[Agent Start] ${agentId}:`, res.message);
        }
        this.updateLiveBadgesOnly();
      });
    });

    document.querySelectorAll('.btn-sys-agent-stop').forEach(btn => {
      btn.addEventListener('click', async () => {
        const agentId = btn.getAttribute('data-agent-id');
        if (!agentId) return;
        btn.disabled = true;
        const origText = btn.innerHTML;
        btn.innerHTML = '⏳...';

        const res = await model.stopSystemAgent(agentId);
        btn.innerHTML = origText;
        if (res.message) {
          console.log(`[Agent Stop] ${agentId}:`, res.message);
        }
        this.updateLiveBadgesOnly();
      });
    });

    // --- 5대 서브에이전트단 일괄 시작 / 일괄 중지 ---
    const btnStartAll = document.getElementById('btn-sub-council-start-all');
    const btnStopAll = document.getElementById('btn-sub-council-stop-all');

    if (btnStartAll) {
      btnStartAll.addEventListener('click', async () => {
        btnStartAll.disabled = true;
        btnStartAll.innerHTML = '⏳ 5대 에이전트 기동 중...';
        const res = await model.startSubCouncilAll();
        btnStartAll.innerHTML = '▶ 5대 에이전트 일괄 가동';
        btnStartAll.disabled = false;
        alert(res.message || '5대 주식 서브에이전트 일괄 기동이 완료되었습니다.');
        this.updateLiveBadgesOnly();
      });
    }

    if (btnStopAll) {
      btnStopAll.addEventListener('click', async () => {
        btnStopAll.disabled = true;
        btnStopAll.innerHTML = '⏳ 5대 에이전트 중지 중...';
        const res = await model.stopSubCouncilAll();
        btnStopAll.innerHTML = '⏹ 5대 에이전트 일괄 중지';
        btnStopAll.disabled = false;
        alert(res.message || '5대 주식 서브에이전트 일괄 중지가 완료되었습니다.');
        this.updateLiveBadgesOnly();
      });
    }

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
          intervalMinutes: parseInt(document.getElementById('sap-agent-interval').value || 60, 10),
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

    // --- 5호: 온디맨드 주식 심의 발주 이벤트 ---
    const btnAdminStockAnalyze = document.getElementById('btn-admin-stock-analyze');
    const inputAdminStockQuery = document.getElementById('input-admin-stock-query');
    const statusBanner = document.getElementById('admin-stock-status-banner');
    const btnGotoStockCouncil = document.getElementById('btn-goto-stock-council');

    if (btnGotoStockCouncil) {
      btnGotoStockCouncil.addEventListener('click', () => {
        if (window.AppController && window.AppController.switchTopNav) {
          window.AppController.switchTopNav('invest');
          const councilSideBtn = document.querySelector('[data-side="stock-council"]');
          if (councilSideBtn) councilSideBtn.click();
        }
      });
    }

    if (btnAdminStockAnalyze && inputAdminStockQuery) {
      const handleAdminAnalyze = async () => {
        const query = inputAdminStockQuery.value.trim();
        if (!query) {
          alert('분석할 종목명 또는 종목코드를 입력해주세요 (예: 삼성전자, 005930, 현대차)');
          inputAdminStockQuery.focus();
          return;
        }

        btnAdminStockAnalyze.disabled = true;
        const origHtml = btnAdminStockAnalyze.innerHTML;
        btnAdminStockAnalyze.innerHTML = '<span class="spinner-sm"></span> 분석 발주 중...';

        if (statusBanner) {
          statusBanner.style.display = 'flex';
          statusBanner.className = 'council-status-banner info';
          statusBanner.innerHTML = `⚡ <b>[${query}]</b> 5대 주식 서브에이전트에게 온디맨드 즉시 분석을 발주했습니다. 잠시 후 리포트가 수신됩니다...`;
        }

        try {
          const res = await model.triggerDemandAnalysis(query);
          if (res.success) {
            inputAdminStockQuery.value = '';
            let attempts = 0;
            const pollInterval = setInterval(async () => {
              attempts++;
              if (window.StockCouncilModel && window.StockCouncilModel.loadReports) {
                await window.StockCouncilModel.loadReports();
              }

              if (attempts >= 4) {
                clearInterval(pollInterval);
                if (statusBanner) {
                  statusBanner.className = 'council-status-banner success';
                  statusBanner.innerHTML = `✅ <b>[${query}]</b> 5인 심의 분석이 완료되었습니다. <a href="javascript:void(0)" id="link-admin-goto-council" style="color: #38bdf8; text-decoration: underline; margin-left: 8px;">심의실에서 결과 보기 &rarr;</a>`;
                  const linkGoto = document.getElementById('link-admin-goto-council');
                  if (linkGoto && btnGotoStockCouncil) {
                    linkGoto.addEventListener('click', () => btnGotoStockCouncil.click());
                  }
                }
              }
            }, 2500);
          } else {
            alert(res.message || '분석 요청에 실패했습니다.');
            if (statusBanner) statusBanner.style.display = 'none';
          }
        } catch (err) {
          alert(`분석 요청 오류: ${err.message}`);
          if (statusBanner) statusBanner.style.display = 'none';
        } finally {
          btnAdminStockAnalyze.disabled = false;
          btnAdminStockAnalyze.innerHTML = origHtml;
        }
      };

      btnAdminStockAnalyze.addEventListener('click', handleAdminAnalyze);
      inputAdminStockQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAdminAnalyze();
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
