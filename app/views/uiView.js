// app/views/uiView.js - UI 렌더링 및 View 관리 모듈

window.UiView = {
  /**
   * 대시보드 통계 카드 및 최근 목록 렌더링
   */
  renderDashboard(apis, aiModels, aiTerms, sapTerms) {
    const totalEl = document.getElementById('stat-total-apis');
    const totalAiEl = document.getElementById('stat-total-ai');
    const totalAiTermsEl = document.getElementById('stat-total-ai-terms');
    const totalSapTermsEl = document.getElementById('stat-total-sap-terms');
    const totalSapSuiteEl = document.getElementById('stat-total-sap-suite');
    const catEl = document.getElementById('stat-total-categories');
    const recentListEl = document.getElementById('recent-api-list');

    if (totalEl) totalEl.textContent = apis.length;
    if (totalAiEl) {
      const models = (Array.isArray(aiModels) && aiModels.length > 0)
        ? aiModels
        : (window.AiModel ? window.AiModel.getAiModels() : []);
      totalAiEl.textContent = models.length;
    }
    if (totalAiTermsEl) {
      const terms = (Array.isArray(aiTerms) && aiTerms.length > 0)
        ? aiTerms
        : (window.AiTermModel ? window.AiTermModel.getTerms() : []);
      totalAiTermsEl.textContent = terms.length;
    }
    if (totalSapTermsEl) {
      const sTerms = (Array.isArray(sapTerms) && sapTerms.length > 0)
        ? sapTerms
        : (window.SapTermModel ? window.SapTermModel.getTerms() : []);
      totalSapTermsEl.textContent = sTerms.length;
    }
    if (totalSapSuiteEl) {
      const sNews = (window.SapSuiteModel && Array.isArray(window.SapSuiteModel.news))
        ? window.SapSuiteModel.news.length
        : (window.PORTAL_DATA_SAP_NEWS ? window.PORTAL_DATA_SAP_NEWS.length : 0);
      totalSapSuiteEl.textContent = sNews;
    }


    const categories = new Set(apis.map(item => item.category));
    if (catEl) catEl.textContent = categories.size;

    if (recentListEl) {
      if (apis.length === 0) {
        recentListEl.innerHTML = '<p class="text-muted">등록된 API가 없습니다.</p>';
        return;
      }
      recentListEl.innerHTML = apis.slice(0, 3).map(api => `
        <div class="api-card" style="margin-bottom: 12px;">
          <div class="api-card-header">
            <span class="api-card-title">${this.escapeHtml(api.title)}</span>
            <span class="badge-category">${this.escapeHtml(api.category)}</span>
          </div>
          <div class="url-item">
            <span>🔗 Docs:</span>
            <a href="${this.escapeHtml(api.docsUrl)}" target="_blank" rel="noopener">${this.escapeHtml(api.docsUrl)}</a>
          </div>
        </div>
      `).join('');
    }

    this.renderDashStockWidget();
  },

  /**
   * 대시보드 K-증시온도 위젯 렌더링
   */
  renderDashStockWidget() {
    if (!window.StockTempModel) return;
    const items = window.StockTempModel.getItems();
    const statTempEl = document.getElementById('stat-today-stock-temp');
    if (!items || items.length === 0) return;

    // 최신 데이터
    const latest = items[0];
    const status = window.StockTempModel.getTempStatus(latest.temp);

    if (statTempEl) {
      statTempEl.innerHTML = `<span style="color:${status.color}; font-weight: 700;">${status.emoji} ${latest.temp}℃</span>`;
    }

    const dateEl = document.getElementById('dash-stock-date');
    const badgeEl = document.getElementById('dash-stock-temp-badge');
    const headlineEl = document.getElementById('dash-stock-headline');
    const goodBarEl = document.getElementById('dash-stock-gauge-good');
    const badBarEl = document.getElementById('dash-stock-gauge-bad');
    const goodRatioEl = document.getElementById('dash-stock-good-ratio');
    const badRatioEl = document.getElementById('dash-stock-bad-ratio');
    const tagsEl = document.getElementById('dash-stock-tags');

    const dtStr = latest.datetime || `${latest.date} ${latest.timePeriod || '오후'}`;
    if (dateEl) dateEl.textContent = `📅 ${dtStr}`;

    if (badgeEl) {
      badgeEl.innerHTML = `<span class="badge ${status.class}" style="font-size: 0.9rem; padding: 4px 10px;">${status.emoji} <strong>${latest.temp}℃</strong> (${status.label})</span>`;
    }

    if (headlineEl) {
      headlineEl.textContent = latest.title || latest.summary || '최근 K증시 분위기 브리핑';
    }

    const total = (latest.goodCount || 0) + (latest.badCount || 0);
    const goodRatio = total > 0 ? Math.round((latest.goodCount / total) * 100) : 50;
    const badRatio = 100 - goodRatio;

    if (goodBarEl) goodBarEl.style.width = `${goodRatio}%`;
    if (badBarEl) badBarEl.style.width = `${badRatio}%`;

    if (goodRatioEl) goodRatioEl.textContent = `☀️ 호재 ${latest.goodCount}건 (${goodRatio}%)`;
    if (badRatioEl) badRatioEl.textContent = `🌧️ 악재 ${latest.badCount}건 (${badRatio}%)`;

    if (tagsEl) {
      const tags = latest.tags || [];
      tagsEl.innerHTML = tags.slice(0, 5).map(t => `<span style="background: rgba(255,255,255,0.06); color: #94a3b8; font-size: 0.78rem; padding: 2px 8px; border-radius: 4px;">#${this.escapeHtml(t)}</span>`).join('');
    }

    // 클릭 시 투자 > K증시 온도 탭 이동
    const widgetEl = document.getElementById('dash-stock-temp-widget');
    const cardStatEl = document.getElementById('card-stat-stock-temp');

    const navigateToStockTemp = () => {
      const investTopBtn = document.getElementById('nav-top-invest');
      if (investTopBtn) investTopBtn.click();
    };

    if (widgetEl && !widgetEl.dataset.bound) {
      widgetEl.dataset.bound = 'true';
      widgetEl.addEventListener('click', navigateToStockTemp);
    }
    if (cardStatEl && !cardStatEl.dataset.bound) {
      cardStatEl.dataset.bound = 'true';
      cardStatEl.addEventListener('click', navigateToStockTemp);
    }
  },

  /**
   * API 카테고리 필터 옵션 업데이트
   */
  updateCategoryFilter(apis) {
    const filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;

    const categories = Array.from(new Set(apis.map(item => item.category)));
    const currentVal = filterSelect.value;

    filterSelect.innerHTML = '<option value="ALL">전체 카테고리</option>' +
      categories.map(cat => `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`).join('');

    if (categories.includes(currentVal)) {
      filterSelect.value = currentVal;
    }
  },

  /**
   * API 목록 카드 렌더링 (수정/삭제 콜백 처리)
   */
  renderApiCards(apis, onDeleteCallback, onEditCallback) {
    const gridEl = document.getElementById('api-cards-grid');
    if (!gridEl) return;

    if (apis.length === 0) {
      gridEl.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">등록된 API 정보가 없습니다. 상단에서 신규 API를 추가해 보세요!</div>';
      return;
    }

    gridEl.innerHTML = apis.map(api => `
      <div class="api-card" data-id="${api.id}">
        <div class="api-card-header">
          <span class="api-card-title">${this.escapeHtml(api.title)}</span>
          <span class="badge-category">${this.escapeHtml(api.category)}</span>
        </div>
        <div class="api-card-urls">
          <div class="url-item">
            <span>🌐 Service:</span>
            <a href="${this.escapeHtml(api.serviceUrl)}" target="_blank" rel="noopener">${this.escapeHtml(api.serviceUrl)}</a>
          </div>
          <div class="url-item">
            <span>📚 Docs:</span>
            <a href="${this.escapeHtml(api.docsUrl)}" target="_blank" rel="noopener">${this.escapeHtml(api.docsUrl)}</a>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 12px;">
          <button class="btn btn-secondary btn-sm btn-edit-api" data-id="${api.id}">✏️ 수정</button>
          <button class="btn btn-danger btn-sm btn-delete-api" data-id="${api.id}">🗑️ 삭제</button>
        </div>
      </div>
    `).join('');

    // Edit event binding
    gridEl.querySelectorAll('.btn-edit-api').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const targetApi = apis.find(item => item.id === id);
        if (targetApi && onEditCallback) onEditCallback(targetApi);
      });
    });

    // Delete event binding
    gridEl.querySelectorAll('.btn-delete-api').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (id && onDeleteCallback) onDeleteCallback(id);
      });
    });
  },

  /**
   * API 수정 모달 열기 및 값 세팅
   */
  openEditModal(api) {
    const modal = document.getElementById('edit-modal-overlay');
    if (!modal) return;

    document.getElementById('edit-input-id').value = api.id || '';
    document.getElementById('edit-input-title').value = api.title || '';
    document.getElementById('edit-input-service-url').value = api.serviceUrl || '';
    document.getElementById('edit-input-docs-url').value = api.docsUrl || '';
    document.getElementById('edit-input-category').value = api.category || '';

    modal.classList.remove('hidden');
  },

  /**
   * API 수정 모달 닫기
   */
  closeEditModal() {
    const modal = document.getElementById('edit-modal-overlay');
    if (modal) modal.classList.add('hidden');
  },

  /**
   * 카테고리 일괄 변경 모달 열기 및 카테고리 목록 옵션 생성
   */
  openCategoryBatchModal(apis) {
    const modal = document.getElementById('category-batch-modal-overlay');
    const selectEl = document.getElementById('batch-old-category');
    const inputEl = document.getElementById('batch-new-category');
    if (!modal || !selectEl) return;

    const categories = Array.from(new Set(apis.map(item => item.category))).filter(Boolean);

    selectEl.innerHTML = '<option value="">-- 변경할 카테고리 선택 --</option>' +
      categories.map(cat => `<option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>`).join('');

    if (inputEl) inputEl.value = '';
    modal.classList.remove('hidden');
  },

  /**
   * 카테고리 일괄 변경 모달 닫기
   */
  closeCategoryBatchModal() {
    const modal = document.getElementById('category-batch-modal-overlay');
    if (modal) modal.classList.add('hidden');
  },
  /**
   * IP 화이트리스트 목록 렌더링
   */
  renderIpWhitelist(ips, onDeleteIpCallback) {
    const container = document.getElementById('ip-list-container');
    if (!container) return;

    if (!ips || ips.length === 0) {
      container.innerHTML = '<div class="card" style="text-align: center; color: var(--text-muted);">등록된 허용 IP가 없습니다. 상단에서 IP 주소를 등록하세요.</div>';
      return;
    }

    container.innerHTML = ips.map(ip => {
      let tagText = '개별 IP';
      if (ip.includes('*')) {
        tagText = '서브넷 대역';
      } else if (ip === '127.0.0.1' || ip === '::1') {
        tagText = '로컬호스트';
      }

      return `
        <div class="ip-item-card">
          <div class="ip-item-info">
            <span class="ip-address-text">🛡️ ${this.escapeHtml(ip)}</span>
            <span class="ip-type-tag">${tagText}</span>
          </div>
          <button type="button" class="btn-delete-ip" data-ip="${this.escapeHtml(ip)}">🗑️ 삭제</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-delete-ip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetIp = e.currentTarget.getAttribute('data-ip');
        if (targetIp && onDeleteIpCallback) {
          onDeleteIpCallback(targetIp);
        }
      });
    });
  },

  /**
   * IP 블랙리스트 목록 렌더링
   */
  renderIpBlacklist(blockedIps, onUnblockCallback) {
    const container = document.getElementById('ip-blacklist-container');
    if (!container) return;

    if (!blockedIps || blockedIps.length === 0) {
      container.innerHTML = '<div class="card" style="text-align: center; color: var(--text-muted);">차단된 IP가 없습니다.</div>';
      return;
    }

    container.innerHTML = blockedIps.map(ip => `
      <div class="ip-item-card" style="border-color: rgba(239, 68, 68, 0.3);">
        <div class="ip-item-info">
          <span class="ip-address-text">⛔ ${this.escapeHtml(ip)}</span>
          <span class="ip-type-tag danger">차단 대상</span>
        </div>
        <button type="button" class="btn-delete-ip" data-ip="${this.escapeHtml(ip)}">🔓 차단 해제</button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-delete-ip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetIp = e.currentTarget.getAttribute('data-ip');
        if (targetIp && onUnblockCallback) {
          onUnblockCallback(targetIp);
        }
      });
    });
  },

  /**
   * 외부 유입 IP 접속 로그 목록 렌더링
   */
  renderAccessLogs(logs, onAllowCallback, onBlockCallback) {
    const container = document.getElementById('ip-logs-container');
    if (!container) return;

    if (!logs || logs.length === 0) {
      container.innerHTML = '<div class="card" style="text-align: center; color: var(--text-muted);">기록된 외부 접속 로그가 없습니다.</div>';
      return;
    }

    container.innerHTML = logs.map(log => {
      let statusBadge = '<span class="status-badge allowed">✅ 허용됨</span>';
      if (log.status === 'BLOCKED_BLACKLIST') {
        statusBadge = '<span class="status-badge blocked">⛔ 블랙리스트 차단</span>';
      } else if (log.status === 'BLOCKED_UNAUTHORIZED') {
        statusBadge = '<span class="status-badge blocked">🛡️ 미승인 IP 차단</span>';
      }

      return `
        <div class="ip-log-item-card">
          <div class="ip-log-main-info">
            <div class="ip-log-header">
              <span class="ip-address-text">🌐 ${this.escapeHtml(log.ip)}</span>
              ${statusBadge}
            </div>
            <div class="ip-log-meta">
              <span>최근 접속: ${this.escapeHtml(log.lastAccess || log.firstAccess)}</span>
              <span>누적 시도: <strong>${log.count || 1}</strong>회</span>
            </div>
          </div>
          <div class="ip-log-actions">
            <button type="button" class="btn-allow-ip" data-ip="${this.escapeHtml(log.ip)}">✅ 허용</button>
            <button type="button" class="btn-block-ip" data-ip="${this.escapeHtml(log.ip)}">⛔ 차단</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-allow-ip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetIp = e.currentTarget.getAttribute('data-ip');
        if (targetIp && onAllowCallback) {
          onAllowCallback(targetIp);
        }
      });
    });

    container.querySelectorAll('.btn-block-ip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetIp = e.currentTarget.getAttribute('data-ip');
        if (targetIp && onBlockCallback) {
          onBlockCallback(targetIp);
        }
      });
    });
  },

  /**
   * 엑셀 파싱 데이터 미리보기 테이블 렌더링
   * @param {Array} parsedRows 
   * @param {Array} existingApis 
   */
  renderExcelPreview(parsedRows, existingApis = []) {
    const container = document.getElementById('excel-preview-container');
    const tbody = document.getElementById('excel-preview-tbody');
    const summaryBadge = document.getElementById('preview-summary-badge');
    const countNewEl = document.getElementById('preview-count-new');
    const countUpdateEl = document.getElementById('preview-count-update');
    const countErrorEl = document.getElementById('preview-count-error');

    if (!container || !tbody) return;

    if (!parsedRows || parsedRows.length === 0) {
      container.classList.add('hidden');
      return;
    }

    const normalizeUrl = (url) => (url || '').trim().toLowerCase().replace(/\/+$/, '');
    const existingNormUrls = new Set(existingApis.map(item => normalizeUrl(item.serviceUrl)));

    let newCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    const rowsHtml = parsedRows.map((row, idx) => {
      const normServiceUrl = normalizeUrl(row.serviceUrl);
      let statusBadge = '';

      if (!row.serviceUrl) {
        errorCount++;
        statusBadge = '<span class="badge-status-error">⚠️ URL 누락</span>';
      } else if (existingNormUrls.has(normServiceUrl)) {
        updateCount++;
        statusBadge = '<span class="badge-status-update">🔄 기존 업데이트</span>';
      } else {
        newCount++;
        statusBadge = '<span class="badge-status-new">✨ 신규 추가</span>';
      }

      let serviceUrlHtml = '';
      if (row.serviceUrl) {
        const linkTag = row.isServiceUrlHyperlink ? '<span class="badge-link">🔗 엑셀 하이퍼링크 추출</span>' : '';
        const displaySubtext = (row.isServiceUrlHyperlink && row.serviceUrlDisplay && row.serviceUrlDisplay !== row.serviceUrl) 
          ? `<span class="url-subtext">표시 텍스트: "${this.escapeHtml(row.serviceUrlDisplay)}"</span>` 
          : '';

        serviceUrlHtml = `
          <a href="${this.escapeHtml(row.serviceUrl)}" target="_blank" rel="noopener" style="color:#38bdf8;">
            ${this.escapeHtml(row.serviceUrl)}
          </a>
          ${linkTag}
          ${displaySubtext}
        `;
      } else {
        serviceUrlHtml = '<span style="color:#f87171;">(서비스 URL 없음)</span>';
      }

      let docsUrlHtml = '-';
      if (row.docsUrl) {
        const docsLinkTag = row.isDocsUrlHyperlink ? '<span class="badge-link">🔗 하이퍼링크</span>' : '';
        docsUrlHtml = `
          <a href="${this.escapeHtml(row.docsUrl)}" target="_blank" rel="noopener" style="color:#94a3b8;">
            ${this.escapeHtml(row.docsUrl)}
          </a>
          ${docsLinkTag}
        `;
      }

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${this.escapeHtml(row.title || '이름 없음')}</strong></td>
          <td>${serviceUrlHtml}</td>
          <td>${docsUrlHtml}</td>
          <td><span class="badge-category">${this.escapeHtml(row.category || '기타')}</span></td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    if (summaryBadge) summaryBadge.textContent = `총 ${parsedRows.length}건 분석됨`;
    if (countNewEl) countNewEl.textContent = newCount;
    if (countUpdateEl) countUpdateEl.textContent = updateCount;
    if (countErrorEl) countErrorEl.textContent = errorCount;

    container.classList.remove('hidden');
  },

  /**
   * 토스트 알림 메시지 출력
   */
  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  },

  /**
   * AI 모델 카드 목록 렌더링
   */
  renderAiModels(models, onDeleteCallback, onEditCallback) {
    const gridEl = document.getElementById('ai-cards-grid');
    if (!gridEl) return;

    if (!models || models.length === 0) {
      gridEl.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">등록된 AI 모델 정보가 없습니다. 상단에서 URL을 입력하여 AI 모델을 분석 및 등록해 보세요!</div>';
      return;
    }

    gridEl.innerHTML = models.map(model => {
      const tags = Array.isArray(model.tags) ? model.tags : (typeof model.tags === 'string' ? model.tags.split(',') : []);
      const tagsHtml = tags.map(t => `<span class="ai-tag">#${this.escapeHtml(t.trim())}</span>`).join(' ');
      const summaryText = model.summary || model.description || '상세 정보가 제공되는 AI 서비스입니다.';
      const devText = model.developer || model.provider || 'AI 개발사';

      return `
        <div class="api-card ai-card" data-id="${model.id}">
          <div class="api-card-header" style="align-items: flex-start; gap: 8px;">
            <div style="flex:1;">
              <span class="api-card-title" style="font-size: 1.1rem; font-weight: 700; color: #60a5fa;">${this.escapeHtml(model.title)}</span>
              <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">
                🏢 ${this.escapeHtml(devText)} ${model.country ? `<span style="margin-left: 6px; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 4px; color: #cbd5e1;">🌐 ${this.escapeHtml(model.country)}</span>` : ''}
              </div>
            </div>
            <span class="badge-category" style="background: rgba(96, 165, 250, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.3);">${this.escapeHtml(model.category || 'AI')}</span>
          </div>

          <p style="font-size: 0.9rem; color: #e2e8f0; line-height: 1.5; margin: 10px 0;">${this.escapeHtml(summaryText)}</p>

          <div style="background: rgba(30, 41, 59, 0.8); border-left: 3px solid #3b82f6; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #93c5fd; margin-bottom: 4px;">🛠️ 내가 무엇을 만들 수 있나? (Garage 아이디어)</div>
            <div style="font-size: 0.85rem; color: #cbd5e1;">${this.escapeHtml(model.garageIdeas || '만들고 싶은 프로젝트 아이디어를 기록해보세요!')}</div>
          </div>

          ${model.quickStart ? `
          <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px; background: rgba(15, 23, 42, 0.6); padding: 6px 10px; border-radius: 4px;">
            <span style="color:#f59e0b; font-weight:600;">🚀 Quick Start:</span> ${this.escapeHtml(model.quickStart)}
          </div>
          ` : ''}

          ${model.similarModels ? `
          <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px; background: rgba(30, 41, 59, 0.5); padding: 6px 10px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.05);">
            <span style="color:#a7f3d0; font-weight:600;">🔄 유사/경쟁 AI 모델:</span> ${this.escapeHtml(model.similarModels)}
          </div>
          ` : ''}

          <div style="margin-bottom: 8px;">
            <span class="ai-pricing-badge">💰 ${this.escapeHtml(model.pricing || '기본 요금제 / 무료 체험 지원')}</span>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
            ${tagsHtml}
          </div>

          <div class="api-card-urls">
            ${model.serviceUrl ? `
            <div class="url-item">
              <span>🌐 공식 사이트:</span>
              <a href="${this.escapeHtml(model.serviceUrl)}" target="_blank" rel="noopener">${this.escapeHtml(model.serviceUrl)}</a>
            </div>
            ` : ''}
            ${model.docsUrl ? `
            <div class="url-item">
              <span>📚 사용법 문서:</span>
              <a href="${this.escapeHtml(model.docsUrl)}" target="_blank" rel="noopener">${this.escapeHtml(model.docsUrl)}</a>
            </div>
            ` : ''}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 12px;">
            <button class="btn btn-secondary btn-sm btn-edit-ai" data-id="${model.id}">✏️ 수정</button>
            <button class="btn btn-danger btn-sm btn-delete-ai" data-id="${model.id}">🗑️ 삭제</button>
          </div>
        </div>
      `;
    }).join('');

    // 수정 버튼 이벤트 바인딩
    gridEl.querySelectorAll('.btn-edit-ai').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (typeof onEditCallback === 'function') {
          onEditCallback(id);
        }
      });
    });

    // 삭제 버튼 이벤트 바인딩
    gridEl.querySelectorAll('.btn-delete-ai').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('이 AI 모델 정보를 삭제하시겠습니까?')) {
          if (typeof onDeleteCallback === 'function') {
            onDeleteCallback(id);
          }
        }
      });
    });
  },

  /**
   * AI 용어 부모 노드 선택 옵션 동적 세팅 (용어명에 붙은 '(기초개념)' 등 카테고리 텍스트 완전 제거)
   */
  updateParentTermOptions(terms) {
    const parentSelects = [
      document.getElementById('input-term-parent'),
      document.getElementById('edit-term-parent')
    ];

    const categoryKeywords = new Set([
      '기초 개념', '기초개념', '신경망 / 아키텍처', '신경망아키텍처',
      '모델 / 엔진', '모델엔진', '학습 / 기법', '학습기법',
      '응용 / 서비스', '응용서비스', '기타'
    ]);

    // 카테고리 괄호 텍스트(예: '(기초 개념)', '(기초개념)', '(모델 / 엔진)' 등) 제거 헬퍼
    const stripCategoryText = (str) => {
      if (!str) return '';
      return str
        .replace(/\s*\((기초 개념|신경망 \/ 아키텍처|모델 \/ 엔진|학습 \/ 기법|응용 \/ 서비스|기타|기초개념|신경망아키텍처|모델엔진|학습기법|응용서비스)\)/gi, '')
        .trim();
    };

    // 카테고리 단 자체는 선택지에서 제외하고, 용어명에서 괄호 카테고리 텍스트 제거
    const cleanedTermsMap = new Map();
    (terms || []).forEach(t => {
      if (!t.term) return;
      const displayTitle = stripCategoryText(t.term);
      if (!displayTitle || categoryKeywords.has(displayTitle)) return;
      if (!cleanedTermsMap.has(displayTitle)) {
        cleanedTermsMap.set(displayTitle, displayTitle);
      }
    });

    const sortedTermList = Array.from(cleanedTermsMap.values()).sort((a, b) => a.localeCompare(b));

    parentSelects.forEach(select => {
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- 최상위 노드 (부모 없음) --</option>' +
        sortedTermList.map(termTitle => `<option value="${this.escapeHtml(termTitle)}">${this.escapeHtml(termTitle)}</option>`).join('');
      select.value = currentVal;
    });
  },

  /**
   * AI 용어 목록 카드 그리드 렌더링
   */
  renderAiTermCards(terms, onDeleteCallback, onEditCallback) {
    const gridEl = document.getElementById('ai-term-cards-grid');
    if (!gridEl) return;

    if (!terms || terms.length === 0) {
      gridEl.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">등록된 AI 용어 정보가 없습니다. 상단에서 신규 용어를 등록해 보세요!</div>';
      return;
    }

    gridEl.innerHTML = terms.map(t => {
      const parentBadge = t.parentTerm ? `<span class="badge-parent">상위: ${this.escapeHtml(t.parentTerm)}</span>` : '';

      return `
        <div class="api-card term-card" data-id="${t.id}">
          <div class="api-card-header">
            <span class="api-card-title">🧠 ${this.escapeHtml(t.term)}</span>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${parentBadge}
            </div>
          </div>

          <p class="term-card-summary">${this.escapeHtml(t.summary)}</p>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 12px;">
            <button class="btn btn-secondary btn-sm btn-edit-term" data-id="${t.id}">✏️ 수정</button>
            <button class="btn btn-danger btn-sm btn-delete-term" data-id="${t.id}">🗑️ 삭제</button>
          </div>
        </div>
      `;
    }).join('');

    gridEl.querySelectorAll('.btn-edit-term').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const target = terms.find(item => item.id === id);
        if (target && onEditCallback) onEditCallback(target);
      });
    });

    gridEl.querySelectorAll('.btn-delete-term').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('이 AI 용어 정보 및 마인드맵 연관 노드를 삭제하시겠습니까?')) {
          if (id && onDeleteCallback) onDeleteCallback(id);
        }
      });
    });
  },

  openEditTermModal(term, allTerms) {
    const modal = document.getElementById('edit-term-modal-overlay');
    if (!modal) return;

    this.updateParentTermOptions(allTerms);

    document.getElementById('edit-term-id').value = term.id || '';
    document.getElementById('edit-term-name').value = term.term || '';
    document.getElementById('edit-term-parent').value = term.parentTerm || '';
    document.getElementById('edit-term-summary').value = term.summary || '';

    modal.classList.remove('hidden');
  },

  closeEditTermModal() {
    const modal = document.getElementById('edit-term-modal-overlay');
    if (modal) modal.classList.add('hidden');
  },

  showTermDetailPanel(term, allTerms = [], onSelectTermCallback = null) {
    const panel = document.getElementById('mindmap-term-detail');
    if (!panel) return;

    document.getElementById('detail-term-title').textContent = term.term;
    document.getElementById('detail-term-parent').textContent = term.parentTerm ? `상위: ${term.parentTerm}` : '상위: 없음 (최상위)';
    document.getElementById('detail-term-summary').textContent = term.summary || '상세 요약 설명 없음';

    // 🔗 연결된 연관 용어 (상위 부모 + 하위 자식 노드들) 추출
    const connectedContainer = document.getElementById('detail-term-connected-tags');
    if (connectedContainer) {
      connectedContainer.innerHTML = '';

      const normalize = (str) => (str || '').toLowerCase().replace(/[\s\(\)\/_\-\[\]]/g, '');
      const cleanTerm = normalize(term.term);

      const connectedList = [];

      // 1. 상위 (부모) 용어 추가
      if (term.parentTerm) {
        const cleanParent = normalize(term.parentTerm);
        const parentObj = allTerms.find(t => normalize(t.term) === cleanParent || normalize(t.term).includes(cleanParent) || cleanParent.includes(normalize(t.term)));
        if (parentObj && parentObj.id !== term.id) {
          connectedList.push({ type: 'parent', label: `🟣 상위: ${parentObj.term}`, item: parentObj });
        } else {
          connectedList.push({ type: 'parent_str', label: `🟣 상위: ${term.parentTerm}`, item: null });
        }
      }

      // 2. 하위 (자식) 용어들 수집 (이 용어를 부모로 두고 있는 모든 용어들)
      allTerms.forEach(t => {
        if (t.id === term.id) return;
        if (!t.parentTerm) return;

        const normP = normalize(t.parentTerm);
        if (normP === cleanTerm || normP.includes(cleanTerm) || cleanTerm.includes(normP)) {
          // 중복 방지
          if (!connectedList.some(c => c.item && c.item.id === t.id)) {
            connectedList.push({ type: 'child', label: `🟢 하위: ${t.term}`, item: t });
          }
        }
      });

      if (connectedList.length > 0) {
        connectedList.forEach(conn => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `btn-conn-tag ${conn.type}`;
          btn.style.cssText = `
            font-size: 0.78rem;
            padding: 3px 8px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.15);
            background: ${conn.type === 'parent' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(56, 189, 248, 0.2)'};
            color: ${conn.type === 'parent' ? '#c4b5fd' : '#7dd3fc'};
            cursor: ${conn.item ? 'pointer' : 'default'};
            transition: all 0.2s ease;
          `;
          btn.textContent = conn.label;

          if (conn.item) {
            btn.addEventListener('click', () => {
              if (onSelectTermCallback) {
                onSelectTermCallback(conn.item);
              }
            });
            btn.addEventListener('mouseenter', () => {
              btn.style.transform = 'scale(1.05)';
              btn.style.borderColor = '#f472b6';
            });
            btn.addEventListener('mouseleave', () => {
              btn.style.transform = 'scale(1)';
              btn.style.borderColor = 'rgba(255,255,255,0.15)';
            });
          }

          connectedContainer.appendChild(btn);
        });
      } else {
        connectedContainer.innerHTML = '<span style="color: #94a3b8; font-size: 0.8rem;">연결된 상위/하위 연관 용어가 없습니다.</span>';
      }
    }

    panel.classList.remove('hidden');
  },

  hideTermDetailPanel() {
    const panel = document.getElementById('mindmap-term-detail');
    if (panel) panel.classList.add('hidden');
  },

  /**
   * SAP 용어 부모 노드 선택 옵션 동적 세팅
   */
  updateSapParentTermOptions(terms) {
    const parentSelects = [
      document.getElementById('input-sap-term-parent'),
      document.getElementById('edit-sap-term-parent')
    ];

    const categoryKeywords = new Set([
      '모듈 / 코어', '모듈코어', '개발 / ABAP', '개발ABAP',
      '아키텍처 / 플랫폼', '아키텍처플랫폼', '데이터 / 분석', '데이터분석',
      '운영 / 관리', '운영관리', '기타'
    ]);

    const stripCategoryText = (str) => {
      if (!str) return '';
      return str
        .replace(/\s*\((모듈 \/ 코어|개발 \/ ABAP|아키텍처 \/ 플랫폼|데이터 \/ 분석|운영 \/ 관리|기타)\)/gi, '')
        .trim();
    };

    const cleanedTermsMap = new Map();
    (terms || []).forEach(t => {
      if (!t.term) return;
      const displayTitle = stripCategoryText(t.term);
      if (!displayTitle || categoryKeywords.has(displayTitle)) return;
      if (!cleanedTermsMap.has(displayTitle)) {
        cleanedTermsMap.set(displayTitle, displayTitle);
      }
    });

    const sortedTermList = Array.from(cleanedTermsMap.values()).sort((a, b) => a.localeCompare(b));

    parentSelects.forEach(select => {
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '<option value="">-- 최상위 노드 (부모 없음) --</option>' +
        sortedTermList.map(termTitle => `<option value="${this.escapeHtml(termTitle)}">${this.escapeHtml(termTitle)}</option>`).join('');
      select.value = currentVal;
    });
  },

  /**
   * SAP 용어 목록 카드 그리드 렌더링
   */
  renderSapTermCards(terms, onDeleteCallback, onEditCallback) {
    const gridEl = document.getElementById('sap-term-cards-grid');
    if (!gridEl) return;

    if (!terms || terms.length === 0) {
      gridEl.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">등록된 SAP 용어 정보가 없습니다. 상단에서 신규 용어를 등록해 보세요!</div>';
      return;
    }

    gridEl.innerHTML = terms.map(t => {
      const summaryText = t.summary || t.definition || '상세 설명이 제공되는 SAP 용어입니다.';
      const parentBadge = t.parentTerm ? `<span class="badge-parent" style="background: rgba(147, 197, 253, 0.15); color: #93c5fd; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">상위: ${this.escapeHtml(t.parentTerm)}</span>` : '';
      const categoryBadge = t.category ? `<span class="badge-category" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${this.escapeHtml(t.category)}</span>` : '';
      const importanceBadge = t.importance ? `<span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">⭐ ${this.escapeHtml(t.importance)}</span>` : '';

      return `
        <div class="api-card term-card" data-id="${t.id}">
          <div class="api-card-header" style="align-items: flex-start; gap: 8px;">
            <div style="flex:1;">
              <span class="api-card-title" style="font-size: 1.1rem; font-weight: 700; color: #38bdf8;">🏢 ${this.escapeHtml(t.term)}</span>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end;">
              ${categoryBadge}
              ${importanceBadge}
              ${parentBadge}
            </div>
          </div>

          <p class="term-card-summary" style="font-size: 0.9rem; color: #e2e8f0; line-height: 1.5; margin: 10px 0;">${this.escapeHtml(summaryText)}</p>

          ${t.docsUrl ? `
          <div style="margin-top: 6px; margin-bottom: 8px;">
            <a href="${this.escapeHtml(t.docsUrl)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: #60a5fa; text-decoration: none;">🔗 공식 문서 / 가이드 보기 ↗</a>
          </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 12px;">
            <button class="btn btn-secondary btn-sm btn-edit-sap-term" data-id="${t.id}">✏️ 수정</button>
            <button class="btn btn-danger btn-sm btn-delete-sap-term" data-id="${t.id}">🗑️ 삭제</button>
          </div>
        </div>
      `;
    }).join('');

    gridEl.querySelectorAll('.btn-edit-sap-term').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const target = terms.find(item => item.id === id);
        if (target && onEditCallback) onEditCallback(target);
      });
    });

    gridEl.querySelectorAll('.btn-delete-sap-term').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('이 SAP 용어 정보 및 마인드맵 연관 노드를 삭제하시겠습니까?')) {
          if (id && onDeleteCallback) onDeleteCallback(id);
        }
      });
    });
  },

  openEditSapTermModal(term, allTerms) {
    const modal = document.getElementById('edit-sap-term-modal-overlay');
    if (!modal) return;

    this.updateSapParentTermOptions(allTerms);

    document.getElementById('edit-sap-term-id').value = term.id || '';
    document.getElementById('edit-sap-term-name').value = term.term || '';
    document.getElementById('edit-sap-term-category').value = term.category || '모듈 / 코어';
    document.getElementById('edit-sap-term-parent').value = term.parentTerm || '';
    document.getElementById('edit-sap-term-summary').value = term.summary || '';

    modal.classList.remove('hidden');
  },

  closeEditSapTermModal() {
    const modal = document.getElementById('edit-sap-term-modal-overlay');
    if (modal) modal.classList.add('hidden');
  },

  showSapTermDetailPanel(term, allTerms = [], onSelectTermCallback = null) {
    const panel = document.getElementById('sap-mindmap-term-detail');
    if (!panel) return;

    document.getElementById('sap-detail-term-title').textContent = term.term;
    document.getElementById('sap-detail-term-parent').textContent = term.parentTerm ? `상위: ${term.parentTerm}` : '상위: 없음 (최상위)';
    document.getElementById('sap-detail-term-summary').textContent = term.summary || '상세 요약 설명 없음';

    const connectedContainer = document.getElementById('sap-detail-term-connected-tags');
    if (connectedContainer) {
      connectedContainer.innerHTML = '';

      const normalize = (str) => (str || '').toLowerCase().replace(/[\s\(\)\/_\-\[\]]/g, '');
      const cleanTerm = normalize(term.term);

      const connectedList = [];

      if (term.parentTerm) {
        const parentObj = allTerms.find(t => 
          normalize(t.term) === normalize(term.parentTerm) ||
          normalize(t.term).includes(normalize(term.parentTerm))
        );
        connectedList.push({
          type: 'parent',
          label: `⬆️ ${term.parentTerm}`,
          item: parentObj
        });
      }

      allTerms.forEach(t => {
        if (!t.parentTerm) return;
        const cleanParentOfT = normalize(t.parentTerm);
        if (cleanParentOfT === cleanTerm || cleanParentOfT.includes(cleanTerm) || cleanTerm.includes(cleanParentOfT)) {
          if (t.id !== term.id) {
            connectedList.push({
              type: 'child',
              label: `⬇️ ${t.term}`,
              item: t
            });
          }
        }
      });

      if (connectedList.length > 0) {
        connectedList.forEach(conn => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.style.cssText = `
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 3px 10px;
            font-size: 0.78rem;
            color: ${conn.type === 'parent' ? '#c084fc' : '#38bdf8'};
            cursor: ${conn.item ? 'pointer' : 'default'};
            transition: all 0.2s ease;
          `;
          btn.textContent = conn.label;

          if (conn.item) {
            btn.addEventListener('click', () => {
              if (onSelectTermCallback) {
                onSelectTermCallback(conn.item);
              }
            });
            btn.addEventListener('mouseenter', () => {
              btn.style.transform = 'scale(1.05)';
              btn.style.borderColor = '#c084fc';
            });
            btn.addEventListener('mouseleave', () => {
              btn.style.transform = 'scale(1)';
              btn.style.borderColor = 'rgba(255,255,255,0.15)';
            });
          }

          connectedContainer.appendChild(btn);
        });
      } else {
        connectedContainer.innerHTML = '<span style="color: #94a3b8; font-size: 0.8rem;">연결된 상위/하위 연관 용어가 없습니다.</span>';
      }
    }

    panel.classList.remove('hidden');
  },

  hideSapTermDetailPanel() {
    const panel = document.getElementById('sap-mindmap-term-detail');
    if (panel) panel.classList.add('hidden');
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[match]);
  }
};
