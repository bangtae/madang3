// app/views/stockBlogView.js - 배고픈투자씨 데일리 증시분위기 네이버 블로그 뷰
(function(window) {
  'use strict';

  const StockBlogView = {
    allPosts: [],
    currentCategory: 'ALL',
    searchKeyword: '',
    isLoading: false,
    initialized: false,

    init() {
      if (this.initialized) return;
      this.initialized = true;

      // 새로고침 버튼
      const refreshBtn = document.getElementById('btn-stock-blog-refresh');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.loadPosts(true);
        });
      }

      // 검색 인풋
      const searchInput = document.getElementById('stock-blog-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchKeyword = (e.target.value || '').trim().toLowerCase();
          this.applyFilterAndRender();
        });
      }

      // 카테고리 칩 컨테이너 이벤트 위임
      const chipsContainer = document.getElementById('stock-blog-category-chips');
      if (chipsContainer) {
        chipsContainer.addEventListener('click', (e) => {
          const chip = e.target.closest('.category-chip');
          if (!chip) return;

          chipsContainer.querySelectorAll('.category-chip').forEach(c => {
            c.classList.remove('active');
            c.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            c.style.background = 'rgba(255, 255, 255, 0.05)';
            c.style.color = '#94a3b8';
            c.style.fontWeight = 'normal';
          });

          chip.classList.add('active');
          chip.style.borderColor = '#38bdf8';
          chip.style.background = 'rgba(56, 189, 248, 0.15)';
          chip.style.color = '#38bdf8';
          chip.style.fontWeight = '600';

          this.currentCategory = chip.dataset.category || 'ALL';
          this.applyFilterAndRender();
        });
      }
    },

    async loadPosts(forceRefresh = false) {
      if (this.isLoading) return;
      this.isLoading = true;

      const loadingEl = document.getElementById('stock-blog-loading');
      const emptyEl = document.getElementById('stock-blog-empty');
      const gridEl = document.getElementById('stock-blog-grid');
      const lastSyncEl = document.getElementById('stock-blog-last-sync');
      const totalBadge = document.getElementById('stock-blog-total-badge');
      const refreshBtn = document.getElementById('btn-stock-blog-refresh');

      if (loadingEl) loadingEl.style.display = 'block';
      if (emptyEl) emptyEl.style.display = 'none';
      if (gridEl && this.allPosts.length === 0) gridEl.innerHTML = '';
      if (refreshBtn) {
        refreshBtn.disabled = true;
        const icon = refreshBtn.querySelector('.refresh-icon');
        if (icon) icon.classList.add('spin-animation');
      }

      try {
        const url = forceRefresh ? '/api/stock-blog?refresh=true' : '/api/stock-blog';
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();

        if (data && Array.isArray(data.items)) {
          this.allPosts = data.items;
          
          if (totalBadge) {
            totalBadge.textContent = `최신 ${data.items.length}건`;
          }

          if (lastSyncEl) {
            const timeStr = data.lastUpdatedKst || new Date().toLocaleTimeString('ko-KR');
            lastSyncEl.textContent = `동기화: ${timeStr} ${data.cached ? '(캐시)' : '(최신)'}`;
          }

          // 카테고리 칩 동적 갱신
          this.updateCategoryChips(data.items);

          // 렌더링
          this.applyFilterAndRender();

          if (window.AppController && window.AppController.showToast) {
            if (forceRefresh) {
              window.AppController.showToast('배고픈투자씨 블로그 최신글이 실시간 동기화되었습니다.', 'success');
            }
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[StockBlogView Error]:', err);
        if (this.allPosts.length === 0 && emptyEl) {
          emptyEl.style.display = 'block';
          emptyEl.querySelector('p').textContent = `데이터를 불러오지 못했습니다: ${err.message}`;
        }
        if (window.AppController && window.AppController.showToast) {
          window.AppController.showToast('블로그 글 조회 실패: ' + err.message, 'error');
        }
      } finally {
        this.isLoading = false;
        if (loadingEl) loadingEl.style.display = 'none';
        if (refreshBtn) {
          refreshBtn.disabled = false;
          const icon = refreshBtn.querySelector('.refresh-icon');
          if (icon) icon.classList.remove('spin-animation');
        }
      }
    },

    updateCategoryChips(items) {
      const container = document.getElementById('stock-blog-category-chips');
      if (!container) return;

      const categories = new Set();
      items.forEach(it => {
        if (it.category) categories.add(it.category);
      });

      let chipsHtml = `
        <button type="button" class="category-chip ${this.currentCategory === 'ALL' ? 'active' : ''}" data-category="ALL" style="padding: 5px 14px; border-radius: 16px; font-size: 0.82rem; cursor: pointer; border: 1px solid ${this.currentCategory === 'ALL' ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}; background: ${this.currentCategory === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; color: ${this.currentCategory === 'ALL' ? '#38bdf8' : '#94a3b8'}; font-weight: ${this.currentCategory === 'ALL' ? '600' : 'normal'};">
          전체보기 (${items.length})
        </button>
      `;

      categories.forEach(cat => {
        const count = items.filter(it => it.category === cat).length;
        const isActive = this.currentCategory === cat;
        chipsHtml += `
          <button type="button" class="category-chip ${isActive ? 'active' : ''}" data-category="${this.escapeHtml(cat)}" style="padding: 5px 14px; border-radius: 16px; font-size: 0.82rem; cursor: pointer; border: 1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}; background: ${isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; color: ${isActive ? '#38bdf8' : '#94a3b8'}; font-weight: ${isActive ? '600' : 'normal'};">
            ${this.escapeHtml(cat)} (${count})
          </button>
        `;
      });

      container.innerHTML = chipsHtml;
    },

    applyFilterAndRender() {
      const gridEl = document.getElementById('stock-blog-grid');
      const emptyEl = document.getElementById('stock-blog-empty');
      if (!gridEl) return;

      let filtered = this.allPosts;

      // 카테고리 필터
      if (this.currentCategory !== 'ALL') {
        filtered = filtered.filter(p => p.category === this.currentCategory);
      }

      // 검색어 필터
      if (this.searchKeyword) {
        filtered = filtered.filter(p => {
          const t = (p.title || '').toLowerCase();
          const d = (p.description || '').toLowerCase();
          const c = (p.category || '').toLowerCase();
          return t.includes(this.searchKeyword) || d.includes(this.searchKeyword) || c.includes(this.searchKeyword);
        });
      }

      if (filtered.length === 0) {
        gridEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
      }

      if (emptyEl) emptyEl.style.display = 'none';

      gridEl.innerHTML = filtered.map((post) => {
        return `
          <div class="stock-blog-card" style="background: rgba(30, 41, 59, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: hidden;"
               onmouseenter="this.style.borderColor='rgba(56, 189, 248, 0.5)'; this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px -5px rgba(0, 0, 0, 0.3)';"
               onmouseleave="this.style.borderColor='rgba(255, 255, 255, 0.08)'; this.style.transform='none'; this.style.boxShadow='none';">
            
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #38bdf8, #0ea5e9);"></div>

            <div>
              <!-- 상단 메타: 카테고리 & 작성일자 -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px;">
                <span class="badge" style="background: rgba(14, 165, 233, 0.18); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.35); font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; font-weight: 600;">
                  🏷️ ${this.escapeHtml(post.category || '증시분위기')}
                </span>
                <span style="color: #64748b; font-size: 0.76rem; white-space: nowrap;">
                  🕒 ${this.escapeHtml(post.formattedDate || post.pubDate || '')}
                </span>
              </div>

              <!-- 포스트 제목 -->
              <h3 style="margin: 0 0 10px 0; font-size: 1.05rem; line-height: 1.45; font-weight: 700; color: #f1f5f9;">
                <a href="${this.escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;" onmouseenter="this.style.color='#38bdf8';" onmouseleave="this.style.color='#f1f5f9';">
                  ${this.highlightKeyword(this.escapeHtml(post.title))}
                </a>
              </h3>

              <!-- 본문 요약 발췌 -->
              <p style="color: #94a3b8; font-size: 0.86rem; line-height: 1.55; margin: 0 0 16px 0; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                ${this.highlightKeyword(this.escapeHtml(post.description || ''))}
              </p>
            </div>

            <!-- 하단 액션 버튼 영역 -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.06); margin-top: auto;">
              <span style="font-size: 0.78rem; color: #64748b; display: flex; align-items: center; gap: 4px;">
                ✍️ ${this.escapeHtml(post.author || '배고픈투자씨')}
              </span>
              <a href="${this.escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; background: rgba(56, 189, 248, 0.08); font-weight: 600;" onmouseenter="this.style.background='rgba(56, 189, 248, 0.2)';" onmouseleave="this.style.background='rgba(56, 189, 248, 0.08)';">
                원문 보기 ↗
              </a>
            </div>
          </div>
        `;
      }).join('');
    },

    highlightKeyword(text) {
      if (!this.searchKeyword) return text;
      try {
        const regex = new RegExp(`(${this.escapeRegex(this.searchKeyword)})`, 'gi');
        return text.replace(regex, '<mark style="background: rgba(234, 179, 8, 0.35); color: #fef08a; padding: 1px 3px; border-radius: 3px;">$1</mark>');
      } catch (e) {
        return text;
      }
    },

    escapeRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  window.StockBlogView = StockBlogView;
})(window);
