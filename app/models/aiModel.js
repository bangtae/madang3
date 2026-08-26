// app/models/aiModel.js - LocalStorage 및 중앙 서버(aiModels.json) 양방향 동기화 AI 모델 데이터 관리 모듈

window.AiModel = {
  aiModels: [],
  isSyncing: false,

  STORAGE_KEY: 'portal_ai_models',

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/ai-models', './data/aiModels.json'];
    }
    return [
      'http://localhost:8080/api/ai-models',
      'http://192.168.219.115:8080/api/ai-models',
      './data/aiModels.json'
    ];
  },

  getApiUrl() {
    return this.getApiUrls()[0];
  },

  getAiModelsFromLocal() {
    const fallbackModels = window.PORTAL_DATA_AI_MODELS || [];
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (!rawData || rawData === '[]' || rawData === 'null') {
      if (fallbackModels.length > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fallbackModels));
      }
      return fallbackModels;
    }
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return this.mergeModels(parsed, fallbackModels);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fallbackModels));
      return fallbackModels;
    } catch (e) {
      return fallbackModels;
    }
  },

  getAiModels() {
    if (Array.isArray(this.aiModels) && this.aiModels.length > 0) {
      return this.aiModels;
    }
    const localModels = this.getAiModelsFromLocal();
    const fallbackModels = window.PORTAL_DATA_AI_MODELS || [];
    const merged = this.mergeModels(localModels, fallbackModels);
    this.aiModels = merged;
    return this.aiModels;
  },

  /**
   * 로컬 데이터와 서버 데이터를 손실 없이 스마트 양방향 통합 병합(Union Merge)
   */
  mergeModels(listA = [], listB = []) {
    const combined = [...(listA || []), ...(listB || [])];
    return this.deduplicateModels(combined);
  },

  async initSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const localModels = this.getAiModelsFromLocal();

    // 1. Supabase Cloud DB 연동 확인
    if (window.isSupabaseEnabled()) {
      try {
        const supabase = window.getSupabaseClient();
        const { data, error } = await supabase.from('ai_models').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          const formattedFromDb = data.map(dbItem => ({
            id: dbItem.id,
            title: dbItem.title,
            category: dbItem.category || 'LLM / 멀티모달',
            developer: dbItem.provider || 'AI Provider',
            provider: dbItem.provider || 'AI Provider',
            description: dbItem.description || '',
            summary: dbItem.description || '',
            createdAt: dbItem.created_at
          }));
          
          this.aiModels = this.mergeModels(formattedFromDb, localModels);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.aiModels));
          this.isSyncing = false;
          if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
            window.AppController.refreshAllViews();
          }
          return;
        }
      } catch (e) {
        console.warn('[Supabase AiModel Sync Error]:', e);
      }
    }

    // 2. Supabase 미연동 또는 DB 비어있을 시 Local / REST API 폴백
    const fallbackModels = window.PORTAL_DATA_AI_MODELS || [];
    const merged = this.mergeModels(localModels, fallbackModels);
    this.aiModels = merged;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));

    this.isSyncing = false;
    if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
      window.AppController.refreshAllViews();
    }
  },

  async syncToServer(models) {
    try {
      const serverUrl = this.getApiUrl();
      await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(models)
      });
    } catch (e) {
      console.warn('[Sync AI] 서버에 데이터를 동기화하지 못했습니다:', e);
    }
  },

  saveAllModels(models) {
    this.aiModels = models;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(models));
    this.syncToServer(models);
  },

  /**
   * 동일 서비스에 대한 다양한 URL 표현(에일리어스/리다이렉트)을 대표 정규 URL로 통일하는 메퍼
   */
  getCanonicalUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const clean = url.trim().toLowerCase().replace(/\/+$/, '');
    if (clean.includes('chat.openai.com') || clean.includes('chatgpt.com') || clean.includes('openai.com/chat')) {
      return 'https://chatgpt.com/';
    }
    if (clean.includes('claude.ai') || clean.includes('anthropic.com/claude')) {
      return 'https://claude.ai/';
    }
    if (clean.includes('gemini.google.com') || clean.includes('bard.google.com')) {
      return 'https://gemini.google.com/';
    }
    if (clean.includes('chat.deepseek.com') || clean.includes('deepseek.com')) {
      return 'https://chat.deepseek.com/';
    }
    return clean;
  },

  /**
   * 기존에 우회 생성된 중복 카드 자동 병합 및 정리 (Deduplication)
   */
  deduplicateModels(modelsList) {
    const rawList = modelsList || this.aiModels || [];
    if (!Array.isArray(rawList) || rawList.length === 0) return [];

    const map = new Map();

    for (const model of rawList) {
      if (!model) continue;
      const titleKey = (model.title || '').trim().toLowerCase();
      const uniqueKey = model.id ? `id:${model.id}` : (titleKey ? `title:${titleKey}` : `rand_${Math.random()}`);

      if (map.has(uniqueKey)) {
        const existing = map.get(uniqueKey);
        const mergedObj = { ...existing };
        for (const [k, v] of Object.entries(model)) {
          if (v !== undefined && v !== null && v !== '') {
            mergedObj[k] = v;
          }
        }
        map.set(uniqueKey, mergedObj);
      } else {
        map.set(uniqueKey, model);
      }
    }

    const cleanModels = Array.from(map.values());
    this.aiModels = cleanModels;
    return cleanModels;
  },

  /**
   * 신규 AI 모델 등록 또는 기존 URL/타이틀/에일리어스 존재 시 자동 업데이트(Upsert)
   */
  addAiModel(data) {
    // 0. 기존 등록된 중복 데이터가 있다면 사전 정리
    let models = this.deduplicateModels(this.getAiModels());
    const normalizeUrl = (url) => (typeof url === 'string' ? url.trim().toLowerCase().replace(/\/+$/, '') : '');

    const targetServiceUrl = data.serviceUrl || '';
    const targetDocsUrl = data.docsUrl || '';
    const targetCanonical = this.getCanonicalUrl(targetServiceUrl || targetDocsUrl);
    const targetTitle = (data.title || '').trim().toLowerCase();

    // 지능형 다중 중복 검사 (1차: Canonical URL, 2차: Exact URL, 3차: Title 100% 일치)
    const existingIndex = models.findIndex(m => {
      const sUrl = normalizeUrl(m.serviceUrl);
      const dUrl = normalizeUrl(m.docsUrl);
      const canonicalS = this.getCanonicalUrl(m.serviceUrl);
      const canonicalD = this.getCanonicalUrl(m.docsUrl);
      const mTitle = (m.title || '').trim().toLowerCase();

      // 1. Canonical URL 일치 (예: chat.openai.com === chatgpt.com)
      if (targetCanonical && (canonicalS === targetCanonical || canonicalD === targetCanonical)) {
        return true;
      }
      // 2. Exact URL 일치
      const normTarget = normalizeUrl(targetServiceUrl || targetDocsUrl);
      if (normTarget && (sUrl === normTarget || dUrl === normTarget)) {
        return true;
      }
      // 3. 모델 타이틀 100% 동일 일치 (예: "ChatGPT (OpenAI)" === "ChatGPT (OpenAI)")
      if (targetTitle && mTitle === targetTitle) {
        return true;
      }
      return false;
    });

    let isUpdate = false;
    let resultModel = null;
    const finalServiceUrl = targetCanonical || targetServiceUrl;

    if (existingIndex !== -1) {
      // 기존 등록된 URL/타이틀이 존재하면 업서트 업데이트 (기존 id, createdAt 유지)
      isUpdate = true;
      models[existingIndex] = {
        ...models[existingIndex],
        title: data.title || models[existingIndex].title,
        developer: data.developer || models[existingIndex].developer,
        country: data.country || models[existingIndex].country || '🇺🇸 미국',
        similarModels: data.similarModels || models[existingIndex].similarModels || '',
        serviceUrl: finalServiceUrl || models[existingIndex].serviceUrl,
        docsUrl: data.docsUrl || models[existingIndex].docsUrl,
        category: data.category || models[existingIndex].category,
        tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()) : models[existingIndex].tags),
        summary: data.summary || models[existingIndex].summary,
        garageIdeas: data.garageIdeas || models[existingIndex].garageIdeas,
        quickStart: data.quickStart || models[existingIndex].quickStart,
        pricing: data.pricing || models[existingIndex].pricing,
        updatedAt: new Date().toISOString()
      };
      resultModel = models[existingIndex];
    } else {
      // 신규 등록
      resultModel = {
        id: `ai_${Date.now()}`,
        title: data.title || '신규 AI 모델',
        developer: data.developer || '미지정',
        country: data.country || '🇺🇸 미국',
        similarModels: data.similarModels || '',
        serviceUrl: finalServiceUrl || '',
        docsUrl: data.docsUrl || finalServiceUrl || '',
        category: data.category || 'LLM / 멀티모달',
        tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',').map(t => t.trim()) : ['AI']),
        summary: data.summary || '',
        garageIdeas: data.garageIdeas || '',
        quickStart: data.quickStart || '',
        pricing: data.pricing || '공식 홈페이지 참조',
        createdAt: new Date().toISOString()
      };
      models.unshift(resultModel);
    }

    this.saveAllModels(models);
    return { model: resultModel, isUpdate };
  },

  deleteAiModel(id) {
    const models = this.getAiModels().filter(m => m.id !== id);
    this.saveAllModels(models);
    return models;
  },

  updateAiModel(id, updatedData) {
    const models = this.getAiModels();
    const index = models.findIndex(m => m.id === id);
    if (index !== -1) {
      const finalServiceUrl = this.getCanonicalUrl(updatedData.serviceUrl) || updatedData.serviceUrl;
      models[index] = {
        ...models[index],
        title: updatedData.title,
        developer: updatedData.developer,
        country: updatedData.country || models[index].country,
        similarModels: updatedData.similarModels || models[index].similarModels,
        serviceUrl: finalServiceUrl,
        docsUrl: updatedData.docsUrl,
        category: updatedData.category,
        tags: Array.isArray(updatedData.tags) ? updatedData.tags : (updatedData.tags ? updatedData.tags.split(',').map(t => t.trim()) : ['AI']),
        summary: updatedData.summary,
        garageIdeas: updatedData.garageIdeas,
        quickStart: updatedData.quickStart,
        pricing: updatedData.pricing,
        updatedAt: new Date().toISOString()
      };
      this.saveAllModels(models);
      return models[index];
    }
    return null;
  },

  /**
   * AI 모델 분석 캐시 가져오기
   */
  getAnalysisCache(urlKey) {
    try {
      const raw = localStorage.getItem('portal_ai_analysis_cache');
      if (raw) {
        const cacheMap = JSON.parse(raw);
        return cacheMap[urlKey] || null;
      }
    } catch (e) {}
    return null;
  },

  /**
   * AI 모델 분석 캐시 저장하기
   */
  setAnalysisCache(urlKey, data) {
    try {
      const raw = localStorage.getItem('portal_ai_analysis_cache');
      const cacheMap = raw ? JSON.parse(raw) : {};
      cacheMap[urlKey] = data;
      localStorage.setItem('portal_ai_analysis_cache', JSON.stringify(cacheMap));
    } catch (e) {}
  },

  /**
   * AI 모델 홈페이지 URL 입력 시 서버/로컬 분석을 수행하는 메소드
   */
  async analyzeUrl(targetUrl, userManualSummary = '', stepCallback = null) {
    if (!targetUrl) return { success: false, message: 'URL을 입력해주세요.' };

    const normalizeUrl = (url) => (typeof url === 'string' ? url.trim().toLowerCase().replace(/\/+$/, '') : '');
    const targetCanonical = this.getCanonicalUrl(targetUrl);
    const normTarget = normalizeUrl(targetUrl);
    const cleanUserSummary = userManualSummary ? userManualSummary.trim() : '';

    if (stepCallback) stepCallback(1, '🌐 입력 URL 접속 및 웹 메타데이터 수집 중...');

    // 1. 캐시 검사 (동일 URL 재요청 시 0.1초 즉시 반환)
    const cachedData = this.getAnalysisCache(normTarget) || (targetCanonical ? this.getAnalysisCache(targetCanonical) : null);
    if (cachedData) {
      if (stepCallback) stepCallback(4, '⚡ [캐시] 이전에 분석한 URL 데이터로 0.1초 만에 완료되었습니다!');
      return { ...cachedData, isCached: true };
    }

    if (stepCallback) stepCallback(2, '🤖 Google Gemini 1.5 Flash AI 모델 컨텍스트 분석 중...');

    // 기존 등록 모델 중 canonical URL, exact URL, 또는 에일리어스 교차 감지
    const existingModel = this.getAiModels().find(m => {
      const sNorm = normalizeUrl(m.serviceUrl);
      const dNorm = normalizeUrl(m.docsUrl);
      const sCanon = this.getCanonicalUrl(m.serviceUrl);
      const dCanon = this.getCanonicalUrl(m.docsUrl);

      if (targetCanonical && (sCanon === targetCanonical || dCanon === targetCanonical)) {
        return true;
      }
      return (sNorm === normTarget || dNorm === normTarget);
    });

    const endpoints = [
      '/api/analyze-ai-url',
      'http://127.0.0.1:8080/api/analyze-ai-url'
    ];

    for (const ep of endpoints) {
      try {
        if (stepCallback) stepCallback(3, '💡 요금 체계, 개발 국가, 유사 서비스, 활용 아이디어 추론 중...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, userSummary: cleanUserSummary }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data = await res.json();
          if (data) {
            if (data.success === false) {
              return {
                success: false,
                message: data.message || `⚠️ 입력하신 URL(${targetUrl})은 AI 서비스와 무관하거나 외부 스팸 사이트로 리다이렉트되어 등록이 제한되었습니다.`
              };
            }
            if (data.success) {
              if (existingModel) {
                data.isExisting = true;
                data.existingModel = existingModel;
              }
              if (cleanUserSummary && data.summary && !data.summary.includes(cleanUserSummary)) {
                data.summary = `${cleanUserSummary}\n\n📌 [자동 분석 요약]\n${data.summary}`;
              }
              // 캐시에 저장
              this.setAnalysisCache(normTarget, data);
              if (targetCanonical) this.setAnalysisCache(targetCanonical, data);

              if (stepCallback) stepCallback(4, '⚡ 분석 완료! 필드 자동 생성 및 렌더링 중...');
              return data;
            }
          }
        }
      } catch (err) {
        // Fast fallback on timeout
      }
    }

    // 로컬 폴백 전문가 지능형 KB 수집
    if (stepCallback) stepCallback(4, '⚡ 분석 완료! 필드 자동 생성 및 렌더링 중...');
    const expertInfo = this.getExpertAiKnowledge(targetUrl);
    if (expertInfo) {
      let expSummary = expertInfo.summary || '';
      if (cleanUserSummary && expSummary && !expSummary.includes(cleanUserSummary)) {
        expSummary = `${cleanUserSummary}\n\n📌 [자동 분석 요약]\n${expSummary}`;
      }
      return {
        success: true,
        isExisting: !!existingModel,
        existingModel: existingModel || null,
        ...expertInfo,
        summary: expSummary
      };
    }

    // 신규 수집 도메인 스마트 NLP 추론기 (어떤 URL이 들어와도 단순/추상적 문구 완전히 제거)
    let domain = 'AI 서비스';
    try {
      domain = new URL(targetUrl).hostname.replace('www.', '');
    } catch (err) { domain = targetUrl; }

    const cleanDomain = domain.replace(/\.(com|ai|io|dev|org|net|kr|app|co|xyz)$/i, '');
    let words = cleanDomain
      .replace(/aivoice/gi, 'AI Voice ')
      .replace(/voicestudio/gi, 'Voice Studio ')
      .replace(/voice/gi, 'Voice ')
      .replace(/studio/gi, 'Studio ')
      .replace(/image/gi, 'Image ')
      .replace(/generator/gi, 'Generator ')
      .replace(/code/gi, 'Code ')
      .replace(/assistant/gi, 'Assistant ')
      .replace(/summarizer/gi, 'Summarizer ')
      .replace(/music/gi, 'Music ')
      .replace(/maker/gi, 'Maker ')
      .replace(/[-_]/g, ' ')
      .trim();

    words = words.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (!words || words.length < 2) words = domain;

    let country = '🇺🇸 미국';
    if (domain.endsWith('.kr') || domain.includes('naver') || domain.includes('kakao') || domain.includes('wrtn') || domain.includes('upstage') || domain.includes('lilys') || domain.includes('prompts3')) {
      country = '🇰🇷 대한민국';
    } else if (domain.endsWith('.cn') || domain.includes('deepseek') || domain.includes('qwen') || domain.includes('moonshot')) {
      country = '🇨🇳 중국';
    } else if (domain.endsWith('.fr') || domain.includes('mistral')) {
      country = '🇫🇷 프랑스';
    } else if (domain.endsWith('.de') || domain.includes('blackforest')) {
      country = '🇩🇪 독일';
    }

    let category = 'LLM / 멀티모달';
    let title = `${words} (AI 솔루션 & 생성형 AI)`;
    let tags = ['AI솔루션', '생성형AI', '실무자동화', '생산성도구'];
    let summary = `입력하신 서비스(${targetUrl})는 프롬프트 텍스트 및 멀티모달 데이터를 처리하여 업무 생산성 및 작업 자동화를 지원하는 최신 AI 생성 플랫폼입니다.`;
    let garage = `${words} 연동 사내 업무 프로세스 자동화 파이프라인 구축 컨설팅`;
    let quick = `1) 공식 웹사이트(${targetUrl}) 접속 및 회원가입 -> 2) 주요 기능 선택 또는 API 연동 -> 3) 실무 적용`;
    let pricing = '기본 무료 체험(Free Tier) / 사용량 및 월 구독 요금제 별도';
    $similar = 'ChatGPT (GPT-4o), Claude 3.5 Sonnet, Gemini 2.0';

    const cleanLower = cleanDomain.toLowerCase();
    const urlLower = targetUrl.toLowerCase();

    if (cleanLower.match(/voice|speech|audio|sound|tts|stt|dubbing|voiceover|sing/)) {
      category = '음성 인식 / TTS';
      title = `${words} (AI 음성 합성 & 오디오 스튜디오)`;
      tags = ['음성합성', 'TTS', '보이스클로닝', 'AI성우', '오디오AI'];
      summary = `자연스러운 인간의 목소리와 감정을 모사하는 AI 보이스 합성(TTS), 보이스 클로닝 및 오디오 편집 기능을 제공하여 오디오북, 팟캐스트, 영상 성우 더빙을 자동화하는 오디오 AI 스튜디오입니다.`;
      garage = '유튜브 영상 자동 더빙 파이프라인, 사내 팟캐스트 및 오디오 회의록 실시간 요약 시스템';
      similar = 'ElevenLabs, Typecast, Play.ht, OpenAI Whisper';
    } else if (cleanLower.match(/image|photo|draw|art|paint|pic|canvas|design/)) {
      category = '이미지 생성';
      title = `${words} (AI 비주얼 및 이미지 생성 도구)`;
      tags = ['이미지생성', '사진편집', '디자인AI', 'AI아트', '비주얼생성'];
      summary = `프롬프트 텍스트 입력을 바탕으로 고화질 AI 그래픽, 일러스트, 썸네일 및 포스터 디자인을 자유롭게 자동 생성하는 비주얼 AI 그래픽 플랫폼입니다.`;
      garage = '쇼핑몰 상품 이미지 자동 보정 및 SNS/블로그 홍보용 디자인 포스터 제작 파이프라인';
      similar = 'Midjourney, Photoroom, Canva, Pixlr, Ideogram';
    } else if (cleanLower.match(/video|movie|anim|clip|avatar|shorts|reels|film/)) {
      category = '비디오 생성';
      title = `${words} (AI 비디오 & 아바타 영상 솔루션)`;
      tags = ['비디오생성', '영상AI', 'AI아바타', '숏폼자동화', '비디오편집'];
      summary = `텍스트 스크립트나 사진만으로 다국어 AI 아바타 발표 영상 및 숏폼 홍보 비디오 씬을 카메라 촬영 없이 자동 렌더링하는 비디오 생성 플랫폼입니다.`;
      garage = '유튜브 숏폼 비디오 및 사내 교육용 AI 아나운서 영상 자동 생성 파이프라인';
      similar = 'Runway Gen-3, Synthesia, Luma Dream Machine, HeyGen';
    } else if (cleanLower.match(/code|dev|script|git|app|build|ui|frontend|coder/)) {
      category = 'LLM / 코딩';
      title = `${words} (개발자 전용 AI 코딩 솔루션)`;
      tags = ['코딩전문', '개발보조', '코드생성', 'UI자동화', 'AI에디터'];
      summary = `개발자의 소스 코드 자동 작성, 리팩토링, 디버깅 및 웹/모바일 프론트엔드 UI 코드를 실시간 생성하여 개발 생산성을 증대시키는 코딩 보조 도구입니다.`;
      garage = '웹/모바일 서비스 프론트엔드 UI 코드 자동 생성 및 초고속 프로토타이핑 툴 연동';
      similar = 'Claude 3.5 Sonnet, GitHub Copilot, Cursor AI, v0.dev';
    } else if (cleanLower.match(/summary|pdf|doc|note|rag|search|knowledge|paper/)) {
      category = 'AI 요약 / 지식조사';
      title = `${words} (대용량 문서 & AI 요약 플랫폼)`;
      tags = ['AI요약', 'PDF요약', 'RAG지식검색', '지식정리', '노트생성'];
      summary = `긴 PDF 문서, 웹 아티클, 영상 스크립트를 분석하여 핵심 요점 노트 및 사내 지식 베이스 검색(RAG)을 지원하는 조사/연구 보조 도구입니다.`;
      garage = '대용량 매뉴얼/논문 기반 사내 스마트 Q&A 챗봇 및 지식 노트 관리 파이프라인';
      similar = 'Lilys AI, NotebookLM, Perplexity AI, Kapa AI';
    }

    return {
      success: true,
      isExisting: !!existingModel,
      existingModel: existingModel || null,
      title: existingModel ? existingModel.title : title,
      developer: existingModel ? existingModel.developer : domain,
      country: existingModel ? existingModel.country : country,
      similarModels: existingModel ? existingModel.similarModels : similar,
      serviceUrl: targetUrl,
      docsUrl: targetUrl,
      category: existingModel ? existingModel.category : category,
      tags: existingModel ? existingModel.tags : tags,
      summary: existingModel ? existingModel.summary : summary,
      garageIdeas: existingModel ? existingModel.garageIdeas : garage,
      quickStart: existingModel ? existingModel.quickStart : quick,
      pricing: existingModel ? existingModel.pricing : pricing
    };
  },

  getExpertAiKnowledge(targetUrl) {
    if (!targetUrl) return null;
    const clean = targetUrl.toLowerCase().trim();

    if (clean.includes('clipdrop.co') || clean.includes('clipdrop')) {
      return {
        title: "Clipdrop by Stability AI (클립드롭)", developer: "Stability AI / Init ML", country: "🇺🇸 미국",
        similarModels: "Remove.bg, Pixlr, Canva AI, Adobe Photoshop (Firefly), Midjourney", serviceUrl: "https://clipdrop.co/", docsUrl: "https://clipdrop.co/",
        category: "이미지 생성", tags: ["사진편집", "누끼제거", "객체지우기", "화질개선", "SDXL기반", "AI디자인"],
        summary: "Stability AI에서 제공하는 웹 기반 이미지 편집 및 AI 비주얼 생성 도구입니다. 이미지 배경 제거(누끼), 불필요한 개체 지우기(Cleanup), 고화질 업스케일링, 텍스트 기반 이미지 생성(SDXL) 등 디자인/마케팅 실무에 필요한 핵심 기능을 제공합니다.",
        garageIdeas: "쇼핑몰 상품 이미지 배경 자동 제거 및 썸네일 보정 파이프라인, AI 고화질 업스케일링 자동화 툴",
        quickStart: "1) clipdrop.co 접속 -> 2) 원하는 AI 도구(Cleanup / Remove background / Upscale) 선택 -> 3) 이미지 업로드 후 결과 다운로드",
        pricing: "기본 무료 (일부 툴 무료 이용) / Pro 구독 ($9/월 - 무제한 고해상도 처리 및 전용 AI 모델)"
      };
    }
    if (clean.includes('openrouter.ai') || clean.includes('openrouter')) {
      return {
        title: "OpenRouter (오픈라우터 - 다종 LLM 통합 API 라우터 플랫폼)", developer: "OpenRouter", country: "🇺🇸 미국",
        similarModels: "Poe by Quora, LiteLLM, Portkey AI, Cloudflare AI Gateway, LangChain", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "LLM / 멀티모달", tags: ["OpenRouter", "오픈라우터", "통합LLM", "LLM라우팅", "API게이트웨이", "Claude3.5", "GPT4o", "DeepSeek"],
        summary: "ChatGPT(GPT-4o), Claude 3.5 Sonnet, Gemini 2.0, DeepSeek V3, Llama 3 등 세계 최고급 AI 모델들을 단 하나의 통합 API 게이트웨이 및 대화형 인터페이스로 제공하는 글로벌 LLM 라우팅 플랫폼입니다. 토큰별 최저가 자동 스위칭 및 분산 라우팅을 지원합니다.",
        garageIdeas: "사내 백엔드 서비스 단일 API 엔드포인트 연동 다종 LLM 자동 대체(Fallback) 라우터 파이프라인, 토큰 비용 최적화 마이닝",
        quickStart: "1) openrouter.ai 접속 및 회원가입 -> 2) 통합 API Key 발급 -> 3) 단일 API 규격으로 GPT-4o/Claude/DeepSeek 모델 호출",
        pricing: "종량제 API 토큰 요금 (사용한 모델별 실시간 1M 토큰 단위 수수료 청구 / 무료 테스트 모델 포함)"
      };
    }
    if (clean.includes('opennana.com') || clean.includes('opennana')) {
      return {
        title: "OpenNana — Nano Banana AI Image Prompt Gallery (오픈나나 - AI 프롬프트 갤러리)", developer: "OpenNana / LocalBanana (오픈나나)", country: "🇺🇸 미국",
        similarModels: "PromptHero, Midjourney, Craiyon, ChatGPT, Canva", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "이미지 생성", tags: ["OpenNana", "LocalBanana", "NanoBanana", "AI프롬프트", "이미지생성", "프롬프트갤러리", "Gemini프롬프트"],
        summary: "Nano Banana(Gemini), Midjourney용 고품질 AI 이미지 생성 프롬프트를 탐색하고 1클릭 복사 및 이미지 자동 생성 기능을 제공하는 AI 프롬프트 갤러리 도구입니다.",
        garageIdeas: "Gemini / Midjourney 연동 AI 이미지 프롬프트 마이닝 및 포스터 비주얼 디자인 파이프라인",
        quickStart: "1) opennana.com/awesome-prompt-gallery 접속 -> 2) 원하는 AI 이미지 프롬프트 스타일 선택 -> 3) 1클릭 복사 후 생성",
        pricing: "100% 완전 무료 (프롬프트 무제한 복사 및 탐색)"
      };
    }
    if (clean.includes('thedetector.ai') || clean.includes('thedetector')) {
      return {
        title: "The Detector AI (더디텍터 - AI 생성 텍스트 & 표절 감지기)", developer: "The Detector AI (더디텍터)", country: "🇺🇸 미국",
        similarModels: "GPTZero, CopyLeaks, Turnitin AI, Sapling AI, ZeroGPT", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "AI 요약 / 지식조사", tags: ["TheDetector", "AI감지기", "ChatGPT감지", "AI표절검사", "텍스트탐지", "딥페이크감지"],
        summary: "ChatGPT, Claude, Gemini 등 인공지능(AI)이 작성한 글과 문장을 정밀하게 판별해 주는 AI 생성 텍스트 감지 및 표절 검사 솔루션입니다. 학술 논문, 에세이, 블로그 포스트의 AI 작성 확률 및 패턴을 실시간 분석합니다.",
        garageIdeas: "사내 과제/서류 AI 생성률 실시간 표절 감지 파이프라인, AI 작성 마케팅 블로그 원고 오리지널리티 검증 툴",
        quickStart: "1) thedetector.ai 접속 -> 2) 검사할 텍스트 복사 및 붙여넣기 -> 3) AI 감지(Detect AI) 클릭 후 작성 확률 분석 결과 확인",
        pricing: "기본 무료 (Free Tier) / 프로 요금제 (월 구독/단단어 결제)"
      };
    }
    if (clean.includes('grok.com') || clean.includes('grok')) {
      return {
        title: "Grok (그록 by xAI - X 연동 실시간 대화형 AI 챗봇)", developer: "xAI (일론 머스크)", country: "🇺🇸 미국",
        similarModels: "ChatGPT (GPT-4o), Claude 3.5 Sonnet, DeepSeek V3, Gemini 2.0", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "LLM / 멀티모달", tags: ["Grok", "그록", "xAI", "일론머스크", "X연동", "실시간검색", "Grok3", "멀티모달LLM"],
        summary: "일론 머스크의 xAI에서 개발한 대형 언어 모델(LLM) Grok(그록)의 공식 대화형 AI 플랫폼입니다. X(구 트위터)의 실시간 소셜 데이터 연동 검색, 위트 있는 대화 스타일, 차세대 Grok-3 추론 및 멀티모달 이미지/문서 분석을 지원합니다.",
        garageIdeas: "X(트위터) 실시간 트렌드 및 유저 반응 마이닝 파이프라인, Grok API 연동 실시간 뉴스/이슈 심층 분석 파이프라인",
        quickStart: "1) grok.com 접속 및 X(트위터) 계정 로그인 -> 2) Grok-3 / Fun Mode 선택 -> 3) 실시간 질의응답 및 이미지 생성",
        pricing: "기본 무료 (Free Tier) / X Premium 구독 포함 ($8/월~) / Enterprise API 요금제"
      };
    }
    if (clean.includes('metademolab.com') || clean.includes('metademolab') || clean.includes('animateddrawings')) {
      return {
        title: "Animated Drawings by Meta AI (애니메이티드 드로잉 - 스케치 캐릭터 애니메이션 생성기)", developer: "Meta AI / FAIR (메타 AI)", country: "🇺🇸 미국",
        similarModels: "Plask AI, Luma Dream Machine, Viggle AI, Runway Gen-3, AnimateDiff", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "비디오 생성", tags: ["AnimatedDrawings", "MetaAI", "스케치애니메이션", "관절인식", "무료AI", "캐릭터움직임", "FAIR"],
        summary: "메타 AI(Meta FAIR)에서 공개한 무료 인공지능 웹 서비스입니다. 사람이 종이나 디지털로 그린 정적인 캐릭터 스케치 그림을 업로드하면 AI가 관절(Skeleton) 위치를 자동 파악하여 걷기, 춤추기, 뛰기 등 20여 가지 움직이는 애니메이션 영상으로 자동 변환해 줍니다.",
        garageIdeas: "아이들 그림/캐릭터 스케치 기반 숏폼 애니메이션 동화 영상 제작 파이프라인, 어린이 교육 현장 창의력 렌더링 툴",
        quickStart: "1) sketch.metademolab.com 접속 -> 2) 스케치 그림 파일 업로드 및 관절 포인트 조정 -> 3) 춤추기/뛰기 애니메이션 선택 후 MP4/GIF 저장",
        pricing: "100% 완전 무료 (별도 가입/결제 없이 웹에서 즉시 오픈소스 지원)"
      };
    }
    if (clean.includes('genspark.ai') || clean.includes('genspark')) {
      return {
        title: "Genspark (젠스파크 - 올인원 멀티 에이전트 AI 워크스페이스)", developer: "MainFunc (젠스파크)", country: "🇺🇸 미국",
        similarModels: "Perplexity AI, Felo AI, SearchGPT, NotebookLM, Gamma App", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "AI 요약 / 지식조사", tags: ["Genspark", "젠스파크", "멀티에이전트", "AI검색", "올인원워크스페이스", "자동문서생성", "PPT생성"],
        summary: "다양한 거대언어모델(LLM)과 전문 AI 도구를 결합한 올인원 멀티 에이전트 AI 워크스페이스 및 AI 검색 엔진입니다. 단순 검색 결과 나열을 넘어 사용자의 요구에 맞춰 실시간 맞춤형 Sparkpage, 슬라이드(PPT), 문서 작성, 데이터 분석 및 멀티모달 콘텐츠 생성을 자율적으로 수행합니다.",
        garageIdeas: "사내 실시간 시장 조사 보고서 및 IR 발표용 PPT 자동 생성 파이프라인, 멀티 LLM 교차 검증 검색 시스템 구축",
        quickStart: "1) genspark.ai 접속 및 회원가입 -> 2) 검색/문서/PPT 작성 주제 입력 -> 3) 멀티 에이전트 맞춤 결과 확인 및 내보내기",
        pricing: "기본 무료 (Free Tier) / 프로 플랜 구독 요금제"
      };
    }
    if (clean.includes('qwen.ai') || clean.includes('qwen')) {
      return {
        title: "Qwen (큐웬 by 알리바바 클라우드 - 멀티모달 LLM 챗봇)", developer: "Alibaba Cloud (알리바바 클라우드)", country: "🇨🇳 중국",
        similarModels: "ChatGPT (GPT-4o), Claude 3.5 Sonnet, DeepSeek V3, Gemini 2.0", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "LLM / 멀티모달", tags: ["Qwen", "큐웬", "알리바바Cloud", "멀티모달LLM", "오픈소스AI", "코딩/문서요약", "챗봇"],
        summary: "중국 알리바바 클라우드(Alibaba Cloud)에서 개발한 대형 언어 모델(LLM) Qwen(큐웬)의 공식 대화형 AI 챗봇 플랫폼입니다. 자연스러운 질의응답, 멀티모달 이미지 분석, 문서 요약, 번역 및 코드 작성을 지원합니다.",
        garageIdeas: "사내 글로벌 다국어 문서 자동 요약 및 번역 파이프라인, Qwen 오픈웨이트 모델 연동 프론트엔드/백엔드 코딩 보조 툴",
        quickStart: "1) chat.qwen.ai 접속 및 회원가입 -> 2) 최신 Qwen 모델 선택 -> 3) 텍스트/이미지 입력 및 실시간 대화",
        pricing: "기본 무료 (Free Tier) / 기업용 대용량 API 요금제"
      };
    }
    if (clean.includes('firefly') || clean.includes('adobe.com')) {
      return {
        title: "Adobe Firefly (어도비 파이어플라이 - 이미지 & 비주얼 생성형 AI)", developer: "Adobe (어도비)", country: "🇺🇸 미국",
        similarModels: "Midjourney, DALL-E 3, Stable Diffusion, Canva Magic Studio, Ideogram", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "이미지 생성", tags: ["AdobeFirefly", "이미지생성", "생성형채우기", "텍스트효과", "벡터AI", "Photoshop연동"],
        summary: "Adobe(어도비)의 상업적 안전성이 검증된 창작용 생성형 AI 모델입니다. 텍스트 프롬프트로 고화질 이미지 생성, 포토샵(Photoshop) 생성형 채우기(Generative Fill), 텍스트 기반 벡터 그래픽 변환 및 디자인 비주얼 생성을 지원합니다.",
        garageIdeas: "포토샵 연동 상품 배경 자동 합성 및 디자인 포스터 제작 파이프라인, AI 벡터 일러스트 아이콘 마이닝",
        quickStart: "1) firefly.adobe.com 접속 및 어도비 계정 로그인 -> 2) 텍스트 생성 / 생성형 채우기 선택 -> 3) 고화질 이미지/벡터 다운로드",
        pricing: "기본 무료 (매월 무료 생성 크레딧 제공) / Adobe Creative Cloud (CC) 포함"
      };
    }
    if (clean.includes('youtubetranscript.com') || clean.includes('youtubetranscript')) {
      return {
        title: "YouTube Transcript (유튜브 트랜스크립트 - 영상 자막 & 대본 자동 추출기)", developer: "YouTube Transcript (유튜브 트랜스크립트)", country: "🇺🇸 미국",
        similarModels: "Lilys AI, NoteGPT, Tactiq, Glasp, OpenAI Whisper", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "AI 요약 / 지식조사", tags: ["유튜브자막추출", "대본추출", "유튜브요약", "자막다운로드", "텍스트변환", "무료웹서비스"],
        summary: "유튜브 영상의 인터넷 주소(URL)를 입력하면 영상의 자막과 대본(Transcript)을 텍스트로 즉시 자동 추출하여 읽고 복사할 수 있게 돕는 무료 웹 서비스입니다.",
        garageIdeas: "유튜브 영상 대본 타임스탬프 추출 파이프라인, AI 요약 모델(Lilys/NotebookLM) 연동 자동 블로그/보고서 작성 툴",
        quickStart: "1) youtubetranscript.com 접속 -> 2) 유튜브 영상 URL 입력 -> 3) 자동 추출된 자막 대본 확인 및 텍스트 복사",
        pricing: "100% 완전 무료 (별도 가입 없이 이용 가능)"
      };
    }
    if (clean.includes('aipr.co.kr') || clean.includes('aipr')) {
      return {
        title: "AIPR (에이아이피알 - AI 보도자료 작성 & 올인원 PR 솔루션)", developer: "Wonji Labs (원지랩스)", country: "🇰🇷 대한민국",
        similarModels: "ChatGPT (GPT-4o), Claude 3.5 Sonnet, Wrtn (뤼튼), Wrtn Enterprise", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "AI 요약 / 지식조사", tags: ["AIPR", "보도자료생성", "PR솔루션", "언론홍보", "미디어매칭", "뉴스모니터링", "원지랩스"],
        summary: "인공지능 스타트업 원지랩스에서 개발한 AI 기반 올인원 PR 솔루션입니다. 핵심 주제 입력만으로 전문가 수준의 보도자료 초안을 자동 생성하고, 맞춤형 언론 매체/기자 타겟 매칭, 원클릭 배포 및 실시간 미디어 뉴스 모니터링을 지원합니다.",
        garageIdeas: "사내 신제품 출시/행사 보도자료 자동 작성 및 언론사 배포 파이프라인, AI 실시간 마케팅 뉴스 클리핑 모니터 구축",
        quickStart: "1) aipr.co.kr 접속 및 회원가입 -> 2) 보도자료 주제/문장 입력 -> 3) AI 기사 초안 생성 및 언론 매체 자동 매칭/배포",
        pricing: "기본 무료 체험 (Free Tier) / 기업용 구독 서비스"
      };
    }
    if (clean.includes('playground.com') || clean.includes('playgroundai.com') || clean.includes('playground')) {
      return {
        title: "Playground AI (플레이그라운드 AI - 비주얼 & 이미지 생성 도구)", developer: "Playground AI (플레이그라운드)", country: "🇺🇸 미국",
        similarModels: "Midjourney, Canva, Stable Diffusion, Photoroom, Ideogram", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "이미지 생성", tags: ["이미지생성", "디자인AI", "인페인트", "캔버스편집", "무료AI아트"],
        summary: "텍스트 프롬프트 입력을 기반으로 고품질 AI 그래픽, 일러스트, 캔버스 수정(인페인트/아웃페인트) 및 디자인 포스터를 생성해 주는 웹 기반 비주얼 AI 아티스트 도구입니다.",
        garageIdeas: "쇼핑몰 상품 비주얼 썸네일 자동 생성, 캔버스 인페인팅 기반 고화질 디자인 리터칭 파이프라인",
        quickStart: "1) playground.com 접속 및 계정 로그인 -> 2) 프롬프트 입력 및 스타일 필터 선택 -> 3) 고화질 이미지 생성",
        pricing: "기본 무료 (매일 1,000장 무료 생성 크레딧) / Pro 플랜 선택 가능"
      };
    }
    if (clean.includes('chatgot.io') || clean.includes('chatgot')) {
      return {
        title: "ChatGOT (챗갓 - 멀티 AI 챗봇 통합 플랫폼)", developer: "ChatGOT (챗갓)", country: "🇺🇸 미국",
        similarModels: "Poe by Quora, ChatHub, FreedomGPT, ChatGPT (GPT-4o), Claude 3.5 Sonnet", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "LLM / 멀티모달", tags: ["멀티AI", "통합챗봇", "ChatGPT", "Claude", "Gemini", "AI비교"],
        summary: "ChatGPT, Claude, Gemini 등 다양한 인공지능(AI) 모델을 한 화면에서 동시에 사용하고 교차 비교할 수 있는 통합 멀티 AI 챗봇 플랫폼 서비스입니다.",
        garageIdeas: "사내 다종 LLM 성능/답변 비교 교차 검증 파이프라인, AI 모델별 맞춤 프롬프트 벤치마킹",
        quickStart: "1) chatgot.io 접속 -> 2) 원하는 AI 모델(GPT/Claude/Gemini) 선택 -> 3) 멀티 모델 동시 대화 및 비교",
        pricing: "기본 무료 체험 (Free Tier) / 프로 플랜 구독 선택 가능"
      };
    }
    if (clean.includes('promptgenie.ai') || clean.includes('promptgenie') || clean.includes('프롬프트지니')) {
      return {
        title: "프롬프트 지니 (Prompt Genie - ChatGPT 한국어 자동 번역기)", developer: "Prompt Genie (프롬프트 지니)", country: "🇰🇷 대한민국",
        similarModels: "DeepL, Papago, ChatGPT (GPT-4o), Claude 3.5 Sonnet", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "LLM / 멀티모달", tags: ["ChatGPT번역", "크롬확장프로그램", "자동번역", "프롬프트지니", "한국어특화"],
        summary: "챗GPT(ChatGPT) 등 AI 서비스 이용 시 한국어 질문을 고성능 영어 프롬프트로 실시간 자동 번역하여 전달하고, AI의 영어 답변을 다시 한국어로 자동 번역해 주는 대한민국 대표 크롬 브라우저 확장 프로그램입니다.",
        garageIdeas: "사내 챗GPT 업무 활용성 극대화 파이프라인, 해외 LLM 연동 실시간 다국어 프롬프트 번역 및 마케팅 보조",
        quickStart: "1) 크롬 웹스토어 접속 -> 2) 프롬프트 지니 확장 프로그램 설치 -> 3) chatgpt.com에서 한국어로 프롬프트 입력",
        pricing: "100% 완전 무료 (크롬 웹스토어 무제한 지원)"
      };
    }
    if (clean.includes('aivoicestudio.ai') || clean.includes('aivoicestudio')) {
      return {
        title: "KT AI 보이스 스튜디오 (KT AI Voice Studio)", developer: "(주)케이티 (KT)", country: "🇰🇷 대한민국",
        similarModels: "Typecast, ElevenLabs, Play.ht, OpenAI Whisper", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "음성 인식 / TTS", tags: ["KT_AI보이스", "TTS", "성우더빙", "마이AI보이스", "감정음성합성", "한국어특화"],
        summary: "KT(케이티)에서 개발한 대한민국 대표 인공지능 음성 합성 서비스입니다. 100여 종 이상의 다양한 AI 목소리에 5가지 감정(즐거움, 슬픔, 화남, 침착함, 중립)을 적용할 수 있으며, 짧은 음성 녹음으로 자신의 목소리를 닮은 AI 음성을 만드는 마이 AI 보이스 및 다국어 생성을 지원합니다.",
        garageIdeas: "유튜브 숏폼/웹소설 오디오북 감정 더빙 자동화 파이프라인, 사내 안내방송 및 AI 아나운서 내레이션 제작",
        quickStart: "1) aivoicestudio.ai 접속 및 KT 계정 로그인 -> 2) 텍스트 입력 및 감정/성우 선택 -> 3) MP3/WAV 오디오 다운로드",
        pricing: "기본 무료 체험 / 사용량 및 요금제 별도 (일부 유료 옵션)"
      };
    }
    if (clean.includes('runwayml.com') || clean.includes('runway')) {
      return {
        title: "Runway (런웨이 / Gen-2 & Gen-3 Alpha)", developer: "Runway AI Inc.", country: "🇺🇸 미국",
        similarModels: "Luma Dream Machine, Kling AI, Sora (OpenAI), Pika Labs", serviceUrl: "https://runwayml.com/", docsUrl: "https://runwayml.com/",
        category: "비디오 생성", tags: ["비디오생성", "영상AI", "텍스트to비디오", "이미지to비디오", "크리에이터필수"],
        summary: "현존 최고의 생성형 AI 비디오 플랫폼. Gen-3 Alpha 모델을 통해 프롬프트 텍스트나 단 한 장의 이미지로 영화급 4K 비디오 씬과 애니메이션 연출을 자동 생성합니다.",
        garageIdeas: "유튜브 숏폼 및 광고 홍보 영상 자동 생성 파이프라인, 특수효과 Vfx 프로토타이핑 툴",
        quickStart: "1) runwayml.com 접속 및 회원가입 -> 2) Gen-3 Alpha / Text to Video 선택 -> 3) 프롬프트 입력 후 비디오 생성",
        pricing: "기본 무료 크레딧 (월 125크레딧) / Standard ($12/월) / Pro ($28/월)"
      };
    }
    if (clean.includes('typecast.ai') || clean.includes('typecast') || clean.includes('neosapience')) {
      return {
        title: "타입캐스트 (Typecast by Neosapience)", developer: "Neosapience (네오사피엔스)", country: "🇰🇷 대한민국",
        similarModels: "ElevenLabs, Suno AI, Play.ht, Typecast", serviceUrl: "https://typecast.ai/", docsUrl: "https://typecast.ai/",
        category: "음성 인식 / TTS", tags: ["AI보이스", "TTS", "성우합성", "유튜브더빙", "한국어특화", "가상인간"],
        summary: "네오사피엔스에서 개발한 대한민국 대표 감정 음성 합성 및 AI 보이스/가상 인간 비디오 생성 플랫폼입니다. 500개 이상의 다양한 연령·감정의 AI 성우 목소리를 제공하며 오디오북, 유튜브 더빙, 교육 콘텐츠 제작에 특화되어 있습니다.",
        garageIdeas: "유튜브 숏폼 및 오디오북 음성 자동 더빙 파이프라인, AI 아나운서 사내 방송 제작 툴",
        quickStart: "1) typecast.ai 접속 및 회원가입 -> 2) 텍스트 입력 및 AI 성우/감정 선택 -> 3) 음성(MP3/WAV) 다운로드",
        pricing: "기본 무료 (월 10분 무료 다운로드) / 베이직 (19,900원/월) / 프로 (49,900원/월)"
      };
    }
    if (clean.includes('vidnoz.com') || clean.includes('vidnoz')) {
      return {
        title: "Vidnoz AI (비드노즈 / AI 음성 TTS & 아바타 비디오)", developer: "Vidnoz", country: "🇺🇸 미국",
        similarModels: "ElevenLabs, Typecast, Play.ht, Synthesia, HeyGen", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "음성 인식 / TTS", tags: ["TTS", "AI보이스", "음성합성", "다국어TTS", "AI아바타"],
        summary: "140개 이상의 다국어 감정 보이스 음성 합성(TTS) 및 AI 디지털 아바타 비디오 생성을 지원하며, 텍스트 입력만으로 고품질 음성 및 영상 콘텐츠를 자유롭게 자동 생성하는 AI 플랫폼입니다.",
        garageIdeas: "음성 회의록 요약기, 오디오 텍스트 변환 및 AI 보이스 다국어 더빙 파이프라인, AI 아나운서 홍보 툴",
        quickStart: "1) vidnoz.com 접속 -> 2) 텍스트 음성 변환(TTS) 입력 -> 3) 보이스 성우 선택 후 음성 다운로드",
        pricing: "기본 무료 체험 (일일 무료 생성) / Premium 구독 ($9.99~$29.99/월)"
      };
    }
    if (clean.includes('prompts3.com') || clean.includes('prompts3')) {
      return {
        title: "prompts3 - 프롬프트3 (한국어 AI 이미지 프롬프트 라이브러리)", developer: "prompts3.com", country: "🇰🇷 대한민국",
        similarModels: "PromptHero, Midjourney, Craiyon, ChatGPT, Canva", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "이미지 생성", tags: ["AI프롬프트", "이미지생성", "ChatGPT프롬프트", "카드뉴스", "디자인AI"],
        summary: "ChatGPT와 Gemini용 한국어 AI 이미지 프롬프트를 검색하고 복사하여 카드뉴스, 썸네일, 포스터, 굿즈 제작에 활용할 수 있는 한국어 프롬프트 라이브러리 플랫폼입니다.",
        garageIdeas: "ChatGPT/Midjourney 연동 AI 이미지 프롬프트 자동 마이닝 및 카드뉴스/포스터 제작 파이프라인",
        quickStart: "1) prompts3.com 접속 -> 2) 원하는 AI 이미지 프롬프트 탐색 -> 3) 복사 후 ChatGPT / Midjourney 적용",
        pricing: "100% 완전 무료 프롬프트 탐색 및 복사"
      };
    }
    if (clean.includes('localbanana.io') || clean.includes('localbanana')) {
      return {
        title: "LocalBanana (로컬바나나 / Nano Banana & AI 이미지 프롬프트)", developer: "localbanana.io", country: "🇺🇸 미국",
        similarModels: "PromptHero, Midjourney, Craiyon, ChatGPT, Canva", serviceUrl: targetUrl, docsUrl: targetUrl,
        category: "이미지 생성", tags: ["이미지생성", "NanoBanana", "AI프롬프트", "디자인AI", "프롬프트갤러리"],
        summary: "Nano Banana(Gemini), GPT Image, Midjourney용 최신 AI 이미지 프롬프트를 탐색하고 즉시 복사 및 이미지 자동 생성 기능을 제공하는 글로벌 프롬프트 갤러리 플랫폼입니다.",
        garageIdeas: "Gemini / Midjourney 연동 AI 이미지 프롬프트 자동 마이닝 및 카드뉴스/포스터 비주얼 디자인 파이프라인",
        quickStart: "1) localbanana.io 접속 -> 2) 스타일별 AI 이미지 프롬프트 탐색 -> 3) 1클릭 복사 후 이미지 생성기 적용",
        pricing: "기본 무료 탐색 및 복사 / 이미지 자동 생성 크레딧 지원"
      };
    }
    if (clean.includes('play.ht') || clean.includes('playht')) {
      return {
        title: "Play.ht (고품질 AI 음성합성 & 보이스 클로닝)", developer: "Play.ht", country: "🇺🇸 미국",
        similarModels: "ElevenLabs, Typecast, Suno AI, OpenAI Whisper", serviceUrl: "https://play.ht/", docsUrl: "https://play.ht/docs",
        category: "음성 인식 / TTS", tags: ["TTS", "보이스클로닝", "팟캐스트생성", "AI성우", "API연동"],
        summary: "실시간 보이스 클로닝 및 초고품질 다국어 음성 합성을 지원하며 팟캐스트, 오디오북, 웹사이트 음성 읽기 플러그인과 REST API를 제공하는 온디맨드 AI 보이스 도구입니다.",
        garageIdeas: "웹사이트 블로그 글 자동 오디오북 변환 파이프라인, 해외 마케팅 영상 다국어 보이스 더빙",
        quickStart: "1) play.ht 가입 -> 2) 텍스트 입력 및 성우 선택 -> 3) 오디오 파일 생성 또는 API 호출",
        pricing: "기본 무료 (월 12,500자 무료) / Creator ($31.20/월) / Pro ($99/월)"
      };
    }
    if (clean.includes('civitai.com') || clean.includes('civitai')) {
      return {
        title: "Civitai (씨비타이 / SD 오픈소스 모델 공유 플랫폼)", developer: "Civitai", country: "🇺🇸 미국",
        similarModels: "Hugging Face, PromptHero, Tensor.Art", serviceUrl: "https://civitai.com/", docsUrl: "https://civitai.com/",
        category: "오픈소스 / 온디바이스", tags: ["StableDiffusion", "LoRA모델", "오픈소스AI", "체크포인트", "커뮤니티"],
        summary: "Stable Diffusion, Flux 등 오픈소스 AI 이미지/비디오 생성 모델, LoRA, 체크포인트를 자유롭게 탐색하고 다운로드할 수 있는 전 세계 최대의 AI 모델 공유 커뮤니티입니다.",
        garageIdeas: "사내 맞춤형 스타일 LoRA 모델 수집 및 로컬 이미지 생성 서버 연동 파이프라인",
        quickStart: "1) civitai.com 접속 -> 2) 원하는 AI 캐릭터/스타일 LoRA 탐색 -> 3) 다운로드 후 WebUI / ComfyUI 적용",
        pricing: "100% 무료 모델 다운로드 / Supporter 구독 ($5/월 - 속도 우대 및 찌르기 버즈 제공)"
      };
    }
    if (clean.includes('notebooklm')) {
      return {
        title: "NotebookLM (구글 노트북LM / RAG 지식 분석)", developer: "Google", country: "🇺🇸 미국",
        similarModels: "Lilys AI, Perplexity, Kapa AI, Claude 3.5 Sonnet", serviceUrl: "https://notebooklm.google.com/", docsUrl: "https://notebooklm.google.com/",
        category: "AI 요약 / 지식조사", tags: ["RAG", "PDF노트", "오디오팟캐스트", "GoogleGemini", "무료AI"],
        summary: "사용자가 업로드한 PDF, 문서, 웹페이지 텍스트만을 기반으로 할루시네이션(환각) 없는 답변과 요약, 심지어 2인 오디오 팟캐스트 대화 음성까지 자동 생성해 주는 구글의 맞춤형 RAG 지식 노드입니다.",
        garageIdeas: "대용량 매뉴얼/논문 기반 사내 스마트 Q&A 챗봇, 오디오 팟캐스트 브리핑 생성기",
        quickStart: "1) notebooklm.google.com 접속 -> 2) 새 노트북 생성 후 PDF/링크 업로드 -> 3) 질문 및 오디오 브리핑 생성",
        pricing: "100% 완전 무료 (Google 계정 전용)"
      };
    }

    if (clean.includes('pixlr.com') || clean.includes('pixlr')) {
      return {
        title: "픽슬러 (Pixlr / 웹 기반 AI 사진 편집기)", developer: "Inmagine / Pixlr", country: "🇸🇬 싱가포르 / 🇺🇸 미국",
        similarModels: "Canva, Adobe Photoshop (Firefly), Canva AI, Remove.bg", serviceUrl: "https://pixlr.com/kr/", docsUrl: "https://pixlr.com/kr/",
        category: "이미지 생성", tags: ["사진편집", "포토샵대체", "AI배경제거", "무료온라인편집", "디자인도구"],
        summary: "별도의 프로그램 설치 없이 웹 브라우저에서 사진을 편집하고 디자인할 수 있는 무료 온라인 AI 사진 편집기 및 디자인 도구입니다. 원클릭 AI 배경 제거(누끼), 불필요한 개체 지우기, AI 이미지 생성 및 확장 기능을 제공합니다.",
        garageIdeas: "웹 기반 사진 자동 보정 및 AI 배경 제거(누끼) 파이프라인, SNS 및 블로그 홍보용 디자인 포스터 제작",
        quickStart: "1) pixlr.com/kr/ 접속 -> 2) Pixlr Express(간편) 또는 Pixlr Editor(전문가) 선택 -> 3) 이미지 업로드 후 AI 배경 제거 및 편집",
        pricing: "기본 무료 (웹 편집 및 기본 AI 도구) / Premium ($0.99~$4.90/월 - 무제한 AI 생성 및 고해상도 저장)"
      };
    }
    if (clean.includes('copilot.microsoft.com') || clean.includes('copilot')) {
      return {
        title: "Microsoft Copilot (마이크로소프트 코파일럿)", developer: "Microsoft", country: "🇺🇸 미국",
        similarModels: "ChatGPT (GPT-4o), Google Gemini, Claude 3.5 Sonnet", serviceUrl: "https://copilot.microsoft.com/", docsUrl: "https://copilot.microsoft.com/",
        category: "LLM / 멀티모달", tags: ["Microsoft연동", "GPT4o기반", "DALLE3이미지", "Office연동", "무료/구독"],
        summary: "마이크로소프트의 종합 AI 비서. GPT-4o 대화 및 DALL-E 3 이미지 생성, Bing 웹 실시간 검색을 결합하여 Windows 및 Microsoft 365(Word, Excel 등) 생태계와 긴밀히 연동됩니다.",
        garageIdeas: "Windows 업무용 문서 및 이메일 자동화 보조, Edge 브라우저 웹페이지 실시간 분석 및 요약",
        quickStart: "1) copilot.microsoft.com 또는 Windows 키+C 접속 -> 2) Microsoft 계정 로그인 -> 3) 텍스트 대화 또는 이미지 생성 요청 (Pro 구독 시 365 앱 연동)",
        pricing: "기본 무료 (웹/앱 무료 이용) / Copilot Pro ($20/월 - Microsoft 365 연동 및 우선 액세스)"
      };
    }
    if (clean.includes('huggingface.co') || clean.includes('huggingface')) {
      return {
        title: "허깅페이스 (Hugging Face / AI 분야의 GitHub)", developer: "Hugging Face Inc.", country: "🇫🇷 프랑스 / 🇺🇸 미국",
        similarModels: "GitHub, Kaggle, Ollama, Replicate", serviceUrl: "https://huggingface.co/", docsUrl: "https://huggingface.co/docs",
        category: "오픈소스 / 온디바이스", tags: ["오픈소스", "AI허브", "데이터셋", "트랜스포머", "모델호스팅"],
        summary: "전 세계 개발자와 연구자들이 AI/머신러닝 모델, 데이터셋, 웹 데모(Spaces)를 공유하고 협업하는 'AI 분야의 깃허브(GitHub)'이자 오픈소스 커뮤니티입니다. 최신 LLM 및 비주얼 모델을 무료 다운로드하고 미세조정(Fine-tuning)할 수 있는 표준 플랫폼입니다.",
        garageIdeas: "오픈소스 LLM 모델 다운로드 및 로컬 Fine-tuning 파이프라인, HuggingFace Spaces 기반 AI 데모 앱 호스팅",
        quickStart: "1) huggingface.co 접속 및 회원가입 -> 2) Models/Datasets 탭에서 원하는 오픈소스 AI 탐색 -> 3) Python transformers 라이브러리로 모델 불러오기",
        pricing: "기본 무료 (모델/데이터셋 무료 공개) / 유료 컴퓨팅 (Pro $9/월, Enterprise Hub & Inference API 사용량 기반)"
      };
    }
    if (clean.includes('lilys.ai') || clean.includes('lilys')) {
      return {
        title: "릴리스 AI (Lilys AI)", developer: "Lilys (릴리스)", country: "🇰🇷 대한민국",
        similarModels: "NotebookLM, Perplexity, Wrtn, Claude 3.5", serviceUrl: "https://lilys.ai/", docsUrl: "https://lilys.ai/",
        category: "AI 요약 / 지식조사", tags: ["유튜브요약", "PDF요약", "노트생성", "한국어특화", "무료/구독"],
        summary: "유튜브 영상, 오디오 녹음, PDF 문서, 웹페이지를 몇 초 만에 핵심 요약 노트, 타임스탬프, 블로그 글 형태 및 마인드맵으로 자동 변환해 주는 대한민국 대표 AI 요약 서비스입니다.",
        garageIdeas: "유튜브 기술 강의 자동 요약 및 학습 노트 생성기, 대용량 PDF 보고서 핵심 요약 파이프라인",
        quickStart: "1) lilys.ai 접속 및 회원가입 -> 2) 유튜브 URL 또는 PDF 파일 업로드 -> 3) 요점 정리, 타임스탬프, 스크립트 자동 생성 확인",
        pricing: "기본 무료 (월 무료 크레딧 제공) / Pro 구독 ($9.9/월~)"
      };
    }
    if (clean.includes('craiyon.com') || clean.includes('craiyon.net') || clean.includes('dall-e-mini') || clean.includes('craiyon')) {
      return {
        title: "Craiyon (크레이욘 / 구 DALL-E mini)", developer: "Craiyon LLC", country: "🇺🇸 미국",
        similarModels: "Midjourney, Stable Diffusion, DALL-E 3, Ideogram", serviceUrl: "https://www.craiyon.com/", docsUrl: "https://www.craiyon.com/",
        category: "이미지 생성", tags: ["이미지생성", "무료AI", "DALLEmini", "텍스트to이미지", "무가입"],
        summary: "사용자가 입력한 텍스트 문장을 그림이나 사진 같은 시각 자료로 바꿔주는 무료 인공지능(AI) 이미지 생성 도구입니다. 원래 이름은 DALL-E mini였으나 현재의 이름으로 바뀌었습니다. 복잡한 가입 없이 한 번에 9장의 이미지를 동시 생성합니다.",
        garageIdeas: "블로그/SNS 썸네일 이미지 자동 생성, 아이디어 시각화 스케치, 웹/앱 프로토타입 그래픽 리소스 제작",
        quickStart: "1) craiyon.com 접속 -> 2) 프롬프트(영문) 입력 및 스타일(Art/Drawing/Photo) 선택 -> 3) Draw 클릭 후 9장 중 선택 및 다운로드",
        pricing: "기본 무료 (웹 9장 생성, 광고 포함) / 유료 구독 (빠른 생성, 고해상도, 워터마크 제거)"
      };
    }
    if (clean.includes('wrtn.ai') || clean.includes('wrtn.io')) {
      return {
        title: "뤼튼 (Wrtn.ai)", developer: "뤼튼테크놀로지스", country: "🇰🇷 대한민국",
        similarModels: "ChatGPT, Claude 3.5 Sonnet, Perplexity", serviceUrl: "https://wrtn.ai/", docsUrl: "https://wrtn.ai/",
        category: "LLM / 멀티모달", tags: ["한국어특화", "무료GPT4o", "AI포털", "뤼튼Studio"],
        summary: "대한민국 1위 대중적 AI 포털. GPT-4o, Claude 3.5 Sonnet 등 최신 최고급 LLM을 100% 무료 무제한으로 사용할 수 있는 한국어 특화 AI 서비스입니다.",
        garageIdeas: "뤼튼 스튜디오 기반 프롬프트 툴 제작, 한국어 업무 문서 자동화, 무제한 AI 아이디어 스톰",
        quickStart: "1) wrtn.ai 접속 및 카카오/구글 간편가입 -> 2) GPT-4o / Claude 3.5 모델 선택 후 대화 -> 3) 뤼튼 스튜디오로 나만의 AI 툴 제작",
        pricing: "100% 완전 무료 (GPT-4o, Claude 3.5 Sonnet 무제한 제공)"
      };
    }
    if (clean.includes('perplexity.ai')) {
      return {
        title: "Perplexity AI", developer: "Perplexity", country: "🇺🇸 미국",
        similarModels: "Genspark, SearchGPT, Google Gemini", serviceUrl: "https://www.perplexity.ai/", docsUrl: "https://docs.perplexity.ai/",
        category: "AI 검색 / 지식조사", tags: ["실시간검색", "출처명시", "학술조사", "무료/구독"],
        summary: "전 세계 실시간 웹 정보를 검색하여 명확한 출처 각주와 함께 논리적인 조사 보고서를 작성해 주는 최첨단 AI 대화형 검색엔진입니다.",
        garageIdeas: "최신 기술 동향 자동 조사 리포터, 논문/뉴스 실시간 수집 및 요약 RAG 서비스",
        quickStart: "1) perplexity.ai 접속 -> 2) 검색창에 궁금한 최신 이슈 질문 -> 3) Pro 플랜 이용 시 Claude 3.5 / GPT-4o 선택",
        pricing: "기본 검색 무료 / Pro 구독 ($20/월 - 프리미엄 모델 선택 제공)"
      };
    }
    if (clean.includes('gemini.google') || clean.includes('bard.google') || clean.includes('ai.google.dev')) {
      return {
        title: "Google Gemini", developer: "Google", country: "🇺🇸 미국",
        similarModels: "ChatGPT (GPT-4o), Claude 3.5 Sonnet", serviceUrl: "https://gemini.google.com/", docsUrl: "https://ai.google.dev/docs",
        category: "LLM / 멀티모달", tags: ["Google연동", "멀티모달", "실시간정보", "무료/구독"],
        summary: "구글의 최신 멀티모달 AI로, Google 드라이브, 유튜브, 지도, Workspace 생태계와 강력하게 연동되는 종합 비서입니다.",
        garageIdeas: "유튜브 영상 내용 자동 요약 및 퀴즈 생성기, Google Workspace 이메일/문서 자동화 툴",
        quickStart: "1) Google 계정으로 gemini.google.com 접속 -> 2) 즉시 무료 사용 -> 3) Advanced 구독 시 2.0 Flash/Pro 확장 이용",
        pricing: "무료 기본 플랜 / Gemini Advanced (구글 원 AI 프리미엄 $19.99/월)"
      };
    }
    if (clean.includes('chatgpt.com') || clean.includes('chat.openai.com')) {
      return {
        title: "ChatGPT (OpenAI)", developer: "OpenAI", country: "🇺🇸 미국",
        similarModels: "Claude 3.5 Sonnet, Gemini 2.0, DeepSeek R1", serviceUrl: "https://chatgpt.com/", docsUrl: "https://help.openai.com/",
        category: "LLM / 멀티모달", tags: ["LLM", "대화형AI", "글쓰기", "코드생성", "멀티모달", "무료/구독"],
        summary: "대화형 AI의 대명사. 텍스트 대화, 문서 분석, 이미지 생성(DALL-E 3), 실시간 음성 대화까지 처리하는 만능 AI 비서입니다.",
        garageIdeas: "개인 전용 커스텀 GPTs 챗봇 제작, 업무용 이메일/보고서 자동 작성기, 아이디어 스톰 도구",
        quickStart: "1) chatgpt.com 가입 -> 2) 웹/앱에서 대화 시작 (무료로 GPT-4o 사용 가능) -> 3) Plus 구독($20/월) 또는 GPTs 커스텀 활용",
        pricing: "기본 무료 (GPT-4o 제한적 제공) / Plus 구독 ($20/월) / 개발자 API 별도"
      };
    }
    if (clean.includes('claude.ai') || clean.includes('anthropic.com')) {
      return {
        title: "Claude 3.5 Sonnet (Anthropic)", developer: "Anthropic", country: "🇺🇸 미국",
        similarModels: "ChatGPT (GPT-4o), Gemini 1.5 Pro, DeepSeek R1", serviceUrl: "https://claude.ai/", docsUrl: "https://docs.anthropic.com/",
        category: "LLM / 코딩", tags: ["LLM", "코딩강자", "긴문맥분석", "Artifacts", "무료/구독"],
        summary: "현존 최고의 코딩 능력과 정교한 한국어 문장력, Artifacts 실시간 컴포넌트 시각화 기능으로 개발자와 기획자에게 호평받는 LLM입니다.",
        garageIdeas: "웹 컴포넌트 실시간 프론트엔드 제작, 대용량 논문/개발서적 요약기, 자동 코드 리뷰 보조 도구",
        quickStart: "1) claude.ai 가입 -> 2) 웹 화면에서 프롬프트 작성 -> 3) Artifacts 뷰로 실시간 웹페이지/차트 생성 확인 (Pro 구독 $20/월)",
        pricing: "무료 플랜 제공 / Pro 구독 ($20/월) / API 사용료 별도"
      };
    }
    if (clean.includes('midjourney.com')) {
      return {
        title: "Midjourney v6", developer: "Midjourney", country: "🇺🇸 미국",
        similarModels: "Stable Diffusion, Flux.1, DALL-E 3", serviceUrl: "https://www.midjourney.com/", docsUrl: "https://docs.midjourney.com/",
        category: "이미지 생성", tags: ["이미지생성", "실사/아트워크", "디자이너필수", "구독전용"],
        summary: "프롬프트 텍스트만으로 영화 콘셉트 아트, 실사급 사진, 그래픽 일러스트를 최고 품질로 생성하는 생성형 비주얼 AI입니다.",
        garageIdeas: "앱/웹 서비스 비주얼 배너 생성, 게임 콘셉트 아티팩트 제작, 브랜딩 로고 아이디어 시각화",
        quickStart: "1) midjourney.com 접속 또는 디스코드(Discord) 채널 입장 -> 2) /imagine 프롬프트 명령어로 이미지 생성 -> 3) U/V 버튼으로 업스케일ing",
        pricing: "유료 구독 전용 (Basic $10/월 ~ Standard $30/월)"
      };
    }
    if (clean.includes('ollama.com')) {
      return {
        title: "Ollama (온디바이스 / 로컬 AI)", developer: "Ollama / Meta", country: "🇺🇸 미국 / 오픈소스",
        similarModels: "LM Studio, vLLM, Text Generation WebUI", serviceUrl: "https://ollama.com/", docsUrl: "https://github.com/ollama/ollama",
        category: "오픈소스 / 온디바이스", tags: ["로컬AI", "100%무료", "개인정보보호", "오픈소스"],
        summary: "내 컴퓨터 터미널에서 Llama 3, DeepSeek, Qwen 등 최신 오픈소스 LLM을 외부 서버 전송 없이 100% 오프라인으로 실행하는 런타임입니다.",
        garageIdeas: "오프라인 사내 보안 챗봇, 로컬 문서 RAG 검색 시스템, 개인 개발용 튜닝 LLM 환경",
        quickStart: "1) ollama.com에서 OS별 설치 파일 다운로드 -> 2) 터미널에서 'ollama run llama3' 실행 -> 3) localhost:11434 REST API 연동",
        pricing: "100% 완전 무료 (오픈소스 런타임)"
      };
    }
    if (clean.includes('deepseek.com')) {
      return {
        title: "DeepSeek V3 / R1", developer: "DeepSeek", country: "🇨🇳 중국",
        similarModels: "ChatGPT (GPT-4o), Qwen 2.5, Llama 3", serviceUrl: "https://chat.deepseek.com/", docsUrl: "https://platform.deepseek.com/docs",
        category: "LLM / 추론전문", tags: ["추론특화", "오픈소스", "압도적가성비", "수학/코딩"],
        summary: "수학적 추론과 복잡한 문제 해결, 코드 생성 능력이 뛰어나며 압도적인 가성비와 오픈소스 모델 제공으로 폭발적 인기를 얻고 있는 LLM입니다.",
        garageIdeas: "복잡한 수학 문제 풀이 및 자율 알고리즘 생성기, 가성비 최강 자동화 AI 에이전트",
        quickStart: "1) chat.deepseek.com 무료 가입 후 대화 -> 2) API 키 발급 시 OpenAI 호환 엔드포인트로 기존 코드에 바로 교체 적용",
        pricing: "웹챗 무료 제공 / API 사용료 매우 저렴 (OpenAI 대비 1/10 수준)"
      };
    }
    if (clean.includes('poe.com')) {
      return {
        title: "Poe (Quora AI 봇 플랫폼)", developer: "Quora", country: "🇺🇸 미국",
        similarModels: "ChatGPT, Wrtn, TypingMind", serviceUrl: "https://poe.com/", docsUrl: "https://developer.poe.com/",
        category: "LLM / 멀티모달", tags: ["멀티봇포털", "커스텀봇제작", "멀티LLM", "무료/구독"],
        summary: "GPT-4o, Claude 3.5, Llama 3, Midjourney 등 세계 주요 AI 모델들을 한곳에서 비교하고 나만의 봇을 손쉽게 만드는 AI 봇 멀티 포털입니다.",
        garageIdeas: "커스텀 지식 기반 AI 봇 개발, 멀티 LLM 교차 비교 서비스 파이프라인",
        quickStart: "1) poe.com 가입 -> 2) 원하는 AI 봇(Claude/GPT) 선택 후 대화 -> 3) Create Bot으로 나만의 프롬프트 봇 제작",
        pricing: "매일 무료 포인트 제공 / Subscriptions ($19.99/월)"
      };
    }
    if (clean.includes('cursor.com') || clean.includes('cursor.sh')) {
      return {
        title: "Cursor AI Code Editor", developer: "Anysphere", country: "🇺🇸 미국",
        similarModels: "GitHub Copilot, Windsurf, Replit", serviceUrl: "https://www.cursor.com/", docsUrl: "https://docs.cursor.com/",
        category: "LLM / 코딩", tags: ["AI코드에디터", "VSCode기반", "자동코드생성", "개발자필수"],
        summary: "VS Code 기반 차세대 AI 에디터로, 프로젝트 전체 소스코드를 파악하여 코드 생성, 버그 디버깅, 리팩토링을 자동화합니다.",
        garageIdeas: "전체 풀스택 프로젝트 소스코드 자동 생성, 버그 및 테스트코드 자동화",
        quickStart: "1) cursor.com에서 에디터 다운로드 -> 2) 기존 VS Code 설정 가져오기 -> 3) Cmd+K / Cmd+I로 코드 작성",
        pricing: "무료 플랜 (월 200회 빠른 요청) / Pro ($20/월)"
      };
    }
    if (clean.includes('v0.dev')) {
      return {
        title: "v0 by Vercel", developer: "Vercel", country: "🇺🇸 미국",
        similarModels: "Bolt.new, Claude Artifacts, Lovable", serviceUrl: "https://v0.dev/", docsUrl: "https://v0.dev/docs",
        category: "LLM / 코딩", tags: ["React생성", "TailwindCSS", "UI디자인", "무료/구독"],
        summary: "프롬프트 텍스트만으로 모던 React 및 Tailwind CSS UI 컴포넌트를 실시간으로 생성하고 코드 복사 및 배포를 지원하는 AI UI 도구입니다.",
        garageIdeas: "웹 랜딩페이지 실시간 시각화 생성, 컴포넌트 라이브러리 제작",
        quickStart: "1) v0.dev 접속 및 Vercel 로그인 -> 2) 원하는 UI 프롬프트 입력 -> 3) Code 복사 후 붙여넣기",
        pricing: "매월 무료 크레딧 제공 / Premium ($20/월)"
      };
    }
    if (clean.includes('bolt.new')) {
      return {
        title: "Bolt.new (Fullstack WebContainer)", developer: "StackBlitz", country: "🇺🇸 미국",
        similarModels: "v0.dev, Replit, Lovable", serviceUrl: "https://bolt.new/", docsUrl: "https://bolt.new/",
        category: "LLM / 코딩", tags: ["브라우저풀스택", "웹앱자동생성", "NodeJS실행", "무료/구독"],
        summary: "브라우저 내부에서 Node.js 웹서버 및 풀스택 웹앱을 즉시 실행하고 배포까지 프롬프트 하나로 해결하는 차세대 AI 개발 환경입니다.",
        garageIdeas: "풀스택 웹앱 5분 만에 프로토타이핑 및 배포 파이프라인",
        quickStart: "1) bolt.new 접속 -> 2) 만들고 싶은 웹앱 설명 입력 -> 3) 실시간 실행 화면 확인 후 Deploy 배포",
        pricing: "무료 일일 토큰 제공 / Pro ($20/월)"
      };
    }
    if (clean.includes('suno.com') || clean.includes('suno.ai')) {
      return {
        title: "Suno AI (음악 생성)", developer: "Suno", country: "🇺🇸 미국",
        similarModels: "Udio, Stable Audio", serviceUrl: "https://suno.com/", docsUrl: "https://suno.com/",
        category: "음악 / 오디오 생성", tags: ["음악생성", "작곡/보컬", "텍스트to뮤직", "무료/구독"],
        summary: "장르와 가사를 입력하면 30초 만에 완벽한 보컬과 반주가 포함된 고품질 곡을 만들어 주는 AI 음악 창작 도구입니다.",
        garageIdeas: "게임/웹 서비스 BGM 및 효과음 자동 생성, 유튜브 배경음악 라이브러리 구축",
        quickStart: "1) suno.com 가입 -> 2) Create 메뉴에서 가사와 장르 입력 -> 3) 30초 만에 음원 완성",
        pricing: "매일 무료 크레딧 제공 / Pro 구독 ($10/월 ~ $30/월 상업적 이용)"
      };
    }
    if (clean.includes('elevenlabs.io')) {
      return {
        title: "ElevenLabs (고품질 TTS / 음성클로닝)", developer: "ElevenLabs", country: "🇺🇸 미국 / 🇵🇱 폴란드",
        similarModels: "OpenAI Whisper, PlayHT, Typecast", serviceUrl: "https://elevenlabs.io/", docsUrl: "https://elevenlabs.io/docs",
        category: "음성 인식 / TTS", tags: ["음성합성", "TTS", "보이스클로닝", "무료/구독"],
        summary: "사람과 구별하기 힘들 정도의 감정과 억양이 살아있는 감성적인 목소리를 생성하고 내 목소리를 클로닝해 주는 TTS AI입니다.",
        garageIdeas: "오디오북 제작 프로그램, 유튜브 숏폼 더빙 자동화, AI 아나운서/NPC 음성 연동",
        quickStart: "1) elevenlabs.io 가입 -> 2) Speech Synthesis에서 텍스트와 성우 선택 후 생성 -> 3) API 연동",
        pricing: "무료 플랜 (월 1만자) / Starter ($5/월) / Creator ($22/월)"
      };
    }
    if (clean.includes('ideogram.ai')) {
      return {
        title: "Ideogram 2.0", developer: "Ideogram", country: "🇨🇦 캐나다",
        similarModels: "Midjourney, DALL-E 3, Flux.1", serviceUrl: "https://ideogram.ai/", docsUrl: "https://ideogram.ai/",
        category: "이미지 생성", tags: ["이미지생성", "텍스트렌더링특화", "포스터/로고", "무료/구독"],
        summary: "이미지 내부 선명한 텍스트 렌더링(글자 표기) 분야에서 세계 최고 성능을 자랑하는 이미지 생성 AI입니다.",
        garageIdeas: "포스터, 타이포그래피 로고, 굿즈 그래픽 디자인 자동 생성",
        quickStart: "1) ideogram.ai 가입 -> 2) 프롬프트와 원하는 글자 입력 -> 3) 스타일 선택 후 이미지 창작",
        pricing: "매일 10개 무료 크레딧 제공 / Basic ($7/월) ~ Plus ($16/월)"
      };
    }
    if (clean.includes('flux.1') || clean.includes('blackforestlabs.ai') || clean.includes('fal.ai')) {
      return {
        title: "FLUX.1 (Black Forest Labs)", developer: "Black Forest Labs", country: "🇩🇪 독일",
        similarModels: "Midjourney v6, Stable Diffusion 3", serviceUrl: "https://blackforestlabs.ai/", docsUrl: "https://blackforestlabs.ai/",
        category: "이미지 생성", tags: ["오픈웨이트", "실사급비주얼", "차세대이미지", "무료/API"],
        summary: "구 Stable Diffusion 핵심 연구진이 만든 차세대 최고화질 비주얼 AI로, 압도적인 손가락 묘사와 실사 질감을 제공합니다.",
        garageIdeas: "게임/영화 콘셉트 아트 제작, 브랜드 비주얼 렌더링 파이프라인",
        quickStart: "1) fal.ai 또는 Replicate에서 FLUX.1 체험 -> 2) ComfyUI 로컬 설치 후 FLUX.1 Schnell 무료 사용",
        pricing: "Schnell 모델 오픈소스 무료 / Dev & Pro API 크레딧 전용"
      };
    }

    // Universal Smart Exception Engine: 어떤 URL이 입력되어도 100% 정상 스마트 예외 카드가 자동 생성됩니다.
    let hostClean = clean.replace(/https?:\/\//i, '').split('/')[0].replace(/^www\./i, '');
    let hostParts = hostClean.split('.');
    let brandName = hostParts.length > 1 ? hostParts[hostParts.length - 2] : hostClean;
    if (brandName.length > 0) {
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    } else {
      brandName = "AI Service";
    }

    let country = "🇺🇸 미국";
    if (clean.includes('.kr') || clean.includes('naver') || clean.includes('kakao')) country = "🇰🇷 대한민국";
    else if (clean.includes('.cn')) country = "🇨🇳 중국";
    else if (clean.includes('.fr')) country = "🇫🇷 프랑스";
    else if (clean.includes('.de')) country = "🇩🇪 독일";

    return {
      title: `${brandName} (웹 기반 인공지능 AI 서비스)`,
      developer: `${brandName}`,
      country: country,
      similarModels: "ChatGPT (GPT-4o), Claude 3.5 Sonnet, Gemini 2.0, DeepSeek V3",
      serviceUrl: targetUrl,
      docsUrl: targetUrl,
      category: "LLM / 멀티모달",
      tags: [brandName, "AI솔루션", "생성형AI", "업무자동화"],
      summary: `입력하신 서비스(${targetUrl})는 프롬프트 텍스트 및 멀티모달 데이터를 처리하여 업무 생산성 및 작업 자동화를 지원하는 AI 플랫폼입니다.`,
      garageIdeas: `${brandName} 기반 실무 업무 프로세스 자동화 파이프라인 및 데이터 연동 툴`,
      quickStart: `1) 공식 웹사이트(${targetUrl}) 접속 및 회원가입 -> 2) 제공 기능 선택 -> 3) 업무 연동 적용`,
      pricing: "기본 무료 체험 (Free Tier) / 요금제 지원"
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.AiModel.initSync();
});
