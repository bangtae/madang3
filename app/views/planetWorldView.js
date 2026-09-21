// app/views/planetWorldView.js - Three.js 3D 행성 심시티 & 테마파크 테라리움 뷰

window.PlanetWorldView = {
  container: null,
  scene: null,
  camera: null,
  renderer: null,
  planetPivot: null,      // 🪐 전체 오브젝트 일체화 회전 피벗 그룹
  planetMesh: null,       // 청량한 바다 구체
  atmosphereMesh: null,   // 대기권 발광 구체
  continentsGroup: null,  // 부드러운 대륙 플레이트 & 미니 숲
  buildingsGroup: null,   // 타이쿤 미니어처 건물들
  charactersGroup: null,  // 귀여운 원형 마스코트 핀/뱃지들
  cloudsGroup: null,      // 궤도를 도는 몽실몽실 솜사탕 구름들
  starsMesh: null,
  raycaster: null,
  mouse: null,

  buildingObjects: [],    // 3D 건물 메쉬 및 데이터
  characterObjects: [],   // 3D 캐릭터 스프라이트 및 데이터
  currentSelectedItem: null,
  animatingCamera: false,
  isUserInteracting: false,

  isInitialized: false,
  isRunning: false,
  planetRadius: 8.5,      // 🌟 모바일 화면에 쏙 들어오는 아담한 미니 행성 테라리움 반경

  init() {
    this.container = document.getElementById('planet-canvas-container') || document.getElementById('planet-viewport');

    // 1. DOM 이벤트 바인딩
    this.bindDOMEvents();

    // 2. 월드 데이터 및 통계 HUD 로드
    this.refreshWorld();

    if (!this.container) {
      console.warn('[PlanetWorldView] planet-canvas-container not found in DOM');
      return;
    }

    // 3. Three.js 확인
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

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050814);

    // 2. Camera (행성 크기 축소에 맞춘 완벽한 시야각 거리)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 4, 28);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
    sunLight.position.set(30, 25, 30);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 0.9, 100);
    pointLight.position.set(-25, -15, -25);
    this.scene.add(pointLight);

    // 5. 🌟 [핵심] 모든 행성 구성 요소를 담을 단일 회전 피벗 그룹
    this.planetPivot = new THREE.Group();
    this.scene.add(this.planetPivot);

    this.buildingsGroup = new THREE.Group();
    this.planetPivot.add(this.buildingsGroup);

    this.charactersGroup = new THREE.Group();
    this.planetPivot.add(this.charactersGroup);

    this.cloudsGroup = new THREE.Group();
    this.planetPivot.add(this.cloudsGroup);

    // 6. 우주 별빛 파티클
    this.createSpaceStars();

    // 7. 아기자기한 미니 테라리움 행성
    this.createLittlePlanet();

    // 8. 궤도 구름들
    this.createOrbitClouds(this.planetRadius);

    // 9. Raycaster & Mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    window.addEventListener('resize', () => this.onWindowResize());
    this.setupOrbitInteractions();
  },

  createSpaceStars() {
    const starCount = 650;
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    const starColors = [];

    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 350;
      const y = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;
      starPos.push(x, y, z);

      const col = Math.random() > 0.3 ? [0.8, 0.9, 1.0] : [1.0, 0.95, 0.6];
      starColors.push(...col);
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    this.starsMesh = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsMesh);
  },

  createLittlePlanet() {
    const config = window.PlanetWorldModel?.getPlanetConfig() || {};
    const radius = config.radius || this.planetRadius;
    this.planetRadius = radius;

    // 1. 청량하고 맑은 바다 구체
    const seaGeo = new THREE.SphereGeometry(radius, 64, 64);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.35,
      metalness: 0.15
    });
    this.planetMesh = new THREE.Mesh(seaGeo, seaMat);
    this.planetMesh.receiveShadow = true;
    this.planetPivot.add(this.planetMesh);

    // 2. 부드러운 대륙 플레이트 & 숲
    this.createContinentsAndTerrain(radius);

    // 3. 대기권 은은한 발광 레이어
    const atmosGeo = new THREE.SphereGeometry(radius * 1.12, 36, 36);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide
    });
    this.atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    this.planetPivot.add(this.atmosphereMesh);
  },

  /**
   * 🌟 기존의 거대하고 투박한 구체 언덕을 제거하고,
   * 지표면에 밀착된 아기자기한 대륙 플레이트와 미니 침엽수림 숲으로 테라리움 연출
   */
  createContinentsAndTerrain(radius) {
    this.continentsGroup = new THREE.Group();
    const continents = [
      { lat: 18, lon: 32, r: 2.8, col: 0x16a34a, trees: 3 },
      { lat: 38, lon: -58, r: 3.0, col: 0x15803d, trees: 4 },
      { lat: -22, lon: 78, r: 2.4, col: 0x16a34a, trees: 2 },
      { lat: -28, lon: -42, r: 2.7, col: 0x15803d, trees: 3 },
      { lat: 8, lon: 138, r: 2.2, col: 0x22c55e, trees: 2 },
      { lat: 32, lon: -112, r: 2.6, col: 0x16a34a, trees: 3 },
      { lat: -10, lon: 154, r: 2.3, col: 0x22c55e, trees: 2 },
      { lat: -85, lon: 0, r: 2.5, col: 0xf1f5f9, trees: 0 }, // 남극 설원
      { lat: 85, lon: 0, r: 2.2, col: 0xf1f5f9, trees: 0 }  // 북극 빙하
    ];

    continents.forEach(c => {
      const pos = this.latLonToVector3(c.lat, c.lon, radius);
      const normal = pos.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);

      const islandGroup = new THREE.Group();
      islandGroup.position.copy(pos);
      islandGroup.quaternion.copy(quat);

      // 1. 얇은 곡면 디스크 대륙 플레이트 (구체 표면에 부드럽게 밀착)
      const plateGeo = new THREE.CylinderGeometry(c.r, c.r * 1.05, 0.16, 24);
      const plateMat = new THREE.MeshStandardMaterial({
        color: c.col,
        roughness: 0.8
      });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.y = 0.08;
      plate.receiveShadow = true;
      islandGroup.add(plate);

      // 2. 대륙 위 미니 소나무 숲
      for (let t = 0; t < c.trees; t++) {
        const ang = (t / c.trees) * Math.PI * 2 + 0.4;
        const dist = (0.35 + (t % 2) * 0.25) * c.r;
        const tx = Math.cos(ang) * dist;
        const tz = Math.sin(ang) * dist;

        const treeGroup = new THREE.Group();
        treeGroup.position.set(tx, 0.16, tz);

        // 줄기
        const trunkGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.22, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.11;
        treeGroup.add(trunk);

        // 2단 잎
        const f1Geo = new THREE.ConeGeometry(0.24, 0.4, 6);
        const f1Mat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
        const f1 = new THREE.Mesh(f1Geo, f1Mat);
        f1.position.y = 0.32;
        treeGroup.add(f1);

        const f2Geo = new THREE.ConeGeometry(0.18, 0.3, 6);
        const f2 = new THREE.Mesh(f2Geo, f1Mat);
        f2.position.y = 0.52;
        treeGroup.add(f2);

        islandGroup.add(treeGroup);
      }

      this.continentsGroup.add(islandGroup);
    });

    this.planetMesh.add(this.continentsGroup);
  },

  /**
   * 🌟 행성 주위를 유유히 도는 몽실몽실한 로우폴리 솜사탕 구름
   */
  createOrbitClouds(radius) {
    if (!this.cloudsGroup) return;
    this.cloudsGroup.clear();

    const cloudPositions = [
      { lat: 15, lon: 10, alt: 2.0, scale: 0.9 },
      { lat: -20, lon: 105, alt: 2.2, scale: 1.1 },
      { lat: 35, lon: -160, alt: 2.1, scale: 0.85 },
      { lat: -15, lon: -95, alt: 2.3, scale: 1.0 },
      { lat: 45, lon: -30, alt: 1.9, scale: 0.8 }
    ];

    cloudPositions.forEach(cp => {
      const pos = this.latLonToVector3(cp.lat, cp.lon, radius + cp.alt);
      const normal = pos.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);

      const cGroup = new THREE.Group();
      cGroup.position.copy(pos);
      cGroup.quaternion.copy(quat);

      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        transparent: true,
        opacity: 0.9
      });

      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.6 * cp.scale, 10, 10), cloudMat);
      s1.scale.set(1.4, 0.7, 0.9);
      cGroup.add(s1);

      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.45 * cp.scale, 8, 8), cloudMat);
      s2.position.set(-0.4 * cp.scale, 0.12 * cp.scale, 0);
      s2.scale.set(1.1, 0.8, 0.9);
      cGroup.add(s2);

      const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.42 * cp.scale, 8, 8), cloudMat);
      s3.position.set(0.4 * cp.scale, 0.1 * cp.scale, 0);
      s3.scale.set(1.1, 0.8, 0.9);
      cGroup.add(s3);

      this.cloudsGroup.add(cGroup);
    });
  },

  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  },

  /**
   * 3D 심시티 건물 및 아이 캐릭터 렌더링 갱신
   */
  async refreshWorld() {
    if (!window.PlanetWorldModel) return;
    const model = window.PlanetWorldModel;
    await model.loadWorld(true);

    const buildings = model.getBuildings();
    const characters = model.getCharacters();

    // 1. 기존 건물 메쉬 제거
    if (this.buildingsGroup) {
      while (this.buildingsGroup.children.length > 0) {
        this.buildingsGroup.remove(this.buildingsGroup.children[0]);
      }
    }
    this.buildingObjects = [];

    // 2. 기존 캐릭터 스프라이트 제거
    if (this.charactersGroup) {
      while (this.charactersGroup.children.length > 0) {
        this.charactersGroup.remove(this.charactersGroup.children[0]);
      }
    }
    this.characterObjects = [];

    // 3. 건물 생성 & 배치 (planetPivot 내 buildingsGroup에 편입하여 100% 회전 동기화)
    buildings.forEach(bData => {
      const buildingMesh = this.createBuildingMesh(bData);
      const pos = this.latLonToVector3(bData.lat, bData.lon, this.planetRadius);
      buildingMesh.position.copy(pos);

      const normal = pos.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
      buildingMesh.quaternion.copy(quaternion);

      this.buildingsGroup.add(buildingMesh);
      this.buildingObjects.push({ data: bData, mesh: buildingMesh });
    });

    // 4. 아이 캐릭터 원형 뱃지/핀 생성 & 배치
    characters.forEach(cData => {
      this.createCharacterSprite(cData);
    });

    // 5. 카운터 HUD 업데이트
    this.updateHUDCounts(buildings.length, characters.length);
  },

  createBuildingMesh(data) {
    const group = new THREE.Group();
    const col = new THREE.Color(data.color || '#f97316');

    // 1. 디오라마 베이스 타일
    const tileBaseGeo = new THREE.BoxGeometry(2.1, 0.12, 2.1);
    const tileBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const tileBase = new THREE.Mesh(tileBaseGeo, tileBaseMat);
    tileBase.position.y = 0.06;
    tileBase.receiveShadow = true;
    group.add(tileBase);

    const lawnGeo = new THREE.BoxGeometry(1.95, 0.1, 1.95);
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.y = 0.12;
    lawn.receiveShadow = true;
    group.add(lawn);

    // 2. 미니어처 타이쿤 건물 본체
    const bHeight = 1.2;
    const bodyGeo = new THREE.BoxGeometry(1.4, bHeight, 1.3);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      roughness: 0.6
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.15 + bHeight / 2, -0.1);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 문 & 미니 창문
    const doorGeo = new THREE.PlaneGeometry(0.38, 0.6);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.15 + 0.3, 0.56);
    group.add(door);

    // 3. 타이쿤 캐노피 / 기와 지붕
    const roofGeo = new THREE.ConeGeometry(1.25, 0.75, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.4
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 0.15 + bHeight + 0.35, -0.1);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // 4. 🌟 업로드 자료 실제 사진 썸네일 대형 간판 (Billboard Sign)
    const frameGeo = new THREE.BoxGeometry(1.35, 1.0, 0.08);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.2 });
    const signFrame = new THREE.Mesh(frameGeo, frameMat);
    signFrame.position.set(0, 0.15 + bHeight + 1.05, 0.2);
    signFrame.rotation.x = -0.15;
    group.add(signFrame);

    // 지지대 봉 2개
    [-0.42, 0.42].forEach(posX => {
      const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(posX, 0.15 + bHeight + 0.4, 0.12);
      group.add(pole);
    });

    // 썸네일 캔버스/텍스처 면
    const photoGeo = new THREE.PlaneGeometry(1.25, 0.9);
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const photoMesh = new THREE.Mesh(photoGeo, photoMat);
    photoMesh.position.set(0, 0, 0.045);
    signFrame.add(photoMesh);

    // 실제 이미지 로드 & 텍스처 맵핑
    if (data.imageUrl && data.imageUrl.length > 5) {
      new THREE.TextureLoader().load(
        data.imageUrl,
        (tex) => {
          tex.generateMipmaps = true;
          photoMat.map = tex;
          photoMat.needsUpdate = true;
        },
        undefined,
        () => {
          photoMat.map = this.createTitleCanvasTexture(data.name || data.title || '자료', col.getHexString());
          photoMat.needsUpdate = true;
        }
      );
    } else {
      photoMat.map = this.createTitleCanvasTexture(data.name || data.title || '자료', col.getHexString());
    }

    // 5. 테마파크 미니 데코: 가로등 & 꼬마 나무
    const lampPoleGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.8, 8);
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const lampPole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
    lampPole.position.set(0.75, 0.4, 0.75);
    group.add(lampPole);

    const lampBulbGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.9
    });
    const lampBulb = new THREE.Mesh(lampBulbGeo, lampBulbMat);
    lampBulb.position.set(0.75, 0.8, 0.75);
    group.add(lampBulb);

    // 좌측 뒤 미니 나무
    const trunkGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.35, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(-0.75, 0.25, -0.75);
    group.add(trunk);

    const foliageGeo = new THREE.ConeGeometry(0.38, 0.75, 6);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.set(-0.75, 0.65, -0.75);
    group.add(foliage);

    // 메쉬 유저데이터에 건물 데이터 보관 (클릭 감지용)
    group.userData = { type: 'building', data: data };
    group.traverse(c => { c.userData = group.userData; });

    return group;
  },

  createTitleCanvasTexture(titleText, hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 256, 192);
    grad.addColorStop(0, `#${hexColor}`);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 192);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 184);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🏛️', 128, 70);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(titleText.substring(0, 8), 128, 120);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('CLICK TO VIEW', 128, 155);

    return new THREE.CanvasTexture(canvas);
  },

  /**
   * 🌟 [검은 네모 버그 완전 해결] Canvas 기반 원형 마스코트 핀/뱃지 시스템
   * WebGL 알파 채널 오류를 원천 차단하고 통통 튀는 사랑스러운 핀 형태로 렌더링
   */
  createCharacterSprite(cData) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const renderBadge = (img) => {
      ctx.clearRect(0, 0, 256, 256);

      // 1. 은은한 그림자 & 광륜
      ctx.save();
      ctx.beginPath();
      ctx.arc(128, 114, 92, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fill();
      ctx.restore();

      // 2. 화이트 원형 뱃지 베이스
      ctx.beginPath();
      ctx.arc(128, 114, 88, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 3. 네온 테두리 링
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      // 4. 하단 핀 침 (Map Pin Tip)
      ctx.beginPath();
      ctx.moveTo(114, 198);
      ctx.lineTo(142, 198);
      ctx.lineTo(128, 234);
      ctx.closePath();
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // 5. 캐릭터 이미지 클리핑 렌더링
      ctx.save();
      ctx.beginPath();
      ctx.arc(128, 114, 80, 0, Math.PI * 2);
      ctx.clip();

      if (img && img.width > 0) {
        ctx.drawImage(img, 128 - 72, 114 - 72, 144, 144);
      } else {
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(0, 0, 256, 256);
        ctx.font = '68px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const emo = cData.name?.includes('토끼') ? '🐰' : cData.name?.includes('용') ? '🐉' : '🐥';
        ctx.fillText(emo, 128, 116);
      }
      ctx.restore();
    };

    // 1차 즉시 렌더링 (로딩 대기 없이 안전하게 표시)
    renderBadge(null);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;

    // 이미지 로드 시 2차 갱신 (실패 시에도 이모지 뱃지 유지로 절대 검은 사각형이 되지 않음)
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
    const scale = (cData.scale || 1.4) * 1.5;
    sprite.scale.set(scale, scale, 1);

    const pos = this.latLonToVector3(cData.lat, cData.lon, this.planetRadius + 0.85);
    sprite.position.copy(pos);

    sprite.userData = { type: 'character', data: cData };
    this.charactersGroup.add(sprite);

    this.characterObjects.push({
      data: cData,
      sprite: sprite,
      baseLat: cData.lat,
      baseLon: cData.lon,
      angle: Math.random() * Math.PI * 2
    });
  },

  setupOrbitInteractions() {
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.isUserInteracting = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      setTimeout(() => { this.isUserInteracting = false; }, 1500);
    });

    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

      if (!isDragging) return;

      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      // 🌟 [핵심] planetPivot을 회전하여 행성, 대륙, 건물, 캐릭터가 100% 한 몸으로 회전!
      if (this.planetPivot) {
        this.planetPivot.rotation.y += deltaX * 0.005;
        this.planetPivot.rotation.x += deltaY * 0.005;
      }

      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    // 모바일 터치 회전 드래그 인터랙션
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        isDragging = true;
        this.isUserInteracting = true;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
      setTimeout(() => { this.isUserInteracting = false; }, 1500);
    });

    this.container.addEventListener('touchmove', (e) => {
      if (!isDragging || !e.touches || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - prevMousePos.x;
      const deltaY = touch.clientY - prevMousePos.y;

      // 🌟 모바일에서도 planetPivot 동시 회전
      if (this.planetPivot) {
        this.planetPivot.rotation.y += deltaX * 0.007;
        this.planetPivot.rotation.x += deltaY * 0.007;
      }
      prevMousePos = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    // 줌 인/아웃 (마우스 휠)
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.04;
      const dist = this.camera.position.length();

      if (e.deltaY > 0 && dist < 50) {
        this.camera.position.multiplyScalar(1 + zoomSpeed);
      } else if (e.deltaY < 0 && dist > 14) {
        this.camera.position.multiplyScalar(1 - zoomSpeed);
      }
    }, { passive: false });

    // 건물/캐릭터 클릭 감지
    this.container.addEventListener('click', (e) => {
      if (this.animatingCamera) return;
      this.handleObjectClick();
    });
  },

  handleObjectClick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.planetPivot) return;

    const intersects = this.raycaster.intersectObjects(this.planetPivot.children, true);

    for (let i = 0; i < intersects.length; i++) {
      let target = intersects[i].object;
      while (target && !target.userData?.type && target.parent && target !== this.planetPivot) {
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
   * 🌟 [핵심 인터랙션] 건물 또는 캐릭터 클릭 시 홀로그램 카드 팝업 & 관리자 삭제 버튼 제어
   */
  openHologramCard(itemData, isCharacter = false) {
    this.currentSelectedItem = itemData;

    const card = document.getElementById('planet-hologram-card');
    if (!card) return;

    const iconEl = document.getElementById('holo-icon');
    const titleEl = document.getElementById('holo-title');
    const subEl = document.getElementById('holo-subtitle');
    const imgEl = document.getElementById('holo-img');
    const imgBox = document.getElementById('holo-img-box');
    const descEl = document.getElementById('holo-desc');
    const dlLink = document.getElementById('holo-download-link');
    const btnDelete = document.getElementById('btn-holo-delete');

    if (iconEl) iconEl.textContent = isCharacter ? '🎨' : '🏢';
    if (titleEl) titleEl.textContent = itemData.title || itemData.name || '보관 자료';
    if (subEl) {
      subEl.textContent = isCharacter
        ? `아이 그림 마스코트 · 작가: ${itemData.creator || '우리아이'}`
        : `타이쿤 디오라마 건물 · 테마: ${itemData.category || '기록'}`;
    }

    if (imgEl && imgBox) {
      if (itemData.imageUrl) {
        imgEl.src = itemData.imageUrl;
        imgBox.style.display = 'flex';
      } else {
        imgBox.style.display = 'none';
      }
    }

    if (descEl) {
      descEl.textContent = itemData.desc || itemData.speech || '보관된 상세 정보가 없습니다.';
    }

    if (dlLink) {
      if (itemData.imageUrl) {
        dlLink.href = itemData.imageUrl;
        dlLink.style.display = 'inline-flex';
      } else {
        dlLink.style.display = 'none';
      }
    }

    // 🌟 관리자 전용 [🗑️ 철거] 버튼 가시성 제어
    if (btnDelete) {
      if (this.isAdminUser()) {
        btnDelete.style.display = 'inline-flex';
        btnDelete.onclick = () => this.confirmDeleteItem(itemData);
      } else {
        btnDelete.style.display = 'none';
      }
    }

    card.style.display = 'block';

    // 카메라 부드러운 줌인 비행
    this.focusOnEntity(itemData);
  },

  /**
   * 🌟 관리자 전용: 자료/건물/캐릭터 영구 철거(삭제) 처리
   */
  async confirmDeleteItem(itemData) {
    if (!this.isAdminUser()) {
      alert('🔒 자료 삭제(철거)는 관리자만 가능합니다.');
      return;
    }

    const name = itemData.name || itemData.title || '해당 자료';
    const isChar = !!itemData.species;
    const typeName = isChar ? '캐릭터' : '건물/자료';
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
   * 특정 건물 또는 캐릭터로 카메라 부드러운 줌인 & 비행
   * 피벗의 현재 회전각을 실시간 반영하여 정확한 월드 위치로 비행
   */
  focusOnEntity(data) {
    if (typeof data.lat !== 'number' || typeof data.lon !== 'number') return;
    const localPos = this.latLonToVector3(data.lat, data.lon, this.planetRadius);
    
    // 피벗의 현재 회전을 적용한 월드 좌표 계산
    const worldPos = this.planetPivot ? localPos.clone().applyEuler(this.planetPivot.rotation) : localPos;
    const camTarget = worldPos.clone().normalize().multiplyScalar(19);

    this.animatingCamera = true;
    const startPos = this.camera.position.clone();
    let progress = 0;

    const animStep = () => {
      progress += 0.04;
      this.camera.position.lerpVectors(startPos, camTarget, Math.min(1, progress));
      this.camera.lookAt(0, 0, 0);

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

      clock += 0.02;

      // 행성 자전 (전체 피벗 회전)
      if (this.planetPivot && !this.animatingCamera && !this.isUserInteracting) {
        this.planetPivot.rotation.y += 0.0006;
      }

      // 몽실몽실 구름 궤도 순환 비행
      if (this.cloudsGroup) {
        this.cloudsGroup.rotation.y += 0.0012;
      }

      // 우주 별빛 반짝임
      if (this.starsMesh) {
        this.starsMesh.rotation.y += 0.0002;
      }

      // 캐릭터 통통 튀는 바운스 & 산책 애니메이션 (planetPivot 로컬 좌표계 내)
      this.characterObjects.forEach(obj => {
        obj.angle += obj.data.speed || 0.006;
        const bounce = Math.abs(Math.sin(clock * 3)) * 0.45;
        const currentLat = obj.baseLat + Math.sin(obj.angle) * 2.2;
        const currentLon = obj.baseLon + Math.cos(obj.angle) * 2.8;

        const p = this.latLonToVector3(currentLat, currentLon, this.planetRadius + 0.85 + bounce);
        obj.sprite.position.copy(p);
      });

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

    const openModal = () => {
      if (!this.isAdminUser()) {
        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast('🔒 자료 및 아이 그림 업로드는 관리자만 가능합니다.');
        } else {
          alert('🔒 자료 및 아이 그림 업로드는 최고 관리자만 가능합니다.');
        }
        return;
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
      btnResetView.addEventListener('click', () => {
        if (this.planetPivot) {
          this.planetPivot.rotation.set(0, 0, 0);
        }
        const defaultPos = new THREE.Vector3(0, 4, 28);
        this.animatingCamera = true;
        const startPos = this.camera.position.clone();
        let progress = 0;
        const step = () => {
          progress += 0.05;
          this.camera.position.lerpVectors(startPos, defaultPos, progress);
          this.camera.lookAt(0, 0, 0);
          if (progress < 1) requestAnimationFrame(step);
          else this.animatingCamera = false;
        };
        step();
      });
    }
  },

  updateHUDCounts(buildingCount, charCount) {
    const elTotal = document.getElementById('planet-stat-total');
    if (elTotal) elTotal.textContent = `${buildingCount + charCount}`;
  }
};
