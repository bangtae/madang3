// app/views/stockCouncilView.js - AI 주식 심의실 화면 렌더러
window.StockCouncilView = {
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.bindEvents();
  },

  bindEvents() {
    // 탭 클릭 이벤트
    const tabBtns = document.querySelectorAll('.council-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const agent = e.currentTarget.getAttribute('data-agent');
        window.StockCouncilModel.selectedAgent = agent;
        
        tabBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        this.renderCardList();
      });
    });

    // 검색 입력 이벤트
    const searchInput = document.getElementById('input-council-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.StockCouncilModel.searchQuery = e.target.value;
        this.renderCardList();
      });
    }

    // 모달 닫기
    const modalCloseBtn = document.getElementById('stock-council-modal-close');
    const modalOverlay = document.getElementById('stock-council-modal');
    if (modalCloseBtn && modalOverlay) {
      modalCloseBtn.addEventListener('click', () => {
        modalOverlay.classList.add('hidden');
      });
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.classList.add('hidden');
        }
      });
    }

    // 5인 종합 비교 모달 닫기
    const compareCloseBtn = document.getElementById('stock-council-compare-modal-close');
    const compareOverlay = document.getElementById('stock-council-comparison-modal');
    if (compareCloseBtn && compareOverlay) {
      compareCloseBtn.addEventListener('click', () => {
        compareOverlay.classList.add('hidden');
      });
      compareOverlay.addEventListener('click', (e) => {
        if (e.target === compareOverlay) {
          compareOverlay.classList.add('hidden');
        }
      });
    }
  },

  async render() {
    this.init();
    await window.StockCouncilModel.loadReports();
    this.renderStats();
    this.renderConsensusSection();
    this.renderCardList();
  },

  renderStats() {
    const stats = window.StockCouncilModel.getAgentStats();
    const countAllEl = document.getElementById('badge-count-council-all');
    if (countAllEl) countAllEl.textContent = stats.all;

    const countDankal = document.getElementById('badge-count-council-dankal');
    if (countDankal) countDankal.textContent = stats.sub_stock_dankal;

    const countGrowth = document.getElementById('badge-count-council-growth');
    if (countGrowth) countGrowth.textContent = stats.sub_stock_growth;

    const countCautious = document.getElementById('badge-count-council-cautious');
    if (countCautious) countCautious.textContent = stats.sub_stock_cautious;

    const countTechnical = document.getElementById('badge-count-council-technical');
    if (countTechnical) countTechnical.textContent = stats.sub_stock_technical;

    const countJurini = document.getElementById('badge-count-council-jurini');
    if (countJurini) countJurini.textContent = stats.sub_stock_jurini;

    // Header summary badge
    const headerBadge = document.getElementById('council-latest-briefing');
    if (headerBadge && window.StockCouncilModel.items.length > 0) {
      const latest = window.StockCouncilModel.items[0];
      headerBadge.innerHTML = `🔥 최근 발굴: <b>${latest.stockName}</b> (${latest.persona} · ${latest.time})`;
    }
  },

  // 🏛️ 종목별 5인 심의 종합 합의 매트릭스 렌더링
  renderConsensusSection() {
    const grid = document.getElementById('council-consensus-grid');
    const statsEl = document.getElementById('consensus-summary-stats');
    if (!grid) return;

    const consensusList = window.StockCouncilModel.getConsensusByStock();
    if (statsEl) {
      statsEl.innerHTML = `<span style="font-size: 0.8rem; color: #94a3b8;">심의 종목 <b>${consensusList.length}</b>건 교차 검증 중</span>`;
    }

    if (consensusList.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: #94a3b8;">
          등록된 심의 종목이 없습니다. 상단에서 종목 온디맨드 분석을 요청해보세요.
        </div>
      `;
      return;
    }

    grid.innerHTML = consensusList.map(stock => {
      const radarSvg = this.generateRadarSvg(stock.scores, 220);
      const b = stock.consensusBadge;

      return `
        <div class="consensus-stock-card" data-stock="${this.escapeHtml(stock.stockName)}">
          <div class="consensus-card-header">
            <div class="consensus-stock-info">
              <div class="consensus-stock-name">
                <span>${stock.stockName}</span>
                <span class="consensus-stock-code">${stock.itemCode}</span>
              </div>
              <span style="font-size: 0.72rem; color: #64748b;">최신 심의: ${stock.latestDate} ${stock.latestTime}</span>
            </div>
            <div class="consensus-score-box">
              <span class="consensus-score-val ${b.gradeClass}">${stock.consensusScore}<small style="font-size: 0.85rem; font-weight: normal; color: #94a3b8;">점</small></span>
              <span class="consensus-badge-pill ${b.gradeClass}">
                <span>${b.icon}</span> ${b.label}
              </span>
            </div>
          </div>

          <!-- 5각 SVG 레이더 차트 -->
          <div class="consensus-radar-wrap">
            ${radarSvg}
          </div>

          <!-- 5인 스탠스 요약 미니 바 -->
          <div class="consensus-stances-bar">
            <div class="stance-chip" title="단가 (총괄 CIO): ${stock.scores.dankal}점">
              <span class="chip-icon">⚖️</span>
              <span class="chip-name">단가</span>
              <span class="chip-dot ${stock.stances.dankal}"></span>
            </div>
            <div class="stance-chip" title="성장론자: ${stock.scores.growth}점">
              <span class="chip-icon">🚀</span>
              <span class="chip-name">성장</span>
              <span class="chip-dot ${stock.stances.growth}"></span>
            </div>
            <div class="stance-chip" title="신중론자: ${stock.scores.cautious}점">
              <span class="chip-icon">🛡️</span>
              <span class="chip-name">신중</span>
              <span class="chip-dot ${stock.stances.cautious}"></span>
            </div>
            <div class="stance-chip" title="기술적분석가: ${stock.scores.technical}점">
              <span class="chip-icon">📊</span>
              <span class="chip-name">기술</span>
              <span class="chip-dot ${stock.stances.technical}"></span>
            </div>
            <div class="stance-chip" title="주린이 코칭: ${stock.scores.jurini}점">
              <span class="chip-icon">🐣</span>
              <span class="chip-name">주린이</span>
              <span class="chip-dot ${stock.stances.jurini}"></span>
            </div>
          </div>

          <div class="consensus-card-footer">
            <span class="consensus-reports-count">📄 발행 리포트: <b>${stock.reportCount}</b>건</span>
            <button type="button" class="btn-open-compare">
              🔍 5인 종합 비교 &rarr;
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to cards
    grid.querySelectorAll('.consensus-stock-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const stockName = card.getAttribute('data-stock');
        this.openComparisonModal(stockName);
      });
    });
  },

  // 순수 경량 SVG 5각 레이더 차트 제너레이터
  generateRadarSvg(scores, size = 220) {
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - 34;

    // 5개 축: 단가(상단 -90도), 성장론자(-18도), 기술적분석가(54도), 주린이(126도), 신중론자(198도)
    const axes = [
      { key: 'dankal', label: '단가(CIO)', angle: -90 },
      { key: 'growth', label: '성장론자', angle: -18 },
      { key: 'technical', label: '기술/수급', angle: 54 },
      { key: 'jurini', label: '주린이', angle: 126 },
      { key: 'cautious', label: '신중론자', angle: 198 }
    ];

    const toRad = deg => (deg * Math.PI) / 180;

    // 동심 5각 그리드 (25%, 50%, 75%, 100%)
    const levels = [0.25, 0.5, 0.75, 1.0];
    const gridPolygons = levels.map(lvl => {
      const r = radius * lvl;
      const pts = axes.map(a => {
        const x = cx + r * Math.cos(toRad(a.angle));
        const y = cy + r * Math.sin(toRad(a.angle));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,${lvl === 1 ? '0.15' : '0.06'})" stroke-width="1"/>`;
    }).join('');

    // 축 방사형 라인
    const axisLines = axes.map(a => {
      const x = cx + radius * Math.cos(toRad(a.angle));
      const y = cy + radius * Math.sin(toRad(a.angle));
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="2,2"/>`;
    }).join('');

    // 데이터 폴리곤 계산
    const dataPoints = axes.map(a => {
      const val = Math.max(15, Math.min(100, scores[a.key] || 50));
      const r = radius * (val / 100);
      const x = cx + r * Math.cos(toRad(a.angle));
      const y = cy + r * Math.sin(toRad(a.angle));
      return { x, y, val };
    });

    const polygonPts = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // 데이터 포인트 원
    const pointCircles = dataPoints.map((p, idx) => {
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#38bdf8" stroke="#0f172a" stroke-width="1.5"/>`;
    }).join('');

    // 텍스트 라벨
    const textLabels = axes.map(a => {
      const labelRadius = radius + 20;
      const x = cx + labelRadius * Math.cos(toRad(a.angle));
      const y = cy + labelRadius * Math.sin(toRad(a.angle)) + 3;
      let anchor = 'middle';
      if (Math.abs(a.angle - -90) < 10) anchor = 'middle';
      else if (Math.cos(toRad(a.angle)) > 0.3) anchor = 'start';
      else if (Math.cos(toRad(a.angle)) < -0.3) anchor = 'end';

      const val = scores[a.key] || 75;
      return `
        <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="9.5" font-weight="600" fill="#cbd5e1" font-family="system-ui, sans-serif">
          ${a.label} <tspan fill="#38bdf8" font-size="8.5">(${val})</tspan>
        </text>
      `;
    }).join('');

    const gradId = `radar-grad-${Math.random().toString(36).substring(2, 8)}`;

    return `
      <svg class="radar-chart-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45" />
            <stop offset="100%" stop-color="#818cf8" stop-opacity="0.15" />
          </linearGradient>
        </defs>
        ${gridPolygons}
        ${axisLines}
        <polygon points="${polygonPts}" fill="url(#${gradId})" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round" />
        ${pointCircles}
        ${textLabels}
      </svg>
    `;
  },

  // 🏛️ 종목별 5인 심의 종합 비교 모달 오픈
  openComparisonModal(stockName) {
    const consensusList = window.StockCouncilModel.getConsensusByStock();
    const stock = consensusList.find(s => s.stockName === stockName);
    if (!stock) return;

    const modal = document.getElementById('stock-council-comparison-modal');
    const titleEl = document.getElementById('council-compare-title');
    const badgeEl = document.getElementById('council-compare-badge');
    const bodyEl = document.getElementById('council-compare-body');

    if (titleEl) {
      titleEl.innerHTML = `🏛️ <b>${stock.stockName}</b> (${stock.itemCode}) 5인 심의 종합 비교`;
    }

    if (badgeEl) {
      const b = stock.consensusBadge;
      badgeEl.innerHTML = `
        <span class="consensus-badge-pill ${b.gradeClass}" style="font-size: 0.82rem; padding: 4px 12px;">
          ${b.icon} 종합 합의: <b>${stock.consensusScore}점</b> (${b.label})
        </span>
      `;
    }

    if (bodyEl) {
      const radarSvg = this.generateRadarSvg(stock.scores, 260);

      // 에이전트 목록 매핑
      const agents = [
        { id: 'sub_stock_dankal', name: '단가 (총괄 CIO)', icon: '⚖️', key: 'dankal', theme: 'theme-dankal', desc: '5인 교차 토론 종합 결론' },
        { id: 'sub_stock_growth', name: '성장론자', icon: '🚀', key: 'growth', theme: 'theme-growth', desc: '혁신 테크 고성장 모멘텀' },
        { id: 'sub_stock_cautious', name: '신중론자', icon: '🛡️', key: 'cautious', theme: 'theme-cautious', desc: '안전마진 & 밸류에이션 감사' },
        { id: 'sub_stock_technical', name: '기술적분석가', icon: '📊', key: 'technical', theme: 'theme-technical', desc: '스마트머니 수급 & 지지선' },
        { id: 'sub_stock_jurini', name: '주린이 코칭', icon: '🐣', key: 'jurini', theme: 'theme-jurini', desc: '초보자 안심 신호등 가이드' }
      ];

      const columnsHtml = agents.map(ag => {
        const report = stock.reports[ag.id];
        const score = stock.scores[ag.key];
        const stance = stock.stances[ag.key];
        const snippet = stock.snippets[ag.key];

        const stanceLabel = stance === 'bull' ? '🟢 긍정(Bull)' : (stance === 'bear' ? '🔴 경계(Bear)' : '🟡 중립(Neutral)');

        return `
          <div class="compare-agent-col">
            <div class="compare-col-header ${ag.theme}">
              <div class="compare-col-agent-title">
                <span>${ag.icon}</span> ${ag.name}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <span class="compare-col-score">${score}점</span>
                <span style="font-size: 0.72rem; font-weight: 700;">${stanceLabel}</span>
              </div>
            </div>
            <div class="compare-col-body">
              <div class="compare-col-snippet">
                <b>핵심 스탠스:</b><br>${this.escapeHtml(snippet)}
              </div>
              ${report ? `
                <div style="font-size: 0.76rem; color: #94a3b8; line-height: 1.4;">
                  ${this.escapeHtml(report.summary ? report.summary.slice(0, 150) + '...' : report.title)}
                </div>
                <button type="button" class="btn-open-full-report" data-report-id="${report.id}">
                  📄 전문 리포트 열람 &rarr;
                </button>
              ` : `
                <div style="font-size: 0.76rem; color: #64748b; font-style: italic; margin-top: auto; padding: 12px 0; text-align: center;">
                  (해당 에이전트 리포트 대기 중)
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');

      bodyEl.innerHTML = `
        <!-- 상단 개요: 대형 레이더 차트 + 팩트 요약 -->
        <div class="compare-overview-panel">
          <div class="compare-radar-large">
            <span style="font-size: 0.8rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">5각 밸런스 레이더 다이어그램</span>
            ${radarSvg}
          </div>
          <div class="compare-info-col">
            <div>
              <h4 style="margin: 0 0 8px 0; font-size: 1.15rem; color: #f8fafc;">
                🏛️ 5대 에이전트 심의 총평 및 투자 의결
              </h4>
              <p style="margin: 0; font-size: 0.88rem; color: #cbd5e1; line-height: 1.6;">
                종목 <b>${stock.stockName}</b>에 대한 5개 에이전트의 종합 합의 점수는 <b>${stock.consensusScore}점</b>으로 <b>[${stock.consensusBadge.label}]</b> 판정이 도출되었습니다. 
                각 에이전트의 핵심 관점(혁신성, 가치안전, 스마트머니 수급, 초보자 안정성)의 교차 분석을 바탕으로 최적의 분할 매매 전략을 수립하세요.
              </p>
            </div>
            <div class="compare-facts-grid">
              <div class="compare-fact-item">
                <div class="compare-fact-label">💵 기준 주가</div>
                <div class="compare-fact-val">${stock.factData.closePrice || '집계 중'}</div>
              </div>
              <div class="compare-fact-item">
                <div class="compare-fact-label">📊 PER</div>
                <div class="compare-fact-val">${stock.factData.per || '-'}</div>
              </div>
              <div class="compare-fact-item">
                <div class="compare-fact-label">📈 PBR</div>
                <div class="compare-fact-val">${stock.factData.pbr || '-'}</div>
              </div>
              <div class="compare-fact-item">
                <div class="compare-fact-label">🏦 기관 순매수</div>
                <div class="compare-fact-val">${stock.factData.organBuy || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 하단 5열 비교 그리드 -->
        <h4 style="margin: 0 0 12px 0; font-size: 1.05rem; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
          <span>⚖️</span> 5대 에이전트 관점별 상세 교차 비교
        </h4>
        <div class="compare-columns-grid">
          ${columnsHtml}
        </div>
      `;

      // 전문 리포트 버튼 클릭 리스너 연결
      bodyEl.querySelectorAll('.btn-open-full-report').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const repId = btn.getAttribute('data-report-id');
          this.openDetailModal(repId);
        });
      });
    }

    if (modal) {
      modal.classList.remove('hidden');
    }
  },

  renderCardList() {
    const container = document.getElementById('council-reports-container');
    if (!container) return;

    const reports = window.StockCouncilModel.getFilteredReports();

    if (reports.length === 0) {
      container.innerHTML = `
        <div class="council-empty-state">
          <div class="empty-icon">📭</div>
          <h4>선택한 조건의 에이전트 리포트가 없습니다</h4>
          <p>상단 온디맨드 검색창에 종목명을 입력하여 5대 에이전트에게 즉시 분석을 요청해보세요.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = reports.map(r => this.createCardHtml(r)).join('');

    // Attach click listeners to cards
    container.querySelectorAll('.council-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        this.openDetailModal(id);
      });
    });
  },

  createCardHtml(r) {
    const agentColorClass = this.getAgentColorClass(r.agentId);
    const gradeBadge = this.formatGradeBadge(r.grade);

    const factBadges = [];
    if (r.factData) {
      if (r.factData.closePrice) factBadges.push(`<span class="fact-pill">💵 ${r.factData.closePrice}</span>`);
      if (r.factData.per) factBadges.push(`<span class="fact-pill">PER: ${r.factData.per}</span>`);
      if (r.factData.pbr) factBadges.push(`<span class="fact-pill">PBR: ${r.factData.pbr}</span>`);
      if (r.factData.organBuy) factBadges.push(`<span class="fact-pill">기관: ${r.factData.organBuy}</span>`);
    }

    return `
      <div class="council-card ${agentColorClass}" data-id="${r.id}">
        <div class="card-top-row">
          <div class="agent-tag ${agentColorClass}">
            <span class="agent-icon">${r.icon || '🤖'}</span>
            <span class="agent-name">${r.persona}</span>
          </div>
          <span class="report-timestamp">🕒 ${r.date} ${r.time}</span>
        </div>

        <div class="card-stock-header">
          <h3 class="stock-title">${r.stockName} <span class="stock-code">${r.itemCode ? `(${r.itemCode})` : ''}</span></h3>
          ${gradeBadge}
        </div>

        <div class="card-summary">
          ${this.escapeHtml(r.summary || r.title)}
        </div>

        ${factBadges.length > 0 ? `<div class="card-facts">${factBadges.join('')}</div>` : ''}

        <div class="card-footer-row">
          <span class="report-type-badge ${r.isCouncilDebate ? 'debate' : 'persona'}">
            ${r.isCouncilDebate ? '🏛️ 5인 교차토론 합의' : '🎯 전문 독자 분석'}
          </span>
          <button type="button" class="btn-read-report">
            리포트 열람 <span class="arrow">&rarr;</span>
          </button>
        </div>
      </div>
    `;
  },

  getAgentColorClass(agentId) {
    switch (agentId) {
      case 'sub_stock_dankal': return 'theme-dankal';
      case 'sub_stock_growth': return 'theme-growth';
      case 'sub_stock_cautious': return 'theme-cautious';
      case 'sub_stock_technical': return 'theme-technical';
      case 'sub_stock_jurini': return 'theme-jurini';
      default: return 'theme-default';
    }
  },

  formatGradeBadge(grade) {
    if (!grade) return '';
    const clean = grade.replace(/\*\*/g, '').trim();
    let badgeClass = 'badge-neutral';

    if (clean.includes('Buy') || clean.includes('Bull') || clean.includes('Green') || clean.includes('쌍끌이') || clean.includes('강력 매수')) {
      badgeClass = 'badge-bull';
    } else if (clean.includes('Bear') || clean.includes('Red') || clean.includes('위험') || clean.includes('금지')) {
      badgeClass = 'badge-bear';
    } else if (clean.includes('Yellow') || clean.includes('주의') || clean.includes('Neutral')) {
      badgeClass = 'badge-neutral';
    }

    return `<span class="council-grade-badge ${badgeClass}">${this.escapeHtml(clean)}</span>`;
  },

  openDetailModal(reportId) {
    const report = window.StockCouncilModel.getReportById(reportId);
    if (!report) return;

    const modal = document.getElementById('stock-council-modal');
    const headerTitle = document.getElementById('council-modal-stock-title');
    const headerAgent = document.getElementById('council-modal-agent-badge');
    const bodyContent = document.getElementById('council-modal-body');

    if (headerTitle) {
      headerTitle.textContent = `${report.stockName} (${report.itemCode || '리포트'})`;
    }
    if (headerAgent) {
      headerAgent.className = `agent-tag ${this.getAgentColorClass(report.agentId)}`;
      headerAgent.innerHTML = `<span>${report.icon || '🤖'}</span> ${report.persona} · ${report.date} ${report.time}`;
    }
    if (bodyContent) {
      bodyContent.innerHTML = this.renderMarkdown(report.markdown || report.summary || '');
    }

    if (modal) {
      modal.classList.remove('hidden');
    }
  },

  renderMarkdown(md) {
    if (!md) return '';
    let html = this.escapeHtml(md);

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');

    // Horizontal Rule
    html = html.replace(/^---$/gim, '<hr class="md-hr" />');

    // Lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="md-li">$1</li>');
    html = html.replace(/(<li class="md-li">[\s\S]*?<\/li>)/gm, '<ul class="md-ul">$1</ul>');

    // Paragraphs / line breaks
    html = html.replace(/\n\n/g, '<br><br>');

    return `<div class="markdown-body">${html}</div>`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
