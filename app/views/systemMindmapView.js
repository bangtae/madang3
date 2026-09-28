// app/views/systemMindmapView.js - 통합 기능 & AI 에이전트 확장 마인드맵 인터랙티브 뷰 모듈 (D3.js 기반)

window.SystemMindmapView = {
  data: null,
  svg: null,
  g: null,
  zoom: null,
  treeLayout: null,
  rootNode: null,
  selectedNodeData: null,
  i: 0,
  duration: 400,

  categoryColors: {
    root: { stroke: '#a855f7', fill: '#6b21a8', text: '#f3e8ff' },
    madang3: { stroke: '#38bdf8', fill: '#0369a1', text: '#e0f2fe' },
    madang6: { stroke: '#10b981', fill: '#047857', text: '#d1fae5' },
    pipeline: { stroke: '#f59e0b', fill: '#b45309', text: '#fef3c7' },
    mcp_llm_roadmap: { stroke: '#ec4899', fill: '#be185d', text: '#fce7f3' }
  },

  async init() {
    this.bindTabEvents();
    this.bindToolbarEvents();
    await this.loadData();
  },

  bindTabEvents() {
    const btnMindmapTab = document.getElementById('tab-btn-tech-mindmap');
    const btnInfraTab = document.getElementById('tab-btn-tech-infra');
    const contentMindmap = document.getElementById('tech-content-mindmap');
    const contentInfra = document.getElementById('tech-content-infra');

    if (!btnMindmapTab || !btnInfraTab) return;

    btnMindmapTab.addEventListener('click', () => {
      btnMindmapTab.classList.add('btn-primary');
      btnMindmapTab.classList.remove('btn-secondary');
      btnInfraTab.classList.remove('btn-primary');
      btnInfraTab.classList.add('btn-secondary');

      if (contentMindmap) contentMindmap.classList.remove('hidden');
      if (contentInfra) contentInfra.classList.add('hidden');

      setTimeout(() => {
        this.renderMindmap();
      }, 50);
    });

    btnInfraTab.addEventListener('click', () => {
      btnInfraTab.classList.add('btn-primary');
      btnInfraTab.classList.remove('btn-secondary');
      btnMindmapTab.classList.remove('btn-primary');
      btnMindmapTab.classList.add('btn-secondary');

      if (contentInfra) contentInfra.classList.remove('hidden');
      if (contentMindmap) contentMindmap.classList.add('hidden');

      if (window.TechStackView && window.TechStackView.initCanvas) {
        window.TechStackView.initCanvas();
      }
    });
  },

  bindToolbarEvents() {
    // 검색
    const searchInput = document.getElementById('mindmap-search-input');
    const btnSearch = document.getElementById('btn-mindmap-search');
    const btnClearSearch = document.getElementById('btn-mindmap-clear-search');

    if (btnSearch && searchInput) {
      btnSearch.addEventListener('click', () => this.searchNode(searchInput.value));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.searchNode(searchInput.value);
      });
    }
    if (btnClearSearch && searchInput) {
      btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        this.clearSearchHighlight();
      });
    }

    // 줌/화면 제어
    const btnZoomIn = document.getElementById('btn-mindmap-zoom-in');
    const btnZoomOut = document.getElementById('btn-mindmap-zoom-out');
    const btnFit = document.getElementById('btn-mindmap-fit');
    const btnFullscreen = document.getElementById('btn-mindmap-fullscreen');
    const btnRefresh = document.getElementById('btn-mindmap-refresh');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        if (this.svg && this.zoom) {
          d3.select(this.svg).transition().duration(300).call(this.zoom.scaleBy, 1.3);
        }
      });
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        if (this.svg && this.zoom) {
          d3.select(this.svg).transition().duration(300).call(this.zoom.scaleBy, 1 / 1.3);
        }
      });
    }
    if (btnFit) {
      btnFit.addEventListener('click', () => this.fitToScreen());
    }
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.loadData(true);
      });
    }

    // 내보내기
    const btnExportJson = document.getElementById('btn-mindmap-export-json');
    const btnExportSvg = document.getElementById('btn-mindmap-export-svg');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => this.exportJson());
    }
    if (btnExportSvg) {
      btnExportSvg.addEventListener('click', () => this.exportSvg());
    }

    // 우측 인스펙터 패널
    const btnCloseInspector = document.getElementById('btn-close-inspector');
    if (btnCloseInspector) {
      btnCloseInspector.addEventListener('click', () => {
        const panel = document.getElementById('mindmap-inspector-panel');
        if (panel) panel.classList.add('hidden');
      });
    }

    // 계획 메모 저장
    const btnSavePlan = document.getElementById('btn-save-plan-note');
    if (btnSavePlan) {
      btnSavePlan.addEventListener('click', () => this.savePlanNote());
    }
  },

  async loadData(isRefresh = false) {
    try {
      const res = await fetch('/api/admin/mindmap-data');
      if (res.ok) {
        const json = await res.json();
        this.data = json.data;
        if (isRefresh && window.UiView && window.UiView.showToast) {
          window.UiView.showToast('✅ 마인드맵 최신 데이터를 성공적으로 불러왔습니다.');
        }
      } else {
        throw new Error('마인드맵 API 응답 오류: ' + res.status);
      }
    } catch (err) {
      console.warn('마인드맵 API 로드 실패, 로컬 JSON 폴백 시도:', err);
      try {
        const fallbackRes = await fetch('data/systemMindmap.json');
        if (fallbackRes.ok) {
          this.data = await fallbackRes.json();
        }
      } catch (e) {
        console.error('마인드맵 데이터 로드 완전 실패:', e);
      }
    }

    if (this.data) {
      this.renderMindmap();
    }
  },

  renderMindmap() {
    if (!this.data || !this.data.root) return;
    if (typeof d3 === 'undefined') {
      console.warn('D3.js가 로드되지 않았습니다.');
      return;
    }

    const container = document.getElementById('mindmap-svg-wrapper');
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = Math.max(680, container.clientHeight || 680);

    // 기존 SVG 내부 초기화
    container.innerHTML = '<svg id="mindmap-svg" style="width: 100%; height: 100%; min-height: 680px; display: block;"></svg>';
    this.svg = document.getElementById('mindmap-svg');

    const svgSel = d3.select(this.svg)
      .attr('width', width)
      .attr('height', height);

    // Zoom & Pan 설정
    this.g = svgSel.append('g').attr('class', 'mindmap-root-g');
    this.zoom = d3.zoom()
      .scaleExtent([0.15, 3.0])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });
    svgSel.call(this.zoom).on('dblclick.zoom', null);

    // D3 Hierarchy 설정
    this.rootNode = d3.hierarchy(this.data.root, d => d.children);
    this.rootNode.x0 = height / 2;
    this.rootNode.y0 = 80;

    // 2단계 이상 노드는 기본 접힘 처리 (초기 가독성 최적화)
    if (this.rootNode.children) {
      this.rootNode.children.forEach(child => {
        if (child.children) {
          child._children = child.children;
          // child.children = null; // 필요 시 접기
        }
      });
    }

    // 마인드맵 트리 레이아웃 (가로형)
    this.treeLayout = d3.tree().nodeSize([42, 280]);

    this.update(this.rootNode);

    // 초기 화면 맞춤
    setTimeout(() => {
      this.fitToScreen();
    }, 150);
  },

  update(source) {
    const treeData = this.treeLayout(this.rootNode);
    const nodes = treeData.descendants();
    const links = treeData.links();

    // 노드 간격 depth 기반 정규화
    nodes.forEach(d => {
      d.y = d.depth * 270 + 80;
    });

    // 1. 노드 렌더링
    const node = this.g.selectAll('g.mindmap-node')
      .data(nodes, d => d.id || (d.id = ++this.i));

    // 신규 노드 진입(Enter)
    const nodeEnter = node.enter().append('g')
      .attr('class', d => `mindmap-node node-${d.data.category || 'default'}`)
      .attr('transform', () => `translate(${source.y0 || 80},${source.x0 || 300})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        // 자식 접기/펼치기 토글
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else if (d._children) {
          d.children = d._children;
          d._children = null;
        }
        this.selectNode(d);
        this.update(d);
      });

    // 노드 원형 마커
    nodeEnter.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => (d.depth === 0 ? 14 : (d.depth === 1 ? 10 : 7)))
      .attr('fill', d => {
        const cat = d.data.category || 'madang3';
        return this.categoryColors[cat]?.fill || '#3b82f6';
      })
      .attr('stroke', d => {
        const cat = d.data.category || 'madang3';
        return this.categoryColors[cat]?.stroke || '#60a5fa';
      })
      .attr('stroke-width', 2.5);

    // 자식 노드가 접혀있을 때 표시되는 '+' 기호
    nodeEnter.append('text')
      .attr('class', 'expand-indicator')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .text(d => (d._children ? '+' : ''));

    // 노드 라벨 텍스트
    const textGroup = nodeEnter.append('text')
      .attr('class', 'node-text')
      .attr('dy', '0.35em')
      .attr('x', d => (d.children || d._children ? -18 : 16))
      .attr('text-anchor', d => (d.children || d._children ? 'end' : 'start'))
      .text(d => d.data.name)
      .style('fill', '#f1f5f9')
      .style('font-size', d => (d.depth === 0 ? '14px' : (d.depth === 1 ? '13px' : '11.5px')))
      .style('font-weight', d => (d.depth <= 1 ? '700' : '500'))
      .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)');

    // 배지 라벨 (있을 경우 작게 옆에 표시)
    nodeEnter.filter(d => !!d.data.badge)
      .append('rect')
      .attr('class', 'badge-bg')
      .attr('x', d => (d.children || d._children ? -18 - (d.data.name.length * 11) - 65 : 18 + (d.data.name.length * 10) + 6))
      .attr('y', -9)
      .attr('width', 70)
      .attr('height', 18)
      .attr('rx', 9)
      .attr('fill', 'rgba(15, 23, 42, 0.8)')
      .attr('stroke', 'rgba(255, 255, 255, 0.2)');

    nodeEnter.filter(d => !!d.data.badge)
      .append('text')
      .attr('class', 'badge-text')
      .attr('x', d => (d.children || d._children ? -18 - (d.data.name.length * 11) - 30 : 18 + (d.data.name.length * 10) + 41))
      .attr('y', 3.5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9.5px')
      .attr('fill', '#94a3b8')
      .text(d => d.data.badge);

    // 노드 업데이트 (Update Transition)
    const nodeUpdate = node.merge(nodeEnter).transition().duration(this.duration)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    nodeUpdate.select('circle.node-circle')
      .attr('r', d => (d.depth === 0 ? 14 : (d.depth === 1 ? 10 : 7)))
      .attr('fill', d => {
        if (this.selectedNodeData && this.selectedNodeData.data.id === d.data.id) {
          return '#38bdf8'; // 선택 노드 강조
        }
        const cat = d.data.category || 'madang3';
        return d._children ? (this.categoryColors[cat]?.stroke || '#60a5fa') : (this.categoryColors[cat]?.fill || '#3b82f6');
      })
      .attr('stroke-width', d => (this.selectedNodeData && this.selectedNodeData.data.id === d.data.id ? 4 : 2.5));

    nodeUpdate.select('text.expand-indicator')
      .text(d => (d._children ? '+' : ''));

    // 노드 퇴장(Exit Transition)
    const nodeExit = node.exit().transition().duration(this.duration)
      .attr('transform', () => `translate(${source.y},${source.x})`)
      .remove();

    nodeExit.select('circle').attr('r', 1e-6);
    nodeExit.select('text').style('fill-opacity', 1e-6);

    // 2. 링크(연결선) 렌더링
    const link = this.g.selectAll('path.mindmap-link')
      .data(links, d => d.target.id);

    // 신규 링크 진입
    const linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'mindmap-link')
      .attr('d', () => {
        const o = { x: source.x0 || 300, y: source.y0 || 80 };
        return d3.linkHorizontal().x(d => d.y).y(d => d.x)({ source: o, target: o });
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        const cat = d.target.data.category || 'madang3';
        return this.categoryColors[cat]?.stroke || 'rgba(255,255,255,0.25)';
      })
      .attr('stroke-width', 1.8)
      .attr('stroke-opacity', 0.45);

    // 링크 업데이트
    link.merge(linkEnter).transition().duration(this.duration)
      .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x));

    // 링크 퇴장
    link.exit().transition().duration(this.duration)
      .attr('d', () => {
        const o = { x: source.x, y: source.y };
        return d3.linkHorizontal().x(d => d.y).y(d => d.x)({ source: o, target: o });
      })
      .remove();

    // 현재 위치를 다음 트랜지션의 이전 위치로 저장
    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  },

  selectNode(d) {
    this.selectedNodeData = d;
    const nodeData = d.data;

    // 우측 인스펙터 패널 표시
    const panel = document.getElementById('mindmap-inspector-panel');
    if (!panel) return;
    panel.classList.remove('hidden');

    // 패널 내부 데이터 채우기
    const titleEl = document.getElementById('inspector-title');
    const badgeEl = document.getElementById('inspector-badge');
    const catEl = document.getElementById('inspector-category');
    const summaryEl = document.getElementById('inspector-summary');
    const descEl = document.getElementById('inspector-desc');
    const pathsContainer = document.getElementById('inspector-paths');
    const triggersEl = document.getElementById('inspector-triggers');
    const apisContainer = document.getElementById('inspector-apis');
    const roadmapEl = document.getElementById('inspector-roadmap');
    const planNoteTextarea = document.getElementById('inspector-plan-note');

    if (titleEl) titleEl.textContent = nodeData.name || '노드 상세';
    if (badgeEl) badgeEl.textContent = nodeData.badge || '정보';
    if (catEl) {
      const catNames = {
        madang3: 'madang3 포털',
        madang6: 'madang6 AI 에이전트',
        pipeline: '외부 파이프라인',
        mcp_llm_roadmap: '확장 로드맵',
        root: '통합 시스템'
      };
      catEl.textContent = catNames[nodeData.category] || nodeData.category || '시스템';
    }
    if (summaryEl) summaryEl.textContent = nodeData.summary || '상세 정보가 없습니다.';
    if (descEl) descEl.textContent = nodeData.description || nodeData.summary || '상세 설명이 등록되지 않았습니다.';

    // 파일 경로 렌더링
    if (pathsContainer) {
      pathsContainer.innerHTML = '';
      if (nodeData.paths && nodeData.paths.length > 0) {
        nodeData.paths.forEach(p => {
          const item = document.createElement('div');
          item.className = 'inspector-path-badge';
          item.style.cssText = 'background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.12); padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; color: #38bdf8; margin-bottom: 4px; word-break: break-all; cursor: pointer;';
          item.title = '클릭 시 클립보드에 경로 복사';
          item.textContent = '📄 ' + p;
          item.addEventListener('click', () => {
            navigator.clipboard.writeText(p);
            if (window.UiView && window.UiView.showToast) {
              window.UiView.showToast('📋 경로가 클립보드에 복사되었습니다: ' + p);
            }
          });
          pathsContainer.appendChild(item);
        });
      } else {
        pathsContainer.innerHTML = '<span style="color: #64748b; font-size: 0.82rem;">관련 파일 경로 없음</span>';
      }
    }

    if (triggersEl) triggersEl.textContent = nodeData.triggers || '실시간 온디맨드 호출';

    // 외부 연동 API 목록
    if (apisContainer) {
      apisContainer.innerHTML = '';
      if (nodeData.externalApis && nodeData.externalApis.length > 0) {
        nodeData.externalApis.forEach(api => {
          const badge = document.createElement('span');
          badge.style.cssText = 'display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; padding: 2px 8px; border-radius: 12px; font-size: 0.78rem; margin: 2px 4px 2px 0;';
          badge.textContent = '🔌 ' + api;
          apisContainer.appendChild(badge);
        });
      } else {
        apisContainer.innerHTML = '<span style="color: #64748b; font-size: 0.82rem;">직접 연동 API 없음</span>';
      }
    }

    // 로드맵
    if (roadmapEl) {
      roadmapEl.textContent = nodeData.expansionRoadmap || '향후 확장 계획 검토 중';
    }

    // 사용자 계획 메모
    if (planNoteTextarea) {
      planNoteTextarea.value = nodeData.userPlanNote || '';
    }
  },

  async savePlanNote() {
    if (!this.selectedNodeData) {
      alert('저장할 노드가 선택되지 않았습니다.');
      return;
    }

    const planNoteTextarea = document.getElementById('inspector-plan-note');
    if (!planNoteTextarea) return;

    const newNote = planNoteTextarea.value;
    const targetId = this.selectedNodeData.data.id;

    // 데이터 트리에서 해당 노드 찾아서 메모 갱신
    let found = false;
    const updateNodeInTree = (node) => {
      if (node.id === targetId) {
        node.userPlanNote = newNote;
        found = true;
        return;
      }
      if (node.children) {
        node.children.forEach(updateNodeInTree);
      }
    };
    updateNodeInTree(this.data.root);

    if (!found) {
      alert('노드를 찾지 못했습니다.');
      return;
    }

    // 백엔드 API로 저장
    try {
      const btnSave = document.getElementById('btn-save-plan-note');
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = '⏳ 저장 중...';
      }

      const res = await fetch('/api/admin/mindmap-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: this.data })
      });

      if (res.ok) {
        this.selectedNodeData.data.userPlanNote = newNote;
        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast('💾 계획 메모가 성공적으로 저장되었습니다!');
        } else {
          alert('계획 메모가 성공적으로 저장되었습니다.');
        }
      } else {
        const err = await res.json();
        alert('저장 실패: ' + (err.error || '서버 오류'));
      }
    } catch (e) {
      alert('서버 통신 오류: ' + e.message);
    } finally {
      const btnSave = document.getElementById('btn-save-plan-note');
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = '💾 계획 메모 저장';
      }
    }
  },

  searchNode(keyword) {
    if (!keyword || !keyword.trim()) {
      this.clearSearchHighlight();
      return;
    }
    const q = keyword.trim().toLowerCase();

    // 일치하는 노드 탐색
    let matchedD3Node = null;
    let matchedCount = 0;

    // 전체 펼치며 탐색
    const expandAndMatch = (d) => {
      if (d._children) {
        d.children = d._children;
        d._children = null;
      }
      const name = (d.data.name || '').toLowerCase();
      const desc = (d.data.description || '').toLowerCase();
      const summary = (d.data.summary || '').toLowerCase();

      if (name.includes(q) || desc.includes(q) || summary.includes(q)) {
        if (!matchedD3Node) matchedD3Node = d;
        matchedCount++;
      }
      if (d.children) {
        d.children.forEach(expandAndMatch);
      }
    };

    expandAndMatch(this.rootNode);
    this.update(this.rootNode);

    if (matchedD3Node) {
      this.selectNode(matchedD3Node);

      // 매칭된 노드로 줌/패닝 포커스
      setTimeout(() => {
        const svgEl = document.getElementById('mindmap-svg');
        const width = svgEl ? svgEl.clientWidth : 1000;
        const height = svgEl ? svgEl.clientHeight : 680;

        const targetX = width / 2 - matchedD3Node.y;
        const targetY = height / 2 - matchedD3Node.x;

        d3.select(this.svg).transition().duration(600).call(
          this.zoom.transform,
          d3.zoomIdentity.translate(targetX, targetY).scale(1.2)
        );

        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast(`🔍 '${keyword}' 검색 결과: ${matchedCount}개 노드 발견`);
        }
      }, 300);
    } else {
      if (window.UiView && window.UiView.showToast) {
        window.UiView.showToast(`⚠️ '${keyword}'와 일치하는 노드를 찾지 못했습니다.`);
      }
    }
  },

  clearSearchHighlight() {
    this.fitToScreen();
  },

  fitToScreen() {
    if (!this.svg || !this.rootNode || !this.zoom) return;
    const container = document.getElementById('mindmap-svg-wrapper');
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = Math.max(680, container.clientHeight || 680);

    const transform = d3.zoomIdentity.translate(80, height / 2).scale(0.85);
    d3.select(this.svg).transition().duration(500).call(this.zoom.transform, transform);
  },

  toggleFullscreen() {
    const target = document.getElementById('tech-content-mindmap');
    if (!target) return;

    if (!document.fullscreenElement) {
      target.requestFullscreen().catch(err => {
        console.warn('전체화면 전환 실패:', err);
      });
      target.classList.add('is-fullscreen');
    } else {
      document.exitFullscreen();
      target.classList.remove('is-fullscreen');
    }
    setTimeout(() => {
      this.fitToScreen();
    }, 200);
  },

  exportJson() {
    if (!this.data) return;
    const jsonStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `madang_system_mindmap_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (window.UiView && window.UiView.showToast) {
      window.UiView.showToast('📥 마인드맵 JSON 파일이 다운로드되었습니다.');
    }
  },

  exportSvg() {
    const svgEl = document.getElementById('mindmap-svg');
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    // CSS 스타일 인라인 보강
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `madang_system_mindmap_${new Date().toISOString().slice(0, 10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    if (window.UiView && window.UiView.showToast) {
      window.UiView.showToast('🖼️ 마인드맵 SVG 벡터 이미지가 다운로드되었습니다.');
    }
  }
};
