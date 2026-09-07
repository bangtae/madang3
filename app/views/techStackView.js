// app/views/techStackView.js - 사이트 기술 정보 & 아키텍처 다이어그램 시각화 뷰 모듈 (최신 9대 에이전트 & Cloud Run/Supabase/Telegram 반영)

window.TechStackView = {
  canvas: null,
  ctx: null,
  nodes: [],
  selectedNode: null,
  animationFrameId: null,

  techStacks: [
    {
      category: "Frontend UI & Engine",
      title: "Pure Vanilla JavaScript (ES6+)",
      version: "ES2022+ / Web APIs",
      description: "무거운 프레임워크 의존성 없이 순수 모듈화 객체(MVC 패턴) 구조로 설계하여 제로 런타임 오버헤드와 초고속 반응속도를 보장합니다.",
      tags: ["ES6+ Modules", "MVC Pattern", "Async/Await", "Event-Driven", "Pub/Sub"],
      docsUrl: "https://developer.mozilla.org/ko/docs/Web/JavaScript"
    },
    {
      category: "Frontend Design System",
      title: "Glassmorphism Dark CSS System",
      version: "CSS3 / Custom Properties",
      description: "Vanilla CSS 기반 Design Token, Glassmorphism 반투명 블러 효과, HSL 컬러 팔레트 및 전면 반응형 대시보드 레이아웃입니다.",
      tags: ["CSS Variables", "Glassmorphism", "Backdrop Filter", "Responsive Grid", "Google Fonts"],
      docsUrl: "https://developer.mozilla.org/ko/docs/Web/CSS"
    },
    {
      category: "Interactive Graphics",
      title: "HTML5 Canvas 2D Engine",
      version: "HTML Canvas API",
      description: "AI/SAP 용어 마인드맵 방사형/트리 레이아웃 및 7개 핵심 노드 실시간 시스템 아키텍처 다이어그램을 동적 렌더링하는 자체 알고리즘 그래픽 엔진입니다.",
      tags: ["2D Canvas API", "Mindmap Radial Layout", "Interactive Dynamic Graph", "Particle Animation"],
      docsUrl: "https://developer.mozilla.org/ko/docs/Web/API/Canvas_API"
    },
    {
      category: "Cloud Server Gateway",
      title: "GCP Cloud Run Express Server",
      version: "Node.js v18+ / Express 4.19",
      description: "GCP 서울 리전(asia-northeast3)에서 구동되는 고가용성 마이크로서비스 게이트웨이입니다. 무중단 오토스케일링, IP 로깅 미들웨어 및 전체 RESTful API를 호스팅합니다.",
      tags: ["GCP Cloud Run", "Express 4.19", "asia-northeast3", "Auto Scaling", "IP Filter Middleware"],
      docsUrl: "https://cloud.google.com/run/docs"
    },
    {
      category: "Local Hybrid Gateway",
      title: "PowerShell Non-Blocking TCP Socket",
      version: "PowerShell 7+",
      description: "로컬 개발 환경용 초경량 비동기 TCP Listener 소켓 서버입니다. 로컬 파이썬 에이전트 프로세스(PID) 스폰 및 네이티브 OS 명령어를 제어합니다.",
      tags: ["TCP Socket HTTP", "Non-Blocking Loop", "Process Management", "Windows Native"],
      docsUrl: "https://learn.microsoft.com/ko-kr/powershell/"
    },
    {
      category: "AI Multi-Agent System",
      title: "9대 AI 에이전트 자율 오케스트레이션",
      version: "Multi-Agent Architecture",
      description: "투자 분석 5대 서브에이전트(신중론자/모멘텀분석가/가치평가사/수급추적자/단가예측가)와 운영 4대 에이전트(총괄 Supervisor, Threads SNS, SAP Suite, Telegram Guard)가 1시간 주기 자율 탐색 및 교차 검증을 수행합니다.",
      tags: ["5대 주식 서브에이전트", "총괄 Supervisor", "Threads SNS Agent", "SAP Suite Agent", "Telegram Guard"],
      docsUrl: "https://github.com"
    },
    {
      category: "AI Debate & Council",
      title: "AI 끝장 토론실 (Debate Arena) & 심의회",
      version: "Gemini 1.5 Pro / Flash",
      description: "서브에이전트 5인이 실시간 격론과 상호 반박을 펼치며, 메인 총괄 에이전트가 Gemini 1.5 엔진을 통해 최종 투자 의결 리포트 및 합의문을 자동 도출합니다.",
      tags: ["AI 끝장 토론실", "Debate Arena", "Google Gemini 1.5 Pro/Flash", "Consensus Engine", "Grounding Search"],
      docsUrl: "https://ai.google.dev/docs"
    },
    {
      category: "Cloud Database",
      title: "Supabase Cloud PostgreSQL 15+",
      version: "PostgreSQL 15+ / REST",
      description: "실시간 동기화(Realtime) 및 Row Level Security(RLS)를 지원하는 글로벌 클라우드 데이터베이스 플랫폼과 서버 로컬 JSON 영구 보존 스토리지의 하이브리드 구성입니다.",
      tags: ["Supabase PostgreSQL", "Realtime Sync", "Row Level Security", "JSON Persistence"],
      docsUrl: "https://supabase.com/docs"
    },
    {
      category: "Security & Remote Governance",
      title: "Telegram Bot 양방향 보안 가디언",
      version: "Telegram Bot API v7+",
      description: "외부 유입 IP를 1초 내에 실시간 감지하여 모바일 텔레그램으로 알림을 전송하고, 인라인 키보드 버튼을 통해 즉시 화이트리스트 허용/블랙리스트 차단을 원격 수행합니다.",
      tags: ["Telegram Bot API", "Inline Keyboard", "2-Way Remote Ops", "Realtime IP Guard", "Instant Block/Allow"],
      docsUrl: "https://core.telegram.org/bots/api"
    },
    {
      category: "Cloud DevOps & CI/CD",
      title: "GCP Docker & Agent Workflows",
      version: "Docker / Cloud Build",
      description: "Docker 컨테이너 가상화 및 /git, /gcp 에이전트 워크플로우를 통한 원스톱 무중단 클라우드 재배포 및 /_health 헬스체크 파이프라인입니다.",
      tags: ["Docker Container", "Artifact Registry", "/git & /gcp Workflows", "Zero-Downtime Deploy"],
      docsUrl: "https://cloud.google.com/build/docs"
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
          window.UiView.showToast('🔄 서버 Latency 핑 및 시스템 메트릭스가 재측정되었습니다.');
        }
      });
    }

    const btnCloseNode = document.getElementById('btn-close-tech-node');
    if (btnCloseNode) {
      btnCloseNode.addEventListener('click', () => {
        const detailPanel = document.getElementById('tech-node-detail');
        if (detailPanel) detailPanel.classList.add('hidden');
        this.selectedNode = null;
      });
    }

    window.addEventListener('resize', () => {
      if (this.canvas) {
        this.resizeCanvas();
      }
    });
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
        if (dbEl) dbEl.innerHTML = `Supabase & Express 🟢`;
      } else {
        pingEl.textContent = 'Timeout';
        pingEl.style.color = '#f87171';
      }
    } catch (e) {
      pingEl.textContent = 'Local Mode';
      pingEl.style.color = '#38bdf8';
      if (dbEl) dbEl.innerHTML = `Local Socket 🟡`;
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
    let stockReports = window.StockCouncilModel && window.StockCouncilModel.reports ? window.StockCouncilModel.reports.length : 0;

    const total = apis + aiModels + aiTerms + sapTerms + stockReports;
    resEl.textContent = `${total}건 (API:${apis}, AI:${aiModels}, 용어:${aiTerms + sapTerms}, 심의:${stockReports})`;
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

    this.resizeCanvas();
    this.bindCanvasEvents();
    this.startAnimation();
  },

  resizeCanvas() {
    const container = document.getElementById('tech-arch-container');
    if (!container || !this.canvas) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width || 900;
    const h = 420;

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');

    // 7개 핵심 아키텍처 노드 배치
    this.nodes = [
      {
        id: 'client',
        label: 'Client Browser UI',
        sub: 'Vanilla JS / Canvas',
        icon: '🖥️',
        x: w * 0.12,
        y: h * 0.28,
        color: '#38bdf8',
        desc: '사용자 브라우저 단입니다. Pure Vanilla JS MVC 아키텍처와 Canvas 2D Engine이 렌더링을 담당하며 LocalStorage 오프라인 캐시 및 실시간 상태를 유지합니다.'
      },
      {
        id: 'cloud_server',
        label: 'Cloud Run Gateway',
        sub: 'Express (Seoul)',
        icon: '☁️',
        x: w * 0.42,
        y: h * 0.22,
        color: '#6366f1',
        desc: 'GCP Cloud Run (asia-northeast3 서울 리전) 기반 메인 게이트웨이입니다. 무중단 오토스케일링, 실시간 IP 수집/로깅 미들웨어 및 전체 RESTful API를 호스팅합니다.'
      },
      {
        id: 'local_server',
        label: 'Local Dev Socket',
        sub: 'PowerShell TCP 8080',
        icon: '⚡',
        x: w * 0.12,
        y: h * 0.75,
        color: '#818cf8',
        desc: '로컬 개발 환경용 초경량 비동기 소켓 서버입니다. 로컬 파이썬 에이전트 프로세스(PID) 스폰, 백엔드 스케줄링 및 네이티브 OS 명령어를 중재합니다.'
      },
      {
        id: 'multi_agent',
        label: '9대 AI 에이전트군',
        sub: 'Supervisor & 8 Agents',
        icon: '🤖',
        x: w * 0.42,
        y: h * 0.68,
        color: '#f59e0b',
        desc: '투자 분석 5대 서브에이전트(신중/모멘텀/가치/수급/단가)와 운영 4대 에이전트(총괄 Supervisor, Threads SNS, SAP Suite, Telegram Guard)가 1시간 주기 자율 탐색 및 교차 검증을 수행합니다.'
      },
      {
        id: 'debate_arena',
        label: 'AI 끝장 토론실',
        sub: 'Debate Arena / Consensus',
        icon: '🔥',
        x: w * 0.72,
        y: h * 0.75,
        color: '#ef4444',
        desc: '서브에이전트 5인의 실시간 격론과 상호 반박을 펼치는 끝장 토론장입니다. Gemini LLM을 통해 최종 합의문 및 의결 리포트를 자동 도출합니다.'
      },
      {
        id: 'supabase_db',
        label: 'Cloud Supabase DB',
        sub: 'PostgreSQL 15 / Realtime',
        icon: '🗄️',
        x: w * 0.72,
        y: h * 0.22,
        color: '#22c55e',
        desc: '글로벌 분산 Cloud Supabase (PostgreSQL 15) 및 서버 로컬 JSON 영구 보존 스토리지로 구성된 Source of Truth 레이어로, 고속 쿼리 및 RLS 보안을 제공합니다.'
      },
      {
        id: 'telegram_guard',
        label: 'Telegram Guardian',
        sub: '2-Way Remote Security',
        icon: '🛡️',
        x: w * 0.92,
        y: h * 0.48,
        color: '#06b6d4',
        desc: '외부 유입 IP를 1초 내에 실시간 감지하여 모바일 텔레그램으로 알림을 전송하고, 인라인 키보드 버튼을 통해 즉시 화이트리스트 허용/블랙리스트 차단을 원격 수행합니다.'
      }
    ];
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
        if (Math.sqrt(dx * dx + dy * dy) <= 46) {
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

    title.innerHTML = `${node.icon || '🎯'} ${node.label} <span style="font-size: 0.8rem; color: var(--text-muted);">(${node.sub})</span>`;
    title.style.color = node.color;
    desc.textContent = node.desc;
    panel.classList.remove('hidden');
  },

  startAnimation() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    let step = 0;
    const animate = () => {
      step += 0.025;
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

    // 7개 노드 간의 핵심 연결선 정의
    const connections = [
      { from: 'client', to: 'cloud_server', label: 'HTTPS / REST API' },
      { from: 'client', to: 'local_server', label: 'Local TCP 8080' },
      { from: 'cloud_server', to: 'supabase_db', label: 'PostgreSQL / JSON Sync' },
      { from: 'cloud_server', to: 'multi_agent', label: 'Agent Trigger & Proxy' },
      { from: 'local_server', to: 'multi_agent', label: 'Python PID Spawner' },
      { from: 'multi_agent', to: 'debate_arena', label: 'Debate Summon & Arena' },
      { from: 'debate_arena', to: 'supabase_db', label: 'Consensus Reports' },
      { from: 'cloud_server', to: 'telegram_guard', label: 'Threat IP Alert' },
      { from: 'telegram_guard', to: 'cloud_server', label: 'Remote Block/Allow' }
    ];

    // 1. 연결선 및 동적 데이터 패킷 흐름 렌더링
    connections.forEach((c, idx) => {
      const n1 = this.nodes.find(n => n.id === c.from);
      const n2 = this.nodes.find(n => n.id === c.to);
      if (!n1 || !n2) return;

      // 점선 백본
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 실시간 데이터 패킷 애니메이션 (오프셋 적용)
      const progress = ((step + idx * 0.18) % 1);
      const px = n1.x + (n2.x - n1.x) * progress;
      const py = n1.y + (n2.y - n1.y) * progress;

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = n1.color;
      ctx.shadowColor = n1.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 연결 라벨
      const midX = (n1.x + n2.x) / 2;
      const midY = (n1.y + n2.y) / 2;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, midX, midY - 6);
    });

    // 2. 7개 아키텍처 노드 렌더링
    this.nodes.forEach(n => {
      const isSelected = this.selectedNode && this.selectedNode.id === n.id;

      // 후광 링
      ctx.beginPath();
      ctx.arc(n.x, n.y, isSelected ? 44 : 36, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? `${n.color}33` : `${n.color}15`;
      ctx.fill();

      // 노드 바디
      ctx.beginPath();
      ctx.arc(n.x, n.y, 30, 0, Math.PI * 2);
      ctx.fillStyle = '#0b1120';
      ctx.strokeStyle = n.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.shadowColor = n.color;
      ctx.shadowBlur = isSelected ? 12 : 4;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 아이콘
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.icon || '⚙️', n.x, n.y - 6);

      // 노드 서브텍스트
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.sub.split('/')[0].trim(), n.x, n.y + 11);

      // 하단 라벨
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label, n.x, n.y + 35);
    });
  }
};
