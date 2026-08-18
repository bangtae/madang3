// app/views/uiView.js - UI 렌더링 및 View 관리 모듈

window.UiView = {
  /**
   * 대시보드 통계 카드 및 최근 목록 렌더링
   */
  renderDashboard(apis) {
    const totalEl = document.getElementById('stat-total-apis');
    const catEl = document.getElementById('stat-total-categories');
    const dateEl = document.getElementById('stat-latest-date');
    const recentListEl = document.getElementById('recent-api-list');

    if (totalEl) totalEl.textContent = apis.length;

    const categories = new Set(apis.map(item => item.category));
    if (catEl) catEl.textContent = categories.size;

    if (dateEl) {
      if (apis.length > 0) {
        const latest = apis[0].createdAt ? new Date(apis[0].createdAt).toLocaleDateString() : '-';
        dateEl.textContent = latest;
      } else {
        dateEl.textContent = '-';
      }
    }

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

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[match]);
  }
};
