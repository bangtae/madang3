// app/views/bookmarkView.js - 크롬 북마크 사이트 분야별(주제별) 분류 탐색기 뷰
(function (window) {
  'use strict';

  window.BookmarkView = {
    initialized: false,
    bookmarks: [],
    currentCategory: 'all',
    searchQuery: '',

    // 10대 핵심 표준 분야 + 기타 + 전체
    CATEGORIES: [
      { id: 'all', name: '전체 사이트', icon: '🌐', desc: '모든 즐겨찾기' },
      { id: 'dev', name: '개발 & IT 기술', icon: '💻', desc: '코딩, 클라우드, API, GitHub' },
      { id: 'ai', name: 'AI & 신기술', icon: '🤖', desc: 'ChatGPT, LLM, 프롬프트, 도구' },
      { id: 'stock', name: '주식 & 투자', icon: '📈', desc: '국내외 증시, 공시, 퀀트, DART' },
      { id: 'crypto', name: '가상화폐', icon: '🪙', desc: '비트코인, 알트코인, 거래소, 온체인' },
      { id: 'realestate', name: '부동산 & 청약', icon: '🏢', desc: '아파트, 실거래가, 청약홈, 경매' },
      { id: 'news', name: '뉴스 & 인사이트', icon: '📰', desc: '포털, 언론, 칼럼, 기술 블로그' },
      { id: 'work', name: '업무 & 생산성', icon: '💼', desc: '협업툴, 노무, 인사, 오피스 문서' },
      { id: 'contents', name: '콘텐츠 & 마케팅', icon: '🎨', desc: '디자인, 영상, SNS, 마케팅 도구' },
      { id: 'life', name: '쇼핑 & 생활 편의', icon: '🛒', desc: '이커머스, 공공기관, 유용한 생활팁' },
      { id: 'study', name: '교육 & 스터디', icon: '📚', desc: '인강, 강의, 자격증, 도서' },
      { id: 'etc', name: '기타 & 유틸리티', icon: '📁', desc: '웹 도구 및 기타 즐겨찾기' }
    ],

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

    /**
     * 북마크 사이트 분야 자동 분류 로직
     */
    classifyBookmark(bm) {
      const f = (bm.folderPath || '').toLowerCase();
      const t = (bm.title || '').toLowerCase();
      const d = (bm.domain || '').toLowerCase();
      const all = `${f} ${t} ${d}`;

      // 1. AI & 신기술
      if (/ai서비스|인공지능/.test(f) || /chatgpt|openai|claude|gemini|anthropic|huggingface|midjourney|generative|perplexity|sora/.test(all)) {
        return 'ai';
      }
      // 2. 개발 & IT 기술
      if (/디벨러퍼|개발/.test(f) || /github|gitlab|stackoverflow|docker|kubernetes|developer|npm|pypi|w3schools|mdn|spring|abap|vscode|console|aws|gcp|azure/.test(all)) {
        return 'dev';
      }
      // 3. 가상화폐
      if (/크립토|가상화폐|비트코인/.test(f) || /crypto|coin|upbit|bithumb|binance|metamask|token|defi|blockchain/.test(all)) {
        return 'crypto';
      }
      // 4. 부동산 & 청약
      if (/릴 에스테이트|부동산|아파트|청약/.test(f) || /hogangnono|asil|부동산|realty|apt|land|zigbang|dabang|applyhome/.test(all)) {
        return 'realestate';
      }
      // 5. 주식 & 투자
      if (/스탁|투자|애낼리시스|파이낸스/.test(f) || /stock|증권|dart|krx|etf|invest|kospi|kosdaq|finance|sec\.gov|fnguide|seekingalpha/.test(all)) {
        return 'stock';
      }
      // 6. 업무 & 생산성
      if (/레이버|노동|노무/.test(f) || /notion|slack|jira|trello|confluence|asana|productivity|monday|workplace/.test(all)) {
        return 'work';
      }
      // 7. 콘텐츠 & 마케팅 & 디자인
      if (/콘텐츠|마케팅|디자인/.test(f) || /design|figma|canva|marketing|advertising|adobe|behance|dribbble|unsplash|youtube/.test(all)) {
        return 'contents';
      }
      // 8. 쇼핑 & 생활 편의
      if (/샤핑|쇼핑|유용한생활/.test(f) || /shopping|coupang|11st|gmarket|naver\.com\/shopping|smartstore|aliexpress|amazon/.test(all)) {
        return 'life';
      }
      // 9. 교육 & 스터디
      if (/스터디|공부|강의|교육/.test(f) || /study|inflearn|udemy|coursera|fastcampus|class101|edx|nomadcoders/.test(all)) {
        return 'study';
      }
      // 10. 뉴스 & 인사이트 & 미디어
      if (/인포|인사이트|미디어|뉴스/.test(f) || /news|media|insight|brunch|medium|naver\.com\/news|daum\.net|hankyung|mk\.co/.test(all)) {
        return 'news';
      }

      return 'etc';
    },

    loadData(data) {
      if (!data) return;
      const rawList = data.bookmarks || [];

      // 모든 북마크에 category 태그 부여
      this.bookmarks = rawList.map(bm => {
        const catId = bm.category || this.classifyBookmark(bm);
        const catObj = this.CATEGORIES.find(c => c.id === catId) || this.CATEGORIES.find(c => c.id === 'etc');
        return {
          ...bm,
          category: catId,
          categoryName: catObj ? catObj.name : '기타'
        };
      });

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
    },

    render() {
      this.renderCategorySidebar();
      this.renderCards();
    },

    /**
     * 좌측 사이트 분야 카테고리 목록 렌더링
     */
    renderCategorySidebar() {
      const container = document.getElementById('bookmark-tree-container');
      if (!container) return;

      // 분야별 개수 집계
      const counts = { all: this.bookmarks.length };
      for (const cat of this.CATEGORIES) {
        if (cat.id !== 'all') counts[cat.id] = 0;
      }
      for (const bm of this.bookmarks) {
        if (counts[bm.category] !== undefined) {
          counts[bm.category]++;
        } else {
          counts.etc = (counts.etc || 0) + 1;
        }
      }

      let html = '';
      for (const cat of this.CATEGORIES) {
        const isActive = this.currentCategory === cat.id;
        const count = counts[cat.id] || 0;

        html += `
          <div class="category-nav-item ${isActive ? 'active' : ''}" data-cat-id="${cat.id}" title="${this.escapeHtml(cat.desc)}">
            <span class="cat-icon">${cat.icon}</span>
            <div class="cat-info">
              <span class="cat-name">${this.escapeHtml(cat.name)}</span>
              <span class="cat-desc">${this.escapeHtml(cat.desc)}</span>
            </div>
            <span class="cat-count">${count.toLocaleString()}</span>
          </div>
        `;
      }

      container.innerHTML = html;

      // 카테고리 클릭 이벤트 바인딩
      container.querySelectorAll('.category-nav-item').forEach(item => {
        item.addEventListener('click', () => {
          const catId = item.getAttribute('data-cat-id');
          if (catId) {
            this.currentCategory = catId;
            this.render();
          }
        });
      });
    },

    /**
     * 우측 본문 사이트 카드 갤러리 렌더링
     */
    renderCards() {
      const container = document.getElementById('bookmark-cards-container');
      const breadcrumb = document.getElementById('bookmark-breadcrumb');
      const countEl = document.getElementById('bookmark-current-count');
      if (!container) return;

      let filtered = this.bookmarks;

      // 1. 카테고리 필터링
      if (this.currentCategory !== 'all') {
        filtered = filtered.filter(bm => bm.category === this.currentCategory);
      }

      // 2. 검색어 필터링
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = filtered.filter(bm => {
          return (bm.title && bm.title.toLowerCase().includes(q)) ||
                 (bm.url && bm.url.toLowerCase().includes(q)) ||
                 (bm.domain && bm.domain.toLowerCase().includes(q)) ||
                 (bm.categoryName && bm.categoryName.toLowerCase().includes(q)) ||
                 (bm.folderPath && bm.folderPath.toLowerCase().includes(q));
        });

        if (breadcrumb) {
          const curCatObj = this.CATEGORIES.find(c => c.id === this.currentCategory);
          breadcrumb.innerHTML = `
            <span class="breadcrumb-item" data-cat="all">🌐 전체 분야</span>
            <span class="breadcrumb-sep">/</span>
            ${curCatObj && curCatObj.id !== 'all' ? `
              <span class="breadcrumb-item" data-cat="${curCatObj.id}">${curCatObj.name}</span>
              <span class="breadcrumb-sep">/</span>
            ` : ''}
            <span class="breadcrumb-item active">🔍 검색: "${this.escapeHtml(this.searchQuery)}"</span>
          `;
        }
      } else {
        // 브레드크럼 생성
        if (breadcrumb) {
          const curCatObj = this.CATEGORIES.find(c => c.id === this.currentCategory);
          if (this.currentCategory === 'all') {
            breadcrumb.innerHTML = `<span class="breadcrumb-item active">🌐 전체 사이트 (모든 분야)</span>`;
          } else if (curCatObj) {
            breadcrumb.innerHTML = `
              <span class="breadcrumb-item" data-cat="all">🌐 전체 분야</span>
              <span class="breadcrumb-sep">/</span>
              <span class="breadcrumb-item active">${curCatObj.name}</span>
            `;
          }
        }
      }

      if (countEl) {
        countEl.textContent = `${filtered.length.toLocaleString()}개 사이트`;
      }

      // Breadcrumb 클릭 이벤트 바인딩
      if (breadcrumb) {
        breadcrumb.querySelectorAll('.breadcrumb-item[data-cat]').forEach(bItem => {
          bItem.addEventListener('click', () => {
            const targetCat = bItem.getAttribute('data-cat');
            if (targetCat) {
              this.currentCategory = targetCat;
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
            <span style="font-size: 2.4rem; margin-bottom: 8px;">🔍</span>
            <h4>일치하는 사이트가 없습니다</h4>
            <p>검색어를 변경하거나 다른 분야를 선택해 보세요.</p>
          </div>
        `;
        return;
      }

      // Google Favicon 서비스 활용
      container.innerHTML = filtered.map(bm => {
        const faviconUrl = bm.domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bm.domain)}&sz=32` : '';
        const catObj = this.CATEGORIES.find(c => c.id === bm.category) || { name: '기타', icon: '📁' };

        return `
          <div class="bookmark-card">
            <div class="bookmark-card-top">
              <div class="bookmark-favicon-wrap">
                ${faviconUrl ? `<img src="${faviconUrl}" alt="" class="bookmark-favicon" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><text y=\\'20\\' font-size=\\'20\\'>🌐</text></svg>';" />` : `<span>🌐</span>`}
              </div>
              <div class="bookmark-category-badge" title="분야: ${this.escapeHtml(catObj.name)}">
                ${catObj.icon} ${this.escapeHtml(catObj.name.split(' ')[1] || catObj.name)}
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
              <span class="folder-tag" title="원본 크롬 폴더: ${this.escapeHtml(bm.folderPath)}">📁 ${this.escapeHtml(bm.folderPath || '기본')}</span>
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
                window.UiView.showToast('📋 사이트 URL이 클립보드에 복사되었습니다.');
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
