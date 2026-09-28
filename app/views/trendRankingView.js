// app/views/trendRankingView.js - 실시간 트렌드 및 검색순위 통합 뷰 (Google Trends, BlackKiwi, Daum Cafe, Detailed.com)

class TrendRankingView {
  constructor() {
    this.container = null;
    this.activeTab = 'google'; // 'google' | 'blackkiwi' | 'daum' | 'detailed'
    this.detailedCategory = 'tech-blogs';
    this.detailedCategories = [
      { slug: 'tech-blogs', name: '💻 테크/IT (Tech)' },
      { slug: 'business-blogs', name: '🗃️ 비즈니스 (Business)' },
      { slug: 'marketing-blogs', name: '🚀 마케팅 (Marketing)' },
      { slug: 'seo-blogs', name: '📈 검색엔진 (SEO)' },
      { slug: 'web-development-blogs', name: '⚡ 웹개발 (Web Dev)' },
      { slug: 'finance-blogs', name: '💰 금융/재테크 (Finance)' },
      { slug: 'design-blogs', name: '🎨 디자인 (Design)' },
      { slug: 'gaming-blogs', name: '🎮 게임 (Gaming)' }
    ];
    this.data = {
      google: [],
      blackkiwi: [],
      daum: [],
      namu: [], // 🌳 나무위키 실시간 검색어
      kyobo: [], // 📚 교보문고 주간 종합 베스트셀러
      playboard: [], // 🎬 플레이보드 토픽차트 분야별 1순위
      detailedRankings: {}, // { [slug]: [...] }
      lastUpdated: null
    };
    this.searchQuery = '';
    this.isSyncing = false;
    this.isLoadingCategory = false;
    this.aiExplainCache = {}; // { [term]: explanation }
  }

  init() {
    this.injectStyles();
    this.container = document.getElementById('view-trend-ranking');
    if (!this.container) return;

    if (!this.container.innerHTML || this.container.innerHTML.trim() === '') {
      this.renderSkeleton();
    }
    this.loadData();
    this.loadDetailedCategories();
  }

