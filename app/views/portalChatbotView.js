// app/views/portalChatbotView.js - 마당 포털 전체 데이터 검색 & AI 챗봇 뷰
(function () {
  'use strict';

  window.PortalChatbotView = {
    isOpen: false,
    history: [],

    init() {
      const openBtn = document.getElementById('openChatbotBtn');
      const closeBtn = document.getElementById('chatbotCloseBtn');
      const resetBtn = document.getElementById('chatbotResetBtn');
      const form = document.getElementById('chatbotInputForm');
      const chipsBar = document.getElementById('chatbotChipsBar');

      if (openBtn) {
        openBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleChatbot();
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closeChatbot();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.resetChat();
        });
      }

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleSendMessage();
        });
      }

      if (chipsBar) {
        chipsBar.addEventListener('click', (e) => {
          const chip = e.target.closest('.chatbot-chip');
          if (chip) {
            const query = chip.getAttribute('data-query') || chip.textContent;
            this.sendQuery(query);
          }
        });
      }

      // 초기 웰컴 메시지 렌더링
      this.resetChat();
    },

    openChatbot() {
      const widget = document.getElementById('portalChatbotWidget');
      if (widget) {
        widget.classList.remove('hidden');
        widget.setAttribute('aria-hidden', 'false');
        this.isOpen = true;
        const input = document.getElementById('chatbotInput');
        if (input) {
          setTimeout(() => input.focus(), 150);
        }
      }
    },

    closeChatbot() {
      const widget = document.getElementById('portalChatbotWidget');
      if (widget) {
        widget.classList.add('hidden');
        widget.setAttribute('aria-hidden', 'true');
        this.isOpen = false;
      }
    },

    toggleChatbot() {
      if (this.isOpen) {
        this.closeChatbot();
      } else {
        this.openChatbot();
      }
    },

    resetChat() {
      this.history = [];
      const msgBox = document.getElementById('chatbotMessages');
      if (!msgBox) return;

      msgBox.innerHTML = `
        <div class="chatbot-welcome-box">
          <h5>🤖 안녕하세요! 포털 AI 데이터 검색 비서입니다.</h5>
          <p>포털에 등록된 <strong>API 목록, AI 모델 도감, AI 용어사전, SAP 지식/뉴스, 증시 분석 리포트</strong> 등 모든 데이터를 실시간으로 찾아드리고 종합 요약해 드립니다.</p>
          <p style="margin-top: 6px; font-size: 0.8rem; color: #94a3b8;">궁금한 키워드를 입력하거나 아래의 추천 질문 칩을 클릭해 보세요!</p>
        </div>
      `;
    },

    scrollToBottom() {
      const msgBox = document.getElementById('chatbotMessages');
      if (msgBox) {
        msgBox.scrollTop = msgBox.scrollHeight;
      }
    },

    handleSendMessage() {
      const input = document.getElementById('chatbotInput');
      if (!input) return;
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      this.sendQuery(q);
    },

    async sendQuery(query) {
      if (!query || !query.trim()) return;
      const cleanQuery = query.trim();

      // 유저 메시지 렌더링
      this.appendUserMessage(cleanQuery);
      this.history.push({ role: 'user', content: cleanQuery });

      // 로딩 표시
      const loadingId = this.showLoading();
      this.scrollToBottom();

      try {
        let result = null;
        try {
          const res = await fetch('/api/portal-search-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: cleanQuery, history: this.history.slice(-6) })
          });
          if (res.ok) {
            result = await res.json();
          }
        } catch (netErr) {
          console.warn('[PortalChatbot] Server API unreachable, falling back to local search:', netErr);
        }

        this.removeLoading(loadingId);

        if (result && result.success && (result.answer || (result.items && result.items.length > 0))) {
          this.appendAssistantMessage(result.answer, result.items);
          this.history.push({ role: 'assistant', content: result.answer });
        } else {
          // 로컬 인메모리 스마트 검색 폴백
          const fallbackData = this.localSearchAndSynthesize(cleanQuery);
          this.appendAssistantMessage(fallbackData.answer, fallbackData.items);
          this.history.push({ role: 'assistant', content: fallbackData.answer });
        }
      } catch (err) {
        this.removeLoading(loadingId);
        const fallbackData = this.localSearchAndSynthesize(cleanQuery);
        this.appendAssistantMessage(fallbackData.answer, fallbackData.items);
      }

      this.scrollToBottom();
    },

    appendUserMessage(text) {
      const msgBox = document.getElementById('chatbotMessages');
      if (!msgBox) return;

      const div = document.createElement('div');
      div.className = 'chat-msg user';
      div.innerHTML = `
        <div class="chat-bubble">
          <p>${this.escapeHtml(text)}</p>
        </div>
      `;
      msgBox.appendChild(div);
    },

    appendAssistantMessage(markdownText, items) {
      const msgBox = document.getElementById('chatbotMessages');
      if (!msgBox) return;

      const div = document.createElement('div');
      div.className = 'chat-msg assistant';

      let itemsHtml = '';
      if (Array.isArray(items) && items.length > 0) {
        itemsHtml = `
          <div class="chatbot-cards-container">
            <div style="font-size: 0.76rem; color: #94a3b8; font-weight: 600; margin-bottom: 2px;">
              🔍 연관 데이터 검색 결과 (${items.length}건):
            </div>
            ${items.map(item => this.renderDataCard(item)).join('')}
          </div>
        `;
      }

      const formattedAnswer = this.formatMarkdown(markdownText || '관련 데이터를 찾았습니다.');

      div.innerHTML = `
        <div class="chat-bubble">
          <div class="chatbot-answer-text">${formattedAnswer}</div>
          ${itemsHtml}
        </div>
      `;

      // 카드 클릭 이벤트 바인딩
      div.querySelectorAll('.chatbot-card-item').forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          const targetView = card.getAttribute('data-target-view');
          const targetId = card.getAttribute('data-target-id');
          if (targetView && window.AppController) {
            window.AppController.navigateToView(targetView, true);
            // 모바일 화면의 경우 챗봇 닫기
            if (window.innerWidth <= 768) {
              window.PortalChatbotView.closeChatbot();
            }
          }
        });
      });

      msgBox.appendChild(div);
    },

    renderDataCard(item) {
      const typeClasses = {
        'API': 'type-api',
        'AI 모델': 'type-ai',
        'AI 용어': 'type-term',
        'SAP 지식': 'type-sap',
        'SAP 뉴스': 'type-sap',
        'SAP 용어': 'type-sap',
        '주식 분석': 'type-stock',
        'AI 끝장토론': 'type-debate',
        '투자심의의결': 'type-council',
        '실전 매매일지': 'type-journal',
        'K-증시': 'type-stock',
        'K-증시온도': 'type-temp',
        '크롬 즐겨찾기': 'type-bookmark',
        'Spark 경제리포트': 'type-spark',
        '실시간 트렌드': 'type-trend',
        'GitHub 트렌딩': 'type-github',
        '교회 소식': 'type-church',
        '행성 월드': 'type-planet',
        '소식': 'type-api'
      };

      const badgeClass = typeClasses[item.type] || 'type-api';
      const targetView = item.targetView || 'dashboard';

      return `
        <div class="chatbot-card-item" data-target-view="${this.escapeHtml(targetView)}" data-target-id="${this.escapeHtml(item.id || '')}" title="클릭 시 해당 화면으로 이동">
          <div class="chatbot-card-top">
            <span class="chatbot-card-type ${badgeClass}">${this.escapeHtml(item.type || '포털 데이터')}</span>
            <span class="chatbot-card-link-btn">페이지 이동 ➔</span>
          </div>
          <div class="chatbot-card-title">${this.escapeHtml(item.title || '')}</div>
          <div class="chatbot-card-desc">${this.escapeHtml(item.summary || item.desc || '')}</div>
        </div>
      `;
    },

    showLoading() {
      const msgBox = document.getElementById('chatbotMessages');
      if (!msgBox) return null;

      const id = 'loading_' + Date.now();
      const div = document.createElement('div');
      div.id = id;
      div.className = 'chat-msg assistant';
      div.innerHTML = `
        <div class="chat-bubble chatbot-loading-bubble">
          <span style="font-size: 0.8rem; color: #94a3b8;">포털 데이터 검색 및 AI 답변 생성 중</span>
          <div class="chatbot-loading-dot"></div>
          <div class="chatbot-loading-dot"></div>
          <div class="chatbot-loading-dot"></div>
        </div>
      `;
      msgBox.appendChild(div);
      return id;
    },

    removeLoading(id) {
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.remove();
    },

    /**
     * 클라이언트 측 로컬 스마트 검색 & 자동 요약 합성기 (네트워크 장애 대비 폴백)
     */
    localSearchAndSynthesize(query) {
      const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
      const results = [];

      // 1. API 검색
      const apis = window.PORTAL_DATA_APIS || (window.ApiModel ? window.ApiModel.getApis() : []);
      if (Array.isArray(apis)) {
        for (const item of apis) {
          let score = 0;
          const text = `${item.title || ''} ${item.category || ''} ${(item.tags || []).join(' ')} ${item.docsUrl || ''}`.toLowerCase();
          for (const tok of tokens) {
            if (text.includes(tok)) score += 3;
          }
          if (score > 0) {
            results.push({
              score,
              type: 'API',
              title: item.title,
              summary: item.docsUrl || item.category || '',
              targetView: 'api-info',
              id: item.id
            });
          }
        }
      }

      // 2. AI 모델 검색
      const aiModels = window.PORTAL_DATA_AI_MODELS || (window.AiModel ? window.AiModel.getAiModels() : []);
      if (Array.isArray(aiModels)) {
        for (const item of aiModels) {
          let score = 0;
          const text = `${item.title || ''} ${item.developer || ''} ${item.category || ''} ${item.summary || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
          for (const tok of tokens) {
            if (text.includes(tok)) score += 3;
          }
          if (score > 0) {
            results.push({
              score,
              type: 'AI 모델',
              title: item.title,
              summary: item.summary || item.description || '',
              targetView: 'ai-models',
              id: item.id
            });
          }
        }
      }

      // 3. AI 용어 검색
      const aiTerms = window.PORTAL_DATA_AI_TERMS || (window.AiTermModel ? window.AiTermModel.getTerms() : []);
      if (Array.isArray(aiTerms)) {
        for (const item of aiTerms) {
          let score = 0;
          const text = `${item.term || ''} ${item.summary || ''} ${item.category || ''}`.toLowerCase();
          for (const tok of tokens) {
            if (text.includes(tok)) score += 3;
          }
          if (score > 0) {
            results.push({
              score,
              type: 'AI 용어',
              title: item.term,
              summary: item.summary || item.definition || '',
              targetView: 'ai-terms',
              id: item.id
            });
          }
        }
      }

      // 4. SAP 지식 / 뉴스 검색
      const sapKnow = window.PORTAL_DATA_SAP_KNOWLEDGE || [];
      if (Array.isArray(sapKnow)) {
        for (const item of sapKnow) {
          let score = 0;
          const text = `${item.title || ''} ${item.topic || ''} ${(item.tags || []).join(' ')} ${item.content || ''}`.toLowerCase();
          for (const tok of tokens) {
            if (text.includes(tok)) score += 3;
          }
          if (score > 0) {
            results.push({
              score,
              type: 'SAP 지식',
              title: `[${item.topic}] ${item.title}`,
              summary: (item.content || '').slice(0, 100) + '...',
              targetView: 'sap-suite',
              id: item.id
            });
          }
        }
      }

      // 5. 주식 끝장토론, 투자심의의결서, 실전 매매일지 검색
      const checkStockMatch = (name, code, otherText = '') => {
        const sName = (name || '').toLowerCase();
        const sCode = (code || '').toLowerCase();
        const combined = `${sName} ${sCode} ${otherText}`.toLowerCase();
        let matchScore = 0;

        for (const tok of tokens) {
          if (!tok || tok.length < 2) continue;
          if (sCode && (sCode === tok || sCode.includes(tok))) matchScore += 12;
          if (sName) {
            if (sName === tok) matchScore += 15;
            else if (sName.includes(tok) || tok.includes(sName)) matchScore += 10;
          }
          if (combined.includes(tok)) matchScore += 3;
        }
        return matchScore;
      };

      // 5-1. AI 끝장토론 (stockDebateLogs)
      const stockDebates = window.PORTAL_DATA_STOCK_DEBATE_LOGS || [];
      if (Array.isArray(stockDebates)) {
        for (const item of stockDebates) {
          const sName = item.stock_name || item.stockName || '';
          const sCode = item.item_code || item.stockCode || '';
          const topic = item.topic || '';
          const actTitle = item.action_title || '';
          const verdict = item.verdict_summary || item.consensus || '';
          const score = checkStockMatch(sName, sCode, `${topic} ${actTitle} ${verdict} ${item.news_headline || ''}`);

          if (score > 0) {
            const sumTxt = actTitle ? `${actTitle} | ${verdict}` : (verdict || topic || '5대 에이전트 끝장 검증 토론');
            results.push({
              score,
              type: 'AI 끝장토론',
              title: `[끝장토론] ${sName} (${sCode})`,
              summary: sumTxt,
              targetView: 'stock-debate',
              id: item.id
            });
          }
        }
      }

      // 5-2. 투자심의위원회 최종의결 리포트 (stockCouncil)
      const councilReports = window.PORTAL_DATA_STOCK_COUNCIL || [];
      if (Array.isArray(councilReports)) {
        for (const item of councilReports) {
          const sName = item.stockName || item.stock_name || '';
          const sCode = item.itemCode || item.item_code || '';
          const title = item.title || `[투자심의] ${sName}`;
          const summary = item.summary || (item.subagentReports?.growth ? item.subagentReports.growth.slice(0, 120) : '');
          const score = checkStockMatch(sName, sCode, `${title} ${summary} ${item.grade || ''}`);

          if (score > 0) {
            results.push({
              score,
              type: '투자심의의결',
              title: title,
              summary: summary || `${sName} 5대 에이전트 투자심의위원회 최종의결서`,
              targetView: 'stock-debate',
              id: item.id
            });
          }
        }
      }

      // 5-3. 실전 매매일지 (StockJournalView)
      if (window.StockJournalView) {
        const cp = window.StockJournalView.currentPosition;
        if (cp && (cp.stockName || cp.itemCode)) {
          const pScore = checkStockMatch(cp.stockName, cp.itemCode, `${cp.debateSummary || ''} ${cp.status || ''}`);
          if (pScore > 0) {
            const entryStr = cp.entryPrice ? `평단: ${Number(cp.entryPrice).toLocaleString()}원` : '';
            const targetStr = cp.targetPrice ? `목표: ${Number(cp.targetPrice).toLocaleString()}원` : '';
            const stopStr = cp.stopLossPrice ? `손절: ${Number(cp.stopLossPrice).toLocaleString()}원` : '';
            const qtyStr = cp.quantity ? `수량: ${cp.quantity}주` : '';
            const posDetail = [qtyStr, entryStr, targetStr, stopStr].filter(Boolean).join(' | ');

            results.push({
              score: pScore + 5,
              type: '실전 매매일지',
              title: `[실전보유] ${cp.stockName} (${cp.itemCode}) 현재 포지션`,
              summary: `${posDetail} ${cp.debateSummary ? `| ${cp.debateSummary}` : ''}`,
              targetView: 'stock-journal',
              id: cp.orderId || 'current_position'
            });
          }
        }

        if (Array.isArray(window.StockJournalView.customStrategies)) {
          for (const strat of window.StockJournalView.customStrategies) {
            const stScore = checkStockMatch(strat.stockName, strat.itemCode, `${strat.notes || ''} ${strat.note || ''}`);
            if (stScore > 0) {
              results.push({
                score: stScore,
                type: '실전 매매일지',
                title: `[맞춤전략] ${strat.stockName} (${strat.itemCode}) 감시 전략`,
                summary: strat.note || strat.notes || `진입가: ${strat.buyTriggerPrice || strat.entryPrice || '-'}`,
                targetView: 'stock-journal',
                id: strat.id
              });
            }
          }
        }

        if (Array.isArray(window.StockJournalView.historyList)) {
          for (const hist of window.StockJournalView.historyList) {
            const hScore = checkStockMatch(hist.stockName, hist.itemCode, `${hist.strategyType || ''}`);
            if (hScore > 0) {
              results.push({
                score: hScore,
                type: '실전 매매일지',
                title: `[매매완료] ${hist.stockName} (${hist.itemCode}) 매매 기록`,
                summary: `수익률: ${hist.returnPct ?? '-'}% | 실현손익: ${hist.realizedPnlKrw ? `${Number(hist.realizedPnlKrw).toLocaleString()}원` : '-'}`,
                targetView: 'stock-journal',
                id: hist.id
              });
            }
          }
        }
      }

      // 6. 크롬 즐겨찾기 북마크 검색
      const bmData = window.PORTAL_DATA_BOOKMARKS;
      const bmarks = (bmData && Array.isArray(bmData.bookmarks)) ? bmData.bookmarks : [];
      if (bmarks.length > 0) {
        for (const bm of bmarks) {
          let score = 0;
          const text = `${bm.title || ''} ${bm.domain || ''} ${bm.folderPath || ''} ${bm.url || ''}`.toLowerCase();
          for (const tok of tokens) {
            if (!tok || tok.length < 2) continue;
            if (bm.title && bm.title.toLowerCase().includes(tok)) score += 6;
            if (bm.domain && bm.domain.toLowerCase().includes(tok)) score += 4;
            if (text.includes(tok)) score += 2;
          }
          if (score > 0) {
            results.push({
              score,
              type: '크롬 즐겨찾기',
              title: `⭐ ${bm.title || bm.domain}`,
              summary: `${bm.folderPath ? `[${bm.folderPath}] ` : ''}${bm.url}`,
              targetView: 'bookmarks',
              id: bm.id || bm.url
            });
          }
        }
      }

      // 7. Spark 경제리포트
      const sparkObj = window.PORTAL_DATA_SPARK_REPORTS || (window.SparkReportsView && window.SparkReportsView.currentData);
      if (sparkObj && Array.isArray(sparkObj.reports)) {
        for (const rep of sparkObj.reports) {
          let score = 0;
          const text = `${rep.title || ''} ${rep.categoryLabel || ''} ${rep.summarySnippet || ''} ${rep.content || ''}`.toLowerCase();
          for (const tok of tokens) {
            if (!tok || tok.length < 2) continue;
            if (rep.title && rep.title.toLowerCase().includes(tok)) score += 8;
            if (rep.categoryLabel && rep.categoryLabel.toLowerCase().includes(tok)) score += 5;
            if (text.includes(tok)) score += 2;
          }
          if (score > 0) {
            results.push({
              score,
              type: 'Spark 경제리포트',
              title: `✨ [Spark 리포트] ${rep.title || rep.categoryLabel}`,
              summary: rep.summarySnippet || 'Gemini Spark 주간 경제·거시 심층 보고서',
              targetView: 'spark-reports',
              id: rep.id
            });
          }
        }
      }

      // 8. 실시간 트렌드
      const trData = window.TrendRankingView && window.TrendRankingView.data;
      if (trData && typeof trData === 'object') {
        const trSources = [
          { list: trData.google, label: '구글 트렌드' },
          { list: trData.blackkiwi, label: '블랙키위 키워드' },
          { list: trData.daum, label: '다음 실시간' },
          { list: trData.namu, label: '나무위키' },
          { list: trData.kyobo, label: '교보 베스트셀러' }
        ];
        for (const ts of trSources) {
          if (Array.isArray(ts.list)) {
            for (const item of ts.list) {
              let score = 0;
              const kw = item.keyword || item.title || item.name || '';
              const desc = item.description || item.reason || '';
              const text = `${kw} ${desc} ${ts.label}`.toLowerCase();
              for (const tok of tokens) {
                if (!tok || tok.length < 2) continue;
                if (kw && kw.toLowerCase().includes(tok)) score += 7;
                if (text.includes(tok)) score += 2;
              }
              if (score > 0) {
                results.push({
                  score,
                  type: '실시간 트렌드',
                  title: `🚀 [${ts.label}] ${kw}`,
                  summary: desc || `${ts.label} 실시간 랭킹 순위`,
                  targetView: 'trend-ranking',
                  id: kw
                });
              }
            }
          }
        }
      }

      // 9. K-증시 온도
      const stockTempRaw = window.PORTAL_DATA_STOCK_TEMP || (window.StockTempModel && window.StockTempModel.stockTempList) || [];
      const stockTempArr = Array.isArray(stockTempRaw) ? stockTempRaw : (stockTempRaw.stockTempList || []);
      if (Array.isArray(stockTempArr)) {
        for (const item of stockTempArr) {
          let score = 0;
          const headlineOrTitle = item.title || item.headline || item.summary || '';
          const tagsStr = (item.tags || []).join(' ');
          const text = `${item.date || ''} ${item.temp ?? ''}도 ${item.temp ?? ''}℃ ${headlineOrTitle} ${tagsStr} ${item.detail || ''} 증시온도 분위기 감정온도 코스피`.toLowerCase();
          for (const tok of tokens) {
            if (!tok || tok.length < 2) continue;
            if (headlineOrTitle.toLowerCase().includes(tok)) score += 8;
            if (tagsStr.toLowerCase().includes(tok)) score += 6;
            if (text.includes(tok)) score += 3;
          }
          if (query.includes('온도') || query.includes('증시온도')) score += 5;
          if (score > 0) {
            results.push({
              score,
              type: 'K-증시온도',
              title: `☀️ [K-증시 온도] ${item.date || ''} (${item.temp ?? '-'}℃)`,
              summary: headlineOrTitle || (item.detail ? item.detail.slice(0, 100) + '...' : '일별 증시 호재 vs 악재 감정 지수'),
              targetView: 'stock-temp',
              id: item.date || item.id
            });
          }
        }
      }

      // 10. GitHub 트렌딩
      const ghRaw = window.PORTAL_DATA_GITHUB_TRENDING || (window.GithubTrendingModel && window.GithubTrendingModel.data) || [];
      const ghList = Array.isArray(ghRaw) ? ghRaw : (ghRaw.repositories || []);
      if (Array.isArray(ghList)) {
        for (const item of ghList) {
          let score = 0;
          const name = item.name || item.repo || '';
          const desc = item.summary || item.whatIsIt || item.description || '';
          const tags = [item.tag || '', item.category || '', item.language || ''].join(' ');
          const text = `${name} ${tags} ${desc} github 깃허브 트렌딩 오픈소스`.toLowerCase();
          for (const tok of tokens) {
            if (!tok || tok.length < 2) continue;
            if (name.toLowerCase().includes(tok)) score += 8;
            if (tags.toLowerCase().includes(tok)) score += 5;
            if (text.includes(tok)) score += 3;
          }
          if (query.toLowerCase().includes('github') || query.includes('깃허브') || query.includes('트렌딩')) score += 4;
          if (score > 0) {
            results.push({
              score,
              type: 'GitHub 트렌딩',
              title: `💻 [GitHub] ${name || item.repo || '오픈소스'}`,
              summary: `${item.language ? `[${item.language}] ` : ''}${desc || 'GitHub 실시간 급상승 오픈소스'} (⭐ ${item.stars || '-'})`,
              targetView: 'github-trending',
              id: name || item.repo
            });
          }
        }
      }

      // 11. SAP 뉴스 & 12. SAP 용어
      const sapNewsArr = window.PORTAL_DATA_SAP_NEWS || [];
      if (Array.isArray(sapNewsArr)) {
        for (const item of sapNewsArr) {
          let score = 0;
          const text = `${item.title || ''} ${item.category || ''} ${item.summary || ''}`.toLowerCase();
          for (const tok of tokens) {
            if (!tok || tok.length < 2) continue;
            if (item.title && item.title.toLowerCase().includes(tok)) score += 6;
            if (text.includes(tok)) score += 2;
          }
          if (score > 0) {
            results.push({
              score,
              type: 'SAP 뉴스',
              title: `📰 [SAP 뉴스] ${item.title}`,
              summary: item.summary || item.category || 'SAP 최신 업데이트',
              targetView: 'sap-suite',
              id: item.id || item.link
            });
          }
        }
      }

      const sapTermsArr = window.PORTAL_DATA_SAP_TERMS || [];
      if (Array.isArray(sapTermsArr)) {
        for (const item of sapTermsArr) {
          let score = 0;
          const text = `${item.term || ''} ${item.korean || ''} ${item.summary || ''} ${item.definition || ''} sap 에스에이피 용어 용어사전 btp`.toLowerCase();
          for (const tok of tokens) {
            if (!tok || tok.length < 2) continue;
            if (item.term && item.term.toLowerCase().includes(tok)) score += 9;
            if (item.korean && item.korean.toLowerCase().includes(tok)) score += 8;
            if (text.includes(tok)) score += 3;
          }
          if (query.includes('용어') || query.includes('사전') || query.toLowerCase().includes('sap')) score += 3;
          if (score > 0) {
            results.push({
              score,
              type: 'SAP 용어',
              title: `🧠 [SAP 용어] ${item.term}${item.korean ? ` (${item.korean})` : ''}`,
              summary: item.summary || item.definition || 'SAP 용어 사전',
              targetView: 'sap-terms',
              id: item.term
            });
          }
        }
      }

      // 13. 교회 소식 & 14. 3D 행성 월드
      const churchData = window.ChurchNewsModel && window.ChurchNewsModel.newsData;
      if (churchData && typeof churchData === 'object') {
        const cLabels = { suwon: '수원중앙침례교회', gapck: '대한예수교장로회' };
        ['suwon', 'gapck'].forEach(k => {
          const list = churchData[k]?.items;
          if (Array.isArray(list)) {
            for (const item of list) {
              let score = 0;
              const text = `${item.title || ''} ${item.date || ''} ${item.summary || ''} ${cLabels[k] || ''} 교회 주보 소식`.toLowerCase();
              for (const tok of tokens) {
                if (!tok || tok.length < 2) continue;
                if (item.title && item.title.toLowerCase().includes(tok)) score += 7;
                if (text.includes(tok)) score += 3;
              }
              if (query.includes('교회') || query.includes('주보') || query.includes('설교')) score += 4;
              if (score > 0) {
                results.push({
                  score,
                  type: '교회 소식',
                  title: `⛪ [교회 소식] ${item.title}`,
                  summary: `${item.date || ''} | ${cLabels[k] || ''} | ${item.summary || '교회 소식'}`,
                  targetView: 'church-news',
                  id: item.id || item.title
                });
              }
            }
          }
        });
      }

      const planetData = window.PlanetWorldModel && window.PlanetWorldModel.worldData;
      if (planetData && Array.isArray(planetData.buildings)) {
        for (const bld of planetData.buildings) {
          let score = 0;
          const flTexts = (bld.floors || []).map(fl => `${fl.title || ''} ${fl.desc || ''}`).join(' ');
          const text = `${bld.name || ''} ${bld.category || ''} ${flTexts} 행성 3d 월드 메타버스 planet 우주 지구`.toLowerCase();
          for (const tok of tokens) {
            if (!tok || tok.length < 2) continue;
            if (bld.name && bld.name.toLowerCase().includes(tok)) score += 8;
            if (text.includes(tok)) score += 4;
          }
          if (query.includes('행성') || query.toLowerCase().includes('planet') || query.includes('3d') || query.includes('메타버스')) score += 5;
          if (score > 0) {
            results.push({
              score,
              type: '행성 월드',
              title: `🌍 [행성 월드] ${bld.name}`,
              summary: `${bld.category || '가족'} 테마 3D 건물 (총 ${bld.floors?.length || 1}개 층)`,
              targetView: 'planet-world',
              id: bld.id
            });
          }
        }
      }

      // 점수 높은 순 정렬
      results.sort((a, b) => b.score - a.score);
      const topItems = results.slice(0, 5);

      let answer = '';
      if (topItems.length > 0) {
        answer = `포털 전체 데이터베이스에서 **"${query}"**와(과) 관련된 항목 총 **${results.length}건**을 발견했습니다.\n\n아래의 추천 결과 카드를 클릭하시면 해당 메뉴로 즉시 이동합니다:`;
      } else {
        answer = `포털 전체 데이터에서 **"${query}"**에 대한 직접적인 일치 항목을 찾지 못했습니다.\n\n다른 키워드(예: 'Blogger', 'Gemini', 'SAP', '삼성전자')로 검색하시거나 추천 질문 칩을 이용해 보세요.`;
      }

      return { answer, items: topItems };
    },

    formatMarkdown(text) {
      if (!text) return '';
      let escaped = this.escapeHtml(text);

      // Markdown 볼드 변환: **텍스트** -> <strong>텍스트</strong>
      escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Markdown 헤더 변환: ### 제목 -> <h5>제목</h5>
      escaped = escaped.replace(/^###\s+(.*)$/gm, '<h5 style="margin: 10px 0 4px 0; color: #a5b4fc; font-size: 0.95rem;">$1</h5>');
      escaped = escaped.replace(/^####\s+(.*)$/gm, '<h6 style="margin: 8px 0 3px 0; color: #38bdf8; font-size: 0.88rem;">$1</h6>');

      // Markdown 불릿 리스트 변환: - 항목 또는 * 항목
      escaped = escaped.replace(/^[\-\*]\s+(.*)$/gm, '<li style="margin-left: 14px;">$1</li>');

      // 개행 처리
      escaped = escaped.replace(/\n\n/g, '<p></p>');
      escaped = escaped.replace(/\n/g, '<br/>');

      return escaped;
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
})();
