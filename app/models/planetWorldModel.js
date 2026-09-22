// app/models/planetWorldModel.js - 3D 행성 월드 및 자료 아카이브 데이터 모델

window.PlanetWorldModel = {
  STORAGE_KEY: 'portal_planet_world_cache',
  TOMBSTONE_KEY: 'portal_planet_deleted_ids',
  data: null,
  isAnalyzing: false,

  getDeletedIds() {
    try {
      const raw = localStorage.getItem(this.TOMBSTONE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  addDeletedId(id) {
    if (!id) return;
    const ids = this.getDeletedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(this.TOMBSTONE_KEY, JSON.stringify(ids));
    }
  },

  removeDeletedId(id) {
    const ids = this.getDeletedIds().filter(x => x !== id);
    localStorage.setItem(this.TOMBSTONE_KEY, JSON.stringify(ids));
  },

  applyTombstoneFilter(dataObj) {
    if (!dataObj) return dataObj;
    const deletedIds = this.getDeletedIds();
    if (deletedIds.length === 0) return dataObj;

    if (Array.isArray(dataObj.buildings)) {
      dataObj.buildings = dataObj.buildings.filter(b => !deletedIds.includes(b.id));
    }
    if (Array.isArray(dataObj.characters)) {
      dataObj.characters = dataObj.characters.filter(c => !deletedIds.includes(c.id));
    }
    return dataObj;
  },

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/planet/world', './data/planet_world.json'];
    }
    return [
      'http://localhost:8080/api/planet/world',
      'http://192.168.219.115:8080/api/planet/world',
      './data/planet_world.json'
    ];
  },

  async init() {
    await this.loadWorld();
  },

  normalizeWorldData(dataObj) {
    if (!dataObj) return dataObj;
    if (!Array.isArray(dataObj.buildings)) dataObj.buildings = [];
    if (!Array.isArray(dataObj.characters)) dataObj.characters = [];
    if (!Array.isArray(dataObj.landmarks)) dataObj.landmarks = [];
    if (!Array.isArray(dataObj.nature)) dataObj.nature = [];

    if (!dataObj.cityStats) {
      dataObj.cityStats = {
        cityName: "메트로폴리스 노바",
        population: 12850,
        totalFloors: 8,
        cityLevel: "Level 2: 첨단 복합 도시"
      };
    }

    let calcTotalFloors = 0;
    dataObj.buildings.forEach((b, bIdx) => {
      if (!Array.isArray(b.floors) || b.floors.length === 0) {
        b.floors = [
          {
            floor: 1,
            id: `rec-${b.id || bIdx}-1`,
            title: b.title || b.name || '기초 기록',
            desc: b.desc || '보관된 기록입니다.',
            imageUrl: b.imageUrl || '',
            tags: Array.isArray(b.tags) ? b.tags : [b.category || '기록'],
            createdAt: b.createdAt || '2026-09-18'
          }
        ];
      }
      b.tier = b.floors.length >= 5 ? 3 : (b.floors.length >= 3 ? 2 : 1);
      b.height = Math.min(6.5, 2.2 + b.floors.length * 0.7);
      calcTotalFloors += b.floors.length;
    });

    dataObj.cityStats.totalFloors = Math.max(dataObj.cityStats.totalFloors || 0, calcTotalFloors);
    return dataObj;
  },

  async loadWorld(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        try {
          this.data = this.normalizeWorldData(this.applyTombstoneFilter(JSON.parse(cached)));
        } catch (e) {}
      }
    }

    const urls = this.getApiUrls();
    for (const url of urls) {
      try {
        const res = await fetch(url + (forceRefresh ? `?t=${Date.now()}` : ''), { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && (json.buildings || json.characters || json.landmarks)) {
            this.data = this.normalizeWorldData(this.applyTombstoneFilter(json));
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
            return this.data;
          }
        }
      } catch (err) {
        // try next
      }
    }

    if (!this.data) {
      this.data = this.normalizeWorldData(this.getDefaultFallbackData());
    }
    return this.data;
  },

  getBuildings() {
    return this.data?.buildings || [];
  },

  getCharacters() {
    return this.data?.characters || [];
  },

  getLandmarks() {
    return this.data?.landmarks || [];
  },

  getNature() {
    return this.data?.nature || [];
  },

  getCityStats() {
    return this.data?.cityStats || {
      cityName: "메트로폴리스 노바",
      population: 12850,
      totalFloors: 8,
      cityLevel: "Level 2: 첨단 복합 도시"
    };
  },

  getPlanetConfig() {
    return this.data?.planetConfig || {
      name: "아이와 함께 만드는 행성 지구",
      radius: 8.5,
      seaColor: "#0284c7",
      landColor: "#15803d",
      atmosphereColor: "#38bdf8"
    };
  },

  /**
   * 클라이언트 Canvas 기반 자동 배경 투명화(누끼 추출) 알고리즘 (모바일 고화질 최적화)
   * 아이가 스케치북/종이에 그린 그림에서 흰색/연회색 종이 배경을 투명하게 변환
   */
  async processTransparentBackground(imgSource, tolerance = 40) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // 모바일 고화질(12MP~50MP) 사진 메모리 절약을 위한 스마트 리사이징 (최대 800px)
          const maxDim = 800;
          let width = img.naturalWidth || img.width || 300;
          let height = img.naturalHeight || img.height || 300;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          // 모서리 4개 샘플링하여 배경 기준색 산출
          const cornerR = (d[0] + d[(width - 1) * 4] + d[(height - 1) * width * 4]) / 3;
          const cornerG = (d[1] + d[(width - 1) * 4 + 1] + d[(height - 1) * width * 4 + 1]) / 3;
          const cornerB = (d[2] + d[(width - 1) * 4 + 2] + d[(height - 1) * width * 4 + 2]) / 3;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];

            // 밝은 흰색/아이보리 종이 또는 모서리 기준색과 유사한 픽셀 투명화
            const isWhitePaper = (r > 215 && g > 215 && b > 215);
            const isNearCorner = (Math.abs(r - cornerR) < tolerance && Math.abs(g - cornerG) < tolerance && Math.abs(b - cornerB) < tolerance);

            if (isWhitePaper || isNearCorner) {
              d[i + 3] = 0;
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          console.warn('[PlanetWorldModel] processTransparentBackground canvas error:', e);
          resolve(typeof imgSource === 'string' ? imgSource : img.src);
        }
      };

      img.onerror = () => {
        resolve(typeof imgSource === 'string' ? imgSource : '');
      };

      if (typeof imgSource === 'string') {
        img.src = imgSource;
      } else if (imgSource && imgSource.src) {
        img.src = imgSource.src;
      } else {
        resolve('');
      }
    });
  },

  /**
   * Gemini 멀티모달 분석을 모사/연동하여 업로드된 자료를 분석
   * '아이 그림 캐릭터' vs '일반 심시티 건물' 자동 판별 및 메타데이터 도출
   */
  async analyzeMaterialWithLLM(fileOrBase64, userNote = '', forceType = 'auto') {
    this.isAnalyzing = true;
    try {
      // 1. 백엔드 Gemini AI 스마트 시티 디렉터 API 우선 시도
      try {
        const res = await fetch('/api/planet/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: userNote,
            forceType: forceType,
            hasImage: !!fileOrBase64
          })
        });
        if (res.ok) {
          const aiResult = await res.json();
          if (aiResult && aiResult.success && aiResult.data) {
            this.isAnalyzing = false;
            return aiResult.data;
          }
        }
      } catch (e) {
        console.warn('[PlanetWorldModel] Gemini API call skipped, using local smart director rule engine:', e.message);
      }

      // 2. 스마트 시티 디렉터 로컬 규칙 엔진 (오프라인 / 빠른 응답 폴백)
      const noteLower = (userNote || '').toLowerCase();
      const isDrawingHint = noteLower.includes('그림') || noteLower.includes('아이') ||
                            noteLower.includes('캐릭터') || noteLower.includes('괴물') ||
                            noteLower.includes('토끼') || noteLower.includes('공룡') ||
                            noteLower.includes('사람') || forceType === 'character';

      if (isDrawingHint || forceType === 'character') {
        const names = ['우주토끼 피포', '초록용 드라코', '아기별 삐약이', '무지개 고양이', '황금 햄찌'];
        const speeches = [
          '내가 만든 별에 온 걸 환영해! 깡충깡충~🐰',
          '크와앙! 나는 바다와 등대를 지키는 수호자 드래곤이야! 🐉',
          '도서관에서 재미있는 책 읽을 사람 여기 모여라! 🐥',
          '우와! 새로운 자료가 올라와서 별이 더 예뻐졌어! ✨'
        ];
        return {
          isCharacter: true,
          name: userNote ? `${userNote.substring(0, 15)}` : names[Math.floor(Math.random() * names.length)],
          creator: '우리아이',
          speech: speeches[Math.floor(Math.random() * speeches.length)],
          scale: 1.5,
          tags: ['아이그림', '캐릭터', '친구'],
          cityNews: `📢 [도시 축제 보고] 시장님! 아이의 그림에서 새로운 마스코트가 태어나 행성을 뛰놀기 시작했습니다!`
        };
      }

      // 일반 자료 분석 -> 카테고리 매핑 & 층 증축 여부 판단
      let category = 'family';
      let type = 'cozy_house';
      let color = '#f97316';
      let natureBonus = 'forest';

      if (noteLower.includes('바다') || noteLower.includes('여행') || noteLower.includes('제주') || noteLower.includes('캠핑') || noteLower.includes('비행기')) {
        category = 'travel';
        type = 'lighthouse';
        color = '#0ea5e9';
        natureBonus = 'beach';
      } else if (noteLower.includes('공부') || noteLower.includes('책') || noteLower.includes('연구') || noteLower.includes('과학') || noteLower.includes('학교') || noteLower.includes('우주')) {
        category = 'study';
        type = 'observatory';
        color = '#8b5cf6';
        natureBonus = 'forest';
      } else if (noteLower.includes('돈') || noteLower.includes('은행') || noteLower.includes('통장') || noteLower.includes('영수증') || noteLower.includes('쇼핑') || noteLower.includes('재정')) {
        category = 'finance';
        type = 'bank_tower';
        color = '#eab308';
        natureBonus = 'lake';
      }

      const existingBuilding = this.data?.buildings?.find(b => b.category === category);
      const isStacking = !!existingBuilding;
      const targetBuildingName = existingBuilding ? existingBuilding.name : (
        category === 'travel' ? '푸른 오션 아쿠아 타워' :
        category === 'study' ? '별빛 아카데미 도서관' :
        category === 'finance' ? '황금빛 미래 금융 센터' : '꿈꾸는 패밀리 타워'
      );
      const nextFloor = existingBuilding ? ((existingBuilding.floors?.length || 0) + 1) : 1;

      const title = userNote ? `${userNote.substring(0, 22)}` : `${targetBuildingName} ${nextFloor}층 보관소`;
      const cityNews = isStacking
        ? `📢 [도시 개발 보고] 시장님, 새로운 기록이 도착하여 '${targetBuildingName}'가 ${nextFloor}층으로 높게 증축되었습니다!`
        : `📢 [도시 개발 보고] 시장님, 새로운 분야의 '${targetBuildingName}' 기초 공사가 성공적으로 착공되었습니다!`;

      return {
        isCharacter: false,
        name: targetBuildingName,
        title: title,
        category: category,
        type: type,
        color: color,
        isStacking: isStacking,
        nextFloor: nextFloor,
        desc: userNote ? `${userNote}` : '행성 위에 새롭게 보관된 소중한 기록입니다.',
        tags: [category, '기록', `Floor${nextFloor}`],
        natureBonus: natureBonus,
        cityNews: cityNews
      };
    } finally {
      this.isAnalyzing = false;
    }
  },

  /**
   * 파일 및 메타데이터를 서버에 업로드하고 행성에 배치 (관리자 전용)
   */
  async uploadItem(payload) {
    const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
    let user = { isGuest: true, username: '게스트' };
    if (rawUser) {
      try { user = JSON.parse(rawUser); } catch(e) {}
    }
    if (user.isGuest) {
      throw new Error('🔒 자료 및 아이 그림 업로드는 최고 관리자 권한이 필요합니다.');
    }

    try {
      const res = await fetch('/api/planet/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-portal-role': 'admin',
          'x-portal-user': encodeURIComponent(user.username || 'admin')
        },
        body: JSON.stringify({
          ...payload,
          author: user.username || '관리자'
        })
      });

      if (res.ok) {
        const item = await res.json();
        await this.loadWorld(true);
        return item;
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `서버 응답 오류 (${res.status})`);
      }
    } catch (e) {
      if (e.message.includes('관리자') || e.message.includes('노트북') || e.message.includes('차단')) throw e;
      console.warn('[PlanetWorldModel] upload API failed, updating local state:', e);
    }

    // 클라이언트 로컬 스토리지 즉시 반영 (오프라인 폴백)
    if (!this.data) this.data = this.getDefaultFallbackData();
    const nowStr = new Date().toISOString().substring(0, 10);

    if (payload.isCharacter) {
      const newChar = {
        id: `c-${Date.now()}`,
        name: payload.name || '별빛 친구',
        species: 'drawing',
        creator: payload.creator || '우리아이',
        lat: typeof payload.lat === 'number' ? payload.lat : (Math.random() * 80 - 40),
        lon: typeof payload.lon === 'number' ? payload.lon : (Math.random() * 320 - 160),
        speed: 0.007,
        bounceSpeed: 0.08,
        scale: 1.4,
        speech: payload.speech || '우와! 새로운 별에 태어났어!',
        imageUrl: payload.imageBase64 || payload.imageUrl || '',
        createdAt: nowStr
      };
      this.data.characters.push(newChar);
    } else {
      // 🌟 심시티 타워 적층: 동일 분야 타워 검색
      const cat = payload.category || 'family';
      let targetBuilding = !payload.forceNewBuilding ? this.data.buildings.find(b => b.category === cat) : null;

      if (targetBuilding) {
        if (!Array.isArray(targetBuilding.floors)) targetBuilding.floors = [];
        const newFloorNum = targetBuilding.floors.length + 1;
        const newFloor = {
          floor: newFloorNum,
          id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          title: payload.title || payload.name || `${targetBuilding.name} ${newFloorNum}층`,
          desc: payload.desc || '새롭게 증축된 층의 자료입니다.',
          tags: Array.isArray(payload.tags) ? payload.tags : [cat, '기록'],
          createdAt: nowStr,
          imageUrl: payload.imageBase64 || payload.imageUrl || ''
        };
        targetBuilding.floors.unshift(newFloor);
        targetBuilding.height = Math.min(6.5, 2.2 + targetBuilding.floors.length * 0.7);
        targetBuilding.tier = targetBuilding.floors.length >= 5 ? 3 : (targetBuilding.floors.length >= 3 ? 2 : 1);
        if (targetBuilding.tier === 3 && !targetBuilding.name.includes('아콜로지')) {
          targetBuilding.name = targetBuilding.name.replace(/(타운하우스|센터|연구실|타워)/, '아콜로지 타워');
        }
      } else {
        const newFloor = {
          floor: 1,
          id: `rec-${Date.now()}-1`,
          title: payload.title || payload.name || '새로운 기록',
          desc: payload.desc || '행성 위에 새롭게 건축된 기록 보관소입니다.',
          tags: Array.isArray(payload.tags) ? payload.tags : [cat, '기록'],
          createdAt: nowStr,
          imageUrl: payload.imageBase64 || payload.imageUrl || ''
        };
        const newBuilding = {
          id: `b-${Date.now()}`,
          name: payload.name || `${cat.toUpperCase()} 타워`,
          category: cat,
          type: payload.type || 'cozy_house',
          tier: 1,
          color: payload.color || '#f97316',
          lat: typeof payload.lat === 'number' ? payload.lat : (Math.random() * 80 - 40),
          lon: typeof payload.lon === 'number' ? payload.lon : (Math.random() * 320 - 160),
          height: 2.8,
          floors: [newFloor]
        };
        this.data.buildings.push(newBuilding);
      }

      if (!this.data.cityStats) {
        this.data.cityStats = { cityName: "메트로폴리스 노바", population: 12850, totalFloors: 8, cityLevel: "Level 2: 첨단 복합 도시" };
      }
      this.data.cityStats.totalFloors = (this.data.cityStats.totalFloors || 0) + 1;
      this.data.cityStats.population = (this.data.cityStats.population || 12850) + Math.floor(Math.random() * 350 + 150);
    }

    if (payload && payload.id) {
      this.removeDeletedId(payload.id);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    return payload;
  },

  /**
   * 🌟 특정 타워의 단일 층만 철거(삭제)
   */
  async deleteFloorItem(buildingId, floorId) {
    if (!buildingId || !floorId) throw new Error('건물 ID와 층 ID가 필요합니다.');

    const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
    let isAdmin = false;
    if (rawUser) {
      try { const u = JSON.parse(rawUser); isAdmin = u && !u.isGuest; } catch (e) {}
    }
    if (!isAdmin) {
      throw new Error('🔒 최고 관리자만 자료를 철거(삭제)할 수 있습니다.');
    }

    try {
      const res = await fetch('/api/planet/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-portal-role': 'admin' },
        body: JSON.stringify({ id: floorId, buildingId: buildingId, role: 'admin' })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `층 철거 요청 실패 (${res.status})`);
      }
    } catch (e) {
      if (e.message.includes('관리자') || e.message.includes('노트북') || e.message.includes('차단')) throw e;
      console.warn('[PlanetWorldModel] deleteFloor API failed:', e);
    }

    this.addDeletedId(floorId);

    const b = this.data?.buildings?.find(x => x.id === buildingId);
    if (b && Array.isArray(b.floors)) {
      const prevCount = b.floors.length;
      b.floors = b.floors.filter(f => f.id !== floorId);
      if (b.floors.length === 0) {
        return await this.deleteItem(buildingId);
      } else {
        b.floors.forEach((f, idx) => { f.floor = b.floors.length - idx; });
        b.height = Math.min(6.5, 2.2 + b.floors.length * 0.7);
        b.tier = b.floors.length >= 5 ? 3 : (b.floors.length >= 3 ? 2 : 1);
      }
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    return { success: true, buildingId, floorId };
  },

  async deleteItem(itemId) {
    if (!itemId) throw new Error('삭제할 대상의 ID가 필요합니다.');

    const rawUser = sessionStorage.getItem('portal_auth_user') || localStorage.getItem('portal_auth_user');
    let isAdmin = false;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        isAdmin = u && !u.isGuest;
      } catch (e) {}
    }
    if (!isAdmin) {
      throw new Error('🔒 최고 관리자만 자료를 철거(삭제)할 수 있습니다.');
    }

    try {
      const res = await fetch('/api/planet/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-role': 'admin'
        },
        body: JSON.stringify({ id: itemId, role: 'admin' })
      });
      if (res.ok) {
        const result = await res.json();
        this.addDeletedId(itemId);
        if (this.data) {
          if (Array.isArray(this.data.buildings)) {
            this.data.buildings = this.data.buildings.filter(b => b.id !== itemId);
          }
          if (Array.isArray(this.data.characters)) {
            this.data.characters = this.data.characters.filter(c => c.id !== itemId);
          }
          if (Array.isArray(this.data.landmarks)) {
            this.data.landmarks = this.data.landmarks.filter(l => l.id !== itemId);
          }
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        }
        return result;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || '삭제 요청 처리에 실패했습니다.');
      }
    } catch (err) {
      if (err.message.includes('관리자') || err.message.includes('노트북') || err.message.includes('차단')) throw err;
      this.addDeletedId(itemId);
      if (this.data) {
        if (Array.isArray(this.data.buildings)) {
          this.data.buildings = this.data.buildings.filter(b => b.id !== itemId);
        }
        if (Array.isArray(this.data.characters)) {
          this.data.characters = this.data.characters.filter(c => c.id !== itemId);
        }
        if (Array.isArray(this.data.landmarks)) {
          this.data.landmarks = this.data.landmarks.filter(l => l.id !== itemId);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      }
      return { success: true, localOnly: true };
    }
  },

  async searchItems(query) {
    const q = (query || '').trim().toLowerCase();
    try {
      const res = await fetch(`/api/planet/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // 로컬 폴백 검색
    const buildings = (this.data?.buildings || []).filter(b => {
      const t = `${b.name || ''} ${b.title || ''} ${b.desc || ''} ${(b.tags || []).join(' ')}`.toLowerCase();
      return !q || t.includes(q);
    });
    const characters = (this.data?.characters || []).filter(c => {
      const t = `${c.name || ''} ${c.speech || ''} ${c.creator || ''}`.toLowerCase();
      return !q || t.includes(q);
    });

    return {
      query: q,
      total: buildings.length + characters.length,
      buildings: buildings,
      characters: characters
    };
  },

  getDefaultFallbackData() {
    return {
      lastUpdated: "2026-09-20 06:15:00",
      planetConfig: {
        name: "아이와 함께 만드는 행성 지구",
        radius: 12,
        seaColor: "#0284c7",
        landColor: "#15803d",
        atmosphereColor: "#38bdf8"
      },
      buildings: [
        {
          id: "b-1",
          name: "꿈꾸는 우리 집",
          category: "family",
          type: "cozy_house",
          color: "#f97316",
          lat: 15.5,
          lon: 30.2,
          height: 2.5,
          title: "행복한 우리 가족 첫 보금자리",
          desc: "가족들과 함께 찍은 사진과 행복한 일상 메모가 보관된 따뜻한 집입니다.",
          tags: ["가족", "집", "추억", "일상"],
          createdAt: "2026-09-18",
          imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=500&auto=format&fit=crop&q=60"
        },
        {
          id: "b-2",
          name: "푸른 바다 등대 & 아쿠아리움",
          category: "travel",
          type: "lighthouse",
          color: "#0ea5e9",
          lat: -12.0,
          lon: 85.4,
          height: 3.8,
          title: "제주도 푸른 바다 여행 기록",
          desc: "여름휴가 때 아이와 함께 바다를 보며 조개껍질을 주웠던 소중한 여행 사진 모음.",
          tags: ["제주도", "바다", "여행", "휴가", "등대"],
          createdAt: "2026-09-15",
          imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60"
        }
      ],
      characters: [
        {
          id: "c-1",
          name: "우주토끼 피포",
          species: "drawing",
          creator: "우리아이",
          lat: 20.0,
          lon: 35.0,
          speed: 0.008,
          bounceSpeed: 0.08,
          scale: 1.4,
          speech: "안녕! 내가 만든 별에 놀러온 걸 환영해! 깡충깡충~🐰",
          imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='60' r='30' fill='%23fbcfe8' stroke='%23ec4899' stroke-width='4'/><ellipse cx='38' cy='25' rx='8' ry='22' fill='%23fbcfe8' stroke='%23ec4899' stroke-width='4'/><ellipse cx='62' cy='25' rx='8' ry='22' fill='%23fbcfe8' stroke='%23ec4899' stroke-width='4'/><circle cx='40' cy='55' r='5' fill='%231e293b'/><circle cx='60' cy='55' r='5' fill='%231e293b'/><ellipse cx='50' cy='65' rx='4' ry='3' fill='%23f43f5e'/><path d='M44 72 Q50 78 56 72' stroke='%23ec4899' stroke-width='3' fill='none'/></svg>",
          createdAt: "2026-09-18"
        }
      ]
    };
  }
};
