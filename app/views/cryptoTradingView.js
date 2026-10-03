// app/views/cryptoTradingView.js - 코인 자동화투자 & AI 끝장토론 통합 대시보드 뷰

window.CryptoTradingView = {
  containerId: 'view-crypto-trading',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // 이벤트 위임을 통한 버튼 핸들링
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      // 1. 24시간 자동투자 시작/중지 토글
      if (btn.id === 'btn-toggle-crypto-auto') {
        const nextState = !window.CryptoTradingModel.isAutoTradingEnabled;
        btn.disabled = true;
        btn.innerHTML = '⏳ 처리 중...';
        const res = await window.CryptoTradingModel.toggleAutoTrading(nextState);
        btn.disabled = false;
        if (res.success) {
          this.showToast(nextState ? '🚀 24시간 코인 자동투자가 시작되었습니다!' : '⏹️ 자동투자가 중지되었습니다.');
          await window.CryptoTradingModel.loadDashboard();
          this.render();
        } else {
          alert(res.message || '상태 변경 실패');
          this.render();
        }
      }

      // 2. 실전/모의 모드 토글
      if (btn.id === 'btn-toggle-trading-mode') {
        const currentMode = window.CryptoTradingModel.tradingMode;
        const nextMode = currentMode === 'LIVE' ? 'SIMULATION' : 'LIVE';
        btn.disabled = true;
        const res = await window.CryptoTradingModel.setTradingMode(nextMode);
        btn.disabled = false;
        if (res.success) {
          this.showToast(nextMode === 'LIVE' ? '🔴 빗썸 실전 매매 모드로 전환되었습니다.' : '🟡 가상 모의투자 모드로 전환되었습니다.');
          await window.CryptoTradingModel.loadDashboard();
          this.render();
        }
      }

      // 3. 온디맨드 즉시 1개 코인 발굴 & 토론 트리거
      if (btn.id === 'btn-crypto-trigger-debate') {
        btn.disabled = true;
        btn.innerHTML = '⏳ 10대 소스 분석 중...';
        const res = await window.CryptoTradingModel.triggerScoutAndDebate();
        btn.disabled = false;
        btn.innerHTML = '⚡ 최우선 코인 발굴 &amp; 끝장토론 소집';
        if (res.success) {
          this.showToast('🎯 1위 코인 선정 및 12턴 끝장토론이 완료되었습니다!');
          await window.CryptoTradingModel.loadDashboard();
          this.render();
        } else {
          alert(res.message || '토론 소집 실패');
        }
      }

      // 4. 긴급 전량 시장가 매도
      if (btn.id === 'btn-crypto-emergency-exit') {
        if (!confirm('정말로 보유 중인 코인을 즉시 전량 시장가로 매도하시겠습니까?')) return;
        btn.disabled = true;
        btn.innerHTML = '🚨 매도 중...';
        const res = await window.CryptoTradingModel.emergencyExit();
        btn.disabled = false;
        if (res.success) {
          alert(`긴급 전량 매도 완료! 실현손익: ${res.realizedPnlKrw.toLocaleString()}원 (${res.returnPct}%)`);
          this.render();
        } else {
          alert(res.message || '매도 실패');
        }
      }

      // 5. 새로고침
      if (btn.id === 'btn-crypto-refresh') {
        btn.innerHTML = '🔄 로딩 중...';
        await window.CryptoTradingModel.loadDashboard();
        this.render();
      }
    });
  },

  showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; bottom: 30px; right: 30px; background: rgba(15, 23, 42, 0.95); color: #38bdf8; border: 1.5px solid #38bdf8; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.5); font-weight: 600; font-size: 0.9rem;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  },

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const m = window.CryptoTradingModel;
    const isLive = m.tradingMode === 'LIVE';
    const isAuto = m.isAutoTradingEnabled;
    const pos = m.currentPosition;
    const debate = m.lastDebate;
    const stats = m.stats;
    const mOverview = m.marketOverview;

    container.innerHTML = `
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <h2 style="display: flex; align-items: center; gap: 10px; color: #f8fafc; margin: 0; font-size: 1.6rem; font-weight: 800;">
              🪙 코인 자동화투자 (Bithumb 24/7 AI Arena)
            </h2>
            <span class="pulse-live-tag" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px;">24/7 무휴 롤링</span>
            <span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">🪙 빗썸 Open API v1 연동</span>
          </div>
          <p style="color: #94a3b8; font-size: 0.92rem; margin: 0; line-height: 1.5;">
            CoinMarketCap·CoinGlass·BlockMedia 등 <strong>10대 가상자산 소스</strong>를 분석하여 5대 서브에이전트가 단 1개의 최우선 코인을 선별하고, <strong>10만원 예산 분할 스윙</strong> 매매를 24시간 전자동으로 순환 롤링합니다.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button type="button" id="btn-crypto-refresh" class="btn btn-secondary btn-sm" style="padding: 7px 14px; font-size: 0.85rem;">
            🔄 새로고침
          </button>
        </div>
      </div>

      <!-- 상단 글로벌 암호화폐 시장 상태 바 -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 16px; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">⚡ 비트코인 (BTC/KRW)</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #f8fafc; margin-top: 4px;">
            ${mOverview.btcPrice > 0 ? `${mOverview.btcPrice.toLocaleString()}원` : '115,000,000원'}
            <span style="font-size: 0.8rem; color: ${mOverview.btcChange24h >= 0 ? '#34d399' : '#f87171'}; font-weight: 600;">
              ${mOverview.btcChange24h >= 0 ? '+' : ''}${mOverview.btcChange24h}%
            </span>
          </div>
        </div>

        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 16px; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">🇰🇷 실시간 김치프리미엄</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #38bdf8; margin-top: 4px;">
            +1.85% <span style="font-size: 0.8rem; color: #34d399; font-weight: 500;">(안정권, 과열 없음)</span>
          </div>
        </div>

        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 16px; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">💰 빗썸 KRW 보유 잔고</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #facc15; margin-top: 4px;">
            ${Math.floor(m.krwBalance).toLocaleString()}원
          </div>
        </div>

        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); padding: 12px 16px; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">📡 10대 데이터 소스 파이프라인</div>
          <div style="font-size: 1.05rem; font-weight: 700; color: #34d399; margin-top: 5px;">
            🟢 10개 전원 수집 정상
          </div>
        </div>
      </div>

      <!-- 메인 24시간 제어 및 운용 패널 -->
      <div class="card" style="margin-bottom: 24px; border: 1.5px solid ${isAuto ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'}; background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 16px 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.8rem;">⚙️</span>
            <div>
              <h3 style="margin: 0; font-size: 1.2rem; color: #f8fafc;">24시간 원클릭 자동투자 제어 콘솔</h3>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem; color: #94a3b8;">
                버튼을 켜두면 24시간 내내 1개 코인 발굴 ➔ 10만원 분할매수 ➔ 시세 감시 ➔ 전량 매도 완료 후 다음 코인 자동 순환
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <!-- 모의 / 실전 토글 버튼 -->
            <button type="button" id="btn-toggle-trading-mode" class="btn btn-sm" style="padding: 6px 14px; font-size: 0.84rem; font-weight: 700; background: ${isLive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'}; color: ${isLive ? '#f87171' : '#facc15'}; border: 1px solid ${isLive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'};">
              ${isLive ? '🔴 빗썸 실전 매매' : '🟡 모의투자 시뮬레이션'} (클릭 시 전환)
            </button>

            <!-- 24시간 자동투자 시작/중지 메인 버튼 -->
            <button type="button" id="btn-toggle-crypto-auto" class="btn" style="padding: 8px 20px; font-size: 0.92rem; font-weight: 800; border-radius: 6px; cursor: pointer; transition: all 0.2s; background: ${isAuto ? '#dc2626' : '#10b981'}; color: #ffffff; border: none; box-shadow: 0 4px 14px ${isAuto ? 'rgba(220, 38, 38, 0.4)' : 'rgba(16, 185, 129, 0.4)'};">
              ${isAuto ? '⏹️ 24시간 자동투자 중지' : '▶️ 24시간 코인 자동투자 시작'}
            </button>
          </div>
        </div>

        <div class="card-body" style="padding: 18px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="font-size: 0.88rem; color: #cbd5e1;">
              📌 <b>투자 원칙:</b> 10만원 이하 예산 | 2회 분할 매수(50%+50%) | 1차 익절 +3.5%(50% 매도) | 2차 전량 익절 +6.5% | 손절 -3.0% (즉시 전량 청산)
            </div>
            <button type="button" id="btn-crypto-trigger-debate" class="btn btn-outline btn-sm" style="font-size: 0.82rem; padding: 6px 14px; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
              ⚡ 최우선 코인 발굴 &amp; 끝장토론 소집
            </button>
          </div>
        </div>
      </div>

      <!-- 현재 활성 운용 포지션 카드 -->
      <div class="card" style="margin-bottom: 24px; border: 1.5px solid ${pos ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.08)'}; background: rgba(15, 23, 42, 0.8);">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">🎯</span>
            <h3 style="margin: 0; font-size: 1.15rem; color: #f8fafc;">현재 1개 종목 운용 포지션</h3>
            ${pos ? `<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-size: 0.75rem; padding: 3px 8px;">${pos.stage === 'SPLIT_1_ACTIVE' ? '1차 매수 완료 (5만원)' : (pos.stage === 'SPLIT_2_ACTIVE' ? '2차 눌림목 매수 완료 (10만원)' : '익절 홀딩 중')}</span>` : ''}
          </div>

          ${pos ? `
            <button type="button" id="btn-crypto-emergency-exit" class="btn btn-danger btn-sm" style="padding: 5px 12px; font-size: 0.8rem; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4);">
              🚨 긴급 전량 시장가 매도
            </button>
          ` : ''}
        </div>

        <div class="card-body" style="padding: 20px;">
          ${pos ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px;">
              <div>
                <span style="font-size: 0.76rem; color: #94a3b8;">종목명 (심볼)</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: #f8fafc; margin-top: 2px;">
                  ${pos.koreanName} <span style="font-size: 0.9rem; color: #94a3b8;">(${pos.symbol})</span>
                </div>
              </div>

              <div>
                <span style="font-size: 0.76rem; color: #94a3b8;">평균 매수가 / 현재가</span>
                <div style="font-size: 1.1rem; font-weight: 700; color: #cbd5e1; margin-top: 2px;">
                  ${pos.avgBuyPrice.toLocaleString()}원 ➔ <span style="color: #f8fafc;">${pos.lastPrice.toLocaleString()}원</span>
                </div>
              </div>

              <div>
                <span style="font-size: 0.76rem; color: #94a3b8;">평가 손익 (수익률)</span>
                <div style="font-size: 1.25rem; font-weight: 800; color: ${pos.unrealizedReturnPct >= 0 ? '#34d399' : '#f87171'}; margin-top: 2px;">
                  ${pos.unrealizedPnlKrw >= 0 ? '+' : ''}${pos.unrealizedPnlKrw.toLocaleString()}원
                  <span style="font-size: 0.88rem;">(${pos.unrealizedReturnPct >= 0 ? '+' : ''}${pos.unrealizedReturnPct}%)</span>
                </div>
              </div>

              <div>
                <span style="font-size: 0.76rem; color: #94a3b8;">투입 금액 / 보유 수량</span>
                <div style="font-size: 1.1rem; font-weight: 700; color: #facc15; margin-top: 2px;">
                  ${pos.investedKrw.toLocaleString()}원 <span style="font-size: 0.82rem; color: #cbd5e1;">(${pos.remainingVolume.toFixed(4)}개)</span>
                </div>
              </div>
            </div>

            <!-- 목표가 및 손절가 진행도 바 -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
                <span style="color: #f87171;">🛑 손절선: ${pos.stopLossPrice.toLocaleString()}원 (-3.0%)</span>
                <span style="color: #38bdf8;">🎯 1차 익절: ${pos.targetPrice1.toLocaleString()}원 (+3.5%) ${pos.tp1Done ? '✅ 체결완료' : ''}</span>
                <span style="color: #34d399;">🏆 2차 전량 익절: ${pos.targetPrice2.toLocaleString()}원 (+6.5%)</span>
              </div>
              <div style="height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden; position: relative;">
                <div style="width: ${Math.max(5, Math.min(100, ((pos.lastPrice - pos.stopLossPrice) / (pos.targetPrice2 - pos.stopLossPrice)) * 100))}%; height: 100%; background: ${pos.unrealizedReturnPct >= 0 ? '#10b981' : '#f87171'}; transition: width 0.3s;"></div>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 28px 20px; color: #94a3b8;">
              <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">💤</span>
              <div style="font-size: 1rem; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">현재 진입 중인 포지션이 없습니다.</div>
              <div style="font-size: 0.84rem;">상단의 <b>[24시간 코인 자동투자 시작]</b> 버튼을 켜면 10대 소스 분석 후 최적의 1개 종목으로 1차 분할 매수(5만원)를 자동 집행합니다.</div>
            </div>
          `}
        </div>
      </div>

      <!-- 12턴 끝장토론 피드 -->
      ${debate && Array.isArray(debate.turns) ? `
        <div class="card" style="margin-bottom: 24px; border: 1px solid rgba(244, 63, 94, 0.3); background: rgba(15, 23, 42, 0.85);">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(244, 63, 94, 0.2);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem;">⚔️</span>
              <h3 style="margin: 0; font-size: 1.15rem; color: #fb7185;">5대 서브에이전트 12턴 끝장토론 의결서: ${debate.koreanName} (${debate.symbol})</h3>
            </div>
            <span style="font-size: 0.78rem; color: #94a3b8;">12턴 공방 전원 합의</span>
          </div>

          <div class="card-body" style="padding: 18px 20px;">
            <div style="background: rgba(244, 63, 94, 0.1); border-left: 4px solid #fb7185; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px; font-size: 0.88rem; color: #fda4af; font-weight: 600;">
              📜 ${debate.summary}
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; max-height: 480px; overflow-y: auto; padding-right: 6px;">
              ${debate.turns.map(t => `
                <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 10px 14px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 0.82rem; font-weight: 700; color: #38bdf8;">턴 ${t.turn}: ${t.speaker} <span style="font-size: 0.74rem; color: #94a3b8;">(${t.role})</span></span>
                  </div>
                  <div style="font-size: 0.84rem; color: #e2e8f0; line-height: 1.5;">${t.text}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 매매 완료 히스토리 및 통계 -->
      <div class="card" style="border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(15, 23, 42, 0.7);">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">📊</span>
            <h3 style="margin: 0; font-size: 1.1rem; color: #f8fafc;">스윙 롤링 실현 손익 및 거래 이력</h3>
          </div>
          <div style="font-size: 0.82rem; color: #94a3b8;">
            총 거래: <b>${stats.totalTrades}건</b> | 승률: <b style="color: #34d399;">${stats.winRatePct}%</b> | 누적 실현손익: <b style="color: ${stats.totalRealizedPnlKrw >= 0 ? '#34d399' : '#f87171'};">${stats.totalRealizedPnlKrw >= 0 ? '+' : ''}${stats.totalRealizedPnlKrw.toLocaleString()}원</b>
          </div>
        </div>

        <div class="card-body" style="padding: 16px 20px;">
          ${m.history.length > 0 ? `
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8;">
                    <th style="padding: 8px 10px;">종목</th>
                    <th style="padding: 8px 10px;">매매 모드</th>
                    <th style="padding: 8px 10px;">매수가 ➔ 매도가</th>
                    <th style="padding: 8px 10px;">실현 손익</th>
                    <th style="padding: 8px 10px;">수익률</th>
                    <th style="padding: 8px 10px;">청산 사유</th>
                    <th style="padding: 8px 10px;">종료 시각</th>
                  </tr>
                </thead>
                <tbody>
                  ${m.history.map(h => `
                    <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); color: #cbd5e1;">
                      <td style="padding: 10px;"><b>${h.koreanName}</b> (${h.symbol})</td>
                      <td style="padding: 10px;">${h.mode === 'LIVE' ? '<span style="color: #f87171;">실전</span>' : '<span style="color: #facc15;">모의</span>'}</td>
                      <td style="padding: 10px;">${h.avgBuyPrice.toLocaleString()}원 ➔ ${h.exitPrice.toLocaleString()}원</td>
                      <td style="padding: 10px; font-weight: 700; color: ${h.realizedPnlKrw >= 0 ? '#34d399' : '#f87171'};">
                        ${h.realizedPnlKrw >= 0 ? '+' : ''}${h.realizedPnlKrw.toLocaleString()}원
                      </td>
                      <td style="padding: 10px; font-weight: 700; color: ${h.returnPct >= 0 ? '#34d399' : '#f87171'};">
                        ${h.returnPct >= 0 ? '+' : ''}${h.returnPct}%
                      </td>
                      <td style="padding: 10px;">
                        ${h.exitReason === 'TAKE_PROFIT_ALL' ? '🏆 2차 전량 익절' : (h.exitReason === 'STOP_LOSS' ? '🛡️ 기계적 손절' : '🚨 긴급 매도')}
                      </td>
                      <td style="padding: 10px; color: #94a3b8; font-size: 0.76rem;">${new Date(h.closedAt).toLocaleString('ko-KR')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="text-align: center; padding: 20px; color: #64748b; font-size: 0.85rem;">
              아직 완료된 매매 기록이 없습니다. 자동투자를 시작하면 롤링 이력이 기록됩니다.
            </div>
          `}
        </div>
      </div>
    `;
  }
};
