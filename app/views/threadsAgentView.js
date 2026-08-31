// app/views/threadsAgentView.js - Threads AI 에이전트 전용 뷰 렌더러

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
        badgeEl.innerHTML = '<span class="status-dot"></span> ⚠️ 에이전트 오프라인';
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
    const sources = model.sourcesList.length > 0 ? model.sourcesList : [
      { name: "dart_disclosure", display_name: "DART 전자공시 (국내 핵심공시/실적)", health_status: "HEALTHY", total_fetched: 0 },
      { name: "naver_finance", display_name: "네이버 증권 (국내 실시간 속보)", health_status: "HEALTHY", total_fetched: 0 },
      { name: "sec_edgar", display_name: "SEC EDGAR (미국 8-K/10-Q 핵심공시)", health_status: "HEALTHY", total_fetched: 0 },
      { name: "newsfilter", display_name: "NewsFilter (미국/글로벌 실시간 뉴스)", health_status: "HEALTHY", total_fetched: 0 },
      { name: "theregister", display_name: "The Register (글로벌 IT/반도체/AI)", health_status: "HEALTHY", total_fetched: 0 },
      { name: "tradingeconomics", display_name: "Trading Economics (글로벌 거시/금리)", health_status: "HEALTHY", total_fetched: 0 },
      { name: "physorg", display_name: "Phys.org (첨단기술/배터리/신소재)", health_status: "HEALTHY", total_fetched: 0 },
      { name: "marketchameleon", display_name: "MarketChameleon (옵션특이거래)", health_status: "HEALTHY", total_fetched: 0 }
    ];
    const posts = model.publishedPosts || [];
    const cfg = model.tokenConfig;

    const sched = status.dynamic_schedule || {};
    const stats = status.statistics || {};

    container.innerHTML = `
      <div class="view-header">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2>🤖 Threads AI 에이전트 원격 대시보드</h2>
            <p>실시간 뉴스·공시 데이터 수집 에이전트 가동 상태 및 8대 소스 토글, 60일 API 토큰 만료를 관리합니다.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-agent-trigger-view" class="btn btn-warning btn-sm">⚡ 즉시 1회 수집·발행</button>
            <button type="button" id="btn-agent-refresh-view" class="btn btn-secondary btn-sm">🔄 상태 새로고침</button>
          </div>
        </div>
      </div>

      <!-- 1. 가동 현황 요약 카드 -->
      <div class="agent-dash-grid">
        <div class="card agent-card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title">📡 에이전트 가동 현황</h3>
            <span class="${status.is_running ? 'agent-badge badge-running' : (status.is_offline ? 'agent-badge badge-offline' : 'agent-badge badge-stopped')}">
              ${status.is_running ? '🟢 가동 중' : (status.is_offline ? '⚠️ 에이전트 오프라인' : '🔴 일시정지됨')}
            </span>
          </div>
          <div class="card-body">
            <div class="metric-row">
              <div class="metric-box">
                <span class="metric-label">현재 장 상태 (Phase)</span>
                <span class="metric-val text-accent">${sched.market_name || '국내/미국 혼합장'}</span>
              </div>
              <div class="metric-box">
                <span class="metric-label">시장 비중 (국내 : 미국)</span>
                <span class="metric-val">${sched.kr_weight || '50%'} : ${sched.us_weight || '50%'}</span>
              </div>
              <div class="metric-box">
                <span class="metric-label">수집 기사 수</span>
                <span class="metric-val text-success">${stats.total_articles_crawled || 0}건</span>
              </div>
              <div class="metric-box">
                <span class="metric-label">발행 완료 스레드</span>
                <span class="metric-val text-primary">${stats.total_posts_generated || 0}건</span>
              </div>
            </div>

            <div class="agent-control-btn-group" style="margin-top: 16px; display: flex; gap: 10px;">
              <button type="button" id="btn-agent-start-main" class="btn btn-success" style="flex: 1;" ${status.is_running ? 'disabled' : ''}>▶ 에이전트 가동 시작</button>
              <button type="button" id="btn-agent-stop-main" class="btn btn-danger" style="flex: 1;" ${!status.is_running ? 'disabled' : ''}>⏹ 에이전트 일시정지</button>
            </div>
          </div>
        </div>

        <!-- 2. Threads API 토큰 60일 만료 관리 카드 -->
        <div class="card agent-card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h3 class="card-title">🔑 Threads API 토큰 60일 만료 관리</h3>
            <span class="${dDayInfo.isWarning ? 'agent-badge dday-warning' : 'agent-badge dday-normal'}">
              ${dDayInfo.isExpired ? '⚠️ 토큰 만료됨' : `D-${dDayInfo.dDay}일 남음`}
            </span>
          </div>
          <div class="card-body">
            <div class="token-dday-progress-box" style="margin-bottom: 16px; background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.84rem; color: #94a3b8;">토큰 잔여 카운트다운 (-1일/1일)</span>
                <span style="font-weight: 700; color: ${dDayInfo.isWarning ? '#fca5a5' : '#38bdf8'}; font-size: 1rem;">
                  ${dDayInfo.dDay}일 / ${cfg.validDays || 60}일
                </span>
              </div>
              <div class="progress-bar-bg" style="width: 100%; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
                <div class="progress-bar-fill" style="width: ${Math.max(0, Math.min(100, Math.round((dDayInfo.dDay / (cfg.validDays || 60)) * 100)))}%; height: 100%; background: ${dDayInfo.isWarning ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #38bdf8, #818cf8)'}; transition: width 0.3s ease;"></div>
              </div>
            </div>

            <form id="form-token-config" class="form-grid">
              <div class="form-group">
                <label>토큰 발급 일자 (Issued Date)</label>
                <input type="date" id="token-issued-date" class="form-control" value="${cfg.tokenIssuedDate || ''}">
              </div>
              <div class="form-group">
                <label>유효 기간 (기본 60일)</label>
                <input type="number" id="token-valid-days" class="form-control" value="${cfg.validDays || 60}" min="1" max="365">
              </div>
              <div class="form-group">
                <label>만료 예정일</label>
                <input type="text" class="form-control" value="${dDayInfo.expiryDateStr}" readonly style="background: rgba(255,255,255,0.05); color: #94a3b8;">
              </div>
              <div class="form-group">
                <label>에이전트 서버 Base URL</label>
                <input type="text" id="token-agent-url" class="form-control" value="${cfg.agentBaseUrl || 'http://127.0.0.1:8000'}" placeholder="http://127.0.0.1:8000">
              </div>
              <div style="grid-column: span 2; margin-top: 6px;">
                <button type="submit" class="btn btn-primary" style="width: 100%;">💾 토큰 설정 저장</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- 3. 8대 수집 소스 On/Off 토글 카드 -->
      <div class="card agent-card" style="margin-top: 20px;">
        <div class="card-header">
          <h3 class="card-title">🌐 8대 뉴스·공시 수집 사이트 On/Off 토글</h3>
        </div>
        <div class="card-body">
          <div class="sources-grid">
            ${sources.map(src => `
              <div class="source-item-card ${src.health_status === 'HEALTHY' ? 'src-healthy' : ''}">
                <div class="source-info">
                  <span class="source-name">${src.display_name || src.name}</span>
                  <span class="source-code">${src.name}</span>
                </div>
                <div class="source-meta">
                  <span class="badge ${src.health_status === 'HEALTHY' ? 'badge-success' : 'badge-warning'}">
                    ${src.health_status || 'HEALTHY'}
                  </span>
                  <span class="fetch-count">수집 ${src.total_fetched || 0}건</span>
                  <button type="button" class="btn btn-sm btn-outline btn-toggle-src" data-source="${src.name}">
                    🔄 토글 Switch
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 4. 발행된 포스팅 이력 목록 -->
      <div class="card agent-card" style="margin-top: 20px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">📜 스레드 발행 포스팅 내역 (최근 20건)</h3>
          <span class="text-sub">총 ${posts.length}건</span>
        </div>
        <div class="card-body" style="overflow-x: auto;">
          <table class="data-table agent-posts-table" style="table-layout: fixed; width: 100%;">
            <thead>
              <tr>
                <th style="width: 50px;">ID</th>
                <th style="width: auto;">제목 및 요약</th>
                <th style="width: 120px;">관련 종목</th>
                <th style="width: 90px;">발행 상태</th>
                <th style="width: 140px;">발행 일시</th>
                <th style="width: 90px;">원문 링크</th>
              </tr>
            </thead>
            <tbody>
              ${posts.length === 0 ? `
                <tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:20px;">발행된 포스팅 내역이 없거나 에이전트에 연결되지 않았습니다.</td></tr>
              ` : posts.map(p => `
                <tr>
                  <td>#${p.id}</td>
                  <td>
                    <div style="font-weight:600; color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${(p.title || '').replace(/"/g, '&quot;')}">
                      ${p.title || '제목 없음'}
                    </div>
                    <div style="font-size:0.8rem; color:#94a3b8; line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;" title="${(p.summary_text || '').replace(/"/g, '&quot;')}">
                      ${p.summary_text || ''}
                    </div>
                  </td>
                  <td><span class="tag-badge" style="max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block;">${p.symbols || '-'}</span></td>
                  <td><span class="badge badge-success">${p.status || 'PUBLISHED'}</span></td>
                  <td style="font-size:0.8rem; color:#94a3b8;">${p.created_at ? p.created_at.replace('T', ' ').substring(0, 19) : '-'}</td>
                  <td>
                    ${p.article_url ? `<a href="${p.article_url}" target="_blank" rel="noopener" class="link-btn">🔗 보기</a>` : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindViewEvents();
  },

  bindEvents() {
    const btnStart = document.getElementById('btn-header-agent-start');
    const btnStop = document.getElementById('btn-header-agent-stop');
    const btnTrigger = document.getElementById('btn-header-agent-trigger');

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

    if (btnTrigger) {
      btnTrigger.addEventListener('click', async () => {
        if (confirm('즉시 1회 뉴스/공시 수집 및 포스팅 발행을 실행하시겠습니까?')) {
          const res = await window.ThreadsAgentModel.triggerOnce();
          alert(res.message || '즉시 실행이 완료되었습니다.');
          window.AppController.refreshThreadsAgentStatus();
        }
      });
    }
  },

  bindViewEvents() {
    const btnStartMain = document.getElementById('btn-agent-start-main');
    const btnStopMain = document.getElementById('btn-agent-stop-main');
    const btnTriggerView = document.getElementById('btn-agent-trigger-view');
    const btnRefreshView = document.getElementById('btn-agent-refresh-view');
    const formToken = document.getElementById('form-token-config');
    const btnTestEmail = document.getElementById('btn-test-email');

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

    if (btnTriggerView) {
      btnTriggerView.addEventListener('click', async () => {
        alert('즉시 1회 수집 및 포스팅을 실행합니다. (잠시 기다려주세요)');
        const res = await window.ThreadsAgentModel.triggerOnce();
        alert(res.message || '완료되었습니다.');
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

    const toggleBtns = document.querySelectorAll('.btn-toggle-src');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const srcName = e.currentTarget.getAttribute('data-source');
        if (srcName) {
          const res = await window.ThreadsAgentModel.toggleSource(srcName);
          alert(`[${srcName}] 토글 상태가 변경되었습니다.`);
          window.AppController.refreshThreadsAgentStatus();
        }
      });
    });
  }
};
