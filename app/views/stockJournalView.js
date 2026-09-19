// app/views/stockJournalView.js - 토스증권 Open API & AI 끝장토론 주식 매매일지 뷰 (조회 및 일지 모니터링 전용)
(function(window) {
  'use strict';

  const StockJournalView = {
    initialized: false,
    pollTimer: null,
    pollIntervalMs: 30000, // 30초 주기 자동 갱신
    isAutoTrading: false,
    currentPosition: null,
    customStrategies: [],
    historyList: [],
    stats: {},
    isConfigured: false,
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

    applyAdminVisibility() {
      const isAdm = this.isAdmin();
      const adminElements = document.querySelectorAll('.journal-admin-only');
      adminElements.forEach(el => {
        if (isAdm) {
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });

      // 관리자 권한 상태 변경 시 맞춤 전략 감시 취소 버튼 가시성 즉시 재반영
      if (this.customStrategies && this.customStrategies.length > 0) {
        this.renderCustomStrategies(this.customStrategies);
      }
    },

    init() {
      if (this.initialized) {
        this.applyAdminVisibility();
        this.loadStatus();
        return;
      }
      this.initialized = true;

      this.bindEvents();
      this.bindCustomStrategyEvents();
      this.applyAdminVisibility();
      this.loadStatus();
      this.startPolling();
    },

    bindEvents() {
      // 새로고침 버튼
      const btnRefresh = document.getElementById('btn-stock-journal-refresh');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          this.loadStatus(true);
        });
      }
    },

    startPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        const section = document.getElementById('view-stock-journal');
        if (section && !section.classList.contains('hidden')) {
          this.loadStatus(false);
        }
      }, this.pollIntervalMs);
    },

    async loadStatus(showToast = false) {
      try {
        const res = await fetch('/api/trading/journal');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        this.isConfigured = Boolean(data.configured);
        this.isAutoTrading = Boolean(data.isAutoTradingEnabled);
        this.currentPosition = data.currentPosition || null;
        this.customStrategies = data.customStrategies || [];
        this.historyList = data.history || [];
        this.stats = data.stats || {};

        this.renderHeaderStatus(data);
        this.renderStats(this.stats);
        this.renderPositionCard(this.currentPosition);
        this.renderCustomStrategies(this.customStrategies);

        if (showToast && window.UiView && window.UiView.showToast) {
          window.UiView.showToast('📑 주식 매매일지 및 포지션이 새로고침되었습니다.');
        }
      } catch (err) {
        console.error('[StockJournalView] loadStatus error:', err);
      }
    },

    renderHeaderStatus(data) {
      // 1. API 연동 배지
      const badgeApi = document.getElementById('badge-trading-api-status');
      if (badgeApi) {
        if (this.isConfigured) {
          badgeApi.textContent = '🟢 토스증권 API 연동됨';
          badgeApi.style.background = 'rgba(34, 197, 94, 0.18)';
          badgeApi.style.color = '#4ade80';
          badgeApi.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        } else {
          badgeApi.textContent = '🟡 시뮬레이션 모드 (API 키 미설정)';
          badgeApi.style.background = 'rgba(234, 179, 8, 0.18)';
          badgeApi.style.color = '#facc15';
          badgeApi.style.borderColor = 'rgba(234, 179, 8, 0.4)';
        }
      }

      // 2. 엔진 상태 배지
      const badgeEngine = document.getElementById('badge-trading-engine-status');
      if (badgeEngine) {
        if (this.isAutoTrading) {
          badgeEngine.textContent = '⚡ 자동매매 가동 중 (5분 예약 감시)';
          badgeEngine.style.background = 'rgba(16, 185, 129, 0.18)';
          badgeEngine.style.color = '#34d399';
          badgeEngine.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else {
          badgeEngine.textContent = '⏹️ 자동매매 정지됨';
          badgeEngine.style.background = 'rgba(148, 163, 184, 0.15)';
          badgeEngine.style.color = '#94a3b8';
          badgeEngine.style.borderColor = 'rgba(148, 163, 184, 0.3)';
        }
      }

      // 3. 최근 점검 시각
      const elLastSync = document.getElementById('trading-last-sync-time');
      if (elLastSync) {
        const timeStr = data.lastCheckAt ? new Date(data.lastCheckAt).toLocaleTimeString('ko-KR') : '아직 점검 전 (5분 주기 감시)';
        elLastSync.textContent = `최근 점검: ${timeStr}`;
      }
    },

    renderStats(stats) {
      const totalTrades = stats.totalTrades || 0;
      const winTrades = stats.winTrades || 0;
      const lossTrades = stats.lossTrades || 0;
      const winRate = stats.winRate || 0;
      const totalProfit = stats.totalProfitKrw || 0;

      const elTotal = document.getElementById('stat-trading-total-trades');
      const elWinRate = document.getElementById('stat-trading-win-rate');
      const elWinLoss = document.getElementById('stat-trading-win-loss');
      const elProfit = document.getElementById('stat-trading-total-profit');

      if (elTotal) elTotal.textContent = `${totalTrades}회`;
      if (elWinRate) elWinRate.textContent = `${winRate}%`;
      if (elWinLoss) elWinLoss.textContent = `${winTrades}승 / ${lossTrades}패`;

      if (elProfit) {
        const sign = totalProfit > 0 ? '+' : '';
        elProfit.textContent = `${sign}${totalProfit.toLocaleString()}원`;
        if (totalProfit > 0) {
          elProfit.style.color = '#f87171';
        } else if (totalProfit < 0) {
          elProfit.style.color = '#60a5fa';
        } else {
          elProfit.style.color = '#f8fafc';
        }
      }
    },

    renderPositionCard(pos) {
      const cardNone = document.getElementById('card-position-empty');
      const cardActive = document.getElementById('card-position-active');

      if (!pos) {
        if (cardNone) cardNone.style.display = 'flex';
        if (cardActive) cardActive.style.display = 'none';
        return;
      }

      if (cardNone) cardNone.style.display = 'none';
      if (cardActive) cardActive.style.display = 'block';

      // 종목 기본 정보
      const elStockName = document.getElementById('pos-stock-name');
      const elItemCode = document.getElementById('pos-item-code');
      const elMarketBadge = document.getElementById('pos-market-badge');
      const elStatusBadge = document.getElementById('pos-status-badge');
      const elCurrentPrice = document.getElementById('pos-current-price');
      const elAvgPrice = document.getElementById('pos-avg-price');
      const elQuantity = document.getElementById('pos-quantity');
      const elTotalInvested = document.getElementById('pos-total-invested');
      const elReturnPnl = document.getElementById('pos-return-pnl');
      const elDebateSummary = document.getElementById('pos-debate-summary');
      const elOrderNote = document.getElementById('pos-order-note');

      if (elStockName) elStockName.textContent = pos.stockName || '-';
      if (elItemCode) elItemCode.textContent = pos.itemCode || '-';
      if (elMarketBadge) elMarketBadge.textContent = pos.market || 'KR';

      const curPrice = pos.currentPrice || pos.averagePrice || pos.entryPrice || 0;
      const avgPrice = pos.averagePrice || pos.entryPrice || 0;
      const qty = pos.quantity || pos.totalQuantity || 1;
      const isUs = pos.market === 'US' || pos.currency === 'USD';
      const fxRate = pos.fxRate || 1350;
      const invested = pos.totalInvestedKrw || (isUs ? Math.round(avgPrice * qty * fxRate) : (avgPrice * qty));
      const pnl = pos.unrealizedPnl || 0;
      const returnPct = typeof pos.returnPct === 'number' ? pos.returnPct : 0;

      const formatCurrency = (val) => {
        const num = typeof val === 'number' ? val : (parseFloat(val) || 0);
        if (isUs) {
          const krwVal = Math.round(num * fxRate);
          return `$${num.toFixed(2)} (약 ${krwVal.toLocaleString()}원)`;
        }
        return `${num.toLocaleString()}원`;
      };

      // 상태 뱃지 업데이트
      if (elStatusBadge) {
        if (pos.status === 'RESERVED') {
          elStatusBadge.textContent = '⏳ 예약매수 접수중';
          elStatusBadge.style.background = 'rgba(234, 179, 8, 0.2)';
          elStatusBadge.style.color = '#facc15';
          elStatusBadge.style.borderColor = 'rgba(234, 179, 8, 0.4)';
        } else if (pos.status === 'FILLED') {
          elStatusBadge.textContent = '✅ 매수체결 완료 (1주 보유)';
          elStatusBadge.style.background = 'rgba(34, 197, 94, 0.2)';
          elStatusBadge.style.color = '#4ade80';
          elStatusBadge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        } else {
          elStatusBadge.textContent = pos.status || '대기중';
          elStatusBadge.style.background = 'rgba(148, 163, 184, 0.2)';
          elStatusBadge.style.color = '#94a3b8';
          elStatusBadge.style.borderColor = 'rgba(148, 163, 184, 0.4)';
        }
      }

      if (elCurrentPrice) elCurrentPrice.textContent = formatCurrency(curPrice);
      if (elAvgPrice) elAvgPrice.textContent = formatCurrency(avgPrice);
      if (elQuantity) elQuantity.textContent = `${qty}주 (단일)`;
      if (elTotalInvested) elTotalInvested.textContent = isUs ? `${invested.toLocaleString()}원 (약 $${(invested / fxRate).toFixed(2)})` : `${invested.toLocaleString()}원`;

      if (elReturnPnl) {
        if (pos.status === 'RESERVED') {
          elReturnPnl.textContent = '체결 대기중';
          elReturnPnl.style.color = '#facc15';
        } else {
          const sign = returnPct > 0 ? '+' : '';
          const pnlText = isUs
            ? `${sign}$${pnl.toFixed(2)} (약 ${sign}${Math.round(pnl * fxRate).toLocaleString()}원, ${sign}${returnPct}%)`
            : `${sign}${pnl.toLocaleString()}원 (${sign}${returnPct}%)`;
          elReturnPnl.textContent = pnlText;
          elReturnPnl.style.color = returnPct >= 0 ? '#f87171' : '#60a5fa';
        }
      }

      if (elDebateSummary) {
        elDebateSummary.textContent = pos.debateSummary || '끝장토론 종목 의결 매수 진행 중';
      }

      if (elOrderNote) {
        let orderInfo = '';
        if (pos.orderId) {
          const rawId = String(pos.orderId).trim();
          const displayId = rawId.length > 20 ? `${rawId.slice(0, 8)}...${rawId.slice(-6)}` : rawId;
          orderInfo = `주문번호: <code style="font-family: monospace; background: rgba(0,0,0,0.35); padding: 2px 6px; border-radius: 4px; font-size: 0.76rem; word-break: break-all;" title="${rawId}">${displayId}</code>`;
        }
        const noteText = pos.note || '';
        elOrderNote.innerHTML = [noteText, orderInfo].filter(Boolean).join(' <span style="opacity:0.4;">|</span> ');
      }

      // 4단계 라이프사이클 스텝 로드맵 UI
      this.renderStageSteps(pos);

      // 목표가 및 손절가 달성 게이지
      this.renderTargetStopGauge(pos, curPrice, avgPrice);
    },

    renderStageSteps(pos) {
      const isReserved = pos.status === 'RESERVED';
      const isFilled = pos.status === 'FILLED';

      const updateStep = (stepNum, isDone, isCurrent, doneText, currentText, waitText) => {
        const badge = document.getElementById(`pos-step-${stepNum}-badge`);
        const item = document.getElementById(`pos-step-${stepNum}-item`);
        if (!badge || !item) return;

        if (isDone) {
          badge.textContent = `✓ ${doneText}`;
          badge.style.background = 'rgba(34, 197, 94, 0.2)';
          badge.style.color = '#4ade80';
          badge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
          item.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        } else if (isCurrent) {
          badge.textContent = currentText;
          badge.style.background = 'rgba(56, 189, 248, 0.25)';
          badge.style.color = '#38bdf8';
          badge.style.borderColor = 'rgba(56, 189, 248, 0.6)';
          item.style.borderColor = '#38bdf8';
        } else {
          badge.textContent = waitText;
          badge.style.background = 'rgba(148, 163, 184, 0.1)';
          badge.style.color = '#94a3b8';
          badge.style.borderColor = 'rgba(148, 163, 184, 0.2)';
          item.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        }
      };

      // 1단계: 종목 발굴 (완료)
      updateStep(1, true, false, '완료', '', '');

      // 2단계: 예약/주문 접수
      if (isFilled) {
        updateStep(2, true, false, '완료', '', '');
      } else if (isReserved) {
        updateStep(2, false, true, '', '진행중', '');
      } else {
        updateStep(2, false, false, '', '', '대기');
      }

      // 3단계: 매수 체결 완료
      if (isFilled) {
        updateStep(3, true, false, '체결', '', '');
      } else {
        updateStep(3, false, false, '', '', '대기');
      }

      // 4단계: 익절/손절 청산
      if (isFilled) {
        updateStep(4, false, true, '', '감시중', '');
      } else {
        updateStep(4, false, false, '', '', '대기');
      }
    },

    renderTargetStopGauge(pos, curPrice, avgPrice) {
      const isUs = pos.market === 'US' || pos.currency === 'USD';
      const fxRate = pos.fxRate || 1350;
      const targetPrice = pos.targetPrice || (isUs ? parseFloat((avgPrice * 1.15).toFixed(2)) : Math.round(avgPrice * 1.15));
      const stopPrice = pos.stopLossPrice || (isUs ? parseFloat((avgPrice * 0.95).toFixed(2)) : Math.round(avgPrice * 0.95));

      const elTargetPrice = document.getElementById('pos-target-price');
      const elStopPrice = document.getElementById('pos-stop-price');
      const barGauge = document.getElementById('pos-gauge-bar');

      const targetText = isUs
        ? `$${targetPrice.toFixed(2)} (약 ${(pos.targetPriceKrw || Math.round(targetPrice * fxRate)).toLocaleString()}원, +15% 익절)`
        : `${targetPrice.toLocaleString()}원 (+15% 익절)`;
      const stopText = isUs
        ? `$${stopPrice.toFixed(2)} (약 ${(pos.stopLossPriceKrw || Math.round(stopPrice * fxRate)).toLocaleString()}원, -5% 손절)`
        : `${stopPrice.toLocaleString()}원 (-5% 손절)`;

      if (elTargetPrice) elTargetPrice.textContent = targetText;
      if (elStopPrice) elStopPrice.textContent = stopText;

      if (barGauge) {
        const range = targetPrice - stopPrice;
        let pct = 50;
        if (range > 0) {
          pct = ((curPrice - stopPrice) / range) * 100;
          pct = Math.max(5, Math.min(95, pct));
        }
        barGauge.style.width = `${pct}%`;
        if (curPrice >= avgPrice) {
          barGauge.style.background = 'linear-gradient(90deg, #3b82f6, #10b981, #f43f5e)';
        } else {
          barGauge.style.background = 'linear-gradient(90deg, #ef4444, #3b82f6)';
        }
      }
    },

    bindCustomStrategyEvents() {
      const modal = document.getElementById('modal-custom-strategy');
      const form = document.getElementById('form-custom-strategy');
      const selectTrigger = document.getElementById('cs-trigger-type');
      const descTrigger = document.getElementById('cs-trigger-desc');
      const inputBuyPrice = document.getElementById('cs-buy-price');

      // 모달 열기 버튼들
      ['btn-open-custom-strategy-modal', 'btn-open-custom-strategy-modal-inline', 'btn-open-custom-strategy-empty'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', () => this.openCustomStrategyModal());
        }
      });

      // 모달 닫기 버튼들
      ['btn-close-custom-strategy-modal', 'btn-cancel-custom-strategy-modal'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.addEventListener('click', () => this.closeCustomStrategyModal());
        }
      });

      // 모달 배경 클릭 시 닫기
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeCustomStrategyModal();
        });
      }

      // 전략 운용 모드 라디오 변경 (BUY vs HOLD)
      const modeRadios = document.querySelectorAll('input[name="cs-mode"]');
      const lblBuy = document.getElementById('lbl-cs-mode-buy');
      const lblHold = document.getElementById('lbl-cs-mode-hold');
      const wrapperTrigger = document.getElementById('cs-trigger-type-wrapper');
      const wrapperBuyPrice = document.getElementById('cs-buy-price-wrapper');
      const wrapperEntryPrice = document.getElementById('cs-entry-price-wrapper');
      const lblQty = document.getElementById('lbl-cs-quantity');
      const expQty = document.getElementById('cs-quantity-explanation');
      const inputEntryPrice = document.getElementById('cs-entry-price');

      modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          const mode = document.querySelector('input[name="cs-mode"]:checked')?.value || 'BUY';
          if (mode === 'HOLD') {
            if (lblHold) {
              lblHold.style.background = 'rgba(168, 85, 247, 0.15)';
              lblHold.style.borderColor = 'rgba(168, 85, 247, 0.6)';
            }
            if (lblBuy) {
              lblBuy.style.background = 'rgba(30, 41, 59, 0.5)';
              lblBuy.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }
            if (wrapperTrigger) wrapperTrigger.style.display = 'none';
            if (wrapperBuyPrice) wrapperBuyPrice.style.display = 'none';
            if (wrapperEntryPrice) wrapperEntryPrice.style.display = 'block';
            if (lblQty) lblQty.innerHTML = `현재 보유 수량 <span style="color: #f87171;">*</span> <span style="font-size: 0.72rem; color: #34d399; font-weight: normal;">(2주 이상 시 분할 익절)</span>`;
            if (expQty) expQty.textContent = `이미 계좌에 보유 중인 주식 수량입니다. 매수 없이 1차 목표가 도달 시 절반(50%)을 분할 익절하고, 잔여 수량은 2차 목표가까지 자동 보유합니다.`;
            if (inputBuyPrice) inputBuyPrice.required = false;
            if (inputEntryPrice) inputEntryPrice.required = true;
          } else {
            if (lblBuy) {
              lblBuy.style.background = 'rgba(56, 189, 248, 0.12)';
              lblBuy.style.borderColor = 'rgba(56, 189, 248, 0.5)';
            }
            if (lblHold) {
              lblHold.style.background = 'rgba(30, 41, 59, 0.5)';
              lblHold.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }
            if (wrapperTrigger) wrapperTrigger.style.display = 'block';
            if (wrapperBuyPrice) wrapperBuyPrice.style.display = 'block';
            if (wrapperEntryPrice) wrapperEntryPrice.style.display = 'none';
            if (lblQty) lblQty.innerHTML = `매수 주문 수량 <span style="color: #f87171;">*</span> <span style="font-size: 0.72rem; color: #34d399; font-weight: normal;">(2주 이상 시 분할 익절)</span>`;
            if (expQty) expQty.textContent = `조건 도달 시 토스증권에서 실제 매수할 주식 수입니다. 2주 이상 등록 시 1차 목표가 도달 시 절반(50%)을 분할 익절하고, 잔여 수량은 2차 목표가까지 자동 보유합니다.`;
            if (inputBuyPrice) inputBuyPrice.required = true;
            if (inputEntryPrice) inputEntryPrice.required = false;
          }
        });
      });

      // 진입 방식 셀렉트 변경 시 안내 문구 및 필수 처리
      if (selectTrigger) {
        selectTrigger.addEventListener('change', () => {
          const val = selectTrigger.value;
          if (val === 'IMMEDIATE') {
            if (descTrigger) descTrigger.textContent = '(즉시 시장가 매수 집행 - 기준가 생략 가능)';
            if (inputBuyPrice) inputBuyPrice.required = false;
          } else if (val === 'BREAKOUT') {
            if (descTrigger) descTrigger.textContent = '(현재가가 이 가격 이상 돌파 안착 시 자동 매수)';
            if (inputBuyPrice) inputBuyPrice.required = true;
          } else {
            if (descTrigger) descTrigger.textContent = '(현재가가 이 가격 이하로 눌릴 시 자동 매수)';
            if (inputBuyPrice) inputBuyPrice.required = true;
          }
        });
      }

      // 물타기(추가 매수) 체크박스 토글
      const chkAveraging = document.getElementById('cs-enable-averaging');
      const wrapperAveraging = document.getElementById('cs-averaging-wrapper');
      const inputAveragingPrice = document.getElementById('cs-averaging-price');
      if (chkAveraging) {
        chkAveraging.addEventListener('change', () => {
          if (wrapperAveraging) {
            wrapperAveraging.style.display = chkAveraging.checked ? 'block' : 'none';
          }
          if (inputAveragingPrice) {
            inputAveragingPrice.required = chkAveraging.checked;
          }
        });
      }

      // 폼 제출
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.submitCustomStrategy();
        });
      }
    },

    openCustomStrategyModal() {
      if (!this.isAdmin()) {
        alert('⚠️ 맞춤 전략 등록은 최고 관리자만 이용할 수 있습니다.\n우측 상단 [관리자 전환] 후 다시 시도해주세요.');
        return;
      }
      const editInput = document.getElementById('cs-edit-strategy-id');
      if (editInput) editInput.value = '';

      const icon = document.getElementById('modal-custom-strategy-icon');
      const title = document.getElementById('modal-custom-strategy-title');
      const subtitle = document.getElementById('modal-custom-strategy-subtitle');
      const btnSubmit = document.getElementById('btn-submit-custom-strategy');
      const itemCodeInput = document.getElementById('cs-item-code');

      if (icon) icon.textContent = '🎯';
      if (title) title.textContent = '관리자 맞춤 주식 전략 등록';
      if (subtitle) subtitle.textContent = '* 10만원 금액 제한 해제 / 분할 익절 / 실시간 시세 자동 감시';
      if (btnSubmit) btnSubmit.textContent = '🚀 전략 등록 및 실시간 감시 시작';
      if (itemCodeInput) itemCodeInput.readOnly = false;

      const form = document.getElementById('form-custom-strategy');
      if (form) form.reset();

      const radioBuy = document.getElementById('cs-mode-buy');
      if (radioBuy) {
        radioBuy.checked = true;
        radioBuy.dispatchEvent(new Event('change'));
      }

      const chkAveraging = document.getElementById('cs-enable-averaging');
      if (chkAveraging) {
        chkAveraging.checked = false;
        chkAveraging.dispatchEvent(new Event('change'));
      }

      const modal = document.getElementById('modal-custom-strategy');
      if (modal) {
        modal.style.display = 'flex';
      }
    },

    openEditCustomStrategyModal(id) {
      if (!this.isAdmin()) {
        alert('⚠️ 맞춤 전략 수정은 최고 관리자만 이용할 수 있습니다.\n우측 상단 [관리자 전환] 후 다시 시도해주세요.');
        return;
      }
      const strat = (this.customStrategies || []).find(s => s.id === id);
      if (!strat) {
        alert('해당 전략 정보를 찾을 수 없습니다.');
        return;
      }

      const editInput = document.getElementById('cs-edit-strategy-id');
      if (editInput) editInput.value = strat.id;

      const icon = document.getElementById('modal-custom-strategy-icon');
      const title = document.getElementById('modal-custom-strategy-title');
      const subtitle = document.getElementById('modal-custom-strategy-subtitle');
      const btnSubmit = document.getElementById('btn-submit-custom-strategy');
      const itemCodeInput = document.getElementById('cs-item-code');

      if (icon) icon.textContent = '✏️';
      if (title) title.textContent = `관리자 맞춤 전략 수정 (${strat.stockName})`;
      if (subtitle) subtitle.textContent = `* 목표가, 손절가, 물타기 조건, 보유 수량 등 실시간 감시 파라미터 수정`;
      if (btnSubmit) btnSubmit.textContent = '💾 전략 수정 사항 저장';
      if (itemCodeInput) itemCodeInput.readOnly = true;

      // 필드 채우기
      if (itemCodeInput) itemCodeInput.value = strat.itemCode || '';
      const stockNameInput = document.getElementById('cs-stock-name');
      if (stockNameInput) stockNameInput.value = strat.stockName || '';

      const isHolding = Boolean(strat.isExistingHolding || strat.mode === 'HOLD' || strat.triggerType === 'HOLDING');
      const radioMode = document.getElementById(isHolding ? 'cs-mode-hold' : 'cs-mode-buy');
      if (radioMode) {
        radioMode.checked = true;
        radioMode.dispatchEvent(new Event('change'));
      }

      const triggerSelect = document.getElementById('cs-trigger-type');
      if (triggerSelect && strat.triggerType && strat.triggerType !== 'HOLDING') {
        triggerSelect.value = strat.triggerType;
        triggerSelect.dispatchEvent(new Event('change'));
      }

      const qtyInput = document.getElementById('cs-quantity');
      if (qtyInput) qtyInput.value = strat.remainingQty || strat.quantity || 1;

      const buyPriceInput = document.getElementById('cs-buy-price');
      if (buyPriceInput) buyPriceInput.value = strat.buyTriggerPrice || '';

      const entryPriceInput = document.getElementById('cs-entry-price');
      if (entryPriceInput) entryPriceInput.value = strat.entryPrice || strat.buyTriggerPrice || '';

      const t1Input = document.getElementById('cs-target-1');
      if (t1Input) t1Input.value = strat.targetPrice1 || '';

      const t2Input = document.getElementById('cs-target-2');
      if (t2Input) t2Input.value = strat.targetPrice2 || '';

      const slInput = document.getElementById('cs-stop-loss');
      if (slInput) slInput.value = strat.stopLossPrice || '';

      const notesInput = document.getElementById('cs-notes');
      if (notesInput) notesInput.value = strat.notes || '';

      // 물타기
      const chkAveraging = document.getElementById('cs-enable-averaging');
      if (chkAveraging) {
        chkAveraging.checked = Boolean(strat.enableAveraging);
        chkAveraging.dispatchEvent(new Event('change'));
      }
      const avgPriceInput = document.getElementById('cs-averaging-price');
      if (avgPriceInput) avgPriceInput.value = strat.averagingPrice || '';
      const avgQtyInput = document.getElementById('cs-averaging-qty');
      if (avgQtyInput) avgQtyInput.value = strat.averagingQty || 1;

      const modal = document.getElementById('modal-custom-strategy');
      if (modal) {
        modal.style.display = 'flex';
      }
    },

    closeCustomStrategyModal() {
      const modal = document.getElementById('modal-custom-strategy');
      if (modal) {
        modal.style.display = 'none';
      }
      const editInput = document.getElementById('cs-edit-strategy-id');
      if (editInput) editInput.value = '';
      const itemCodeInput = document.getElementById('cs-item-code');
      if (itemCodeInput) itemCodeInput.readOnly = false;
    },

    async submitCustomStrategy() {
      if (!this.isAdmin()) {
        alert('⚠️ 최고 관리자만 맞춤 전략을 등록/수정할 수 있습니다.\n우측 상단 [관리자 전환] 후 다시 시도해주세요.');
        return;
      }
      const editId = (document.getElementById('cs-edit-strategy-id')?.value || '').trim();
      const isEdit = Boolean(editId);

      const mode = document.querySelector('input[name="cs-mode"]:checked')?.value || 'BUY';
      const itemCode = (document.getElementById('cs-item-code')?.value || '').trim();
      const stockName = (document.getElementById('cs-stock-name')?.value || '').trim() || itemCode;
      const triggerType = document.getElementById('cs-trigger-type')?.value || 'PULLBACK';
      const quantity = parseInt(document.getElementById('cs-quantity')?.value, 10) || 1;
      const buyTriggerPrice = parseFloat(document.getElementById('cs-buy-price')?.value) || 0;
      const entryPrice = parseFloat(document.getElementById('cs-entry-price')?.value) || 0;
      const targetPrice1 = parseFloat(document.getElementById('cs-target-1')?.value) || 0;
      const targetPrice2 = parseFloat(document.getElementById('cs-target-2')?.value) || null;
      const stopLossPrice = parseFloat(document.getElementById('cs-stop-loss')?.value) || 0;
      const notes = (document.getElementById('cs-notes')?.value || '').trim();

      if (!itemCode) {
        alert('종목코드 / 티커를 입력해주세요.');
        return;
      }
      if (mode === 'HOLD') {
        if (entryPrice <= 0) {
          alert('보유 중인 주식의 매수 평단가를 입력해주세요.');
          return;
        }
      } else {
        if (triggerType !== 'IMMEDIATE' && buyTriggerPrice <= 0) {
          alert('매수 감시 기준 가격을 입력해주세요.');
          return;
        }
      }
      if (targetPrice1 <= 0) {
        alert('1차 목표 청산가를 입력해주세요.');
        return;
      }
      if (stopLossPrice <= 0) {
        alert('최종 손절 기준가를 입력해주세요.');
        return;
      }

      const enableAveraging = Boolean(document.getElementById('cs-enable-averaging')?.checked);
      const averagingPrice = parseFloat(document.getElementById('cs-averaging-price')?.value) || 0;
      const averagingQty = parseInt(document.getElementById('cs-averaging-qty')?.value, 10) || 1;

      if (enableAveraging) {
        if (averagingPrice <= 0) {
          alert('물타기(추가 매수) 매수 기준가를 올바르게 입력해주세요.');
          return;
        }
        if (averagingQty < 1) {
          alert('물타기 추가 매수 수량을 1주 이상 입력해주세요.');
          return;
        }
      }

      const payload = {
        mode,
        isExistingHolding: mode === 'HOLD',
        itemCode,
        stockName,
        triggerType: mode === 'HOLD' ? 'HOLDING' : triggerType,
        quantity,
        entryPrice: mode === 'HOLD' ? entryPrice : 0,
        buyTriggerPrice: mode === 'HOLD' ? entryPrice : buyTriggerPrice,
        targetPrice1,
        targetPrice2,
        stopLossPrice,
        enableAveraging,
        averagingPrice: enableAveraging ? averagingPrice : 0,
        averagingQty: enableAveraging ? averagingQty : 0,
        notes
      };

      const btnSubmit = document.getElementById('btn-submit-custom-strategy');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = isEdit ? '⏳ 수정 저장 중...' : '⏳ 등록 중...';
      }

      try {
        const url = isEdit ? `/api/trading/custom-strategy/${editId}` : '/api/trading/custom-strategy';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || (isEdit ? '맞춤 전략 수정에 실패했습니다.' : '맞춤 전략 등록에 실패했습니다.'));
        }

        this.closeCustomStrategyModal();
        const form = document.getElementById('form-custom-strategy');
        if (form) form.reset();
        const wrapperAveraging = document.getElementById('cs-averaging-wrapper');
        if (wrapperAveraging) wrapperAveraging.style.display = 'none';

        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast(isEdit
            ? `✏️ [${stockName}] 맞춤 전략이 성공적으로 수정되었습니다!`
            : `🎯 [${stockName}] 관리자 맞춤 전략이 등록되어 감시를 시작합니다!`
          );
        }

        await this.loadStatus(false);
      } catch (err) {
        alert((isEdit ? '전략 수정 오류: ' : '전략 등록 오류: ') + err.message);
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = isEdit ? '💾 전략 수정 사항 저장' : '🚀 전략 등록 및 실시간 감시 시작';
        }
      }
    },

    async cancelCustomStrategy(id, stockName) {
      if (!this.isAdmin()) {
        alert('⚠️ 최고 관리자만 전략 감시를 취소할 수 있습니다.\n우측 상단 [관리자 전환] 후 다시 시도해주세요.');
        return;
      }
      if (!confirm(`'${stockName}' 맞춤 전략 감시를 취소하시겠습니까?`)) return;

      try {
        const res = await fetch(`/api/trading/custom-strategy/${id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || '취소 실패');
        }

        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast(`🚫 [${stockName}] 전략 감시가 취소되어 목록에서 삭제되었습니다.`);
        }

        // 즉시 로컬 목록에서 제거하여 0ms 반응성 보장
        this.customStrategies = (this.customStrategies || []).filter(s => s.id !== id);
        this.renderCustomStrategies(this.customStrategies);

        await this.loadStatus(false);
      } catch (err) {
        alert('전략 취소 오류: ' + err.message);
      }
    },

    renderCustomStrategies(strategies) {
      this.customStrategies = strategies || [];
      const elBadge = document.getElementById('custom-strategy-count-badge');
      const boxEmpty = document.getElementById('custom-strategy-empty');
      const boxList = document.getElementById('custom-strategy-list');
      if (!boxList || !boxEmpty) return;

      // 활성 감시 및 운용 중인 전략만 필터링 (취소 및 청산 종목은 목록에서 제외)
      const activeList = (strategies || []).filter(s => s.status !== 'CLOSED' && s.status !== 'CANCELLED');

      if (elBadge) {
        elBadge.textContent = `${activeList.length}건 운용중`;
      }

      if (!activeList || activeList.length === 0) {
        boxEmpty.style.display = 'flex';
        boxList.style.display = 'none';
        boxList.innerHTML = '';
        return;
      }

      boxEmpty.style.display = 'none';
      boxList.style.display = 'flex';

      let html = '';
      activeList.forEach(strat => {
        const isKr = strat.market === 'KR' || /^[0-9]{6}$/.test(strat.itemCode);
        const formatPrice = (p) => {
          if (!p) return '-';
          return isKr ? `${Number(p).toLocaleString()}원` : `$${Number(p).toFixed(2)}`;
        };

        let statusBadge = '';
        if (strat.status === 'WATCHING') {
          statusBadge = `<span style="background: rgba(234, 179, 8, 0.2); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.4); padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">⏳ 조건 감시중 (WATCHING)</span>`;
        } else if (strat.status === 'BUY_ORDERED') {
          statusBadge = `<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">🚀 매수발주 접수 (주문중)</span>`;
        } else if (strat.status === 'FILLED') {
          statusBadge = `<span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">✅ 체결완료 (${strat.remainingQty || strat.quantity}주 보유)</span>`;
        } else if (strat.status === 'PARTIAL_EXIT') {
          statusBadge = `<span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.4); padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">🎯 1차 익절완료 (잔여 ${strat.remainingQty}주 감시)</span>`;
        }

        let triggerTypeDesc = '눌림목 매수 (이하 도달 시)';
        if (strat.triggerType === 'BREAKOUT') triggerTypeDesc = '돌파 매수 (이상 돌파 시)';
        if (strat.triggerType === 'IMMEDIATE') triggerTypeDesc = '즉시 시장가 매수';
        if (strat.triggerType === 'HOLDING' || strat.isExistingHolding) triggerTypeDesc = '📦 기존 보유 종목';

        const returnPct = strat.returnPct || 0;
        const pnlSign = returnPct > 0 ? '+' : '';
        const pnlColor = returnPct >= 0 ? '#f87171' : '#60a5fa';
        const pnlFormatted = isKr ? `${Math.round(strat.unrealizedPnl || 0).toLocaleString()}원` : `$${Number(strat.unrealizedPnl || 0).toFixed(2)}`;
        const pnlText = strat.entryPrice
          ? `${pnlSign}${pnlFormatted} (${pnlSign}${returnPct}%)`
          : '매수 대기중';

        // 현재 보유수량 HTML 생성
        let holdingQtyHtml = '';
        if (strat.status === 'FILLED') {
          holdingQtyHtml = `<span style="color: #4ade80; font-weight: 800; font-size: 1.05rem;">${strat.remainingQty || strat.quantity}주</span> <span style="font-size: 0.75rem; color: #4ade80; font-weight: 600;">(보유중)</span>`;
        } else if (strat.status === 'PARTIAL_EXIT') {
          holdingQtyHtml = `<span style="color: #c084fc; font-weight: 800; font-size: 1.05rem;">잔여 ${strat.remainingQty}주</span> <span style="font-size: 0.72rem; color: #94a3b8;">/ 총 ${strat.quantity}주</span>`;
        } else {
          holdingQtyHtml = `<span style="color: #94a3b8; font-weight: 700; font-size: 1.05rem;">0주</span> <span style="font-size: 0.75rem; color: #38bdf8;">(주문예정: ${strat.quantity}주)</span>`;
        }

        // 체결단가 & 투자원금 HTML
        let avgPriceHtml = '';
        if (strat.entryPrice) {
          const currentQty = strat.remainingQty !== undefined ? strat.remainingQty : strat.quantity;
          const totalVal = isKr ? Math.round(strat.entryPrice * currentQty) : Number((strat.entryPrice * currentQty).toFixed(2));
          avgPriceHtml = `<span style="color: #f8fafc; font-weight: 700;">${formatPrice(strat.entryPrice)}</span> <span style="font-size: 0.75rem; color: #94a3b8;">(총 ${formatPrice(totalVal)})</span>`;
        } else {
          avgPriceHtml = `<span style="color: #64748b; font-size: 0.88rem;">- (체결 대기)</span>`;
        }

        const canCancel = strat.status === 'WATCHING' || strat.status === 'BUY_ORDERED' || strat.isExistingHolding;

        let averagingBadgeHtml = '';
        if (strat.enableAveraging) {
          if (strat.averagingStatus === 'COMPLETED') {
            averagingBadgeHtml = `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">💧 물타기 체결완료 (+${strat.averagingQty || 1}주)</span>`;
          } else {
            averagingBadgeHtml = `<span style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.35); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">💧 물타기 대기 (${formatPrice(strat.averagingPrice)} 이하 시 +${strat.averagingQty || 1}주)</span>`;
          }
        }

        html += `
          <div class="trading-pos-card" style="border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(30, 41, 59, 0.55); border-radius: 12px; padding: 20px; transition: border-color 0.2s;">
            <!-- 상단 헤더: 종목명, 코드, 상태, 시장, 현재가/수익률 -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                  <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">${strat.market || (isKr ? 'KR' : 'US')}</span>
                  <h4 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #ffffff;">${strat.stockName}</h4>
                  <span style="color: #94a3b8; font-size: 0.85rem;">(${strat.itemCode})</span>
                  ${statusBadge}
                  <span style="background: rgba(255, 255, 255, 0.08); color: #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${triggerTypeDesc}</span>
                  ${averagingBadgeHtml}
                </div>
                <div style="font-size: 0.82rem; color: #94a3b8; line-height: 1.4;">
                  ${strat.notes ? `💡 <b>전략 비고:</b> ${strat.notes}` : ''}
                </div>
              </div>

              <div style="text-align: right;">
                <div style="font-size: 1.3rem; font-weight: 800; color: #ffffff;">
                  ${strat.currentPrice ? formatPrice(strat.currentPrice) : formatPrice(strat.buyTriggerPrice)}
                </div>
                <div style="font-size: 0.95rem; font-weight: 700; color: ${pnlColor};">
                  ${pnlText}
                </div>
              </div>
            </div>

            <!-- 세부 수치 그리드 (보유수량 독립 항목 추가) -->
            <div class="trading-metrics-grid" style="margin-bottom: 14px;">
              <div class="trading-metric-box">
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 4px;">매수 조건 / 기준가</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #f8fafc;">${formatPrice(strat.buyTriggerPrice)}</div>
              </div>
              <div class="trading-metric-box" style="border: 1px solid rgba(56, 189, 248, 0.25); background: rgba(15, 23, 42, 0.75);">
                <div style="font-size: 0.78rem; color: #38bdf8; font-weight: 700; margin-bottom: 4px;">📊 현재 보유수량</div>
                <div style="font-size: 0.95rem; font-weight: 700;">${holdingQtyHtml}</div>
              </div>
              <div class="trading-metric-box">
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 4px;">체결단가 (투자원금)</div>
                <div style="font-size: 0.95rem; font-weight: 700;">${avgPriceHtml}</div>
              </div>
              <div class="trading-metric-box">
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 4px;">1차 목표가 (50% 익절)</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #34d399;">${formatPrice(strat.targetPrice1)}</div>
              </div>
              <div class="trading-metric-box">
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 4px;">2차 목표가 (잔여 익절)</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #38bdf8;">${strat.targetPrice2 ? formatPrice(strat.targetPrice2) : '미지정'}</div>
              </div>
              <div class="trading-metric-box">
                <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 4px;">최종 손절가 (전량)</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #f87171;">${formatPrice(strat.stopLossPrice)}</div>
              </div>
            </div>

            <!-- 하단 상태 메시지 및 컨트롤 -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 10px;">
              <div style="font-size: 0.8rem; color: #64748b;">
                ${strat.note ? `<span>ℹ️ ${strat.note}</span>` : ''}
                ${strat.orderId ? `<span style="margin-left: 8px;">주문번호: <code>${strat.orderId}</code></span>` : ''}
              </div>
              <div>
                ${this.isAdmin() ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="window.StockJournalView.openEditCustomStrategyModal('${strat.id}')" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; cursor: pointer; margin-right: 6px; font-weight: 600;">
                    ✏️ 전략 수정
                  </button>
                ` : ''}
                ${canCancel && this.isAdmin() ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="window.StockJournalView.cancelCustomStrategy('${strat.id}', '${strat.stockName}')" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; cursor: pointer;">
                    🚫 감시 취소
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      });

      boxList.innerHTML = html;
    }
  };

  window.StockJournalView = StockJournalView;
})(window);