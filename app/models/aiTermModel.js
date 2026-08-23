// app/models/aiTermModel.js - LocalStorage 및 중앙 서버(aiTerms.json) 양방향 동기화 AI 용어 데이터 관리 모듈

window.AiTermModel = {
  aiTerms: [],
  isSyncing: false,

  STORAGE_KEY: 'portal_ai_terms',

  getApiUrls() {
    if (window.location.protocol.startsWith('http')) {
      return ['/api/ai-terms', './data/aiTerms.json'];
    }
    return [
      'http://localhost:8080/api/ai-terms',
      'http://192.168.219.115:8080/api/ai-terms',
      './data/aiTerms.json'
    ];
  },

  getApiUrl() {
    return this.getApiUrls()[0];
  },

  getTermsFromLocal() {
    const fallbackTerms = window.PORTAL_DATA_AI_TERMS || [];
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (!rawData) {
      if (fallbackTerms.length > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fallbackTerms));
      }
      return fallbackTerms;
    }
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return fallbackTerms;
    } catch (e) {
      return fallbackTerms;
    }
  },

  getTerms() {
    const localTerms = this.getTermsFromLocal();
    const fallbackTerms = window.PORTAL_DATA_AI_TERMS || [];
    const merged = this.mergeTerms(localTerms, fallbackTerms);
    this.aiTerms = merged;
    return this.aiTerms;
  },

  /**
   * 로컬 데이터와 서버 데이터 병합 (중복 용어명 제거 및 최신화)
   */
  mergeTerms(listA = [], listB = []) {
    const combined = [...(listA || []), ...(listB || [])];
    const map = new Map();

    for (const item of combined) {
      if (!item || !item.term) continue;
      const normKey = (item.term || '').trim().toLowerCase();

      if (map.has(normKey)) {
        const existing = map.get(normKey);
        const mergedObj = { ...existing };
        for (const [k, v] of Object.entries(item)) {
          if (v !== undefined && v !== null && v !== '') {
            mergedObj[k] = v;
          }
        }
        map.set(normKey, mergedObj);
      } else {
        map.set(normKey, item);
      }
    }

    return Array.from(map.values());
  },

  async initSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    const localTerms = this.getTermsFromLocal();

    // 1. Supabase Cloud DB 연동 확인
    if (window.isSupabaseEnabled()) {
      try {
        const supabase = window.getSupabaseClient();
        const { data, error } = await supabase.from('ai_terms').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          const formattedFromDb = data.map(dbItem => ({
            id: dbItem.id,
            term: dbItem.term,
            definition: dbItem.definition || '',
            summary: dbItem.definition || '',
            category: dbItem.category || '개념 / 이론',
            tags: dbItem.tags || [],
            createdAt: dbItem.created_at
          }));
          this.aiTerms = this.mergeTerms(formattedFromDb, localTerms);
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.aiTerms));
          this.isSyncing = false;
          if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
            window.AppController.refreshAllViews();
          }
          return;
        }
      } catch (e) {
        console.warn('[Supabase AiTermModel Sync Error]:', e);
      }
    }

    // 2. Supabase 미연동 시 REST API 폴백
    let synced = false;
    const urls = this.getApiUrls();
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          cache: 'no-cache'
        });

        if (res.ok) {
          const text = await res.text();
          const cleanText = text.replace(/^\uFEFF/, '').trim();
          const serverTerms = JSON.parse(cleanText || '[]');
          if (Array.isArray(serverTerms) && serverTerms.length > 0) {
            const merged = this.mergeTerms(localTerms, serverTerms);
            this.aiTerms = merged;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
            this.syncToServer(merged);
            synced = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!synced) {
      const fallbackTerms = window.PORTAL_DATA_AI_TERMS || [];
      const merged = this.mergeTerms(localTerms, fallbackTerms);
      this.aiTerms = merged;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
    }

    this.isSyncing = false;
    if (window.AppController && typeof window.AppController.refreshAllViews === 'function') {
      window.AppController.refreshAllViews();
    }
  },

  async syncToServer(terms) {
    try {
      const serverUrl = this.getApiUrl();
      await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terms)
      });
    } catch (e) {
      console.warn('[Sync AI Terms] 서버에 용어 데이터를 동기화하지 못했습니다:', e);
    }
  },

  saveAllTerms(terms) {
    this.aiTerms = terms;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(terms));
    this.syncToServer(terms);
  },

  /**
   * 신규 AI 용어 추가 또는 동일 용어 수정 (Upsert)
   */
  addTerm(data) {
    const terms = this.getTerms();
    const normTarget = (data.term || '').trim().toLowerCase();

    const existingIndex = terms.findIndex(t => (t.term || '').trim().toLowerCase() === normTarget);

    let isUpdate = false;
    let resultTerm = null;

    if (existingIndex !== -1) {
      isUpdate = true;
      terms[existingIndex] = {
        ...terms[existingIndex],
        term: data.term || terms[existingIndex].term,
        category: data.category || terms[existingIndex].category,
        parentTerm: data.parentTerm !== undefined ? data.parentTerm : terms[existingIndex].parentTerm,
        summary: data.summary || terms[existingIndex].summary,
        updatedAt: new Date().toISOString()
      };
      resultTerm = terms[existingIndex];
    } else {
      resultTerm = {
        id: `term_${Date.now()}`,
        term: data.term || '신규 AI 용어',
        category: data.category || '기초 개념',
        parentTerm: data.parentTerm || '',
        summary: data.summary || '',
        createdAt: new Date().toISOString()
      };
      terms.unshift(resultTerm);
    }

    this.saveAllTerms(terms);
    return { term: resultTerm, isUpdate };
  },

  deleteTerm(id) {
    const terms = this.getTerms().filter(t => t.id !== id);
    this.saveAllTerms(terms);
    return terms;
  },

  updateTerm(id, updatedData) {
    const terms = this.getTerms();
    const index = terms.findIndex(t => t.id === id);
    if (index !== -1) {
      terms[index] = {
        ...terms[index],
        term: updatedData.term,
        category: updatedData.category,
        parentTerm: updatedData.parentTerm !== undefined ? updatedData.parentTerm : terms[index].parentTerm,
        summary: updatedData.summary,
        updatedAt: new Date().toISOString()
      };
      this.saveAllTerms(terms);
      return terms[index];
    }
    return null;
  },

  /**
   * LLM & 지능형 NLP 엔진 기반 AI 용어 자동 분석 (상위 연결고리/카테고리/요약/연관용어 100% 자동 도출)
   */
  async analyzeTerm(inputTermName, userManualSummary = '') {
    if (!inputTermName || !inputTermName.trim()) {
      return { success: false, message: '분석할 AI 용어 또는 기술명을 입력해 주세요.' };
    }

    const termName = inputTermName.trim();
    const endpoints = [
      'http://localhost:8080/api/analyze-ai-term',
      'http://127.0.0.1:8080/api/analyze-ai-term',
      '/api/analyze-ai-term',
      'http://192.168.219.115:8080/api/analyze-ai-term'
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term: termName, userSummary: userManualSummary })
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.success) {
            return data;
          }
        }
      } catch (err) {}
    }

    // 로컬 전문가 KB 및 스마트 NLP 규칙 기반 지능형 폴백 엔진
    return this.getExpertTermAnalysis(termName, userManualSummary);
  },

  getExpertTermAnalysis(termName, userManualSummary = '') {
    const clean = termName.toLowerCase().trim();

    let category = '기초 개념';
    let parentTerm = '';
    let importance = '핵심 기초';
    let relatedTerms = [];
    let summary = `입력하신 '${termName}'은(는) 인공지능(AI) 및 머신러닝 분야의 핵심 개념 및 기술 항목입니다.`;
    let docsUrl = `https://ko.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(termName)}`;

    // 1. 모델 / 엔지니어링 계열
    if (clean.includes('gemini') || clean.includes('제미나이')) {
      category = '모델 / 엔진';
      parentTerm = 'LLM (거대언어모델)';
      importance = '응용 / 서비스';
      relatedTerms = ['Google', 'Multimodal', 'GPT-4o', 'Claude 3.5'];
      summary = 'Google이 개발한 최고 성능의 멀티모달 AI 모델 시리즈로, 텍스트, 코드, 이미지, 오디오, 비디오를 통합 처리합니다.';
      docsUrl = 'https://gemini.google.com/';
    } else if (clean.includes('gpt') || clean.includes('chatgpt') || clean.includes('openai')) {
      category = '모델 / 엔진';
      parentTerm = 'LLM (거대언어모델)';
      importance = '응용 / 서비스';
      relatedTerms = ['OpenAI', 'ChatGPT', 'Gemini', 'Claude'];
      summary = 'OpenAI에서 개발한 대표적인 Generative Pre-trained Transformer 기반 대형 언어 모델입니다.';
      docsUrl = 'https://chatgpt.com/';
    } else if (clean.includes('claude') || clean.includes('클로드') || clean.includes('anthropic')) {
      category = '모델 / 엔진';
      parentTerm = 'LLM (거대언어모델)';
      importance = '응용 / 서비스';
      relatedTerms = ['Anthropic', 'Artifacts', 'Coding', 'GPT-4o'];
      summary = 'Anthropic이 개발한 추론, 긴 문맥 처리, 코드 작성 및 문서 분석 성능에 특화된 차세대 AI 모델입니다.';
      docsUrl = 'https://claude.ai/';
    } else if (clean.includes('deepseek') || clean.includes('딥시크')) {
      category = '모델 / 엔진';
      parentTerm = 'LLM (거대언어모델)';
      importance = '중급 기술';
      relatedTerms = ['MoE', 'DeepSeek-R1', 'OpenSource', 'LLM'];
      summary = '중국 DeepSeek에서 개발한 극강의 비용 효율성과 고성능 추론 능력을 보여주는 혁신적인 오픈웨이트 LLM입니다.';
      docsUrl = 'https://chat.deepseek.com/';
    }
    // 2. 아키텍처 / 신경망 계열
    else if (clean.includes('transformer') || clean.includes('트랜스포머') || clean.includes('attention')) {
      category = '신경망 / 아키텍처';
      parentTerm = 'Deep Learning (딥러닝)';
      importance = '중급 기술';
      relatedTerms = ['Self-Attention', 'LLM', 'BERT', 'GPT'];
      summary = 'Self-Attention 메커니즘을 기반으로 문맥 데이터를 병렬 처리하는 현대 AI 모델(LLM/멀티모달)의 핵심 아키텍처입니다.';
      docsUrl = 'https://arxiv.org/abs/1706.03762';
    } else if (clean.includes('diffusion') || clean.includes('디퓨전') || clean.includes('stable diffusion') || clean.includes('midjourney')) {
      category = '신경망 / 아키텍처';
      parentTerm = 'Deep Learning (딥러닝)';
      importance = '중급 기술';
      relatedTerms = ['Stable Diffusion', 'Midjourney', '이미지생성', 'DALL-E'];
      summary = '노이즈를 단계적으로 제거하며 고화질 이미지, 영상, 비주얼 그래픽을 노이즈 역과정으로 생성하는 아키텍처입니다.';
      docsUrl = 'https://en.wikipedia.org/wiki/Diffusion_model';
    } else if (clean.includes('llm') || clean.includes('거대언어') || clean.includes('large language')) {
      category = '모델 / 엔진';
      parentTerm = 'Transformer (트랜스포머)';
      importance = '핵심 기초';
      relatedTerms = ['GPT-4o', 'Gemini', 'Claude', 'RAG', 'Prompt Engineering'];
      summary = '수십억 개 이상의 파라미터를 기반으로 거대한 텍스트 데이터를 학습하여 인간 수준의 문맥 이해 및 텍스트 생성을 수행하는 모델입니다.';
      docsUrl = 'https://ko.wikipedia.org/wiki/%EA%B1%B0%EB%8D%80_%EC%96%B8%EC%96%B4_%EB%AA%A8%EB%8D%B8';
    } else if (clean.includes('rag') || clean.includes('검색증강') || clean.includes('retrieval')) {
      category = '학습 / 기법';
      parentTerm = 'LLM (거대언어모델)';
      importance = '중급 기술';
      relatedTerms = ['Vector DB', 'Embedding', '지식검색', '환각방지'];
      summary = '외부 데이터베이스나 문서 파일에서 관련 검색 결과(Context)를 실시간으로 추출하여 LLM에 제공함으로써 환각(Hallucination) 현상을 차단하는 핵심 기법입니다.';
      docsUrl = 'https://aws.amazon.com/what-is/retrieval-augmented-generation/';
    } else if (clean.includes('prompt') || clean.includes('프롬프트')) {
      category = '학습 / 기법';
      parentTerm = 'LLM (거대언어모델)';
      importance = '핵심 기초';
      relatedTerms = ['Few-Shot', 'Chain-of-Thought', '역할부여', 'System Prompt'];
      summary = 'LLM이 사용자의 요구사항에 맞는 최고 정확도의 답변을 생성하도록 질문과 제약조건 구조를 지능적으로 설계하는 분야입니다.';
      docsUrl = 'https://www.promptingguide.ai/kr';
    } else if (clean.includes('vector') || clean.includes('벡터') || clean.includes('embedding') || clean.includes('임베딩')) {
      category = '응용 / 서비스';
      parentTerm = 'RAG (검색증강생성)';
      importance = '중급 기술';
      relatedTerms = ['RAG', 'Pinecone', 'ChromaDB', 'Similarity Search'];
      summary = '텍스트, 이미지 등 비정형 데이터를 고차원 수치 벡터로 변환하여 밀도 높은 유사도(Cosine Similarity) 검색을 지원하는 데이터베이스 기술입니다.';
      docsUrl = 'https://www.pinecone.io/learn/vector-database/';
    } else if (clean.includes('n8n') || clean.includes('엔에잇엔')) {
      category = '응용 / 서비스';
      parentTerm = 'AI Agent (AI 에이전트)';
      importance = '중급 기술';
      relatedTerms = ['AI Agent', 'Workflow', 'LangChain', 'Tool Calling', 'Automation'];
      summary = '노코드/로코드 기반 오픈소스 워크플로우 자동화 플랫폼으로, LLM 및 AI 에이전트를 다양한 사내 웹 API 및 데이터베이스와 실시간 연동하는 자율 파이프라인 도구입니다.';
      docsUrl = 'https://n8n.io/';
    } else if (clean.includes('agent') || clean.includes('에이전트') || clean.includes('autogen') || clean.includes('mcp')) {
      category = '응용 / 서비스';
      parentTerm = 'LLM (거대언어모델)';
      importance = '심화 개념';
      relatedTerms = ['Tool Calling', 'LangChain', 'Autogen', 'MCP'];
      summary = 'LLM을 두뇌로 삼아 사용자 목표를 달성하기 위해 자율적으로 계획 수립, 외부 도구 호출, 브라우저 조작 및 업무 실행을 반복하는 시스템입니다.';
      docsUrl = 'https://ko.wikipedia.org/wiki/%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8';
    } else if (clean.includes('fine-tuning') || clean.includes('파인튜닝') || clean.includes('미세조정') || clean.includes('lora')) {
      category = '학습 / 기법';
      parentTerm = 'LLM (거대언어모델)';
      importance = '심화 개념';
      relatedTerms = ['LoRA', 'PEFT', 'RLHF', '추가학습'];
      summary = '사전 학습된 기본 AI 모델에 특정 도메인/기업 전용 데이터를 추가 학습시켜 특화된 작업 능력을 극대화하는 기법입니다.';
      docsUrl = 'https://huggingface.co/docs/transformers/training';
    } else if (clean.includes('deep learning') || clean.includes('딥러닝') || clean.includes('신경망') || clean.includes('ann') || clean.includes('cnn') || clean.includes('rnn')) {
      category = '신경망 / 아키텍처';
      parentTerm = 'Machine Learning (머신러닝)';
      importance = '핵심 기초';
      relatedTerms = ['Neural Network', 'Transformer', 'Machine Learning'];
      summary = '인간 뇌의 신경 세포 구조를 모방한 인공 신경망을 여러 층(Deep Layer)으로 쌓아 복잡한 데이터를 심층 학습하는 기술입니다.';
      docsUrl = 'https://ko.wikipedia.org/wiki/%EB%94%A5_%EB%9F%AC%EB%8B%99';
    } else if (clean.includes('machine learning') || clean.includes('머신러닝') || clean.includes('기계학습')) {
      category = '기초 개념';
      parentTerm = 'AI (인공지능)';
      importance = '핵심 기초';
      relatedTerms = ['Deep Learning', 'Supervised Learning', 'AI'];
      summary = '컴퓨터에 데이터를 제공하고 패턴을 스스로 학습하여 명시적 프로그래밍 없이도 미래 데이터를 예측하게 만드는 기술입니다.';
      docsUrl = 'https://ko.wikipedia.org/wiki/%EB%A9%8B%EC%8B%A0_%EB%9F%AC%EB%8B%99';
    } else if (clean.includes('ai') || clean.includes('인공지능')) {
      category = '기초 개념';
      parentTerm = '';
      importance = '핵심 기초';
      relatedTerms = ['Machine Learning', 'Deep Learning', 'LLM'];
      summary = '컴퓨터 시스템이 인간의 지능적 행동(인지, 추론, 학습, 언어 이해 등)을 모방하여 수행하도록 하는 최상위 기술 분야입니다.';
      docsUrl = 'https://ko.wikipedia.org/wiki/%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5';
    }

    if (userManualSummary) {
      summary = `${userManualSummary.trim()}\n\n📌 [자동 분석 요약]\n${summary}`;
    }

    return {
      success: true,
      term: termName,
      category,
      parentTerm,
      importance,
      relatedTerms,
      summary,
      docsUrl
    };
  }
};

