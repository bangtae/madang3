// app/views/threadsAgentView.js - AI 에이전트 목록 및 통합 관리 뷰 렌더러

window.ThreadsAgentView = {
  init() {
    this.bindEvents();
  },

  renderHeaderQuickBar(status, dDayInfo) {
    const badgeEl = document.getElementById('agent-header-status-badge');
    const ddayEl = document.getElementById('agent-header-dday-badge');
    const btnStart = document.getElementById('btn-header-agent-start');
    const btnStop = document.getElementById('btn-header-agent-stop');

    if (badgeEl) {
      if (status.is_offline) {
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

    // 입력창 포커스 중일 때는 전체 재렌더링 대신 상태 배지와 통계만 스마트 업데이트 (포커스 이탈 방지)
    const activeEl = document.activeElement;
    if (activeEl && container.contains(activeEl) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      this.updateLiveBadgesOnly(status, sapStatus, dDayInfo);
      return;
    }

    const sapBadgeClass = sapStatus.is_running 
      ? 'badge-running' 
      : (sapStatus.task_state === 'Ready' ? 'badge-ready' : (sapStatus.task_state === 'Disabled' ? 'badge-stopped' : 'badge-offline'));
    const sapBadgeText = sapStatus.is_running 
      ? '🟢 수집 가동 중' 
      : (sapStatus.task_state === 'Ready' ? '⚪ 스케줄 대기 (Ready)' : (sapStatus.task_state === 'Disabled' ? '🔴 비활성화됨' : `⚠️ ${sapStatus.task_state || '미등록'}`));

    container.innerHTML = `
      <div class="view-header">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2>🤖 AI 에이전트 목록 및 관리</h2>
            <p>사내 연동된 AI 에이전트들의 실시간 가동 상태 제어, Base URL 설정 및 Ping 연결 진단을 통합 제어합니다.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-agent-refresh-view" class="btn btn-secondary btn-sm">🔄 전체 새로고침</button>
          </div>
        </div>
      </div>

      <!-- 모듈형 에이전트 카드 그리드 -->
      <div class="agent-cards-grid">
        
        <!-- 1호: Threads AI 에이전트 카드 -->
        <div class="card agent-card agent-module-card" id="card-threads-agent">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.4rem;">🤖</span>
                <h3 class="card-title" style="margin: 0;">Threads AI 에이전트</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">실시간 증시 뉴스·공시 요약 브리핑 및 자동 포스팅</p>
            </div>
            <span id="threads-card-badge" class="agent-badge ${status.is_running ? 'badge-running' : (status.is_offline ? 'badge-offline' : 'badge-stopped')}">
              ${status.is_running ? '🟢 가동 중' : (status.is_offline ? '⚠️ 에이전트 오프라인' : '🔴 일시정지됨')}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
            <!-- 에이전트 가동 / 중지 컨트롤 -->
            <div class="agent-control-box">
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">⚡ 가동 상태 제어</label>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" id="btn-agent-start-main" class="btn btn-success" style="flex: 1; min-width: 110px; padding: 8px 10px; font-size: 0.84rem;" ${status.is_running ? 'disabled' : ''}>
                  ▶ 가동 시작
                </button>
                <button type="button" id="btn-agent-stop-main" class="btn btn-danger" style="flex: 1; min-width: 110px; padding: 8px 10px; font-size: 0.84rem;" ${!status.is_running ? 'disabled' : ''}>
                  ⏹ 일시정지
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
                <span>🌐 에이전트 서버 Base URL</span>
                <span id="threads-ping-result" class="ping-badge" style="display: none;"></span>
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="token-agent-url" class="form-control" style="font-size: 0.84rem; padding: 7px 10px; flex: 1;" value="${cfg.agentBaseUrl || 'http://127.0.0.1:8000'}" placeholder="예: http://127.0.0.1:8000">
                <button type="button" id="btn-threads-ping" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-size: 0.8rem; padding: 0 12px;">
                  🔗 Ping 테스트
                </button>
              </div>
              <small style="color: #94a3b8; font-size: 0.76rem; margin-top: 4px; display: block;">
                로컬 환경: <code>http://127.0.0.1:8000</code> / 원격 터널: <code>https://xxx.trycloudflare.com</code>
              </small>
            </div>

            <!-- Threads API 토큰 60일 만료 관리 섹션 -->
            <div class="agent-token-section">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 0.82rem; color: #cbd5e1; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                  <span>🔑 API 토큰 60일 만료 관리</span>
                </label>
                <span class="${dDayInfo.isWarning ? 'agent-badge dday-warning' : 'agent-badge dday-normal'}" style="font-size: 0.74rem; padding: 2px 8px;">
                  ${dDayInfo.isExpired ? '⚠️ 토큰 만료됨' : `D-${dDayInfo.dDay}일`}
                </span>
              </div>

              <!-- 설정 Form -->
              <form id="form-token-config" style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 2px; display: block;">발급 일자</label>
                    <input type="date" id="token-issued-date" class="form-control" style="font-size: 0.8rem; padding: 5px 8px;" value="${cfg.tokenIssuedDate || ''}">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 2px; display: block;">유효 기간(일)</label>
                    <input type="number" id="token-valid-days" class="form-control" style="font-size: 0.8rem; padding: 5px 8px;" value="${cfg.validDays || 60}" min="1" max="365">
                  </div>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 8px 10px; font-size: 0.84rem;">
                  💾 Threads 에이전트 설정 저장
                </button>
              </form>
            </div>

            <!-- 통계 요약 -->
            <div style="background: rgba(15, 23, 42, 0.5); padding: 10px 12px; border-radius: 6px; font-size: 0.78rem; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
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
                <span style="font-size: 1.4rem;">⚡</span>
                <h3 class="card-title" style="margin: 0;">SAP Integration Suite 에이전트</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">SCN 커뮤니티 및 공식 뉴스 피드 자동 수집 &amp; 동기화 데몬</p>
            </div>
            <span id="sap-card-badge" class="agent-badge ${sapBadgeClass}">
              ${sapBadgeText}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 16px;">
            <!-- 에이전트 가동 / 중지 컨트롤 -->
            <div class="agent-control-box">
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">⚡ 스케줄러 &amp; 수집 제어</label>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" id="btn-sap-start" class="btn btn-success" style="flex: 1; min-width: 110px; padding: 8px 10px; font-size: 0.84rem;">
                  ▶ 스케줄 가동
                </button>
                <button type="button" id="btn-sap-stop" class="btn btn-danger" style="flex: 1; min-width: 110px; padding: 8px 10px; font-size: 0.84rem;">
                  ⏹ 스케줄 중지
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
                <span>🌐 에이전트 Base URL (포털 동기화 URL)</span>
                <span id="sap-ping-result" class="ping-badge" style="display: none;"></span>
              </label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="sap-agent-url" class="form-control" style="font-size: 0.84rem; padding: 7px 10px; flex: 1;" value="${sapCfg.agentBaseUrl || 'http://127.0.0.1:8080'}" placeholder="예: http://127.0.0.1:8080">
                <button type="button" id="btn-sap-ping" class="btn btn-secondary btn-sm" style="white-space: nowrap; font-size: 0.8rem; padding: 0 12px;">
                  🔗 Ping 테스트
                </button>
              </div>
              <small style="color: #94a3b8; font-size: 0.76rem; margin-top: 4px; display: block;">
                수집 데이터 동기화 대상 포털 URL (기본: <code>http://127.0.0.1:8080</code>)
              </small>
            </div>

            <!-- SAP 에이전트 파라미터 폼 -->
            <form id="form-sap-config" style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 2px; display: block;">수집 주기 (분)</label>
                  <input type="number" id="sap-agent-interval" class="form-control" style="font-size: 0.8rem; padding: 5px 8px;" value="${sapCfg.intervalMinutes || 60}" min="5" max="1440">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 2px; display: block;">스케줄러 작업명</label>
                  <input type="text" class="form-control" style="font-size: 0.8rem; padding: 5px 8px; background: rgba(255,255,255,0.04); color: #94a3b8;" value="${sapCfg.taskName || 'SAPIntegrationSuiteAgent'}" readonly>
                </div>
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 8px 10px; font-size: 0.84rem;">
                💾 SAP 에이전트 설정 저장
              </button>
            </form>

            <!-- 통계 요약 -->
            <div style="background: rgba(15, 23, 42, 0.5); padding: 10px 12px; border-radius: 6px; font-size: 0.78rem; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <div>수집 뉴스: <b id="sap-stat-news" style="color: #38bdf8;">${sapStatus.total_news_count || 0}건</b></div>
              <div>다음 실행: <span id="sap-stat-next" style="color: #cbd5e1;">${sapStatus.next_run_time || '로그온 시 / 대기'}</span></div>
            </div>
          </div>
        </div>

        <!-- 3호: 신규 에이전트 확장 안내 카드 -->
        <div class="card agent-card agent-module-card agent-placeholder-card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem; opacity: 0.7;">🧩</span>
              <h3 class="card-title" style="margin: 0; color: #94a3b8;">신규 AI 에이전트</h3>
            </div>
            <span class="agent-badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px dashed rgba(148, 163, 184, 0.3);">
              ⏳ 추가 대기
            </span>
          </div>

          <div class="card-body placeholder-body">
            <div class="placeholder-content">
              <div class="placeholder-icon">✨</div>
              <h4 style="font-size: 1.05rem; color: #e2e8f0; margin: 0 0 6px 0; font-weight: 600;">새로운 에이전트 모듈 추가 가능</h4>
              <p style="font-size: 0.82rem; color: #94a3b8; margin: 0 0 16px 0; line-height: 1.5; max-width: 320px;">
                텔레그램 알림 봇, AI 마켓 리서처 등 신규 에이전트가 개발되면 동일한 카드 규격으로 원클릭 연동됩니다.
              </p>
              <button type="button" class="btn btn-outline" style="opacity: 0.6; font-size: 0.82rem; padding: 6px 12px;" onclick="window.AppController.switchTopNav('ai');">
                🧩 AI 에이전트 Builder 이동
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    this.bindViewEvents();
  },

  updateLiveBadgesOnly(status, sapStatus, dDayInfo) {
    const thBadge = document.getElementById('threads-card-badge');
    if (thBadge) {
      thBadge.className = `agent-badge ${status.is_running ? 'badge-running' : (status.is_offline ? 'badge-offline' : 'badge-stopped')}`;
      thBadge.textContent = status.is_running ? '🟢 가동 중' : (status.is_offline ? '⚠️ 에이전트 오프라인' : '🔴 일시정지됨');
    }

    const sapBadge = document.getElementById('sap-card-badge');
    if (sapBadge) {
      const cls = sapStatus.is_running ? 'badge-running' : (sapStatus.task_state === 'Ready' ? 'badge-ready' : 'badge-stopped');
      const txt = sapStatus.is_running ? '🟢 수집 가동 중' : (sapStatus.task_state === 'Ready' ? '⚪ 스케줄 대기 (Ready)' : `⚠️ ${sapStatus.task_state || '정지됨'}`);
      sapBadge.className = `agent-badge ${cls}`;
      sapBadge.textContent = txt;
    }

    const sapStatNews = document.getElementById('sap-stat-news');
    if (sapStatNews && sapStatus.total_news_count !== undefined) {
      sapStatNews.textContent = `${sapStatus.total_news_count}건`;
    }
  },

  bindEvents() {
    const btnStart = document.getElementById('btn-header-agent-start');
    const btnStop = document.getElementById('btn-header-agent-stop');

    if (btnStart) {
      btnStart.addEventListener('click', async () => {
        const res = await window.ThreadsAgentModel.startAgent();
        alert(res.message || '에이전트 가동을 시작했습니다.');
        window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', async () => {
        const res = await window.ThreadsAgentModel.stopAgent();
        alert(res.message || '에이전트 가동을 중지했습니다.');
        window.AppController.refreshThreadsAgentStatus();
      });
    }
  },

  bindViewEvents() {
    const model = window.ThreadsAgentModel;

    // --- Threads Agent Events ---
    const btnStartMain = document.getElementById('btn-agent-start-main');
    const btnStopMain = document.getElementById('btn-agent-stop-main');
    const btnThreadsTrigger = document.getElementById('btn-threads-trigger');
    const btnThreadsPing = document.getElementById('btn-threads-ping');
    const formToken = document.getElementById('form-token-config');

    if (btnStartMain) {
      btnStartMain.addEventListener('click', async () => {
        btnStartMain.disabled = true;
        const res = await model.startAgent();
        alert(res.message || 'Threads 에이전트 가동을 시작했습니다.');
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnStopMain) {
      btnStopMain.addEventListener('click', async () => {
        btnStopMain.disabled = true;
        const res = await model.stopAgent();
        alert(res.message || 'Threads 에이전트가 중지되었습니다.');
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnThreadsTrigger) {
      btnThreadsTrigger.addEventListener('click', async () => {
        btnThreadsTrigger.disabled = true;
        btnThreadsTrigger.textContent = '⏳ 수집 중...';
        const res = await model.triggerAgent();
        alert(res.message || '즉시 트리거 요청이 완료되었습니다.');
        btnThreadsTrigger.disabled = false;
        btnThreadsTrigger.textContent = '⚡ 즉시 트리거';
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

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

    if (formToken) {
      formToken.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCfg = {
          tokenIssuedDate: document.getElementById('token-issued-date').value,
          validDays: parseInt(document.getElementById('token-valid-days').value || 60, 10),
          agentBaseUrl: document.getElementById('token-agent-url').value
        };
        const res = await model.saveTokenConfig(newCfg);
        alert(res.message || 'Threads 에이전트 설정이 저장되었습니다.');
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    // --- SAP Integration Suite Agent Events ---
    const btnSapStart = document.getElementById('btn-sap-start');
    const btnSapStop = document.getElementById('btn-sap-stop');
    const btnSapTrigger = document.getElementById('btn-sap-trigger');
    const btnSapPing = document.getElementById('btn-sap-ping');
    const formSap = document.getElementById('form-sap-config');

    if (btnSapStart) {
      btnSapStart.addEventListener('click', async () => {
        btnSapStart.disabled = true;
        const res = await model.startSapAgent();
        alert(res.message || 'SAP 에이전트 작업을 시작했습니다.');
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnSapStop) {
      btnSapStop.addEventListener('click', async () => {
        btnSapStop.disabled = true;
        const res = await model.stopSapAgent();
        alert(res.message || 'SAP 에이전트 작업을 중지했습니다.');
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnSapTrigger) {
      btnSapTrigger.addEventListener('click', async () => {
        btnSapTrigger.disabled = true;
        btnSapTrigger.textContent = '⏳ 피드 수집 중...';
        const res = await model.triggerSapAgent();
        alert(res.message || 'SAP 피드 수집이 완료되었습니다.');
        btnSapTrigger.disabled = false;
        btnSapTrigger.textContent = '⚡ 즉시 수집';
        await window.AppController.refreshThreadsAgentStatus();
      });
    }

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

    // --- Common Refresh Event ---
    const btnRefreshView = document.getElementById('btn-agent-refresh-view');
    if (btnRefreshView) {
      btnRefreshView.addEventListener('click', async () => {
        btnRefreshView.disabled = true;
        btnRefreshView.textContent = '⏳ 갱신 중...';
        await window.AppController.refreshThreadsAgentStatus();
        btnRefreshView.disabled = false;
        btnRefreshView.textContent = '🔄 전체 새로고침';
      });
    }
  }
};
