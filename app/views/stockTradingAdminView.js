// app/views/stockTradingAdminView.js - 주식자동매매 관리자 뷰 (연간·월간 총 실현수익 통계 & 매매완료이력 통합)
(function(window) {
  'use strict';

  const StockTradingAdminView = {
    initialized: false,
    pollTimer: null,
    pollIntervalMs: 20000, // 20초 주기 폴링
    journalData: null,
    selectedYear: new Date().getFullYear().toString(),
    selectedMonth: 'current',
    selectedStrategyTab: 'all',
    cachedReservations: [],
    cachedPositions: [],
    isLoadingReservations: false,

    init() {
      if (this.initialized) {
        this.loadData();
        return;
      }
      this.initialized = true;

      this.bindEvents();
      this.loadData();
      this.startPolling();
    },

    bindEvents() {
      // 1. 상태 및 통계 새로고침 버튼
      const btnRefresh = document.getElementById('btn-admin-trading-refresh');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          this.loadData(true);
        });
      }

      // 2. 조회 연도 변경 이벤트
      const selYear = document.getElementById('select-admin-trading-year');
      if (selYear) {
        selYear.addEventListener('change', (e) => {
          this.selectedYear = e.target.value;
          this.renderYearAndMonthViews();
        });
      }

      // 3. 조회 월 변경 이벤트
      const selMonth = document.getElementById('select-admin-trading-month');
      if (selMonth) {
        selMonth.addEventListener('change', (e) => {
          this.selectedMonth = e.target.value;
          this.renderYearAndMonthViews();
        });
      }

      // 4. 전략별 필터 탭
      const tabWrap = document.getElementById('admin-history-strategy-tabs');
      if (tabWrap) {
        tabWrap.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn-admin-strategy-tab');
          if (!btn) return;
          const strat = btn.getAttribute('data-strategy');
          if (!strat) return;

          this.selectedStrategyTab = strat;
          tabWrap.querySelectorAll('.btn-admin-strategy-tab').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'rgba(15, 23, 42, 0.6)';
            b.style.color = '#94a3b8';
            b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            b.style.fontWeight = '600';
          });
          btn.classList.add('active');
          btn.style.background = 'rgba(56, 189, 248, 0.2)';
          btn.style.color = '#38bdf8';
          btn.style.borderColor = 'rgba(56, 189, 248, 0.4)';
          btn.style.fontWeight = '700';

          this.renderYearAndMonthViews();
        });
      }

      // 5. 당월/선택 월 이력 초기화 버튼
      const btnClear = document.getElementById('btn-admin-clear-trading-history');
      if (btnClear) {
        btnClear.addEventListener('click', async () => {
          const isArchive = this.selectedMonth && this.selectedMonth !== 'current';
          const targetTitle = isArchive ? `${this.selectedMonth} 실적 보관함` : '당월';
          const targetMonth = isArchive ? this.selectedMonth : 'current';

          const ok = confirm(`⚠️ [${targetTitle}] 매매 완료 이력 및 실현 손익 통계를 완전히 초기화하시겠습니까?\n(백업 없이 영구 삭제됩니다)`);
          if (!ok) return;

          try {
            const res = await fetch('/api/trading/history/clear', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ month: targetMonth, archive: false })
            });
            const data = await res.json();
            if (data.success) {
              this.selectedMonth = 'current';
              if (window.UiView && window.UiView.showToast) {
                window.UiView.showToast(`🗑️ [${targetTitle}] 매매 이력이 깨끗하게 초기화되었습니다.`);
              }
              await this.loadData(false);
            } else {
              alert('초기화 실패: ' + (data.error || '오류 발생'));
            }
          } catch (err) {
            alert('초기화 중 오류가 발생했습니다: ' + err.message);
          }
        });
      }

      // 6. 토스 API 설정 폼 제출
      const formApi = document.getElementById('form-admin-toss-api');
      if (formApi) {
        formApi.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveApiConfig();
        });
      }

      // 7. 5대 에이전트 끝장 토론 즉시 소집 이벤트 (Debate Summon)
      const btnGotoDebate = document.getElementById('btn-goto-stock-debate');
      if (btnGotoDebate) {
        btnGotoDebate.addEventListener('click', () => {
          if (window.AppController && window.AppController.switchTopNav) {
            window.AppController.switchTopNav('invest');
            const debateSideBtn = document.querySelector('[data-side="stock-debate"]');
            if (debateSideBtn) debateSideBtn.click();
            if (window.StockDebateView) window.StockDebateView.render();
          }
        });
      }

      const btnTriggerDebate = document.getElementById('btn-admin-trigger-debate');
      const inputDebateStock = document.getElementById('input-admin-debate-stock');
      const debateStatusBox = document.getElementById('admin-debate-summon-status');

      const handleDebateSummon = async (overrideStock) => {
        const stockQuery = (overrideStock || (inputDebateStock ? inputDebateStock.value : '')).trim();
        if (!stockQuery) {
          alert('토론을 소집할 주식 종목명이나 종목코드를 입력해주세요.');
          if (inputDebateStock) inputDebateStock.focus();
          return;
        }

        if (btnTriggerDebate) {
          btnTriggerDebate.disabled = true;
          btnTriggerDebate.innerHTML = '<span class="loading-spin">🔄</span> 에이전트 5인 소집 및 난타전 진행 중...';
        }
        if (debateStatusBox) {
          debateStatusBox.classList.remove('hidden');
          debateStatusBox.style.display = 'block';
          debateStatusBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #f59e0b; font-size: 0.88rem;">
              <span class="loading-spin" style="display:inline-block; animation: spin 1s infinite linear;">⚔️</span>
              <span><strong>[${stockQuery}]</strong> 5대 서브에이전트(성장론자·신중론자·기술분석가·주린이·단가)가 격렬한 끝장 토론을 벌이고 있습니다...</span>
            </div>
          `;
        }

        try {
          if (!window.StockDebateModel) {
            throw new Error('StockDebateModel을 찾을 수 없습니다.');
          }
          const res = await window.StockDebateModel.triggerDebate(stockQuery);
          if (res && res.success) {
            if (debateStatusBox) {
              debateStatusBox.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <div style="color: #10b981; font-size: 0.88rem;">
                    ✅ <strong>[${stockQuery}]</strong> 끝장 토론이 성공적으로 완료 및 기록되었습니다! 잠시 후 토론실 피드로 자동 이동합니다...
                  </div>
                  <button type="button" id="btn-summon-goto-feed" class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); font-size: 0.78rem; padding: 3px 10px;">
                    🔥 지금 바로 토론실 보기 &rarr;
                  </button>
                </div>
              `;
              const btnSummonGoto = document.getElementById('btn-summon-goto-feed');
              const navigateToDebate = () => {
                if (window.AppController && window.AppController.switchTopNav) {
                  window.AppController.switchTopNav('invest');
                  const debateSideBtn = document.querySelector('[data-side="stock-debate"]');
                  if (debateSideBtn) debateSideBtn.click();
                  if (window.StockDebateView) window.StockDebateView.render();
                }
              };
              if (btnSummonGoto) btnSummonGoto.addEventListener('click', navigateToDebate);
              // 1.5초 후 자동 이동
              setTimeout(navigateToDebate, 1500);
            }
            this.updateDebateStats();
          } else {
            if (debateStatusBox) {
              debateStatusBox.innerHTML = `<div style="color: #ef4444; font-size: 0.88rem;">⚠️ ${res?.message || '토론 소집 실패'}</div>`;
            }
          }
        } catch (e) {
          if (debateStatusBox) {
            debateStatusBox.innerHTML = `<div style="color: #ef4444; font-size: 0.88rem;">❌ 오류: ${e.message}</div>`;
          }
        } finally {
          if (btnTriggerDebate) {
            btnTriggerDebate.disabled = false;
            btnTriggerDebate.innerHTML = '🔥 즉시 끝장 토론 소집 (Debate Summon)';
          }
        }
      };

      if (btnTriggerDebate) {
        btnTriggerDebate.addEventListener('click', () => handleDebateSummon());
      }

      if (inputDebateStock) {
        inputDebateStock.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleDebateSummon();
          }
        });
      }

      // 종목 빠른 선택 칩
      const quickChips = document.querySelectorAll('#view-stock-trading-admin .debate-preset-chip');
      quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const stock = chip.getAttribute('data-stock');
          if (inputDebateStock) inputDebateStock.value = stock;
          handleDebateSummon(stock);
        });
      });

      // 끝장 토론 전체 비우기 버튼 (관리자 메뉴)
      const btnAdminClearDebates = document.getElementById('btn-admin-clear-all-debates');
      if (btnAdminClearDebates) {
        btnAdminClearDebates.addEventListener('click', async () => {
          if (!window.StockDebateModel) return;
          const total = (window.StockDebateModel.items || []).length;
          if (total === 0) {
            alert('삭제할 끝장 토론 기록이 없습니다.');
            return;
          }
          if (confirm(`저장된 모든 끝장 토론 기록(${total}건)을 완전히 삭제하시겠습니까?`)) {
            btnAdminClearDebates.disabled = true;
            btnAdminClearDebates.textContent = '⏳ 삭제 중...';
            await window.StockDebateModel.clearAllDebates();
            this.updateDebateStats();
            if (window.StockDebateView) {
              window.StockDebateView.render();
            }
            btnAdminClearDebates.disabled = false;
            btnAdminClearDebates.textContent = '🗑️ 끝장 토론 전체 비우기';
            alert('모든 끝장 토론 기록이 성공적으로 삭제되었습니다.');
          }
        });
      }

      // 8. 예약 발주 및 운용 현황 패널 이벤트 (취소 및 새로고침)
      const panelContainer = document.getElementById('admin-trading-reservations-panel');
      if (panelContainer && !panelContainer._hasBound) {
        panelContainer._hasBound = true;
        panelContainer.addEventListener('click', (e) => {
          const btnCancel = e.target.closest('.btn-cancel-admin-reservation');
          if (btnCancel) {
            const id = btnCancel.getAttribute('data-id');
            const name = btnCancel.getAttribute('data-name');
            this.cancelReservation(id, name, btnCancel);
            return;
          }
          const btnRef = e.target.closest('#btn-refresh-admin-reservations');
          if (btnRef) {
            btnRef.disabled = true;
            btnRef.textContent = '⏳ 갱신 중...';
            this.loadReservations();
            return;
          }
        });
      }
    },

    async loadReservations() {
      try {
        this.isLoadingReservations = true;
        const [resDebate, resJournal] = await Promise.allSettled([
          fetch('/api/debate/reservations'),
          fetch('/api/trading/journal')
        ]);
        if (resDebate.status === 'fulfilled' && resDebate.value.ok) {
          const data = await resDebate.value.json();
          this.cachedReservations = Array.isArray(data.reservations) ? data.reservations : [];
        }
        if (resJournal.status === 'fulfilled' && resJournal.value.ok) {
          const jData = await resJournal.value.json();
          const positions = [];
          if (jData.currentPosition) positions.push(jData.currentPosition);
          if (Array.isArray(jData.reservationPositions)) positions.push(...jData.reservationPositions);
          this.cachedPositions = positions;

          // active reservations에 실시간 현재가 및 체결가 동기화
          this.cachedReservations.forEach(r => {
            const matchedPos = positions.find(p => (p.itemCode === r.itemCode || p.stockCode === r.itemCode));
            if (matchedPos) {
              r.currentPrice = matchedPos.currentPrice || r.currentPrice;
              r.finalFilledPrice = matchedPos.entryPrice || matchedPos.averagePrice || r.finalFilledPrice;
              if (matchedPos.targetPrice) {
                if (!r.exitPlan) r.exitPlan = {};
                r.exitPlan.targetPrice = matchedPos.targetPrice;
              }
              if (matchedPos.stopLossPrice) {
                if (!r.exitPlan) r.exitPlan = {};
                r.exitPlan.stopLossPrice = matchedPos.stopLossPrice;
              }
            }
          });
        }
      } catch (e) {
        console.warn('[StockTradingAdminView] Error loading reservations:', e.message);
      } finally {
        this.isLoadingReservations = false;
      }
      this.renderReservationsPanel();
      return this.cachedReservations;
    },

    async cancelReservation(reservationId, stockName, btnEl) {
      if (!confirm(`🗑️ [${stockName}] 예약매수를 취소하시겠습니까?`)) return;
      try {
        if (btnEl) {
          btnEl.disabled = true;
          btnEl.textContent = '⏳';
        }
        const res = await fetch(`/api/debate/reservations/${encodeURIComponent(reservationId)}`, {
          method: 'DELETE',
          headers: { 'x-admin-user': 'admin' }
        });
        const data = await res.json();
        if (data.success) {
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast(`🗑️ [${stockName}] 예약매수가 취소되었습니다.`);
          } else {
            alert(`🗑️ [${stockName}] 예약매수가 취소되었습니다.`);
          }
          await this.loadReservations();
          if (window.StockDebateView && typeof window.StockDebateView.loadReservations === 'function') {
            window.StockDebateView.loadReservations().then(() => window.StockDebateView.render());
          }
        } else {
          alert(`❌ 예약 취소 실패: ${data.error || '오류가 발생했습니다.'}`);
          if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = '🗑️ 취소';
          }
        }
      } catch (err) {
        alert(`❌ 통신 오류: ${err.message}`);
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = '🗑️ 취소';
        }
      }
    },

    renderReservationsPanel() {
      const panel = document.getElementById('admin-trading-reservations-panel');
      if (!panel) return;

      const reservations = this.cachedReservations || [];
      const pendingList = reservations.filter(r => r.status === 'PENDING' || r.status === 'ORDER_SUBMITTED');
      const filledList = reservations.filter(r => r.status === 'FILLED');
      const totalActiveCount = pendingList.length + filledList.length;

      // 현재 한국/미국 정규장 개장 여부 및 시간 계산
      const now = new Date();
      const kstH = (now.getUTCHours() + 9) % 24;
      const kstM = now.getUTCMinutes();
      const kstTotalM = kstH * 60 + kstM;
      const isKrOpenNow = kstTotalM >= 540 && kstTotalM <= 930; // 09:00 ~ 15:30 KST
      const isUsOpenNow = kstTotalM >= 1350 || kstTotalM <= 300; // 서머타임 22:30 ~ 05:00 KST

      const marketBadgesHtml = `
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 0.72rem; padding: 3px 8px; border-radius: 12px; font-weight: 600; background: ${isKrOpenNow ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.15)'}; color: ${isKrOpenNow ? '#4ade80' : '#94a3b8'}; border: 1px solid ${isKrOpenNow ? 'rgba(34, 197, 94, 0.4)' : 'rgba(148, 163, 184, 0.3)'};">
            🇰🇷 국장(KRX): ${isKrOpenNow ? '🟢 정규장 운영 중 (09:00~15:30)' : '🔴 장마감 (09:00 개장)'}
          </span>
          <span style="font-size: 0.72rem; padding: 3px 8px; border-radius: 12px; font-weight: 600; background: ${isUsOpenNow ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.15)'}; color: ${isUsOpenNow ? '#4ade80' : '#94a3b8'}; border: 1px solid ${isUsOpenNow ? 'rgba(34, 197, 94, 0.4)' : 'rgba(148, 163, 184, 0.3)'};">
            🇺🇸 미장(NYSE/NASDAQ): ${isUsOpenNow ? '🟢 정규장 운영 중 (서머타임 22:30~05:00)' : '🔴 장마감 (밤 22:30 개장)'}
          </span>
        </div>
      `;

      if (totalActiveCount === 0) {
        panel.style.display = 'block';
        panel.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.75); border: 1px dashed rgba(59, 130, 246, 0.35); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 1.2rem;">📋</span>
                <strong style="color: #93c5fd; font-size: 0.95rem;">[관리자 전용] 토스증권 AI 예약 발주 및 운용 현황 (0건)</strong>
              </div>
              <div style="font-size: 0.76rem; color: #94a3b8; margin-bottom: 6px;">
                AI 끝장 토론실에서 3대 전략 버튼(눌림목/시초가/분할매수)으로 접수한 예약 발주 및 실시간 운용 포지션 목록입니다.
              </div>
              ${marketBadgesHtml}
            </div>
            <button type="button" id="btn-refresh-admin-reservations" class="btn btn-sm btn-outline-info" style="font-size: 0.78rem; padding: 5px 12px;">
              🔄 현황 실시간 갱신
            </button>
          </div>
        `;
        return;
      }

      panel.style.display = 'block';

      const renderCard = (r, isFilledCard = false) => {
        const isKr = r.market === 'KR';
        const unit = isKr ? '원' : '$';
        let statusBadge = '';
        if (r.status === 'PENDING') {
          statusBadge = '<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">⏳ 개장 대기 (개장 시 자동발주)</span>';
        } else if (r.status === 'ORDER_SUBMITTED') {
          statusBadge = '<span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">🚀 토스 발주 접수 (체결 대기)</span>';
        } else if (r.status === 'FILLED') {
          statusBadge = '<span style="background: rgba(34, 197, 94, 0.25); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.45); padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">🎉 체결 완료 (실시간 익절/손절 감시 중)</span>';
        } else if (r.status === 'FAILED') {
          statusBadge = `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;" title="${r.error || '발주 거부'}">❌ 발주 실패</span>`;
        }

        const buyPrice = r.finalFilledPrice || r.orders?.[0]?.price || 0;
        const currentPrice = r.currentPrice || buyPrice;
        const targetPrice = r.exitPlan?.targetPrice || (buyPrice > 0 ? (isKr ? Math.round(buyPrice * (1 + (r.exitPlan?.targetProfitPct || 10)/100)) : parseFloat((buyPrice * (1 + (r.exitPlan?.targetProfitPct || 10)/100)).toFixed(2))) : 0);
        const stopLossPrice = r.exitPlan?.stopLossPrice || (buyPrice > 0 ? (isKr ? Math.round(buyPrice * (1 + (r.exitPlan?.stopLossPct || -5)/100)) : parseFloat((buyPrice * (1 + (r.exitPlan?.stopLossPct || -5)/100)).toFixed(2))) : 0);
        const targetPct = r.exitPlan?.targetProfitPct || (buyPrice > 0 ? (((targetPrice - buyPrice)/buyPrice)*100).toFixed(1) : 0);
        const stopLossPct = r.exitPlan?.stopLossPct || (buyPrice > 0 ? (((stopLossPrice - buyPrice)/buyPrice)*100).toFixed(1) : 0);
        const returnPct = buyPrice > 0 ? (((currentPrice - buyPrice)/buyPrice)*100).toFixed(2) : '0.00';
        const returnColor = Number(returnPct) >= 0 ? '#f87171' : '#60a5fa';

        const orderLines = (r.orders || []).map(o => `• ${o.title}: ${o.price.toLocaleString()}${unit} × ${o.quantity}주 ${o.orderAmount ? `($${o.orderAmount})` : ''}`).join('<br>');
        const exitTitle = r.exitPlan?.exitStrategyTitle || r.exitPlan?.title || '적응형 매도';

        return `
          <div style="background: rgba(30, 41, 59, 0.9); border: 1px solid ${isFilledCard ? 'rgba(34, 197, 94, 0.45)' : 'rgba(59, 130, 246, 0.45)'}; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.25);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <strong style="color: #f8fafc; font-size: 1.05rem;">${r.stockName}</strong>
                  <span style="color: #94a3b8; font-size: 0.82rem; font-family: monospace;">${r.itemCode}</span>
                  <span style="background: rgba(99, 102, 241, 0.25); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.74rem; font-weight: 600;">${r.strategyTitle}</span>
                </div>
                <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 3px;">
                  ${isFilledCard ? `체결 완료: <strong>${r.filledAt ? r.filledAt.replace('T', ' ').substring(0, 19) : '-'}</strong>` : `접수: ${r.createdAt ? r.createdAt.replace('T', ' ').substring(0, 19) : '-'}`} | 
                  수량: <strong>${r.finalFilledQty || r.totalQuantity}주</strong> (${(r.totalBudgetKrw || 0).toLocaleString()}원)
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${statusBadge}
                ${!isFilledCard ? `
                  <button type="button" class="btn-cancel-admin-reservation" data-id="${r.id}" data-name="${r.stockName}" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; padding: 4px 10px; font-size: 0.76rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    🗑️ 취소
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- 4대 가격 지표 요약 카드 (매수가, 현재가, 목표가, 손절가) -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
              <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.06); padding: 7px 6px; border-radius: 6px; text-align: center;">
                <span style="font-size: 0.70rem; color: #94a3b8; display: block; margin-bottom: 2px;">${isFilledCard ? '체결 매수가' : '진입 목표가'}</span>
                <strong style="font-size: 0.88rem; color: #f8fafc;">${buyPrice.toLocaleString()}${unit}</strong>
              </div>
              <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.06); padding: 7px 6px; border-radius: 6px; text-align: center;">
                <span style="font-size: 0.70rem; color: #94a3b8; display: block; margin-bottom: 2px;">현재가 (실시간)</span>
                <strong style="font-size: 0.88rem; color: ${returnColor};">
                  ${currentPrice.toLocaleString()}${unit}
                  <span style="font-size: 0.72rem; display: block;">(${Number(returnPct) >= 0 ? '+' : ''}${returnPct}%)</span>
                </strong>
              </div>
              <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); padding: 7px 6px; border-radius: 6px; text-align: center;">
                <span style="font-size: 0.70rem; color: #34d399; display: block; margin-bottom: 2px;">🎯 목표가 (익절)</span>
                <strong style="font-size: 0.88rem; color: #34d399;">${targetPrice.toLocaleString()}${unit}</strong>
                <span style="font-size: 0.70rem; color: #6ee7b7; display: block;">(+${targetPct}%)</span>
              </div>
              <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); padding: 7px 6px; border-radius: 6px; text-align: center;">
                <span style="font-size: 0.70rem; color: #f87171; display: block; margin-bottom: 2px;">⛔ 손절가 (손절선)</span>
                <strong style="font-size: 0.88rem; color: #f87171;">${stopLossPrice.toLocaleString()}${unit}</strong>
                <span style="font-size: 0.70rem; color: #fca5a5; display: block;">(${stopLossPct}%)</span>
              </div>
            </div>

            <div style="font-size: 0.76rem; color: #cbd5e1; background: rgba(15, 23, 42, 0.5); padding: 6px 10px; border-radius: 6px; line-height: 1.4;">
              ${orderLines}
            </div>
            <div style="font-size: 0.74rem; color: #38bdf8;">
              🎯 <strong>체결 후 매도 전략:</strong> ${exitTitle}
            </div>
          </div>
        `;
      };

      let pendingSectionHtml = '';
      if (pendingList.length > 0) {
        pendingSectionHtml = `
          <div style="margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 1rem;">⏳</span>
              <h4 style="color: #93c5fd; margin: 0; font-size: 0.95rem; font-weight: 700;">
                예약 발주 및 체결 대기 목록 (${pendingList.length}건)
              </h4>
              <span style="font-size: 0.72rem; color: #94a3b8;">(개장 시점 자동 발주 대기 또는 토스 체결 대기)</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 10px;">
              ${pendingList.map(r => renderCard(r, false)).join('')}
            </div>
          </div>
        `;
      }

      let filledSectionHtml = '';
      if (filledList.length > 0) {
        filledSectionHtml = `
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 1rem;">🎯</span>
              <h4 style="color: #4ade80; margin: 0; font-size: 0.95rem; font-weight: 700;">
                체결 완료 운용 포지션 (${filledList.length}건)
              </h4>
              <span style="font-size: 0.72rem; color: #86efac; background: rgba(34, 197, 94, 0.2); padding: 2px 8px; border-radius: 10px;">실시간 자동 익절/손절 감시 가동 중</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 10px;">
              ${filledList.map(r => renderCard(r, true)).join('')}
            </div>
          </div>
        `;
      }

      panel.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(59, 130, 246, 0.45); border-radius: 14px; padding: 16px 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.25rem;">📋</span>
                <h3 style="color: #60a5fa; margin: 0; font-size: 1.05rem; font-weight: 700;">
                  [관리자 전용] 토스증권 AI 예약 발주 및 운용 현황 (${totalActiveCount}건)
                </h3>
              </div>
              <div style="margin-top: 5px;">
                ${marketBadgesHtml}
              </div>
            </div>
            <button type="button" id="btn-refresh-admin-reservations" class="btn btn-sm btn-outline-info" style="font-size: 0.78rem; padding: 5px 12px;">
              🔄 현황 실시간 갱신
            </button>
          </div>
          ${pendingSectionHtml}
          ${filledSectionHtml}
        </div>
      `;
    },

    startPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        const section = document.getElementById('view-stock-trading-admin');
        if (section && !section.classList.contains('hidden')) {
          this.loadData(false);
        }
      }, this.pollIntervalMs);
    },

    async updateDebateStats() {
      try {
        if (window.StockDebateModel && (!window.StockDebateModel.items || window.StockDebateModel.items.length === 0)) {
          if (typeof window.StockDebateModel.loadDebates === 'function') {
            await window.StockDebateModel.loadDebates();
          }
        }
        const allDebates = (window.StockDebateModel && window.StockDebateModel.items && window.StockDebateModel.items.length > 0)
          ? window.StockDebateModel.items
          : (window.PORTAL_DATA_STOCK_DEBATES || []);
        const totalEl = document.getElementById('admin-debate-stat-total');
        const todayEl = document.getElementById('admin-debate-stat-today');
        if (totalEl) totalEl.textContent = allDebates.length;
        if (todayEl) {
          const todayIso = new Date().toISOString().slice(0, 10);
          const todayCount = allDebates.filter(d => (d.timestamp || '').includes(todayIso)).length;
          todayEl.textContent = todayCount > 0 ? todayCount : allDebates.length;
        }
      } catch (err) {
        console.warn('[StockTradingAdminView] updateDebateStats error:', err);
      }
    },

    async loadData(showToast = false) {
      try {
        const [journalRes, statusRes, ipRes] = await Promise.allSettled([
          fetch('/api/trading/journal'),
          fetch('/api/trading/status'),
          fetch('/api/trading/server-ip')
        ]);

        if (journalRes.status === 'fulfilled' && journalRes.value.ok) {
          this.journalData = await journalRes.value.json();
        }

        if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
          const statusData = await statusRes.value.json();
          this.renderApiStatus(statusData);
        }

        if (ipRes.status === 'fulfilled' && ipRes.value.ok) {
          const ipData = await ipRes.value.json();
          const elIp = document.getElementById('admin-server-egress-ip');
          if (elIp && ipData.ip) elIp.textContent = ipData.ip;
        }

        this.renderAll();
        this.updateDebateStats();
        await this.loadReservations();

        const elSync = document.getElementById('admin-trading-last-sync');
        if (elSync) {
          elSync.textContent = `최근 갱신: ${new Date().toLocaleTimeString('ko-KR')}`;
        }

        if (showToast && window.UiView && window.UiView.showToast) {
          window.UiView.showToast('🤖 주식자동매매 실현수익 통계 및 매매완료 이력이 갱신되었습니다.');
        }
      } catch (err) {
        console.error('[StockTradingAdminView] loadData error:', err);
      }
    },

    renderApiStatus(data) {
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

      if (data.config) {
        const inputMode = document.getElementById('admin-toss-mode');
        if (inputMode && data.config.mode) inputMode.value = data.config.mode;
        const inputAccount = document.getElementById('admin-toss-account-no');
        if (inputAccount && !inputAccount.value && data.config.accountNo) {
          inputAccount.placeholder = `현재 등록됨 (${data.config.accountNo})`;
        }
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
          this.loadData(true);
        } else {
          alert('설정 저장 실패: ' + (data.message || data.error));
        }
      } catch (e) {
        alert('설정 저장 통신 오류: ' + e.message);
      }
    },

    getAllHistoryItems() {
      const j = this.journalData || {};
      const currentList = Array.isArray(j.history) ? j.history : [];
      const archives = j.monthlyArchives || {};
      const map = new Map();

      // 1. 현재 월 이력 추가
      currentList.forEach(it => {
        const id = it.id || it.orderId || `${it.closedAt || it.startedAt}_${it.stockName}`;
        if (!map.has(id)) map.set(id, it);
      });

      // 2. 월별 아카이브 이력 추가
      Object.keys(archives).forEach(mKey => {
        const archList = Array.isArray(archives[mKey]?.history) ? archives[mKey].history : [];
        archList.forEach(it => {
          const id = it.id || it.orderId || `${it.closedAt || it.startedAt}_${it.stockName}`;
          if (!map.has(id)) map.set(id, it);
        });
      });

      return Array.from(map.values()).sort((a, b) => {
        const ta = new Date(a.closedAt || a.startedAt || 0).getTime();
        const tb = new Date(b.closedAt || b.startedAt || 0).getTime();
        return tb - ta;
      });
    },

    renderAll() {
      if (!this.journalData) return;
      this.populateYearAndMonthSelectors();
      this.renderYearAndMonthViews();
    },

    populateYearAndMonthSelectors() {
      const allItems = this.getAllHistoryItems();
      const curYear = new Date().getFullYear().toString();
      const yearsSet = new Set([curYear]);

      allItems.forEach(it => {
        const dStr = it.closedAt || it.startedAt;
        if (dStr) {
          const y = new Date(dStr).getFullYear().toString();
          if (!isNaN(y)) yearsSet.add(y);
        }
      });

      // 연도 셀렉트 구성
      const selYear = document.getElementById('select-admin-trading-year');
      if (selYear) {
        const sortedYears = Array.from(yearsSet).sort().reverse();
        selYear.innerHTML = sortedYears.map(y => `<option value="${y}">${y}년</option>`).join('');
        if (!this.selectedYear || !yearsSet.has(this.selectedYear)) {
          this.selectedYear = sortedYears[0];
        }
        selYear.value = this.selectedYear;
      }

      // 월 셀렉트 구성
      const selMonth = document.getElementById('select-admin-trading-month');
      if (selMonth) {
        const curM = this.journalData.currentMonth || new Date().toISOString().slice(0, 7);
        const parts = curM.split('-');
        const curDisplay = parts.length === 2 ? `${parseInt(parts[1], 10)}월` : curM;

        let optionsHtml = `<option value="current">🗓️ ${curM} (${curDisplay} 당월 실적)</option>`;
        const archivedKeys = Object.keys(this.journalData.monthlyArchives || {}).sort().reverse();
        archivedKeys.forEach(k => {
          if (k !== curM) {
            const p = k.split('-');
            const disp = p.length === 2 ? `${parseInt(p[1], 10)}월` : k;
            optionsHtml += `<option value="${k}">📁 ${k} (${disp} 실적 보관함)</option>`;
          }
        });
        selMonth.innerHTML = optionsHtml;

        if (this.selectedMonth && (this.selectedMonth === 'current' || this.journalData.monthlyArchives?.[this.selectedMonth])) {
          selMonth.value = this.selectedMonth;
        } else {
          this.selectedMonth = 'current';
          selMonth.value = 'current';
        }
      }
    },

    renderYearAndMonthViews() {
      const allItems = this.getAllHistoryItems();
      const targetYear = this.selectedYear || new Date().getFullYear().toString();

      // 1. 해당 연도 아이템 필터링
      const yearItems = allItems.filter(it => {
        const d = it.closedAt || it.startedAt;
        if (!d) return targetYear === new Date().getFullYear().toString();
        return new Date(d).getFullYear().toString() === targetYear;
      });

      // 2. 연간 통계 산출
      let yearlyProfitKrw = 0;
      let yearlyWins = 0;
      let yearlyLosses = 0;
      let bestItem = null;
      let worstItem = null;

      // 월별 손익 매핑 (1월 ~ 12월)
      const monthlyMap = {};
      for (let m = 1; m <= 12; m++) {
        const mKey = `${targetYear}-${String(m).padStart(2, '0')}`;
        monthlyMap[mKey] = { profitKrw: 0, trades: 0, wins: 0, losses: 0 };
      }

      yearItems.forEach(it => {
        const pnlKrw = Number(it.realizedPnlKrw || it.profitKrw || it.realizedPnl) || 0;
        const returnPct = typeof it.returnPct === 'number' ? it.returnPct : (parseFloat(it.returnPct) || 0);

        yearlyProfitKrw += pnlKrw;
        if (pnlKrw > 0) yearlyWins++;
        else if (pnlKrw < 0) yearlyLosses++;

        // 최고 / 최대손실 종목 판정
        if (!bestItem || pnlKrw > (bestItem.pnlKrw || 0)) {
          bestItem = { ...it, pnlKrw, returnPct };
        }
        if (!worstItem || pnlKrw < (worstItem.pnlKrw || 0)) {
          worstItem = { ...it, pnlKrw, returnPct };
        }

        // 월별 집계
        const dStr = it.closedAt || it.startedAt;
        if (dStr) {
          const mKey = dStr.slice(0, 7);
          if (monthlyMap[mKey]) {
            monthlyMap[mKey].profitKrw += pnlKrw;
            monthlyMap[mKey].trades++;
            if (pnlKrw > 0) monthlyMap[mKey].wins++;
            else if (pnlKrw < 0) monthlyMap[mKey].losses++;
          }
        }
      });

      const yearlyTrades = yearItems.length;
      const yearlyWinRate = yearlyTrades > 0 ? ((yearlyWins / yearlyTrades) * 100).toFixed(1) : 0;

      // 3. 선택 월 통계 및 아이템 추출
      let activeMonthKey = '';
      let activeMonthDisplay = '';
      let monthItems = [];

      if (this.selectedMonth && this.selectedMonth !== 'current' && this.journalData.monthlyArchives?.[this.selectedMonth]) {
        activeMonthKey = this.selectedMonth;
        const p = activeMonthKey.split('-');
        activeMonthDisplay = p.length === 2 ? `${parseInt(p[1], 10)}월` : activeMonthKey;
        monthItems = this.journalData.monthlyArchives[activeMonthKey].history || [];
      } else {
        activeMonthKey = this.journalData.currentMonth || new Date().toISOString().slice(0, 7);
        const p = activeMonthKey.split('-');
        activeMonthDisplay = p.length === 2 ? `${parseInt(p[1], 10)}월` : activeMonthKey;
        monthItems = Array.isArray(this.journalData.history) ? this.journalData.history : [];
      }

      let monthlyProfitKrw = 0;
      let monthlyWins = 0;
      let monthlyLosses = 0;

      monthItems.forEach(it => {
        const pnlKrw = Number(it.realizedPnlKrw || it.profitKrw || it.realizedPnl) || 0;
        monthlyProfitKrw += pnlKrw;
        if (pnlKrw > 0) monthlyWins++;
        else if (pnlKrw < 0) monthlyLosses++;
      });

      const monthlyTrades = monthItems.length;
      const monthlyWinRate = monthlyTrades > 0 ? ((monthlyWins / monthlyTrades) * 100).toFixed(1) : 0;

      // 4. DOM 통계 카드 렌더링
      this.renderMetricCards({
        targetYear,
        yearlyProfitKrw,
        yearlyTrades,
        yearlyWins,
        yearlyLosses,
        yearlyWinRate,
        bestItem,
        worstItem,
        activeMonthDisplay,
        monthlyProfitKrw,
        monthlyTrades,
        monthlyWins,
        monthlyLosses,
        monthlyWinRate
      });

      // 5. 연간 월별 실현손익 한눈에 보기 바 렌더링
      this.renderMonthlyBreakdown(targetYear, monthlyMap);

      // 6. 매매 완료 이력 목록 렌더링
      this.renderHistoryList(monthItems, activeMonthDisplay);
    },

    renderMetricCards(m) {
      // 1) 연간 총 실현수익 카드
      const elYearLabel = document.getElementById('admin-stat-year-label');
      const elYearProfit = document.getElementById('admin-stat-yearly-profit');
      const elYearTrades = document.getElementById('admin-stat-yearly-trades');
      const elYearWinLoss = document.getElementById('admin-stat-yearly-winloss');
      const elYearWinrate = document.getElementById('admin-stat-yearly-winrate');

      if (elYearLabel) elYearLabel.textContent = `${m.targetYear}년`;
      if (elYearProfit) {
        const sign = m.yearlyProfitKrw > 0 ? '+' : '';
        elYearProfit.textContent = `${sign}${m.yearlyProfitKrw.toLocaleString()}원`;
        elYearProfit.style.color = m.yearlyProfitKrw > 0 ? '#f87171' : (m.yearlyProfitKrw < 0 ? '#60a5fa' : '#f8fafc');
      }
      if (elYearTrades) elYearTrades.textContent = `${m.yearlyTrades}회`;
      if (elYearWinLoss) elYearWinLoss.textContent = `${m.yearlyWins}승 ${m.yearlyLosses}패`;
      if (elYearWinrate) elYearWinrate.textContent = `${m.yearlyWinRate}%`;

      // 2) 선택월 실현수익 카드
      const elMonthLabel = document.getElementById('admin-stat-month-label');
      const elMonthProfit = document.getElementById('admin-stat-monthly-profit');
      const elMonthTrades = document.getElementById('admin-stat-monthly-trades');
      const elMonthWinLoss = document.getElementById('admin-stat-monthly-winloss');
      const elMonthWinrate = document.getElementById('admin-stat-monthly-winrate');

      if (elMonthLabel) elMonthLabel.textContent = m.activeMonthDisplay;
      if (elMonthProfit) {
        const sign = m.monthlyProfitKrw > 0 ? '+' : '';
        elMonthProfit.textContent = `${sign}${m.monthlyProfitKrw.toLocaleString()}원`;
        elMonthProfit.style.color = m.monthlyProfitKrw > 0 ? '#f87171' : (m.monthlyProfitKrw < 0 ? '#60a5fa' : '#f8fafc');
      }
      if (elMonthTrades) elMonthTrades.textContent = `${m.monthlyTrades}회`;
      if (elMonthWinLoss) elMonthWinLoss.textContent = `${m.monthlyWins}승 ${m.monthlyLosses}패`;
      if (elMonthWinrate) elMonthWinrate.textContent = `${m.monthlyWinRate}%`;

      // 3) 최고 수익 종목
      const elBestStock = document.getElementById('admin-stat-best-stock');
      const elBestProfit = document.getElementById('admin-stat-best-profit');
      if (elBestStock && elBestProfit) {
        if (m.bestItem && m.bestItem.pnlKrw > 0) {
          elBestStock.textContent = `${m.bestItem.stockName || '-'}`;
          elBestProfit.textContent = `+${m.bestItem.pnlKrw.toLocaleString()}원 (+${m.bestItem.returnPct || 0}%)`;
          elBestProfit.style.color = '#f87171';
        } else {
          elBestStock.textContent = '기록 없음';
          elBestProfit.textContent = '-';
          elBestProfit.style.color = '#94a3b8';
        }
      }

      // 4) 최대 손실 종목
      const elWorstStock = document.getElementById('admin-stat-worst-stock');
      const elWorstProfit = document.getElementById('admin-stat-worst-profit');
      if (elWorstStock && elWorstProfit) {
        if (m.worstItem && m.worstItem.pnlKrw < 0) {
          elWorstStock.textContent = `${m.worstItem.stockName || '-'}`;
          elWorstProfit.textContent = `${m.worstItem.pnlKrw.toLocaleString()}원 (${m.worstItem.returnPct || 0}%)`;
          elWorstProfit.style.color = '#60a5fa';
        } else {
          elWorstStock.textContent = '기록 없음';
          elWorstProfit.textContent = '-';
          elWorstProfit.style.color = '#94a3b8';
        }
      }
    },

    renderMonthlyBreakdown(year, monthlyMap) {
      const elTitle = document.getElementById('admin-breakdown-year-title');
      const container = document.getElementById('admin-monthly-breakdown-list');
      if (elTitle) elTitle.textContent = `${year}년`;
      if (!container) return;

      const keys = Object.keys(monthlyMap).sort();
      let html = '';

      keys.forEach(k => {
        const data = monthlyMap[k];
        const monthNum = parseInt(k.split('-')[1], 10);
        const sign = data.profitKrw > 0 ? '+' : '';
        const color = data.profitKrw > 0 ? '#f87171' : (data.profitKrw < 0 ? '#60a5fa' : '#94a3b8');
        const bg = data.profitKrw > 0 ? 'rgba(239, 68, 68, 0.1)' : (data.profitKrw < 0 ? 'rgba(96, 165, 250, 0.1)' : 'rgba(30, 41, 59, 0.4)');
        const border = data.profitKrw > 0 ? 'rgba(239, 68, 68, 0.3)' : (data.profitKrw < 0 ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.05)');

        html += `
          <div style="background: ${bg}; border: 1px solid ${border}; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="font-size: 0.82rem; color: #cbd5e1;">${monthNum}월</strong>
              <span style="font-size: 0.72rem; color: #94a3b8;">${data.trades}건</span>
            </div>
            <div style="font-size: 0.88rem; font-weight: 700; color: ${color}; text-align: right;">
              ${sign}${data.profitKrw.toLocaleString()}원
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    renderHistoryList(items = [], monthDisplay = '') {
      const elSecLabel = document.getElementById('admin-history-section-month-label');
      const elTotalCount = document.getElementById('admin-history-total-count');
      const emptyCard = document.getElementById('admin-trading-history-empty');
      const listContainer = document.getElementById('admin-trading-history-list');

      if (elSecLabel) elSecLabel.textContent = monthDisplay ? `${monthDisplay}` : '당월';

      const allList = Array.isArray(items) ? items : [];
      if (elTotalCount) elTotalCount.textContent = `총 ${allList.length}건`;

      // 전략별 카운트 계산
      const countAll = allList.length;
      const countDebate = allList.filter(h => h.strategyType === 'DEBATE_RESERVATION' || (!h.strategyType && h.type !== 'CUSTOM_STRATEGY' && (!h.orderId || !String(h.orderId).startsWith('SCALP')))).length;
      const countScalping = allList.filter(h => h.strategyType === 'SCALPING' || (h.orderId && String(h.orderId).startsWith('SCALP'))).length;

      const elCntAll = document.getElementById('admin-count-hist-all');
      const elCntDebate = document.getElementById('admin-count-hist-debate');
      const elCntScp = document.getElementById('admin-count-hist-scalping');
      if (elCntAll) elCntAll.textContent = countAll;
      if (elCntDebate) elCntDebate.textContent = countDebate;
      if (elCntScp) {
        elCntScp.textContent = countScalping;
        const scpBtn = elCntScp.closest('button');
        if (scpBtn) scpBtn.style.display = countScalping > 0 ? 'inline-flex' : 'none';
      }

      if (countScalping === 0 && this.selectedStrategyTab === 'SCALPING') {
        this.selectedStrategyTab = 'all';
        const tabWrap = document.getElementById('admin-history-strategy-tabs');
        if (tabWrap) {
          tabWrap.querySelectorAll('.admin-history-tab').forEach(b => {
            b.classList.toggle('active', b.dataset.strategy === 'all');
          });
        }
      }

      // 탭 필터링
      const filter = this.selectedStrategyTab || 'all';
      const filtered = allList.filter(h => {
        if (filter === 'all') return true;
        if (filter === 'DEBATE_RESERVATION') {
          return h.strategyType === 'DEBATE_RESERVATION' || (!h.strategyType && h.type !== 'CUSTOM_STRATEGY' && (!h.orderId || !String(h.orderId).startsWith('SCALP')));
        }
        if (filter === 'SCALPING') {
          return h.strategyType === 'SCALPING' || (h.orderId && String(h.orderId).startsWith('SCALP'));
        }
        return true;
      });

      if (filtered.length === 0) {
        if (emptyCard) emptyCard.style.display = 'flex';
        if (listContainer) listContainer.style.display = 'none';
        return;
      }

      if (emptyCard) emptyCard.style.display = 'none';
      if (listContainer) {
        listContainer.style.display = 'flex';

        let html = '';
        filtered.forEach(it => {
          const isKr = it.market === 'KR' || it.currency === 'KRW';
          const pnlKrw = Number(it.realizedPnlKrw || it.profitKrw || it.realizedPnl) || 0;
          const returnPct = typeof it.returnPct === 'number' ? it.returnPct : parseFloat(it.returnPct) || 0;
          const isWin = pnlKrw > 0;
          const isLoss = pnlKrw < 0;
          const pnlColor = isWin ? '#f87171' : (isLoss ? '#60a5fa' : '#94a3b8');
          const pnlSign = pnlKrw > 0 ? '+' : '';
          const retSign = returnPct > 0 ? '+' : '';

          let stratBadge = '';
          if (it.strategyType === 'SCALPING' || (it.orderId && String(it.orderId).startsWith('SCALP'))) {
            stratBadge = '<span style="font-size: 0.72rem; background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.35); padding: 2px 7px; border-radius: 4px; font-weight: 700;">⚡ 초단타</span>';
          } else {
            stratBadge = '<span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 2px 7px; border-radius: 4px; font-weight: 700;">⚔️ AI 끝장토론</span>';
          }

          const closeTimeStr = it.closedAt ? new Date(it.closedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
          const exitReason = it.reasonTitle || it.exitReason || it.note || '청산 완료';
          const qtyStr = it.totalQuantity || it.quantity || 1;
          const priceStr = it.exitPrice ? `${isKr ? it.exitPrice.toLocaleString() + '원' : '$' + it.exitPrice}` : '';

          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 18px; flex-wrap: wrap; gap: 12px; transition: transform 0.15s ease;">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                ${stratBadge}
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="color: #ffffff; font-size: 1.05rem;">${it.stockName || '-'}</strong>
                    <span style="color: #94a3b8; font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px;">${it.itemCode || ''}</span>
                    <span style="font-size: 0.78rem; color: #cbd5e1;">${qtyStr}주 ${priceStr ? `(${priceStr})` : ''}</span>
                  </div>
                  <div style="color: #64748b; font-size: 0.75rem; margin-top: 3px;">체결일시: ${closeTimeStr}</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 16px; text-align: right;">
                <div>
                  <div style="font-size: 1.15rem; font-weight: 800; color: ${pnlColor};">${pnlSign}${pnlKrw.toLocaleString()}원</div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: ${pnlColor};">${retSign}${returnPct}%</div>
                </div>
                <div style="font-size: 0.8rem; color: #94a3b8; max-width: 220px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; background: rgba(30, 41, 59, 0.5); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);" title="${exitReason}">
                  ${exitReason}
                </div>
              </div>
            </div>
          `;
        });
        listContainer.innerHTML = html;
      }
    }
  };

  window.StockTradingAdminView = StockTradingAdminView;
})(window);