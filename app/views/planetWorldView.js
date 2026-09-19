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
    this.container = document.getElementById('planet-viewport');
    if (!this.container) return;

    this.bindDOMEvents();

    // Three.js가 로드되어 있는지 확인
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
    this.refreshWorld();
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
    const height = data.height || 3.0;
    const col = new THREE.Color(data.color || '#f97316');

    if (data.type === 'lighthouse') {
      // 등대
      const towerGeo = new THREE.CylinderGeometry(0.5, 0.9, height, 16);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = height / 2;
      group.add(tower);

      const topGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.8, 16);
      const topMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.3 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = height + 0.4;
      group.add(top);
    } else if (data.type === 'observatory') {
      // 천문대 & 연구소
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.3, height * 0.7, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = (height * 0.7) / 2;
      group.add(base);

      const domeGeo = new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.4, roughness: 0.3 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = height * 0.7;
      group.add(dome);
    } else if (data.type === 'bank_tower') {
      // 금융 타워 / 마천루
      const towerGeo = new THREE.BoxGeometry(1.4, height, 1.4);
      const towerMat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.6, roughness: 0.2 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = height / 2;
      group.add(tower);

      const spireGeo = new THREE.ConeGeometry(0.4, 1.2, 8);
      const spireMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = height + 0.6;
      group.add(spire);
    } else {
      // 아늑한 우리집 (cozy_house 기본형)
      const bodyGeo = new THREE.BoxGeometry(1.6, height * 0.6, 1.6);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = (height * 0.6) / 2;
      group.add(body);

      const roofGeo = new THREE.ConeGeometry(1.4, height * 0.5, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = height * 0.6 + (height * 0.5) / 2;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
    }

    // 메쉬 유저데이터에 건물 데이터 보관 (클릭 감지용)
    group.userData = { type: 'building', data: data };
    group.children.forEach(c => { c.userData = group.userData; });

    return group;
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
    const modal = document.getElementById('planet-detail-modal');
    if (!modal) return;

    document.getElementById('planet-modal-title').textContent = bData.title || bData.name;
    document.getElementById('planet-modal-category').textContent = `구역: ${bData.category || '심시티 타운'}`;
    document.getElementById('planet-modal-desc').textContent = bData.desc || '보관된 상세 정보가 없습니다.';
    document.getElementById('planet-modal-date').textContent = `건축일자: ${bData.createdAt || ''}`;

    const tagsContainer = document.getElementById('planet-modal-tags');
    if (tagsContainer) {
      tagsContainer.innerHTML = (bData.tags || []).map(t => `<span class="planet-badge">#${t}</span>`).join('');
    }

    const imgEl = document.getElementById('planet-modal-image');
    if (imgEl) {
      if (bData.imageUrl) {
        imgEl.src = bData.imageUrl;
        imgEl.style.display = 'block';
      } else {
        imgEl.style.display = 'none';
      }
    }

    modal.classList.remove('hidden');
  },

  /**
   * 특정 건물로 카메라 자동 줌인 & 회전 포커싱
   */
  focusOnBuilding(bData) {
    const pos = this.latLonToVector3(bData.lat, bData.lon, this.planetRadius);
    const camTarget = pos.clone().normalize().multiplyScalar(28);

    this.animatingCamera = true;
    const startPos = this.camera.position.clone();
    let progress = 0;

    const animStep = () => {
      progress += 0.035;
      this.camera.position.lerpVectors(startPos, camTarget, progress);
      this.camera.lookAt(0, 0, 0);

      if (progress < 1) {
        requestAnimationFrame(animStep);
      } else {
        this.animatingCamera = false;
        this.showBuildingDetail(bData);
      }
    };
    animStep();
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
        this.planetMesh.rotation.y += 0.0008;
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

        // 방금 생성된 건물로 카메라 포커싱
        if (payload.id) {
          this.focusOnEntity(payload.id);
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

    // 5. 검색바 입력 & 포커싱
    const searchInput = document.getElementById('planet-search-input');
    const searchBtn = document.getElementById('btn-planet-search');
    const searchResultsDropdown = document.getElementById('planet-search-results');

    const doSearch = async () => {
      const q = searchInput.value.trim();
      const res = await window.PlanetWorldModel.searchItems(q);

      if (searchResultsDropdown) {
        if (!q || res.total === 0) {
          searchResultsDropdown.classList.add('hidden');
          return;
        }
        searchResultsDropdown.classList.remove('hidden');
        searchResultsDropdown.innerHTML = `
          ${res.buildings.map(b => `
            <div class="planet-search-item" data-id="${b.id}" data-type="building">
              <span class="badge-icon">🏢</span>
              <div class="item-text">
                <div class="item-title">${b.title || b.name}</div>
                <div class="item-sub">${b.desc || ''}</div>
              </div>
            </div>
          `).join('')}
          ${res.characters.map(c => `
            <div class="planet-search-item" data-id="${c.id}" data-type="character">
              <span class="badge-icon">🐰</span>
              <div class="item-text">
                <div class="item-title">${c.name}</div>
                <div class="item-sub">${c.speech || ''}</div>
              </div>
            </div>
          `).join('')}
        `;

        searchResultsDropdown.querySelectorAll('.planet-search-item').forEach(el => {
          el.addEventListener('click', () => {
            const id = el.getAttribute('data-id');
            const targetBuilding = res.buildings.find(b => b.id === id);
            if (targetBuilding) {
              this.focusOnBuilding(targetBuilding);
            }
            searchResultsDropdown.classList.add('hidden');
          });
        });
      }
    };

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', doSearch);
      searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
      searchInput.addEventListener('input', () => { if (searchInput.value.length > 1) doSearch(); });
    }

    // 6. 상세 모달 닫기
    const detailModal = document.getElementById('planet-detail-modal');
    const btnCloseDetail = document.getElementById('btn-planet-detail-close');
    if (btnCloseDetail && detailModal) {
      btnCloseDetail.addEventListener('click', () => detailModal.classList.add('hidden'));
    }
  },

  handleSelectedFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalRawBase64 = e.target.result;
      const chkRemoveBg = document.getElementById('planet-chk-remove-bg');
      this.applyBackgroundFilter(this.originalRawBase64, chkRemoveBg ? chkRemoveBg.checked : true);
    };
    reader.readAsDataURL(file);
  },

  applyBackgroundFilter(rawBase64, doRemoveBg) {
    const previewContainer = document.getElementById('planet-preview-container');
    const previewImg = document.getElementById('planet-preview-img');

    if (!doRemoveBg) {
      this.processedImageBase64 = rawBase64;
      if (previewImg) previewImg.src = rawBase64;
      if (previewContainer) previewContainer.classList.remove('hidden');
      return;
    }

    const tempImg = new Image();
    tempImg.onload = () => {
      const transparentDataUrl = window.PlanetWorldModel.processTransparentBackground(tempImg, 45);
      this.processedImageBase64 = transparentDataUrl;
      if (previewImg) previewImg.src = transparentDataUrl;
      if (previewContainer) previewContainer.classList.remove('hidden');
    };
    tempImg.src = rawBase64;
  },

  updateHUDCounts(buildingCount, charCount) {
    const elB = document.getElementById('planet-hud-building-count');
    const elC = document.getElementById('planet-hud-char-count');
    if (elB) elB.textContent = `${buildingCount}개 건축`;
    if (elC) elC.textContent = `${charCount}명 캐릭터`;
  }
};
