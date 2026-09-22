// app/views/bookmarkView.js - 크롬 북마크 N단 계층 탐색기 뷰
(function (window) {
  'use strict';

  window.BookmarkView = {
    initialized: false,
    bookmarks: [],
    tree: null,
    currentPath: '전체',
    searchQuery: '',
    collapsedPaths: new Set(),

    init() {
      if (this.initialized) return;
      this.initialized = true;

      // 1. 데이터 로드 (window.PORTAL_DATA_BOOKMARKS 또는 비동기 fetch)
      if (window.PORTAL_DATA_BOOKMARKS) {
        this.loadData(window.PORTAL_DATA_BOOKMARKS);
      } else {
        fetch('data/chromeBookmarks.json')
          .then(res => res.json())
          .then(data => this.loadData(data))
          .catch(err => console.warn('[BookmarkView] Failed to fetch chromeBookmarks.json:', err));
      }

      this.bindEvents();
    },

    loadData(data) {
      if (!data) return;
      this.bookmarks = data.bookmarks || [];
      this.tree = data.tree || null;

      const totalBadge = document.getElementById('bookmark-total-badge');
      if (totalBadge) {
        totalBadge.textContent = `총 ${this.bookmarks.length.toLocaleString()}개`;
      }

      this.render();
    },

    bindEvents() {
      // 1. 검색창 이벤트
      const searchInput = document.getElementById('bookmark-search-input');
      const searchClear = document.getElementById('bookmark-search-clear');

      if (searchInput) {
        let debounceTimer = null;
        searchInput.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          this.searchQuery = val;
          if (searchClear) {
            searchClear.classList.toggle('hidden', !val);
          }
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.renderCards();
          }, 150);
        });
      }

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          if (searchInput) searchInput.value = '';
          this.searchQuery = '';
          searchClear.classList.add('hidden');
          this.renderCards();
        });
      }

      // 2. 전체 접기/펼치기 버튼
      const btnCollapse = document.getElementById('btn-tree-collapse-all');
      if (btnCollapse) {
        btnCollapse.addEventListener('click', () => {
          if (this.collapsedPaths.size === 0) {
            // 모두 접기
            this.collapseAllRecursive(this.tree);
            btnCollapse.textContent = '모두 펼치기';
          } else {
            // 모두 펼치기
            this.collapsedPaths.clear();
            btnCollapse.textContent = '모두 접기';
          }
          this.renderTree();
        });
      }
    },

    collapseAllRecursive(node) {
      if (!node) return;
      if (node.path && node.path !== '전체') {
        this.collapsedPaths.add(node.path);
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(c => this.collapseAllRecursive(c));
      }
    },

    render() {
      this.renderTree();
      this.renderCards();
    },

    /**
     * N단 재귀 폴더 트리 렌더링
     */
    renderTree() {
      const container = document.getElementById('bookmark-tree-container');
      if (!container || !this.tree) return;

      let html = '';

      // 최상단 '전체 북마크' 루트 항목
      const isAllActive = this.currentPath === '전체';
      html += `
        <div class="tree-node-item root-node ${isAllActive ? 'active' : ''}" data-path="전체" style="padding-left: 8px;">
          <span class="tree-node-icon">🏠</span>
          <span class="tree-node-name">전체 북마크</span>
          <span class="tree-node-count">${this.bookmarks.length}</span>
        </div>
      `;

      // 자식 폴더들 재귀 렌더링
      if (Array.isArray(this.tree.children)) {
        html += this.renderSubTree(this.tree.children, 1);
      }

      container.innerHTML = html;

      // 트리 노드 클릭 이벤트 바인딩
      container.querySelectorAll('.tree-node-item').forEach(item => {
        item.addEventListener('click', (e) => {
          // 토글 화살표를 누른 경우 펼침/접힘만 수행
          if (e.target.closest('.tree-toggle-arrow')) {
            const togglePath = item.getAttribute('data-path');
            if (togglePath) {
              if (this.collapsedPaths.has(togglePath)) {
                this.collapsedPaths.delete(togglePath);
              } else {
                this.collapsedPaths.add(togglePath);
              }
              this.renderTree();
            }
            return;
          }

          // 폴더 항목 자체를 누른 경우 해당 폴더 선택
          const path = item.getAttribute('data-path');
          if (path) {
            this.currentPath = path;
            this.render();
          }
        });
      });
    },

    renderSubTree(children, depth) {
      if (!Array.isArray(children) || children.length === 0) return '';
      let html = '';

      for (const node of children) {
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        const isCollapsed = this.collapsedPaths.has(node.path);
        const isActive = this.currentPath === node.path;
        const indentPx = depth * 14 + 6;

        html += `
          <div class="tree-node-row">
            <div class="tree-node-item ${isActive ? 'active' : ''}" data-path="${this.escapeHtml(node.path)}" style="padding-left: ${indentPx}px;">
              ${hasChildren ? `
                <button type="button" class="tree-toggle-arrow ${isCollapsed ? 'collapsed' : 'expanded'}" title="접기/펼치기">
                  ${isCollapsed ? '▶' : '▼'}
                </button>
              ` : `<span class="tree-toggle-spacer"></span>`}
              <span class="tree-node-icon">${isCollapsed ? '📁' : '📂'}</span>
              <span class="tree-node-name" title="${this.escapeHtml(node.name)}">${this.escapeHtml(node.name)}</span>
              <span class="tree-node-count">${node.count}</span>
            </div>
            ${hasChildren && !isCollapsed ? `
              <div class="tree-children-wrap">
                ${this.renderSubTree(node.children, depth + 1)}
              </div>
            ` : ''}
          </div>
        `;
      }
      return html;
    },

    /**
     * 우측 본문 사이트 카드 렌더링
     */
    renderCards() {
      const container = document.getElementById('bookmark-cards-container');
      const breadcrumb = document.getElementById('bookmark-breadcrumb');
      const countEl = document.getElementById('bookmark-current-count');
      if (!container) return;

      let filtered = [];

      // 1. 검색어 필터링
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = this.bookmarks.filter(bm => {
          return (bm.title && bm.title.toLowerCase().includes(q)) ||
                 (bm.url && bm.url.toLowerCase().includes(q)) ||
                 (bm.domain && bm.domain.toLowerCase().includes(q)) ||
                 (bm.folderPath && bm.folderPath.toLowerCase().includes(q));
        });

        if (breadcrumb) {
          breadcrumb.innerHTML = `
            <span class="breadcrumb-item" data-path="전체">🏠 전체</span>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-item active">🔍 검색: "${this.escapeHtml(this.searchQuery)}"</span>
          `;
        }
      } else {
        // 2. 폴더 경로 필터링
        if (this.currentPath === '전체') {
          filtered = this.bookmarks;
          if (breadcrumb) {
            breadcrumb.innerHTML = `<span class="breadcrumb-item active" data-path="전체">🏠 전체 북마크</span>`;
          }
        } else {
          filtered = this.bookmarks.filter(bm => {
            return bm.folderPath === this.currentPath || bm.folderPath.startsWith(this.currentPath + ' > ');
          });

          // Breadcrumb 생성
          if (breadcrumb) {
            const parts = this.currentPath.split(' > ');
            let bHtml = `<span class="breadcrumb-item" data-path="전체">🏠 전체</span>`;
            let running = '';
            for (let i = 0; i < parts.length; i++) {
              const p = parts[i];
              running = running ? `${running} > ${p}` : p;
              bHtml += `<span class="breadcrumb-sep">/</span>`;
              if (i === parts.length - 1) {
                bHtml += `<span class="breadcrumb-item active">${this.escapeHtml(p)}</span>`;
              } else {
                bHtml += `<span class="breadcrumb-item" data-path="${this.escapeHtml(running)}">${this.escapeHtml(p)}</span>`;
              }
            }
            breadcrumb.innerHTML = bHtml;
          }
        }
      }

      if (countEl) {
        countEl.textContent = `${filtered.length.toLocaleString()}개 사이트`;
      }

      // Breadcrumb 클릭 이벤트 바인딩
      if (breadcrumb) {
        breadcrumb.querySelectorAll('.breadcrumb-item[data-path]').forEach(bItem => {
          bItem.addEventListener('click', () => {
            const targetPath = bItem.getAttribute('data-path');
            if (targetPath) {
              this.currentPath = targetPath;
              this.searchQuery = '';
              const searchInput = document.getElementById('bookmark-search-input');
              if (searchInput) searchInput.value = '';
              const searchClear = document.getElementById('bookmark-search-clear');
              if (searchClear) searchClear.classList.add('hidden');
              this.render();
            }
          });
        });
      }

      // 카드 목록 생성
      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="bookmark-empty-box">
            <span style="font-size: 2.2rem; margin-bottom: 8px;">🔍</span>
            <h4>일치하는 북마크 사이트가 없습니다</h4>
            <p>검색어를 변경하거나 다른 폴더를 선택해 보세요.</p>
          </div>
        `;
        return;
      }

      // Google Favicon 서비스 활용: https://www.google.com/s2/favicons?domain=...&sz=32
      container.innerHTML = filtered.map(bm => {
        const faviconUrl = bm.domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bm.domain)}&sz=32` : '';
        return `
          <div class="bookmark-card">
            <div class="bookmark-card-top">
              <div class="bookmark-favicon-wrap">
                ${faviconUrl ? `<img src="${faviconUrl}" alt="" class="bookmark-favicon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><text y=\\'20\\' font-size=\\'20\\'>🌐</text></svg>';" />` : `<span>🌐</span>`}
              </div>
              <div class="bookmark-domain-badge">${this.escapeHtml(bm.domain || '웹사이트')}</div>
              <button type="button" class="btn-copy-bookmark" data-url="${this.escapeHtml(bm.url)}" title="URL 주소 복사">
                📋
              </button>
            </div>
            <h4 class="bookmark-card-title">
              <a href="${this.escapeHtml(bm.url)}" target="_blank" rel="noopener noreferrer" title="${this.escapeHtml(bm.title)}">
                ${this.escapeHtml(bm.title || bm.domain)}
              </a>
            </h4>
            <div class="bookmark-card-folder">
              <span class="folder-tag">📁 ${this.escapeHtml(bm.folderPath || '기본 북마크')}</span>
            </div>
            <div class="bookmark-card-bottom">
              <a href="${this.escapeHtml(bm.url)}" target="_blank" rel="noopener noreferrer" class="btn-open-site">
                사이트 열기 <span>↗</span>
              </a>
            </div>
          </div>
        `;
      }).join('');

      // URL 복사 버튼 이벤트 바인딩
      container.querySelectorAll('.btn-copy-bookmark').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const url = btn.getAttribute('data-url');
          if (url) {
            navigator.clipboard.writeText(url).then(() => {
              if (window.UiView && window.UiView.showToast) {
                window.UiView.showToast('📋 북마크 URL이 클립보드에 복사되었습니다.');
              } else {
                alert('URL이 복사되었습니다: ' + url);
              }
            });
          }
        });
      });
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };
})(window);
