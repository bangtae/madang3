// app/views/mindmapView.js - HTML5 Canvas 2D 기반 인터랙티브 마인드맵 렌더러 (AI 용어 & SAP 용어 범용 지원)

class MindmapRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.terms = [];
    this.nodes = [];
    this.links = [];
    this.selectedNodeId = null;
    this.hoveredNodeId = null;

    // 마우스 pan & zoom 상태
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1
    };

    this.isDraggingCamera = false;
    this.dragStartPos = { x: 0, y: 0 };

    this.isDraggingNode = false;
    this.draggedNode = null;

    this.categoryColors = {
      '기초 개념': { bg: '#8b5cf6', border: '#a78bfa', glow: 'rgba(139, 92, 246, 0.6)' }, // Purple
      '신경망 / 아키텍처': { bg: '#3b82f6', border: '#60a5fa', glow: 'rgba(59, 130, 246, 0.6)' }, // Blue
      '모델 / 엔진': { bg: '#10b981', border: '#34d399', glow: 'rgba(16, 185, 129, 0.6)' }, // Green
      '학습 / 기법': { bg: '#f59e0b', border: '#fbbf24', glow: 'rgba(245, 158, 11, 0.6)' }, // Amber
      '응용 / 서비스': { bg: '#ec4899', border: '#f472b6', glow: 'rgba(236, 72, 153, 0.6)' }, // Pink
      '모듈 / 코어': { bg: '#0284c7', border: '#38bdf8', glow: 'rgba(2, 132, 199, 0.6)' }, // Sky Blue
      '개발 / ABAP': { bg: '#8b5cf6', border: '#c084fc', glow: 'rgba(139, 92, 246, 0.6)' }, // Purple
      '아키텍처 / 플랫폼': { bg: '#059669', border: '#34d399', glow: 'rgba(5, 150, 105, 0.6)' }, // Emerald
      '데이터 / 분석': { bg: '#d97706', border: '#fbbf24', glow: 'rgba(217, 119, 6, 0.6)' }, // Amber
      '운영 / 관리': { bg: '#64748b', border: '#94a3b8', glow: 'rgba(100, 116, 139, 0.6)' }, // Slate
      '기타': { bg: '#6b7280', border: '#9ca3af', glow: 'rgba(107, 114, 128, 0.6)' }
    };

    this._resizeHandler = null;
  }

  init(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById(containerId);

    this.resizeCanvas();
    if (!this._resizeHandler) {
      this._resizeHandler = () => {
        this.resizeCanvas();
        this.render();
      };
      window.addEventListener('resize', this._resizeHandler);
    }

    this.bindEvents();
  }

  resizeCanvas() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = Math.max(520, rect.height || 520);
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  setTerms(terms, onSelectCallback) {
    this.terms = terms || [];
    this.onSelectCallback = onSelectCallback;
    this.buildGraph();
    this.resetCamera();
    this.render();
  }

  resetCamera() {
    if (!this.container && !this.canvas) return;
    const rect = this.container ? this.container.getBoundingClientRect() : { width: 800, height: 520 };
    const width = rect.width || (this.canvas ? this.canvas.width : 800);
    const height = rect.height || (this.canvas ? this.canvas.height : 520);
    this.camera = {
      x: width / 2,
      y: height / 2,
      zoom: 1
    };
  }

  buildGraph() {
    if (!this.terms || this.terms.length === 0) {
      this.nodes = [];
      this.links = [];
      return;
    }

    const normalize = (str) => (str || '').toLowerCase().replace(/[\s\(\)\/_\-\[\]]/g, '');

    const findParentObj = (parentTermStr) => {
      if (!parentTermStr) return null;
      const cleanParent = normalize(parentTermStr);
      return this.terms.find(t => 
        t.id === parentTermStr ||
        normalize(t.term) === cleanParent ||
        normalize(t.term).includes(cleanParent) ||
        cleanParent.includes(normalize(t.term))
      );
    };

    const depthMap = new Map();
    const findDepth = (termObj, visited = new Set()) => {
      if (!termObj || visited.has(termObj.id)) return 0;
      visited.add(termObj.id);

      if (!termObj.parentTerm) return 0;

      const parentObj = findParentObj(termObj.parentTerm);
      if (!parentObj) return 0;

      return 1 + findDepth(parentObj, visited);
    };

    this.terms.forEach(t => {
      depthMap.set(t.id, findDepth(t));
    });

    const levels = new Map();
    this.terms.forEach(t => {
      const d = depthMap.get(t.id) || 0;
      if (!levels.has(d)) levels.set(d, []);
      levels.get(d).push(t);
    });

    const newNodes = [];
    const newLinks = [];

    levels.forEach((levelTerms, depth) => {
      const count = levelTerms.length;

      levelTerms.forEach((term, idx) => {
        let x = 0;
        let y = 0;

        if (depth === 0) {
          if (count === 1) {
            x = 0;
            y = 0;
          } else {
            const rootRadius = 120 + Math.floor(idx / 8) * 60;
            const angleStep = (Math.PI * 2) / Math.min(count, 8);
            const angle = (idx % 8) * angleStep;
            x = Math.cos(angle) * rootRadius;
            y = Math.sin(angle) * rootRadius;
          }
        } else {
          const radius = 170 * depth + (idx % 3) * 35;
          const angleStep = (Math.PI * 2) / count;
          const angle = idx * angleStep + (depth * 0.4);
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
        }

        const category = term.category || '기타';
        const colors = this.categoryColors[category] || this.categoryColors['기타'];
        const radius = depth === 0 ? 32 : (depth === 1 ? 26 : 22);

        newNodes.push({
          id: term.id,
          termObj: term,
          term: term.term,
          category: category,
          summary: term.summary || '',
          x,
          y,
          radius,
          colors,
          depth
        });
      });
    });

    this.terms.forEach(term => {
      if (term.parentTerm) {
        const parentObj = findParentObj(term.parentTerm);
        if (parentObj) {
          const sourceNode = newNodes.find(n => n.id === parentObj.id);
          const targetNode = newNodes.find(n => n.id === term.id);
          if (sourceNode && targetNode) {
            newLinks.push({
              source: sourceNode,
              target: targetNode
            });
          }
        }
      }
    });

    this.nodes = newNodes;
    this.links = newLinks;
  }

  arrangeLayout(layoutType = 'radial') {
    if (!this.nodes || this.nodes.length === 0) return;

    if (layoutType === 'radial') {
      this.buildGraph();
    } else if (layoutType === 'tree') {
      const depthGroups = new Map();
      this.nodes.forEach(n => {
        const d = n.depth || 0;
        if (!depthGroups.has(d)) depthGroups.set(d, []);
        depthGroups.get(d).push(n);
      });

      const maxDepth = Math.max(...Array.from(depthGroups.keys()), 0);
      const startY = -((maxDepth * 140) / 2);

      depthGroups.forEach((groupNodes, d) => {
        const y = startY + d * 140;
        const count = groupNodes.length;
        const spacing = Math.max(120, 900 / Math.max(count, 1));
        const startX = -((count - 1) * spacing) / 2;

        groupNodes.forEach((node, i) => {
          node.x = startX + i * spacing;
          node.y = y;
        });
      });
    } else if (layoutType === 'concentric') {
      const depthGroups = new Map();
      this.nodes.forEach(n => {
        const d = n.depth || 0;
        if (!depthGroups.has(d)) depthGroups.set(d, []);
        depthGroups.get(d).push(n);
      });

      depthGroups.forEach((groupNodes, d) => {
        const count = groupNodes.length;
        const radius = d === 0 ? 0 : d * 160;
        const angleStep = (Math.PI * 2) / count;

        groupNodes.forEach((node, i) => {
          const angle = i * angleStep;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
        });
      });
    }

    this.resetCamera();
    this.render();
  }

  searchAndFocusNode(keyword) {
    if (!keyword || !this.nodes.length) return false;

    const normalize = (str) => (str || '').toLowerCase().replace(/[\s\(\)\/_\-\[\]]/g, '');
    const cleanKey = normalize(keyword);

    const targetNode = this.nodes.find(n => normalize(n.term).includes(cleanKey));
    if (!targetNode) return false;

    this.selectedNodeId = targetNode.id;

    if (this.canvas) {
      this.camera.x = (this.canvas.width / 2) - (targetNode.x * this.camera.zoom);
      this.camera.y = (this.canvas.height / 2) - (targetNode.y * this.camera.zoom);
    }

    this.render();

    if (this.onSelectCallback && targetNode.termObj) {
      this.onSelectCallback(targetNode.termObj);
    }

    return true;
  }

  render() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    this.ctx.save();

    // 마인드맵 배경 렌더링
    this.drawBackgroundGrid(width, height);

    // 카메라 트랜스폼 적용
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    // 1. 노드 간 엣지 (선) 렌더링
    this.links.forEach(link => {
      this.drawLink(link);
    });

    // 2. 노드 (원형 버블) 렌더링
    this.nodes.forEach(node => {
      this.drawNode(node);
    });

    this.ctx.restore();
  }

  drawBackgroundGrid(width, height) {
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;

    const gridSize = 40 * this.camera.zoom;
    const offsetX = this.camera.x % gridSize;
    const offsetY = this.camera.y % gridSize;

    this.ctx.beginPath();
    for (let x = offsetX; x < width; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
    }
    this.ctx.stroke();
  }

  drawLink(link) {
    const { source, target } = link;
    const isSelected = (this.selectedNodeId === source.id || this.selectedNodeId === target.id);
    const isHovered = (this.hoveredNodeId === source.id || this.hoveredNodeId === target.id);

    this.ctx.save();
    this.ctx.beginPath();

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const cx1 = source.x + dx * 0.5;
    const cy1 = source.y;
    const cx2 = source.x + dx * 0.5;
    const cy2 = target.y;

    this.ctx.moveTo(source.x, source.y);
    this.ctx.bezierCurveTo(cx1, cy1, cx2, cy2, target.x, target.y);

    if (isSelected || isHovered) {
      this.ctx.strokeStyle = '#38bdf8';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
      this.ctx.shadowBlur = 10;
    } else {
      this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      this.ctx.lineWidth = 1.5;
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  drawNode(node) {
    const isSelected = (this.selectedNodeId === node.id);
    const isHovered = (this.hoveredNodeId === node.id);

    this.ctx.save();

    if (isSelected || isHovered) {
      this.ctx.shadowColor = node.colors.glow || 'rgba(56, 189, 248, 0.8)';
      this.ctx.shadowBlur = isSelected ? 20 : 12;
    }

    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = node.colors.bg;
    this.ctx.fill();

    this.ctx.lineWidth = isSelected ? 3.5 : (isHovered ? 2.5 : 1.5);
    this.ctx.strokeStyle = isSelected ? '#ffffff' : node.colors.border;
    this.ctx.stroke();

    // 텍스트 라벨 렌더링
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `${node.depth === 0 ? 'bold 13px' : '11px'} Inter, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const maxLen = 14;
    let displayTerm = node.term;
    if (displayTerm.length > maxLen) {
      displayTerm = displayTerm.substring(0, maxLen - 1) + '…';
    }

    this.ctx.fillText(displayTerm, node.x, node.y);
    this.ctx.restore();
  }

  bindEvents() {
    if (!this.canvas) return;

    // 마우스 휠 Zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(0.4, this.camera.zoom * zoomFactor), 2.5);

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.camera.x = mouseX - (mouseX - this.camera.x) * (newZoom / this.camera.zoom);
      this.camera.y = mouseY - (mouseY - this.camera.y) * (newZoom / this.camera.zoom);
      this.camera.zoom = newZoom;

      this.render();
    }, { passive: false });

    // 모바일 터치 및 브라우저 스크롤 방지 CSS 설정
    this.canvas.style.touchAction = 'none';

    // -------------------------------------------------------------
    // PC 마우스 및 모바일 터치 통합 이벤트 헬퍼 유틸리티
    // -------------------------------------------------------------
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      if (e.touches && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const getTouchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    let initialPinchDistance = 0;
    let initialPinchZoom = 1;

    // 드래그/터치 시작
    const handleStart = (e) => {
      if (e.touches && e.touches.length === 2) {
        // 멀티터치 (핀치 줌) 시작
        this.isDraggingNode = false;
        this.isDraggingCamera = false;
        initialPinchDistance = getTouchDistance(e.touches);
        initialPinchZoom = this.camera.zoom;
        return;
      }

      const pos = getPos(e);
      const worldX = (pos.x - this.camera.x) / this.camera.zoom;
      const worldY = (pos.y - this.camera.y) / this.camera.zoom;

      const clickedNode = this.nodes.find(node => {
        const dx = worldX - node.x;
        const dy = worldY - node.y;
        return (dx * dx + dy * dy) <= (node.radius * node.radius);
      });

      if (clickedNode) {
        this.isDraggingNode = true;
        this.draggedNode = clickedNode;
        this.selectedNodeId = clickedNode.id;
        this.render();

        if (this.onSelectCallback) {
          this.onSelectCallback(clickedNode.termObj);
        }
      } else {
        this.isDraggingCamera = true;
        this.dragStartPos = { x: pos.x - this.camera.x, y: pos.y - this.camera.y };
      }
    };

    // 드래그/터치 이동
    const handleMove = (e) => {
      if (e.touches && e.touches.length === 2) {
        // 멀티터치 (핀치 줌) 이동
        if (e.cancelable) e.preventDefault();
        const currentDist = getTouchDistance(e.touches);
        if (initialPinchDistance > 0) {
          const scale = currentDist / initialPinchDistance;
          const newZoom = Math.min(Math.max(0.4, initialPinchZoom * scale), 3.0);
          this.camera.zoom = newZoom;
          this.render();
        }
        return;
      }

      const pos = getPos(e);
      const worldX = (pos.x - this.camera.x) / this.camera.zoom;
      const worldY = (pos.y - this.camera.y) / this.camera.zoom;

      if (this.isDraggingNode && this.draggedNode) {
        if (e.cancelable) e.preventDefault();
        this.draggedNode.x = worldX;
        this.draggedNode.y = worldY;
        this.render();
        return;
      }

      if (this.isDraggingCamera) {
        if (e.cancelable) e.preventDefault();
        this.camera.x = pos.x - this.dragStartPos.x;
        this.camera.y = pos.y - this.dragStartPos.y;
        this.render();
        return;
      }

      // 호버 처리 (마우스 호버)
      const hoveredNode = this.nodes.find(node => {
        const dx = worldX - node.x;
        const dy = worldY - node.y;
        return (dx * dx + dy * dy) <= (node.radius * node.radius);
      });

      if (hoveredNode) {
        this.canvas.style.cursor = 'pointer';
        if (this.hoveredNodeId !== hoveredNode.id) {
          this.hoveredNodeId = hoveredNode.id;
          this.render();
        }
      } else {
        this.canvas.style.cursor = this.isDraggingCamera ? 'grabbing' : 'default';
        if (this.hoveredNodeId !== null) {
          this.hoveredNodeId = null;
          this.render();
        }
      }
    };

    // 드래그/터치 종료
    const handleEnd = () => {
      this.isDraggingNode = false;
      this.draggedNode = null;
      this.isDraggingCamera = false;
      initialPinchDistance = 0;
    };

    // PC 마우스 이벤트 바인딩
    this.canvas.addEventListener('mousedown', handleStart);
    this.canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    // 모바일/스마트폰 터치 이벤트 바인딩 (Touch Events)
    this.canvas.addEventListener('touchstart', (e) => {
      handleStart(e);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      handleMove(e);
    }, { passive: false });

    this.canvas.addEventListener('touchend', handleEnd, { passive: true });
    this.canvas.addEventListener('touchcancel', handleEnd, { passive: true });
  }
}

window.MindmapRenderer = MindmapRenderer;
window.MindmapView = new MindmapRenderer();
window.SapMindmapView = new MindmapRenderer();
