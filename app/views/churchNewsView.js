// app/views/churchNewsView.js - 교회 최신소식 대시보드 뷰

window.ChurchNewsView = {
  currentTab: 'suwon', // 'suwon' | 'gapck'

  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    // 탭 전환 이벤트 위임
    const tabContainer = document.getElementById('church-news-tabs');
    if (tabContainer) {
      tabContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.church-tab-btn');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== this.currentTab) {
          this.currentTab = tab;
          this.updateTabUI();
          this.render();
        }
      });
    }

    // 새로고침 버튼
    const refreshBtn = document.getElementById('btn-church-news-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        const icon = refreshBtn.querySelector('.refresh-icon') || refreshBtn;
        icon.classList.add('spinning');
        refreshBtn.disabled = true;
        try {
          if (window.ChurchNewsModel) {
            await window.ChurchNewsModel.syncWithServer();
            this.render();
          }
        } finally {
          setTimeout(() => {
            icon.classList.remove('spinning');
            refreshBtn.disabled = false;
          }, 600);
        }
      });
    }
  },

  updateTabUI() {
    const tabs = document.querySelectorAll('.church-tab-btn');
    tabs.forEach(t => {
      const isTarget = t.getAttribute('data-tab') === this.currentTab;
      t.classList.toggle('active', isTarget);
      t.style.fontWeight = isTarget ? '700' : '500';
      t.style.background = isTarget ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)';
      t.style.borderColor = isTarget ? '#818cf8' : 'rgba(255, 255, 255, 0.1)';
      t.style.color = isTarget ? '#e0e7ff' : '#94a3b8';
    });
  },

  render() {
    const root = document.getElementById('view-church-news');
    if (!root) return;

    if (!window.ChurchNewsModel) return;
    const model = window.ChurchNewsModel;
    const isSuwon = this.currentTab === 'suwon';
    const currentData = isSuwon ? model.getSuwonData() : model.getGapckData();
    const lastUpdated = model.getLastUpdated();

    // 1. 헤더 및 서브텍스트 갱신
    const updateTimeEl = document.getElementById('church-news-last-updated');
    if (updateTimeEl) {
      updateTimeEl.textContent = `최근 동기화: ${lastUpdated}`;
    }

    const headerSiteNameEl = document.getElementById('church-news-site-name');
    if (headerSiteNameEl) {
      headerSiteNameEl.textContent = currentData.name || (isSuwon ? '수원은혜교회' : '대한예수교장로회 총회');
    }

    const headerSiteDescEl = document.getElementById('church-news-site-desc');
    if (headerSiteDescEl) {
      if (isSuwon) {
        headerSiteDescEl.innerHTML = `<span>👤 ${currentData.pastor || '황유석 담임목사'}</span> &nbsp;|&nbsp; <span>📍 ${currentData.address || '경기 수원시 장안구 대평로 118'}</span>`;
      } else {
        headerSiteDescEl.innerHTML = `<span>🏛️ ${currentData.description || '대한예수교장로회(합동) 총회 본부'}</span> &nbsp;|&nbsp; <span>🌐 gapck.org</span>`;
      }
    }

    const visitSiteBtn = document.getElementById('church-news-visit-site');
    if (visitSiteBtn) {
      visitSiteBtn.href = currentData.mainUrl || (isSuwon ? 'https://www.suwongrace-ch.org' : 'https://gapck.org');
    }

    // 2. 퀵 바로가기 카드 렌더링
    const quickGrid = document.getElementById('church-quick-links-grid');
    if (quickGrid) {
      const links = currentData.quickLinks || [];
      quickGrid.innerHTML = links.map(item => `
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="church-quick-card" style="text-decoration: none;">
          <div class="church-quick-icon">${item.icon || '🔗'}</div>
          <div class="church-quick-info">
            <h4 class="church-quick-title">${item.title}</h4>
            <p class="church-quick-desc">${item.desc || ''}</p>
          </div>
          <span class="church-quick-arrow">↗</span>
        </a>
      `).join('');
    }

    // 3. 최신 소식 목록 렌더링
    const newsFeedContainer = document.getElementById('church-news-feed-list');
    if (newsFeedContainer) {
      const items = currentData.items || [];
      if (items.length === 0) {
        newsFeedContainer.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <p style="font-size: 1.1rem; margin-bottom: 8px;">등록된 최신 소식이 없습니다.</p>
            <p style="font-size: 0.85rem;">우측 상단 [동기화] 버튼을 눌러 최신 소식을 가져와보세요.</p>
          </div>
        `;
      } else {
        newsFeedContainer.innerHTML = items.map(item => `
          <div class="church-feed-item">
            <div class="church-feed-main">
              <div class="church-feed-meta">
                <span class="church-tag">${item.category || '공지'}</span>
                <span class="church-date">${item.date || ''}</span>
              </div>
              <h4 class="church-feed-title">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a>
              </h4>
              ${item.desc ? `<p class="church-feed-desc">${item.desc}</p>` : ''}
            </div>
            <div class="church-feed-action">
              <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                원문 열기 ↗
              </a>
            </div>
          </div>
        `).join('');
      }
    }
  }
};
