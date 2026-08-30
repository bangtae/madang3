// app/views/stockTempView.js - K증시 온도 꺾은선 그래프 및 게시판 뷰 컴포넌트

window.StockTempView = {
  currentPeriod: 'month',
  searchQuery: '',
  selectedTag: '',

  init() {
    this.bindEvents();
    if (window.StockTempModel && typeof window.StockTempModel.subscribeRealtime === 'function') {
      window.StockTempModel.subscribeRealtime();
    }
  },

  bindEvents() {
    // Period filter tabs
    const filterBtns = document.querySelectorAll('.stock-period-tab');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentPeriod = e.currentTarget.dataset.period || 'month';
        this.renderView();
      });
    });

    // Search input
    const searchInput = document.getElementById('input-stock-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderBoardList();
      });
    }

    // Modal Form Submit
    const form = document.getElementById('stock-temp-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Live preview in modal form & bi-directional auto calculation (100 - value)
    const goodInput = document.getElementById('stock-form-good');
    const badInput = document.getElementById('stock-form-bad');
    if (goodInput && badInput) {
      const updatePreview = () => {
        const g = parseInt(goodInput.value, 10) || 0;
        const b = parseInt(badInput.value, 10) || 0;
        const temp = window.StockTempModel.calculateTemp(g, b);
        const status = window.StockTempModel.getTempStatus(temp);
        const previewBadge = document.getElementById('stock-form-temp-preview');
        if (previewBadge) {
          previewBadge.innerHTML = `<span class="badge ${status.class}">${status.emoji} ${temp}℃ (${status.label})</span>`;
        }
      };

      goodInput.addEventListener('input', () => {
        let g = parseInt(goodInput.value, 10);
        if (!isNaN(g)) {
          g = Math.max(0, Math.min(100, g));
          badInput.value = 100 - g;
        }
        updatePreview();
      });

      badInput.addEventListener('input', () => {
        let b = parseInt(badInput.value, 10);
        if (!isNaN(b)) {
          b = Math.max(0, Math.min(100, b));
          goodInput.value = 100 - b;
        }
        updatePreview();
      });
    }

    // Date picker click listener
    const dateInput = document.getElementById('stock-form-date');
    if (dateInput) {
      dateInput.addEventListener('click', (e) => {
        try { if (e.target.showPicker) e.target.showPicker(); } catch (err) {}
      });
    }
  },

  renderView() {
    const rawItems = window.StockTempModel.getFilteredItems(this.currentPeriod);
    const metrics = window.StockTempModel.getMetrics(rawItems);

    this.renderMetrics(metrics);
    this.renderChart(rawItems);
    this.renderBoardList(rawItems);
  },

  /**
   * 상단 통계 카드 렌더링
   */
  renderMetrics(metrics) {
    const todayTempEl = document.getElementById('metric-today-temp');
    const todayStatusEl = document.getElementById('metric-today-status');
    const todayGaugeEl = document.getElementById('metric-today-gauge');
    const ratioGoodEl = document.getElementById('metric-good-ratio');
    const ratioBadEl = document.getElementById('metric-bad-ratio');
    const avgTempEl = document.getElementById('metric-avg-temp');
    const tagsCloudEl = document.getElementById('metric-tags-cloud');

    const todayStatus = window.StockTempModel.getTempStatus(metrics.todayTemp);

    if (todayTempEl) todayTempEl.textContent = `${metrics.todayTemp}℃`;
    if (todayStatusEl) {
      todayStatusEl.innerHTML = `<span class="temp-emoji">${todayStatus.emoji}</span> ${todayStatus.label}`;
      todayStatusEl.style.color = todayStatus.color;
    }
    if (todayGaugeEl) {
      todayGaugeEl.style.width = `${metrics.todayTemp}%`;
      todayGaugeEl.style.backgroundColor = todayStatus.color;
    }

    const totalNews = metrics.goodSum + metrics.badSum;
    const goodPercent = totalNews > 0 ? Math.round((metrics.goodSum / totalNews) * 100) : 50;
    const badPercent = 100 - goodPercent;
    const recordCount = metrics.totalRecords || 0;

    if (ratioGoodEl) ratioGoodEl.innerHTML = `☀️ 호재 ${goodPercent}% <span style="font-size:0.78rem; font-weight:normal; opacity:0.85;" title="등록된 ${recordCount}개 게시물의 호재 수치 총합계">(총합 ${metrics.goodSum}점 / ${recordCount}회)</span>`;
    if (ratioBadEl) ratioBadEl.innerHTML = `🌧️ 악재 ${badPercent}% <span style="font-size:0.78rem; font-weight:normal; opacity:0.85;" title="등록된 ${recordCount}개 게시물의 악재 수치 총합계">(총합 ${metrics.badSum}점 / ${recordCount}회)</span>`;

    const avgStatus = window.StockTempModel.getTempStatus(metrics.avgTemp);
    if (avgTempEl) {
      avgTempEl.innerHTML = `평균 <strong style="color:${avgStatus.color}">${metrics.avgTemp}℃</strong> (${avgStatus.emoji} ${avgStatus.label})`;
    }

    if (tagsCloudEl) {
      if (metrics.topTags.length === 0) {
        tagsCloudEl.innerHTML = '<span class="text-muted" style="font-size: 0.82rem;">등록된 주요 키워드 태그가 없습니다.</span>';
      } else {
        tagsCloudEl.innerHTML = metrics.topTags.map(tag => `
          <button type="button" class="tag-chip ${this.selectedTag === tag ? 'active' : ''}" onclick="window.StockTempView.filterByTag('${tag}')">
            #${tag}
          </button>
        `).join('');
      }
    }
  },

  filterByTag(tag) {
    if (this.selectedTag === tag) {
      this.selectedTag = '';
    } else {
      this.selectedTag = tag;
    }
    this.renderView();
  },

  /**
   * 반응형 SVG 꺾은선 그래프 렌더링 (인터랙티브 툴팁 & 터치 지원)
   */
  renderChart(items) {
    const svgContainer = document.getElementById('stock-chart-svg');
    const tooltipEl = document.getElementById('stock-chart-tooltip');
    if (!svgContainer) return;

    // 차트는 시간순 (과거 -> 최근, 오름차순: sortKey 오름차순)으로 표시
    const sorted = [...items].sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));

    if (sorted.length === 0) {
      svgContainer.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-size="14">☀️ 등록된 K증시 온도 데이터가 없습니다. 상단 [➕ 일일 K증시 온도 등록] 버튼으로 새로 등록해주세요.</text>';
      return;
    }

    const width = 850;
    const height = 260;
    const paddingLeft = 45;
    const paddingRight = 35;
    const paddingTop = 35;
    const paddingBottom = 45;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // 점 위치 계산
    const points = sorted.map((item, index) => {
      const x = sorted.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (index / (sorted.length - 1)) * chartWidth;
      
      const y = paddingTop + (1 - (item.temp / 100)) * chartHeight;
      return { x, y, item };
    });

    // Y축 가이드선 & 라벨
    let svgContent = `
      <defs>
        <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
        <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(245, 158, 11, 0.35)" />
          <stop offset="100%" stop-color="rgba(245, 158, 11, 0.0)" />
        </linearGradient>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    `;

    [0, 25, 50, 75, 100].forEach(val => {
      const yPos = paddingTop + (1 - (val / 100)) * chartHeight;
      svgContent += `
        <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3,3" />
        <text x="${paddingLeft - 8}" y="${yPos + 4}" text-anchor="end" fill="#64748b" font-size="11" font-weight="500">${val}℃</text>
      `;
    });

    // 영역 채우기 경로
    if (points.length > 1) {
      let areaD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        areaD += ` L ${points[i].x} ${points[i].y}`;
      }
      areaD += ` L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
      svgContent += `<path d="${areaD}" fill="url(#chartAreaGrad)" />`;
    }

    // 꺾은선 경로
    if (points.length > 1) {
      let lineD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        lineD += ` L ${points[i].x} ${points[i].y}`;
      }
      svgContent += `<path d="${lineD}" fill="none" stroke="url(#chartLineGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`;
    }

    // 날짜 축 라벨 및 데이터 노드 점
    points.forEach((pt, idx) => {
      const status = window.StockTempModel.getTempStatus(pt.item.temp);
      const dtDisplay = pt.item.datetime || `${pt.item.date} ${pt.item.timePeriod || '오후'}`;
      const dateLabel = dtDisplay.length > 10 ? dtDisplay.slice(5) : dtDisplay.slice(5);

      const showLabel = sorted.length <= 15 || idx % Math.ceil(sorted.length / 10) === 0 || idx === sorted.length - 1;
      if (showLabel) {
        svgContent += `
          <text x="${pt.x}" y="${height - paddingBottom + 20}" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="500">${dateLabel}</text>
        `;
      }

      svgContent += `
        <g class="chart-point-group" data-id="${pt.item.id}" style="cursor: pointer;">
          <circle cx="${pt.x}" cy="${pt.y}" r="8" fill="rgba(15, 23, 42, 0.9)" stroke="${status.color}" stroke-width="3" filter="url(#nodeGlow)" class="chart-point-node" />
          <circle cx="${pt.x}" cy="${pt.y}" r="16" fill="transparent" class="chart-touch-target" />
        </g>
      `;
    });

    svgContainer.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgContainer.innerHTML = svgContent;

    // 차트 인터랙션 바인딩
    const pointGroups = svgContainer.querySelectorAll('.chart-point-group');
    pointGroups.forEach(grp => {
      const itemId = grp.dataset.id;
      const ptData = points.find(p => p.item.id === itemId);
      if (!ptData) return;

      const showTooltip = (evt) => {
        if (!tooltipEl) return;
        const status = window.StockTempModel.getTempStatus(ptData.item.temp);
        const dtStr = ptData.item.datetime || `${ptData.item.date} ${ptData.item.timePeriod || '오후'}`;
        tooltipEl.innerHTML = `
          <div class="tooltip-header">
            <span class="tooltip-date">📅 ${dtStr}</span>
            <span class="badge ${status.class}">${status.emoji} ${ptData.item.temp}℃ (${status.label})</span>
          </div>
          <div class="tooltip-title">${this.escapeHtml(ptData.item.title)}</div>
          <div class="tooltip-ratio">
            <span>☀️ 호재 ${ptData.item.goodCount}건</span>
            <span>vs</span>
            <span>🌧️ 악재 ${ptData.item.badCount}건</span>
          </div>
          <div class="tooltip-action-hint">👆 클릭 시 하단 상세 보고서로 이동</div>
        `;
        tooltipEl.classList.remove('hidden');

        const rect = svgContainer.getBoundingClientRect();
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;

        const rawX = ptData.x * scaleX;
        const rawY = ptData.y * scaleY;

        // 스마트 좌우 경계 영역 이탈 클리핑 방지
        const tooltipWidth = 260;
        const clampedX = Math.max(tooltipWidth / 2 + 10, Math.min(rect.width - (tooltipWidth / 2 + 10), rawX));

        tooltipEl.style.left = `${clampedX}px`;

        // 높은 온도(상단 영역)에서는 툴팁을 점 아래로 배치하여 잘림 완전 방지
        if (rawY < 130) {
          tooltipEl.style.top = `${rawY + 16}px`;
          tooltipEl.style.transform = 'translate(-50%, 0)';
        } else {
          tooltipEl.style.top = `${rawY - 12}px`;
          tooltipEl.style.transform = 'translate(-50%, -100%)';
        }
      };

      const hideTooltip = () => {
        if (tooltipEl) tooltipEl.classList.add('hidden');
      };

      const scrollToCard = () => {
        hideTooltip();
        let cardEl = document.getElementById(`stock-card-${ptData.item.id}`);

        // 필터링으로 인해 해당 카드가 노출되지 않은 경우, 필터 자동 해제 후 카드 노출 보장
        if (!cardEl) {
          this.searchQuery = '';
          this.selectedTag = '';
          const searchInput = document.getElementById('input-stock-search');
          if (searchInput) searchInput.value = '';
          this.renderBoardList();
          cardEl = document.getElementById(`stock-card-${ptData.item.id}`);
        }

        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cardEl.classList.add('highlight-pulse');
          setTimeout(() => cardEl.classList.remove('highlight-pulse'), 2000);
        }
      };

      grp.addEventListener('mouseenter', showTooltip);
      grp.addEventListener('mouseleave', hideTooltip);
      grp.addEventListener('click', scrollToCard);
      grp.addEventListener('touchstart', (e) => {
        showTooltip(e);
        setTimeout(scrollToCard, 600);
      });
    });
  },

  /**
   * 하단 게시판 카드 리스트 렌더링
   */
  renderBoardList(rawItems) {
    const container = document.getElementById('stock-board-list');
    if (!container) return;

    let items = rawItems || window.StockTempModel.getFilteredItems(this.currentPeriod);

    if (this.searchQuery) {
      items = items.filter(item =>
        item.title.toLowerCase().includes(this.searchQuery) ||
        (item.summary && item.summary.toLowerCase().includes(this.searchQuery)) ||
        item.detail.toLowerCase().includes(this.searchQuery) ||
        (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(this.searchQuery)))
      );
    }

    if (this.selectedTag) {
      items = items.filter(item => Array.isArray(item.tags) && item.tags.includes(this.selectedTag));
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 40px 20px; background: rgba(30, 41, 59, 0.4); border-radius: 12px; border: 1px dashed var(--border-color);">
          <span class="empty-icon" style="font-size: 2.5rem; display: block; margin-bottom: 10px;">☀️</span>
          <h4 style="margin: 0 0 8px 0; color: #f8fafc; font-size: 1.1rem;">등록된 K증시 온도 게시물이 없습니다.</h4>
          <p style="margin: 0; color: var(--text-muted); font-size: 0.88rem; line-height: 1.5;">
            새로운 K증시 분위기 정보를 등록하려면 상단의 <strong>'➕ 일일 K증시 온도 등록'</strong> 버튼을 클릭하세요.
          </p>
        </div>
      `;
      return;
    }

    const isGuest = document.body.classList.contains('is-guest-mode');

    container.innerHTML = items.map(item => {
      const status = window.StockTempModel.getTempStatus(item.temp);
      const total = item.goodCount + item.badCount;
      const goodRatio = total > 0 ? Math.round((item.goodCount / total) * 100) : 50;
      const badRatio = 100 - goodRatio;

      const tagsHtml = (item.tags || []).map(tag => `
        <span class="post-tag">#${tag}</span>
      `).join('');

      const dtStr = item.datetime || `${item.date} ${item.timePeriod || '오후'}`;

      return `
        <article class="stock-card" id="stock-card-${item.id}">
          <div class="stock-card-header">
            <div class="card-date-badge">
              <span class="date-icon">📅</span>
              <span class="date-text">${dtStr}</span>
            </div>
            <div class="card-temp-status">
              <span class="badge ${status.class}">
                ${status.emoji} <strong>${item.temp}℃</strong> (${status.label})
              </span>
            </div>
          </div>

          <h3 class="stock-card-title">${this.escapeHtml(item.title)}</h3>

          <!-- ☀️/🌧️ 분할 프로그레스 바 -->
          <div class="news-split-container">
            <div class="news-split-bar">
              <div class="split-good" style="width: ${goodRatio}%;"></div>
              <div class="split-bad" style="width: ${badRatio}%;"></div>
            </div>
            <div class="news-split-labels">
              <span class="good-text">☀️ 호재 ${item.goodCount}건 (${goodRatio}%)</span>
              <span class="bad-text">🌧️ 악재 ${item.badCount}건 (${badRatio}%)</span>
            </div>
          </div>

          <!-- 세부 시장 분석 (접기/펴기) -->
          <details class="stock-card-details">
            <summary class="details-toggle-btn">
              <span>📄 시장 세부 분석글 읽기</span>
              <span class="arrow-icon">▼</span>
            </summary>
            <div class="details-content">
              <p>${this.escapeHtml(item.detail || '상세 내용이 작성되지 않았습니다.')}</p>
            </div>
          </details>

          <div class="stock-card-footer">
            <div class="card-tags-list">
              ${tagsHtml}
            </div>
            <div class="card-admin-actions">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.StockTempView.openEditModal('${item.id}')">✏️ 수정</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="window.StockTempView.deleteRecord('${item.id}')">🗑️ 삭제</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  /**
   * 모달 열기 (신규 등록)
   */
  /**
   * 모달 열기 (신규 등록)
   */
  openCreateModal() {
    if (document.body.classList.contains('is-guest-mode')) {
      if (window.showToast) window.showToast('🔒 게스트 모드에서는 글 등록 권한이 제한됩니다.');
      else alert('게스트 모드에서는 글 등록 권한이 제한됩니다.');
      return;
    }

    const modal = document.getElementById('stock-temp-modal');
    const form = document.getElementById('stock-temp-form');
    const modalTitle = document.getElementById('stock-modal-title');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('stock-form-id').value = '';
    
    // 오늘 날짜 및 현재 시간대(오전/오후) 세팅
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const curHour = now.getHours();

    const dateInput = document.getElementById('stock-form-date');
    if (dateInput) dateInput.value = today;

    const periodSelect = document.getElementById('stock-form-time-period');
    if (periodSelect) periodSelect.value = curHour >= 12 ? '오후' : '오전';

    document.getElementById('stock-form-good').value = 50;
    document.getElementById('stock-form-bad').value = 50;
    
    if (modalTitle) modalTitle.textContent = '➕ 일일 K증시 온도 등록';

    const goodInput = document.getElementById('stock-form-good');
    goodInput.dispatchEvent(new Event('input'));

    modal.classList.remove('hidden');
  },

  /**
   * 모달 열기 (수정)
   */
  openEditModal(id) {
    if (document.body.classList.contains('is-guest-mode')) {
      if (window.showToast) window.showToast('🔒 게스트 모드에서는 글 수정 권한이 제한됩니다.');
      else alert('게스트 모드에서는 글 수정 권한이 제한됩니다.');
      return;
    }

    const modal = document.getElementById('stock-temp-modal');
    const modalTitle = document.getElementById('stock-modal-title');
    const items = window.StockTempModel.getItems();
    const target = items.find(i => i.id === id);
    if (!modal || !target) return;

    document.getElementById('stock-form-id').value = target.id;
    
    const dateInput = document.getElementById('stock-form-date');
    if (dateInput) dateInput.value = target.date;

    const periodSelect = document.getElementById('stock-form-time-period');
    if (periodSelect) {
      periodSelect.value = target.timePeriod || (target.datetime && target.datetime.includes('오전') ? '오전' : '오후');
    }

    document.getElementById('stock-form-title').value = target.title || target.summary || '';
    document.getElementById('stock-form-good').value = target.goodCount;
    document.getElementById('stock-form-bad').value = target.badCount;
    document.getElementById('stock-form-detail').value = target.detail || '';
    document.getElementById('stock-form-tags').value = (target.tags || []).join(', ');

    if (modalTitle) modalTitle.textContent = '✏️ K증시 온도 수정';

    const goodInput = document.getElementById('stock-form-good');
    goodInput.dispatchEvent(new Event('input'));

    modal.classList.remove('hidden');
  },

  closeModal() {
    const modal = document.getElementById('stock-temp-modal');
    if (modal) modal.classList.add('hidden');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    if (document.body.classList.contains('is-guest-mode')) {
      if (window.showToast) window.showToast('🔒 게스트 모드에서는 글 등록 권한이 제한됩니다.');
      return;
    }

    const id = document.getElementById('stock-form-id').value;
    const dateVal = document.getElementById('stock-form-date').value;
    const periodVal = document.getElementById('stock-form-time-period').value;
    const title = document.getElementById('stock-form-title').value.trim();
    const goodCount = parseInt(document.getElementById('stock-form-good').value, 10) || 0;
    const badCount = parseInt(document.getElementById('stock-form-bad').value, 10) || 0;
    const detail = document.getElementById('stock-form-detail').value.trim();
    const tagsRaw = document.getElementById('stock-form-tags').value;

    if (!dateVal || !periodVal || !title) {
      alert('날짜, 시간대, 증시 분위기 요약을 입력해주세요.');
      return;
    }

    const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);

    const savedRecord = await window.StockTempModel.saveRecord({
      id,
      date: dateVal,
      timePeriod: periodVal,
      datetime: `${dateVal} ${periodVal}`,
      title,
      summary: title,
      goodCount,
      badCount,
      detail,
      tags
    });

    this.closeModal();
    this.renderView();
    const tagCount = savedRecord.tags ? savedRecord.tags.length : 0;
    if (window.showToast) window.showToast(`✅ K증시 온도 정보가 등록되었습니다! (${savedRecord.datetime})`);
  },

  async deleteRecord(id) {
    if (document.body.classList.contains('is-guest-mode')) {
      if (window.showToast) window.showToast('🔒 게스트 모드에서는 글 삭제 권한이 제한됩니다.');
      else alert('게스트 모드에서는 글 삭제 권한이 제한됩니다.');
      return;
    }

    if (!confirm('해당 K증시 온도 데이터를 삭제하시겠습니까?')) return;
    await window.StockTempModel.deleteRecord(id);
    this.renderView();
    if (window.showToast) window.showToast('🗑️ 항목이 삭제되었습니다.');
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
