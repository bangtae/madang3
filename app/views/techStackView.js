// app/views/techStackView.js - 사이트 기술 정보 & 아키텍처 다이어그램 시각화 뷰 모듈

window.TechStackView = {
  canvas: null,
  ctx: null,
  nodes: [],
  selectedNode: null,
  animationFrameId: null,

  techStacks: [
    {
      category: "Frontend UI & Logic",
      title: "Pure Vanilla JavaScript (ES6+)",
      version: "ES2022+",
      description: "무거운 프레임워크 의존성 없이 순수 모듈화 객체 구조로 설계하여 초고속 반응속도와 경량성을 보장합니다.",
      tags: ["ES6+", "Async/Await", "Event-Driven", "Pub/Sub Pattern"],
      docsUrl: "https://developer.mozilla.org/ko/docs/Web/JavaScript"
    },
    {
      category: "Frontend UI & Design",
      title: "HTML5 & CSS3 Design System",
      version: "HTML5 / CSS3",
      description: "Vanilla CSS 기반 Custom Properties(변수), Glassmorphism 효과 및 HSL 컬러 팔레트가 적용된 테마 레이아웃입니다.",
      tags: ["CSS Custom Properties", "Glassmorphism", "Responsive Layout", "Google Fonts"],
      docsUrl: "https://developer.mozilla.org/ko/docs/Web/CSS"
    },
    {
      category: "Interactive Graphics",
      title: "HTML5 Canvas 2D Engine",
      version: "HTML Canvas API",
      description: "AI/SAP 용어 마인드맵 및 시스템 데이터 흐름 아키텍처 다이어그램을 동적으로 렌더링하는 자체 알고리즘 시각화 엔진입니다.",
      tags: ["2D Canvas API", "Mindmap Radial/Tree Layout", "Interactive Graph"],
      docsUrl: "https://developer.mozilla.org/ko/docs/Web/API/Canvas_API"
    },
    {
      category: "Backend Server",
      title: "PowerShell Non-Blocking TCP Server",
      version: "PowerShell 7+",
      description: "비동기 TCP Listener 스레드 루프 기반으로 작동하며 IP 화이트리스트/블랙리스트 및 실시간 유입 로그를 직접 처리합니다.",
      tags: ["HTTP/1.1 TCP Socket", "IP Whitelist/Blacklist", "Access Logging", "Non-Blocking"],
      docsUrl: "https://learn.microsoft.com/ko-kr/powershell/"
    },
    {
      category: "Backend REST API",
      title: "Node.js Express Server",
      version: "v18+",
      description: "마이크로서비스 및 Cloud Run 환경 구동을 지원하는 백엔드 RESTful API 프레임워크입니다.",
      tags: ["Express.js", "RESTful API", "JSON Persistence", "Middleware"],
      docsUrl: "https://expressjs.com/ko/"
    },
    {
      category: "Cloud Database",
      title: "Supabase PostgreSQL Database",
      version: "PostgreSQL 15+",
      description: "실시간 동기화 및 Row Level Security를 지원하는 글로벌 클라우드 데이터베이스 플랫폼입니다.",
      tags: ["PostgreSQL 15", "Supabase JS Client v2", "Realtime Sync", "REST Auto API"],
      docsUrl: "https://supabase.com/docs"
    },
    {
      category: "AI Integration",
      title: "Google Gemini 1.5 Flash API",
      version: "v1beta",
      description: "URL 자동 조사 및 AI/SAP 기술 개념 시맨틱 추출을 담당하는 차세대 추론 AI API 엔진입니다.",
      tags: ["Gemini 1.5 Flash", "REST API", "URL Auto Inspection", "Semantic Analysis"],
      docsUrl: "https://ai.google.dev/docs"
    },
    {
      category: "Data Utilities",
      title: "SheetJS (XLSX Parser)",
      version: "v0.18+",
      description: "대용량 엑셀 파일(.xlsx, .xls) 업로드 시 데이터 컬럼 및 셀 하이퍼링크 주소를 클라이언트 단에서 파싱합니다.",
      tags: ["Excel Parsing", "Hyperlink Extraction", "Bulk Register"],
      docsUrl: "https://sheetjs.com/"
    },
    {
      category: "Infrastructure & Cloud",
      title: "GCP Cloud Run & Docker",
      version: "Docker / Container",
      description: "컨테이너 가상화를 통한 무중단 자동 스케일링 배포 환경 및 /_health 헬스체크 모니터링을 제공합니다.",
      tags: ["GCP Cloud Run", "Docker Container", "Dockerfile", "Health Check"],
      docsUrl: "https://cloud.google.com/run/docs"
    }
  ],

  init() {
    this.bindEvents();
    this.refreshMetrics();
    this.renderTechStackCards();
    this.initCanvas();
  },

  bindEvents() {
    const btnRefresh = document.getElementById('btn-refresh-tech-metrics');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.refreshMetrics();
        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast('🔄 서버 Latency 핑 및 메트릭스가 재측정되었습니다.');
        }
      });
    }

    const btnCloseNode = document.getElementById('btn-close-tech-node');
    if (btnCloseNode) {
      btnCloseNode.addEventListener('click', () => {
        const detailPanel = document.getElementById('tech-node-detail');
        if (detailPanel) detailPanel.classList.add('hidden');
      });
    }
  },

  async refreshMetrics() {
    this.measureServerPing();
    this.updateStorageUsage();
    this.updateTotalResources();
  },

  async measureServerPing() {
    const pingEl = document.getElementById('metric-ping-ms');
    const dbEl = document.getElementById('metric-db-status');
    if (!pingEl) return;

    const start = performance.now();
    try {
      const res = await fetch('/api/my-ip', { cache: 'no-cache' });
      const duration = Math.round(performance.now() - start);
      if (res.ok) {
        pingEl.textContent = `${duration} ms`;
        if (duration < 50) {
          pingEl.style.color = '#4ade80';
        } else if (duration < 150) {
          pingEl.style.color = '#facc15';
        } else {
          pingEl.style.color = '#f87171';
        }
        if (dbEl) dbEl.innerHTML = `Connected 🟢`;
      } else {
        pingEl.textContent = 'Timeout';
        pingEl.style.color = '#f87171';
      }
    } catch (e) {
      pingEl.textContent = 'Local Mode';
      pingEl.style.color = '#38bdf8';
      if (dbEl) dbEl.innerHTML = `Local Server 🟡`;
    }
  },

  updateStorageUsage() {
    const storageEl = document.getElementById('metric-storage-usage');
    if (!storageEl) return;

    let totalBytes = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalBytes += (localStorage[key].length + key.length) * 2;
        }
      }
    } catch (e) {}

    const kb = (totalBytes / 1024).toFixed(1);
    const percent = ((totalBytes / (5 * 1024 * 1024)) * 100).toFixed(1);
    storageEl.textContent = `${kb} KB (${percent}% / 5MB)`;
  },

  updateTotalResources() {
    const resEl = document.getElementById('metric-total-resources');
    if (!resEl) return;

    let apis = window.ApiModel ? window.ApiModel.getApis().length : 0;
    let aiModels = window.AiModel ? window.AiModel.getAiModels().length : 0;
    let aiTerms = window.AiTermModel ? window.AiTermModel.getTerms().length : 0;
    let sapTerms = window.SapTermModel ? window.SapTermModel.getTerms().length : 0;

    const total = apis + aiModels + aiTerms + sapTerms;
    resEl.textContent = `${total}건 (API:${apis}, AI:${aiModels}, 용어:${aiTerms + sapTerms})`;
  },

  renderTechStackCards() {
    const container = document.getElementById('tech-stack-grid');
    if (!container) return;

    container.innerHTML = this.techStacks.map(item => `
      <div class="tech-stack-card">
        <div>
          <div class="tsc-header">
            <span class="tsc-title">⚙️ ${item.title}</span>
            <span class="tsc-badge">${item.version}</span>
          </div>
          <p class="tsc-desc" style="margin-top: 8px;">${item.description}</p>
          <div class="tsc-tags">
            ${item.tags.map(t => `<span class="tsc-tag"># ${t}</span>`).join('')}
          </div>
        </div>
        <div class="tsc-footer">
          <span style="font-size: 0.75rem; color: var(--text-muted);">${item.category}</span>
          <a href="${item.docsUrl}" target="_blank" rel="noopener noreferrer" class="tsc-docs-btn">
            📖 공식 Docs ↗
          </a>
        </div>
      </div>
    `).join('');
  },

  initCanvas() {
    const container = document.getElementById('tech-arch-container');
    this.canvas = document.getElementById('tech-arch-canvas');
    if (!container || !this.canvas) return;

    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 380;
    this.ctx = this.canvas.getContext('2d');

    const w = this.canvas.width;
    const h = this.canvas.height;

    // 아키텍처 구성 노드 설정
    this.nodes = [
      {
        id: 'client',
        label: 'Client Browser',
        sub: 'Vanilla JS / CSS3 / Canvas Engine',
        x: w * 0.18,
        y: h * 0.5,
        color: '#38bdf8',
        desc: '사용자 웹 브라우저 단입니다. Pure Vanilla JS와 Canvas 2D Engine이 렌더링을 담당하며 LocalStorage 오프라인 캐시를 유지합니다.'
      },
      {
        id: 'server',
        label: 'Web Server Layer',
        sub: 'PowerShell TCP / Express REST API',
        x: w * 0.45,
        y: h * 0.3,
        color: '#6366f1',
        desc: 'PowerShell Non-Blocking Socket HTTP 서버 및 Node.js Express REST API 백엔드 레이어로, IP 보안 및 라우팅을 처리합니다.'
      },
      {
        id: 'db',
        label: 'Database Layer',
        sub: 'Supabase PostgreSQL / JSON Storage',
        x: w * 0.78,
        y: h * 0.3,
        color: '#4ade80',
        desc: '중앙 Cloud Supabase (PostgreSQL 15) 및 서버 로컬 JSON 영구 보존 파일 스토리지로 구성된 Source of Truth 레이어입니다.'
      },
      {
        id: 'ai',
        label: 'AI Service Engine',
        sub: 'Google Gemini 1.5 Flash REST API',
        x: w * 0.55,
        y: h * 0.75,
        color: '#ec4899',
        desc: 'Google Gemini 1.5 Flash REST API 서비스로, 웹 URL 자동 파싱 및 AI/SAP 용어 시맨틱 분석 기능을 실시간 제공합니다.'
      }
    ];

    this.bindCanvasEvents();
    this.startAnimation();
  },

  bindCanvasEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      this.nodes.forEach(n => {
        const dx = clickX - n.x;
        const dy = clickY - n.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 45) {
          found = n;
        }
      });

      if (found) {
        this.selectedNode = found;
        this.showNodeDetail(found);
      }
    });
  },

  showNodeDetail(node) {
    const panel = document.getElementById('tech-node-detail');
    const title = document.getElementById('tech-node-title');
    const desc = document.getElementById('tech-node-desc');
    if (!panel || !title || !desc) return;

    title.textContent = `🎯 ${node.label} (${node.sub})`;
    title.style.color = node.color;
    desc.textContent = node.desc;
    panel.classList.remove('hidden');
  },

  startAnimation() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    let step = 0;
    const animate = () => {
      step += 0.03;
      this.drawCanvas(step);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  },

  drawCanvas(step) {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 연결선 및 파동 애니메이션
    const connections = [
      { from: 'client', to: 'server', label: 'HTTP / REST API' },
      { from: 'server', to: 'db', label: 'SQL / JSON Sync' },
      { from: 'client', to: 'ai', label: 'AI Prompt Stream' },
      { from: 'server', to: 'ai', label: 'Backend Gemini Call' }
    ];

    connections.forEach(c => {
      const n1 = this.nodes.find(n => n.id === c.from);
      const n2 = this.nodes.find(n => n.id === c.to);
      if (!n1 || !n2) return;

      // 선 그리기
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 파동 이펙트 패킷
      const progress = (step % 1);
      const px = n1.x + (n2.x - n1.x) * progress;
      const py = n1.y + (n2.y - n1.y) * progress;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = n1.color;
      ctx.shadowColor = n1.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 라벨
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText(c.label, midX - 25, midY - 6);
    });

    // 노드 그리기
    this.nodes.forEach(n => {
      const isSelected = this.selectedNode && this.selectedNode.id === n.id;

      // 외곽 후광
      ctx.beginPath();
      ctx.arc(n.x, n.y, isSelected ? 46 : 38, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? `${n.color}44` : `${n.color}22`;
      ctx.fill();

      // 노드 원형
      ctx.beginPath();
      ctx.arc(n.x, n.y, 32, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = n.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      ctx.fill();

      // 노드 텍스트
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y - 2);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px sans-serif';
      ctx.fillText(n.sub.split('/')[0], n.x, n.y + 12);
    });
  }
};
