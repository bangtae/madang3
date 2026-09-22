// app/views/planetWorldView.js - Three.js 심시티 2000 스타일 아이소메트릭 평면 격자 도시 뷰

window.PlanetWorldView = {
  container: null,
  scene: null,
  camera: null,
  renderer: null,
  cityPivot: null,        // 🏙️ 전체 도시 맵 중심 피벗 (90도 스냅 회전 및 기준점)
  groundGroup: null,      // 대지 평면, 강, 해변 타일
  roadsGroup: null,       // 격자 아스팔트 도로, 횡단보도, 가로등
  buildingsGroup: null,   // 층별 적층 아콜로지 타워들
  charactersGroup: null,  // 인도/광장을 산책하는 아이 캐릭터 마스코트들
  landmarksGroup: null,   // 피라미드, 에펠탑, 우주 발사대
  natureGroup: null,      // 호수, 해변, 침엽수림
  vehiclesGroup: null,    // 도로 위를 달리는 미니 레트로 자동차들
  cloudsGroup: null,      // 도시 상공을 유유히 떠다니는 솜사탕 구름
  raycaster: null,
  mouse: null,

  buildingObjects: [],    // 3D 건물 메쉬 및 데이터
  characterObjects: [],   // 3D 캐릭터 스프라이트 및 데이터
  landmarkObjects: [],    // 3D 랜드마크 메쉬 및 데이터
  trafficVehicles: [],    // 도로 위 주행 자동차 메쉬 및 이동 데이터
  beaconCores: [],        // 3D 월드 내 통신탑/비콘 발광 코어 메쉬 (노트북 연결 상태 실시간 색상 반응)
  textureCache: {},       // 절차적 텍스처 캐시
  laptopStatus: { online: true, message: '' },
  laptopStatusTimer: null,
  currentSelectedItem: null,
  currentFloorIndex: 0,
  animatingCamera: false,
  isUserInteracting: false,

  isInitialized: false,
  isRunning: false,
  cityTargetRotation: 0,  // 0, PI/2, PI, 3PI/2 (90도 스냅 목표각)
  cameraTargetPos: new THREE.Vector3(32, 34, 32),
  cameraLookTarget: new THREE.Vector3(0, 0, 0),

  init() {
    this.container = document.getElementById('planet-canvas-container') || document.getElementById('planet-viewport');

    // 1. DOM 이벤트 바인딩
    this.bindDOMEvents();

    // 2. 월드 데이터 및 통계 HUD 로드
    this.refreshWorld();

    // 3. 💻 로컬 노트북 연결 상태 실시간 감지 (즉시 1회 + 30초 주기)
    this.checkLaptopStatus();
    if (this.laptopStatusTimer) clearInterval(this.laptopStatusTimer);
    this.laptopStatusTimer = setInterval(() => this.checkLaptopStatus(), 30000);

    if (!this.container) {
      console.warn('[PlanetWorldView] planet-canvas-container not found in DOM');
      return;
    }

    // 4. Three.js 확인
    if (typeof THREE === 'undefined') {
      setTimeout(() => this.init(), 100);
      return;
    }

    if (!this.isInitialized) {
      this.initThreeScene();
      this.isInitialized = true;
    }

    this.startLoop();
  },

  initThreeScene() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    // 1. Scene & 맑은 심시티 2000 하늘 배경
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc); // 청명하고 화사한 스카이블루
    this.scene.fog = new THREE.FogExp2(0x7dd3fc, 0.007);

    // 2. Camera (심시티 2000 클래식 45도 쿼터뷰 아이소메트릭 원근각)
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    this.camera.position.copy(this.cameraTargetPos);
    this.camera.lookAt(this.cameraLookTarget);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights (화사하고 온화한 심시티 햇살)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    sunLight.position.set(40, 65, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x15803d, 0.35);
    this.scene.add(hemiLight);

    // 5. 🏙️ [핵심] 전체 도시를 담아 90도 회전시키는 중앙 피벗 그룹
    this.cityPivot = new THREE.Group();
    this.scene.add(this.cityPivot);

    this.groundGroup = new THREE.Group();
    this.cityPivot.add(this.groundGroup);

    this.roadsGroup = new THREE.Group();
    this.cityPivot.add(this.roadsGroup);

    this.buildingsGroup = new THREE.Group();
    this.cityPivot.add(this.buildingsGroup);

    this.charactersGroup = new THREE.Group();
    this.cityPivot.add(this.charactersGroup);

    this.landmarksGroup = new THREE.Group();
    this.cityPivot.add(this.landmarksGroup);

    this.natureGroup = new THREE.Group();
    this.cityPivot.add(this.natureGroup);

    this.vehiclesGroup = new THREE.Group();
    this.cityPivot.add(this.vehiclesGroup);

    this.cloudsGroup = new THREE.Group();
    this.cityPivot.add(this.cloudsGroup);

    // 6. 평면 지형 및 심시티 격자 도로망 생성
    this.createCityGroundAndRoads();

    // 7. 도로 위를 달리는 미니 레트로 자동차들
    this.createTrafficVehicles();

    // 8. 상공 솜사탕 구름
    this.createFloatingClouds();

    // 9. Raycaster & Mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    window.addEventListener('resize', () => this.onWindowResize());
    this.setupCityControls();
  },

  /**
   * 🟩 [마인크래프트 16x16 픽셀 도트 텍스처 생성기]
   * THREE.NearestFilter를 사용하여 픽셀이 흐려지지 않고 자글자글 또렷하게 렌더링
   */
  createPixelTexture(width, height, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, width, height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  },

  // 1. 잔디 블록 상단 텍스처 (16x16 초록 픽셀 노이즈)
  getGrassTopTexture() {
    if (this.textureCache['grass_top']) return this.textureCache['grass_top'];
    const colors = ['#22c55e', '#16a34a', '#15803d', '#4ade80', '#14532d'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = colors[(x * 7 + y * 13) % colors.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['grass_top'] = tex;
    return tex;
  },

  // 2. 잔디 블록 측면 텍스처 (상단 잔디 + 하단 흙 흘러내림)
  getGrassSideTexture() {
    if (this.textureCache['grass_side']) return this.textureCache['grass_side'];
    const grassCols = ['#22c55e', '#16a34a', '#15803d', '#4ade80'];
    const dirtCols = ['#78350f', '#92400e', '#b45309', '#59320e'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = dirtCols[(x * 11 + y * 5) % dirtCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      for (let x = 0; x < 16; x++) {
        const grassH = 3 + (x % 3 === 0 ? 2 : (x % 2 === 0 ? 1 : 0));
        for (let y = 0; y < grassH; y++) {
          ctx.fillStyle = grassCols[(x * 3 + y * 7) % grassCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['grass_side'] = tex;
    return tex;
  },

  // 3. 흙 텍스처 (16x16 Dirt)
  getDirtTexture() {
    if (this.textureCache['dirt']) return this.textureCache['dirt'];
    const dirtCols = ['#78350f', '#92400e', '#b45309', '#59320e'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = dirtCols[(x * 5 + y * 9) % dirtCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['dirt'] = tex;
    return tex;
  },

  // 4. 마인크래프트 잔디 큐브 머티리얼 배열 (우, 좌, 상, 하, 전, 후)
  getGrassCubeMaterials() {
    const side = new THREE.MeshStandardMaterial({ map: this.getGrassSideTexture(), roughness: 0.9 });
    const top = new THREE.MeshStandardMaterial({ map: this.getGrassTopTexture(), roughness: 0.85 });
    const bottom = new THREE.MeshStandardMaterial({ map: this.getDirtTexture(), roughness: 0.95 });
    return [side, side, top, bottom, side, side];
  },

  // 5. 물 텍스처 (16x16 Water)
  getWaterTexture() {
    if (this.textureCache['water']) return this.textureCache['water'];
    const waterCols = ['#0284c7', '#0369a1', '#0ea5e9', '#38bdf8'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = waterCols[(x * 3 + y * 11) % waterCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['water'] = tex;
    return tex;
  },

  // 6. 모래 텍스처 (16x16 Sand)
  getSandTexture() {
    if (this.textureCache['sand']) return this.textureCache['sand'];
    const sandCols = ['#fde047', '#facc15', '#eab308', '#ca8a04'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = sandCols[(x * 7 + y * 5) % sandCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['sand'] = tex;
    return tex;
  },

  // 7. 코블스톤 도로 텍스처 (16x16 Cobblestone with optional Yellow Wool Centerline)
  getCobbleRoadTexture(hasLine = false) {
    const key = hasLine ? 'road_line' : 'cobble';
    if (this.textureCache[key]) return this.textureCache[key];
    const cobbleCols = ['#334155', '#475569', '#1e293b', '#64748b'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = cobbleCols[(x * 3 + y * 7) % cobbleCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      if (hasLine) {
        for (let y = 0; y < 16; y++) {
          if ((y % 4) < 2) {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(7, y, 2, 1);
          }
        }
      }
    });
    this.textureCache[key] = tex;
    return tex;
  },

  // 8. 오크 목재 플랭크 텍스처 (16x16 Oak Planks)
  getOakPlanksTexture() {
    if (this.textureCache['oak']) return this.textureCache['oak'];
    const woodCols = ['#d97706', '#b45309', '#92400e', '#78350f'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let y = 0; y < 16; y++) {
        const isPlankLine = (y % 4 === 0);
        for (let x = 0; x < 16; x++) {
          if (isPlankLine) {
            ctx.fillStyle = '#451a03';
          } else {
            ctx.fillStyle = woodCols[(x * 5 + y * 3) % woodCols.length];
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['oak'] = tex;
    return tex;
  },

  // 9. 석재 벽돌 텍스처 (16x16 Stone Bricks)
  getStoneBricksTexture() {
    if (this.textureCache['stone_bricks']) return this.textureCache['stone_bricks'];
    const brickCols = ['#64748b', '#475569', '#334155', '#94a3b8'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let y = 0; y < 16; y++) {
        const row = Math.floor(y / 4);
        const isHLine = (y % 4 === 0);
        for (let x = 0; x < 16; x++) {
          const shift = (row % 2 === 0) ? 0 : 4;
          const isVLine = ((x + shift) % 8 === 0);
          if (isHLine || isVLine) {
            ctx.fillStyle = '#0f172a';
          } else {
            ctx.fillStyle = brickCols[(x * 7 + y * 11) % brickCols.length];
          }
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['stone_bricks'] = tex;
    return tex;
  },

  // 10. 마인크래프트 격자 유리창 텍스처 (16x16 Glass Pane)
  getGlassTexture() {
    if (this.textureCache['glass']) return this.textureCache['glass'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.strokeRect(0.5, 0.5, 15, 15);
      ctx.fillRect(3, 4, 3, 1);
      ctx.fillRect(5, 5, 3, 1);
      ctx.fillRect(9, 10, 4, 1);
      ctx.fillRect(11, 11, 3, 1);
    });
    this.textureCache['glass'] = tex;
    return tex;
  },

  // 11. 참나무 잎 텍스처 (16x16 Leaves)
  getLeavesTexture() {
    if (this.textureCache['leaves']) return this.textureCache['leaves'];
    const leafCols = ['#15803d', '#16a34a', '#14532d', '#22c55e', '#166534'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = leafCols[(x * 9 + y * 7) % leafCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['leaves'] = tex;
    return tex;
  },

  // 12. 발광석 텍스처 (16x16 Glowstone)
  getGlowstoneTexture() {
    if (this.textureCache['glowstone']) return this.textureCache['glowstone'];
    const glowCols = ['#fef08a', '#fde047', '#facc15', '#ca8a04', '#ea580c'];
    const tex = this.createPixelTexture(16, 16, (ctx) => {
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          ctx.fillStyle = glowCols[(x * 13 + y * 3) % glowCols.length];
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    this.textureCache['glowstone'] = tex;
    return tex;
  },

  /**
   * 🌟 [마인크래프트 복셀 평면 지형 & 도로망 & 수변 공간]
   * 단면 흙이 보이는 잔디 큐브 블록 대지, 워터 큐브 수로, 샌드 큐브 해변, 코블스톤 도로, 발광석 가로등
   */
  createCityGroundAndRoads() {
    this.groundGroup.clear();
    this.roadsGroup.clear();

    const citySize = 44; // 44x44 복셀 블록 도시

    // 1. 🟩 대지 메인 잔디 블록 (Grass Cube: 윗면 잔디, 측면 흙+흘러내림)
    const groundGeo = new THREE.BoxGeometry(citySize, 1.2, citySize);
    const groundMaterials = this.getGrassCubeMaterials();
    const groundMesh = new THREE.Mesh(groundGeo, groundMaterials);
    groundMesh.position.y = -0.6;
    groundMesh.receiveShadow = true;
    this.groundGroup.add(groundMesh);

    // 2. 🌊 서북쪽 마인크래프트 수로 (반투명 워터 큐브 블록)
    const riverW = 7.5;
    const riverGeo = new THREE.BoxGeometry(riverW, 1.05, citySize);
    const riverMat = new THREE.MeshStandardMaterial({
      map: this.getWaterTexture(),
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.82
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.position.set(-citySize / 2 + riverW / 2 + 1, -0.55, 0);
    riverMesh.receiveShadow = true;
    this.groundGroup.add(riverMesh);

    // 강변 백사장 모래 큐브 블록
    const beachGeo = new THREE.BoxGeometry(2.4, 1.15, citySize);
    const beachMat = new THREE.MeshStandardMaterial({
      map: this.getSandTexture(),
      roughness: 0.95
    });
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.position.set(-citySize / 2 + riverW + 2.2, -0.52, 0);
    beachMesh.receiveShadow = true;
    this.groundGroup.add(beachMesh);

    // 3. 🛣️ 마인크래프트 코블스톤 격자 도로망
    const roadLines = [
      { axis: 'z', pos: 0, length: 32, w: 2.8, isMain: true },   // 중앙 가로 대로
      { axis: 'x', pos: 0, length: 32, w: 2.8, isMain: true },   // 중앙 세로 대로
      { axis: 'z', pos: 10, length: 30, w: 2.2, isMain: false }, // 남측 보조 도로
      { axis: 'z', pos: -10, length: 30, w: 2.2, isMain: false },// 북측 보조 도로
      { axis: 'x', pos: 10, length: 30, w: 2.2, isMain: false }, // 동측 보조 도로
      { axis: 'x', pos: -10, length: 30, w: 2.2, isMain: false } // 서측 보조 도로
    ];

    roadLines.forEach(rl => {
      const roadMat = new THREE.MeshStandardMaterial({
        map: this.getCobbleRoadTexture(rl.isMain),
        roughness: 0.85
      });

      let rGeo;
      if (rl.axis === 'z') {
        rGeo = new THREE.BoxGeometry(rl.length, 0.08, rl.w);
      } else {
        rGeo = new THREE.BoxGeometry(rl.w, 0.08, rl.length);
      }

      const rMesh = new THREE.Mesh(rGeo, roadMat);
      rMesh.position.set(rl.axis === 'x' ? rl.pos : 2, 0.04, rl.axis === 'z' ? rl.pos : 0);
      rMesh.receiveShadow = true;
      this.roadsGroup.add(rMesh);
    });

    // 4. 🟨 교차로 횡단보도 & 💡 발광석(Glowstone) 복셀 가로등
    const intersections = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: -10, z: 0 },
      { x: 0, z: 10 },
      { x: 0, z: -10 },
      { x: 10, z: 10 },
      { x: 10, z: -10 },
      { x: -10, z: 10 },
      { x: -10, z: -10 }
    ];

    const zebraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const fenceMat = new THREE.MeshStandardMaterial({ map: this.getOakPlanksTexture(), roughness: 0.8 });
    const glowMat = new THREE.MeshStandardMaterial({
      map: this.getGlowstoneTexture(),
      emissive: 0xfef08a,
      emissiveIntensity: 1.4,
      roughness: 0.3
    });

    intersections.forEach(pt => {
      // 횡단보도 픽셀 블록
      [-1.2, 1.2].forEach(offset => {
        const z1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.32), zebraMat);
        z1.position.set(pt.x, 0.05, pt.z + offset);
        this.roadsGroup.add(z1);

        const z2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 1.8), zebraMat);
        z2.position.set(pt.x + offset, 0.05, pt.z);
        this.roadsGroup.add(z2);
      });

      // 마인크래프트 오크 울타리(Fence) 기둥 큐브
      const lampPost = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 0.18), fenceMat);
      lampPost.position.set(pt.x + 1.6, 0.7, pt.z + 1.6);
      lampPost.castShadow = true;
      this.roadsGroup.add(lampPost);

      // 상단 발광석(Glowstone) 큐브 블록
      const glowBlock = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), glowMat);
      glowBlock.position.set(pt.x + 1.6, 1.5, pt.z + 1.6);
      this.roadsGroup.add(glowBlock);
    });
  },

  /**
   * 🌟 [마인크래프트 복셀 미니카] 큐브 바디 & 픽셀 바퀴
   */
  createTrafficVehicles() {
    if (!this.vehiclesGroup) return;
    this.vehiclesGroup.clear();
    this.trafficVehicles = [];

    const carConfigs = [
      { color: 0xfacc15, road: 'z', trackPos: 0, offset: 0.75, dir: 1, min: -14, max: 14, speed: 0.07 }, // 노랑 택시
      { color: 0xef4444, road: 'z', trackPos: 0, offset: -0.75, dir: -1, min: -14, max: 14, speed: 0.09 },// 빨강 승용차
      { color: 0x3b82f6, road: 'x', trackPos: 0, offset: 0.75, dir: 1, min: -14, max: 14, speed: 0.06 },  // 파랑 버스
      { color: 0xf8fafc, road: 'x', trackPos: 0, offset: -0.75, dir: -1, min: -14, max: 14, speed: 0.08 },// 흰색 밴
      { color: 0x10b981, road: 'z', trackPos: 10, offset: 0.65, dir: 1, min: -12, max: 12, speed: 0.065 },// 초록 쿠페
      { color: 0xa855f7, road: 'x', trackPos: 10, offset: -0.65, dir: -1, min: -12, max: 12, speed: 0.075 }// 보라 세단
    ];

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 1.2 });

    carConfigs.forEach(cfg => {
      const carGroup = new THREE.Group();

      // 복셀 바디 (하부 섀시 큐브)
      const bodyGeo = new THREE.BoxGeometry(1.1, 0.38, 0.65);
      const bodyMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.28;
      body.castShadow = true;
      carGroup.add(body);

      // 복셀 캐빈 (유리창 큐브)
      const cabinGeo = new THREE.BoxGeometry(0.6, 0.34, 0.55);
      const cabinMat = new THREE.MeshStandardMaterial({ map: this.getGlassTexture(), roughness: 0.2 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(-0.06, 0.58, 0);
      carGroup.add(cabin);

      // 헤드라이트 큐브 2개
      [-0.2, 0.2].forEach(pz => {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), headlightMat);
        light.position.set(0.56, 0.28, pz);
        carGroup.add(light);
      });

      // 복셀 큐브 바퀴 4개
      [[-0.32, -0.32], [-0.32, 0.32], [0.32, -0.32], [0.32, 0.32]].forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.12), wheelMat);
        wheel.position.set(wx, 0.14, wz);
        carGroup.add(wheel);
      });

      let currentCoord = (cfg.min + cfg.max) / 2 + (Math.random() * 8 - 4);
      if (cfg.road === 'z') {
        carGroup.position.set(currentCoord, 0, cfg.trackPos + cfg.offset);
        if (cfg.dir === -1) carGroup.rotation.y = Math.PI;
      } else {
        carGroup.position.set(cfg.trackPos + cfg.offset, 0, currentCoord);
        carGroup.rotation.y = cfg.dir === 1 ? -Math.PI / 2 : Math.PI / 2;
      }

      this.vehiclesGroup.add(carGroup);
      this.trafficVehicles.push({
        group: carGroup,
        config: cfg,
        coord: currentCoord
      });
    });
  },

  /**
   * 🌟 [마인크래프트 시그니처 사각 플랫 복셀 구름]
   */
  createFloatingClouds() {
    if (!this.cloudsGroup) return;
    this.cloudsGroup.clear();

    const cloudData = [
      { x: -12, z: -14, y: 16, w: 9, d: 6, h: 0.8 },
      { x: 14, z: 8, y: 17, w: 11, d: 7, h: 0.8 },
      { x: -8, z: 16, y: 15, w: 10, d: 5, h: 0.8 },
      { x: 16, z: -16, y: 18, w: 8, d: 6, h: 0.8 },
      { x: 0, z: -4, y: 16.5, w: 12, d: 8, h: 0.8 }
    ];

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      transparent: true,
      opacity: 0.88
    });

    cloudData.forEach(cd => {
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(cd.w, cd.h, cd.d), cloudMat);
      cMesh.position.set(cd.x, cd.y, cd.z);
      this.cloudsGroup.add(cMesh);
    });
  },

  /**
   * 🌟 [스마트 도시 격자 슬롯 매핑] 기존 건물 카테고리별/순서별 도시 블록 배치
   */
  getCityBuildingSlot(data, index) {
    const cat = data.category || 'family';
    // 4대 핵심 블록
    if (cat === 'family') return { x: 5.2, z: 5.2, rot: 0 };
    if (cat === 'travel') return { x: -5.2, z: 5.2, rot: 0 };
    if (cat === 'study') return { x: 5.2, z: -5.2, rot: 0 };
    if (cat === 'finance') return { x: -5.2, z: -5.2, rot: 0 };

    // 추가 타워 확장 슬롯
    const extraSlots = [
      { x: 5.2, z: 14.5, rot: 0 },
      { x: 14.5, z: 5.2, rot: 0 },
      { x: -5.2, z: 14.5, rot: 0 },
      { x: 14.5, z: -5.2, rot: 0 },
      { x: 5.2, z: -14.5, rot: 0 },
      { x: -5.2, z: -14.5, rot: 0 }
    ];
    return extraSlots[index % extraSlots.length];
  },

  /**
   * 🌟 3D 심시티 2000 아콜로지 타워, 세계 랜드마크, 자연 요소, 아이 캐릭터 평면 렌더링 갱신
   */
  async refreshWorld() {
    if (!window.PlanetWorldModel) return;
    const model = window.PlanetWorldModel;
    await model.loadWorld(true);

    const buildings = model.getBuildings();
    const characters = model.getCharacters();
    const landmarks = model.getLandmarks();
    const nature = model.getNature();
    const cityStats = model.getCityStats();

    // 1. 기존 건물 메쉬 제거
    if (this.buildingsGroup) {
      while (this.buildingsGroup.children.length > 0) {
        this.buildingsGroup.remove(this.buildingsGroup.children[0]);
      }
    }
    this.buildingObjects = [];
    this.beaconCores = [];

    // 2. 기존 캐릭터 스프라이트 제거
    if (this.charactersGroup) {
      while (this.charactersGroup.children.length > 0) {
        this.charactersGroup.remove(this.charactersGroup.children[0]);
      }
    }
    this.characterObjects = [];

    // 3. 🏢 층별 적층 심시티 타워 생성 & 도시 격자 블록 배치
    buildings.forEach((bData, idx) => {
      const buildingMesh = this.createStackedBuildingMesh(bData);
      const slot = this.getCityBuildingSlot(bData, idx);
      buildingMesh.position.set(slot.x, 0, slot.z);
      buildingMesh.rotation.y = slot.rot;

      this.buildingsGroup.add(buildingMesh);
      this.buildingObjects.push({ data: bData, mesh: buildingMesh, slot: slot });
    });

    // 4. 🗿 세계 랜드마크 생성 (피라미드, 에펠탑, 우주 발사대)
    this.createWorldLandmarks(landmarks);

    // 5. 🌲 자연 요소 생성 (호수, 야자수 해변, 숲)
    this.createNatureElements(nature);

    // 6. 🐰 아이 캐릭터 원형 뱃지/핀 생성 & 평면 보도/광장 배치
    characters.forEach((cData, idx) => {
      this.createCharacterSprite(cData, idx);
    });

    // 7. 📊 도시 통계 및 HUD 업데이트
    this.updateHUDCounts(buildings.length, characters.length, cityStats);

    // 8. 💻 로컬 노트북 상태에 따른 비콘 코어 색상 즉시 적용
    if (this.laptopStatus && Array.isArray(this.beaconCores)) {
      const beaconColor = this.laptopStatus.online ? 0x22c55e : 0xef4444;
      this.beaconCores.forEach(core => {
        if (core && core.material) {
          if (core.material.color) core.material.color.setHex(beaconColor);
          if (core.material.emissive) core.material.emissive.setHex(beaconColor);
        }
      });
    }
  },

  /**
   * 🌟 [심시티 2000 탑쌓기 렌더러] 동일 분야 자료 누적 시 층(Floor)이 위로 적층되는 타워 시스템
   * 5층 이상: 거대 아콜로지 돔 + 송신 안테나 + 점멸 경고등
   * 3~4층: 옥상 헬리패드 + 물탱크/실외기
   * 1~2층: 클래식 기와 지붕 + 테라스
   */
  /**
   * 🌟 [마인크래프트 복셀 타워 렌더러]
   * 오크 목재, 석재 벽돌, 픽셀 유리창 큐브로 적층되는 복셀 아콜로지 마천루
   */
  createStackedBuildingMesh(data) {
    const group = new THREE.Group();
    const colHex = data.color || '#f97316';
    const floors = (Array.isArray(data.floors) && data.floors.length > 0) ? data.floors : [data];
    const floorCount = floors.length;

    // 1. 디오라마 베이스 타일 (코블스톤 큐브 베이스)
    const baseW = 2.4;
    const baseGeo = new THREE.BoxGeometry(baseW, 0.2, baseW);
    const baseMat = new THREE.MeshStandardMaterial({
      map: this.getCobbleRoadTexture(false),
      roughness: 0.9
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.1;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // 2. 층별 복셀 블록 스택 (Floor Stacking)
    const floorH = 0.7;
    const blockW = 1.45;
    const blockD = 1.45;

    // 층별 벽면 텍스처 (카테고리별 목재/벽돌 분기)
    const wallTex = (data.category === 'family' || data.category === 'travel')
      ? this.getOakPlanksTexture()
      : this.getStoneBricksTexture();

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.8
    });

    const slabMat = new THREE.MeshStandardMaterial({
      map: this.getOakPlanksTexture(),
      roughness: 0.75
    });

    const glassMat = new THREE.MeshStandardMaterial({
      map: this.getGlassTexture(),
      transparent: true,
      opacity: 0.85
    });

    for (let f = 0; f < floorCount; f++) {
      const fCenterY = 0.2 + (f + 0.5) * floorH;

      // 외벽 복셀 큐브
      const fMesh = new THREE.Mesh(new THREE.BoxGeometry(blockW, floorH, blockD), wallMat);
      fMesh.position.set(0, fCenterY, 0);
      fMesh.castShadow = true;
      fMesh.receiveShadow = true;
      group.add(fMesh);

      // 전면 픽셀 유리창 큐브 (Glass Window)
      const winFront = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.08), glassMat);
      winFront.position.set(0, fCenterY, blockD / 2 + 0.03);
      group.add(winFront);

      // 측면 픽셀 유리창 큐브
      const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.75), glassMat);
      winSide.position.set(blockW / 2 + 0.03, fCenterY, 0);
      group.add(winSide);

      // 층간 목재 슬래브 (Ledge 분할 반블록)
      const slabMesh = new THREE.Mesh(new THREE.BoxGeometry(blockW * 1.08, 0.08, blockD * 1.08), slabMat);
      slabMesh.position.set(0, 0.2 + (f + 1) * floorH, 0);
      slabMesh.castShadow = true;
      group.add(slabMesh);
    }

    const totalHeight = 0.2 + floorCount * floorH;

    // 3. 1층 출입문 큐브
    const doorMat = new THREE.MeshStandardMaterial({ map: this.getOakPlanksTexture(), color: 0x59320e });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.06), doorMat);
    door.position.set(0, 0.2 + 0.24, blockD / 2 + 0.04);
    group.add(door);

    // 4. 옥상 마인크래프트 장식 (Tier별 외형)
    if (floorCount >= 5) {
      // 🌟 [Tier 3: 다이아몬드 비콘 & 네더라이트 옵시디언 큐브]
      const beaconBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.4, 0.9),
        new THREE.MeshStandardMaterial({ map: this.getStoneBricksTexture(), color: 0x38bdf8 })
      );
      beaconBase.position.set(0, totalHeight + 0.2, 0);
      group.add(beaconBase);

      // 비콘 코어 발광 큐브
      const beaconCore = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.45, 0.45),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x38bdf8,
          emissiveIntensity: 1.5,
          map: this.getGlassTexture(),
          transparent: true,
          opacity: 0.9
        })
      );
      beaconCore.position.set(0, totalHeight + 0.6, 0);
      group.add(beaconCore);
      this.beaconCores.push(beaconCore);

      // 수직 광선 기둥 (Beacon Light Beam)
      const beamGeo = new THREE.BoxGeometry(0.18, 4.0, 0.18);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, totalHeight + 2.6, 0);
      group.add(beam);

    } else if (floorCount >= 3) {
      // 🌟 [Tier 2: 성벽 흉벽(Crenellations) & 픽셀 깃발]
      const parapetMat = new THREE.MeshStandardMaterial({ map: this.getStoneBricksTexture() });
      [[-0.6, -0.6], [-0.6, 0.6], [0.6, -0.6], [0.6, 0.6]].forEach(([px, pz]) => {
        const battlePost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), parapetMat);
        battlePost.position.set(px, totalHeight + 0.18, pz);
        group.add(battlePost);
      });

      // 깃대 & 울 배너(Wool Banner)
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), slabMat);
      pole.position.set(0, totalHeight + 0.6, 0);
      group.add(pole);

      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.38, 0.04),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(colHex), roughness: 0.6 })
      );
      banner.position.set(0.25, totalHeight + 0.95, 0);
      group.add(banner);

    } else {
      // 🌟 [Tier 1: 계단식 오크 목재 복셀 지붕 + 횃불(Torch)]
      const roofMat = new THREE.MeshStandardMaterial({ map: this.getOakPlanksTexture() });
      const roof1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 1.6), roofMat);
      roof1.position.set(0, totalHeight + 0.12, 0);
      group.add(roof1);

      const roof2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.1), roofMat);
      roof2.position.set(0, totalHeight + 0.37, 0);
      group.add(roof2);

      const roof3 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), roofMat);
      roof3.position.set(0, totalHeight + 0.62, 0);
      group.add(roof3);

      // 모서리 픽셀 횃불 (Torch)
      const torchStick = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.3, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x78350f })
      );
      torchStick.position.set(0.65, totalHeight + 0.3, 0.65);
      group.add(torchStick);

      const torchHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 1.8 })
      );
      torchHead.position.set(0.65, totalHeight + 0.48, 0.65);
      group.add(torchHead);
    }

    // 5. 🌟 마인크래프트 액자 (Item Frame) 스타일 썸네일 간판
    const signW = 1.35;
    const signH = 0.95;
    const frameGeo = new THREE.BoxGeometry(signW, signH, 0.1);
    const frameMat = new THREE.MeshStandardMaterial({ map: this.getOakPlanksTexture(), color: 0xb45309 });
    const signFrame = new THREE.Mesh(frameGeo, frameMat);
    const signPosY = totalHeight + (floorCount >= 5 ? 1.3 : (floorCount >= 3 ? 0.95 : 0.85));
    signFrame.position.set(0, signPosY, 0.2);
    signFrame.rotation.x = -0.15;
    group.add(signFrame);

    // 지지대 오크 펜스 봉 2개
    [-0.42, 0.42].forEach(posX => {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), slabMat);
      pole.position.set(posX, signPosY - 0.45, 0.12);
      group.add(pole);
    });

    // 썸네일 이미지 면
    const photoGeo = new THREE.PlaneGeometry(signW - 0.14, signH - 0.14);
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const photoMesh = new THREE.Mesh(photoGeo, photoMat);
    photoMesh.position.set(0, 0, 0.055);
    signFrame.add(photoMesh);

    const latestFloor = floors[0] || data;
    const displayImg = latestFloor.imageUrl || data.imageUrl;
    const displayTitle = latestFloor.title || data.name || data.title || '자료';

    if (displayImg && displayImg.length > 5) {
      new THREE.TextureLoader().load(
        displayImg,
        (tex) => {
          tex.magFilter = THREE.NearestFilter;
          photoMat.map = tex;
          photoMat.needsUpdate = true;
        },
        undefined,
        () => {
          photoMat.map = this.createTitleCanvasTexture(displayTitle, colHex, floorCount);
          photoMat.needsUpdate = true;
        }
      );
    } else {
      photoMat.map = this.createTitleCanvasTexture(displayTitle, colHex, floorCount);
    }

    group.userData = { type: 'building', data: data };
    group.traverse(c => { c.userData = group.userData; });

    return group;
  },

  createBuildingMesh(data) {
    return this.createStackedBuildingMesh(data);
  },

  /**
   * 🌟 [세계 랜드마크 3D 렌더러] 피라미드, 에펠탑, 우주 발사대를 도시 특화 지구에 평면 배치
   */
  createWorldLandmarks(landmarks = []) {
    if (!this.landmarksGroup) return;
    this.landmarksGroup.clear();
    this.landmarkObjects = [];

    const landmarkSlots = {
      pyramid: { x: -13.5, z: 11.5, rot: 0 },
      eiffel: { x: 13.5, z: -11.5, rot: 0 },
      space_launch: { x: -13.5, z: -12.5, rot: 0 },
      spaceport: { x: -13.5, z: -12.5, rot: 0 }
    };

    landmarks.forEach((lm, idx) => {
      const slot = landmarkSlots[lm.type] || { x: 12 + idx * 2, z: -12, rot: 0 };
      const group = new THREE.Group();
      group.position.set(slot.x, 0, slot.z);
      group.rotation.y = slot.rot;

      if (lm.type === 'pyramid') {
        // 복셀 사암 피라미드 (사암 3단 블록)
        const pMat = new THREE.MeshStandardMaterial({ map: this.getSandTexture(), roughness: 0.85 });
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 3.6), pMat);
        p1.position.y = 0.3;
        group.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), pMat);
        p2.position.y = 0.9;
        group.add(p2);

        const p3 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), pMat);
        p3.position.y = 1.5;
        group.add(p3);

      } else if (lm.type === 'eiffel') {
        // 복셀 철골 타워
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 });
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 2.4), towerMat);
        b1.position.y = 0.4;
        group.add(b1);

        const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), towerMat);
        b2.position.y = 1.5;
        group.add(b2);

        const b3 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.6), towerMat);
        b3.position.y = 3.4;
        group.add(b3);

        const beacon = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.35, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.8 })
        );
        beacon.position.y = 4.7;
        group.add(beacon);
        this.beaconCores.push(beacon);

      } else if (lm.type === 'space_launch' || lm.type === 'spaceport') {
        // 복셀 우주 발사대
        const padMat = new THREE.MeshStandardMaterial({ map: this.getStoneBricksTexture() });
        const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 2.4), padMat);
        pad.position.y = 0.17;
        group.add(pad);

        // 관제 타워 복셀
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), towerMat);
        tower.position.set(-0.7, 1.7, 0);
        group.add(tower);

        // 복셀 로켓
        const rMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
        const rocketBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.6), rMat);
        rocketBody.position.set(0.15, 1.5, 0);
        group.add(rocketBody);

        const rocketNose = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
        rocketNose.position.set(0.15, 3.1, 0);
        group.add(rocketNose);
      }

      group.userData = { type: 'landmark', data: lm };
      group.traverse(c => { c.userData = group.userData; });
      this.landmarksGroup.add(group);
      this.landmarkObjects.push({ data: lm, mesh: group, slot: slot });
    });
  },

  /**
   * 🌟 [자연 요소 3D 렌더러] 호수, 야자수/선인장 해변, 마인크래프트 참나무(Oak Tree) 숲
   */
  createNatureElements(natureList = []) {
    if (!this.natureGroup) return;
    this.natureGroup.clear();

    const natureSlots = {
      lake: { x: -11.5, z: 0.5 },
      beach: { x: -15.5, z: 6.5 },
      forest: { x: 13.5, z: 13.5 }
    };

    natureList.forEach((nat, idx) => {
      const slot = natureSlots[nat.type] || { x: 10 + idx * 2, z: 10 + idx * 2 };
      const group = new THREE.Group();
      group.position.set(slot.x, 0, slot.z);

      if (nat.type === 'lake') {
        // 복셀 워터 연못
        const lakeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 0.2, 4.5),
          new THREE.MeshStandardMaterial({
            map: this.getWaterTexture(),
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.85
          })
        );
        lakeMesh.position.y = 0.1;
        group.add(lakeMesh);

      } else if (nat.type === 'beach') {
        // 모래사장 + 마인크래프트 선인장(Cactus) 복셀
        const sand = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.2, 4.2),
          new THREE.MeshStandardMaterial({ map: this.getSandTexture(), roughness: 0.9 })
        );
        sand.position.y = 0.1;
        group.add(sand);

        // 선인장 2개 (초록 큐브 기둥)
        [-1.0, 1.0].forEach((px, i) => {
          const cactusMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });
          const cTrunk = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.3, 0.38), cactusMat);
          cTrunk.position.set(px, 0.75, (i % 2) * 0.4);
          group.add(cTrunk);

          // 가지
          const cArm = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.3), cactusMat);
          cArm.position.set(px + (i === 0 ? 0.2 : -0.2), 0.9, (i % 2) * 0.4);
          group.add(cArm);
        });

      } else if (nat.type === 'forest') {
        // 🌲 마인크래프트 참나무(Oak Tree) 군락
        const count = nat.count || 5;
        const woodMat = new THREE.MeshStandardMaterial({ map: this.getOakPlanksTexture(), color: 0x78350f });
        const leafMat = new THREE.MeshStandardMaterial({ map: this.getLeavesTexture(), roughness: 0.8 });

        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2;
          const dist = 0.9 + (i % 3) * 0.6;
          const tx = Math.cos(ang) * dist;
          const tz = Math.sin(ang) * dist;

          const treeGroup = new THREE.Group();
          treeGroup.position.set(tx, 0, tz);

          // 원목 기둥 (Oak Log 큐브)
          const log = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.35), woodMat);
          log.position.y = 0.7;
          log.castShadow = true;
          treeGroup.add(log);

          // 잎사귀 복셀 (3x3x2 Leaves Cube)
          const leaves1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.65, 1.25), leafMat);
          leaves1.position.y = 1.4;
          leaves1.castShadow = true;
          treeGroup.add(leaves1);

          const leaves2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.85), leafMat);
          leaves2.position.y = 1.85;
          leaves2.castShadow = true;
          treeGroup.add(leaves2);

          group.add(treeGroup);
        }
      }

      group.userData = { type: 'nature', data: nat };
      this.natureGroup.add(group);
    });
  },

  createTitleCanvasTexture(titleText, hexColor, floorCount = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 마인크래프트 석재 바탕
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 192);

    // 픽셀 테두리
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 182);

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 172);

    // 층수 뱃지
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`[${floorCount}F]`, 236, 40);

    // 아이콘 & 텍스트
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px monospace';
    const icon = floorCount >= 5 ? '💎' : (floorCount >= 3 ? '🏰' : '📦');
    ctx.fillText(icon, 128, 72);

    ctx.font = 'bold 22px monospace';
    ctx.fillText((titleText || '자료').substring(0, 8), 128, 120);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('CLICK TO VIEW', 128, 155);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  },

  /**
   * 🌟 [마인크래프트 픽셀 아트 마스코트 뱃지]
   * 픽셀 테두리와 도트 침이 적용된 마인크래프트 스타일 캐릭터 핀
   */
  createCharacterSprite(cData) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const renderBadge = (img) => {
      ctx.clearRect(0, 0, 256, 256);

      // 1. 마인크래프트 그림자 픽셀 박스
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(40, 26, 184, 184);

      // 2. 오크 목재 픽셀 테두리
      ctx.fillStyle = '#b45309';
      ctx.fillRect(32, 18, 192, 192);

      // 3. 내부 픽셀 림
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(40, 26, 176, 176);

      // 4. 화이트 픽셀 캔버스 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(46, 32, 164, 164);

      // 5. 하단 픽셀 핀 침 (Map Pin Voxel Point)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(116, 210, 24, 12);
      ctx.fillRect(122, 222, 12, 12);

      // 6. 캐릭터 이미지 클리핑 렌더링
      ctx.save();
      ctx.beginPath();
      ctx.rect(46, 32, 164, 164);
      ctx.clip();

      if (img && img.width > 0) {
        ctx.drawImage(img, 46, 32, 164, 164);
      } else {
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(46, 32, 164, 164);
        ctx.font = 'bold 72px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const emo = cData.name?.includes('토끼') ? '🐰' : cData.name?.includes('용') ? '🐉' : '🐥';
        ctx.fillText(emo, 128, 114);
      }
      ctx.restore();
    };

    renderBadge(null);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;

    if (cData.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        renderBadge(img);
        texture.needsUpdate = true;
      };
      img.src = cData.imageUrl;
    }

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    const scale = (cData.scale || 1.2) * 1.5;
    sprite.scale.set(scale, scale, 1);

    // 심시티 도시 중앙 사거리 광장 및 보도블록 주변 슬롯 배치
    const charSlots = [
      { x: 1.8, z: 1.8 },
      { x: -1.8, z: 1.8 },
      { x: 1.8, z: -1.8 },
      { x: -1.8, z: -1.8 },
      { x: 3.5, z: 0 },
      { x: -3.5, z: 0 },
      { x: 0, z: 3.5 },
      { x: 0, z: -3.5 },
      { x: 4.2, z: 4.2 },
      { x: -4.2, z: -4.2 }
    ];
    const baseSlot = charSlots[((this.characterObjects ? this.characterObjects.length : 0)) % charSlots.length];
    const baseX = (typeof cData.posX === 'number') ? cData.posX : baseSlot.x;
    const baseZ = (typeof cData.posZ === 'number') ? cData.posZ : baseSlot.z;

    sprite.position.set(baseX, 1.1, baseZ);
    sprite.userData = { type: 'character', data: cData };
    this.charactersGroup.add(sprite);

    this.characterObjects.push({
      data: cData,
      sprite: sprite,
      baseX: baseX,
      baseZ: baseZ,
      angle: Math.random() * Math.PI * 2,
      speed: cData.speed || 0.02
    });
  },

  /**
   * 🌟 [심시티 2000 & 롤러코스터 타이쿤식 조작계]
   * 드래그 패닝(Pan), 휠/핀치 줌, 좌우 90도 회전 스냅, 중앙 뷰 리셋
   */
  setupCityControls() {
    let isDragging = false;
    let prevPointerPos = { x: 0, y: 0 };
    let dragDist = 0;
    let initialPinchDist = 0;

    // 1. 마우스 드래그 시작
    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.isUserInteracting = true;
      dragDist = 0;
      prevPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      setTimeout(() => { this.isUserInteracting = false; }, 600);
    });

    // 2. 마우스 이동 (지도 패닝 Pan & 마우스 좌표 갱신)
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

      if (!isDragging) return;

      const deltaX = e.clientX - prevPointerPos.x;
      const deltaY = e.clientY - prevPointerPos.y;
      dragDist += Math.hypot(deltaX, deltaY);
      prevPointerPos = { x: e.clientX, y: e.clientY };

      this.panCamera(deltaX, deltaY);
    });

    // 3. 모바일 터치 드래그 & 핀치 줌
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        this.isUserInteracting = true;
        dragDist = 0;
        prevPointerPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.touches && e.touches.length === 0) {
        isDragging = false;
        setTimeout(() => { this.isUserInteracting = false; }, 600);
      }
    });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

        const deltaX = touch.clientX - prevPointerPos.x;
        const deltaY = touch.clientY - prevPointerPos.y;
        dragDist += Math.hypot(deltaX, deltaY);
        prevPointerPos = { x: touch.clientX, y: touch.clientY };

        this.panCamera(deltaX, deltaY);
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const pinchDelta = dist - initialPinchDist;
        initialPinchDist = dist;
        this.zoomCamera(pinchDelta > 0 ? -0.04 : 0.04);
      }
    }, { passive: true });

    // 4. 마우스 휠 줌
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomCamera(e.deltaY > 0 ? 0.08 : -0.08);
    }, { passive: false });

    // 5. 클릭 감지 (드래그하지 않고 가볍게 터치/클릭한 경우만)
    this.container.addEventListener('click', () => {
      if (this.animatingCamera || dragDist > 6) return;
      this.handleObjectClick();
    });

    // 6. 좌우 90도 회전 버튼 바인딩
    const btnRotLeft = document.getElementById('btn-city-rot-left');
    const btnRotRight = document.getElementById('btn-city-rot-right');
    const btnReset = document.getElementById('btn-planet-reset-view');

    if (btnRotLeft) {
      btnRotLeft.onclick = () => this.rotateCity(1);
    }
    if (btnRotRight) {
      btnRotRight.onclick = () => this.rotateCity(-1);
    }
    if (btnReset) {
      btnReset.onclick = () => this.resetView();
    }
  },

  /**
   * 🌟 카메라의 현재 바라보는 쿼터뷰 각도 기준으로 지도를 평행 이동(Pan)
   */
  panCamera(deltaX, deltaY) {
    if (!this.camera || !this.cameraLookTarget) return;

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const camDist = this.camera.position.distanceTo(this.cameraLookTarget);
    const panFactor = (camDist / 35) * 0.038;

    const panDelta = new THREE.Vector3()
      .addScaledVector(right, -deltaX * panFactor)
      .addScaledVector(forward, deltaY * panFactor);

    const nextLook = this.cameraLookTarget.clone().add(panDelta);
    if (Math.abs(nextLook.x) < 32 && Math.abs(nextLook.z) < 32) {
      this.camera.position.add(panDelta);
      this.cameraLookTarget.add(panDelta);
    }
  },

  /**
   * 🌟 줌 인/아웃 (카메라 거리 확대 및 축소)
   */
  zoomCamera(ratio) {
    if (!this.camera || !this.cameraLookTarget) return;
    const offset = this.camera.position.clone().sub(this.cameraLookTarget);
    const currentDist = offset.length();
    const newDist = currentDist * (1 + ratio);

    if (newDist >= 14 && newDist <= 85) {
      offset.multiplyScalar(1 + ratio);
      this.camera.position.copy(this.cameraLookTarget).add(offset);
    }
  },

  /**
   * 🌟 90도 회전 스냅
   */
  rotateCity(dir) {
    this.cityTargetRotation += dir * (Math.PI / 2);
  },

  /**
   * 🌟 뷰 중앙 리셋
   */
  resetView() {
    this.cityTargetRotation = 0;
    const targetCam = new THREE.Vector3(32, 34, 32);
    const targetLook = new THREE.Vector3(0, 0, 0);

    this.animatingCamera = true;
    const startCam = this.camera.position.clone();
    const startLook = this.cameraLookTarget.clone();
    let p = 0;

    const step = () => {
      p += 0.05;
      this.camera.position.lerpVectors(startCam, targetCam, p);
      this.cameraLookTarget.lerpVectors(startLook, targetLook, p);
      this.camera.lookAt(this.cameraLookTarget);
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        this.animatingCamera = false;
      }
    };
    step();
  },

  handleObjectClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.cityPivot) return;

    const intersects = this.raycaster.intersectObjects(this.cityPivot.children, true);

    for (let i = 0; i < intersects.length; i++) {
      let target = intersects[i].object;
      while (target && !target.userData?.type && target.parent && target !== this.cityPivot) {
        target = target.parent;
      }
      const uData = target?.userData;

      if (uData && uData.type === 'character') {
        this.showCharacterSpeech(uData.data, intersects[i].point);
        this.openHologramCard(uData.data, true);
        return;
      } else if (uData && uData.type === 'building') {
        this.showBuildingDetail(uData.data);
        return;
      } else if (uData && uData.type === 'landmark') {
        this.openHologramCard(uData.data, false, 'landmark');
        return;
      } else if (uData && uData.type === 'nature') {
        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast(`🌿 [${uData.data.name}] 아름다운 도시의 자연 생태 공간입니다.`);
        }
        return;
      }
    }
  },

  showCharacterSpeech(charData, point3D) {
    const bubble = document.getElementById('planet-speech-bubble');
    if (!bubble) return;

    const textEl = document.getElementById('planet-bubble-text');
    if (textEl) {
      textEl.textContent = `🐰 ${charData.name}: "${charData.speech || '안녕! 함께 멋진 별을 가꾸자!'}"`;
    }
    bubble.style.display = 'block';

    const screenPos = point3D.clone().project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const x = (screenPos.x * 0.5 + 0.5) * rect.width;
    const y = (-screenPos.y * 0.5 + 0.5) * rect.height;

    bubble.style.left = `${Math.max(20, Math.min(rect.width - 240, x - 50))}px`;
    bubble.style.top = `${Math.max(20, y - 80)}px`;

    clearTimeout(this.speechTimeout);
    this.speechTimeout = setTimeout(() => {
      bubble.style.display = 'none';
    }, 4500);
  },

  showBuildingDetail(bData) {
    this.openHologramCard(bData, false);
  },

  /**
   * 🌟 [핵심 인터랙션] 건물 또는 캐릭터 클릭 시 홀로그램 카드 팝업 & 층별 엘리베이터 서랍 연동
   */
  openHologramCard(itemData, isCharacter = false, itemType = '') {
    this.currentSelectedItem = itemData;
    this.currentFloorIndex = 0;

    const card = document.getElementById('planet-hologram-card');
    if (!card) return;

    const iconEl = document.getElementById('holo-icon');
    const titleEl = document.getElementById('holo-title');
    const subEl = document.getElementById('holo-subtitle');
    const imgEl = document.getElementById('holo-img');
    const imgBox = document.getElementById('holo-img-box');
    const descEl = document.getElementById('holo-desc');
    const dlLink = document.getElementById('holo-download-link');
    const drawerEl = document.getElementById('holo-floor-drawer');
    const floorCountEl = document.getElementById('holo-floor-count');
    const chipsContainer = document.getElementById('holo-floor-chips');
    const btnDeleteFloor = document.getElementById('btn-holo-delete-floor');
    const btnDelete = document.getElementById('btn-holo-delete');

    if (itemType === 'landmark') {
      // 🗿 세계 랜드마크 모드
      if (drawerEl) drawerEl.style.display = 'none';
      if (btnDeleteFloor) btnDeleteFloor.style.display = 'none';
      if (btnDelete) btnDelete.style.display = 'none';
      if (iconEl) iconEl.textContent = '🗿';
      if (titleEl) titleEl.textContent = itemData.name;
      if (subEl) subEl.textContent = `세계 랜드마크 · ${itemData.type === 'pyramid' ? '고대 문명' : itemData.type === 'eiffel' ? '철골 마천루' : '우주 개척 기지'}`;
      if (descEl) descEl.textContent = itemData.desc || '행성을 빛내는 상징 조형물입니다.';
      if (imgBox) imgBox.style.display = 'none';
      if (dlLink) dlLink.style.display = 'none';

    } else if (isCharacter) {
      // 🎨 아이 그림 캐릭터 모드
      if (drawerEl) drawerEl.style.display = 'none';
      if (btnDeleteFloor) btnDeleteFloor.style.display = 'none';
      if (iconEl) iconEl.textContent = '🎨';
      if (titleEl) titleEl.textContent = itemData.name || '마스코트';
      if (subEl) subEl.textContent = `아이 그림 마스코트 · 작가: ${itemData.creator || '우리아이'}`;
      if (descEl) descEl.textContent = itemData.speech || itemData.desc || '행성을 자유롭게 여행하는 마스코트입니다.';
      
      if (imgEl && imgBox) {
        if (itemData.imageUrl) {
          imgEl.onerror = () => {
            imgEl.onerror = null;
            imgEl.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect width='100%25' height='100%25' fill='%231e1e2e'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23fbbf24' font-family='sans-serif' font-size='15'%3E🎨 보관용 이미지 준비 중%3C/text%3E%3C/svg%3E";
          };
          imgEl.src = itemData.imageUrl;
          imgBox.style.display = 'flex';
        } else {
          imgBox.style.display = 'none';
        }
      }

      if (dlLink) {
        if (itemData.imageUrl) {
          dlLink.href = itemData.imageUrl;
          dlLink.style.display = 'inline-flex';
        } else {
          dlLink.style.display = 'none';
        }
      }

      if (btnDelete) {
        if (this.isAdminUser()) {
          btnDelete.style.display = 'inline-flex';
          btnDelete.textContent = '💥 마스코트 철거';
          btnDelete.onclick = () => this.confirmDeleteItem(itemData);
        } else {
          btnDelete.style.display = 'none';
        }
      }

    } else {
      // 🏢 심시티 층별 적층 타워 모드
      const floors = (Array.isArray(itemData.floors) && itemData.floors.length > 0) ? itemData.floors : [itemData];
      const floorCount = floors.length;

      if (iconEl) iconEl.textContent = floorCount >= 5 ? '🏙️' : (floorCount >= 3 ? '🏢' : '🏠');

      // 🛗 층별 엘리베이터 서랍 구성
      if (drawerEl && chipsContainer) {
        drawerEl.style.display = 'block';
        if (floorCountEl) floorCountEl.textContent = `${floorCount}`;
        chipsContainer.innerHTML = '';

        floors.forEach((fl, idx) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `btn btn-sm holo-floor-chip ${idx === 0 ? 'active' : ''}`;
          chip.setAttribute('data-floor-index', idx);
          chip.style.cssText = `padding: 4px 10px; border-radius: 8px; font-size: 0.76rem; font-weight: 700; white-space: nowrap; cursor: pointer; transition: all 0.2s ease; ${idx === 0 ? 'background: #0284c7; color: #fff; border: 1px solid #38bdf8;' : 'background: rgba(30, 41, 59, 0.85); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);'}`;
          chip.innerHTML = `${idx === 0 ? '🌟 ' : ''}<strong>${fl.floor || (floorCount - idx)}F</strong> <span style="font-size: 0.7rem; opacity: 0.85;">${(fl.title || '기록').substring(0, 7)}</span>`;
          
          chip.onclick = (e) => {
            e.stopPropagation();
            this.switchFloorView(idx);
          };
          chipsContainer.appendChild(chip);
        });
      }

      // 1층/최신층 내용 렌더링
      this.switchFloorView(0);

      // 전체 타워 철거 버튼 바인딩
      if (btnDelete) {
        if (this.isAdminUser()) {
          btnDelete.style.display = 'inline-flex';
          btnDelete.textContent = '💥 타워 전체 철거';
          btnDelete.onclick = () => this.confirmDeleteItem(itemData);
        } else {
          btnDelete.style.display = 'none';
        }
      }
    }

    card.style.display = 'block';

    // 카메라 부드러운 줌인 비행
    this.focusOnEntity(itemData);
  },

  /**
   * 🌟 층별 엘리베이터 서랍 내 층 선택 시 카드 내용 실시간 전환
   */
  switchFloorView(floorIndex) {
    this.currentFloorIndex = floorIndex;
    const itemData = this.currentSelectedItem;
    if (!itemData) return;

    const floors = (Array.isArray(itemData.floors) && itemData.floors.length > 0) ? itemData.floors : [itemData];
    const targetFloor = floors[floorIndex] || floors[0];
    if (!targetFloor) return;

    const titleEl = document.getElementById('holo-title');
    const subEl = document.getElementById('holo-subtitle');
    const imgEl = document.getElementById('holo-img');
    const imgBox = document.getElementById('holo-img-box');
    const descEl = document.getElementById('holo-desc');
    const dlLink = document.getElementById('holo-download-link');
    const btnDeleteFloor = document.getElementById('btn-holo-delete-floor');

    const fNum = targetFloor.floor || (floors.length - floorIndex);
    if (titleEl) titleEl.textContent = targetFloor.title || itemData.name || '보관 자료';
    if (subEl) {
      subEl.textContent = `[${fNum}층 기록실] · 카테고리: ${itemData.category || '기록'} · 등록: ${targetFloor.createdAt || '최근'}`;
    }

    if (imgEl && imgBox) {
      const imgUrl = targetFloor.imageUrl || itemData.imageUrl;
      if (imgUrl) {
        imgEl.onerror = () => {
          imgEl.onerror = null;
          imgEl.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='260' viewBox='0 0 400 260'%3E%3Crect width='100%25' height='100%25' fill='%231e1e2e'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23fbbf24' font-family='sans-serif' font-size='15'%3E📦 보관용 이미지 준비 중%3C/text%3E%3C/svg%3E";
        };
        imgEl.src = imgUrl;
        imgBox.style.display = 'flex';
      } else {
        imgBox.style.display = 'none';
      }
    }

    if (descEl) {
      descEl.textContent = targetFloor.desc || '보관된 상세 설명이 없습니다.';
    }

    if (dlLink) {
      const imgUrl = targetFloor.imageUrl || itemData.imageUrl;
      if (imgUrl) {
        dlLink.href = imgUrl;
        dlLink.style.display = 'inline-flex';
      } else {
        dlLink.style.display = 'none';
      }
    }

    // 칩 버튼 스타일 업데이트
    const chips = document.querySelectorAll('.holo-floor-chip');
    chips.forEach((c, i) => {
      if (i === floorIndex) {
        c.style.background = '#0284c7';
        c.style.color = '#fff';
        c.style.border = '1px solid #38bdf8';
      } else {
        c.style.background = 'rgba(30, 41, 59, 0.85)';
        c.style.color = '#94a3b8';
        c.style.border = '1px solid rgba(255,255,255,0.1)';
      }
    });

    // 🌟 층별 단독 철거 버튼 바인딩 (관리자 전용 & 2개 층 이상일 때만 노출)
    if (btnDeleteFloor) {
      if (this.isAdminUser() && floors.length >= 2) {
        btnDeleteFloor.style.display = 'inline-flex';
        btnDeleteFloor.innerHTML = `<span>🗑️</span> ${fNum}층만 철거`;
        btnDeleteFloor.onclick = () => this.confirmDeleteFloor(itemData, targetFloor.id);
      } else {
        btnDeleteFloor.style.display = 'none';
      }
    }
  },

  /**
   * 🌟 관리자 전용: 특정 타워의 특정 층만 단독 철거(삭제)
   */
  async confirmDeleteFloor(buildingData, floorId) {
    if (!this.isAdminUser()) {
      alert('🔒 자료 삭제(철거)는 관리자만 가능합니다.');
      return;
    }

    // 💻 로컬 노트북 연결 상태 실시간 검증 (꺼져 있으면 층 철거 차단)
    if (!this.laptopStatus || !this.laptopStatus.online) {
      await this.checkLaptopStatus();
      if (!this.laptopStatus || !this.laptopStatus.online) {
        this.showOfflineModal('delete');
        return;
      }
    }

    const floors = buildingData.floors || [];
    const targetFloor = floors.find(f => f.id === floorId);
    const floorTitle = targetFloor?.title || '해당 층';

    const ok = confirm(`정말 [${buildingData.name}]의 [${floorTitle}]만 단독 철거하시겠습니까?\n(나머지 층 자료는 안전하게 보존됩니다)`);
    if (!ok) return;

    try {
      if (window.UiView && window.UiView.showToast) {
        window.UiView.showToast(`🗑️ [${floorTitle}] 층을 철거하고 있습니다...`);
      }

      await window.PlanetWorldModel.deleteFloorItem(buildingData.id, floorId);

      // 3D 월드 새로고침
      await this.refreshWorld();

      // 타워가 아직 남아있으면 갱신된 타워 카드 다시 열기
      const updatedBuilding = window.PlanetWorldModel.getBuildings().find(b => b.id === buildingData.id);
      if (updatedBuilding && updatedBuilding.floors && updatedBuilding.floors.length > 0) {
        this.openHologramCard(updatedBuilding, false);
      } else {
        const card = document.getElementById('planet-hologram-card');
        if (card) card.style.display = 'none';
        this.currentSelectedItem = null;
      }

      if (window.UiView && window.UiView.showToast) {
        window.UiView.showToast(`✅ [${floorTitle}] 층이 성공적으로 철거되었습니다.`);
      }
    } catch (err) {
      alert('층 철거 중 오류가 발생했습니다: ' + err.message);
    }
  },

  /**
   * 🌟 관리자 전용: 자료/건물/캐릭터 영구 철거(삭제) 처리
   */
  async confirmDeleteItem(itemData) {
    if (!this.isAdminUser()) {
      alert('🔒 자료 삭제(철거)는 관리자만 가능합니다.');
      return;
    }

    // 💻 로컬 노트북 연결 상태 실시간 검증 (꺼져 있으면 전체 철거 차단)
    if (!this.laptopStatus || !this.laptopStatus.online) {
      await this.checkLaptopStatus();
      if (!this.laptopStatus || !this.laptopStatus.online) {
        this.showOfflineModal('delete');
        return;
      }
    }

    const name = itemData.name || itemData.title || '해당 자료';
    const isChar = !!itemData.species;
    const typeName = isChar ? '캐릭터' : '타워 전체';
    const ok = confirm(`정말 이 ${typeName} [${name}]을(를) 행성에서 영구 철거(삭제)하시겠습니까?`);
    if (!ok) return;

    try {
      if (window.UiView && window.UiView.showToast) {
        window.UiView.showToast(`🗑️ [${name}] 철거를 진행하고 있습니다...`);
      }

      await window.PlanetWorldModel.deleteItem(itemData.id);

      // 홀로그램 카드 닫기
      const card = document.getElementById('planet-hologram-card');
      if (card) card.style.display = 'none';
      this.currentSelectedItem = null;

      // 3D 월드 새로고침
      await this.refreshWorld();

      if (window.UiView && window.UiView.showToast) {
        window.UiView.showToast(`✅ [${name}]이(가) 행성에서 안전하게 철거되었습니다.`);
      } else {
        alert(`✅ [${name}]이(가) 행성에서 성공적으로 철거되었습니다.`);
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    }
  },

  /**
   * 특정 건물 또는 캐릭터로 카메라 부드러운 줌인 & 포커스
   */
  focusOnEntity(data) {
    if (!data) return;

    let targetPos = new THREE.Vector3(0, 0, 0);

    // 1. 건물 검색
    const bObj = this.buildingObjects.find(b => b.data && b.data.id === data.id);
    if (bObj && bObj.mesh) {
      targetPos.copy(bObj.mesh.position);
      targetPos.y += 1.5;
    } else {
      // 2. 캐릭터 검색
      const cObj = this.characterObjects.find(c => c.data && c.data.id === data.id);
      if (cObj && cObj.sprite) {
        targetPos.copy(cObj.sprite.position);
      } else {
        // 3. 기타 좌표
        if (typeof data.x === 'number' && typeof data.z === 'number') {
          targetPos.set(data.x, 1, data.z);
        }
      }
    }

    // 도시의 현재 Y축 회전을 적용한 월드 좌표
    const worldLookTarget = targetPos.clone().applyEuler(this.cityPivot ? this.cityPivot.rotation : new THREE.Euler());
    // 아이소메트릭 오프셋 줌인 위치 (거리 약 22)
    const worldCamTarget = worldLookTarget.clone().add(new THREE.Vector3(14, 16, 14));

    this.animatingCamera = true;
    const startCam = this.camera.position.clone();
    const startLook = this.cameraLookTarget.clone();
    let progress = 0;

    const animStep = () => {
      progress += 0.05;
      const t = Math.min(1, progress);
      this.camera.position.lerpVectors(startCam, worldCamTarget, t);
      this.cameraLookTarget.lerpVectors(startLook, worldLookTarget, t);
      this.camera.lookAt(this.cameraLookTarget);

      if (progress < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.animatingCamera = false;
      }
    };
    animStep();
  },

  focusOnBuilding(bData) {
    this.focusOnEntity(bData);
    this.openHologramCard(bData, false);
  },

  startLoop() {
    this.isRunning = true;
    let clock = 0;

    const animate = () => {
      if (!this.isRunning) return;
      requestAnimationFrame(animate);

      clock += 0.025;

      // 1. 🏙️ 90도 스냅 회전 보간 (lerp)
      if (this.cityPivot) {
        this.cityPivot.rotation.y = THREE.MathUtils.lerp(this.cityPivot.rotation.y, this.cityTargetRotation, 0.09);
      }

      // 2. 🚗 미니 레트로 자동차 도로 주행 애니메이션
      if (this.trafficVehicles && this.trafficVehicles.length > 0) {
        this.trafficVehicles.forEach(v => {
          v.coord += v.config.dir * v.config.speed;
          if (v.config.dir === 1 && v.coord > v.config.max) {
            v.coord = v.config.min;
          } else if (v.config.dir === -1 && v.coord < v.config.min) {
            v.coord = v.config.max;
          }
          if (v.config.road === 'z') {
            v.group.position.x = v.coord;
          } else {
            v.group.position.z = v.coord;
          }
        });
      }

      // 3. 🐰 캐릭터 보도/광장 산책 & 통통 튀는 바운스
      if (this.characterObjects && this.characterObjects.length > 0) {
        this.characterObjects.forEach((obj, idx) => {
          obj.angle += obj.speed || 0.02;
          const bounce = Math.abs(Math.sin(clock * 3.5 + idx * 1.5)) * 0.22;
          obj.sprite.position.x = obj.baseX + Math.sin(obj.angle) * 0.7;
          obj.sprite.position.z = obj.baseZ + Math.cos(obj.angle) * 0.7;
          obj.sprite.position.y = 1.0 + bounce;
        });
      }

      // 4. ☁️ 상공 솜사탕 구름 부드러운 순항
      if (this.cloudsGroup) {
        this.cloudsGroup.rotation.y += 0.0007;
      }

      // 5. 카메라 LookAt 업데이트
      if (this.camera && this.cameraLookTarget) {
        this.camera.lookAt(this.cameraLookTarget);
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  },

  pause() {
    this.isRunning = false;
  },

  resume() {
    if (!this.isRunning) {
      this.startLoop();
    }
  },

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  isAdminUser() {
    const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
    if (!rawUser) return false;
    try {
      const u = JSON.parse(rawUser);
      return u && !u.isGuest;
    } catch (e) {
      return false;
    }
  },

  bindDOMEvents() {
    // 1. 업로드 모달 열기 (관리자 전용)
    const btnOpenUpload = document.getElementById('btn-planet-open-upload');
    const uploadModal = document.getElementById('modal-planet-upload') || document.getElementById('planet-upload-modal');
    const btnCloseUpload = document.getElementById('btn-planet-upload-close');
    const btnCancelUpload = document.getElementById('btn-planet-upload-cancel');

    const openModal = async () => {
      if (!this.isAdminUser()) {
        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast('🔒 자료 및 아이 그림 업로드는 관리자만 가능합니다.');
        } else {
          alert('🔒 자료 및 아이 그림 업로드는 최고 관리자만 가능합니다.');
        }
        return;
      }

      // 💻 로컬 노트북 연결 상태 실시간 검증 (꺼져 있으면 업로드 차단 & 마인크래프트 경고 모달 표시)
      if (!this.laptopStatus || !this.laptopStatus.online) {
        await this.checkLaptopStatus();
        if (!this.laptopStatus || !this.laptopStatus.online) {
          this.showOfflineModal('upload');
          return;
        }
      }

      if (uploadModal) {
        uploadModal.style.display = 'flex';
        uploadModal.classList.remove('hidden');
      }
    };

    const closeModal = () => {
      if (uploadModal) {
        uploadModal.style.display = 'none';
        uploadModal.classList.add('hidden');
      }
    };

    // 마인크래프트 테마: 로컬 노트북 오프라인 경고 모달 이벤트 바인딩
    const offlineModal = document.getElementById('modal-planet-laptop-offline');
    const btnOfflineClose = document.getElementById('btn-planet-offline-close');
    const btnOfflineX = document.getElementById('btn-planet-offline-x');
    const btnRetryConnection = document.getElementById('btn-planet-retry-connection');

    const closeOfflineModal = () => {
      if (offlineModal) offlineModal.style.display = 'none';
    };

    if (btnOfflineClose) btnOfflineClose.addEventListener('click', closeOfflineModal);
    if (btnOfflineX) btnOfflineX.addEventListener('click', closeOfflineModal);

    if (btnRetryConnection) {
      btnRetryConnection.addEventListener('click', async () => {
        btnRetryConnection.disabled = true;
        btnRetryConnection.innerHTML = '<span>⏳</span> 연결 확인 중...';
        
        await this.checkLaptopStatus();
        
        if (this.laptopStatus && this.laptopStatus.online) {
          closeOfflineModal();
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast('🟢 로컬 노트북 연결이 확인되었습니다! 자료 올리기 창을 엽니다.');
          }
          if (uploadModal) {
            uploadModal.style.display = 'flex';
            uploadModal.classList.remove('hidden');
          }
        } else {
          const lastSeenEl = document.getElementById('offline-modal-last-seen');
          if (lastSeenEl && this.laptopStatus) {
            lastSeenEl.textContent = this.laptopStatus.secondsAgo !== null
              ? `${this.laptopStatus.secondsAgo}초 전 (${this.laptopStatus.lastSeen ? this.laptopStatus.lastSeen.replace('T', ' ').substring(0, 19) : ''})`
              : '신호 없음';
          }
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast('🔴 아직 노트북 연결이 확인되지 않았습니다. 전원을 확인해주세요.');
          }
        }
        btnRetryConnection.disabled = false;
        btnRetryConnection.innerHTML = '<span>🔄</span> 연결 다시 확인';
      });
    }

    if (btnOpenUpload) {
      btnOpenUpload.addEventListener('click', openModal);
    }
    if (btnCloseUpload) {
      btnCloseUpload.addEventListener('click', closeModal);
    }
    if (btnCancelUpload) {
      btnCancelUpload.addEventListener('click', closeModal);
    }

    // 2. 파일 선택 & 배경 투명화 미리보기
    const fileInput = document.getElementById('planet-file-input');
    const previewBox = document.getElementById('planet-preview-box') || document.getElementById('planet-preview-container');
    const previewImg = document.getElementById('planet-preview-img');

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = async (evt) => {
            const rawBase64 = evt.target.result;
            this.originalRawBase64 = rawBase64;

            if (file.type.startsWith('image/')) {
              try {
                const transparentBase64 = await window.PlanetWorldModel.processTransparentBackground(rawBase64);
                this.processedImageBase64 = transparentBase64;
                if (previewImg) previewImg.src = transparentBase64;
              } catch (err) {
                this.processedImageBase64 = rawBase64;
                if (previewImg) previewImg.src = rawBase64;
              }
            } else {
              this.processedImageBase64 = rawBase64;
              if (previewImg) previewImg.src = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400';
            }
            if (previewBox) previewBox.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // 3. 업로드 폼 제출 처리 (관리자 권한 검증)
    const formUpload = document.getElementById('form-planet-upload');
    const btnSubmitUpload = document.getElementById('btn-planet-upload-submit') || document.getElementById('btn-planet-submit-upload');

    const handleUploadSubmit = async (e) => {
      if (e) e.preventDefault();

      if (!this.isAdminUser()) {
        alert('🔒 자료 업로드 권한이 없습니다. 관리자로 로그인해주세요.');
        return;
      }

      // 💻 로컬 노트북 연결 상태 실시간 검증 (제출 시 2중 체크)
      if (!this.laptopStatus || !this.laptopStatus.online) {
        await this.checkLaptopStatus();
        if (!this.laptopStatus || !this.laptopStatus.online) {
          closeModal();
          this.showOfflineModal('upload');
          return;
        }
      }

      const name = document.getElementById('planet-item-name')?.value?.trim() || '';
      const type = document.getElementById('planet-item-type')?.value || 'auto';
      const desc = document.getElementById('planet-item-desc')?.value?.trim() || '';

      if (!name) {
        alert('자료 또는 캐릭터 이름을 입력해주세요!');
        return;
      }

      if (btnSubmitUpload) {
        btnSubmitUpload.disabled = true;
        btnSubmitUpload.textContent = '🤖 Gemini 분석 및 행성 건축 중...';
      }

      try {
        const model = window.PlanetWorldModel;
        const analysis = await model.analyzeMaterialWithLLM(this.processedImageBase64, desc, type, name);

        const payload = {
          ...analysis,
          name: name,
          title: name,
          imageBase64: this.processedImageBase64,
          imageUrl: this.processedImageBase64 || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=500'
        };

        const res = await model.uploadItem(payload);
        if (res && res.success === false) {
          throw new Error(res.message || '업로드 실패');
        }

        await this.refreshWorld();
        closeModal();

        if (formUpload) formUpload.reset();
        if (previewBox) previewBox.style.display = 'none';
        this.processedImageBase64 = '';
        this.originalRawBase64 = '';

        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast(`✨ '${name}'(이)가 행성에 성공적으로 배치되었습니다!`);
        } else {
          alert(`✨ '${name}'(이)가 행성에 성공적으로 배치되었습니다!`);
        }

        if (payload.id) {
          this.focusOnEntity(payload);
          this.openHologramCard(payload, payload.isCharacter);
        }
      } catch (err) {
        alert('업로드 처리 중 오류가 발생했습니다: ' + err.message);
      } finally {
        if (btnSubmitUpload) {
          btnSubmitUpload.disabled = false;
          btnSubmitUpload.textContent = '🔨 행성에 건축 & 소환하기';
        }
      }
    };

    if (formUpload) {
      formUpload.addEventListener('submit', handleUploadSubmit);
    } else if (btnSubmitUpload) {
      btnSubmitUpload.addEventListener('click', handleUploadSubmit);
    }

    // 4. 홀로그램 카드 닫기 버튼
    const btnHoloClose = document.getElementById('btn-holo-close');
    const btnHoloConfirm = document.getElementById('btn-holo-confirm');
    const holoCard = document.getElementById('planet-hologram-card');
    const closeHolo = () => {
      if (holoCard) holoCard.style.display = 'none';
      this.currentSelectedItem = null;
    };

    if (btnHoloClose) btnHoloClose.addEventListener('click', closeHolo);
    if (btnHoloConfirm) btnHoloConfirm.addEventListener('click', closeHolo);

    // 5. 검색창 슬라이드 토글
    const btnToggleSearch = document.getElementById('btn-planet-toggle-search');
    const searchInput = document.getElementById('planet-search-input');
    let searchOpen = false;

    if (btnToggleSearch && searchInput) {
      btnToggleSearch.addEventListener('click', () => {
        searchOpen = !searchOpen;
        if (searchOpen) {
          const isMobile = window.innerWidth <= 640;
          searchInput.style.width = isMobile ? '110px' : '170px';
          searchInput.style.opacity = '1';
          searchInput.style.padding = isMobile ? '5px 10px' : '6px 12px';
          searchInput.style.border = '1px solid rgba(56, 189, 248, 0.4)';
          searchInput.style.pointerEvents = 'auto';
          searchInput.focus();
        } else {
          searchInput.style.width = '0';
          searchInput.style.opacity = '0';
          searchInput.style.padding = '0';
          searchInput.style.border = 'none';
          searchInput.style.pointerEvents = 'none';
        }
      });

      const doSearch = async () => {
        const q = searchInput.value.trim();
        if (!q) return;
        const res = await window.PlanetWorldModel.searchItems(q);
        if (res && res.total > 0) {
          const match = res.buildings[0] || res.characters[0];
          if (match) {
            this.openHologramCard(match, !match.category);
          }
        } else {
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast(`'${q}' 관련 자료를 찾을 수 없습니다.`);
          }
        }
      };

      searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    }

    // 6. 뷰 리셋 버튼
    const btnResetView = document.getElementById('btn-planet-reset-view');
    if (btnResetView) {
      btnResetView.onclick = () => this.resetView();
    }
  },

  updateHUDCounts(buildingCount, charCount, cityStats = null) {
    const elTotal = document.getElementById('planet-stat-total');
    if (elTotal) elTotal.textContent = `${buildingCount + charCount}`;

    const subEl = document.querySelector('.planet-hud-sub');
    if (subEl && cityStats) {
      subEl.textContent = `${cityStats.cityName || '메트로폴리스'} · ${cityStats.cityLevel || '첨단 도시'} (${cityStats.totalFloors || 0}층)`;
    }
  },

  /**
   * 💻 로컬 노트북 연결 상태 실시간 감지 & 3D 비콘 빛 / 상단 HUD 동기화
   */
  async checkLaptopStatus() {
    try {
      const res = await fetch('/api/system/laptop-status');
      if (!res.ok) return;
      const data = await res.json();
      if (!data || data.success === false) return;

      this.laptopStatus = data;
      const isOnline = !!data.online;

      // 1. 상단 HUD 뱃지 UI 갱신
      const badge = document.getElementById('planet-laptop-status-badge');
      const dot = document.getElementById('laptop-status-dot');
      const text = document.getElementById('laptop-status-text');

      if (badge && dot && text) {
        if (isOnline) {
          badge.style.borderColor = '#22c55e';
          dot.style.background = '#22c55e';
          dot.style.boxShadow = '0 0 8px #22c55e';
          text.textContent = '온라인';
          text.style.color = '#4ade80';
          badge.title = `💻 노트북 연결 중 (최근 신호: ${data.secondsAgo || 0}초 전) - 터치하여 상세 확인`;
        } else {
          badge.style.borderColor = '#ef4444';
          dot.style.background = '#ef4444';
          dot.style.boxShadow = '0 0 8px #ef4444';
          text.textContent = '오프라인';
          text.style.color = '#f87171';
          badge.title = `💻 노트북 오프라인 (자료 업로드/삭제 차단) - 터치하여 상세 확인`;
        }

        // 뱃지 클릭 시 상태 안내 토스트
        badge.onclick = () => {
          const msg = isOnline
            ? `🟢 [노트북 온라인] 정상 연결 중입니다. (최근 신호: ${data.secondsAgo || 0}초 전)\n자료가 로컬 및 클라우드 양방향 동기화됩니다.`
            : `🔴 [노트북 오프라인] 노트북이 절전/종료 상태입니다.\n(데이터 안전을 위해 노트북이 켜져 있을 때만 업로드 및 삭제가 가능합니다)`;
          if (window.UiView && window.UiView.showToast) {
            window.UiView.showToast(msg);
          } else {
            alert(msg);
          }
        };
      }

      // 2. 3D 월드 내 통신탑/비콘 발광 코어 메쉬 색상 실시간 전환
      const beaconColor = isOnline ? 0x22c55e : 0xef4444;
      if (Array.isArray(this.beaconCores)) {
        this.beaconCores.forEach(core => {
          if (core && core.material) {
            if (core.material.color) core.material.color.setHex(beaconColor);
            if (core.material.emissive) core.material.emissive.setHex(beaconColor);
          }
        });
      }
    } catch (e) {
      console.warn('[PlanetWorldView] checkLaptopStatus error:', e);
    }
  },

  /**
   * 💻 마인크래프트 테마 로컬 노트북 오프라인 경고 모달 표시
   */
  showOfflineModal(actionType = 'upload') {
    const modal = document.getElementById('modal-planet-laptop-offline');
    const lastSeenEl = document.getElementById('offline-modal-last-seen');
    if (lastSeenEl) {
      if (this.laptopStatus && this.laptopStatus.secondsAgo !== null) {
        lastSeenEl.textContent = `${this.laptopStatus.secondsAgo}초 전 (${this.laptopStatus.lastSeen ? this.laptopStatus.lastSeen.replace('T', ' ').substring(0, 19) : ''})`;
      } else {
        lastSeenEl.textContent = '신호 없음';
      }
    }
    if (modal) {
      modal.style.display = 'flex';
    } else {
      const msg = actionType === 'delete'
        ? '⚠️ [로컬 노트북 오프라인]\n노트북 전원이 꺼져 있어 건물 철거 및 자료 삭제가 차단되었습니다.\n노트북 연결을 확인해주세요.'
        : '⚠️ [로컬 노트북 오프라인]\n노트북 전원이 꺼져 있어 신규 자료 저장이 차단되었습니다.\n노트북 전원을 켠 후 다시 시도해주세요.';
      alert(msg);
    }
  }
};
