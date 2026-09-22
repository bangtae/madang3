// app/views/stockTradingAdminView.js - 관리자 전용 주식 자동매매 제어 뷰
(function(window) {
  'use strict';

  const StockTradingAdminView = {
    initialized: false,
    pollTimer: null,
    pollIntervalMs: 10000,
    isAutoTrading: false,
    currentPosition: null,
    scalpingStatus: null,

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

      // 6. 초단타 스캘핑 실행 버튼
      const btnScalpStart = document.getElementById('btn-admin-scalping-start');
      if (btnScalpStart) {
        btnScalpStart.addEventListener('click', () => {
          this.startScalping();
        });
      }

      // 7. 초단타 스캘핑 중지 버튼
      const btnScalpStop = document.getElementById('btn-admin-scalping-stop');
      if (btnScalpStop) {
        btnScalpStop.addEventListener('click', () => {
          this.stopScalping();
        });
      }

      // 8. 운영 시간표 보기 토글
      const btnSchedule = document.getElementById('btn-toggle-market-schedule');
      if (btnSchedule) {
        btnSchedule.addEventListener('click', () => {
          const box = document.getElementById('market-schedule-detail-box');
          if (box) {
            const isHidden = box.style.display === 'none';
            box.style.display = isHidden ? 'block' : 'none';
            btnSchedule.textContent = isHidden ? '운영 시간표 닫기 ▲' : '운영 시간표 보기 ▼';
          }
        });
      }

      // 9. 09:00 개장 자동 실행 스케줄 체크박스
      const checkSchedule = document.getElementById('check-admin-scalping-auto-schedule');
      if (checkSchedule) {
        checkSchedule.addEventListener('change', (e) => {
          this.toggleAutoSchedule(e.target.checked);
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

        // 2. 국장 초단타 스캘핑 엔진 상태 조회 및 렌더링
        try {
          const scalpRes = await fetch('/api/trading/scalping/status');
          if (scalpRes.ok) {
            const scalpData = await scalpRes.json();
            this.scalpingStatus = scalpData.status || null;
            this.renderScalpingStatus(this.scalpingStatus);
          }
        } catch (err) {
          console.warn('[StockTradingAdminView] fetch scalping status error:', err);
        }

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
    },

    async startScalping() {
      const isUs = this.scalpingStatus?.scalpingSession?.isUsSession;
      const marketLabel = isUs ? '미장(나스닥/S&P)' : '국장(KRX)';
      const priceLimit = isUs ? '1주 $100 이하' : '1주 10만원 이하';
      const openSchedule = isUs ? '밤 22:30/23:30 정규장 개장 직후' : '아침 09:00 정규장 개장 직후';

      const confirmMsg =
        `⚡ [토스증권 ${marketLabel} 거래대금 1위 초단타(Scalping)]\n\n` +
        `• 타깃 조건: 실시간 거래대금 1위 종목 (${priceLimit} 1주 단일 매매)\n` +
        '• 익절 원칙: +2.5% 도달 시 즉시 시장가 전량 익절\n' +
        '• 손절 원칙: -1.5% 이탈 시 즉시 시장가 손절 청산\n' +
        `• 개장 대기: 미개장 시 ${openSchedule} 자동 대기\n` +
        '• 감시 주기: 5초 실시간 초고속 감시\n\n' +
        `${marketLabel} 초단타 자동매매를 실행하시겠습니까?`;

      if (!confirm(confirmMsg)) return;

      const btnStart = document.getElementById('btn-admin-scalping-start');
      if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerHTML = '<span>⏳ 진입 처리 중...</span>';
      }

      try {
        const res = await fetch('/api/trading/scalping/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manual: true })
        });
        const data = await res.json();
        if (data.success) {
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast(data.message || '⚡ 초단타 스캘핑이 시작되었습니다!');
          } else {
            alert('⚡ ' + (data.message || '초단타 스캘핑이 시작되었습니다.'));
          }
          this.scalpingStatus = data.status || null;
          this.renderScalpingStatus(this.scalpingStatus);
          setTimeout(() => this.loadStatus(false), 500);
        } else {
          alert('초단타 실행 실패: ' + (data.message || data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('초단타 실행 통신 오류: ' + e.message);
      } finally {
        if (btnStart) {
          const isUsNow = this.scalpingStatus?.scalpingSession?.isUsSession;
          btnStart.innerHTML = isUsNow
            ? '⚡ 미장(나스닥/S&P) 거래대금 1위 초단타 실행 (개장대기 / 즉시진입)'
            : '⚡ 국장 거래대금 1위 초단타 실행 (개장대기 / 즉시진입)';
        }
      }
    },

    async stopScalping() {
      if (!confirm('⏹️ 국장 초단타 스캘핑 감시를 중지하시겠습니까?\n(현재 보유 중인 포지션은 그대로 유지됩니다)')) return;

      const btnStop = document.getElementById('btn-admin-scalping-stop');
      if (btnStop) {
        btnStop.disabled = true;
        btnStop.innerHTML = '<span>⏳ 중지 처리 중...</span>';
      }

      try {
        const res = await fetch('/api/trading/scalping/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast('⏹️ 초단타 감시가 중지되었습니다.');
          } else {
            alert('⏹️ 초단타 감시가 중지되었습니다.');
          }
          this.scalpingStatus = data.status || null;
          this.renderScalpingStatus(this.scalpingStatus);
          setTimeout(() => this.loadStatus(false), 500);
        } else {
          alert('초단타 중지 실패: ' + (data.message || data.error || '알 수 없는 오류'));
        }
      } catch (e) {
        alert('초단타 중지 통신 오류: ' + e.message);
      } finally {
        if (btnStop) {
          btnStop.innerHTML = '⏹️ 초단타 중지';
        }
      }
    },

    async toggleAutoSchedule(enabled) {
      try {
        const res = await fetch('/api/trading/scalping/auto-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });
        const data = await res.json();
        if (data.success) {
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast(data.message || (enabled ? '⏰ 개장 자동 실행이 설정되었습니다.' : '⏸️ 개장 자동 실행이 해제되었습니다.'));
          }
        } else {
          alert('스케줄 설정 실패: ' + (data.message || data.error));
        }
      } catch (e) {
        alert('스케줄 설정 통신 오류: ' + e.message);
      }
    },

    renderMarketSession(session) {
      const elBadge = document.getElementById('admin-market-session-badge');
      const elTitle = document.getElementById('admin-market-session-title');
      const elDesc = document.getElementById('admin-market-session-desc');
      const elGolden = document.getElementById('admin-golden-time-badge');

      if (!session) return;

      if (elBadge) {
        elBadge.textContent = session.name || '세션 확인 완료';
        elBadge.style.color = session.badgeColor || '#38bdf8';
        elBadge.style.borderColor = session.badgeColor ? `${session.badgeColor}66` : 'rgba(56, 189, 248, 0.4)';
        elBadge.style.background = session.badgeColor ? `${session.badgeColor}22` : 'rgba(56, 189, 248, 0.15)';
      }

      if (elTitle) {
        elTitle.textContent = `${session.name} (${session.detailTime || ''})`;
      }

      if (elDesc) {
        elDesc.textContent = session.description || '';
      }

      if (elGolden) {
        if (session.isScalpingGoldenTime) {
          if (session.goldenTimePriority === 1) {
            elGolden.innerHTML = '🥇 1순위 골든타임 (최고 적기)';
            elGolden.style.background = 'rgba(16, 185, 129, 0.2)';
            elGolden.style.color = '#34d399';
            elGolden.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          } else if (session.goldenTimePriority === 2) {
            elGolden.innerHTML = '🥈 2순위 (NXT 얼리버드)';
            elGolden.style.background = 'rgba(56, 189, 248, 0.2)';
            elGolden.style.color = '#38bdf8';
            elGolden.style.borderColor = 'rgba(56, 189, 248, 0.4)';
          } else if (session.goldenTimePriority === 3) {
            elGolden.innerHTML = '🥉 3순위 (미국장 시황)';
            elGolden.style.background = 'rgba(168, 85, 247, 0.2)';
            elGolden.style.color = '#c084fc';
            elGolden.style.borderColor = 'rgba(168, 85, 247, 0.4)';
          }
        } else {
          elGolden.innerHTML = session.code === 'WEEKEND' || session.code === 'KR_HOLIDAY' ? '휴장 세션' : '일반 세션 (골든타임 대기)';
          elGolden.style.background = 'rgba(148, 163, 184, 0.15)';
          elGolden.style.color = '#94a3b8';
          elGolden.style.borderColor = 'rgba(148, 163, 184, 0.3)';
        }
      }
    },

    renderScalpingStatus(status) {
      const badge = document.getElementById('admin-scalping-status-badge');
      const preview = document.getElementById('admin-scalping-position-preview');
      const btnStart = document.getElementById('btn-admin-scalping-start');
      const btnStop = document.getElementById('btn-admin-scalping-stop');

      if (!status) return;

      // 1. 시장 세션 렌더링
      if (status.currentSession) {
        this.renderMarketSession(status.currentSession);
      }

      // 2. 09:00 개장 자동 실행 스케줄 체크박스 동기화
      const checkSchedule = document.getElementById('check-admin-scalping-auto-schedule');
      if (checkSchedule && typeof status.autoScheduleEnabled === 'boolean') {
        checkSchedule.checked = status.autoScheduleEnabled;
      }

      const isUsSession = Boolean(status.scalpingSession?.isUsSession);
      const waitingMarket = status.waitingMarket || (isUsSession ? 'US' : 'KR');
      const sessionLabel = isUsSession ? '미장(나스닥/S&P)' : '국장(KRX)';

      if (status.isActive && status.currentPosition) {
        const p = status.currentPosition;
        const isUsStock = p.market === 'US' || p.currency === 'USD';
        const sign = (p.returnPct || 0) >= 0 ? '+' : '';
        const color = (p.returnPct || 0) >= 0 ? '#f87171' : '#60a5fa';
        const entryStr = isUsStock ? `$${p.entryPrice}` : `${(p.entryPrice || 0).toLocaleString()}원`;
        const currentStr = isUsStock ? `$${p.currentPrice}` : `${(p.currentPrice || 0).toLocaleString()}원`;
        const targetStr = isUsStock ? `$${p.targetPrice}` : `${(p.targetPrice || 0).toLocaleString()}원`;
        const stopStr = isUsStock ? `$${p.stopLossPrice}` : `${(p.stopLossPrice || 0).toLocaleString()}원`;
        const pnlStr = isUsStock ? `${sign}$${p.unrealizedPnl}` : `${sign}${(p.unrealizedPnl || 0).toLocaleString()}원`;

        if (badge) {
          badge.textContent = `⚡ 가동 중 (${isUsStock ? '미장' : '국장'} 5초 시세 감시)`;
          badge.style.background = 'rgba(16, 185, 129, 0.2)';
          badge.style.color = '#34d399';
          badge.style.border = '1px solid rgba(16, 185, 129, 0.4)';
        }
        if (btnStart) btnStart.disabled = true;
        if (btnStop) btnStop.disabled = false;

        if (preview) {
          preview.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                    ${isUsStock ? '미장 1위 진입' : '국장 1위 진입'}
                  </span>
                  <strong style="color: #f8fafc; font-size: 1.05rem;">${p.stockName} (${p.symbol})</strong>
                  <span style="font-size: 0.8rem; color: #94a3b8;">1주 보유</span>
                </div>
                <div style="font-size: 0.85rem; color: #cbd5e1;">
                  매수가: <strong>${entryStr}</strong> | 
                  현재가: <strong>${currentStr}</strong>
                </div>
                <div style="font-size: 0.82rem; margin-top: 4px;">
                  🎯 <span style="color: #34d399;">목표 익절가(+2.5%): <strong>${targetStr}</strong></span> | 
                  ⛔ <span style="color: #f87171;">손절가(-1.5%): <strong>${stopStr}</strong></span>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.25rem; font-weight: 800; color: ${color};">
                  ${pnlStr} (${sign}${p.returnPct || 0}%)
                </div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                  5초 주기 실시간 감시 중
                </div>
              </div>
            </div>
          `;
        }
      } else if (status.isWaitingMarketOpen) {
        const isWaitingUs = waitingMarket === 'US';
        const waitTitle = isWaitingUs ? '⏳ 미장 개장 대기 중' : '⏳ 09:00 국장 개장 대기 중';
        const openPrompt = status.scalpingSession?.nextOpenPrompt || (isWaitingUs ? '오늘 밤 22:30' : '내일 아침 09:00');

        if (badge) {
          badge.textContent = waitTitle;
          badge.style.background = 'rgba(56, 189, 248, 0.15)';
          badge.style.color = '#38bdf8';
          badge.style.border = '1px solid rgba(56, 189, 248, 0.35)';
        }
        if (btnStart) btnStart.disabled = true;
        if (btnStop) btnStop.disabled = false;

        if (preview) {
          preview.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #38bdf8;">
              <span style="font-size: 1.3rem;">⏳</span>
              <div>
                <strong>${isWaitingUs ? '미국 정규장(NYSE/NASDAQ) 개장 대기 모드 가동 중' : '국내 정규장(KRX) 09:00 개장 대기 모드 가동 중'}</strong><br>
                <span style="font-size: 0.82rem; color: #94a3b8;">
                  ${openPrompt} 개장 즉시 토스증권 실시간 차트 ${isWaitingUs ? '거래대금 상위($100 이하)' : '거래대금 1위(10만원 이하)'} 종목을 자동 발굴하여 1주 시장가 매수 후 익절(+2.5%) / 손절(-1.5%) 감시를 개시합니다.
                </span>
              </div>
            </div>
          `;
        }
      } else {
        if (badge) {
          badge.textContent = '⏹️ 초단타 정지됨';
          badge.style.background = 'rgba(148, 163, 184, 0.15)';
          badge.style.color = '#94a3b8';
          badge.style.border = '1px solid rgba(148, 163, 184, 0.3)';
        }
        if (btnStart) {
          btnStart.disabled = false;
          btnStart.innerHTML = isUsSession
            ? '⚡ 미장(나스닥/S&P) 거래대금 1위 초단타 실행 (개장대기 / 즉시진입)'
            : '⚡ 국장 거래대금 1위 초단타 실행 (개장대기 / 즉시진입)';
        }
        if (btnStop) btnStop.disabled = true;

        if (preview) {
          let historyNotice = '';
          if (status.history && status.history.length > 0) {
            const last = status.history[0];
            const isLastUs = last.market === 'US' || last.currency === 'USD';
            const lastSign = (last.returnPct || 0) >= 0 ? '+' : '';
            const lastColor = (last.returnPct || 0) >= 0 ? '#34d399' : '#f87171';
            const reasonLabel = last.exitReason === 'TAKE_PROFIT' ? '🎯 목표가 익절(+2.5%)' : '⛔ 손절 청산(-1.5%)';
            const pnlDisplay = isLastUs
              ? `${lastSign}$${last.realizedPnl} (${lastSign}${last.returnPct || 0}%)`
              : `${lastSign}${last.realizedPnl?.toLocaleString() || 0}원 (${lastSign}${last.returnPct || 0}%)`;
            historyNotice = `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 0.82rem; color: #94a3b8;">
                직전 초단타 결과: <strong>${last.stockName}</strong> (${isLastUs ? '미장' : '국장'}) | ${reasonLabel} | <span style="color: ${lastColor}; font-weight: 700;">${pnlDisplay}</span>
              </div>
            `;
          }
          preview.innerHTML = `현재 가동 중인 초단타 포지션이 없습니다. 아래 [⚡ ${sessionLabel} 거래대금 1위 초단타 실행] 버튼을 눌러 시작하세요.${historyNotice}`;
        }
      }

      // 3. 최근 초단타 매매 완료 이력 렌더링
      const historySec = document.getElementById('admin-scalping-history-section');
      const historyList = document.getElementById('admin-scalping-history-list');
      const historyCount = document.getElementById('admin-scalping-history-count');
      if (historySec && historyList) {
        if (Array.isArray(status.history) && status.history.length > 0) {
          historySec.style.display = 'block';
          if (historyCount) historyCount.textContent = `총 ${status.history.length}건`;
          historyList.innerHTML = status.history.slice(0, 5).map(item => {
            const isItemUs = item.market === 'US' || item.currency === 'USD';
            const isProfit = (item.realizedPnl || 0) >= 0;
            const sign = isProfit ? '+' : '';
            const pnlColor = isProfit ? '#34d399' : '#f87171';
            const badgeBg = isProfit ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)';
            const badgeBorder = isProfit ? 'rgba(52, 211, 153, 0.35)' : 'rgba(248, 113, 113, 0.35)';
            const reasonText = item.exitReason === 'TAKE_PROFIT' ? '🎯 목표가 익절(+2.5%)' : '⛔ 손절 청산(-1.5%)';
            const dateStr = item.closedAt ? new Date(item.closedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
            const entryText = isItemUs ? `$${item.entryPrice}` : `${(item.entryPrice || 0).toLocaleString()}원`;
            const exitText = isItemUs ? `$${item.exitPrice}` : `${(item.exitPrice || 0).toLocaleString()}원`;
            const pnlText = isItemUs
              ? `${sign}$${item.realizedPnl}${item.realizedPnlKrw ? ` (약 ${sign}${item.realizedPnlKrw.toLocaleString()}원)` : ''} (${sign}${item.returnPct || 0}%)`
              : `${sign}${(item.realizedPnl || 0).toLocaleString()}원 (${sign}${item.returnPct || 0}%)`;

            return `
              <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="background: ${badgeBg}; color: ${pnlColor}; border: 1px solid ${badgeBorder}; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                      ${reasonText}
                    </span>
                    <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.7rem; padding: 1px 5px; border-radius: 3px;">
                      ${isItemUs ? '미장' : '국장'}
                    </span>
                    <strong style="color: #f1f5f9; font-size: 0.92rem;">${item.stockName}</strong>
                    <span style="color: #64748b; font-size: 0.78rem;">${item.symbol}</span>
                  </div>
                  <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 3px;">
                    매수: ${entryText} ➔ 매도: ${exitText} (${dateStr})
                  </div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 1rem; font-weight: 800; color: ${pnlColor};">
                    ${pnlText}
                  </span>
                </div>
              </div>
            `;
          }).join('');
        } else {
          historySec.style.display = 'none';
        }
      }
    }
  };

  window.StockTradingAdminView = StockTradingAdminView;
})(window);