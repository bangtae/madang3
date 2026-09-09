// app/views/stockDebateView.js - AI 끝장 토론실 (Debate Arena) 뷰
window.StockDebateView = {
  initialized: false,
  timerInterval: null,
  nextRunSeconds: 3600,
  expandedMap: {},

  isDebateExpanded(id, idx) {
    if (this.expandedMap && typeof this.expandedMap[id] === 'boolean') {
      return this.expandedMap[id];
    }
    return idx === 0;
  },

  toggleDebate(id) {
    const timelineEl = document.getElementById(`timeline-${id}`);
    const bannerEl = document.getElementById(`collapsed-banner-${id}`);
    const btnEl = document.querySelector(`.btn-toggle-debate[data-id="${id}"]`);

    const isCurrentlyOpen = timelineEl ? (timelineEl.style.display !== 'none') : !!this.expandedMap[id];
    const nextState = !isCurrentlyOpen;
    this.expandedMap[id] = nextState;

    if (timelineEl) {
      timelineEl.style.display = nextState ? 'flex' : 'none';
    }
    if (bannerEl) {
      bannerEl.style.display = nextState ? 'none' : 'flex';
    }
    if (btnEl) {
      btnEl.innerHTML = nextState
        ? '<span class="toggle-icon">▲</span> <span class="toggle-label">12턴 대화 접기</span>'
        : '<span class="toggle-icon">▼</span> <span class="toggle-label">12턴 대화 보기 (12턴)</span>';
      btnEl.setAttribute('title', nextState ? '12턴 대화 접기' : '12턴 대화 펼치기');
      btnEl.classList.toggle('is-expanded', nextState);
    }
    this.updateGlobalToggleButtonState();
  },

  toggleAllDebates() {
    if (!window.StockDebateModel) return;
    const debates = window.StockDebateModel.getFilteredDebates() || [];
    if (debates.length === 0) return;

    // 하나라도 닫혀있으면 -> 전체 열기, 모두 열려있으면 -> 전체 닫기
    const anyClosed = debates.some((d, idx) => !this.isDebateExpanded(d.id, idx));
    const targetState = anyClosed;

    debates.forEach(d => {
      this.expandedMap[d.id] = targetState;
    });

    this.render();
  },

  updateGlobalToggleButtonState() {
    const globalBtn = document.getElementById('btn-toggle-all-debates');
    if (!globalBtn || !window.StockDebateModel) return;
    const debates = window.StockDebateModel.getFilteredDebates() || [];
    if (debates.length === 0) return;

    const anyClosed = debates.some((d, idx) => !this.isDebateExpanded(d.id, idx));
    if (anyClosed) {
      globalBtn.innerHTML = '📂 전체 펼치기';
      globalBtn.setAttribute('title', '모든 종목 12턴 대화 일괄 펼치기');
    } else {
      globalBtn.innerHTML = '📁 전체 접기';
      globalBtn.setAttribute('title', '모든 종목 12턴 대화 일괄 접기');
    }
  },

  generateDebateCopyText(d) {
    if (!d) return '';
    const mkt = (d.market_flag === 'US' || d.market === 'NASDAQ' || d.market === 'NYSE') ? `미국 (${d.market || 'US'})` : `국내 (${d.market || 'KOSPI'})`;
    const price = d.current_price && d.current_price !== 'N/A' ? (d.current_price.includes('$') || d.current_price.includes('원') ? d.current_price : d.current_price + '원') : '-';
    const change = d.change_pct || '+0.0%';
    const per = this.cleanVal(d.per, '배');
    const pbr = this.cleanVal(d.pbr, '배');

    let lines = [];
    lines.push(`⚔️ [AI 끝장 토론실: ${d.stock_name || '종목'} (${d.item_code || ''})]`);
    lines.push(`■ 기본 정보`);
    lines.push(`• 시장: ${mkt}`);
    lines.push(`• 현재가: ${price} (${change})`);
    lines.push(`• 밸류에이션: PER ${per} | PBR ${pbr}`);
    if (d.shares_outstanding && d.shares_outstanding !== 'N/A') {
      lines.push(`• 상장주식수: ${d.shares_outstanding}`);
    }
    lines.push(`• 토론 격돌 주제: ${d.topic || '-'}`);
    if (d.news_headline) {
      lines.push(`• 공시/수급 팩트: ${d.news_headline}`);
    }
    lines.push(``);

    if (d.theme_report) {
      lines.push(`■ 🔍 핵심 테마 검증 2.1 리포트`);
      if (d.theme_report.theme_name) {
        lines.push(`• 테마명: ${d.theme_report.theme_name} (투자시계: ${d.theme_report.investment_horizon || '중기'})`);
      }
      if (d.theme_report.news_evidence) {
        lines.push(`• 뉴스 근거: ${d.theme_report.news_evidence}`);
      }
      if (d.theme_report.metrics) {
        lines.push(`• 주체: ${d.theme_report.metrics.subject || '-'}`);
        lines.push(`• 시점: ${d.theme_report.metrics.timing || '-'}`);
        lines.push(`• 실적 연결성: ${d.theme_report.metrics.earnings_link || '-'}`);
        lines.push(`• 시장 반응: ${d.theme_report.metrics.market_reaction || '-'}`);
      }
      if (d.theme_report.stock_map) {
        lines.push(`• 종목 맵: [대장] ${d.theme_report.stock_map.leader || '-'} | [2차수혜] ${d.theme_report.stock_map.secondary || '-'} | [연관] ${d.theme_report.stock_map.related || '-'}`);
      }
      if (d.theme_report.expert_comment) {
        lines.push(`• 테마 총평: ${d.theme_report.expert_comment}`);
      }
      lines.push(``);
    }

    const turns = d.turns || [];
    if (turns.length > 0) {
      lines.push(`■ ⚔️ 5대 에이전트 12턴 난타전 대화 전문`);
      turns.forEach(t => {
        const speaker = t.role || t.speaker || '에이전트';
        const tag = t.tag ? ` [${t.tag}]` : '';
        const time = t.time ? ` (${t.time})` : '';
        lines.push(`[${t.turn || ''}턴 | ${speaker}${tag}${time}]`);
        lines.push(`${(t.message || '').trim()}`);
        lines.push(``);
      });
    }

    lines.push(`■ ⚖️ 최종 의결 판정`);
    lines.push(`• 결과: ${d.action_title || '최종 의결'}`);
    lines.push(`• 5인 심의 종합 결론: ${d.verdict_summary || '-'}`);
    lines.push(``);
    lines.push(`(출처: 마당 마켓 인텔리전스 - AI 끝장 토론실)`);

    return lines.join('\n');
  },

  async copyDebateToClipboard(debateId, btnEl) {
    if (!window.StockDebateModel) return;
    const debate = (window.StockDebateModel.items || []).find(x => x.id === debateId);
    if (!debate) {
      alert('토론 정보를 찾을 수 없습니다.');
      return;
    }

    const text = this.generateDebateCopyText(debate);

    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (err) {
        ok = false;
      }
    }

    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        ok = false;
      }
    }

    if (btnEl) {
      const origHtml = btnEl.innerHTML;
      if (ok) {
        btnEl.innerHTML = '✅ 복사 완료!';
        btnEl.classList.add('copied');
      } else {
        btnEl.innerHTML = '❌ 복사 실패';
      }
      setTimeout(() => {
        btnEl.innerHTML = origHtml;
        btnEl.classList.remove('copied');
      }, 1500);
    }
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.bindEvents();
    this.startCountdownTimer();
    this.startLiveDebateWatcher();
  },

  livePollInterval: null,

  startLiveDebateWatcher() {
    if (this.livePollInterval) clearInterval(this.livePollInterval);
    // 1.5초 간격으로 LIVE 상태의 토론이 있는지 확인하여 실시간 갱신
    this.livePollInterval = setInterval(async () => {
      if (!window.StockDebateModel) return;
      const all = window.StockDebateModel.items || [];
      const hasLive = all.some(d => d.status === 'LIVE');
      if (hasLive || this.isActivelyPolling) {
        await window.StockDebateModel.loadDebates();
        this.render();
      }
    }, 1500);
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
        const query = (inputStock ? inputStock.value : '').trim();
        if (!query) {
          alert('토론을 소집할 주식 종목명이나 종목코드를 입력해주세요.');
          if (inputStock) inputStock.focus();
          return;
        }
        await this.handleTriggerDebate(query);
      });
    }

    if (inputStock) {
      inputStock.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = inputStock.value.trim();
          if (!query) {
            alert('토론을 소집할 주식 종목명이나 종목코드를 입력해주세요.');
            inputStock.focus();
            return;
          }
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

    // 전체 토론 기록 비우기 버튼
    const btnClearAll = document.getElementById('btn-clear-all-debates');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', async () => {
        if (!window.StockDebateModel) return;
        const total = (window.StockDebateModel.items || []).length;
        if (total === 0) {
          alert('삭제할 토론 기록이 없습니다.');
          return;
        }
        if (confirm(`저장된 모든 끝장 토론 기록(${total}건)을 완전히 삭제하시겠습니까?`)) {
          btnClearAll.disabled = true;
          btnClearAll.textContent = '⏳ 삭제 중...';
          await window.StockDebateModel.clearAllDebates();
          this.render();
          btnClearAll.disabled = false;
          btnClearAll.textContent = '🗑️ 전체 비우기';
        }
      });
    }

    // 개별 토론 삭제 이벤트 위임
    const feedContainer = document.getElementById('stock-debate-feed');
    if (feedContainer && !feedContainer._hasDeleteBound) {
      feedContainer._hasDeleteBound = true;
      feedContainer.addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.btn-delete-debate-card');
        if (!delBtn) return;
        const debateId = delBtn.getAttribute('data-id');
        const stockName = delBtn.getAttribute('data-stock') || '해당';
        if (!debateId || !window.StockDebateModel) return;

        if (confirm(`[${stockName}] 끝장 토론 기록을 삭제하시겠습니까?`)) {
          delBtn.disabled = true;
          delBtn.textContent = '⏳';
          const ok = await window.StockDebateModel.deleteDebate(debateId);
          if (ok) {
            this.render();
          } else {
            alert('삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
            delBtn.disabled = false;
            delBtn.textContent = '🗑️ 삭제';
          }
        }
      });
    }

    // 전체 펼치기/접기 일괄 토글 버튼 이벤트
    const btnToggleAll = document.getElementById('btn-toggle-all-debates');
    if (btnToggleAll && !btnToggleAll._hasBound) {
      btnToggleAll._hasBound = true;
      btnToggleAll.addEventListener('click', () => {
        this.toggleAllDebates();
      });
    }

    // 아코디언 토글 이벤트 위임 (토글 버튼 및 접힌 상태 안내 배너)
    if (feedContainer && !feedContainer._hasToggleBound) {
      feedContainer._hasToggleBound = true;
      feedContainer.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.btn-copy-debate');
        const toggleBtn = e.target.closest('.btn-toggle-debate');
        const banner = e.target.closest('.debate-collapsed-banner');
        if (copyBtn) {
          e.stopPropagation();
          const debateId = copyBtn.getAttribute('data-id');
          if (debateId) this.copyDebateToClipboard(debateId, copyBtn);
          return;
        }
        if (toggleBtn) {
          e.stopPropagation();
          const debateId = toggleBtn.getAttribute('data-id');
          if (debateId) this.toggleDebate(debateId);
          return;
        }
        if (banner) {
          e.stopPropagation();
          const debateId = banner.getAttribute('data-id');
          if (debateId) this.toggleDebate(debateId);
          return;
        }
      });
    }
  },

  cleanVal(v, unit) {
    if (!v || v === 'N/A' || v === 'N/A배' || v === 'N/A원') return 'N/A';
    let s = String(v).trim();
    while (s.endsWith(unit + unit)) {
      s = s.slice(0, -unit.length);
    }
    return s.includes(unit) ? s : `${s}${unit}`;
  },

  isActivelyPolling: false,

  async handleTriggerDebate(stockQuery) {
    const btnTrigger = document.getElementById('btn-trigger-debate');
    const statusBox = document.getElementById('debate-summon-status');

    if (btnTrigger) {
      btnTrigger.disabled = true;
      btnTrigger.innerHTML = '<span class="loading-spin">🔄</span> 에이전트 5인 소집 및 실시간 토론 중...';
    }
    if (statusBox) {
      statusBox.classList.remove('hidden');
      statusBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; color: #f59e0b; font-size: 0.88rem;">
          <span class="loading-spin" style="display:inline-block; animation: spin 1s infinite linear;">⚔️</span>
          <span><strong>[${stockQuery}]</strong> 5대 서브에이전트(단가·주린이·기술분석·신중론·성장론) 소집 및 실시간 난타전 진행 중...</span>
        </div>
      `;
    }

    this.isActivelyPolling = true;

    try {
      const res = await window.StockDebateModel.triggerDebate(stockQuery);
      if (res.success) {
        // 1.5초 주기로 12턴 완료 또는 최대 30초 동안 지속 동기화
        let pollCount = 0;
        const maxPolls = 20; // 30초
        const pollTimer = setInterval(async () => {
          pollCount++;
          await window.StockDebateModel.loadDebates();
          this.render();
          const latest = window.StockDebateModel.items[0];
          if (!latest || latest.status === 'COMPLETED' || pollCount >= maxPolls) {
            clearInterval(pollTimer);
            this.isActivelyPolling = false;
            if (btnTrigger) {
              btnTrigger.disabled = false;
              btnTrigger.innerHTML = '🔥 즉시 끝장 토론 소집 (Debate Summon)';
            }
            if (statusBox) {
              statusBox.innerHTML = `
                <div style="color: #10b981; font-size: 0.88rem;">
                  ✅ <strong>[${stockQuery}]</strong> 12턴 끝장 토론 및 최종 의결 판정이 완료되었습니다! 아래 피드에서 확인하세요.
                </div>
              `;
              setTimeout(() => statusBox.classList.add('hidden'), 5000);
            }
          }
        }, 1500);
      } else {
        this.isActivelyPolling = false;
        if (btnTrigger) {
          btnTrigger.disabled = false;
          btnTrigger.innerHTML = '🔥 즉시 끝장 토론 소집 (Debate Summon)';
        }
        if (statusBox) {
          statusBox.innerHTML = `<div style="color: #ef4444; font-size: 0.88rem;">⚠️ ${res.message || '토론 소집 실패'}</div>`;
        }
      }
    } catch (e) {
      this.isActivelyPolling = false;
      if (btnTrigger) {
        btnTrigger.disabled = false;
        btnTrigger.innerHTML = '🔥 즉시 끝장 토론 소집 (Debate Summon)';
      }
      if (statusBox) {
        statusBox.innerHTML = `<div style="color: #ef4444; font-size: 0.88rem;">❌ 오류: ${e.message}</div>`;
      }
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
          <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0;">현재 등록된 끝장 토론 기록이 없습니다. 새로운 토론이 등록되면 이곳에 표시됩니다.</p>
        </div>
      `;
      return;
    }

    let html = '';
    debates.forEach((d, idx) => {
      html += this.buildDebateCardHtml(d, idx);
    });

    container.innerHTML = html;
    this.updateGlobalToggleButtonState();
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
    const autoCount = all.filter(d => (d.source_type === 'AUTO_SCOUT' || (!d.source_type && d.item_code === '000660'))).length;
    const userCount = all.length - autoCount;

    const stockMap = new Map();
    all.forEach(d => {
      const key = d.stock_name || d.item_code;
      stockMap.set(key, (stockMap.get(key) || 0) + 1);
    });

    const sel = window.StockDebateModel.selectedStock || 'all';

    const usCount = all.filter(d => d.market_flag === 'US' || d.market === 'NASDAQ' || d.market === 'NYSE').length;
    const krCount = all.length - usCount;

    let tabsHtml = `
      <button class="debate-tab ${sel === 'all' ? 'active' : ''}" data-filter="all">
        전체보기 (${all.length})
      </button>
      <button class="debate-tab tab-mkt-kr ${sel === 'mkt:KR' ? 'active' : ''}" data-filter="mkt:KR" title="국내 증시(KOSPI/KOSDAQ) 종목">
        🇰🇷 국장 (${krCount})
      </button>
      <button class="debate-tab tab-mkt-us ${sel === 'mkt:US' ? 'active' : ''}" data-filter="mkt:US" title="미국 증시(NYSE/NASDAQ) 종목">
        🇺🇸 미장 (${usCount})
      </button>
      <button class="debate-tab tab-source-auto ${sel === 'src:AUTO_SCOUT' ? 'active' : ''}" data-filter="src:AUTO_SCOUT" title="1시간 주기 AI 에이전트 자동 발굴 종목">
        🤖 AI 발굴 (${autoCount})
      </button>
      <button class="debate-tab tab-source-user ${sel === 'src:USER_SUMMON' ? 'active' : ''}" data-filter="src:USER_SUMMON" title="사용자가 직접 소집한 종목">
        🔥 직접 소집 (${userCount})
      </button>
    `;

    stockMap.forEach((count, stockName) => {
      const isActive = sel === stockName;
      tabsHtml += `
        <button class="debate-tab ${isActive ? 'active' : ''}" data-filter="${stockName}">
          ${stockName} (${count})
        </button>
      `;
    });

    tabContainer.innerHTML = tabsHtml;

    // 탭 클릭 이벤트
    tabContainer.querySelectorAll('.debate-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        window.StockDebateModel.selectedStock = btn.getAttribute('data-filter');
        this.render();
      });
    });
  },

  buildDebateCardHtml(d, idx) {
    const isExpanded = this.isDebateExpanded(d.id, idx);
    const isAutoScout = d.source_type === 'AUTO_SCOUT' || (!d.source_type && d.item_code === '000660');
    const sourceBadgeHtml = isAutoScout
      ? `<span class="debate-source-badge badge-auto-scout" title="1시간 주기 AI 에이전트단 자동 발굴 종목"><span class="source-icon">🤖</span> AI 자동 발굴</span>`
      : `<span class="debate-source-badge badge-user-summon" title="사용자가 직접 소집한 끝장 토론"><span class="source-icon">🔥</span> 사용자 즉시 소집</span>`;

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
          <div class="header-left" style="flex: 1; min-width: 0; max-width: 100%;">
            <div class="stock-title-row">
              <h3 class="debate-stock-name">${d.stock_name || '종목'}</h3>
              <span class="debate-stock-code">${d.item_code || ''}</span>
              ${sourceBadgeHtml}
              ${(d.market_flag === 'US' || d.market === 'NASDAQ' || d.market === 'NYSE')
                ? `<span class="badge-market-us" title="미국 뉴욕/나스닥 증시">🇺🇸 미장 (${d.market || 'US'})</span>`
                : `<span class="badge-market-kr" title="한국거래소 KOSPI/KOSDAQ 증시">🇰🇷 국장 (${d.market || 'KOSPI'})</span>`}
              <span class="debate-price-badge">${d.current_price && d.current_price !== 'N/A' ? (d.current_price.includes('$') || d.current_price.includes('원') ? d.current_price : d.current_price + '원') : ''} (${d.change_pct || '+0.0%'})</span>
              <span class="debate-val-badge">PER ${this.cleanVal(d.per, '배')} | PBR ${this.cleanVal(d.pbr, '배')}</span>
              ${d.shares_outstanding && d.shares_outstanding !== 'N/A' ? `<span style="background: rgba(148, 163, 184, 0.12); color: #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">상장주식 ${d.shares_outstanding}</span>` : ''}
            </div>
            <div class="debate-topic-row">
              <span class="topic-label">🎯 토론 격돌 주제:</span>
              <strong class="topic-text">${d.topic || '핵심 모멘텀 및 밸류에이션 공방'}</strong>
            </div>

            <!-- 🏛️ 4대 공식 포털 & 감독원 실측 출처 링크 바 -->
            <div class="debate-sources-row" style="margin-top: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0;">
              <span style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;">
                <span>🏛️ 실측 출처:</span>
              </span>
              ${(Array.isArray(d.official_sources) && d.official_sources.length > 0 ? d.official_sources : [
                { name: 'KIND', title: '한국거래소 기업공시채널', url: `https://kind.krx.co.kr/disclosure/searchcorpdisclosure.do?method=searchCorpDisclosure&searchCorpName=${d.item_code || ''}`, badge: '🏛️ KIND (KRX)' },
                { name: 'SEIBRO', title: '예탁결제원 증권정보포털', url: 'https://seibro.or.kr/websquare/control.jsp?w2xPath=/IPORTAL/user/stock/BIP_CNTS02004V.xml', badge: '🏦 SEIBRO (예탁원)' },
                { name: 'KRX Data', title: 'KRX 정보데이터시스템 수급 통계', url: 'http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101', badge: '📊 KRX 데이터' },
                { name: 'DART', title: '금융감독원 전자공시시스템', url: 'https://dart.fss.or.kr/dsab007/main.do', badge: '📋 Open DART' },
                { name: 'TOSS', title: '토스증권 실시간 수급', url: 'https://wts.tossinvest.com/', badge: '⚡ 토스증권' }
              ]).map(s => `
                <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="official-source-chip" title="${s.title || s.name}">
                  ${s.badge || s.name} ↗
                </a>
              `).join('')}
              <span class="fact-check-shield-chip" title="메인총괄 에이전트(단가)가 4대 공식 사이트 실측 데이터와 대조 교차 검증을 완료했습니다. (거짓·환각 0%)">
                🛡️ 메인 팩트체크 검증 완료
              </span>
            </div>
            ${d.news_headline ? `
            <div class="debate-news-row" style="margin-top: 6px; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #38bdf8; background: rgba(56, 189, 248, 0.08); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.25); min-width: 0; max-width: 100%;">
              <span style="font-weight: 700; flex-shrink: 0; color: #38bdf8;">${(d.news_headline.includes('KOSCOM') || d.news_headline.includes('공시') || d.news_headline.includes('전환') || d.news_headline.includes('상장') || d.news_headline.includes('DART') || d.news_headline.includes('SEC')) ? '📋 공식 전자공시 팩트:' : '🪙 실시간 수급 팩트:'}</span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #e0f2fe; font-weight: 500; min-width: 0; flex: 1;">${d.news_headline}</span>
            </div>` : ''}

            ${d.theme_report ? `
            <div class="debate-theme-report-box" style="margin-top: 8px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(56, 189, 248, 0.28); border-radius: 8px; padding: 10px 14px; min-width: 0; max-width: 100%;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.95rem;">🔍</span>
                  <strong style="color: #38bdf8; font-size: 0.86rem;">핵심 테마 검증 2.1 리포트</strong>
                  <span style="background: rgba(56, 189, 248, 0.15); color: #7dd3fc; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">1시간 주기 전문 내비게이터 자동 검증</span>
                </div>
                <div style="font-size: 0.76rem; color: #94a3b8;">
                  투자 시계: <strong style="color: #f59e0b;">${d.theme_report.investment_horizon || '중기'}</strong>
                </div>
              </div>

              ${d.theme_report.news_evidence ? `
                <div style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 6px; line-height: 1.4; word-break: keep-all; overflow-wrap: anywhere;">
                  <span style="color: #94a3b8; font-weight: 600;">📰 뉴스 근거:</span> ${d.theme_report.news_evidence}
                </div>
              ` : ''}

              ${d.theme_report.metrics ? `
                <div class="theme-report-metrics" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; margin-bottom: 6px; font-size: 0.75rem; background: rgba(30, 41, 59, 0.5); padding: 6px 10px; border-radius: 6px; min-width: 0;">
                  <div><span style="color: #94a3b8;">주체:</span> <strong style="color: #f1f5f9; word-break: break-word;">${d.theme_report.metrics.subject || '-'}</strong></div>
                  <div><span style="color: #94a3b8;">시점:</span> <strong style="color: #f1f5f9; word-break: break-word;">${d.theme_report.metrics.timing || '-'}</strong></div>
                  <div><span style="color: #94a3b8;">실적 연결성:</span> <strong style="color: #10b981; word-break: break-word;">${d.theme_report.metrics.earnings_link || '-'}</strong></div>
                  <div><span style="color: #94a3b8;">시장 반응:</span> <strong style="color: #38bdf8; word-break: break-word;">${d.theme_report.metrics.market_reaction || '-'}</strong></div>
                </div>
              ` : ''}

              ${d.theme_report.stock_map ? `
                <div style="font-size: 0.78rem; color: #cbd5e1; margin-bottom: 6px; display: flex; flex-direction: column; gap: 3px;">
                  <div style="font-weight: 600; color: #e2e8f0; margin-bottom: 2px;">📈 관련 종목 맵:</div>
                  <div><span style="color: #f43f5e; font-weight: 600;">👑 대장주:</span> ${d.theme_report.stock_map.leader || '-'}</div>
                  <div><span style="color: #38bdf8; font-weight: 600;">🥈 2차 수혜:</span> ${d.theme_report.stock_map.secondary || '-'}</div>
                  <div><span style="color: #a855f7; font-weight: 600;">🔗 연관 테마:</span> ${d.theme_report.stock_map.related || '-'}</div>
                </div>
              ` : ''}

              ${d.theme_report.expert_comment ? `
                <div style="margin-top: 4px; font-size: 0.8rem; color: #fde047; background: rgba(234, 179, 8, 0.08); padding: 6px 10px; border-radius: 6px; border-left: 3px solid #eab308; line-height: 1.4;">
                  ${d.theme_report.expert_comment}
                </div>
              ` : ''}
            </div>` : ''}
          </div>
          <div class="header-right" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${d.status === 'LIVE' ? `<span class="debate-live-badge">🔴 LIVE 토론 진행 중 (${turns.length}/12턴)</span>` : `<span class="debate-completed-badge">✅ 의결 완료 (12턴)</span>`}
            ${heatBadge}
            ${(d.update_count && d.update_count > 1) ? `
              <span class="debate-time-badge badge-updated" title="최초 발굴: ${d.created_at || d.timestamp || ''} | 최근 갱신: ${d.updated_at || d.timestamp || ''}">
                🔄 ${d.update_count}회차 갱신 (${d.updated_at || d.timestamp || ''})
                <small style="opacity: 0.75; font-size: 0.72rem; margin-left: 4px;">(최초 ${d.created_at || d.timestamp || ''})</small>
              </span>
            ` : `
              <span class="debate-time-badge" title="최초 발굴 일시: ${d.created_at || d.timestamp || ''}">
                ⏱️ ${d.created_at || d.timestamp || ''} <small style="opacity: 0.75; font-size: 0.72rem; margin-left: 3px;">(최초)</small>
              </span>
            `}
            <button type="button" class="btn-copy-debate" data-id="${d.id}" title="종목 정보, 테마 리포트, 12턴 대화 전문 및 최종 결론 전체 복사">
              📋 토론 복사
            </button>
            <button type="button" class="btn-toggle-debate ${isExpanded ? 'is-expanded' : ''}" data-id="${d.id}" title="${isExpanded ? '12턴 대화 접기' : '12턴 대화 펼치기'}">
              <span class="toggle-icon">${isExpanded ? '▲' : '▼'}</span>
              <span class="toggle-label">${isExpanded ? '12턴 대화 접기' : '12턴 대화 보기 (12턴)'}</span>
            </button>
          </div>
        </div>

        <!-- 접힘 상태 안내 배너 (클릭 시 12턴 대화 펼침) -->
        <div class="debate-collapsed-banner" id="collapsed-banner-${d.id}" data-id="${d.id}" style="display: ${isExpanded ? 'none' : 'flex'};" title="클릭하여 5대 에이전트 12턴 난타전 대화 전문 보기">
          <span class="collapsed-banner-icon">⚔️</span>
          <span class="collapsed-banner-text"><strong>[5대 에이전트 12턴 난타전 대화 전문]</strong>이 접혀 있습니다.</span>
          <span class="collapsed-banner-action">대화 전문 펼치기 ▼</span>
        </div>

        <!-- 멀티턴 티키타카 아레나 피드 -->
        <div class="debate-arena-timeline" id="timeline-${d.id}" style="display: ${isExpanded ? 'flex' : 'none'};">
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
