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
   * API 목록 카드 렌더링
   */
  renderApiCards(apis, onDeleteCallback) {
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
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn-danger-sm btn-delete-api" data-id="${api.id}">삭제</button>
        </div>
      </div>
    `).join('');

    // Delete event binding
    gridEl.querySelectorAll('.btn-delete-api').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        if (id && onDeleteCallback) onDeleteCallback(id);
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
