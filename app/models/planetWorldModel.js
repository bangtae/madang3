// app/models/planetWorldModel.js - 3D 행성 월드 및 자료 아카이브 데이터 모델

window.PlanetWorldModel = {
  STORAGE_KEY: 'portal_planet_world_cache',
  data: null,
  isAnalyzing: false,

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

  async loadWorld(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        try {
          this.data = JSON.parse(cached);
        } catch (e) {}
      }
    }

    const urls = this.getApiUrls();
    for (const url of urls) {
      try {
        const res = await fetch(url + (forceRefresh ? `?t=${Date.now()}` : ''), { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && (json.buildings || json.characters)) {
            this.data = json;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(json));
            return this.data;
          }
        }
      } catch (err) {
        // try next
      }
    }

    if (!this.data) {
      this.data = this.getDefaultFallbackData();
    }
    return this.data;
  },

  getBuildings() {
    return this.data?.buildings || [];
  },

  getCharacters() {
    return this.data?.characters || [];
  },

  getPlanetConfig() {
    return this.data?.planetConfig || {
      name: "아이와 함께 만드는 행성 지구",
      radius: 12,
      seaColor: "#0284c7",
      landColor: "#15803d",
      atmosphereColor: "#38bdf8"
    };
  },

  /**
   * 클라이언트 Canvas 기반 자동 배경 투명화(누끼 추출) 알고리즘
   * 아이가 스케치북/종이에 그린 그림에서 흰색/연회색 종이 배경을 투명하게 변환
   */
  processTransparentBackground(imgEl, tolerance = 40) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgEl.naturalWidth || imgEl.width || 300;
    canvas.height = imgEl.naturalHeight || imgEl.height || 300;

    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // 모서리 4개 샘플링하여 배경 기준색 산출
    const cornerR = (d[0] + d[(canvas.width - 1) * 4] + d[(canvas.height - 1) * canvas.width * 4]) / 3;
    const cornerG = (d[1] + d[(canvas.width - 1) * 4 + 1] + d[(canvas.height - 1) * canvas.width * 4 + 1]) / 3;
    const cornerB = (d[2] + d[(canvas.width - 1) * 4 + 2] + d[(canvas.height - 1) * canvas.width * 4 + 2]) / 3;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];

      // 밝은 흰색/아이보리 종이 또는 모서리 기준색과 유사한 픽셀 투명화
      const isWhitePaper = (r > 215 && g > 215 && b > 215);
      const isNearCorner = (Math.abs(r - cornerR) < tolerance && Math.abs(g - cornerG) < tolerance && Math.abs(b - cornerB) < tolerance);

      if (isWhitePaper || isNearCorner) {
        // 투명도(Alpha)를 0으로 설정
        d[i + 3] = 0;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  },

  /**
   * Gemini 멀티모달 분석을 모사/연동하여 업로드된 자료를 분석
   * '아이 그림 캐릭터' vs '일반 심시티 건물' 자동 판별 및 메타데이터 도출
   */
  async analyzeMaterialWithLLM(fileOrBase64, userNote = '', forceType = 'auto') {
    this.isAnalyzing = true;
    try {
      // 1. 사용자 힌트 및 키워드 기반 판별
      const noteLower = (userNote || '').toLowerCase();
      const isDrawingHint = noteLower.includes('그림') || noteLower.includes('아이') ||
                            noteLower.includes('캐릭터') || noteLower.includes('괴물') ||
                            noteLower.includes('토끼') || noteLower.includes('공룡') ||
                            noteLower.includes('사람') || forceType === 'character';

      if (isDrawingHint || forceType === 'character') {
        // 캐릭터 NPC로 생성
        const names = ['별빛 요정 핑키', '용감한 로봇 깡통이', '아기 공룡 렉스', '호기심 고양이 냥이', '번개람쥐'];
        const speeches = [
          '내가 만든 별에 온 걸 환영해! 🌟',
          '오늘도 신나게 행성을 산책 중이야! 🐾',
          '아이의 그림에서 태어난 행복한 친구란다! ✨',
          '저기 멋진 도서관이랑 바다가 보여! 🌈'
        ];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomSpeech = speeches[Math.floor(Math.random() * speeches.length)];

        return {
          isCharacter: true,
          name: userNote ? `${userNote.substring(0, 15)}` : randomName,
          creator: '우리아이',
          speech: randomSpeech,
          scale: 1.5,
          tags: ['아이그림', '캐릭터', '친구']
        };
      }

      // 2. 일반 자료 -> 심시티 건물 매핑
      let category = 'family';
      let type = 'cozy_house';
      let color = '#f97316';
      let height = 3.0;

      if (noteLower.includes('바다') || noteLower.includes('여행') || noteLower.includes('제주') || noteLower.includes('캠핑')) {
        category = 'travel';
        type = 'lighthouse';
        color = '#0ea5e9';
        height = 3.8;
      } else if (noteLower.includes('공부') || noteLower.includes('책') || noteLower.includes('연구') || noteLower.includes('과학') || noteLower.includes('학교')) {
        category = 'study';
        type = 'observatory';
        color = '#8b5cf6';
        height = 3.5;
      } else if (noteLower.includes('돈') || noteLower.includes('은행') || noteLower.includes('통장') || noteLower.includes('영수증') || noteLower.includes('쇼핑')) {
        category = 'finance';
        type = 'bank_tower';
        color = '#eab308';
        height = 4.5;
      }

      return {
        isCharacter: false,
        name: userNote ? `${userNote.substring(0, 18)}` : '새로운 심시티 타운',
        category: category,
        type: type,
        color: color,
        height: height,
        title: userNote || '소중한 기록과 사진',
        desc: '행성 위에 안전하게 아카이빙된 소중한 일상 자료입니다.',
        tags: [category, '기록', '아카이브']
      };
    } finally {
      this.isAnalyzing = false;
    }
  },

  /**
   * 파일 및 메타데이터를 서버에 업로드하고 행성에 배치
   */
  async uploadItem(payload) {
    try {
      const res = await fetch('/api/planet/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const item = await res.json();
        await this.loadWorld(true);
        return item;
      }
    } catch (e) {
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
      const newBuilding = {
        id: `b-${Date.now()}`,
        name: payload.name || '새 타운하우스',
        category: payload.category || 'family',
        type: payload.type || 'cozy_house',
        color: payload.color || '#f97316',
        lat: typeof payload.lat === 'number' ? payload.lat : (Math.random() * 80 - 40),
        lon: typeof payload.lon === 'number' ? payload.lon : (Math.random() * 320 - 160),
        height: typeof payload.height === 'number' ? payload.height : 3.0,
        title: payload.title || '새로운 기록',
        desc: payload.desc || '소중한 일상 자료가 보관된 건물입니다.',
        tags: payload.tags || ['기록'],
        createdAt: nowStr,
        imageUrl: payload.imageBase64 || payload.imageUrl || ''
      };
      this.data.buildings.push(newBuilding);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    return payload;
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
