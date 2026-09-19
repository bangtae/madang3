// app/views/planetWorldView.js - Three.js 3D 행성 심시티 월드 & 캐릭터 시각화 뷰

window.PlanetWorldView = {
  container: null,
  scene: null,
  camera: null,
  renderer: null,
  planetMesh: null,
  atmosphereMesh: null,
  starsMesh: null,
  raycaster: null,
  mouse: null,

  buildingObjects: [], // 3D 건물 메쉬 배열
  characterObjects: [], // 3D 캐릭터 스프라이트 배열
  animatingCamera: false,
  targetCameraPos: null,
  targetLookAt: null,

  isInitialized: false,
  isRunning: false,
  planetRadius: 12,

  init() {
    this.container = document.getElementById('planet-canvas-container') || document.getElementById('planet-viewport');

    // 1. DOM 이벤트 (모달 열기/닫기, 업로드, 검색)는 캔버스 로딩 여부와 무관하게 즉시 바인딩
    this.bindDOMEvents();

    // 2. 월드 데이터 및 통계 HUD 로드
    this.refreshWorld();

    if (!this.container) {
      console.warn('[PlanetWorldView] planet-canvas-container not found in DOM');
      return;
    }

    // 3. Three.js가 로드되어 있는지 확인
    if (typeof THREE === 'undefined') {
      console.warn('[PlanetWorldView] Three.js not loaded yet. Waiting for script...');
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
    this.scene.background = new THREE.Color(0x050814); // 깊은 우주 배경색

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 8, 36);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sunLight.position.set(40, 30, 40);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 0.8, 100);
    pointLight.position.set(-30, -20, -30);
    this.scene.add(pointLight);

    // 5. 우주 별빛 파티클
    this.createSpaceStars();

    // 6. 행성 구체 (Earth-like Little Planet)
    this.createLittlePlanet();

    // 7. Raycaster & Mouse
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 8. 윈도우 리사이즈
    window.addEventListener('resize', () => this.onWindowResize());

    // 9. 인터랙티브 드래그 회전 & 휠 줌 컨트롤
    this.setupOrbitInteractions();
  },

  createSpaceStars() {
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    const starColors = [];

    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 400;
      const y = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      starPos.push(x, y, z);

      const col = Math.random() > 0.3 ? [0.8, 0.9, 1.0] : [1.0, 0.9, 0.6];
      starColors.push(...col);
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.2,
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

    // 바다 메쉬
    const seaGeo = new THREE.SphereGeometry(radius, 64, 64);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // 청량한 지구 바다
      roughness: 0.3,
      metalness: 0.2
    });
    this.planetMesh = new THREE.Mesh(seaGeo, seaMat);
    this.planetMesh.receiveShadow = true;
    this.scene.add(this.planetMesh);

    // 대륙 & 섬 (초록빛 랜드 마크 블록들)
    this.createProceduralContinents(radius);

    // 대기권 (Atmosphere Glow)
    const atmosGeo = new THREE.SphereGeometry(radius * 1.12, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    this.atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    this.scene.add(this.atmosphereMesh);
  },

  createProceduralContinents(radius) {
    const landGroup = new THREE.Group();
    const continents = [
      { lat: 25, lon: 40, size: 4.5, color: 0x15803d },
      { lat: 45, lon: -50, size: 5.0, color: 0x166534 },
      { lat: -20, lon: 70, size: 4.0, color: 0x15803d },
      { lat: -30, lon: -40, size: 4.8, color: 0x166534 },
      { lat: 10, lon: 130, size: 3.5, color: 0x22c55e },
      { lat: -65, lon: 20, size: 3.8, color: 0xe2e8f0 } // 남극 빙하
    ];

    continents.forEach(c => {
      const pos = this.latLonToVector3(c.lat, c.lon, radius * 0.98);
      const patchGeo = new THREE.SphereGeometry(c.size, 16, 16);
      const patchMat = new THREE.MeshStandardMaterial({
        color: c.color,
        roughness: 0.8
      });
      const patch = new THREE.Mesh(patchGeo, patchMat);
      patch.position.copy(pos);
      landGroup.add(patch);
    });

    this.planetMesh.add(landGroup);
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
    await model.loadWorld();

    const buildings = model.getBuildings();
    const characters = model.getCharacters();

    // 1. 기존 건물 제거
    this.buildingObjects.forEach(obj => this.scene.remove(obj.mesh));
    this.buildingObjects = [];

    // 2. 기존 캐릭터 제거
    this.characterObjects.forEach(obj => this.scene.remove(obj.sprite));
    this.characterObjects = [];

    // 3. 건물 생성 & 배치
    buildings.forEach(bData => {
      const buildingMesh = this.createBuildingMesh(bData);
      const pos = this.latLonToVector3(bData.lat, bData.lon, this.planetRadius);
      buildingMesh.position.copy(pos);

      // 행성 중심을 향해 건물이 솟아오르도록 회전 정렬
      const normal = pos.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
      buildingMesh.quaternion.copy(quaternion);

      this.scene.add(buildingMesh);
      this.buildingObjects.push({ data: bData, mesh: buildingMesh });
    });

    // 4. 아이 캐릭터 스프라이트 생성 & 배치
    characters.forEach(cData => {
      this.createCharacterSprite(cData);
    });

    // 5. 카운터 HUD 업데이트
    this.updateHUDCounts(buildings.length, characters.length);
  },

  createBuildingMesh(data) {
    const group = new THREE.Group();
    const col = new THREE.Color(data.color || '#f97316');

    // 1. [디오라마 베이스 타일] 잔디 타일 & 보도블록 테두리
    const tileBaseGeo = new THREE.BoxGeometry(2.6, 0.15, 2.6);
    const tileBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 }); // 보도블록
    const tileBase = new THREE.Mesh(tileBaseGeo, tileBaseMat);
    tileBase.position.y = 0.08;
    tileBase.receiveShadow = true;
    group.add(tileBase);

    const lawnGeo = new THREE.BoxGeometry(2.4, 0.12, 2.4);
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 }); // 푸른 잔디
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.y = 0.16;
    lawn.receiveShadow = true;
    group.add(lawn);

    // 2. [미니어처 타이쿤 건물 본체]
    const bHeight = 1.4;
    const bodyGeo = new THREE.BoxGeometry(1.7, bHeight, 1.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5, // 따뜻한 크림 베이지
      roughness: 0.6
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.2 + bHeight / 2, -0.15);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 문 & 미니 창문
    const doorGeo = new THREE.PlaneGeometry(0.45, 0.7);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 0.2 + 0.35, 0.61);
    group.add(door);

    // 3. [아기자기한 타이쿤 캐노피 / 기와 지붕]
    const roofGeo = new THREE.ConeGeometry(1.45, 0.9, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.4
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 0.2 + bHeight + 0.4, -0.15);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // 4. 🌟 [핵심: 업로드 자료 실제 사진 썸네일 대형 간판 (Billboard Sign)]
    const frameGeo = new THREE.BoxGeometry(1.6, 1.2, 0.08);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.2 });
    const signFrame = new THREE.Mesh(frameGeo, frameMat);
    signFrame.position.set(0, 0.2 + bHeight + 1.25, 0.25);
    signFrame.rotation.x = -0.15; // 살짝 위를 향해 보기 편하게 틸트
    group.add(signFrame);

    // 지지대 봉 2개
    [-0.5, 0.5].forEach(posX => {
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(posX, 0.2 + bHeight + 0.5, 0.15);
      group.add(pole);
    });

    // 썸네일 캔버스/텍스처 면
    const photoGeo = new THREE.PlaneGeometry(1.48, 1.08);
    const photoMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const photoMesh = new THREE.Mesh(photoGeo, photoMat);
    photoMesh.position.set(0, 0, 0.045);
    signFrame.add(photoMesh);

    // 업로드된 실제 이미지 로드 & 텍스처 맵핑
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
          // 실패 시 다이내믹 캔버스 텍스처로 폴백
          photoMat.map = this.createTitleCanvasTexture(data.name || data.title || '자료', col.getHexString());
          photoMat.needsUpdate = true;
        }
      );
    } else {
      photoMat.map = this.createTitleCanvasTexture(data.name || data.title || '자료', col.getHexString());
    }

    // 5. [테마파크 미니 데코: 가로등 & 꼬마 나무]
    // 우측 앞 미니 가로등
    const lampPoleGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.9, 8);
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const lampPole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
    lampPole.position.set(0.9, 0.45, 0.9);
    group.add(lampPole);

    const lampBulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.9
    });
    const lampBulb = new THREE.Mesh(lampBulbGeo, lampBulbMat);
    lampBulb.position.set(0.9, 0.9, 0.9);
    group.add(lampBulb);

    // 좌측 뒤 미니 나무
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(-0.9, 0.3, -0.9);
    group.add(trunk);

    const foliageGeo = new THREE.ConeGeometry(0.45, 0.9, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.set(-0.9, 0.75, -0.9);
    group.add(foliage);

    // 메쉬 유저데이터에 건물 데이터 보관 (클릭 감지용)
    group.userData = { type: 'building', data: data };
    group.traverse(c => { c.userData = group.userData; });

    return group;
  },

  /**
   * 사진이 없을 때 아기자기한 타이쿤 간판용 CanvasTexture 생성기
   */
  createTitleCanvasTexture(titleText, hexColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');

    // 그라데이션 배경
    const grad = ctx.createLinearGradient(0, 0, 256, 192);
    grad.addColorStop(0, `#${hexColor}`);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 192);

    // 네온 테두리
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 184);

    // 아이콘 & 텍스트
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('🏛️', 128, 70);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(titleText.substring(0, 8), 128, 120);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('CLICK TO VIEW', 128, 155);

    return new THREE.CanvasTexture(canvas);
  },

  createCharacterSprite(cData) {
    const imgUrl = cData.imageUrl || '';
    const loader = new THREE.TextureLoader();

    loader.load(imgUrl, (texture) => {
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true
      });
      const sprite = new THREE.Sprite(mat);
      const scale = cData.scale || 1.4;
      sprite.scale.set(scale * 1.5, scale * 1.5, 1);

      const pos = this.latLonToVector3(cData.lat, cData.lon, this.planetRadius + 0.8);
      sprite.position.copy(pos);

      sprite.userData = { type: 'character', data: cData };
      this.scene.add(sprite);

      this.characterObjects.push({
        data: cData,
        sprite: sprite,
        baseLat: cData.lat,
        baseLon: cData.lon,
        angle: Math.random() * Math.PI * 2
      });
    });
  },

  setupOrbitInteractions() {
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;

      if (!isDragging) return;

      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      if (this.planetMesh) {
        this.planetMesh.rotation.y += deltaX * 0.005;
        this.planetMesh.rotation.x += deltaY * 0.005;
      }

      prevMousePos = { x: e.clientX, y: e.clientY };
    });

    // 모바일 터치 회전 드래그 인터랙션
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        isDragging = true;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    this.container.addEventListener('touchmove', (e) => {
      if (!isDragging || !e.touches || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - prevMousePos.x;
      const deltaY = touch.clientY - prevMousePos.y;

      if (this.planetMesh) {
        this.planetMesh.rotation.y += deltaX * 0.007;
        this.planetMesh.rotation.x += deltaY * 0.007;
      }
      prevMousePos = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    // 줌 인/아웃 (마우스 휠)
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.04;
      const dist = this.camera.position.length();

      if (e.deltaY > 0 && dist < 65) {
        this.camera.position.multiplyScalar(1 + zoomSpeed);
      } else if (e.deltaY < 0 && dist > 18) {
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
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (let i = 0; i < intersects.length; i++) {
      const hit = intersects[i].object;
      const uData = hit.userData;

      if (uData && uData.type === 'character') {
        this.showCharacterSpeech(uData.data, intersects[i].point);
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

    bubble.querySelector('.bubble-char-name').textContent = `🐰 ${charData.name}`;
    bubble.querySelector('.bubble-char-text').textContent = charData.speech || '안녕! 함께 멋진 세상을 만들자!';
    bubble.classList.remove('hidden');

    // 3D 위치를 2D 화면 좌표로 투영
    const screenPos = point3D.clone().project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const x = (screenPos.x * 0.5 + 0.5) * rect.width;
    const y = (-screenPos.y * 0.5 + 0.5) * rect.height;

    bubble.style.left = `${Math.max(20, Math.min(rect.width - 250, x))}px`;
    bubble.style.top = `${Math.max(20, y - 90)}px`;

    clearTimeout(this.speechTimeout);
    this.speechTimeout = setTimeout(() => {
      bubble.classList.add('hidden');
    }, 4500);
  },

  showBuildingDetail(bData) {
    this.openHologramCard(bData, false);
  },

  /**
   * 🌟 [핵심 인터랙션] 건물 또는 캐릭터 클릭 시 홀로그램 카드 팝업 & 카메라 줌인 비행
   */
  openHologramCard(itemData, isCharacter = false) {
    const card = document.getElementById('planet-hologram-card');
    if (!card) return;

    const iconEl = document.getElementById('holo-icon');
    const titleEl = document.getElementById('holo-title');
    const subEl = document.getElementById('holo-subtitle');
    const imgEl = document.getElementById('holo-img');
    const imgBox = document.getElementById('holo-img-box');
    const descEl = document.getElementById('holo-desc');
    const dlLink = document.getElementById('holo-download-link');

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

    card.style.display = 'block';

    // 카메라 부드러운 줌인 비행
    this.focusOnEntity(itemData);
  },

  /**
   * 특정 건물 또는 캐릭터로 카메라 부드러운 줌인 & 비행
   */
  focusOnEntity(data) {
    if (typeof data.lat !== 'number' || typeof data.lon !== 'number') return;
    const pos = this.latLonToVector3(data.lat, data.lon, this.planetRadius);
    const camTarget = pos.clone().normalize().multiplyScalar(26);

    this.animatingCamera = true;
    const startPos = this.camera.position.clone();
    let progress = 0;

    const animStep = () => {
      progress += 0.04;
      this.camera.position.lerpVectors(startPos, camTarget, progress);
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

      // 행성 자전 (은은하게 서서히 회전)
      if (this.planetMesh && !this.animatingCamera) {
        this.planetMesh.rotation.y += 0.0006;
      }

      // 우주 별빛 반짝임
      if (this.starsMesh) {
        this.starsMesh.rotation.y += 0.0002;
      }

      // 캐릭터 통통 튀는 바운스 & 산책 애니메이션
      this.characterObjects.forEach(obj => {
        obj.angle += obj.data.speed || 0.007;
        const bounce = Math.abs(Math.sin(clock * 3)) * 0.6;
        const currentLat = obj.baseLat + Math.sin(obj.angle) * 3;
        const currentLon = obj.baseLon + Math.cos(obj.angle) * 4;

        const p = this.latLonToVector3(currentLat, currentLon, this.planetRadius + 0.9 + bounce);
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

            // 이미지인 경우 자동 배경 투명화 처리
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

        // 폼 초기화
        if (formUpload) formUpload.reset();
        if (previewBox) previewBox.style.display = 'none';
        this.processedImageBase64 = '';
        this.originalRawBase64 = '';

        if (window.UiView && window.UiView.showToast) {
          window.UiView.showToast(`✨ '${name}'(이)가 행성에 성공적으로 배치되었습니다!`);
        } else {
          alert(`✨ '${name}'(이)가 행성에 성공적으로 배치되었습니다!`);
        }

        // 방금 생성된 건물로 카메라 포커싱 & 홀로그램 카드 오픈
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
    const closeHolo = () => { if (holoCard) holoCard.style.display = 'none'; };

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
          searchInput.style.width = '180px';
          searchInput.style.opacity = '1';
          searchInput.style.padding = '6px 12px';
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
        const defaultPos = new THREE.Vector3(0, 8, 36);
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
