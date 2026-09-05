// app/views/sapSuiteView.js - SAP Integration Suite 뷰 모듈
window.SapSuiteView = {
  currentTab: 'news', // 'news', 'assistant', 'knowledge'
  activeCategory: 'All',
  activeTopic: 'All',
  chatMessages: [
    {
      sender: 'bot',
      text: '안녕하세요! SAP Integration Suite 및 Cloud Integration 컨설팅/개발 도우미입니다. ⚡\n\nGroovy 스크립트 작성, iFlow 엔터프라이즈 패턴, 어댑터 설정, PO 마이그레이션 등 실무 개발과 아키텍처에 대해 무엇이든 질문해 주세요.',
      time: '지금'
    }
  ],

  init() {
    this.render();
    this.bindEvents();
  },

  render() {
    const container = document.getElementById('view-sap-suite');
    if (!container) return;

    const newsCount = window.SapSuiteModel.news.length;
    const knowCount = window.SapSuiteModel.knowledge.length;

    container.innerHTML = `
      <div class="sap-suite-container">
        <!-- 상단 헤더 -->
        <div class="sap-suite-header">
          <div class="sap-header-left">
            <div class="sap-header-title-row">
              <span class="sap-badge-icon">⚡</span>
              <h2>SAP Integration Suite</h2>
              <span class="sap-status-pill live">
                <span class="pulse-dot"></span> 에이전트 실시간 연동
              </span>
            </div>
            <p class="sap-header-desc">
              SAP Community & Help Portal 최신 릴리스 자동 수집 및 Groovy/iFlow 실무 컨설팅 도우미
            </p>
          </div>
          <div class="sap-header-stats">
            <div class="sap-stat-box">
              <span class="stat-num" id="sap-stat-news-count">${newsCount}</span>
              <span class="stat-label">수집된 소식</span>
            </div>
            <div class="sap-stat-box">
              <span class="stat-num">${knowCount}</span>
              <span class="stat-label">개발 지식베이스</span>
            </div>
          </div>
        </div>

        <!-- 서브 탭 내비게이션 -->
        <div class="sap-tab-nav">
          <button class="sap-tab-btn ${this.currentTab === 'news' ? 'active' : ''}" data-tab="news">
            📰 최신 소식 & 릴리스 레이더 (${newsCount})
          </button>
          <button class="sap-tab-btn ${this.currentTab === 'assistant' ? 'active' : ''}" data-tab="assistant">
            🤖 AI 개발 & 컨설팅 도우미
          </button>
          <button class="sap-tab-btn ${this.currentTab === 'knowledge' ? 'active' : ''}" data-tab="knowledge">
            📚 기술 지식 & 가이드 (${knowCount})
          </button>
        </div>

        <!-- 탭 컨텐츠 영역 -->
        <div class="sap-tab-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;

    this.postRender();
  },

  renderTabContent() {
    if (this.currentTab === 'news') return this.renderNewsTab();
    if (this.currentTab === 'assistant') return this.renderAssistantTab();
    if (this.currentTab === 'knowledge') return this.renderKnowledgeTab();
    return '';
  },

  // 1. 뉴스 탭
  renderNewsTab() {
    const categories = ['All', 'Release', 'Best Practice', 'Migration', 'Blog'];
    const filtered = window.SapSuiteModel.getFilteredNews(this.activeCategory, this.newsSearchTerm || '');

    return `
      <div class="sap-news-section">
        <div class="sap-toolbar">
          <div class="sap-filter-pills">
            ${categories.map(cat => `
              <button class="filter-pill ${this.activeCategory === cat ? 'active' : ''}" data-category="${cat}">
                ${cat === 'All' ? '전체' : cat}
              </button>
            `).join('')}
          </div>
          <div class="sap-search-box">
            <input type="text" id="sap-news-search" placeholder="최신 소식 검색 (키워드, 제목, 내용)..." value="${this.newsSearchTerm || ''}" />
            <button id="btn-refresh-sap-news" class="btn-icon" title="즉시 새로고침">🔄</button>
          </div>
        </div>

        <div class="sap-news-grid">
          ${filtered.length > 0 ? filtered.map(item => `
            <div class="sap-news-card">
              <div class="news-card-header">
                <span class="news-cat-badge ${item.category.toLowerCase().replace(/\s+/g, '-')}">${item.category}</span>
                <span class="news-source-badge">${item.source}</span>
                <span class="news-date">${this.formatDate(item.published_at)}</span>
              </div>
              <h3 class="news-title">
                <a href="${item.source_url}" target="_blank" rel="noopener noreferrer">
                  ${this.escapeHtml(item.title)}
                </a>
              </h3>
              <p class="news-summary">${this.escapeHtml(item.summary)}</p>
              <div class="news-card-footer">
                <a href="${item.source_url}" target="_blank" rel="noopener noreferrer" class="news-link-btn">
                  원문 읽기 ↗
                </a>
              </div>
            </div>
          `).join('') : `
            <div class="sap-empty-state">
              <span class="empty-icon">📭</span>
              <p>해당 조건의 SAP 소식이 없습니다.</p>
            </div>
          `}
        </div>
      </div>
    `;
  },

  // 2. AI 컨설팅 도우미 탭
  renderAssistantTab() {
    return `
      <div class="sap-assistant-section">
        <!-- 퀵 프롬프트 액션 바 -->
        <div class="sap-quick-prompts">
          <span class="quick-label">⚡ 빠른 질문:</span>
          <button class="prompt-chip" data-prompt="Groovy 스크립트 작성: JSON 페이로드를 파싱해 특정 필드를 암호화하고 커스텀 헤더를 세팅하는 코드 알려줘">
            📜 Groovy JSON 파싱 & 헤더 제어
          </button>
          <button class="prompt-chip" data-prompt="대용량 배치 데이터 처리를 위한 General Splitter와 Aggregator 최적 구성 패턴 및 멱등성 보장 방안 알려줘">
            🔄 Splitter & Aggregator 패턴
          </button>
          <button class="prompt-chip" data-prompt="SAP PO에서 SAP Cloud Integration으로 마이그레이션할 때의 핵심 단계와 체크리스트를 정리해줘">
            🚀 PO ➔ Cloud Integration 마이그레이션
          </button>
          <button class="prompt-chip" data-prompt="REST 어댑터 호출 시 4xx, 5xx 에러가 발생해도 iFlow가 즉시 중단되지 않게 예외 처리하는 방법 알려줘">
            🛡️ REST 어댑터 에러 핸들링
          </button>
        </div>

        <!-- 대화 스레드 -->
        <div class="sap-chat-box" id="sap-chat-messages">
          ${this.chatMessages.map(msg => `
            <div class="chat-message ${msg.sender}">
              <div class="msg-avatar">${msg.sender === 'bot' ? '⚡' : '👤'}</div>
              <div class="msg-bubble">
                <div class="msg-text">${this.formatMarkdown(msg.text)}</div>
                <div class="msg-time">${msg.time}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 입력 바 -->
        <div class="sap-chat-input-bar">
          <textarea id="sap-chat-input" rows="2" placeholder="SAP Integration Suite 개발, Groovy 코드, iFlow 아키텍처, 트러블슈팅에 대해 질문하세요... (Enter로 전송)"></textarea>
          <button id="btn-send-sap-chat" class="btn btn-primary">
            <span>질문하기</span> 🚀
          </button>
        </div>
      </div>
    `;
  },

  // 3. 지식 베이스 탭
  renderKnowledgeTab() {
    const topics = ['All', 'Groovy Script', 'Message Mapping', 'Integration Patterns', 'Adapters', 'Security', 'Migration'];
    const filtered = window.SapSuiteModel.getFilteredKnowledge(this.activeTopic, this.knowSearchTerm || '');

    return `
      <div class="sap-knowledge-section">
        <div class="sap-toolbar">
          <div class="sap-filter-pills">
            ${topics.map(t => `
              <button class="filter-pill ${this.activeTopic === t ? 'active' : ''}" data-topic="${t}">
                ${t === 'All' ? '전체' : t}
              </button>
            `).join('')}
          </div>
          <div class="sap-search-box">
            <input type="text" id="sap-know-search" placeholder="지식 베이스 검색 (제목, 코드, 태그)..." value="${this.knowSearchTerm || ''}" />
          </div>
        </div>

        <div class="sap-knowledge-list">
          ${filtered.length > 0 ? filtered.map(item => `
            <div class="sap-know-card">
              <div class="know-card-header">
                <span class="know-topic-badge">${item.topic}</span>
                <h3 class="know-title">${this.escapeHtml(item.title)}</h3>
                ${item.doc_url ? `
                  <a href="${item.doc_url}" target="_blank" rel="noopener noreferrer" class="know-doc-link" title="SAP Help Portal 공식 문서">
                    공식 문서 ↗
                  </a>
                ` : ''}
              </div>
              <div class="know-card-body">
                ${this.formatMarkdown(item.content)}
              </div>
              <div class="know-card-footer">
                <div class="know-tags">
                  ${(item.tags || []).map(t => `<span class="know-tag">#${t}</span>`).join('')}
                </div>
                <button class="btn-copy-know" data-content="${encodeURIComponent(item.content)}">📋 내용 복사</button>
              </div>
            </div>
          `).join('') : `
            <div class="sap-empty-state">
              <span class="empty-icon">🔍</span>
              <p>해당 조건의 지식 베이스 항목이 없습니다.</p>
            </div>
          `}
        </div>
      </div>
    `;
  },

  bindEvents() {
    const container = document.getElementById('view-sap-suite');
    if (!container) return;

    // 탭 전환 이벤트
    container.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.sap-tab-btn');
      if (tabBtn) {
        this.currentTab = tabBtn.dataset.tab;
        this.render();
        return;
      }

      // 뉴스 카테고리 필터
      const catPill = e.target.closest('.filter-pill[data-category]');
      if (catPill) {
        this.activeCategory = catPill.dataset.category;
        this.render();
        return;
      }

      // 지식 토픽 필터
      const topicPill = e.target.closest('.filter-pill[data-topic]');
      if (topicPill) {
        this.activeTopic = topicPill.dataset.topic;
        this.render();
        return;
      }

      // 퀵 프롬프트 클릭
      const promptChip = e.target.closest('.prompt-chip');
      if (promptChip) {
        const prompt = promptChip.dataset.prompt;
        const input = document.getElementById('sap-chat-input');
        if (input) {
          input.value = prompt;
          this.handleSendMessage();
        }
        return;
      }

      // 지식 내용 복사 버튼
      const copyBtn = e.target.closest('.btn-copy-know');
      if (copyBtn) {
        const text = decodeURIComponent(copyBtn.dataset.content || '');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = '✅ 복사됨!';
            setTimeout(() => { copyBtn.textContent = '📋 내용 복사'; }, 2000);
          });
        }
        return;
      }

      // 새로고침 버튼
      if (e.target.closest('#btn-refresh-sap-news')) {
        window.SapSuiteModel.loadNews().then(() => this.render());
        return;
      }

      // 전송 버튼
      if (e.target.closest('#btn-send-sap-chat')) {
        this.handleSendMessage();
        return;
      }
    });

    // 입력 필드 검색 및 Enter 전송 이벤트
    container.addEventListener('input', (e) => {
      if (e.target.id === 'sap-news-search') {
        this.newsSearchTerm = e.target.value;
        const grid = container.querySelector('.sap-news-grid');
        if (grid) {
          const filtered = window.SapSuiteModel.getFilteredNews(this.activeCategory, this.newsSearchTerm);
          // 부분 리렌더링
          this.renderNewsGrid(grid, filtered);
        }
      } else if (e.target.id === 'sap-know-search') {
        this.knowSearchTerm = e.target.value;
        const list = container.querySelector('.sap-knowledge-list');
        if (list) {
          const filtered = window.SapSuiteModel.getFilteredKnowledge(this.activeTopic, this.knowSearchTerm);
          this.renderKnowList(list, filtered);
        }
      }
    });

    container.addEventListener('keydown', (e) => {
      if (e.target.id === 'sap-chat-input' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
  },

  renderNewsGrid(grid, items) {
    if (items.length === 0) {
      grid.innerHTML = '<div class="sap-empty-state"><span class="empty-icon">📭</span><p>해당 조건의 SAP 소식이 없습니다.</p></div>';
      return;
    }
    grid.innerHTML = items.map(item => `
      <div class="sap-news-card">
        <div class="news-card-header">
          <span class="news-cat-badge ${item.category.toLowerCase().replace(/\s+/g, '-')}">${item.category}</span>
          <span class="news-source-badge">${item.source}</span>
          <span class="news-date">${this.formatDate(item.published_at)}</span>
        </div>
        <h3 class="news-title">
          <a href="${item.source_url}" target="_blank" rel="noopener noreferrer">
            ${this.escapeHtml(item.title)}
          </a>
        </h3>
        <p class="news-summary">${this.escapeHtml(item.summary)}</p>
        <div class="news-card-footer">
          <a href="${item.source_url}" target="_blank" rel="noopener noreferrer" class="news-link-btn">
            원문 읽기 ↗
          </a>
        </div>
      </div>
    `).join('');
  },

  renderKnowList(list, items) {
    if (items.length === 0) {
      list.innerHTML = '<div class="sap-empty-state"><span class="empty-icon">🔍</span><p>해당 조건의 지식 베이스 항목이 없습니다.</p></div>';
      return;
    }
    list.innerHTML = items.map(item => `
      <div class="sap-know-card">
        <div class="know-card-header">
          <span class="know-topic-badge">${item.topic}</span>
          <h3 class="know-title">${this.escapeHtml(item.title)}</h3>
          ${item.doc_url ? `
            <a href="${item.doc_url}" target="_blank" rel="noopener noreferrer" class="know-doc-link" title="SAP Help Portal 공식 문서">
              공식 문서 ↗
            </a>
          ` : ''}
        </div>
        <div class="know-card-body">
          ${this.formatMarkdown(item.content)}
        </div>
        <div class="know-card-footer">
          <div class="know-tags">
            ${(item.tags || []).map(t => `<span class="know-tag">#${t}</span>`).join('')}
          </div>
          <button class="btn-copy-know" data-content="${encodeURIComponent(item.content)}">📋 내용 복사</button>
        </div>
      </div>
    `).join('');
  },

  async handleSendMessage() {
    const input = document.getElementById('sap-chat-input');
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;

    input.value = '';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 사용자 메시지 추가
    this.chatMessages.push({ sender: 'user', text: q, time: nowTime });
    
    // 봇 로딩 메시지 추가
    this.chatMessages.push({ sender: 'bot', text: '⚡ SAP 통합 지식베이스를 분석하여 솔루션을 도출하고 있습니다...', time: nowTime, loading: true });
    this.updateChatUI();

    // 응답 호출
    const result = await window.SapSuiteModel.askConsulting(q);
    
    // 로딩 제거 및 최종 응답 반영
    this.chatMessages.pop();
    if (result.success) {
      this.chatMessages.push({ sender: 'bot', text: result.answer, time: nowTime });
    } else {
      this.chatMessages.push({ sender: 'bot', text: `⚠️ 오류가 발생했습니다: ${result.message}`, time: nowTime });
    }
    this.updateChatUI();
  },

  updateChatUI() {
    const chatContainer = document.getElementById('sap-chat-messages');
    if (!chatContainer) return;
    chatContainer.innerHTML = this.chatMessages.map(msg => `
      <div class="chat-message ${msg.sender} ${msg.loading ? 'loading' : ''}">
        <div class="msg-avatar">${msg.sender === 'bot' ? '⚡' : '👤'}</div>
        <div class="msg-bubble">
          <div class="msg-text">${this.formatMarkdown(msg.text)}</div>
          <div class="msg-time">${msg.time}</div>
        </div>
      </div>
    `).join('');
    chatContainer.scrollTop = chatContainer.scrollHeight;
  },

  postRender() {
    const chatContainer = document.getElementById('sap-chat-messages');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  },

  formatMarkdown(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);

    // 코드 블록 (```groovy ... ``` 등)
    html = html.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-block-wrapper"><div class="code-lang">${lang || 'CODE'}</div><pre><code class="language-${lang}">${code}</code></pre></div>`;
    });

    // 인라인 코드
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 볼드체
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 헤딩
    html = html.replace(/^### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="md-h3">$1</h3>');

    // 줄바꿈
    html = html.replace(/\n/g, '<br/>');

    return html;
  },

  formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return isoStr;
    }
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
