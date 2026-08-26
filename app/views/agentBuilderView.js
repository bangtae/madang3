// app/views/agentBuilderView.js - AI 에이전트 및 오토메이션 워크플로우 Builder 뷰

window.AgentBuilderView = {
  isInitialized: false,
  nodes: [],
  connections: [],
  selectedNodeId: null,
  activeFilterTab: 'all',
  searchQuery: '',

  // 드래그 및 연결 인터랙션 상태
  isDraggingNode: false,
  draggedNodeId: null,
  dragOffset: { x: 0, y: 0 },

  isConnecting: false,
  connectingFromNodeId: null,
  mousePos: { x: 0, y: 0 },

  // 기본 프리셋 노드 위치 offset
  nextSpawnPos: { x: 80, y: 60 },

  init() {
    if (!this.isInitialized) {
      this.bindEvents();
      this.isInitialized = true;
    }
    this.loadFromLocalStorage();
    this.renderResourceLibrary();
    this.renderCanvas();
  },

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 1. 자원 탐색 탭 및 검색어 필터
    const searchInput = document.getElementById('ab-search-resource');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderResourceLibrary();
      });
    }

    const tabBtns = document.querySelectorAll('.ab-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.activeFilterTab = e.currentTarget.getAttribute('data-tab');
        this.renderResourceLibrary();
      });
    });

    // 2. 커스텀 노드 추가 버튼들

    const btnAddNote = document.getElementById('btn-ab-add-note');
    if (btnAddNote) {
      btnAddNote.addEventListener('click', () => {
        this.addCustomNode('note', '설명/텍스트 메모', '설계에 대한 추가 텍스트 메모 및 사양 지침입니다.');
      });
    }

    // 3. 캔버스 툴바 (초기화, 저장, 불러오기, 생성 버튼)
    const btnClear = document.getElementById('btn-ab-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('캔버스의 모든 노드와 연결을 삭제하시겠습니까?')) {
          this.nodes = [];
          this.connections = [];
          this.selectedNodeId = null;
          this.saveToLocalStorage();
          this.renderCanvas();
          if (window.UiView) window.UiView.showToast('🧹 캔버스가 초기화되었습니다.');
        }
      });
    }

    const btnSave = document.getElementById('btn-ab-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        this.openSaveModal();
      });
    }

    const btnLoad = document.getElementById('btn-ab-load');
    if (btnLoad) {
      btnLoad.addEventListener('click', () => {
        this.openLoadModal();
      });
    }

    // 💾 저장 모달 폼 제출
    const saveForm = document.getElementById('ab-save-form');
    if (saveForm) {
      saveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('ab-save-name').value.trim();
        const desc = document.getElementById('ab-save-desc').value.trim();
        if (!name) return;

        this.saveNamedWorkflow(name, desc);
        this.closeSaveModal();
      });
    }

    document.getElementById('btn-ab-save-close')?.addEventListener('click', () => this.closeSaveModal());
    document.getElementById('btn-ab-save-cancel')?.addEventListener('click', () => this.closeSaveModal());

    // 📂 불러오기 모달 닫기
    document.getElementById('btn-ab-load-close')?.addEventListener('click', () => this.closeLoadModal());
    document.getElementById('btn-ab-load-cancel')?.addEventListener('click', () => this.closeLoadModal());

    // 🚀 핵심: 프로그램 설계서 및 로드맵 생성 버튼
    const btnGenerate = document.getElementById('btn-generate-architecture');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => {
        this.generateArchitectureAndRoadmap();
      });
    }

    // 4. 캔버스 마우스 인터랙션 (드래그, 연결선 연결)
    const canvasContainer = document.getElementById('ab-canvas-container');
    if (canvasContainer) {
      canvasContainer.addEventListener('mousemove', (e) => {
        const rect = canvasContainer.getBoundingClientRect();
        this.mousePos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };

        if (this.isDraggingNode && this.draggedNodeId) {
          const node = this.nodes.find(n => n.id === this.draggedNodeId);
          if (node) {
            node.x = Math.max(10, this.mousePos.x - this.dragOffset.x);
            node.y = Math.max(10, this.mousePos.y - this.dragOffset.y);
            this.renderCanvas();
          }
        }

        if (this.isConnecting) {
          this.drawTempConnectingLine();
        }
      });

      canvasContainer.addEventListener('mouseup', (e) => {
        if (this.isDraggingNode) {
          this.isDraggingNode = false;
          this.draggedNodeId = null;
          this.saveToLocalStorage();
        }

        if (this.isConnecting && this.connectingFromNodeId) {
          // 마우스 뗀 지점 아래의 노드 요소 감지하여 연결 실행
          const targetEl = document.elementFromPoint(e.clientX, e.clientY);
          const nodeCard = targetEl ? targetEl.closest('.ab-node-card') : null;
          
          if (nodeCard) {
            const targetNodeId = nodeCard.getAttribute('data-id');
            if (targetNodeId && targetNodeId !== this.connectingFromNodeId) {
              this.addConnection(this.connectingFromNodeId, targetNodeId);
            }
          }
          this.isConnecting = false;
          this.connectingFromNodeId = null;
          this.clearTempConnectingLine();
        }
      });

      canvasContainer.addEventListener('mouseleave', () => {
        this.isDraggingNode = false;
        this.isConnecting = false;
        this.clearTempConnectingLine();
      });
    }

    // 5. 모달 및 닫기 / 복사 / 다운로드
    const modalCloseBtn = document.getElementById('btn-ab-modal-close');
    const modalOverlay = document.getElementById('ab-modal-overlay');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => this.closeOutputModal());
    if (modalOverlay) modalOverlay.addEventListener('click', () => this.closeOutputModal());

    const btnCopyDoc = document.getElementById('btn-copy-generated-doc');
    if (btnCopyDoc) {
      btnCopyDoc.addEventListener('click', () => {
        const docText = document.getElementById('ab-output-content')?.innerText || '';
        navigator.clipboard.writeText(docText).then(() => {
          if (window.UiView) window.UiView.showToast('📋 설계서 및 로드맵이 클립보드에 복사되었습니다!');
        }).catch(err => {
          console.error(err);
          if (window.UiView) window.UiView.showToast('❌ 복사 실패', 'error');
        });
      });
    }

    const btnDownloadDoc = document.getElementById('btn-download-generated-md');
    if (btnDownloadDoc) {
      btnDownloadDoc.addEventListener('click', () => {
        const docText = document.getElementById('ab-output-content')?.innerText || '';
        const blob = new Blob([docText], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI_Agent_Program_Design_${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
        if (window.UiView) window.UiView.showToast('💾 마크다운 설계서(.md) 다운로드 시작');
      });
    }
  },

  /**
   * 좌측 등록 자원 라이브러리 렌더링 (API 및 AI 서비스 불러오기)
   */
  renderResourceLibrary() {
    const container = document.getElementById('ab-resource-list');
    if (!container) return;

    const apis = window.ApiModel ? window.ApiModel.getApis() : [];
    const aiModels = window.AiModel ? window.AiModel.getAiModels() : [];

    // 카운트 배지 갱신
    const countApiEl = document.getElementById('ab-count-apis');
    const countAiEl = document.getElementById('ab-count-ais');
    if (countApiEl) countApiEl.innerText = apis.length;
    if (countAiEl) countAiEl.innerText = aiModels.length;

    let itemsToDisplay = [];

    if (this.activeFilterTab === 'all' || this.activeFilterTab === 'api') {
      apis.forEach(api => {
        itemsToDisplay.push({
          type: 'api',
          id: api.id,
          title: api.title,
          category: api.category || '기초 API',
          description: `서비스: ${api.serviceUrl || '-'} | 문서: ${api.docsUrl || '-'}`,
          serviceUrl: api.serviceUrl,
          docsUrl: api.docsUrl,
          raw: api
        });
      });
    }

    if (this.activeFilterTab === 'all' || this.activeFilterTab === 'ai') {
      aiModels.forEach(ai => {
        const title = ai.title || ai.name || 'AI 서비스';
        const summary = ai.summary || ai.description || ai.specs || '등록된 AI 모델 서비스입니다.';
        const dev = ai.developer || ai.provider || '';
        const descText = dev ? `[제공: ${dev}] ${summary}` : summary;

        itemsToDisplay.push({
          type: 'ai',
          id: ai.id,
          title: title,
          category: ai.category || 'AI 서비스',
          description: descText,
          provider: dev,
          serviceUrl: ai.serviceUrl,
          docsUrl: ai.docsUrl,
          raw: ai
        });
      });
    }

    // 검색어 필터링
    if (this.searchQuery) {
      itemsToDisplay = itemsToDisplay.filter(item => 
        (item.title && item.title.toLowerCase().includes(this.searchQuery)) ||
        (item.category && item.category.toLowerCase().includes(this.searchQuery)) ||
        (item.description && item.description.toLowerCase().includes(this.searchQuery))
      );
    }

    if (itemsToDisplay.length === 0) {
      container.innerHTML = `
        <div class="ab-empty-resources">
          <p>🔍 검색 결과 또는 등록된 자원이 없습니다.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = itemsToDisplay.map(item => {
      const typeBadge = item.type === 'api' ? '📦 API' : '🤖 AI서비스';
      const badgeClass = item.type === 'api' ? 'badge-purple' : 'badge-blue';

      return `
        <div class="ab-resource-card">
          <div class="ab-res-header">
            <span class="ab-res-badge ${badgeClass}">${typeBadge}</span>
            <span class="ab-res-cat">${this.escapeHtml(item.category)}</span>
          </div>
          <h4 class="ab-res-title">${this.escapeHtml(item.title)}</h4>
          <p class="ab-res-desc">${this.escapeHtml(item.description)}</p>
          <button class="btn-ab-add-node" data-type="${item.type}" data-id="${item.id}">
            ➕ 캔버스에 추가
          </button>
        </div>
      `;
    }).join('');

    // 이벤트 추가
    container.querySelectorAll('.btn-ab-add-node').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        const id = e.currentTarget.getAttribute('data-id');
        this.addResourceNodeToCanvas(type, id);
      });
    });
  },

  /**
   * 등록된 API 또는 AI 자원을 캔버스 노드로 추가
   */
  addResourceNodeToCanvas(type, id) {
    let item = null;
    if (type === 'api' && window.ApiModel) {
      item = window.ApiModel.getApis().find(a => String(a.id) === String(id));
    } else if (type === 'ai' && window.AiModel) {
      item = window.AiModel.getAiModels().find(a => String(a.id) === String(id));
    }

    if (!item) return;

    const newNodeId = `node_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const title = item.title || item.name || (type === 'api' ? 'API 서비스' : 'AI 서비스');
    const category = item.category || (type === 'api' ? 'API 연동' : 'AI 추론');
    const summary = item.summary || item.description || item.specs || '등록된 AI 서비스입니다.';
    const description = type === 'api' 
      ? `[API 연동] URL: ${item.serviceUrl || item.docsUrl || 'URL 미기재'}` 
      : `[AI 모델] ${summary}`;

    // 노드 위치 지그재그 배치
    const posX = this.nextSpawnPos.x;
    const posY = this.nextSpawnPos.y;
    this.nextSpawnPos.x = (posX + 40) % 550 + 60;
    this.nextSpawnPos.y = (posY + 60) % 380 + 50;

    const newNode = {
      id: newNodeId,
      type: type, // 'api' or 'ai'
      title: title,
      category: category,
      description: description,
      notes: '스텝 목적 및 세부 처리 요구사항을 작성하세요.',
      inputFormat: 'JSON / HTTP Request Payload',
      outputFormat: 'JSON Response / Structured Data',
      x: posX,
      y: posY,
      rawItem: item
    };

    this.nodes.push(newNode);
    this.selectedNodeId = newNodeId;
    this.saveToLocalStorage();
    this.renderCanvas();

    if (window.UiView) {
      window.UiView.showToast(`✅ [${type.toUpperCase()}] '${title}' 노드가 캔버스에 추가되었습니다!`);
    }
  },

  /**
   * 커스텀 스텝 노드 추가 (트리거, 액션, 노트)
   */
  addCustomNode(type, title, defaultDesc) {
    const newNodeId = `node_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    const posX = this.nextSpawnPos.x;
    const posY = this.nextSpawnPos.y;
    this.nextSpawnPos.x = (posX + 40) % 550 + 60;
    this.nextSpawnPos.y = (posY + 60) % 380 + 50;

    const newNode = {
      id: newNodeId,
      type: type, // 'trigger', 'action', 'note'
      title: title,
      category: type === 'trigger' ? '시작/이벤트' : (type === 'action' ? '로직/액션' : '메모/설명'),
      description: defaultDesc,
      notes: '이 단계의 역할 및 세부 지침을 추가하세요.',
      inputFormat: '사용자 입력 데이터',
      outputFormat: '다음 스텝 전달 데이터',
      x: posX,
      y: posY
    };

    this.nodes.push(newNode);
    this.selectedNodeId = newNodeId;
    this.saveToLocalStorage();
    this.renderCanvas();

    if (window.UiView) {
      window.UiView.showToast(`✨ 커스텀 노드 '${title}' 추가 완료`);
    }
  },

  /**
   * 캔버스 전체 렌더링 (SVG 연결선 & DOM 노드 카드)
   */
  renderCanvas() {
    const svgLayer = document.getElementById('ab-svg-layer');
    const nodesLayer = document.getElementById('ab-nodes-layer');
    if (!nodesLayer || !svgLayer) return;

    // 1. 노드 카드 렌더링
    nodesLayer.innerHTML = this.nodes.map(node => {
      const isSelected = node.id === this.selectedNodeId;
      const typeClass = `node-type-${node.type}`;
      
      let typeIcon = '⚡';
      if (node.type === 'api') typeIcon = '📦';
      else if (node.type === 'ai') typeIcon = '🤖';
      else if (node.type === 'trigger') typeIcon = '🚀';
      else if (node.type === 'action') typeIcon = '⚙️';
      else if (node.type === 'note') typeIcon = '📝';

      return `
        <div class="ab-node-card ${typeClass} ${isSelected ? 'selected' : ''}" 
             id="ab-node-${node.id}" 
             style="left: ${node.x}px; top: ${node.y}px;"
             data-id="${node.id}">
          <div class="ab-node-header">
            <span class="ab-node-icon">${typeIcon}</span>
            <span class="ab-node-title" title="${this.escapeHtml(node.title)}">${this.escapeHtml(node.title)}</span>
            <button class="ab-node-btn-del" data-id="${node.id}" title="노드 삭제">✕</button>
          </div>
          <div class="ab-node-body">
            <p class="ab-node-desc">${this.escapeHtml(node.description)}</p>
            ${node.notes ? `<div class="ab-node-note-preview">💡 ${this.escapeHtml(node.notes)}</div>` : ''}
          </div>
          <div class="ab-node-footer">
            <span class="ab-node-cat">${this.escapeHtml(node.category)}</span>
            <div class="ab-node-port" data-id="${node.id}" title="드래그하여 다음 노드로 연결">🔌 연결</div>
          </div>
        </div>
      `;
    }).join('');

    // 노드 관련 이벤트 바인딩 (드래그, 선택, 삭제, 연결)
    this.nodes.forEach(node => {
      const el = document.getElementById(`ab-node-${node.id}`);
      if (!el) return;

      // 노드 카드의 mousedown (선택, 드래그 또는 연결 완결)
      el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('ab-node-btn-del') || e.target.classList.contains('ab-node-port')) {
          return;
        }

        // 연결 진행 상태일 경우 대상 노드 클릭 시 바로 연결 연결!
        if (this.isConnecting && this.connectingFromNodeId) {
          if (this.connectingFromNodeId !== node.id) {
            this.addConnection(this.connectingFromNodeId, node.id);
          }
          this.isConnecting = false;
          this.connectingFromNodeId = null;
          this.clearTempConnectingLine();
          return;
        }

        this.selectedNodeId = node.id;
        this.isDraggingNode = true;
        this.draggedNodeId = node.id;

        const rect = el.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };

        this.renderCanvas();
        this.renderSelectedNodeProperties();
      });

      // 삭제 버튼
      const btnDel = el.querySelector('.ab-node-btn-del');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteNode(node.id);
        });
      }

      // 연결 포트 시작 (mousedown 및 click 지원)
      const port = el.querySelector('.ab-node-port');
      if (port) {
        port.addEventListener('mousedown', (e) => {
          e.stopPropagation();

          if (this.isConnecting && this.connectingFromNodeId && this.connectingFromNodeId !== node.id) {
            this.addConnection(this.connectingFromNodeId, node.id);
            this.isConnecting = false;
            this.connectingFromNodeId = null;
            this.clearTempConnectingLine();
          } else {
            this.isConnecting = true;
            this.connectingFromNodeId = node.id;
            if (window.UiView) window.UiView.showToast('🔗 연결할 대상 노드를 클릭하거나 마우스를 드래그하여 놓으세요.');
          }
        });
      }
    });

    // 2. SVG 연결선 렌더링
    this.renderSVGConnections(svgLayer);
    this.renderSelectedNodeProperties();
  },

  /**
   * SVG 화살표 연결선 드로잉
   */
  renderSVGConnections(svgLayer) {
    // 연결선 및 마커 정의
    let svgHtml = `
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
        </marker>
        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
        </marker>
      </defs>
    `;

    this.connections.forEach((conn, index) => {
      const fromNode = this.nodes.find(n => n.id === conn.fromNodeId);
      const toNode = this.nodes.find(n => n.id === conn.toNodeId);

      if (!fromNode || !toNode) return;

      // 노드 중심 좌표 산출 (노드 크기 가로 220px, 세로 120px 기준)
      const x1 = fromNode.x + 200;
      const y1 = fromNode.y + 60;
      const x2 = toNode.x + 10;
      const y2 = toNode.y + 60;

      // 베지어 곡선 컨트롤 포인트
      const dx = Math.abs(x2 - x1) / 2;
      const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      svgHtml += `
        <g class="ab-connection-group" data-index="${index}">
          <path d="${pathData}" class="ab-conn-path-bg" />
          <path d="${pathData}" class="ab-conn-path" marker-end="url(#arrowhead)" />
          <circle cx="${(x1+x2)/2}" cy="${(y1+y2)/2}" r="10" class="ab-conn-del-btn" data-from="${conn.fromNodeId}" data-to="${conn.toNodeId}">✕</circle>
        </g>
      `;
    });

    // 임시 작성 연결선 파이프
    svgHtml += `<path id="ab-temp-path" d="" class="ab-conn-temp" marker-end="url(#arrowhead-active)" style="display:none;" />`;

    svgLayer.innerHTML = svgHtml;

    // 연결선 삭제 버튼 이벤트
    svgLayer.querySelectorAll('.ab-conn-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const from = e.currentTarget.getAttribute('data-from');
        const to = e.currentTarget.getAttribute('data-to');
        this.removeConnection(from, to);
      });
    });
  },

  /**
   * 마우스 이동 중 연결 임시선 표시
   */
  drawTempConnectingLine() {
    const tempPath = document.getElementById('ab-temp-path');
    if (!tempPath || !this.connectingFromNodeId) return;

    const fromNode = this.nodes.find(n => n.id === this.connectingFromNodeId);
    if (!fromNode) return;

    const x1 = fromNode.x + 200;
    const y1 = fromNode.y + 60;
    const x2 = this.mousePos.x;
    const y2 = this.mousePos.y;

    const dx = Math.abs(x2 - x1) / 2;
    tempPath.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
    tempPath.style.display = 'block';
  },

  clearTempConnectingLine() {
    const tempPath = document.getElementById('ab-temp-path');
    if (tempPath) tempPath.style.display = 'none';
  },

  /**
   * 노드 간 연결 추가
   */
  addConnection(fromId, toId) {
    const exists = this.connections.some(c => c.fromNodeId === fromId && c.toNodeId === toId);
    if (exists) return;

    this.connections.push({
      id: `conn_${Date.now()}`,
      fromNodeId: fromId,
      toNodeId: toId
    });

    this.saveToLocalStorage();
    this.renderCanvas();
    if (window.UiView) window.UiView.showToast('🔗 노드 간 플로우 연결 형성 완료');
  },

  removeConnection(fromId, toId) {
    this.connections = this.connections.filter(c => !(c.fromNodeId === fromId && c.toNodeId === toId));
    this.saveToLocalStorage();
    this.renderCanvas();
  },

  deleteNode(nodeId) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connections = this.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
    if (this.selectedNodeId === nodeId) this.selectedNodeId = null;
    this.saveToLocalStorage();
    this.renderCanvas();
  },

  /**
   * 선택된 노드 속성 편집기 렌더링
   */
  renderSelectedNodeProperties() {
    const propPanel = document.getElementById('ab-node-prop-editor');
    if (!propPanel) return;

    if (!this.selectedNodeId) {
      propPanel.innerHTML = `
        <div class="ab-prop-empty">
          <p>🖱️ 캔버스의 노드를 클릭하면 세부 스텝 속성(명칭, 입출력 규격, 세부 지침)을 수정할 수 있습니다.</p>
        </div>
      `;
      return;
    }

    const node = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!node) return;

    propPanel.innerHTML = `
      <div class="ab-prop-form">
        <h4>⚙️ 스텝 속성 설정 [${this.escapeHtml(node.title)}]</h4>
        <div class="ab-form-group">
          <label>스텝 제목</label>
          <input type="text" id="prop-node-title" value="${this.escapeHtml(node.title)}">
        </div>
        <div class="ab-form-group">
          <label>카테고리</label>
          <input type="text" id="prop-node-cat" value="${this.escapeHtml(node.category)}">
        </div>
        <div class="ab-form-group">
          <label>요약 설명</label>
          <input type="text" id="prop-node-desc" value="${this.escapeHtml(node.description)}">
        </div>
        <div class="ab-form-group">
          <label>입력 데이터 규격</label>
          <input type="text" id="prop-node-input" value="${this.escapeHtml(node.inputFormat || '')}">
        </div>
        <div class="ab-form-group">
          <label>출력 데이터 규격</label>
          <input type="text" id="prop-node-output" value="${this.escapeHtml(node.outputFormat || '')}">
        </div>
        <div class="ab-form-group">
          <label>단계별 세부 지침 / 요구사항 메모</label>
          <textarea id="prop-node-notes" rows="3">${this.escapeHtml(node.notes || '')}</textarea>
        </div>
        <button id="btn-prop-save" class="btn-ab-primary">✅ 속성 변경 저장</button>
      </div>
    `;

    document.getElementById('btn-prop-save')?.addEventListener('click', () => {
      node.title = document.getElementById('prop-node-title').value;
      node.category = document.getElementById('prop-node-cat').value;
      node.description = document.getElementById('prop-node-desc').value;
      node.inputFormat = document.getElementById('prop-node-input').value;
      node.outputFormat = document.getElementById('prop-node-output').value;
      node.notes = document.getElementById('prop-node-notes').value;

      this.saveToLocalStorage();
      this.renderCanvas();
      if (window.UiView) window.UiView.showToast('✅ 노드 속성이 업데이트되었습니다.');
    });
  },

  /**
   * 🚀 핵심 기능: 순차적 프로그램 기획, 시스템 설계, 개발 로드맵 및 LLM 프롬프트 생성
   */
  generateArchitectureAndRoadmap() {
    if (this.nodes.length === 0) {
      if (window.UiView) window.UiView.showToast('⚠️ 캔버스에 최소 1개 이상의 노드를 추가해주세요.', 'error');
      return;
    }

    // 1. 노드 순서 정렬 (연결망 기반 위상 정렬/순차 정렬)
    const sortedNodes = this.getSequencedNodes();

    // 2. 마크다운 생성 문서 빌드
    const nowStr = new Date().toLocaleString('ko-KR');
    
    let doc = `# 🧩 AI 에이전트 & 프로그램 시스템 설계 명세서 및 개발 로드맵\n`;
    doc += `**생성 일시**: ${nowStr}\n`;
    doc += `**총 시스템 구성 스텝**: ${sortedNodes.length}개 단계 | **연결 파이프라인**: ${this.connections.length}개\n\n`;

    doc += `---\n\n`;
    doc += `## 📋 1. 프로그램 서비스 기획서 (Program Overview)\n\n`;
    doc += `### 1.1 시스템 구축 목적\n`;
    doc += `본 시스템은 사이트에 등록된 API 및 AI 서비스 자원을 유기적으로 연결하여 자동화된 워크플로우 및 AI 에이전트를 구축하는 것을 목표로 합니다.\n\n`;
    
    doc += `### 1.2 주요 서비스 자원 구성\n`;
    sortedNodes.forEach((node, idx) => {
      const typeLabel = node.type === 'api' ? '[API 연동]' : (node.type === 'ai' ? '[AI 모델]' : '[커스텀 로직]');
      doc += `- **스텝 ${idx + 1}**: \`${typeLabel} ${node.title}\` (${node.category}) - ${node.description}\n`;
    });
    doc += `\n---\n\n`;

    doc += `## 📐 2. 순차 아키텍처 및 스텝별 데이터 파이프라인 설계 (System Architecture)\n\n`;
    sortedNodes.forEach((node, idx) => {
      const nextConns = this.connections.filter(c => c.fromNodeId === node.id);
      const prevConns = this.connections.filter(c => c.toNodeId === node.id);

      const nextNodeNames = nextConns.map(c => {
        const target = this.nodes.find(n => n.id === c.toNodeId);
        return target ? `'${target.title}'` : null;
      }).filter(Boolean).join(', ') || '없음 (최종 출력)';

      const prevNodeNames = prevConns.map(c => {
        const src = this.nodes.find(n => n.id === c.fromNodeId);
        return src ? `'${src.title}'` : null;
      }).filter(Boolean).join(', ') || '시작 스텝 (입력)';

      doc += `### 🔹 STEP ${idx + 1}: ${node.title}\n`;
      doc += `- **구분/종류**: ${node.type.toUpperCase()} (${node.category})\n`;
      doc += `- **이전 단계 연동**: ${prevNodeNames}\n`;
      doc += `- **다음 단계 연동**: ${nextNodeNames}\n`;
      doc += `- **입력 데이터 구조**: \`${node.inputFormat || 'N/A'}\` \n`;
      doc += `- **출력 데이터 구조**: \`${node.outputFormat || 'N/A'}\` \n`;
      doc += `- **상세 처리 로직 및 메모**:\n`;
      doc += `  > ${node.notes || node.description}\n`;

      if (node.type === 'api' && node.rawItem) {
        doc += `- **API 사양 참조**: Service URL(\`${node.rawItem.serviceUrl || 'N/A'}\`), Docs(\`${node.rawItem.docsUrl || 'N/A'}\`)\n`;
      } else if (node.type === 'ai' && node.rawItem) {
        doc += `- **AI 모델 스펙 참조**: Provider(\`${node.rawItem.provider || 'N/A'}\`), Details(\`${node.rawItem.description || 'N/A'}\`)\n`;
      }
      doc += `\n`;
    });

    doc += `---\n\n`;

    doc += `## 🗺️ 3. 3단계 실행 개발 로드맵 (Development Roadmap)\n\n`;
    doc += `### 📌 Phase 1: 기반 환경 구축 & API 자원 연동 (1~2주차)\n`;
    doc += `- [ ] 개발 프로젝트 초기화 및 환경변수(API Key, 엔드포인트) 설정\n`;
    const apiNodes = sortedNodes.filter(n => n.type === 'api');
    if (apiNodes.length > 0) {
      apiNodes.forEach(n => {
        doc += `- [ ] API 연동 구현: **${n.title}** 모듈 핸들러 작성\n`;
      });
    } else {
      doc += `- [ ] 외부 HTTP/REST API 연동 데이터 파이프라인 모듈 작성\n`;
    }
    doc += `\n`;

    doc += `### 📌 Phase 2: AI 모델 파이프라인 & 핵심 비즈니스 로직 조립 (3~4주차)\n`;
    const aiNodes = sortedNodes.filter(n => n.type === 'ai');
    if (aiNodes.length > 0) {
      aiNodes.forEach(n => {
        doc += `- [ ] AI 추론 통합: **${n.title}** 프롬프트 및 응답 파싱 로직 결합\n`;
      });
    } else {
      doc += `- [ ] AI LLM 에이전트 커넥터 및 컨텍스트 파이프라인 구동\n`;
    }
    doc += `- [ ] 스텝 간 순차 데이터 파이프라인 처리 핸들러 및 예외 케이스 처리 구현\n\n`;

    doc += `### 📌 Phase 3: 인터페이스/UI 구성 & 엔드투엔드 검증 (5주차~)\n`;
    doc += `- [ ] 사용자 입출력 인터페이스 또는 웹 API 엔드포인트 노출\n`;
    doc += `- [ ] 전체 ${sortedNodes.length}개 스텝 엔드투엔드 시나리오 자동화 테스트 및 모니터링\n\n`;

    doc += `---\n\n`;

    doc += `## 🤖 4. LLM 바이브 코딩 전용 실행 프롬프트 (Vibe Coding Prompt)\n\n`;
    doc += `\`\`\`markdown\n`;
    doc += `당신은 시니어 풀스택 AI 에이전트 소프트웨어 아키텍트입니다.\n`;
    doc += `아래 정의된 ${sortedNodes.length}단계의 순차 플로우 시스템 아키텍처 설계서를 바탕으로 프로덕션 레벨의 모듈화된 코드를 작성해주세요.\n\n`;
    doc += `[구현 대상 서비스]\n`;
    doc += `- 파이프라인 명: Portal Bang AI 에이전트 오토메이션\n`;
    doc += `- 연결 스텝 수: ${sortedNodes.length}단계\n\n`;
    doc += `[스텝 순서 명세]\n`;
    sortedNodes.forEach((node, idx) => {
      doc += `${idx + 1}. [${node.type.toUpperCase()}] ${node.title}: ${node.notes || node.description}\n`;
    });
    doc += `\n위 각 스텝에 대한 비동기 함수와 에러 처리, 입출력 변환 로직이 완벽히 연동된 실행 가능한 코드를 작성하세요.\n`;
    doc += `\`\`\`\n`;

    // 3. 모달 결과 렌더링
    this.openOutputModal(doc);
  },

  /**
   * 연결 구조를 바탕으로 한 위상 정렬 (Topological Sort / Sequence Order)
   */
  getSequencedNodes() {
    if (this.nodes.length === 0) return [];

    const inDegree = {};
    const adj = {};

    this.nodes.forEach(n => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });

    this.connections.forEach(c => {
      if (adj[c.fromNodeId] && inDegree[c.toNodeId] !== undefined) {
        adj[c.fromNodeId].push(c.toNodeId);
        inDegree[c.toNodeId]++;
      }
    });

    const queue = [];
    this.nodes.forEach(n => {
      if (inDegree[n.id] === 0) queue.push(n.id);
    });

    const resultIds = [];
    while (queue.length > 0) {
      const currId = queue.shift();
      resultIds.push(currId);

      (adj[currId] || []).forEach(nextId => {
        inDegree[nextId]--;
        if (inDegree[nextId] === 0) {
          queue.push(nextId);
        }
      });
    }

    // 연결되지 않은 남은 노드들도 포함
    this.nodes.forEach(n => {
      if (!resultIds.includes(n.id)) {
        resultIds.push(n.id);
      }
    });

    return resultIds.map(id => this.nodes.find(n => n.id === id)).filter(Boolean);
  },

  /**
   * 모달 열기 & 내용 표시
   */
  openOutputModal(markdownContent) {
    const modal = document.getElementById('ab-output-modal');
    const contentEl = document.getElementById('ab-output-content');

    if (modal && contentEl) {
      contentEl.innerHTML = this.formatMarkdownToHtml(markdownContent);
      modal.classList.remove('hidden');
      modal.classList.add('active');
    }
  },

  closeOutputModal() {
    const modal = document.getElementById('ab-output-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.classList.add('hidden');
    }
  },

  /**
   * 간단 마크다운 렌더러 (HTML 변환)
   */
  formatMarkdownToHtml(mdText) {
    let html = this.escapeHtml(mdText);

    // 코드 블록
    html = html.replace(/```markdown([\s\S]*?)```/g, '<pre class="ab-code-block"><code>$1</code></pre>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="ab-code-block"><code>$1</code></pre>');

    // 헤더
    html = html.replace(/^# (.*$)/gim, '<h1 class="ab-doc-h1">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="ab-doc-h2">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="ab-doc-h3">$1</h3>');

    // 강조 & 코드
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`(.*?)`/g, '<code class="ab-inline-code">$1</code>');

    // 블록인용
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote class="ab-doc-quote">$1</blockquote>');

    // 줄바꿈
    html = html.replace(/\n/g, '<br>');

    return html;
  },

  /**
   * LocalStorage 저장 & 불러오기
   */
  saveToLocalStorage() {
    try {
      const data = {
        nodes: this.nodes,
        connections: this.connections,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('portal_bang_agent_builder_workflow', JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  },

  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('portal_bang_agent_builder_workflow');
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.nodes)) this.nodes = data.nodes;
        if (Array.isArray(data.connections)) this.connections = data.connections;
      }
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * 💾 지정한 이름으로 워크플로우 저장 모달 처리
   */
  openSaveModal() {
    const modal = document.getElementById('ab-save-modal');
    const nameInput = document.getElementById('ab-save-name');
    const descInput = document.getElementById('ab-save-desc');

    if (modal) {
      const defaultName = `AI 에이전트 설계_${new Date().toISOString().slice(0, 10)}`;
      if (nameInput) nameInput.value = defaultName;
      if (descInput) descInput.value = '';
      modal.classList.remove('hidden');
      modal.classList.add('active');
    }
  },

  closeSaveModal() {
    const modal = document.getElementById('ab-save-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.classList.add('hidden');
    }
  },

  /**
   * 개별 워크플로우 저장 (서버 DB / REST API + LocalStorage 캐시)
   */
  async saveNamedWorkflow(name, description) {
    try {
      const savedList = await this.getSavedWorkflowsList();
      const existingIndex = savedList.findIndex(item => item.name === name);

      const workflowData = {
        id: existingIndex >= 0 ? savedList[existingIndex].id : `wf_${Date.now()}`,
        name: name,
        description: description,
        nodes: JSON.parse(JSON.stringify(this.nodes)),
        connections: JSON.parse(JSON.stringify(this.connections)),
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        savedList[existingIndex] = workflowData;
      } else {
        savedList.unshift(workflowData);
      }

      localStorage.setItem('portal_bang_saved_workflows', JSON.stringify(savedList));
      this.saveToLocalStorage(); // 현재 임시 드래프트도 동기화

      // 백엔드 API 영구 저장
      try {
        await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedList)
        });
      } catch (e) {
        console.warn('[AgentBuilderView] Failed to save workflow to server API:', e);
      }

      if (window.UiView) window.UiView.showToast(`💾 [${name}] 워크플로우가 서버 및 로컬에 성공적으로 저장되었습니다!`);
    } catch (e) {
      console.error(e);
      if (window.UiView) window.UiView.showToast('❌ 워크플로우 저장 중 오류가 발생했습니다.', 'error');
    }
  },

  /**
   * 📂 저장된 워크플로우 목록 불러오기 모달 처리
   */
  async openLoadModal() {
    const modal = document.getElementById('ab-load-modal');
    if (modal) {
      await this.renderSavedWorkflowsList();
      modal.classList.remove('hidden');
      modal.classList.add('active');
    }
  },

  closeLoadModal() {
    const modal = document.getElementById('ab-load-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.classList.add('hidden');
    }
  },

  async getSavedWorkflowsList() {
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('portal_bang_saved_workflows', JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.warn('[AgentBuilderView] Failed to fetch saved workflows from server:', e);
    }
    try {
      const raw = localStorage.getItem('portal_bang_saved_workflows');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async renderSavedWorkflowsList() {
    const container = document.getElementById('ab-saved-list');
    if (!container) return;

    const savedList = await this.getSavedWorkflowsList();

    if (savedList.length === 0) {
      container.innerHTML = `
        <div class="ab-empty-resources" style="text-align: center; padding: 30px 10px;">
          <p style="font-size: 1rem; color: var(--text-muted);">📂 저장된 워크플로우가 없습니다.</p>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 6px;">
            캔버스 상단의 <strong>'💾 저장'</strong> 버튼을 눌러 현재 플로우를 원하는 이름으로 저장해보세요!
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = savedList.map(item => {
      const dateStr = new Date(item.updatedAt).toLocaleString('ko-KR');
      const nodeCount = Array.isArray(item.nodes) ? item.nodes.length : 0;
      const connCount = Array.isArray(item.connections) ? item.connections.length : 0;

      return `
        <div class="ab-saved-item-card">
          <div class="ab-saved-item-info">
            <h4 class="ab-saved-item-title">${this.escapeHtml(item.name)}</h4>
            <p class="ab-saved-item-desc">${this.escapeHtml(item.description || '설명 없음')}</p>
            <div class="ab-saved-item-meta">
              <span>📅 ${dateStr}</span>
              <span>🧩 노드 ${nodeCount}개</span>
              <span>🔗 연결 ${connCount}개</span>
            </div>
          </div>
          <div class="ab-saved-item-actions">
            <button class="btn btn-primary btn-sm btn-load-wf" data-id="${item.id}">
              📂 불러오기
            </button>
            <button class="btn btn-secondary btn-sm btn-del-wf" data-id="${item.id}">
              🗑️ 삭제
            </button>
          </div>
        </div>
      `;
    }).join('');

    // 이벤트 추가
    container.querySelectorAll('.btn-load-wf').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.loadWorkflowById(id);
      });
    });

    container.querySelectorAll('.btn-del-wf').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.deleteWorkflowById(id);
      });
    });
  },

  async loadWorkflowById(id) {
    const savedList = await this.getSavedWorkflowsList();
    const target = savedList.find(item => item.id === id);
    if (!target) return;

    this.nodes = JSON.parse(JSON.stringify(target.nodes || []));
    this.connections = JSON.parse(JSON.stringify(target.connections || []));
    this.selectedNodeId = null;

    this.saveToLocalStorage();
    this.renderCanvas();
    this.closeLoadModal();

    if (window.UiView) {
      window.UiView.showToast(`📂 [${target.name}] 워크플로우를 성공적으로 불러왔습니다!`);
    }
  },

  async deleteWorkflowById(id) {
    const savedList = await this.getSavedWorkflowsList();
    const target = savedList.find(item => item.id === id);
    if (!target) return;

    if (confirm(`'${target.name}' 워크플로우를 저장 목록에서 삭제하시겠습니까?`)) {
      const updatedList = savedList.filter(item => item.id !== id);
      localStorage.setItem('portal_bang_saved_workflows', JSON.stringify(updatedList));
      try {
        await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedList)
        });
      } catch (e) {
        console.warn('[AgentBuilderView] Failed to sync deleted workflows to server:', e);
      }
      await this.renderSavedWorkflowsList();
      if (window.UiView) window.UiView.showToast(`🗑️ [${target.name}] 워크플로우 삭제 완료`);
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
