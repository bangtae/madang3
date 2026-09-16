// app/views/stockTradingAdminView.js - 관리자 전용 주식 자동매매 제어 뷰
(function(window) {
  'use strict';

  const StockTradingAdminView = {
    initialized: false,
    pollTimer: null,
    pollIntervalMs: 10000,
    isAutoTrading: false,
    currentPosition: null,

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
      // 1. 새로고침 버튼
      const btnRefresh = document.getElementById('btn-admin-trading-refresh');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          this.loadStatus(true);
        });
      }

      // 2. 자동매매 ON/OFF 토글
      const btnToggle = document.getElementById('btn-admin-toggle-trading');
      if (btnToggle) {
        btnToggle.addEventListener('click', () => {
          this.toggleAutoTrading();
        });
      }

      // 3. 즉시 사이클 검증
      const btnCycle = document.getElementById('btn-admin-manual-cycle');
      if (btnCycle) {
        btnCycle.addEventListener('click', () => {
          this.handleManualCycle();
        });
      }

      // 4. 비상 전량 매도
      const btnEmergency = document.getElementById('btn-admin-emergency-sell');
      if (btnEmergency) {
        btnEmergency.addEventListener('click', () => {
          this.handleEmergencySell();
        });
      }

      // 5. API 설정 폼 제출
      const formApi = document.getElementById('form-admin-toss-api');
      if (formApi) {
        formApi.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveApiConfig();
        });
      }
    },

    startPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        const section = document.getElementById('view-stock-trading-admin');
        if (section && !section.classList.contains('hidden')) {
          this.loadStatus(false);
        }
      }, this.pollIntervalMs);
    },

    async loadStatus(showToast = false) {
      try {
        const res = await fetch('/api/trading/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        this.isAutoTrading = Boolean(data.isAutoTradingEnabled);
        this.currentPosition = data.currentPosition || null;

        this.renderStatus(data);

        // 서버 고정 IP 조회 및 갱신
        try {
          const ipRes = await fetch('/api/trading/server-ip');
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            const elIp = document.getElementById('admin-server-egress-ip');
            if (elIp && ipData.ip) elIp.textContent = ipData.ip;
          }
        } catch (e) {}

        if (showToast && window.UiView && window.UiView.showToast) {
          window.UiView.showToast('🤖 자동매매 엔진 및 API 상태가 갱신되었습니다.');
        }
      } catch (e) {
        console.error('[StockTradingAdminView] loadStatus error:', e);
      }
    },

    renderStatus(data) {
      // 1. 엔진 상태 배지 & 버튼
      const badgeStatus = document.getElementById('admin-trading-status-badge');
      const btnToggle = document.getElementById('btn-admin-toggle-trading');
      if (badgeStatus) {
        if (this.isAutoTrading) {
          badgeStatus.textContent = '⚡ 가동 중 (5분 예약 감시)';
          badgeStatus.style.background = 'rgba(16, 185, 129, 0.2)';
          badgeStatus.style.color = '#34d399';
          badgeStatus.style.border = '1px solid rgba(16, 185, 129, 0.4)';
        } else {
          badgeStatus.textContent = '⏹️ 정지됨 (OFF)';
          badgeStatus.style.background = 'rgba(148, 163, 184, 0.15)';
          badgeStatus.style.color = '#94a3b8';
          badgeStatus.style.border = '1px solid rgba(148, 163, 184, 0.3)';
        }
      }

      if (btnToggle) {
        if (this.isAutoTrading) {
          btnToggle.innerHTML = '<span>⏸️ 자동매매 일시정지</span>';
          btnToggle.className = 'btn btn-secondary';
          btnToggle.style.background = 'rgba(239, 68, 68, 0.2)';
          btnToggle.style.borderColor = 'rgba(239, 68, 68, 0.5)';
          btnToggle.style.color = '#f87171';
        } else {
          btnToggle.innerHTML = '<span>▶️ 자동매매 가동하기</span>';
          btnToggle.className = 'btn btn-primary';
          btnToggle.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          btnToggle.style.borderColor = '#10b981';
          btnToggle.style.color = '#ffffff';
        }
      }

      // 2. 비상 매도 버튼 활성화 여부
      const btnEmergency = document.getElementById('btn-admin-emergency-sell');
      if (btnEmergency) {
        btnEmergency.disabled = !this.currentPosition;
      }

      // 3. API 연동 배지
      const badgeApi = document.getElementById('admin-api-configured-badge');
      if (badgeApi) {
        if (data.configured) {
          badgeApi.textContent = '🟢 API 연동 완료 (API Key & Secret 활성)';
          badgeApi.style.background = 'rgba(34, 197, 94, 0.2)';
          badgeApi.style.color = '#4ade80';
          badgeApi.style.border = '1px solid rgba(34, 197, 94, 0.4)';
        } else {
          badgeApi.textContent = '🟡 미설정 / 시뮬레이션 모드';
          badgeApi.style.background = 'rgba(234, 179, 8, 0.2)';
          badgeApi.style.color = '#facc15';
          badgeApi.style.border = '1px solid rgba(234, 179, 8, 0.4)';
        }
      }

      // 4. 포지션 프리뷰
      const previewEl = document.getElementById('admin-trading-position-preview');
      if (previewEl) {
        if (this.currentPosition) {
          const p = this.currentPosition;
          const sign = (p.returnPct || 0) >= 0 ? '+' : '';
          const color = (p.returnPct || 0) >= 0 ? '#f87171' : '#60a5fa';
          const statusText = p.status === 'RESERVED' ? '⏳ 예약매수 접수중' : '✅ 매수체결 완료';
          const pnlText = p.status === 'RESERVED' ? '체결 대기중' : `${sign}${(p.unrealizedPnl || 0).toLocaleString()}원 (${sign}${p.returnPct || 0}%)`;
          previewEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: rgba(56, 189, 248, 0.2); color: #38bdf8; margin-right: 6px;">${statusText}</span>
                <strong>${p.stockName} (${p.itemCode})</strong> | 1주 단일 매매 | 단가: ${(p.averagePrice || p.entryPrice || 0).toLocaleString()}원
                <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 4px;">🎯 목표가: ${(p.targetPrice || 0).toLocaleString()}원 (+15% 익절) | ⛔ 손절가: ${(p.stopLossPrice || 0).toLocaleString()}원 (-5% 손절)</div>
                ${p.note ? `<div style="font-size: 0.76rem; color: #38bdf8; margin-top: 2px;">${p.note}</div>` : ''}
              </div>
              <div style="font-size: 1.1rem; font-weight: 800; color: ${color};">
                ${pnlText}
              </div>
            </div>
          `;
        } else {
          previewEl.innerHTML = '현재 대기/보유 중인 주식 포지션이 없습니다. (자동매매 엔진 가동 시 10만원 이하 1주 단일 매매 집행)';
        }
      }

      // 5. 설정 폼 값 동기화 (기존 값 보존)
      if (data.config) {
        const inputMode = document.getElementById('admin-toss-mode');
        if (inputMode && data.config.mode) inputMode.value = data.config.mode;
        const inputAccount = document.getElementById('admin-toss-account-no');
        if (inputAccount && !inputAccount.value && data.config.accountNo) {
          inputAccount.placeholder = `현재 등록됨 (${data.config.accountNo})`;
        }
      }
    },

    async toggleAutoTrading() {
      const btn = document.getElementById('btn-admin-toggle-trading');
      const nextState = !this.isAutoTrading;
      const confirmMsg = nextState ?
        '🤖 [주식 자동매매 엔진 가동]\n\n' +
        '• 1회 1종목 1주 (10만원 이하) 단일 매매 원칙\n' +
        '• 장마감/휴일: 예약매수 접수중 등록 ➔ 정규장 개장(09:00) 시 실주문 발주\n' +
        '• 정규장 중: 토스증권 1주 실시간 매수 접수 ➔ 체결 완료 시 매매일지 등록\n' +
        '• 감시 주기: 5분 주기 예약 모니터링 (부하 최소화)\n' +
        '• 청산 원칙: 목표가 익절(+15%) 및 손절(-5%) 엄수\n\n' +
        '가동하시겠습니까?' :
        '⏸️ 주식 자동매매 엔진을 일시정지하시겠습니까?\n(현재 보유 중인 포지션은 그대로 유지됩니다)';

      if (!confirm(confirmMsg)) return;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ 처리 중...</span>';
      }

      try {
        const res = await fetch('/api/trading/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: nextState })
        });
        if (!res.ok) throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
        const data = await res.json();
        if (data.success) {
          this.isAutoTrading = Boolean(data.isAutoTradingEnabled);
          this.renderStatus({
            isAutoTradingEnabled: this.isAutoTrading,
            configured: true,
            currentPosition: this.currentPosition
          });
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast(this.isAutoTrading ? '🚀 자동매매 엔진이 가동되었습니다!' : '⏸️ 자동매매 엔진이 일시정지되었습니다.');
          }
          // 0.5초 후 서버 최신 상태 동기화
          setTimeout(() => this.loadStatus(false), 500);
        } else {
          alert('자동매매 상태 변경 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('자동매매 토글 통신 실패: ' + e.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    async handleManualCycle() {
      const btn = document.getElementById('btn-admin-manual-cycle');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/trading/manual-cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          this.loadStatus(true);
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast('⚙️ 트레이딩 엔진 1회 사이클 검증이 완료되었습니다.');
          }
        } else {
          alert('수동 사이클 실행 실패: ' + data.error);
        }
      } catch (e) {
        alert('수동 사이클 통신 오류: ' + e.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    async handleEmergencySell() {
      if (!this.currentPosition) {
        alert('현재 보유 중인 포지션이 없습니다.');
        return;
      }

      const p = this.currentPosition;
      const confirmMsg = `🚨 [비상 전량 매도 경고]\n\n현재 보유 중인 [${p.stockName} (${p.itemCode})] ${p.totalQuantity}주를 즉시 시장가로 전량 매도 청산하시겠습니까?`;
      if (!confirm(confirmMsg)) return;

      try {
        const res = await fetch('/api/trading/emergency-sell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          alert(`✅ [비상 전량 매도 완료]\n${data.message || ''}`);
          this.loadStatus(true);
        } else {
          alert('비상 매도 실패: ' + (data.message || data.error));
        }
      } catch (e) {
        alert('비상 매도 통신 오류: ' + e.message);
      }
    },

    async saveApiConfig() {
      const clientId = (document.getElementById('admin-toss-client-id').value || '').trim();
      const clientSecret = (document.getElementById('admin-toss-client-secret').value || '').trim();
      const accountNo = (document.getElementById('admin-toss-account-no').value || '').trim();
      const mode = document.getElementById('admin-toss-mode').value || 'real';

      try {
        const res = await fetch('/api/trading/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, clientSecret, accountNo, mode })
        });
        const data = await res.json();
        if (data.success) {
          alert('🎉 토스증권 Open API 설정이 성공적으로 저장되었습니다.');
          this.loadStatus(true);
        } else {
          alert('설정 저장 실패: ' + (data.message || data.error));
        }
      } catch (e) {
        alert('설정 저장 통신 오류: ' + e.message);
      }
    }
  };

  window.StockTradingAdminView = StockTradingAdminView;
})(window);