  injectStyles() {
    if (document.getElementById('trend-ranking-styles')) return;
    const style = document.createElement('style');
    style.id = 'trend-ranking-styles';
    style.textContent = `
      @keyframes trendSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .trend-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }
      .trend-tab-btn:hover {
        color: #ffffff !important;
      }
      .trend-chip-btn:hover {
        background: rgba(56, 189, 248, 0.2) !important;
        border-color: #38bdf8 !important;
      }
      .btn-ai-explain:hover {
        background: rgba(168, 85, 247, 0.25) !important;
        border-color: rgba(168, 85, 247, 0.5) !important;
      }
      .btn-kr-trans:hover {
        background: rgba(16, 185, 129, 0.25) !important;
        border-color: rgba(16, 185, 129, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
  }

  async loadData(forceSync = false) {
    if (!this.container) return;
    this.isSyncing = true;
    this.updateSyncButtonState(true);

    try {
      const endpoint = forceSync ? '/api/trends/sync' : '/api/trends/all';
      const method = forceSync ? 'POST' : 'GET';
      const res = await fetch(endpoint, { method });
      const json = await res.json();

      if (json.success) {
        this.data.google = json.google || [];
        this.data.blackkiwi = json.blackkiwi || [];
        this.data.daum = json.daum || [];
        this.data.namu = json.namu || [];
        this.data.kyobo = json.kyobo || [];
        this.data.playboard = json.playboard || [];
        if (json.detailedCategories && json.detailedCategories.length > 0) {
          this.detailedCategories = json.detailedCategories;
        }
        if (json.detailedRankings) {
          this.data.detailedRankings = { ...this.data.detailedRankings, ...json.detailedRankings };
        }
        this.data.lastUpdated = json.lastUpdated || Date.now();

        // Detailed 카테고리가 비어있으면 기본 테크 카테고리 로드
        if (this.activeTab === 'detailed' && !this.data.detailedRankings[this.detailedCategory]) {
          await this.loadDetailedRankings(this.detailedCategory);
        } else {
          this.render();
        }
      } else {
        throw new Error(json.error || '트렌드 데이터를 불러오지 못했습니다.');
      }
    } catch (err) {
      console.error('[TrendRankingView] Load error:', err);
      if (!this.data.google.length && !this.data.blackkiwi.length && !this.data.daum.length) {
        this.renderError(err.message);
      }
    } finally {
      this.isSyncing = false;
      this.updateSyncButtonState(false);
    }
  }

  async loadDetailedCategories() {
    try {
      const res = await fetch('/api/trends/detailed-categories');
      const json = await res.json();
      if (json.success && Array.isArray(json.categories) && json.categories.length > 0) {
        this.detailedCategories = json.categories;
        const selectEl = document.getElementById('detailed-cat-select');
        if (selectEl) {
          this.populateCategorySelect(selectEl);
        }
      }
    } catch (e) {
      console.warn('[TrendRankingView] loadDetailedCategories error:', e.message);
    }
  }

  async loadDetailedRankings(categorySlug) {
    this.isLoadingCategory = true;
    this.render();
    try {
      const res = await fetch(`/api/trends/detailed?category=${encodeURIComponent(categorySlug)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.rankings)) {
        this.data.detailedRankings[categorySlug] = json.rankings;
      }
    } catch (e) {
      console.warn('[TrendRankingView] loadDetailedRankings error:', e.message);
    } finally {
      this.isLoadingCategory = false;
      this.render();
    }
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="trend-ranking-container" style="max-width: 1240px; margin: 0 auto; padding: 20px 16px; color: #f1f5f9;">
        <!-- 상단 헤더 -->
        <div class="trend-header" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px; color: #f8fafc;">
              🔥 실시간 트렌드 & 검색순위
            </h1>
            <p style="font-size: 0.85rem; color: #94a3b8; margin: 4px 0 0 0;">
              Google Trends · BlackKiwi · Daum 카페 · 나무위키 실검 · Detailed · 교보문고 · Playboard 통합
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span id="trend-last-updated" style="font-size: 0.8rem; color: #64748b;">동기화 확인 중...</span>
            <button id="btn-trend-sync" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-weight: 600; border-radius: 8px; background: #3b82f6; border: none; color: #fff; cursor: pointer;">
              <span class="sync-icon">🔄</span> 지금 동기화
            </button>
          </div>
        </div>

        <!-- 스켈레톤 로딩 -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
          <div style="width: 120px; height: 38px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
          <div style="width: 120px; height: 38px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
          <div style="width: 120px; height: 38px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
          <div style="width: 130px; height: 38px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
          <div style="width: 140px; height: 38px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
          <div style="width: 130px; height: 38px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
          <div style="width: 140px; height: 38px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 16px;">
          ${Array(6).fill('<div style="height: 160px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;"></div>').join('')}
        </div>
      </div>
    `;
    this.bindHeaderEvents();
  }

  render() {
    if (!this.container) return;

    const timeAgoStr = this.getTimeAgo(this.data.lastUpdated);
    const googleCount = this.data.google.length;
    const bkCount = this.data.blackkiwi.length;
    const daumCount = this.data.daum.length;
    const namuCount = this.data.namu.length;
    const kyoboCount = this.data.kyobo.length;
    const playboardCount = this.data.playboard.length;
    const detailedRankings = this.data.detailedRankings[this.detailedCategory] || [];
    const detailedCount = detailedRankings.length;

    const currentItems = this.getCurrentItems();
    const filteredItems = this.filterItems(currentItems);

    this.container.innerHTML = `
      <div class="trend-ranking-container" style="max-width: 1240px; margin: 0 auto; padding: 20px 16px; color: #f1f5f9;">
        <!-- 상단 헤더 -->
        <div class="trend-header" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div>
            <h1 style="font-size: 1.55rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px; color: #f8fafc; letter-spacing: -0.5px;">
              🔥 실시간 트렌드 & 검색순위
            </h1>
            <p style="font-size: 0.85rem; color: #94a3b8; margin: 4px 0 0 0;">
              국내 실시간 검색어, 나무위키 인기 실검부터 교보문고 종합 베스트 및 Playboard 유튜브 분야별 1위 차트까지 통합 제공합니다.
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="text-align: right;">
              <span id="trend-last-updated" style="font-size: 0.78rem; color: #94a3b8; display: block;">최근 갱신: ${timeAgoStr}</span>
              <span style="font-size: 0.72rem; color: #64748b;">(15분 자동 동기화)</span>
            </div>
            <button id="btn-trend-sync" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; font-weight: 600; border-radius: 8px; background: #2563eb; border: 1px solid #3b82f6; color: #fff; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
              <span class="sync-icon">🔄</span> 지금 동기화
            </button>
          </div>
        </div>

        <!-- 7개 사이트 탭 및 검색 툴바 -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 18px;">
          <!-- 7개 사이트 탭 전환 -->
          <div class="trend-tabs" style="display: inline-flex; flex-wrap: wrap; background: rgba(15, 23, 42, 0.8); padding: 4px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08); gap: 4px;">
            <button class="trend-tab-btn ${this.activeTab === 'google' ? 'active' : ''}" data-tab="google" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.activeTab === 'google' ? 'background: #3b82f6; color: #ffffff; box-shadow: 0 2px 8px rgba(59,130,246,0.3);' : 'background: transparent; color: #94a3b8;'}">
              <span>🌐</span> 구글 트렌드
              <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,0.25);">${googleCount}</span>
            </button>
            <button class="trend-tab-btn ${this.activeTab === 'blackkiwi' ? 'active' : ''}" data-tab="blackkiwi" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.activeTab === 'blackkiwi' ? 'background: #10b981; color: #ffffff; box-shadow: 0 2px 8px rgba(16,185,129,0.3);' : 'background: transparent; color: #94a3b8;'}">
              <span>🥝</span> 블랙키위
              <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,0.25);">${bkCount}</span>
            </button>
            <button class="trend-tab-btn ${this.activeTab === 'daum' ? 'active' : ''}" data-tab="daum" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.activeTab === 'daum' ? 'background: #e11d48; color: #ffffff; box-shadow: 0 2px 8px rgba(225,29,72,0.3);' : 'background: transparent; color: #94a3b8;'}">
              <span>☕</span> 다음 카페
              <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,0.25);">${daumCount}</span>
            </button>
            <button class="trend-tab-btn ${this.activeTab === 'namu' ? 'active' : ''}" data-tab="namu" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.activeTab === 'namu' ? 'background: #00a495; color: #ffffff; box-shadow: 0 2px 8px rgba(0,164,149,0.35);' : 'background: transparent; color: #94a3b8;'}">
              <span>🌳</span> 나무위키 실검
              <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,0.25);">${namuCount || '10'}</span>
            </button>
            <button class="trend-tab-btn ${this.activeTab === 'detailed' ? 'active' : ''}" data-tab="detailed" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.activeTab === 'detailed' ? 'background: #8b5cf6; color: #ffffff; box-shadow: 0 2px 8px rgba(139,92,246,0.3);' : 'background: transparent; color: #94a3b8;'}">
              <span>🏆</span> Detailed 웹
              <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,0.25);">${detailedCount || '40+'}</span>
            </button>
            <button class="trend-tab-btn ${this.activeTab === 'kyobo' ? 'active' : ''}" data-tab="kyobo" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.activeTab === 'kyobo' ? 'background: #059669; color: #ffffff; box-shadow: 0 2px 8px rgba(5,150,105,0.35);' : 'background: transparent; color: #94a3b8;'}">
              <span>📚</span> 교보문고 베스트
              <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,0.25);">${kyoboCount || '20'}</span>
            </button>
            <button class="trend-tab-btn ${this.activeTab === 'playboard' ? 'active' : ''}" data-tab="playboard" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: none; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; ${this.activeTab === 'playboard' ? 'background: #dc2626; color: #ffffff; box-shadow: 0 2px 8px rgba(220,38,38,0.35);' : 'background: transparent; color: #94a3b8;'}">
              <span>🎬</span> 유튜브 토픽 1위
              <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 10px; background: rgba(0,0,0,0.25);">${playboardCount || '17'}</span>
            </button>
          </div>

          <!-- 실시간 검색 필터 -->
          <div style="position: relative; min-width: 220px; flex-grow: 0;">
            <input type="text" id="trend-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="${this.activeTab === 'playboard' ? '채널명/토픽/영상 실시간 검색...' : (this.activeTab === 'detailed' ? '사이트명/도메인 검색...' : (this.activeTab === 'namu' ? '나무위키 실시간 검색어 필터...' : '키워드/제목 실시간 검색...'))}" style="width: 100%; padding: 8px 12px 8px 34px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #f8fafc; font-size: 0.85rem; outline: none;">
            <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; color: #64748b;">🔍</span>
          </div>
        </div>

        <!-- Detailed 탭 전용: 분야(카테고리) 칩 바 & 드롭다운 셀렉터 -->
        ${this.activeTab === 'detailed' ? `
          <div style="background: rgba(15, 23, 42, 0.6); padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(139, 92, 246, 0.25); margin-bottom: 18px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #c4b5fd; display: flex; align-items: center; gap: 6px;">
                <span>📂</span> 인기 분야 선택 (Detailed.com 40+ 분야):
              </div>
              <!-- 40여 개 전체 분야 드롭다운 셀렉트 -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <label for="detailed-cat-select" style="font-size: 0.78rem; color: #94a3b8;">전체 분야:</label>
                <select id="detailed-cat-select" style="padding: 5px 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #f8fafc; font-size: 0.82rem; outline: none; cursor: pointer;">
                  ${this.renderCategoryOptionsHtml()}
                </select>
              </div>
            </div>

            <!-- 8대 핵심 인기 분야 빠른 선택 칩 버튼들 -->
            <div class="detailed-chips-bar" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
              ${this.renderPresetChipsHtml()}
            </div>
          </div>
        ` : ''}

        <!-- 탭 설명 안내 바 -->
        <div style="background: rgba(30, 41, 59, 0.5); border-left: 3px solid ${this.getTabThemeColor()}; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 0.82rem; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <span>${this.getTabDescription()}</span>
          <a href="${this.getTabSourceUrl()}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: none; font-weight: 500; font-size: 0.78rem;">
            공식 사이트 바로가기 ↗
          </a>
        </div>

        <!-- 스마트 트렌드 카드 그리드 -->
        ${this.isLoadingCategory ? `
          <div style="text-align: center; padding: 60px 20px; color: #c4b5fd;">
            <div style="font-size: 2rem; display: inline-block; animation: trendSpin 1s infinite linear; margin-bottom: 10px;">⚡</div>
            <p style="font-size: 0.9rem; margin: 0;">Detailed.com [${this.getCategoryName(this.detailedCategory)}] 순위 데이터를 가져오는 중입니다...</p>
          </div>
        ` : (filteredItems.length === 0 ? `
          <div style="text-align: center; padding: 60px 20px; background: rgba(15, 23, 42, 0.3); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 12px;">
            <div style="font-size: 2.2rem; margin-bottom: 10px;">📦</div>
            <h3 style="font-size: 1.1rem; color: #e2e8f0; margin-bottom: 6px;">표시할 항목이 없습니다</h3>
            <p style="font-size: 0.85rem; color: #94a3b8; margin: 0;">검색어를 확인하시거나 상단의 [🔄 지금 동기화] 버튼을 눌러보세요.</p>
          </div>
        ` : `
          <div class="trend-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px;">
            ${filteredItems.map(item => this.renderCardHtml(item)).join('')}
          </div>
        `)}
      </div>
    `;

    this.bindEvents();
  }

  renderPresetChipsHtml() {
    const presets = [
      { slug: 'tech-blogs', label: '💻 테크/IT' },
      { slug: 'business-blogs', label: '🗃️ 비즈니스' },
      { slug: 'marketing-blogs', label: '🚀 마케팅' },
      { slug: 'seo-blogs', label: '📈 검색엔진' },
      { slug: 'web-development-blogs', label: '⚡ 웹개발' },
      { slug: 'finance-blogs', label: '💰 금융/재테크' },
      { slug: 'design-blogs', label: '🎨 디자인' },
      { slug: 'gaming-blogs', label: '🎮 게임' }
    ];

    return presets.map(p => {
      const isSelected = this.detailedCategory === p.slug;
      const bg = isSelected ? '#8b5cf6' : 'rgba(30, 41, 59, 0.8)';
      const color = isSelected ? '#ffffff' : '#94a3b8';
      const border = isSelected ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.08)';
      return `
        <button class="trend-chip-btn" data-cat="${p.slug}" style="padding: 5px 11px; font-size: 0.78rem; font-weight: 600; border-radius: 6px; background: ${bg}; color: ${color}; border: ${border}; cursor: pointer; transition: all 0.15s;">
          ${p.label}
        </button>
      `;
    }).join('');
  }

  renderCategoryOptionsHtml() {
    const categories = this.detailedCategories || [];
    return categories.map(c => {
      const isSelected = this.detailedCategory === c.slug;
      return `<option value="${c.slug}" ${isSelected ? 'selected' : ''}>${c.name} (${c.mentions || 'Top'})</option>`;
    }).join('');
  }

  renderCardHtml(item) {
    if (this.activeTab === 'namu') {
      return this.renderNamuWikiCardHtml(item);
    }
    if (this.activeTab === 'detailed') {
      return this.renderDetailedWebsiteCardHtml(item);
    }
    if (this.activeTab === 'kyobo') {
      return this.renderKyoboBookCardHtml(item);
    }
    if (this.activeTab === 'playboard') {
      return this.renderPlayboardCardHtml(item);
    }
    return this.renderTrendKeywordCardHtml(item);
  }

  /**
   * 🌳 나무위키 실시간 검색어 전용 스마트 카드 렌더링
   */
  renderNamuWikiCardHtml(item) {
    const isTop1 = item.rank === 1;
    const isTop2 = item.rank === 2;
    const isTop3 = item.rank === 3;

    let badgeStyle = 'background: rgba(51, 65, 85, 0.8); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);';
    let cardBorder = 'border: 1px solid rgba(0, 164, 149, 0.25);';
    let rankLabel = `${item.rank}`;

    if (isTop1) {
      badgeStyle = 'background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; font-weight: 800; box-shadow: 0 2px 10px rgba(245,158,11,0.4);';
      cardBorder = 'border: 1px solid rgba(0, 164, 149, 0.55); background: linear-gradient(180deg, rgba(0, 164, 149, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%);';
      rankLabel = '🥇 1';
    } else if (isTop2) {
      badgeStyle = 'background: linear-gradient(135deg, #94a3b8, #64748b); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(0, 164, 149, 0.45);';
      rankLabel = '🥈 2';
    } else if (isTop3) {
      badgeStyle = 'background: linear-gradient(135deg, #b45309, #78350f); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(0, 164, 149, 0.4);';
      rankLabel = '🥉 3';
    }

    const cardId = `namu-card-${item.rank}`;
    const cachedExplain = this.aiExplainCache[item.keyword];

    return `
      <div id="${cardId}" class="trend-card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 18px; border-radius: 12px; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); ${cardBorder} transition: transform 0.18s, box-shadow 0.18s;">
        <!-- 상단 헤더: 순위 + 나무위키 배지 -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 26px; padding: 0 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; ${badgeStyle}">
                ${rankLabel}
              </span>
              <span style="font-size: 0.73rem; color: #2dd4bf; background: rgba(0, 164, 149, 0.15); padding: 3px 8px; border-radius: 6px; font-weight: 700; border: 1px solid rgba(0, 164, 149, 0.3);">
                실시간 급상승
              </span>
            </div>
            <span style="font-size: 0.74rem; color: #64748b; font-weight: 600;">
              나무위키
            </span>
          </div>

          <!-- 메인 키워드 및 소개 -->
          <div style="margin-bottom: 12px;">
            <a href="${this.escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer" style="display: block; color: #f8fafc; font-size: 1.15rem; font-weight: 800; line-height: 1.35; text-decoration: none; transition: color 0.15s; margin-bottom: 6px;" onmouseover="this.style.color='#2dd4bf'" onmouseout="this.style.color='#f8fafc'">
              ${this.escapeHtml(item.keyword)}
            </a>
            <p style="margin: 0; font-size: 0.8rem; color: #94a3b8; line-height: 1.45;">
              나무위키 실시간 인기 검색어 ${item.rank}위 문서입니다.
            </p>
          </div>
        </div>

        <!-- 하단 액션 버튼 바 -->
        <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <a href="${this.escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; background: rgba(0, 164, 149, 0.15); color: #2dd4bf; text-decoration: none; border: 1px solid rgba(0, 164, 149, 0.35); font-weight: 600;">
              🌳 나무위키 문서 ↗
            </a>
            <a href="${this.escapeHtml(item.portalSearchUrl || '#')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; text-decoration: none; border: 1px solid rgba(56, 189, 248, 0.25);">
              🔍 포털 검색
            </a>
            <button type="button" class="btn-ai-explain" data-type="namu" data-card="${cardId}" data-keyword="${this.escapeHtml(item.keyword)}" data-source="나무위키 실시간 검색어" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); cursor: pointer; font-weight: 600;">
              🤖 AI 실검 배경 분석
            </button>
          </div>

          <!-- AI 요약 아코디언 컨테이너 -->
          <div id="${cardId}-ai-box" class="ai-explain-box" style="display: ${cachedExplain ? 'block' : 'none'}; margin-top: 10px; padding: 12px 14px; background: rgba(24, 24, 37, 0.95); border: 1px solid rgba(0, 164, 149, 0.35); border-radius: 8px; font-size: 0.8rem; line-height: 1.55; color: #e2e8f0; white-space: pre-line;">
            ${cachedExplain ? cachedExplain : ''}
          </div>
        </div>
      </div>
    `;
  }

  formatCount(num) {
    if (!num || isNaN(num)) return '0';
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
    if (num >= 10000) return (num / 10000).toFixed(1) + '만';
    return Number(num).toLocaleString('ko-KR');
  }

  /**
   * 🎬 플레이보드 토픽차트 분야별 1위 전용 스마트 카드 렌더링
   */
  renderPlayboardCardHtml(item) {
    const cardId = `playboard-card-${item.topicId}`;
    const cachedExplain = this.aiExplainCache[item.channelName || item.topicName];

    let deltaBadge = '';
    if (item.delta) {
      const isUp = item.deltaType === 'up' || item.delta.includes('▲');
      const isDown = item.deltaType === 'down' || item.delta.includes('▼');
      const dColor = isUp ? '#10b981' : (isDown ? '#ef4444' : '#64748b');
      deltaBadge = `<span style="font-size: 0.73rem; color: ${dColor}; font-weight: 700; margin-left: 4px;">${this.escapeHtml(item.delta)}</span>`;
    }

    const subCountStr = this.formatCount(item.subscriberCount);
    const dailyViewsStr = this.formatCount(item.dailyViews);

    return `
      <div id="${cardId}" class="trend-card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 18px; border-radius: 12px; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); border: 1px solid rgba(239, 68, 68, 0.25); transition: transform 0.18s, box-shadow 0.18s;">
        <!-- 상단 헤더: 토픽 배지 + 순위 변동 + Playboard -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div style="display: inline-flex; align-items: center; gap: 6px;">
              <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 800; background: linear-gradient(135deg, #dc2626, #991b1b); color: #ffffff; box-shadow: 0 2px 8px rgba(220,38,38,0.35);">
                ${item.topicEmoji || '🎬'} ${this.escapeHtml(item.topicName)} 1위
              </span>
              ${deltaBadge}
            </div>
            <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 600;">
              PLAYBOARD
            </span>
          </div>

          <!-- 메인 프로필 및 채널 정보 -->
          <div style="display: flex; gap: 14px; margin-bottom: 12px; align-items: flex-start;">
            <!-- 채널 원형 프로필 이미지 -->
            <a href="${this.escapeHtml(item.youtubeUrl || item.playboardUrl)}" target="_blank" rel="noopener noreferrer" style="flex-shrink: 0; width: 64px; height: 64px; border-radius: 50%; overflow: hidden; background: #1e293b; border: 2px solid #ef4444; box-shadow: 0 4px 12px rgba(239,68,68,0.25); display: block;">
              <img src="${this.escapeHtml(item.thumbnail || '')}" alt="${this.escapeHtml(item.channelName)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://playboard.co/favicon-32x32.png'">
            </a>

            <!-- 채널명 및 통계 -->
            <div style="flex-grow: 1; min-width: 0;">
              <a href="${this.escapeHtml(item.youtubeUrl || item.playboardUrl)}" target="_blank" rel="noopener noreferrer" style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; color: #f8fafc; font-size: 1.05rem; font-weight: 800; line-height: 1.3; text-decoration: none; transition: color 0.15s;" onmouseover="this.style.color='#f87171'" onmouseout="this.style.color='#f8fafc'">
                ${this.escapeHtml(item.channelName)}
              </a>

              <!-- 구독자 및 일간 조회수 태그 -->
              <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                <span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.76rem; color: #fca5a5; background: rgba(239, 68, 68, 0.12); padding: 2px 7px; border-radius: 5px; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.2);">
                  👥 구독자 ${subCountStr}
                </span>
                <span style="display: inline-flex; align-items: center; gap: 3px; font-size: 0.76rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 2px 7px; border-radius: 5px; font-weight: 600; border: 1px solid rgba(56, 189, 248, 0.2);">
                  👁️ 일간 ${dailyViewsStr}회
                </span>
              </div>

              <!-- 키워드 태그 -->
              ${item.keywords && item.keywords.length > 0 ? `
                <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px;">
                  ${item.keywords.slice(0, 3).map(k => `
                    <span style="font-size: 0.7rem; color: #94a3b8; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px;">#${this.escapeHtml(k)}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- 대표/최신 영상 미니 프리뷰 -->
          ${item.latestVideo && item.latestVideo.title ? `
            <a href="${this.escapeHtml(item.latestVideo.videoUrl || item.youtubeUrl)}" target="_blank" rel="noopener noreferrer" style="display: flex; gap: 10px; align-items: center; padding: 8px 10px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; text-decoration: none; margin-bottom: 8px; transition: background 0.15s;" onmouseover="this.style.background='rgba(30, 41, 59, 0.8)'" onmouseout="this.style.background='rgba(15, 23, 42, 0.7)'">
              <div style="position: relative; flex-shrink: 0; width: 60px; height: 38px; border-radius: 4px; overflow: hidden; background: #000;">
                <img src="https://i.ytimg.com/vi/${this.escapeHtml(item.latestVideo.videoId)}/mqdefault.jpg" alt="영상" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
                <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); color: #fff; font-size: 0.75rem;">▶</span>
              </div>
              <div style="flex-grow: 1; min-width: 0;">
                <span style="display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.78rem; color: #e2e8f0; font-weight: 500; line-height: 1.35;">
                  ${this.escapeHtml(item.latestVideo.title)}
                </span>
                ${item.latestVideo.playCount > 0 ? `
                  <span style="font-size: 0.7rem; color: #94a3b8;">조회수 ${this.formatCount(item.latestVideo.playCount)}회</span>
                ` : ''}
              </div>
            </a>
          ` : ''}
        </div>

        <!-- 하단 액션 버튼 바 -->
        <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <a href="${this.escapeHtml(item.youtubeUrl || item.playboardUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; background: rgba(220, 38, 38, 0.15); color: #f87171; text-decoration: none; border: 1px solid rgba(220, 38, 38, 0.3); font-weight: 600;">
              ▶ 유튜브 바로가기 ↗
            </a>
            <button type="button" class="btn-ai-explain" data-type="youtube" data-card="${cardId}" data-channel="${this.escapeHtml(item.channelName)}" data-topic="${this.escapeHtml(item.topicName)}" data-sub="${subCountStr}" data-views="${dailyViewsStr}" data-video="${this.escapeHtml(item.latestVideo ? item.latestVideo.title : '')}" data-keywords="${this.escapeHtml(item.keywords.join(', '))}" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); cursor: pointer; font-weight: 600;">
              🤖 AI 채널 성공요인 분석
            </button>
          </div>

          <!-- AI 요약 아코디언 컨테이너 -->
          <div id="${cardId}-ai-box" class="ai-explain-box" style="display: ${cachedExplain ? 'block' : 'none'}; margin-top: 10px; padding: 12px 14px; background: rgba(24, 24, 37, 0.95); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; font-size: 0.8rem; line-height: 1.55; color: #e2e8f0; white-space: pre-line;">
            ${cachedExplain ? cachedExplain : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 📚 교보문고 주간 종합 베스트셀러 전용 스마트 카드 렌더링
   */
  renderKyoboBookCardHtml(item) {
    const isTop1 = item.rank === 1;
    const isTop2 = item.rank === 2;
    const isTop3 = item.rank === 3;

    let badgeStyle = 'background: rgba(51, 65, 85, 0.8); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);';
    let cardBorder = 'border: 1px solid rgba(255, 255, 255, 0.08);';
    let rankLabel = `${item.rank}`;

    if (isTop1) {
      badgeStyle = 'background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; font-weight: 800; box-shadow: 0 2px 10px rgba(245,158,11,0.4);';
      cardBorder = 'border: 1px solid rgba(245, 158, 11, 0.45); background: linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(15, 23, 42, 0.7) 100%);';
      rankLabel = '🥇 1';
    } else if (isTop2) {
      badgeStyle = 'background: linear-gradient(135deg, #94a3b8, #64748b); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(148, 163, 184, 0.35);';
      rankLabel = '🥈 2';
    } else if (isTop3) {
      badgeStyle = 'background: linear-gradient(135deg, #b45309, #78350f); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(180, 83, 9, 0.35);';
      rankLabel = '🥉 3';
    }

    let deltaBadge = '';
    if (item.delta) {
      const isNew = item.deltaType === 'new' || item.delta === 'NEW';
      const isUp = item.deltaType === 'up' || item.delta.includes('▲');
      const isDown = item.deltaType === 'down' || item.delta.includes('▼');

      if (isNew) {
        deltaBadge = `<span style="font-size: 0.72rem; color: #f43f5e; background: rgba(244, 63, 94, 0.15); padding: 2px 6px; border-radius: 6px; font-weight: 800; border: 1px solid rgba(244, 63, 94, 0.3);">NEW</span>`;
      } else {
        const dColor = isUp ? '#10b981' : (isDown ? '#f59e0b' : '#64748b');
        deltaBadge = `<span style="font-size: 0.73rem; color: ${dColor}; font-weight: 700; margin-left: 2px;">${this.escapeHtml(item.delta)}</span>`;
      }
    }

    const cardId = `kyobo-book-card-${item.rank}`;
    const cachedExplain = this.aiExplainCache[item.title];

    const formattedSalePrice = (item.salePrice || item.price || 0).toLocaleString('ko-KR');
    const formattedPrice = item.price ? item.price.toLocaleString('ko-KR') : '';

    return `
      <div id="${cardId}" class="trend-card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 18px; border-radius: 12px; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); ${cardBorder} transition: transform 0.18s, box-shadow 0.18s;">
        <!-- 상단 헤더: 순위 + 변동 + 카테고리 태그 -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 26px; padding: 0 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; ${badgeStyle}">
                ${rankLabel}
              </span>
              ${deltaBadge}
              ${item.category ? `
                <span style="font-size: 0.72rem; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 3px 8px; border-radius: 6px; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.25);">
                  ${this.escapeHtml(item.category)}
                </span>
              ` : ''}
            </div>
            ${item.rating ? `
              <span style="font-size: 0.76rem; color: #f59e0b; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">
                ⭐ ${item.rating} ${item.reviewCount ? `<span style="font-size: 0.7rem; color: #94a3b8; font-weight: 400;">(${item.reviewCount})</span>` : ''}
              </span>
            ` : ''}
          </div>

          <!-- 메인 콘텐츠: 책 표지 + 서지 정보 + 가격 + 설명 -->
          <div style="display: flex; gap: 14px; margin-bottom: 12px;">
            <!-- 책 표지 이미지 -->
            <a href="${this.escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer" style="flex-shrink: 0; width: 78px; height: 112px; border-radius: 8px; overflow: hidden; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: block;">
              <img src="${this.escapeHtml(item.thumbnail || '')}" alt="${this.escapeHtml(item.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='https://contents.kyobobook.co.kr/resources/fo/images/common/ink/img_logo_kyobo@2x.png';">
            </a>

            <!-- 서지 정보 -->
            <div style="flex-grow: 1; min-width: 0;">
              <a href="${this.escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #f8fafc; font-size: 1.02rem; font-weight: 700; line-height: 1.35; text-decoration: none; transition: color 0.15s;" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#f8fafc'">
                ${this.escapeHtml(item.title)}
              </a>

              <p style="margin: 4px 0 0 0; font-size: 0.78rem; color: #94a3b8; line-height: 1.4;">
                <span style="color: #cbd5e1; font-weight: 500;">${this.escapeHtml(item.author || '저자 미상')}</span> 저 · <span style="color: #94a3b8;">${this.escapeHtml(item.publisher || '')}</span>
              </p>

              <!-- 가격 정보 -->
              <div style="margin-top: 6px; display: flex; align-items: baseline; gap: 6px;">
                ${item.discountRate > 0 ? `
                  <span style="font-size: 0.85rem; color: #ef4444; font-weight: 800;">
                    ${item.discountRate}%
                  </span>
                ` : ''}
                <span style="font-size: 0.95rem; color: #f8fafc; font-weight: 800;">
                  ${formattedSalePrice}원
                </span>
                ${item.discountRate > 0 && formattedPrice ? `
                  <span style="font-size: 0.75rem; color: #64748b; text-decoration: line-through;">
                    ${formattedPrice}원
                  </span>
                ` : ''}
              </div>

              <!-- 도서 한줄 설명 -->
              ${item.description ? `
                <p style="margin: 8px 0 0 0; font-size: 0.78rem; color: #94a3b8; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.45;">
                  ${this.escapeHtml(item.description)}
                </p>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- 하단 액션 버튼 바 -->
        <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <a href="${this.escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; background: rgba(5, 150, 105, 0.15); color: #34d399; text-decoration: none; border: 1px solid rgba(5, 150, 105, 0.3); font-weight: 600;">
              📖 교보문고 바로가기 ↗
            </a>
            <button type="button" class="btn-ai-explain" data-type="book" data-card="${cardId}" data-title="${this.escapeHtml(item.title)}" data-author="${this.escapeHtml(item.author || '')}" data-publisher="${this.escapeHtml(item.publisher || '')}" data-category="${this.escapeHtml(item.category || '')}" data-desc="${this.escapeHtml(item.description || '')}" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.76rem; border-radius: 6px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); cursor: pointer; font-weight: 600;">
              🤖 AI 핵심 요약 & 독서 포인트
            </button>
          </div>

          <!-- AI 요약 아코디언 컨테이너 -->
          <div id="${cardId}-ai-box" class="ai-explain-box" style="display: ${cachedExplain ? 'block' : 'none'}; margin-top: 10px; padding: 12px 14px; background: rgba(24, 24, 37, 0.95); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; font-size: 0.8rem; line-height: 1.55; color: #e2e8f0; white-space: pre-line;">
            ${cachedExplain ? cachedExplain : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Detailed.com 웹사이트 전용 스마트 카드 렌더링
   */
  renderDetailedWebsiteCardHtml(item) {
    const isTop1 = item.rank === 1;
    const isTop2 = item.rank === 2;
    const isTop3 = item.rank === 3;

    let badgeStyle = 'background: rgba(51, 65, 85, 0.8); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);';
    let cardBorder = 'border: 1px solid rgba(255, 255, 255, 0.08);';
    let rankLabel = `${item.rank}`;

    if (isTop1) {
      badgeStyle = 'background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; font-weight: 800; box-shadow: 0 2px 10px rgba(245,158,11,0.4);';
      cardBorder = 'border: 1px solid rgba(245, 158, 11, 0.45); background: linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(15, 23, 42, 0.7) 100%);';
      rankLabel = '🥇 1';
    } else if (isTop2) {
      badgeStyle = 'background: linear-gradient(135deg, #94a3b8, #64748b); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(148, 163, 184, 0.35);';
      rankLabel = '🥈 2';
    } else if (isTop3) {
      badgeStyle = 'background: linear-gradient(135deg, #b45309, #78350f); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(180, 83, 9, 0.35);';
      rankLabel = '🥉 3';
    }

    let deltaBadge = '';
    if (item.delta) {
      const isUp = item.deltaType === 'up' || item.delta.includes('+');
      const isDown = item.deltaType === 'down' || item.delta.includes('-');
      const dColor = isUp ? '#10b981' : (isDown ? '#f43f5e' : '#94a3b8');
      const dIcon = isUp ? '▲' : (isDown ? '▼' : '-');
      deltaBadge = `
        <span style="font-size: 0.72rem; color: ${dColor}; font-weight: 700; margin-left: 4px;">
          ${dIcon} ${this.escapeHtml(item.delta)}
        </span>
      `;
    }

    const cardId = `detailed-card-${item.rank}`;
    const cachedExplain = this.aiExplainCache[item.name || item.domain];

    return `
      <div id="${cardId}" class="trend-card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 18px; border-radius: 12px; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); ${cardBorder} transition: transform 0.18s, box-shadow 0.18s;">
        <!-- 상단 헤더: 순위 + 뱃지 -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 26px; padding: 0 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; ${badgeStyle}">
                ${rankLabel}
              </span>
              ${deltaBadge}
              ${item.mentions ? `
                <span style="font-size: 0.73rem; color: #a78bfa; background: rgba(167, 139, 250, 0.12); padding: 3px 8px; border-radius: 6px; font-weight: 600; border: 1px solid rgba(167, 139, 250, 0.25);">
                  ⭐ ${this.escapeHtml(item.mentions)} Mentions
                </span>
              ` : ''}
            </div>
            <span style="font-size: 0.74rem; color: #64748b; font-weight: 500;">
              Detailed.com 랭킹
            </span>
          </div>

          <!-- 메인 콘텐츠 영역 (썸네일 + 사이트명 + 도메인 + 설명) -->
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            ${item.thumbnail ? `
              <div style="flex-shrink: 0; width: 68px; height: 68px; border-radius: 8px; overflow: hidden; background: #1e293b; border: 1px solid rgba(255,255,255,0.06);">
                <img src="${this.escapeHtml(item.thumbnail)}" alt="${this.escapeHtml(item.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
              </div>
            ` : ''}
            <div style="flex-grow: 1; min-width: 0;">
              <div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
                <a href="${this.escapeHtml(item.siteUrl || item.link || '#')}" target="_blank" rel="noopener noreferrer" style="color: #f8fafc; font-size: 1.05rem; font-weight: 700; line-height: 1.35; text-decoration: none; transition: color 0.15s;" onmouseover="this.style.color='#38bdf8'" onmouseout="this.style.color='#f8fafc'">
                  ${this.escapeHtml(item.name)}
                </a>
                ${item.domain ? `
                  <span style="font-size: 0.74rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">
                    ${this.escapeHtml(item.domain)}
                  </span>
                ` : ''}
              </div>
              ${item.description ? `
                <p id="${cardId}-desc" style="margin: 6px 0 0 0; font-size: 0.8rem; color: #94a3b8; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.45;">
                  ${this.escapeHtml(item.description)}
                </p>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- 하단 액션 버튼 바 -->
        <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <a href="${this.escapeHtml(item.siteUrl || item.link || '#')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; font-size: 0.76rem; border-radius: 6px; background: rgba(51, 65, 85, 0.6); color: #cbd5e1; text-decoration: none; border: 1px solid rgba(255,255,255,0.08);">
              🌐 사이트 방문
            </a>
            <button type="button" class="btn-kr-trans" data-card="${cardId}" data-name="${this.escapeHtml(item.name)}" data-desc="${this.escapeHtml(item.description || '')}" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; font-size: 0.76rem; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); cursor: pointer;">
              🇰🇷 한국어 요약
            </button>
            <button type="button" class="btn-ai-explain" data-type="website" data-card="${cardId}" data-keyword="${this.escapeHtml(item.name)}" data-domain="${this.escapeHtml(item.domain || '')}" data-desc="${this.escapeHtml(item.description || '')}" data-source="Detailed.com" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; font-size: 0.76rem; border-radius: 6px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); cursor: pointer;">
              🤖 AI 사이트 분석
            </button>
          </div>

          <!-- AI 요약 / 한국어 번역 아코디언 컨테이너 -->
          <div id="${cardId}-ai-box" class="ai-explain-box" style="display: ${cachedExplain ? 'block' : 'none'}; margin-top: 10px; padding: 10px 12px; background: rgba(24, 24, 37, 0.95); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; font-size: 0.79rem; line-height: 1.5; color: #e2e8f0; white-space: pre-line;">
            ${cachedExplain ? cachedExplain : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 구글, 블랙키위, 다음 카페용 스마트 카드 렌더링
   */
  renderTrendKeywordCardHtml(item) {
    const isTop1 = item.rank === 1;
    const isTop2 = item.rank === 2;
    const isTop3 = item.rank === 3;

    let badgeStyle = 'background: rgba(51, 65, 85, 0.8); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1);';
    let cardBorder = 'border: 1px solid rgba(255, 255, 255, 0.08);';
    let rankLabel = `${item.rank}`;

    if (isTop1) {
      badgeStyle = 'background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; font-weight: 800; box-shadow: 0 2px 10px rgba(245,158,11,0.4);';
      cardBorder = 'border: 1px solid rgba(245, 158, 11, 0.45); background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%);';
      rankLabel = '🥇 1';
    } else if (isTop2) {
      badgeStyle = 'background: linear-gradient(135deg, #94a3b8, #64748b); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(148, 163, 184, 0.35);';
      rankLabel = '🥈 2';
    } else if (isTop3) {
      badgeStyle = 'background: linear-gradient(135deg, #b45309, #78350f); color: #ffffff; font-weight: 800;';
      cardBorder = 'border: 1px solid rgba(180, 83, 9, 0.35);';
      rankLabel = '🥉 3';
    }

    const cardId = `trend-card-${this.activeTab}-${item.rank}`;
    const cachedExplain = this.aiExplainCache[item.keyword || item.title];

    return `
      <div id="${cardId}" class="trend-card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 18px; border-radius: 12px; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px); ${cardBorder} transition: transform 0.18s, box-shadow 0.18s;">
        <!-- 상단 헤더: 순위 + 뱃지 -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 26px; padding: 0 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; ${badgeStyle}">
                ${rankLabel}
              </span>
              ${item.traffic ? `
                <span style="font-size: 0.75rem; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 3px 8px; border-radius: 6px; font-weight: 600; border: 1px solid rgba(56, 189, 248, 0.2);">
                  🔥 ${this.escapeHtml(item.traffic)}
                </span>
              ` : ''}
              ${item.isNew ? `
                <span style="font-size: 0.72rem; color: #f43f5e; background: rgba(244, 63, 94, 0.15); padding: 2px 6px; border-radius: 6px; font-weight: 700; border: 1px solid rgba(244, 63, 94, 0.3);">
                  NEW
                </span>
              ` : ''}
            </div>
            <span style="font-size: 0.74rem; color: #64748b; font-weight: 500;">
              ${this.escapeHtml(item.sourceName || '')}
            </span>
          </div>

          <!-- 메인 콘텐츠 영역 (썸네일 + 제목 + 설명) -->
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            ${item.thumbnail ? `
              <div style="flex-shrink: 0; width: 68px; height: 68px; border-radius: 8px; overflow: hidden; background: #1e293b; border: 1px solid rgba(255,255,255,0.06);">
                <img src="${this.escapeHtml(item.thumbnail)}" alt="썸네일" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
              </div>
            ` : ''}
            <div style="flex-grow: 1; min-width: 0;">
              <a href="${this.escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: #f8fafc; font-size: 1.02rem; font-weight: 700; line-height: 1.35; text-decoration: none; transition: color 0.15s;" onmouseover="this.style.color='#38bdf8'" onmouseout="this.style.color='#f8fafc'">
                ${this.escapeHtml(item.title || item.keyword)}
              </a>
              ${item.description ? `
                <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: #94a3b8; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                  ${this.escapeHtml(item.description)}
                </p>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- 하단 액션 버튼 바 -->
        <div style="margin-top: 8px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            <a href="${this.escapeHtml(item.link || '#')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; font-size: 0.76rem; border-radius: 6px; background: rgba(51, 65, 85, 0.6); color: #cbd5e1; text-decoration: none; border: 1px solid rgba(255,255,255,0.08);">
              🔗 원문 바로가기
            </a>
            <a href="${this.escapeHtml(item.portalSearchUrl || '#')}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; font-size: 0.76rem; border-radius: 6px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; text-decoration: none; border: 1px solid rgba(56, 189, 248, 0.25);">
              🔍 포털 검색
            </a>
            <button type="button" class="btn-ai-explain" data-type="keyword" data-card="${cardId}" data-keyword="${this.escapeHtml(item.keyword || item.title)}" data-desc="${this.escapeHtml(item.description || '')}" data-source="${this.escapeHtml(item.sourceName || '')}" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; font-size: 0.76rem; border-radius: 6px; background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); cursor: pointer;">
              🤖 왜 떴을까?
            </button>
          </div>

          <!-- AI 요약 아코디언 컨테이너 -->
          <div id="${cardId}-ai-box" class="ai-explain-box" style="display: ${cachedExplain ? 'block' : 'none'}; margin-top: 10px; padding: 10px 12px; background: rgba(24, 24, 37, 0.95); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; font-size: 0.79rem; line-height: 1.5; color: #e2e8f0; white-space: pre-line;">
            ${cachedExplain ? cachedExplain : ''}
          </div>
        </div>
      </div>
    `;
  }

  getCurrentItems() {
    if (this.activeTab === 'google') return this.data.google || [];
    if (this.activeTab === 'blackkiwi') return this.data.blackkiwi || [];
    if (this.activeTab === 'daum') return this.data.daum || [];
    if (this.activeTab === 'namu') return this.data.namu || [];
    if (this.activeTab === 'detailed') return this.data.detailedRankings[this.detailedCategory] || [];
    if (this.activeTab === 'kyobo') return this.data.kyobo || [];
    if (this.activeTab === 'playboard') return this.data.playboard || [];
    return [];
  }

  filterItems(items) {
    if (!this.searchQuery.trim()) return items;
    const q = this.searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const kw = (item.keyword || item.name || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const author = (item.author || '').toLowerCase();
      const publisher = (item.publisher || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const cafe = (item.cafeName || '').toLowerCase();
      const domain = (item.domain || '').toLowerCase();
      const channel = (item.channelName || '').toLowerCase();
      const topic = (item.topicName || '').toLowerCase();
      return kw.includes(q) || title.includes(q) || desc.includes(q) || author.includes(q) || publisher.includes(q) || category.includes(q) || cafe.includes(q) || domain.includes(q) || channel.includes(q) || topic.includes(q);
    });
  }

  getTabThemeColor() {
    if (this.activeTab === 'google') return '#3b82f6';
    if (this.activeTab === 'blackkiwi') return '#10b981';
    if (this.activeTab === 'daum') return '#e11d48';
    if (this.activeTab === 'namu') return '#00a495';
    if (this.activeTab === 'detailed') return '#8b5cf6';
    if (this.activeTab === 'kyobo') return '#059669';
    if (this.activeTab === 'playboard') return '#dc2626';
    return '#3b82f6';
  }

  getTabDescription() {
    if (this.activeTab === 'google') {
      return '🌐 <strong>Google Trends (대한민국)</strong>: 구글 검색엔진에서 실시간으로 대중의 관심이 집중된 급상승 검색어와 관련 주요 뉴스 기사를 제공합니다.';
    }
    if (this.activeTab === 'blackkiwi') {
      return '🥝 <strong>BlackKiwi 트렌드</strong>: 네이버 및 국내 포털 빅데이터를 기반으로 실시간 급상승 키워드, 검색 트래픽 및 신규 진입 여부를 정밀 분석합니다.';
    }
    if (this.activeTab === 'daum') {
      return '☕ <strong>Daum 카페 모바일 랭킹</strong>: 국내 대표 커뮤니티 다음 카페의 실시간 인기글 1~20위를 모아 네티즌 사이에서 가장 화제가 된 이슈를 보여줍니다.';
    }
    if (this.activeTab === 'namu') {
      return '🌳 <strong>나무위키 실시간 인기 검색어</strong>: 대한민국 최대 위키 플랫폼 나무위키에서 지금 이용자들의 검색과 열람이 집중되고 있는 실시간 TOP 1~10위 키워드와 AI 배경 분석을 제공합니다.';
    }
    if (this.activeTab === 'detailed') {
      const catName = this.getCategoryName(this.detailedCategory);
      return `🏆 <strong>Detailed.com 분야별 랭킹 [${catName}]</strong>: Ahrefs 백링크 및 트래픽 분석 기반 전 세계 분야별 TOP 1~20위 웹사이트 및 블로그 순위입니다.`;
    }
    if (this.activeTab === 'kyobo') {
      return '📚 <strong>교보문고 종합 주간 베스트셀러</strong>: 국내 최대 서점 교보문고의 실시간 주간 판매 데이터 기반 종합 1~20위 인기 도서 및 AI 서평 포인트를 제공합니다.';
    }
    if (this.activeTab === 'playboard') {
      return '🎬 <strong>Playboard 유튜브 토픽차트 분야별 1위</strong>: AI가 분류한 17개 핵심 카테고리(주식, 먹방, 요리, 애견, 캠핑, 버튜버 등)의 실시간 1위 채널과 인기 비결을 제공합니다.';
    }
    return '';
  }

  getCategoryName(slug) {
    const found = (this.detailedCategories || []).find(c => c.slug === slug);
    return found ? found.name : slug;
  }

  getTabSourceUrl() {
    if (this.activeTab === 'google') return 'https://trends.google.co.kr/trending?geo=KR';
    if (this.activeTab === 'blackkiwi') return 'https://blackkiwi.net/service/trend';
    if (this.activeTab === 'daum') return 'https://m.cafe.daum.net/';
    if (this.activeTab === 'namu') return 'https://namu.wiki/';
    if (this.activeTab === 'detailed') return `https://detailed.com/${this.detailedCategory}/`;
    if (this.activeTab === 'kyobo') return 'https://store.kyobobook.co.kr/bestseller/total/weekly?period=002';
    if (this.activeTab === 'playboard') return 'https://playboard.co/youtube-ranking';
    return '#';
  }

  getTimeAgo(timestamp) {
    if (!timestamp) return '알 수 없음';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return new Date(timestamp).toLocaleDateString('ko-KR');
  }

  bindHeaderEvents() {
    const btnSync = document.getElementById('btn-trend-sync');
    if (btnSync) {
      btnSync.onclick = () => this.loadData(true);
    }
  }

  bindEvents() {
    this.bindHeaderEvents();

    // 4개 탭 버튼 클릭 이벤트
    const tabBtns = this.container.querySelectorAll('.trend-tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          if (this.activeTab === 'detailed' && (!this.data.detailedRankings[this.detailedCategory] || this.data.detailedRankings[this.detailedCategory].length === 0)) {
            this.loadDetailedRankings(this.detailedCategory);
          } else {
            this.render();
          }
        }
      };
    });

    // Detailed 카테고리 칩 버튼 클릭 이벤트
    const chipBtns = this.container.querySelectorAll('.trend-chip-btn');
    chipBtns.forEach(btn => {
      btn.onclick = () => {
        const cat = btn.getAttribute('data-cat');
        if (cat && cat !== this.detailedCategory) {
          this.detailedCategory = cat;
          this.loadDetailedRankings(cat);
        }
      };
    });

    // Detailed 카테고리 드롭다운 선택 이벤트
    const catSelect = document.getElementById('detailed-cat-select');
    if (catSelect) {
      catSelect.onchange = (e) => {
        const cat = e.target.value;
        if (cat && cat !== this.detailedCategory) {
          this.detailedCategory = cat;
          this.loadDetailedRankings(cat);
        }
      };
    }

    // 검색 인풋 이벤트
    const searchInput = document.getElementById('trend-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value;
        const currentItems = this.getCurrentItems();
        const filtered = this.filterItems(currentItems);
        const grid = this.container.querySelector('.trend-cards-grid');
        if (grid) {
          if (filtered.length === 0) {
            grid.innerHTML = `
              <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #94a3b8;">
                "${this.escapeHtml(this.searchQuery)}" 검색 결과가 없습니다.
              </div>
            `;
          } else {
            grid.innerHTML = filtered.map(item => this.renderCardHtml(item)).join('');
            this.bindCardEvents();
          }
        }
      };
    }

    this.bindCardEvents();
  }

  bindCardEvents() {
    // 1. AI 요약 / 사이트 분석 버튼 클릭 이벤트
    const aiBtns = this.container.querySelectorAll('.btn-ai-explain');
    aiBtns.forEach(btn => {
      btn.onclick = async () => {
        const cardId = btn.getAttribute('data-card');
        const type = btn.getAttribute('data-type') || 'keyword';
        const keyword = btn.getAttribute('data-keyword') || '';
        const title = btn.getAttribute('data-title') || keyword;
        const author = btn.getAttribute('data-author') || '';
        const publisher = btn.getAttribute('data-publisher') || '';
        const category = btn.getAttribute('data-category') || '';
        const channelName = btn.getAttribute('data-channel') || '';
        const topicName = btn.getAttribute('data-topic') || '';
        const subscriberCount = btn.getAttribute('data-sub') || '';
        const dailyViews = btn.getAttribute('data-views') || '';
        const latestVideoTitle = btn.getAttribute('data-video') || '';
        const keywords = btn.getAttribute('data-keywords') || '';
        const domain = btn.getAttribute('data-domain') || '';
        const desc = btn.getAttribute('data-desc') || '';
        const source = btn.getAttribute('data-source') || '';
        const box = document.getElementById(`${cardId}-ai-box`);
        if (!box) return;

        // 이미 열려 있으면 토글 닫기
        if (box.style.display === 'block' && !box.textContent.includes('분석 중') && !box.textContent.includes('요약 중')) {
          box.style.display = 'none';
          return;
        }

        const cacheKey = channelName || title || keyword || domain;
        if (this.aiExplainCache[cacheKey]) {
          box.textContent = this.aiExplainCache[cacheKey];
          box.style.display = 'block';
          return;
        }

        // 로딩 상태 표시
        box.style.display = 'block';
        if (type === 'youtube') {
          box.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; color: #f87171;">🤖 Gemini AI가 채널의 핵심 매력과 분야 1위 달성 비결을 3줄로 분석하는 중입니다... <span style="display: inline-block; animation: trendSpin 1s infinite linear;">⚡</span></span>`;
        } else if (type === 'book') {
          box.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; color: #34d399;">🤖 Gemini AI가 도서의 핵심 주제와 베스트셀러 인기 비결을 3줄로 요약하는 중입니다... <span style="display: inline-block; animation: trendSpin 1s infinite linear;">⚡</span></span>`;
        } else if (type === 'website') {
          box.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; color: #c084fc;">🤖 Gemini AI가 핵심 서비스와 비즈니스 모델을 3줄로 분석하는 중입니다... <span style="display: inline-block; animation: trendSpin 1s infinite linear;">⚡</span></span>`;
        } else if (type === 'namu') {
          box.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; color: #2dd4bf;">🤖 Gemini AI가 나무위키 실시간 검색어 급상승 배경과 이슈를 3줄로 분석하는 중입니다... <span style="display: inline-block; animation: trendSpin 1s infinite linear;">⚡</span></span>`;
        } else {
          box.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; color: #c084fc;">🤖 Gemini AI가 이슈 배경과 시사점을 3줄로 분석하는 중입니다... <span style="display: inline-block; animation: trendSpin 1s infinite linear;">⚡</span></span>`;
        }

        try {
          const res = await fetch('/api/trends/ai-explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: type,
              keyword: keyword,
              title: title,
              author: author,
              publisher: publisher,
              category: category,
              channelName: channelName,
              topicName: topicName,
              subscriberCount: subscriberCount,
              dailyViews: dailyViews,
              latestVideoTitle: latestVideoTitle,
              keywords: keywords,
              domain: domain,
              description: desc,
              sourceName: source
            })
          });
          const json = await res.json();
          if (json.success && json.explanation) {
            this.aiExplainCache[cacheKey] = json.explanation;
            box.textContent = json.explanation;
          } else {
            box.textContent = type === 'youtube'
              ? '💡 일시적으로 AI 채널 분석을 불러오지 못했습니다. 상단 [유튜브 바로가기]를 이용해주세요.'
              : (type === 'book' 
                ? '💡 일시적으로 AI 서평을 불러오지 못했습니다. 상단 [교보문고 바로가기]를 이용해주세요.'
                : (type === 'namu'
                  ? '💡 일시적으로 AI 실검 배경 분석을 불러오지 못했습니다. 상단 [나무위키 문서]를 이용해주세요.'
                  : '💡 일시적으로 AI 분석을 불러오지 못했습니다. 상단 [사이트 방문]을 이용해주세요.'));
          }
        } catch (e) {
          box.textContent = type === 'youtube'
            ? '💡 일시적으로 AI 채널 분석을 불러오지 못했습니다. 상단 [유튜브 바로가기]를 이용해주세요.'
            : (type === 'book'
              ? '💡 일시적으로 AI 서평을 불러오지 못했습니다. 상단 [교보문고 바로가기]를 이용해주세요.'
              : (type === 'namu'
                ? '💡 일시적으로 AI 실검 배경 분석을 불러오지 못했습니다. 상단 [나무위키 문서]를 이용해주세요.'
                : '💡 일시적으로 AI 분석을 불러오지 못했습니다. 상단 [사이트 방문]을 이용해주세요.'));
        }
      };
    });

    // 2. 한국어 요약/번역 버튼 클릭 이벤트
    const krBtns = this.container.querySelectorAll('.btn-kr-trans');
    krBtns.forEach(btn => {
      btn.onclick = async () => {
        const cardId = btn.getAttribute('data-card');
        const name = btn.getAttribute('data-name');
        const desc = btn.getAttribute('data-desc');
        const box = document.getElementById(`${cardId}-ai-box`);
        if (!box) return;

        if (box.style.display === 'block' && box.getAttribute('data-mode') === 'trans') {
          box.style.display = 'none';
          return;
        }

        const transKey = `trans_${name}`;
        if (this.aiExplainCache[transKey]) {
          box.setAttribute('data-mode', 'trans');
          box.textContent = this.aiExplainCache[transKey];
          box.style.display = 'block';
          return;
        }

        box.setAttribute('data-mode', 'trans');
        box.style.display = 'block';
        box.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; color: #34d399;">🇰🇷 한국어로 상세 설명을 번역/요약하는 중입니다... <span style="display: inline-block; animation: trendSpin 1s infinite linear;">⚡</span></span>`;

        try {
          const res = await fetch('/api/trends/ai-explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'website',
              keyword: name,
              description: `[영문 설명 번역 및 한줄 요약 요청]: ${desc}`,
              sourceName: 'Detailed.com'
            })
          });
          const json = await res.json();
          if (json.success && json.explanation) {
            this.aiExplainCache[transKey] = json.explanation;
            box.textContent = json.explanation;
          } else {
            box.textContent = `💡 [${name}]: ${desc}`;
          }
        } catch (e) {
          box.textContent = `💡 [${name}]: ${desc}`;
        }
      };
    });
  }

  updateSyncButtonState(isSyncing) {
    const btnSync = document.getElementById('btn-trend-sync');
    if (!btnSync) return;
    const icon = btnSync.querySelector('.sync-icon');
    if (isSyncing) {
      btnSync.disabled = true;
      btnSync.style.opacity = '0.7';
      btnSync.style.cursor = 'not-allowed';
      if (icon) {
        icon.style.display = 'inline-block';
        icon.style.animation = 'trendSpin 1s infinite linear';
      }
    } else {
      btnSync.disabled = false;
      btnSync.style.opacity = '1';
      btnSync.style.cursor = 'pointer';
      if (icon) {
        icon.style.animation = 'none';
      }
    }
  }

  renderError(msg) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div style="max-width: 600px; margin: 60px auto; padding: 30px; text-align: center; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; color: #f8fafc;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">⚠️</div>
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">트렌드 순위를 불러오지 못했습니다</h2>
        <p style="font-size: 0.85rem; color: #fca5a5; margin-bottom: 20px;">${this.escapeHtml(msg || '네트워크 연결 상태를 확인해주세요.')}</p>
        <button id="btn-trend-retry" class="btn btn-primary" style="padding: 8px 18px; border-radius: 8px; font-weight: 600; cursor: pointer;">
          다시 시도
        </button>
      </div>
    `;
    const btnRetry = document.getElementById('btn-trend-retry');
    if (btnRetry) btnRetry.onclick = () => this.loadData(true);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.TrendRankingView = new TrendRankingView();
