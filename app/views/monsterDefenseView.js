// app/views/monsterDefenseView.js - 紐ъ뒪?곕? 留됰뒗踰?諛섏쓳??寃뚯엫 酉?而댄룷?뚰듃

window.MonsterDefenseView = (function() {
  let isInitialized = false;
  let isRunning = false;
  let engine = null;
  let render = null;
  let runner = null;
  let resizeObserver = null;
  let sfx = null;

  function initGame() {
    /* ==========================================================
       1. 사운드 시스템 (Web Audio API Synthesizer)
       ========================================================== */
    class SoundFX {
      constructor() {
        this.ctx = null;
      }
      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }
      playHit(vol = 1.0, pitch = 1.0) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(30 * pitch, now + 0.12);
        gain.gain.setValueAtTime(0.25 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }
      playThrow(vol = 1.0) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.18 * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
      playExplosion() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.45;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 0.45);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.45);
      }
      playUltimate() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        // 웅장한 필살기 발동 사운드 (화음 + 스위프)
        [220, 330, 440, 660].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.exponentialRampToValueAtTime(freq * 2.2, now + 0.6);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        });
      }
      playSwitch() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      }
      playDamageCastle() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
      playBossRoar() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(160, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      }
    }
    sfx = new SoundFX();
    window.addEventListener('pointerdown', () => sfx.init(), { once: true });
    window.addEventListener('keydown', () => sfx.init(), { once: true });

    /* ==========================================================
       2. 에셋 경로 감지 및 이미지 프리로드
       ========================================================== */
    let assetPrefix = 'assets/monster-defense/';
    const curPath = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    if (curPath.includes('/assets/') || curPath.endsWith('/assets')) {
      assetPrefix = './';
    }

    const imageCache = {};
    const imgNames = ['mob_chicken.png', 'mob_bug.png', 'mob_bomb.png', 'mob_eye.png', 'hero_regool.png', 'hero_himo.png', 'hero_gomdum.png'];
    
    imgNames.forEach(name => {
      const img = new Image();
      img.src = assetPrefix + name;
      img.onerror = () => { img.src = './' + name; };
      imageCache[name] = img;
    });

    /* ==========================================================
       3. Matter.js 모듈 및 엔진 세팅
       ========================================================== */
    const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint, Vector, Events, Body } = Matter;

    const WIDTH = 1024;
    const HEIGHT = 600;
    const DEFENSE_LINE_X = 135;

    engine = Engine.create({
      gravity: { x: 0, y: 1.1, scale: 0.001 }
    });
    const world = engine.world;

    render = Render.create({
      element: document.getElementById('canvas-container'),
      engine: engine,
      options: {
        width: WIDTH,
        height: HEIGHT,
        wireframes: false,
        background: '#141824',
        showVelocity: false
      }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    /* ==========================================================
       4. 마우스 인터랙션 및 MouseConstraint
       ========================================================== */
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.85,
        damping: 0.05,
        render: {
          visible: true,
          type: 'line',
          strokeStyle: 'rgba(255, 209, 102, 0.75)',
          lineWidth: 3
        }
      }
    });

    mouseConstraint.collisionFilter.mask = 0x0002;
    Composite.add(world, mouseConstraint);
    render.mouse = mouse;

    // [諛섏쓳??諛?紐⑤컮???곗튂 議곗옉 蹂댁젙]
    const canvasEl = render.canvas;
    canvasEl.style.touchAction = 'none';

    function mapTouchToCanvas(touch) {
      const rect = canvasEl.getBoundingClientRect();
      const scaleX = 1024 / (rect.width || 1024);
      const scaleY = 600 / (rect.height || 600);
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }

    canvasEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (sfx) sfx.init();
      if (e.touches.length > 0) {
        isMouseDown = true;
        const pos = mapTouchToCanvas(e.touches[0]);
        mousePos = pos;
        mouseHistory.push({ x: pos.x, y: pos.y });

        // Matter.js Mouse Constraint 醫뚰몴 媛뺤젣 ?숆린??        mouse.position.x = pos.x;
        mouse.position.y = pos.y;
        mouse.button = 0;
      }
    }, { passive: false });

    canvasEl.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = mapTouchToCanvas(e.touches[0]);
        mousePos = pos;
        mouseHistory.push({ x: pos.x, y: pos.y });
        if (mouseHistory.length > 5) mouseHistory.shift();

        mouse.position.x = pos.x;
        mouse.position.y = pos.y;
      }
    }, { passive: false });

    const onTouchEnd = (e) => {
      isMouseDown = false;
      mouse.button = -1;
    };
    canvasEl.addEventListener('touchend', onTouchEnd, { passive: false });
    canvasEl.addEventListener('touchcancel', onTouchEnd, { passive: false });

    /* ==========================================================
       5. 게임 상태 변수 (스테이지 및 필살기 포함)
       ========================================================== */
    let currentHero = 'regool';
    let score = 0;
    let kills = 0;
    let stage = 1;
    let stageKills = 0;
    const killsPerStage = 5; // 아케이드 빠른 템포: 5마리 처치 시 다음 스테이지
    let defenseHp = 100;
    let isGameOver = false;
    let isGameWon = false;

    // 필살기 게이지 (0 ~ 100)
    let ultGauge = 0;
    const maxUltGauge = 100;
    let activeUltAnimation = null; // 필살기 화면 연출 객체

    // 보스 상태 관리
    let currentBoss = null; // 활성화된 보스 객체

    let grabbedBody = null;
    let mouseHistory = [];
    let mousePos = { x: 0, y: 0 };
    let isMouseDown = false;

    const particles = [];
    const floatingTexts = [];
    let defenseHitFlash = 0;
    let cutinTimer = null;

    /* ==========================================================
       6. 벽 및 왕국 방어선 생성
       ========================================================== */
    const wallCategory = 0x0001;
    const monsterCategory = 0x0002;

    const ground = Bodies.rectangle(WIDTH / 2, HEIGHT - 15, WIDTH + 200, 50, {
      isStatic: true,
      friction: 0.8,
      restitution: 0.35,
      collisionFilter: { category: wallCategory },
      render: { fillStyle: '#1c2233' }
    });

    const ceiling = Bodies.rectangle(WIDTH / 2, -25, WIDTH + 200, 50, {
      isStatic: true,
      collisionFilter: { category: wallCategory },
      render: { fillStyle: '#1c2233' }
    });

    const rightWall = Bodies.rectangle(WIDTH + 30, HEIGHT / 2, 60, HEIGHT, {
      isStatic: true,
      collisionFilter: { category: wallCategory },
      render: { fillStyle: '#1c2233' }
    });

    const leftWall = Bodies.rectangle(-30, HEIGHT / 2, 60, HEIGHT, {
      isStatic: true,
      collisionFilter: { category: wallCategory },
      render: { fillStyle: '#1c2233' }
    });

    const defenseWall = Bodies.rectangle(DEFENSE_LINE_X, HEIGHT / 2, 24, HEIGHT, {
      isStatic: true,
      label: 'defense_wall',
      collisionFilter: { category: wallCategory },
      render: {
        fillStyle: 'rgba(239, 71, 111, 0.15)',
        strokeStyle: '#ef476f',
        lineWidth: 2
      }
    });

    Composite.add(world, [ground, ceiling, rightWall, leftWall, defenseWall]);

    /* ==========================================================
       7. 주인공(영웅) 선택 및 대형 컷인 시스템
       ========================================================== */
    const heroMeta = {
      regool: { name: '레굴', skill: '파워 투척 가속 x2.2 + 강타!', ultName: '운석 메테오 폭격', img: 'hero_regool.png', color: '#ef476f' },
      himo: { name: '히모', skill: '광역 자력장 포획 흡인!', ultName: '심연 블랙홀 분쇄', img: 'hero_himo.png', color: '#06d6a0' },
      gomdum: { name: '곰둠님', skill: '초고속 팽이 관통 스핀!', ultName: '폭풍 관통 토네이도', img: 'hero_gomdum.png', color: '#ffd166' }
    };

    window.selectHero = function(heroName) {
      if (currentHero === heroName) return;
      currentHero = heroName;
      sfx.playSwitch();

      document.querySelectorAll('.hero-card').forEach(card => {
        if (card.getAttribute('data-hero') === heroName) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });

      const meta = heroMeta[heroName];
      document.getElementById('ult-name-label').innerText = `⚡ ${meta.ultName} [SPACE]`;

      const cutinOverlay = document.getElementById('cutin-overlay');
      const cutinImg = document.getElementById('cutin-img');
      const cutinTitle = document.getElementById('cutin-title');
      const cutinDesc = document.getElementById('cutin-desc');

      cutinImg.src = assetPrefix + meta.img;
      cutinTitle.innerText = `${meta.name} 강림!`;
      cutinTitle.style.color = meta.color;
      cutinDesc.innerText = meta.skill;

      cutinOverlay.classList.add('active');
      if (cutinTimer) clearTimeout(cutinTimer);
      cutinTimer = setTimeout(() => cutinOverlay.classList.remove('active'), 700);
    };

    /* ==========================================================
       8. 필살기(궁극기) 시스템
       ========================================================== */
    function addUltGauge(amount) {
      if (ultGauge >= maxUltGauge) return;
      ultGauge = Math.min(maxUltGauge, ultGauge + amount);
      updateUltUI();
    }

    function updateUltUI() {
      const fill = document.getElementById('ult-fill');
      const percent = document.getElementById('ult-percent-label');
      const dock = document.getElementById('ult-dock');

      fill.style.width = `${ultGauge}%`;
      percent.innerText = `${Math.floor(ultGauge)}%`;

      if (ultGauge >= maxUltGauge) {
        dock.classList.add('ready');
        percent.innerText = 'READY!';
      } else {
        dock.classList.remove('ready');
      }
    }

    window.triggerUltimate = function() {
      if (ultGauge < maxUltGauge || isGameOver || isGameWon) return;

      ultGauge = 0;
      updateUltUI();
      sfx.playUltimate();

      const meta = heroMeta[currentHero];
      spawnFloatingText(WIDTH / 2, 180, `⚡ ULTIMATE: ${meta.ultName}! ⚡`, meta.color, 36);

      if (currentHero === 'regool') {
        // [레굴] 운석 메테오 폭격: 하늘에서 거대 메테오 5개 강하
        activeUltAnimation = {
          type: 'meteor',
          frame: 0,
          maxFrames: 60,
          meteors: [
            { x: 260, y: -50, targetX: 300, targetY: HEIGHT - 80, delay: 0 },
            { x: 450, y: -50, targetX: 480, targetY: HEIGHT - 100, delay: 8 },
            { x: 620, y: -50, targetX: 650, targetY: HEIGHT - 80, delay: 16 },
            { x: 800, y: -50, targetX: 820, targetY: HEIGHT - 90, delay: 24 },
            { x: 920, y: -50, targetX: 900, targetY: HEIGHT - 100, delay: 30 }
          ]
        };
      } else if (currentHero === 'himo') {
        // [히모] 심연 블랙홀 분쇄: 화면 중앙으로 모든 적 흡인 후 폭발
        activeUltAnimation = {
          type: 'blackhole',
          frame: 0,
          maxFrames: 90,
          centerX: (WIDTH + DEFENSE_LINE_X) / 2 + 50,
          centerY: HEIGHT / 2 - 20
        };
      } else if (currentHero === 'gomdum') {
        // [곰둠님] 폭풍 관통 토네이도: 좌->우로 거대 토네이도가 휩쓸고 감
        activeUltAnimation = {
          type: 'tornado',
          frame: 0,
          maxFrames: 80,
          x: DEFENSE_LINE_X + 20,
          speed: 10
        };
      }
    };

    // 키보드 이벤트
    window.addEventListener('keydown', (e) => {
      if (e.key === '1') selectHero('regool');
      if (e.key === '2') selectHero('himo');
      if (e.key === '3') selectHero('gomdum');
      if (e.code === 'Space') {
        e.preventDefault();
        triggerUltimate();
      }
      if (e.key === 'r' || e.key === 'R') restartGame();
    });

    /* ==========================================================
       9. 마우스 드래그 & 투척 이벤트 처리
       ========================================================== */
    Events.on(mouseConstraint, 'startdrag', (evt) => {
      grabbedBody = evt.body;
      sfx.init();

      if (grabbedBody && grabbedBody.monsterData) {
        grabbedBody.monsterData.isGrabbed = true;
        if (grabbedBody.monsterData.type === 'bomb' && !grabbedBody.monsterData.timerStarted) {
          grabbedBody.monsterData.timerStarted = true;
          grabbedBody.monsterData.timer = 3.0;
        }
      }
    });

    Events.on(mouseConstraint, 'enddrag', (evt) => {
      if (grabbedBody) {
        const mBody = grabbedBody;
        if (mBody.monsterData) mBody.monsterData.isGrabbed = false;

        if (mouseHistory.length >= 2) {
          const pNew = mouseHistory[mouseHistory.length - 1];
          const pOld = mouseHistory[0];
          const dt = Math.max(1, mouseHistory.length - 1);
          let vx = (pNew.x - pOld.x) / dt * 0.95;
          let vy = (pNew.y - pOld.y) / dt * 0.95;

          // 보스는 무거워서 투척 속도가 약간 감쇄됨
          const isBoss = mBody.monsterData && mBody.monsterData.isBoss;
          const bossWeightFactor = isBoss ? 0.45 : 1.0;

          if (currentHero === 'regool') {
            vx *= (2.2 * bossWeightFactor);
            vy *= (2.2 * bossWeightFactor);
            Body.setVelocity(mBody, { x: vx, y: vy });
            sfx.playThrow(1.4);
            spawnBurstParticles(mBody.position.x, mBody.position.y, 14, '#ef476f');
          } else if (currentHero === 'gomdum') {
            Body.setVelocity(mBody, { x: vx * 1.3 * bossWeightFactor, y: vy * 1.3 * bossWeightFactor });
            Body.setAngularVelocity(mBody, (Math.random() > 0.5 ? 1 : -1) * (isBoss ? 0.3 : 0.65));
            sfx.playThrow(1.1);
            spawnBurstParticles(mBody.position.x, mBody.position.y, 14, '#ffd166');
          } else {
            Body.setVelocity(mBody, { x: vx * 1.2 * bossWeightFactor, y: vy * 1.2 * bossWeightFactor });
            sfx.playThrow(1.0);
          }
        }
        grabbedBody = null;
      }
    });

    render.canvas.addEventListener('mousemove', (e) => {
      const rect = render.canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      mousePos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
      mouseHistory.push({ x: mousePos.x, y: mousePos.y });
      if (mouseHistory.length > 5) mouseHistory.shift();
    });

    render.canvas.addEventListener('mousedown', () => { isMouseDown = true; });
    window.addEventListener('mouseup', () => { isMouseDown = false; });

    /* ==========================================================
       10. 몬스터 & 보스 스폰 시스템 (스테이지 스케일링)
       ========================================================== */
    const monsters = [];

    // 스테이지별 이동 속도 & 난이도 계수
    function getStageSpeedMultiplier() {
      return 1 + (stage - 1) * 0.015; // 스테이지당 1.5%씩 점진 가속
    }

    function spawnMonster(typeOverride = null, customPos = null) {
      if (isGameOver || isGameWon) return;

      const types = ['chicken', 'bug', 'bomb', 'eye'];
      const chosenType = typeOverride || types[Math.floor(Math.random() * types.length)];

      let x = customPos ? customPos.x : (WIDTH - 50 - Math.random() * 60);
      let y = customPos ? customPos.y : 300;

      const radius = 52.5;
      const speedMult = getStageSpeedMultiplier();
      let hp = Math.round((45 + stage * 1.5));
      let maxHp = hp;
      let textureName = '';
      let density = 0.002;
      let restitution = 0.4;
      let borderColor = '#ffd166';

      if (chosenType === 'chicken') {
        if (!customPos) y = HEIGHT - 85;
        textureName = 'mob_chicken.png';
        restitution = 0.3;
        borderColor = '#ef476f';
      } else if (chosenType === 'bug') {
        if (!customPos) y = HEIGHT - 110 - Math.random() * 180;
        hp = Math.round((28 + stage * 1.2));
        maxHp = hp;
        textureName = 'mob_bug.png';
        density = 0.0013;
        restitution = 0.75;
        borderColor = '#06d6a0';
      } else if (chosenType === 'bomb') {
        if (!customPos) y = HEIGHT - 95;
        hp = Math.round((55 + stage * 1.8));
        maxHp = hp;
        textureName = 'mob_bomb.png';
        density = 0.0035;
        restitution = 0.25;
        borderColor = '#ff7700';
      } else if (chosenType === 'eye') {
        if (!customPos) y = 110 + Math.random() * 140;
        hp = Math.round((35 + stage * 1.4));
        maxHp = hp;
        textureName = 'mob_eye.png';
        density = 0.0016;
        borderColor = '#118ab2';
      }

      const body = Bodies.circle(x, y, radius, {
        density: density,
        friction: 0.35,
        restitution: restitution,
        collisionFilter: {
          category: monsterCategory,
          mask: wallCategory | monsterCategory
        },
        render: { visible: false }
      });

      body.monsterData = {
        type: chosenType,
        hp: hp,
        maxHp: maxHp,
        radius: radius,
        textureName: textureName,
        borderColor: borderColor,
        isGrabbed: false,
        timerStarted: false,
        timer: 3.0,
        flashTimer: 0,
        dead: false,
        isBoss: false
      };

      // 스테이지 가속 속도 적용
      if (chosenType === 'chicken') {
        Body.setVelocity(body, { x: (-3.4 - Math.random() * 1.5) * speedMult, y: -2 });
      } else if (chosenType === 'eye') {
        Body.setVelocity(body, { x: (-2.0 - Math.random() * 1.0) * speedMult, y: 0 });
      } else {
        Body.setVelocity(body, { x: (-2.2 - Math.random() * 1.5) * speedMult, y: -2 });
      }

      Composite.add(world, body);
      monsters.push(body);
    }

    /* 50스테이지 중간보스 & 100스테이지 최종보스 소환 */
    function spawnBoss(stageNum) {
      sfx.playBossRoar();
      const bossBar = document.getElementById('boss-bar-container');
      const bossTitle = document.getElementById('boss-title');
      bossBar.classList.add('active');

      if (stageNum === 50) {
        // [50스테이지 중간보스] 초거대 폭주 꼬꼬 (지름 160px, HP 800)
        const radius = 80;
        const x = WIDTH - 90;
        const y = HEIGHT - 110;
        const hp = 800;

        const body = Bodies.circle(x, y, radius, {
          density: 0.008, // 묵직한 질량
          friction: 0.4,
          restitution: 0.25,
          collisionFilter: {
            category: monsterCategory,
            mask: wallCategory | monsterCategory
          },
          render: { visible: false }
        });

        body.monsterData = {
          type: 'chicken',
          name: '초거대 폭주 꼬꼬 (MID-BOSS)',
          hp: hp,
          maxHp: hp,
          radius: radius,
          textureName: 'mob_chicken.png',
          borderColor: '#ff0055',
          isGrabbed: false,
          timerStarted: false,
          flashTimer: 0,
          dead: false,
          isBoss: true,
          bossStage: 50,
          skillTimer: 180 // 주기적 미니 쫄 소환 타이머
        };

        Body.setVelocity(body, { x: -2.5, y: -2 });
        Composite.add(world, body);
        monsters.push(body);
        currentBoss = body;

        bossTitle.innerText = `⚠️ 50F MID-BOSS: 초거대 폭주 꼬꼬`;
        updateBossBar(hp, hp);
        spawnFloatingText(WIDTH / 2, 160, '⚠️ 50F 중간보스 출현! ⚠️', '#ff0055', 38);

      } else if (stageNum === 100) {
        // [100스테이지 최종보스] 심연의 마왕 눈괴물 (지름 220px, HP 2500)
        const radius = 110;
        const x = WIDTH - 120;
        const y = 200;
        const hp = 2500;

        const body = Bodies.circle(x, y, radius, {
          density: 0.012, // 최강 질량
          friction: 0.3,
          restitution: 0.3,
          collisionFilter: {
            category: monsterCategory,
            mask: wallCategory | monsterCategory
          },
          render: { visible: false }
        });

        body.monsterData = {
          type: 'eye',
          name: '심연의 마왕 눈괴물 (FINAL BOSS)',
          hp: hp,
          maxHp: hp,
          radius: radius,
          textureName: 'mob_eye.png',
          borderColor: '#9d4edd',
          isGrabbed: false,
          timerStarted: false,
          flashTimer: 0,
          dead: false,
          isBoss: true,
          bossStage: 100,
          skillTimer: 120 // 암흑 충격파 타이머
        };

        Body.setVelocity(body, { x: -1.6, y: 0 });
        Composite.add(world, body);
        monsters.push(body);
        currentBoss = body;

        bossTitle.innerText = `☠️ 100F FINAL BOSS: 심연의 마왕 눈괴물`;
        updateBossBar(hp, hp);
        spawnFloatingText(WIDTH / 2, 160, '☠️ FINAL BOSS: 심연의 마왕 강림! ☠️', '#9d4edd', 42);
      }
    }

    function updateBossBar(hp, maxHp) {
      const fill = document.getElementById('boss-hp-fill');
      const text = document.getElementById('boss-hp-text');
      const ratio = Math.max(0, hp / maxHp);
      fill.style.width = `${ratio * 100}%`;
      text.innerText = `${Math.max(0, hp)} / ${maxHp}`;
    }

    // 스폰 타이머
    let spawnCountdown = 80;
    function updateSpawner() {
      if (currentBoss && !currentBoss.monsterData.dead) {
        // 보스전 중에는 일반 스폰을 대폭 제한하고 보스 자체의 스킬로 소환
        return;
      }

      spawnCountdown--;
      if (spawnCountdown <= 0) {
        // 스테이지가 올라갈수록 다수 스폰 확률 증가
        const multiSpawnRoll = Math.random();
        const multiChance = Math.min(0.65, 0.2 + stage * 0.005);

        if (multiSpawnRoll < multiChance) {
          spawnMonster();
          setTimeout(() => spawnMonster(), 300);
          if (stage > 40 && Math.random() < 0.4) setTimeout(() => spawnMonster(), 600);
        } else {
          spawnMonster();
        }

        // 스폰 간격: 스테이지가 올라갈수록 단축
        const minInterval = Math.max(35, 120 - stage);
        spawnCountdown = minInterval + Math.floor(Math.random() * 25);
      }
    }

    /* ==========================================================
       11. 물리 충돌 및 대미지 처리
       ========================================================== */
    Events.on(engine, 'collisionStart', (evt) => {
      evt.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        if (bodyA === defenseWall || bodyB === defenseWall) {
          const mob = (bodyA === defenseWall) ? bodyB : bodyA;
          if (mob.monsterData && !mob.monsterData.dead) {
            const dmg = mob.monsterData.isBoss ? 40 : 15;
            damageDefense(dmg);
            spawnBurstParticles(mob.position.x, mob.position.y, 20, '#ef476f');
            if (!mob.monsterData.isBoss) {
              killMonster(mob, false);
            } else {
              // 보스는 성벽에 부딪히면 넉백
              Body.setVelocity(mob, { x: 6, y: -3 });
            }
            return;
          }
        }

        const mobA = bodyA.monsterData ? bodyA : null;
        const mobB = bodyB.monsterData ? bodyB : null;

        if (mobA || mobB) {
          const relVx = bodyA.velocity.x - bodyB.velocity.x;
          const relVy = bodyA.velocity.y - bodyB.velocity.y;
          const impactSpeed = Math.hypot(relVx, relVy);

          if (impactSpeed >= 3.4) {
            let damageMult = (currentHero === 'regool') ? 1.5 : 1.0;
            if (currentHero === 'gomdum' && (Math.abs(bodyA.angularVelocity) > 0.15 || Math.abs(bodyB.angularVelocity) > 0.15)) {
              damageMult = 1.45;
            }

            const rawDamage = Math.round((impactSpeed - 2.5) * 9.5 * damageMult);
            const finalDamage = Math.max(10, rawDamage);

            if (mobA && !mobA.monsterData.dead) applyMonsterDamage(mobA, finalDamage);
            if (mobB && !mobB.monsterData.dead) applyMonsterDamage(mobB, finalDamage);

            const cx = (bodyA.position.x + bodyB.position.x) / 2;
            const cy = (bodyA.position.y + bodyB.position.y) / 2;
            sfx.playHit(Math.min(1.5, impactSpeed / 8), 1.0);
            spawnBurstParticles(cx, cy, Math.min(16, Math.floor(impactSpeed * 1.5)), '#ffd166');

            if (mobA && mobA.monsterData.type === 'bomb' && !mobA.monsterData.timerStarted) mobA.monsterData.timerStarted = true;
            if (mobB && mobB.monsterData.type === 'bomb' && !mobB.monsterData.timerStarted) mobB.monsterData.timerStarted = true;
          }
        }
      });
    });

    function applyMonsterDamage(mobBody, damage) {
      const data = mobBody.monsterData;
      if (data.dead) return;

      data.hp -= damage;
      data.flashTimer = 8;
      spawnFloatingText(mobBody.position.x, mobBody.position.y - data.radius - 8, `-${damage}`, '#ff4d4d', data.isBoss ? 24 : 18);

      // 보스 HP 바 갱신
      if (data.isBoss) {
        updateBossBar(data.hp, data.maxHp);
      }

      if (data.hp <= 0) {
        killMonster(mobBody, true);
      }
    }

    function killMonster(mobBody, grantScore = true) {
      const data = mobBody.monsterData;
      if (data.dead) return;
      data.dead = true;

      if (data.type === 'bomb') {
        triggerBombExplosion(mobBody.position.x, mobBody.position.y);
      }

      if (grantScore) {
        kills++;
        const earnedScore = data.isBoss ? (data.maxHp * 20) : (data.maxHp * 10);
        score += earnedScore;

        // 필살기 게이지 충전 (일반몹 12%, 보스 50%)
        addUltGauge(data.isBoss ? 50 : 12);

        document.getElementById('val-kills').innerText = kills;
        document.getElementById('val-score').innerText = score;
        spawnFloatingText(mobBody.position.x, mobBody.position.y - 20, `+${earnedScore}`, '#ffd166', data.isBoss ? 28 : 16);

        // 보스 처치 처리
        if (data.isBoss) {
          document.getElementById('boss-bar-container').classList.remove('active');
          currentBoss = null;

          if (data.bossStage === 100) {
            // 100스테이지 최종보스 격파: 승리 엔딩!
            victoryGame();
            return;
          } else {
            // 50스테이지 중간보스 격파
            spawnFloatingText(WIDTH / 2, 220, '🎉 50F 중간보스 토벌 성공! 🎉', '#ffd166', 36);
            advanceStage();
          }
        } else if (!currentBoss) {
          // 일반 몬스터 처치 시 스테이지 진행도 누적
          stageKills++;
          document.getElementById('val-stage-progress').innerText = `${stageKills} / ${killsPerStage}`;

          if (stageKills >= killsPerStage) {
            advanceStage();
          }
        }
      }

      spawnBurstParticles(mobBody.position.x, mobBody.position.y, data.isBoss ? 60 : 22, data.isBoss ? '#ffd166' : '#ffffff');
      Composite.remove(world, mobBody);

      const idx = monsters.indexOf(mobBody);
      if (idx !== -1) monsters.splice(idx, 1);
    }

    // 다음 스테이지 진입
    function advanceStage() {
      stageKills = 0;
      stage++;
      if (stage > 100) stage = 100;

      document.getElementById('val-stage').innerText = `${stage} / 100`;
      document.getElementById('val-stage-progress').innerText = `0 / ${killsPerStage}`;

      // 50스테이지 중간보스 또는 100스테이지 최종보스 체크
      if (stage === 50) {
        spawnBoss(50);
      } else if (stage === 100) {
        spawnBoss(100);
      } else {
        spawnFloatingText(WIDTH / 2, 200, `⚔️ STAGE ${stage} START! ⚔️`, '#06d6a0', 32);
      }
    }

    // 폭탄 폭발
    function triggerBombExplosion(ex, ey) {
      sfx.playExplosion();
      spawnBurstParticles(ex, ey, 40, '#ff7700');
      spawnBurstParticles(ex, ey, 25, '#ffdd00');
      spawnFloatingText(ex, ey - 45, 'BOOM!!', '#ff3333', 32);

      const radius = 230;
      monsters.forEach(m => {
        if (m.monsterData && !m.monsterData.dead) {
          const dist = Math.hypot(m.position.x - ex, m.position.y - ey);
          if (dist < radius && dist > 1) {
            const forceMag = (1 - dist / radius) * 0.11;
            const dirX = (m.position.x - ex) / dist;
            const dirY = (m.position.y - ey) / dist;
            Body.applyForce(m, m.position, { x: dirX * forceMag, y: dirY * forceMag - 0.04 });
            applyMonsterDamage(m, 50);
          }
        }
      });
    }

    function damageDefense(amount) {
      if (isGameOver || isGameWon) return;
      defenseHp = Math.max(0, defenseHp - amount);
      defenseHitFlash = 15;
      sfx.playDamageCastle();

      document.getElementById('defense-hp-text').innerText = `${defenseHp} / 100`;
      document.getElementById('defense-hp-fill').style.width = `${defenseHp}%`;

      if (defenseHp <= 0) {
        gameOver();
      }
    }

    function gameOver() {
      isGameOver = true;
      document.getElementById('overlay-title').innerText = '왕국 함락!';
      document.getElementById('overlay-title').style.color = '#ef476f';
      document.getElementById('overlay-sub').innerText = `Stage ${stage}에서 방어선이 무너졌습니다. 다시 도전해주세요!`;
      document.getElementById('final-score').innerText = score;
      document.getElementById('final-kills').innerText = kills;
      document.getElementById('game-overlay').classList.add('active');
    }

    function victoryGame() {
      isGameWon = true;
      sfx.playBossRoar();
      document.getElementById('overlay-title').innerText = '🏆 ALL CLEAR! 왕국 수호 완수! 🏆';
      document.getElementById('overlay-title').style.color = '#ffd166';
      document.getElementById('overlay-sub').innerText = '100스테이지 심연의 마왕을 물리치고 기도동물 왕국의 평화를 되찾았습니다!';
      document.getElementById('final-score').innerText = score;
      document.getElementById('final-kills').innerText = kills;
      document.getElementById('game-overlay').classList.add('active');
    }

    window.restartGame = function() {
      isGameOver = false;
      isGameWon = false;
      defenseHp = 100;
      score = 0;
      kills = 0;
      stage = 1;
      stageKills = 0;
      ultGauge = 0;
      currentBoss = null;
      activeUltAnimation = null;

      document.getElementById('boss-bar-container').classList.remove('active');
      document.getElementById('defense-hp-text').innerText = '100 / 100';
      document.getElementById('defense-hp-fill').style.width = '100%';
      document.getElementById('val-score').innerText = '0';
      document.getElementById('val-kills').innerText = '0';
      document.getElementById('val-stage').innerText = '1 / 100';
      document.getElementById('val-stage-progress').innerText = `0 / ${killsPerStage}`;
      document.getElementById('game-overlay').classList.remove('active');
      updateUltUI();

      [...monsters].forEach(m => Composite.remove(world, m));
      monsters.length = 0;
      spawnCountdown = 60;
    };

    /* 테스트용 치트 함수 */
    window.cheatStage = function(targetStage) {
      stage = targetStage - 1;
      [...monsters].forEach(m => Composite.remove(world, m));
      monsters.length = 0;
      if (currentBoss) {
        document.getElementById('boss-bar-container').classList.remove('active');
        currentBoss = null;
      }
      advanceStage();
    };

    window.cheatUlt = function() {
      ultGauge = maxUltGauge;
      updateUltUI();
    };

    /* ==========================================================
       12. 파티클 및 텍스트 이펙트
       ========================================================== */
    function spawnBurstParticles(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * 8 + 2;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: Math.random() * 4 + 2.5,
          color: color,
          alpha: 1.0,
          life: Math.floor(Math.random() * 20 + 20)
        });
      }
    }

    function spawnFloatingText(x, y, text, color = '#fff', size = 16) {
      floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        size: size,
        alpha: 1.0,
        life: 50
      });
    }

    /* ==========================================================
       13. 매 프레임 업데이트 로직 (beforeUpdate)
       ========================================================== */
    Events.on(engine, 'beforeUpdate', () => {
      if (isGameOver || isGameWon) return;

      updateSpawner();

      // 히모 특수능력: 염동 자력장 (마우스 주변 흡인)
      if (currentHero === 'himo' && isMouseDown) {
        const pullRadius = 210;
        monsters.forEach(m => {
          if (m !== grabbedBody && m.monsterData && !m.monsterData.dead) {
            const dx = mousePos.x - m.position.x;
            const dy = mousePos.y - m.position.y;
            const dist = Math.hypot(dx, dy);
            if (dist < pullRadius && dist > 15) {
              const pullForce = m.monsterData.isBoss ? 0.001 : 0.0025;
              Body.applyForce(m, m.position, {
                x: (dx / dist) * pullForce,
                y: (dy / dist) * pullForce - 0.0012
              });
            }
          }
        });
      }

      // 몬스터 및 보스 AI/스킬
      monsters.forEach(m => {
        const data = m.monsterData;
        if (!data || data.dead) return;

        if (data.flashTimer > 0) data.flashTimer--;

        // 보스 특수 기믹
        if (data.isBoss) {
          data.skillTimer--;
          if (data.bossStage === 50 && data.skillTimer <= 0) {
            // 50F 중간보스: 벌레 쫄 2마리 소환
            data.skillTimer = 160;
            spawnMonster('bug', { x: m.position.x - 40, y: m.position.y - 60 });
            spawnMonster('bug', { x: m.position.x + 40, y: m.position.y - 60 });
            spawnFloatingText(m.position.x, m.position.y - 95, '미니 쫄 소환!', '#06d6a0', 20);
          } else if (data.bossStage === 100 && data.skillTimer <= 0) {
            // 100F 최종보스: 암흑 충격파 발동 (주변 모든 몬스터 가속 & 폭발 파티클)
            data.skillTimer = 130;
            spawnBurstParticles(m.position.x, m.position.y, 45, '#9d4edd');
            spawnFloatingText(m.position.x, m.position.y - 125, '심연의 충격파!!', '#c77dff', 24);
            sfx.playExplosion();
            monsters.forEach(other => {
              if (other !== m && other.monsterData && !other.monsterData.dead) {
                Body.applyForce(other, other.position, { x: -0.006, y: -0.003 });
              }
            });
          }
        }

        // 일반 몬스터 이동
        if (data.type === 'eye' && !data.isGrabbed) {
          const upward = data.isBoss ? -0.008 : -0.0021;
          Body.applyForce(m, m.position, { x: -0.0008, y: upward });
          if (m.velocity.y > 1.5) Body.setVelocity(m, { x: m.velocity.x, y: 1.5 });
        }

        if (data.type === 'chicken' && !data.isGrabbed) {
          if (m.position.y > HEIGHT - (data.isBoss ? 130 : 95) && m.velocity.x > -4.0) {
            Body.applyForce(m, m.position, { x: data.isBoss ? -0.004 : -0.0014, y: 0 });
          }
        }

        if (data.type === 'bomb' && data.timerStarted) {
          data.timer -= (1 / 60);
          if (data.timer <= 0) killMonster(m, true);
        }

        // 성벽 침범 시
        if (m.position.x < DEFENSE_LINE_X - (data.radius / 2)) {
          damageDefense(data.isBoss ? 35 : 15);
          if (!data.isBoss) killMonster(m, false);
          else Body.setVelocity(m, { x: 7, y: -3 });
        }
      });

      // 필살기 연출 프레임 진행 및 타격 로직
      if (activeUltAnimation) {
        activeUltAnimation.frame++;

        if (activeUltAnimation.type === 'meteor') {
          // 레굴 메테오
          activeUltAnimation.meteors.forEach(met => {
            if (activeUltAnimation.frame === met.delay + 18) {
              sfx.playExplosion();
              spawnBurstParticles(met.targetX, met.targetY, 35, '#ef476f');
              spawnBurstParticles(met.targetX, met.targetY, 25, '#ffd166');
              // 반경 대미지
              monsters.forEach(m => {
                if (m.monsterData && !m.monsterData.dead) {
                  const d = Math.hypot(m.position.x - met.targetX, m.position.y - met.targetY);
                  if (d < 160) {
                    Body.applyForce(m, m.position, { x: (m.position.x - met.targetX) * 0.0005, y: -0.04 });
                    applyMonsterDamage(m, 80);
                  }
                }
              });
            }
          });
        } else if (activeUltAnimation.type === 'blackhole') {
          // 히모 블랙홀
          const cx = activeUltAnimation.centerX;
          const cy = activeUltAnimation.centerY;
          monsters.forEach(m => {
            if (m.monsterData && !m.monsterData.dead) {
              const dx = cx - m.position.x;
              const dy = cy - m.position.y;
              const d = Math.hypot(dx, dy);
              if (d > 10) {
                Body.applyForce(m, m.position, { x: (dx / d) * 0.005, y: (dy / d) * 0.005 });
              }
              if (activeUltAnimation.frame % 15 === 0) applyMonsterDamage(m, 20);
            }
          });
          if (activeUltAnimation.frame === activeUltAnimation.maxFrames - 1) {
            sfx.playExplosion();
            spawnBurstParticles(cx, cy, 60, '#06d6a0');
            monsters.forEach(m => { if (m.monsterData) applyMonsterDamage(m, 100); });
          }
        } else if (activeUltAnimation.type === 'tornado') {
          // 곰둠님 토네이도
          activeUltAnimation.x += activeUltAnimation.speed;
          const tx = activeUltAnimation.x;
          monsters.forEach(m => {
            if (m.monsterData && !m.monsterData.dead) {
              if (Math.abs(m.position.x - tx) < 90) {
                Body.applyForce(m, m.position, { x: 0.004, y: -0.025 });
                Body.setAngularVelocity(m, 0.6);
                if (activeUltAnimation.frame % 8 === 0) applyMonsterDamage(m, 25);
              }
            }
          });
        }

        if (activeUltAnimation.frame >= activeUltAnimation.maxFrames) {
          activeUltAnimation = null;
        }
      }
    });

    /* ==========================================================
       14. 캔버스 커스텀 렌더링 (afterRender)
       ========================================================== */
    Events.on(render, 'afterRender', () => {
      const ctx = render.context;

      // 1) 왕국 방어선 장벽
      ctx.save();
      const kingdomGrad = ctx.createLinearGradient(0, 0, DEFENSE_LINE_X, 0);
      kingdomGrad.addColorStop(0, 'rgba(15, 25, 45, 0.7)');
      kingdomGrad.addColorStop(1, 'rgba(239, 71, 111, 0.08)');
      ctx.fillStyle = kingdomGrad;
      ctx.fillRect(0, 0, DEFENSE_LINE_X, HEIGHT);

      ctx.strokeStyle = defenseHitFlash > 0 ? '#ffffff' : 'rgba(239, 71, 111, 0.85)';
      ctx.lineWidth = defenseHitFlash > 0 ? 6 : 3.5;
      ctx.shadowColor = '#ef476f';
      ctx.shadowBlur = defenseHitFlash > 0 ? 30 : 14;
      ctx.beginPath();
      ctx.moveTo(DEFENSE_LINE_X, 0);
      ctx.lineTo(DEFENSE_LINE_X, HEIGHT);
      ctx.stroke();

      if (defenseHitFlash > 0) defenseHitFlash--;
      ctx.restore();

      // 2) 히모 염동 자력장 링
      if (currentHero === 'himo' && isMouseDown) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 210, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 214, 160, 0.6)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.fillStyle = 'rgba(6, 214, 160, 0.06)';
        ctx.fill();
        ctx.restore();
      }

      // 3) 필살기 비주얼 애니메이션 렌더링
      if (activeUltAnimation) {
        ctx.save();
        if (activeUltAnimation.type === 'meteor') {
          activeUltAnimation.meteors.forEach(met => {
            const f = activeUltAnimation.frame - met.delay;
            if (f > 0 && f < 18) {
              const progress = f / 18;
              const curX = met.x + (met.targetX - met.x) * progress;
              const curY = met.y + (met.targetY - met.y) * progress;
              ctx.beginPath();
              ctx.arc(curX, curY, 24, 0, Math.PI * 2);
              ctx.fillStyle = '#ff7700';
              ctx.shadowColor = '#ff3300';
              ctx.shadowBlur = 20;
              ctx.fill();
            }
          });
        } else if (activeUltAnimation.type === 'blackhole') {
          const cx = activeUltAnimation.centerX;
          const cy = activeUltAnimation.centerY;
          const r = 40 + Math.sin(activeUltAnimation.frame * 0.2) * 10;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = '#06d6a0';
          ctx.shadowColor = '#06d6a0';
          ctx.shadowBlur = 30;
          ctx.fill();
        } else if (activeUltAnimation.type === 'tornado') {
          const tx = activeUltAnimation.x;
          ctx.beginPath();
          ctx.moveTo(tx - 30, HEIGHT - 20);
          ctx.lineTo(tx + 30, HEIGHT - 20);
          ctx.lineTo(tx + 80, 50);
          ctx.lineTo(tx - 80, 50);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
          ctx.shadowColor = '#ffd166';
          ctx.shadowBlur = 25;
          ctx.fill();
        }
        ctx.restore();
      }

      // 4) 몬스터 & 보스 대형 원형 크롭 렌더링
      monsters.forEach(m => {
        const data = m.monsterData;
        if (!data || data.dead) return;

        const img = imageCache[data.textureName];
        const r = data.radius;

        ctx.save();
        ctx.translate(m.position.x, m.position.y);
        ctx.rotate(m.angle);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = data.isBoss ? '#200818' : '#101420';
        ctx.fill();

        if (img && img.complete && img.naturalWidth > 0) {
          const sw = img.naturalWidth;
          const sh = img.naturalHeight * 0.65;
          ctx.drawImage(img, 0, 0, sw, sh, -r, -r, r * 2, r * 2);
        }

        if (data.flashTimer > 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fill();
        }

        ctx.restore();

        // 테두리 Glow
        ctx.save();
        ctx.translate(m.position.x, m.position.y);
        ctx.rotate(m.angle);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = data.borderColor;
        ctx.lineWidth = data.isBoss ? 5 : (data.isGrabbed ? 4 : 2.5);
        ctx.shadowColor = data.borderColor;
        ctx.shadowBlur = data.isBoss ? 24 : (data.isGrabbed ? 18 : 8);
        ctx.stroke();
        ctx.restore();

        // HP 바
        if (!data.isBoss) {
          const bx = m.position.x;
          const by = m.position.y - r - 14;
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(bx - 25, by, 50, 6);
          const hpRatio = Math.max(0, data.hp / data.maxHp);
          ctx.fillStyle = hpRatio > 0.5 ? '#06d6a0' : (hpRatio > 0.25 ? '#ffd166' : '#ef476f');
          ctx.fillRect(bx - 25, by, 50 * hpRatio, 6);

          if (data.type === 'bomb' && data.timerStarted) {
            ctx.font = '900 13px Pretendard, sans-serif';
            ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ff3333' : '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(`💣 ${data.timer.toFixed(1)}s`, bx, by - 6);
          }
          ctx.restore();
        }
      });

      // 파티클
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= 0.025;
        p.life--;
        if (p.alpha <= 0 || p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 플로팅 텍스트
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 1.2;
        ft.alpha -= 0.022;
        ft.life--;
        if (ft.alpha <= 0 || ft.life <= 0) {
          floatingTexts.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.size}px Pretendard, sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    });

    // 시작 스폰
    setTimeout(() => {
      spawnMonster('chicken');
      spawnMonster('bug');
      spawnMonster('eye');
    }, 400);

  }

  return {
    init: function() {
      if (isInitialized) {
        this.resume();
        this.adjustScale();
        return;
      }
      initGame();
      this.initControls();
      isInitialized = true;
      isRunning = true;
      this.adjustScale();
    },
    resume: function() {
      if (runner && engine && !isRunning && typeof Matter !== 'undefined') {
        Matter.Runner.run(runner, engine);
        isRunning = true;
      }
      this.adjustScale();
    },
    pause: function() {
      if (runner && isRunning && typeof Matter !== 'undefined') {
        Matter.Runner.stop(runner);
        isRunning = false;
      }
    },
    adjustScale: function() {
      const container = document.getElementById('game-viewport-container');
      const game = document.getElementById('game-container');
      if (!container || !game) return;
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || (window.innerHeight - 140);
      const scaleX = (cw - 16) / 1024;
      const scaleY = (ch - 16) / 600;
      const scale = Math.max(0.25, Math.min(scaleX, scaleY, 1.35));
      game.style.transform = 'scale(' + scale + ')';
      game.style.transformOrigin = 'center center';
    },
    initControls: function() {
      window.addEventListener('resize', () => this.adjustScale());

      const container = document.getElementById('game-viewport-container');
      if (container && window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => this.adjustScale());
        resizeObserver.observe(container);
      }

      // ?곷떒 ?대컮 踰꾪듉 ?곌껐
      const btnFullscreen = document.getElementById('btn-game-fullscreen');
      if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
          const wrapper = document.getElementById('monster-defense-wrapper');
          if (!document.fullscreenElement) {
            if (wrapper.requestFullscreen) wrapper.requestFullscreen();
            else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
          } else {
            if (document.exitFullscreen) document.exitFullscreen();
          }
        });
      }

      document.addEventListener('fullscreenchange', () => {
        setTimeout(() => this.adjustScale(), 100);
      });

      const btnReset = document.getElementById('btn-game-reset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (typeof window.restartGame === 'function') window.restartGame();
        });
      }

      const btnSound = document.getElementById('btn-game-sound');
      if (btnSound) {
        let soundMuted = false;
        btnSound.addEventListener('click', () => {
          soundMuted = !soundMuted;
          btnSound.textContent = soundMuted ? '🔇 음소거' : '🔊 사운드';
          btnSound.style.opacity = soundMuted ? '0.6' : '1';
          if (sfx && sfx.ctx) {
            if (soundMuted) sfx.ctx.suspend();
            else sfx.ctx.resume();
          }
        });
      }
    }
  };
})();