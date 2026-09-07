// app/views/stockDebateView.js - AI 끝장 토론실 (Debate Arena) 뷰
window.StockDebateView = {
  initialized: false,
  timerInterval: null,
  nextRunSeconds: 3600,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.bindEvents();
    this.startCountdownTimer();
  },

  startCountdownTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    // 1시간 주기 카운트다운 가상 타이머
    const now = new Date();
    const elapsedMinutes = now.getMinutes();
    const elapsedSeconds = now.getSeconds();
    this.nextRunSeconds = 3600 - ((elapsedMinutes * 60 + elapsedSeconds) % 3600);

    this.timerInterval = setInterval(() => {
      this.nextRunSeconds--;
      if (this.nextRunSeconds <= 0) {
        this.nextRunSeconds = 3600;
        if (window.StockDebateModel) {
          window.StockDebateModel.loadDebates().then(() => this.render());
        }
      }
      this.updateTimerDisplay();
    }, 1000);
  },

  updateTimerDisplay() {
    const el = document.getElementById('debate-countdown-timer');
    if (!el) return;
    const mins = Math.floor(this.nextRunSeconds / 60);
    const secs = this.nextRunSeconds % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  bindEvents() {
    // 즉시 토론 소집 버튼
    const btnTrigger = document.getElementById('btn-trigger-debate');
    const inputStock = document.getElementById('input-debate-stock');

    if (btnTrigger) {
      btnTrigger.addEventListener('click', async () => {
        const query = (inputStock ? inputStock.value : '005930').trim() || '005930';
        await this.handleTriggerDebate(query);
      });
    }

    if (inputStock) {
      inputStock.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = inputStock.value.trim() || '005930';
          await this.handleTriggerDebate(query);
        }
      });
    }

    // 종목 빠른 선택 칩
    const quickChips = document.querySelectorAll('.debate-preset-chip');
    quickChips.forEach(chip => {
      chip.addEventListener('click', async () => {
        const stock = chip.getAttribute('data-stock');
        if (inputStock) inputStock.value = stock;
        await this.handleTriggerDebate(stock);
      });
    });

    // 검색창
    const searchInput = document.getElementById('debate-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        if (window.StockDebateModel) {
          window.StockDebateModel.searchQuery = e.target.value;
          this.render();
        }
      });
    }

    // 새로고침 버튼
    const btnRefresh = document.getElementById('btn-refresh-debates');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('loading-spin');
        if (window.StockDebateModel) {
          await window.StockDebateModel.loadDebates();
        }
        this.render();
        setTimeout(() => btnRefresh.classList.remove('loading-spin'), 600);
      });
    }
  },

  async handleTriggerDebate(stockQuery) {
    const btnTrigger = document.getElementById('btn-trigger-debate');
    const statusBox = document.getElementById('debate-summon-status');

    if (btnTrigger) {
      btnTrigger.disabled = true;
      btnTrigger.innerHTML = '<span class="loading-spin">🔄</span> 에이전트 5인 소집 및 난타전 진행 중...';
    }
    if (statusBox) {
      statusBox.classList.remove('hidden');
      statusBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; color: #f59e0b; font-size: 0.88rem;">
          <span class="loading-spin" style="display:inline-block; animation: spin 1s infinite linear;">⚔️</span>
          <span><strong>[${stockQuery}]</strong> 5대 서브에이전트(성장론자·신중론자·기술분석가·주린이·단가)가 격렬한 끝장 토론을 벌이고 있습니다...</span>
        </div>
      `;
    }

    try {
      const res = await window.StockDebateModel.triggerDebate(stockQuery);
      if (res.success) {
        if (statusBox) {
          statusBox.innerHTML = `
            <div style="color: #10b981; font-size: 0.88rem;">
              ✅ <strong>[${stockQuery}]</strong> 끝장 토론이 성공적으로 완료 및 기록되었습니다! 아래 피드에서 확인하세요.
            </div>
          `;
          setTimeout(() => statusBox.classList.add('hidden'), 4000);
        }
      } else {
        if (statusBox) {
          statusBox.innerHTML = `<div style="color: #ef4444; font-size: 0.88rem;">⚠️ ${res.message || '토론 소집 실패'}</div>`;
        }
      }
    } catch (e) {
      if (statusBox) {
        statusBox.innerHTML = `<div style="color: #ef4444; font-size: 0.88rem;">❌ 오류: ${e.message}</div>`;
      }
    } finally {
      if (btnTrigger) {
        btnTrigger.disabled = false;
        btnTrigger.innerHTML = '🔥 즉시 끝장 토론 소집 (Debate Summon)';
      }
      this.render();
    }
  },

  render() {
    this.init();
    if (!window.StockDebateModel) return;

    const debates = window.StockDebateModel.getFilteredDebates();
    const container = document.getElementById('stock-debate-feed');
    if (!container) return;

    // 헤더 통계 업데이트
    this.renderHeaderStats();
    // 종목 필터 탭 렌더링
    this.renderStockFilterTabs();

    if (debates.length === 0) {
      container.innerHTML = `
        <div class="empty-debate-placeholder" style="text-align: center; padding: 60px 20px; background: rgba(30, 41, 59, 0.4); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 16px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">⚔️</div>
          <h3 style="color: #f8fafc; margin-bottom: 8px;">기록된 끝장 토론이 없습니다</h3>
          <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px;">관리메뉴의 <strong>[에이전트 정보]</strong> 화면에서 '🔥 즉시 끝장 토론 소집'을 실행하여 5대 서브에이전트의 난타전을 시작해 보세요.</p>
          <button type="button" class="btn btn-danger btn-sm" id="btn-empty-goto-summon" style="padding: 8px 16px; font-weight: 600;">
            ⚔️ 관리 > 에이전트 정보에서 토론 소집하기 &rarr;
          </button>
        </div>
      `;
      const btnEmptyGoto = document.getElementById('btn-empty-goto-summon');
      if (btnEmptyGoto) {
        btnEmptyGoto.addEventListener('click', () => {
          if (window.AppController && window.AppController.switchTopNav) {
            window.AppController.switchTopNav('admin');
            const agentSideBtn = document.querySelector('[data-side="threads-agent"]');
            if (agentSideBtn) agentSideBtn.click();
          }
        });
      }
      return;
    }

    let html = '';
    debates.forEach((d, idx) => {
      html += this.buildDebateCardHtml(d, idx);
    });

    container.innerHTML = html;
  },

  renderHeaderStats() {
    const totalEl = document.getElementById('debate-stat-total');
    const todayEl = document.getElementById('debate-stat-today');
    if (!window.StockDebateModel) return;

    const all = window.StockDebateModel.items || [];
    if (totalEl) totalEl.textContent = all.length;
    if (todayEl) {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const todayCount = all.filter(d => (d.timestamp || '').includes(new Date().toISOString().slice(0, 10))).length;
      todayEl.textContent = todayCount > 0 ? todayCount : all.length;
    }
  },

  renderStockFilterTabs() {
    const tabContainer = document.getElementById('debate-stock-tabs');
    if (!tabContainer || !window.StockDebateModel) return;

    const all = window.StockDebateModel.items || [];
    const stockMap = new Map();
    all.forEach(d => {
      const key = d.stock_name || d.item_code;
      stockMap.set(key, (stockMap.get(key) || 0) + 1);
    });

    let tabsHtml = `
      <button class="debate-tab ${window.StockDebateModel.selectedStock === 'all' ? 'active' : ''}" data-stock="all">
        전체보기 (${all.length})
      </button>
    `;

    stockMap.forEach((count, stockName) => {
      const isActive = window.StockDebateModel.selectedStock === stockName;
      tabsHtml += `
        <button class="debate-tab ${isActive ? 'active' : ''}" data-stock="${stockName}">
          ${stockName} (${count})
        </button>
      `;
    });

    tabContainer.innerHTML = tabsHtml;

    // 탭 클릭 이벤트
    tabContainer.querySelectorAll('.debate-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        window.StockDebateModel.selectedStock = btn.getAttribute('data-stock');
        this.render();
      });
    });
  },

  buildDebateCardHtml(d, idx) {
    const turns = d.turns || [];
    const heatBadge = `<span class="debate-heat-badge">🔥 EXTREME 난타전</span>`;
    const actionBadgeClass = (d.final_action || '').includes('BUY') ? 'badge-buy' : 'badge-hold';

    let turnsHtml = '';
    turns.forEach(t => {
      const isRight = (t.turn % 2 === 0);
      const isVerdict = (t.agent_id === 'danka' || t.turn === turns.length);

      if (isVerdict) {
        // 심의총괄 판정 (풀와이드 센터 하이라이트)
        turnsHtml += `
          <div class="debate-turn-verdict">
            <div class="verdict-header">
              <span class="verdict-avatar">⚖️</span>
              <div class="verdict-title-box">
                <span class="verdict-speaker">${t.role || '단가 / 메인총괄 (심의위원장)'}</span>
                <span class="verdict-badge">${t.tag || '최종 의결 판정'}</span>
              </div>
              <span class="verdict-time">${t.time || ''}</span>
            </div>
            <div class="verdict-bubble-body">
              ${(t.message || '').replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      } else {
        // 일반 공방 버블 (좌/우 티키타카)
        const bubbleThemeClass = `theme-${t.agent_id || 'general'}`;
        turnsHtml += `
          <div class="debate-turn-row ${isRight ? 'turn-right' : 'turn-left'}">
            <div class="turn-avatar-wrap">
              <span class="turn-avatar">${t.avatar || '👤'}</span>
            </div>
            <div class="turn-content-wrap">
              <div class="turn-meta">
                <span class="turn-speaker">${t.role || t.speaker}</span>
                <span class="turn-tag" style="background: ${t.badge_color || '#38bdf8'}20; color: ${t.badge_color || '#38bdf8'}; border: 1px solid ${t.badge_color || '#38bdf8'}40;">${t.tag || '발화'}</span>
                <span class="turn-time">${t.time || ''}</span>
              </div>
              <div class="turn-bubble ${bubbleThemeClass}">
                <div class="turn-text">${t.message || ''}</div>
              </div>
            </div>
          </div>
        `;
      }
    });

    return `
      <article class="stock-debate-card" id="${d.id}">
        <!-- 세션 헤더 -->
        <div class="debate-card-header">
          <div class="header-left">
            <div class="stock-title-row">
              <h3 class="debate-stock-name">${d.stock_name || '종목'}</h3>
              <span class="debate-stock-code">${d.item_code || ''}</span>
              <span class="debate-price-badge">${d.current_price ? d.current_price + '원' : ''} (${d.change_pct || '+0.0%'})</span>
              <span class="debate-val-badge">PER ${d.per || 'N/A'} | PBR ${d.pbr || 'N/A'}</span>
            </div>
            <div class="debate-topic-row">
              <span class="topic-label">🎯 토론 격돌 주제:</span>
              <strong class="topic-text">${d.topic || '핵심 모멘텀 및 밸류에이션 공방'}</strong>
            </div>
          </div>
          <div class="header-right">
            ${heatBadge}
            <span class="debate-time-badge">⏱️ ${d.timestamp || ''}</span>
          </div>
        </div>

        <!-- 멀티턴 티키타카 아레나 피드 -->
        <div class="debate-arena-timeline">
          ${turnsHtml}
        </div>

        <!-- 세션 푸터: 최종 결론 요약 -->
        <div class="debate-card-footer">
          <div class="footer-action-badge ${actionBadgeClass}">
            ${d.action_title || '⚖️ 최종 의결'}
          </div>
          <div class="footer-summary-text">
            <strong>[5인 심의 종합 결론]</strong> ${d.verdict_summary || ''}
          </div>
        </div>
      </article>
    `;
  }
};
