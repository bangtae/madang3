// app/views/bloggerNewsView.js - 방태 데일리 뉴스요약 (Blogger API v3) 뷰 모듈
(function(window) {
  'use strict';

  const BloggerNewsView = {
    allPosts: [],
    currentLabel: 'ALL',
    searchKeyword: '',
    isLoading: false,
    initialized: false,
    isConnected: false,

    init() {
      if (this.initialized) return;
      this.initialized = true;

      // 새로고침 버튼
      const refreshBtn = document.getElementById('btn-blogger-news-refresh');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.loadPosts(true);
        });
      }

      // 검색 인풋
      const searchInput = document.getElementById('blogger-news-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchKeyword = (e.target.value || '').trim().toLowerCase();
          this.applyFilterAndRender();
        });
      }

      // Google 로그인 / 연동 버튼
      const googleLoginBtn = document.getElementById('btn-blogger-google-login');
      if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
          this.startGoogleOAuth();
        });
      }

      // 수동 코드 토글 버튼
      const toggleCodeBtn = document.getElementById('btn-blogger-toggle-code');
      const manualCodeWrap = document.getElementById('blogger-manual-code-wrap');
      if (toggleCodeBtn && manualCodeWrap) {
        toggleCodeBtn.addEventListener('click', () => {
          const isHidden = manualCodeWrap.style.display === 'none';
          manualCodeWrap.style.display = isHidden ? 'block' : 'none';
          toggleCodeBtn.textContent = isHidden ? '▲ 입력창 닫기' : '🔑 승인 코드 직접 입력 (폴백)';
        });
      }

      // 수동 코드 제출 버튼
      const submitCodeBtn = document.getElementById('btn-blogger-submit-code');
      const codeInput = document.getElementById('blogger-oauth-code-input');
      if (submitCodeBtn && codeInput) {
        submitCodeBtn.addEventListener('click', async () => {
          const code = codeInput.value.trim();
          if (!code) {
            alert('인증 코드를 입력해주세요.');
            return;
          }
          submitCodeBtn.disabled = true;
          submitCodeBtn.textContent = '등록 중...';
          try {
            const res = await fetch('/api/auth/google/code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/api/auth/google/callback` })
            });
            const data = await res.json();
            if (data.success) {
              if (data.refresh_token) {
                localStorage.setItem('google_blogger_refresh_token', data.refresh_token);
              }
              const toastFn = (window.UiView && window.UiView.showToast) || (window.AppController && window.AppController.showToast);
              if (toastFn) {
                toastFn('🎉 Google OAuth 토큰이 성공적으로 등록되었습니다!', 'success');
              }
              codeInput.value = '';
              if (manualCodeWrap) manualCodeWrap.style.display = 'none';
              await this.checkAuthStatus();
              await this.loadPosts(true);
            } else {
              alert('토큰 발급 실패: ' + (data.error || '알 수 없는 오류'));
            }
          } catch (e) {
            alert('네트워크 오류: ' + e.message);
          } finally {
            submitCodeBtn.disabled = false;
            submitCodeBtn.textContent = '토큰 발급';
          }
        });
      }

      // 태그 칩 클릭 이벤트
      const chipsContainer = document.getElementById('blogger-news-category-chips');
      if (chipsContainer) {
        chipsContainer.addEventListener('click', (e) => {
          const chip = e.target.closest('.stock-blog-chip');
          if (!chip) return;

          chipsContainer.querySelectorAll('.stock-blog-chip').forEach(c => {
            c.classList.remove('active');
            c.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            c.style.background = 'rgba(255, 255, 255, 0.04)';
            c.style.color = '#94a3b8';
            c.style.fontWeight = '500';
          });

          chip.classList.add('active');
          chip.style.borderColor = 'rgba(14, 165, 233, 0.5)';
          chip.style.background = 'rgba(14, 165, 233, 0.15)';
          chip.style.color = '#38bdf8';
          chip.style.fontWeight = '600';

          this.currentLabel = chip.dataset.label || 'ALL';
          this.applyFilterAndRender();
        });
      }

      // URL 파라미터 확인 (콜백 리디렉트 후 토스트 처리)
      this.checkUrlAuthResult();
    },

    checkUrlAuthResult() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashPart = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
      const hashParams = new URLSearchParams(hashPart);

      const auth = searchParams.get('auth') || hashParams.get('auth');
      const rf = searchParams.get('rf') || hashParams.get('rf');
      const msg = searchParams.get('msg') || hashParams.get('msg');

      if (rf) {
        localStorage.setItem('google_blogger_refresh_token', rf);
      }

      const toastFn = (window.UiView && window.UiView.showToast) || (window.AppController && window.AppController.showToast);

      if (auth === 'success') {
        if (toastFn) {
          toastFn('🎉 Google OAuth 인증이 완료되어 Blogger API v3가 활성화되었습니다!', 'success');
        }
        window.history.replaceState({}, document.title, window.location.pathname + '#blogger-news');
        this.checkAuthStatus();
        this.loadPosts(true);
      } else if (auth === 'failed' || auth === 'error') {
        const errMsg = msg || '인증 처리에 실패했습니다.';
        if (toastFn) {
          toastFn('⛔ Google 인증 실패: ' + errMsg, 'danger');
        }
        window.history.replaceState({}, document.title, window.location.pathname + '#blogger-news');
      }
    },

    async startGoogleOAuth() {
      try {
        const redirectUri = `${window.location.origin}/api/auth/google/callback`;
        const res = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
        const data = await res.json();
        if (data.url) {
          // 브라우저 팝업 또는 직접 리디렉트
          window.location.href = data.url;
        } else {
          alert('OAuth URL 생성 실패');
        }
      } catch (e) {
        alert('Google 인증 URL 생성 중 오류: ' + e.message);
      }
    },

    async checkAuthStatus() {
      const badge = document.getElementById('blogger-auth-badge');
      const connectCard = document.getElementById('blogger-oauth-connect-card');
      const clientRf = localStorage.getItem('google_blogger_refresh_token') || '';

      try {
        const headers = clientRf ? { 'X-Google-Refresh-Token': clientRf } : {};
        const res = await fetch('/api/auth/google/status', { headers });
        const data = await res.json();
        this.isConnected = !!(data && data.connected);

        if (badge) {
          if (this.isConnected) {
            badge.textContent = '🟢 Google OAuth 연동됨';
            badge.style.background = 'rgba(34, 197, 94, 0.2)';
            badge.style.color = '#4ade80';
            badge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
          } else {
            badge.textContent = '🟢 실시간 블로그 연동 중';
            badge.style.background = 'rgba(34, 197, 94, 0.2)';
            badge.style.color = '#4ade80';
            badge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
          }
        }

        if (connectCard) {
          connectCard.style.display = (this.isConnected || (this.allPosts && this.allPosts.length > 0)) ? 'none' : 'block';
        }
      } catch (e) {
        console.warn('[BloggerNewsView] Auth status check error:', e);
      }
    },

    async loadPosts(forceRefresh = false) {
      if (this.isLoading) return;
      this.isLoading = true;

      const loadingEl = document.getElementById('blogger-news-loading');
      const emptyEl = document.getElementById('blogger-news-empty');
      const gridEl = document.getElementById('blogger-news-grid');
      const lastSyncEl = document.getElementById('blogger-news-last-sync');
      const totalBadge = document.getElementById('blogger-news-total-badge');
      const refreshBtn = document.getElementById('btn-blogger-news-refresh');

      if (loadingEl) loadingEl.style.display = 'block';
      if (emptyEl) emptyEl.style.display = 'none';
      if (gridEl && this.allPosts.length === 0) gridEl.innerHTML = '';
      if (refreshBtn) {
        refreshBtn.disabled = true;
        const icon = refreshBtn.querySelector('.refresh-icon');
        if (icon) icon.classList.add('spin-animation');
      }

      try {
        const clientRf = localStorage.getItem('google_blogger_refresh_token') || '';
        const headers = clientRf ? { 'X-Google-Refresh-Token': clientRf } : {};
        const url = forceRefresh ? '/api/blogger-posts?refresh=true' : '/api/blogger-posts';
        const res = await fetch(url, { headers });
        const data = await res.json();

        if (data && data.success === false && (!data.items || data.items.length === 0)) {
          // 게시글 로드 실패 및 연동 필요
          this.isConnected = false;
          const connectCard = document.getElementById('blogger-oauth-connect-card');
          if (connectCard) connectCard.style.display = 'block';
          if (emptyEl) {
            emptyEl.style.display = 'block';
            emptyEl.querySelector('p').textContent = 'Google OAuth 연동을 완료하면 Blogger API v3 게시글이 표시됩니다.';
          }
          return;
        }

        const connectCard = document.getElementById('blogger-oauth-connect-card');
        if (connectCard) connectCard.style.display = 'none';

        if (data && Array.isArray(data.items)) {
          this.allPosts = data.items;

          if (totalBadge) {
            totalBadge.textContent = `Blogger API (${data.items.length}건)`;
          }

          if (lastSyncEl) {
            const timeStr = data.lastUpdatedKst || new Date().toLocaleTimeString('ko-KR');
            lastSyncEl.textContent = `동기화: ${timeStr} ${data.cached ? '(캐시)' : '(최신)'}`;
          }

          this.updateCategoryChips(data.items);
          this.applyFilterAndRender();

          if (window.AppController && window.AppController.showToast && forceRefresh) {
            window.AppController.showToast('방태 데일리 뉴스 글이 실시간 갱신되었습니다.', 'success');
          }
        } else {
          throw new Error(data?.error || '게시글 목록을 불러오지 못했습니다.');
        }
      } catch (err) {
        console.error('[BloggerNewsView Error]:', err);
        if (this.allPosts.length === 0 && emptyEl) {
          emptyEl.style.display = 'block';
          emptyEl.querySelector('p').textContent = `오류 발생: ${err.message}`;
        }
        if (window.AppController && window.AppController.showToast) {
          window.AppController.showToast('Blogger 글 조회 실패: ' + err.message, 'error');
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
      const container = document.getElementById('blogger-news-category-chips');
      if (!container) return;

      const labelsSet = new Set();
      items.forEach(it => {
        if (Array.isArray(it.labels)) {
          it.labels.forEach(l => labelsSet.add(l));
        }
      });

      let chipsHtml = `
        <button type="button" class="category-chip ${this.currentLabel === 'ALL' ? 'active' : ''}" data-label="ALL" style="padding: 5px 14px; border-radius: 16px; font-size: 0.82rem; cursor: pointer; border: 1px solid ${this.currentLabel === 'ALL' ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}; background: ${this.currentLabel === 'ALL' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; color: ${this.currentLabel === 'ALL' ? '#38bdf8' : '#94a3b8'}; font-weight: ${this.currentLabel === 'ALL' ? '600' : 'normal'};">
          전체보기 (${items.length})
        </button>
      `;

      labelsSet.forEach(label => {
        const count = items.filter(it => Array.isArray(it.labels) && it.labels.includes(label)).length;
        const isActive = this.currentLabel === label;
        chipsHtml += `
          <button type="button" class="category-chip ${isActive ? 'active' : ''}" data-label="${this.escapeHtml(label)}" style="padding: 5px 14px; border-radius: 16px; font-size: 0.82rem; cursor: pointer; border: 1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}; background: ${isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; color: ${isActive ? '#38bdf8' : '#94a3b8'}; font-weight: ${isActive ? '600' : 'normal'};">
            ${this.escapeHtml(label)} (${count})
          </button>
        `;
      });

      container.innerHTML = chipsHtml;
    },

    applyFilterAndRender() {
      const gridEl = document.getElementById('blogger-news-grid');
      const emptyEl = document.getElementById('blogger-news-empty');
      if (!gridEl) return;

      let filtered = this.allPosts;

      if (this.currentLabel !== 'ALL') {
        filtered = filtered.filter(p => Array.isArray(p.labels) && p.labels.includes(this.currentLabel));
      }

      if (this.searchKeyword) {
        filtered = filtered.filter(p => {
          const t = (p.title || '').toLowerCase();
          const d = (p.description || '').toLowerCase();
          const labelsStr = Array.isArray(p.labels) ? p.labels.join(' ').toLowerCase() : '';
          return t.includes(this.searchKeyword) || d.includes(this.searchKeyword) || labelsStr.includes(this.searchKeyword);
        });
      }

      if (filtered.length === 0) {
        gridEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
      }

      if (emptyEl) emptyEl.style.display = 'none';

      gridEl.innerHTML = filtered.map(post => {
        const labelBadges = (post.labels || ['뉴스요약']).map(l => `
          <span class="badge" style="background: rgba(14, 165, 233, 0.18); color: #38bdf8; border: 1px solid rgba(14, 165, 233, 0.35); font-size: 0.72rem; padding: 2px 7px; border-radius: 6px; font-weight: 600;">
            🏷️ ${this.escapeHtml(l)}
          </span>
        `).join(' ');

        return `
          <div class="stock-blog-card" style="background: rgba(30, 41, 59, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: hidden;"
               onmouseenter="this.style.borderColor='rgba(56, 189, 248, 0.5)'; this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px -5px rgba(0, 0, 0, 0.3)';"
               onmouseleave="this.style.borderColor='rgba(255, 255, 255, 0.08)'; this.style.transform='none'; this.style.boxShadow='none';">
            
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(to bottom, #4285F4, #38bdf8);"></div>

            <div>
              <!-- 상단 메타 -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                  ${labelBadges}
                </div>
                <span style="color: #64748b; font-size: 0.76rem; white-space: nowrap;">
                  🕒 ${this.escapeHtml(post.formattedDate || post.published || '')}
                </span>
              </div>

              <!-- 포스트 제목 -->
              <h3 style="margin: 0 0 10px 0; font-size: 1.05rem; line-height: 1.45; font-weight: 700; color: #f1f5f9;">
                <a href="${this.escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;" onmouseenter="this.style.color='#38bdf8';" onmouseleave="this.style.color='#f1f5f9';">
                  ${this.highlightKeyword(this.escapeHtml(post.title))}
                </a>
              </h3>

              <!-- 본문 요약 발췌 -->
              <p style="color: #94a3b8; font-size: 0.86rem; line-height: 1.55; margin: 0 0 16px 0; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                ${this.highlightKeyword(this.escapeHtml(post.description || ''))}
              </p>
            </div>

            <!-- 하단 액션 영역 -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.06); margin-top: auto;">
              <span style="font-size: 0.78rem; color: #64748b; display: flex; align-items: center; gap: 4px;">
                ✍️ ${this.escapeHtml(post.author || '방태')}
              </span>
              <a href="${this.escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(66, 133, 244, 0.4); color: #60a5fa; background: rgba(66, 133, 244, 0.08); font-weight: 600;" onmouseenter="this.style.background='rgba(66, 133, 244, 0.2)';" onmouseleave="this.style.background='rgba(66, 133, 244, 0.08)';">
                Blogger 원문 보기 ↗
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

  window.BloggerNewsView = BloggerNewsView;
})(window);
