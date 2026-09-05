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
    const status = model.agentStatus;
    const dDayInfo = model.getTokenDDay();
    const cfg = model.tokenConfig;

    container.innerHTML = `
      <div class="view-header">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2>🤖 AI 에이전트 목록 및 관리</h2>
            <p>연동된 AI 에이전트들의 실시간 가동 상태 제어, 원격 서버 URL 및 API 인증 토큰을 통합 관리합니다.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-agent-refresh-view" class="btn btn-secondary btn-sm">🔄 상태 새로고침</button>
          </div>
        </div>
      </div>

      <!-- 모듈형 에이전트 카드 그리드 -->
      <div class="agent-cards-grid">
        <!-- 1호: Threads AI 에이전트 카드 -->
        <div class="card agent-card agent-module-card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.4rem;">🤖</span>
                <h3 class="card-title" style="margin: 0;">Threads AI 에이전트</h3>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">실시간 증시 뉴스·공시 요약 브리핑 및 자동 포스팅</p>
            </div>
            <span class="${status.is_running ? 'agent-badge badge-running' : (status.is_offline ? 'agent-badge badge-offline' : 'agent-badge badge-stopped')}">
              ${status.is_running ? '🟢 가동 중' : (status.is_offline ? '⚠️ 에이전트 오프라인' : '🔴 일시정지됨')}
            </span>
          </div>

          <div class="card-body" style="display: flex; flex-direction: column; gap: 18px;">
            <!-- 에이전트 가동 / 중지 컨트롤 -->
            <div class="agent-control-box">
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">⚡ 가동 상태 제어</label>
              <div style="display: flex; gap: 10px;">
                <button type="button" id="btn-agent-start-main" class="btn btn-success" style="flex: 1; padding: 9px 12px; font-size: 0.88rem;" ${status.is_running ? 'disabled' : ''}>
                  ▶ 에이전트 가동 시작
                </button>
                <button type="button" id="btn-agent-stop-main" class="btn btn-danger" style="flex: 1; padding: 9px 12px; font-size: 0.88rem;" ${!status.is_running ? 'disabled' : ''}>
                  ⏹ 에이전트 일시정지
                </button>
              </div>
            </div>

            <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 0;">

            <!-- Threads API 토큰 60일 만료 관리 섹션 -->
            <div class="agent-token-section">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-size: 0.84rem; color: #cbd5e1; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                  <span>🔑 Threads API 토큰 60일 만료 관리</span>
                </label>
                <span class="${dDayInfo.isWarning ? 'agent-badge dday-warning' : 'agent-badge dday-normal'}" style="font-size: 0.76rem; padding: 2px 8px;">
                  ${dDayInfo.isExpired ? '⚠️ 토큰 만료됨' : `D-${dDayInfo.dDay}일 남음`}
                </span>
              </div>

              <div class="token-dday-progress-box" style="margin-bottom: 14px; background: rgba(15, 23, 42, 0.6); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 0.8rem; color: #94a3b8;">토큰 잔여 카운트다운</span>
                  <span style="font-weight: 700; color: ${dDayInfo.isWarning ? '#fca5a5' : '#38bdf8'}; font-size: 0.92rem;">
                    ${dDayInfo.dDay}일 / ${cfg.validDays || 60}일
                  </span>
                </div>
                <div class="progress-bar-bg" style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden;">
                  <div class="progress-bar-fill" style="width: ${Math.max(0, Math.min(100, Math.round((dDayInfo.dDay / (cfg.validDays || 60)) * 100)))}%; height: 100%; background: ${dDayInfo.isWarning ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #38bdf8, #818cf8)'}; transition: width 0.3s ease;"></div>
                </div>
              </div>

              <!-- 설정 Form -->
              <form id="form-token-config" style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px; display: block;">발급 일자 (Issued Date)</label>
                    <input type="date" id="token-issued-date" class="form-control" style="font-size: 0.84rem; padding: 7px 10px;" value="${cfg.tokenIssuedDate || ''}">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px; display: block;">유효 기간 (일)</label>
                    <input type="number" id="token-valid-days" class="form-control" style="font-size: 0.84rem; padding: 7px 10px;" value="${cfg.validDays || 60}" min="1" max="365">
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px; display: block;">만료 예정일</label>
                  <input type="text" class="form-control" value="${dDayInfo.expiryDateStr}" readonly style="background: rgba(255,255,255,0.04); color: #94a3b8; font-size: 0.84rem; padding: 7px 10px;">
                </div>

                <!-- 에이전트 서버 Base URL 입력창 -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px; display: block; font-weight: 600;">에이전트 서버 Base URL</label>
                  <input type="text" id="token-agent-url" class="form-control" style="font-size: 0.84rem; padding: 8px 10px;" value="${cfg.agentBaseUrl || 'http://127.0.0.1:8000'}" placeholder="예: http://127.0.0.1:8000 또는 https://xxx.trycloudflare.com">
                  <small style="color: #94a3b8; font-size: 0.78rem; margin-top: 5px; display: block; line-height: 1.35;">
                    💡 로컬 환경은 <code>http://127.0.0.1:8000</code>, GCP 환경 연동 시 터미널에서 <code>start-tunnel.ps1</code> 실행 후 발급된 Cloudflare Tunnel HTTPS 주소를 입력하세요.
                  </small>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 4px; padding: 9px 12px; font-size: 0.88rem;">
                  💾 Threads 에이전트 설정 저장
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- 2호: 신규 에이전트 확장 플레이스홀더 카드 -->
        <div class="card agent-card agent-module-card agent-placeholder-card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem; opacity: 0.7;">🧩</span>
              <h3 class="card-title" style="margin: 0; color: #94a3b8;">신규 AI 에이전트</h3>
            </div>
            <span class="agent-badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px dashed rgba(148, 163, 184, 0.3);">
              ⏳ 연동 대기
            </span>
          </div>

          <div class="card-body placeholder-body">
            <div class="placeholder-content">
              <div class="placeholder-icon">✨</div>
              <h4 style="font-size: 1.05rem; color: #e2e8f0; margin: 0 0 6px 0; font-weight: 600;">새로운 에이전트 모듈 추가 가능</h4>
              <p style="font-size: 0.82rem; color: #94a3b8; margin: 0 0 16px 0; line-height: 1.5; max-width: 320px;">
                텔레그램 알림 에이전트, AI 마켓 리서치 봇 등 신규 에이전트가 개발되면 동일한 카드 규격으로 손쉽게 추가 연동됩니다.
              </p>
              <button type="button" class="btn btn-outline" style="opacity: 0.5; cursor: not-allowed; font-size: 0.82rem; padding: 7px 14px;" disabled>
                + 신규 에이전트 등록 예정
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindViewEvents();
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
    const btnStartMain = document.getElementById('btn-agent-start-main');
    const btnStopMain = document.getElementById('btn-agent-stop-main');
    const btnRefreshView = document.getElementById('btn-agent-refresh-view');
    const formToken = document.getElementById('form-token-config');

    if (btnStartMain) {
      btnStartMain.addEventListener('click', async () => {
        const res = await window.ThreadsAgentModel.startAgent();
        alert(res.message || '에이전트가 가동되었습니다.');
        window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnStopMain) {
      btnStopMain.addEventListener('click', async () => {
        const res = await window.ThreadsAgentModel.stopAgent();
        alert(res.message || '에이전트가 중지되었습니다.');
        window.AppController.refreshThreadsAgentStatus();
      });
    }

    if (btnRefreshView) {
      btnRefreshView.addEventListener('click', async () => {
        await window.AppController.refreshThreadsAgentStatus();
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
        const res = await window.ThreadsAgentModel.saveTokenConfig(newCfg);
        alert(res.message || '토큰 및 에이전트 설정이 저장되었습니다.');
        window.AppController.refreshThreadsAgentStatus();
      });
    }
  }
};
