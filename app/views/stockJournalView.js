// app/views/stockJournalView.js - 토스증권 Open API & AI 끝장토론 주식 매매일지 뷰 (조회 및 일지 모니터링 전용)
(function(window) {
  'use strict';

  const StockJournalView = {
    initialized: false,
    pollTimer: null,
    pollIntervalMs: 30000, // 30초 주기 자동 갱신
    isAutoTrading: false,
    currentPosition: null,
    historyList: [],
    stats: {},
    isConfigured: false,

    init() {
      if (this.initialized) {
        this.loadStatus();
        return;
      }
      this.initialized = true;

      this.bindEvents();
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
        this.historyList = data.history || [];
        this.stats = data.stats || {};

        this.renderHeaderStatus(data);
        this.renderStats(this.stats);
        this.renderPositionCard(this.currentPosition);
        this.renderHistoryTable(this.historyList);

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

    renderHistoryTable(history) {
      const tbody = document.getElementById('tbody-trading-journal-history');
      const emptyBox = document.getElementById('trading-journal-empty');
      if (!tbody) return;

      if (!history || history.length === 0) {
        tbody.innerHTML = '';
        if (emptyBox) emptyBox.style.display = 'block';
        return;
      }

      if (emptyBox) emptyBox.style.display = 'none';

      let html = '';
      history.forEach((item, idx) => {
        const isWin = (item.realizedPnl || 0) >= 0;
        const sign = isWin ? '+' : '';
        const pnlColor = isWin ? '#f87171' : '#60a5fa';
        const dateStr = item.closedAt ? new Date(item.closedAt).toLocaleDateString('ko-KR') + ' ' + new Date(item.closedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-';
        const isItemUs = item.market === 'US' || item.currency === 'USD';
        const itemBuy = isItemUs ? `$${(item.averagePrice || 0).toFixed(2)}` : `${(item.averagePrice || 0).toLocaleString()}원`;
        const itemExit = isItemUs ? `$${(item.exitPrice || 0).toFixed(2)}` : `${(item.exitPrice || 0).toLocaleString()}원`;
        const itemPnl = isItemUs
          ? `${sign}$${(item.realizedPnl || 0).toFixed(2)} (약 ${sign}${(item.realizedPnlKrw || 0).toLocaleString()}원, ${sign}${item.returnPct}%)`
          : `${sign}${(item.realizedPnl || 0).toLocaleString()}원 (${sign}${item.returnPct}%)`;

        let reasonBadge = `<span style="padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">🎯 익절</span>`;
        if (item.reasonCode === 'STOP_LOSS') {
          reasonBadge = `<span style="padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4);">⛔ 손절</span>`;
        } else if (item.reasonCode === 'EMERGENCY_SELL') {
          reasonBadge = `<span style="padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4);">🚨 비상매도</span>`;
        }

        html += `
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
            <td style="padding: 12px 14px; color: #94a3b8; font-size: 0.85rem;">#${history.length - idx}</td>
            <td style="padding: 12px 14px; font-weight: 700; color: #f8fafc;">
              ${item.stockName} <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">(${item.itemCode})</span>
            </td>
            <td style="padding: 12px 14px; color: #cbd5e1; font-size: 0.9rem;">${itemBuy}</td>
            <td style="padding: 12px 14px; color: #cbd5e1; font-size: 0.9rem;">${itemExit} (${item.totalQuantity || 1}주)</td>
            <td style="padding: 12px 14px; font-size: 0.9rem; font-weight: 700; color: ${pnlColor};">${itemPnl}</td>
            <td style="padding: 12px 14px; color: #cbd5e1; font-size: 0.85rem;">1주 단일 매매</td>
            <td style="padding: 12px 14px;">${reasonBadge}</td>
            <td style="padding: 12px 14px; color: #64748b; font-size: 0.82rem;">${dateStr}</td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    }
  };

  window.StockJournalView = StockJournalView;
})(window);