// app/models/sapSuiteModel.js - SAP Integration Suite 뉴스 및 컨설팅/개발 도우미 데이터 모델
window.SapSuiteModel = {
  news: [],
  knowledge: [],
  isLoading: false,
  STORAGE_NEWS_KEY: 'portal_sap_news',
  STORAGE_KNOWLEDGE_KEY: 'portal_sap_knowledge',

  /**
   * 초기 데이터 로드 (Supabase 우선 -> REST API -> Initial JS -> LocalStorage)
   */
  async init() {
    await Promise.all([this.loadNews(), this.loadKnowledge()]);
  },

  async loadNews() {
    // 1. Supabase 시도
    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (client) {
      try {
        const { data, error } = await client
          .from('sap_news')
          .select('*')
          .order('published_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          this.news = data;
          this.cacheNews(data);
          return this.news;
        }
      } catch (e) {
        console.warn('Supabase sap_news 로드 실패, REST/로컬 폴백 사용:', e);
      }
    }

    // 2. 서버 REST API 시도
    try {
      const res = await fetch('/api/sap-news');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.news = data;
          this.cacheNews(data);
          return this.news;
        }
      }
    } catch (e) {}

    // 3. Initial JS 전역 변수 폴백
    if (Array.isArray(window.PORTAL_DATA_SAP_NEWS) && window.PORTAL_DATA_SAP_NEWS.length > 0) {
      this.news = window.PORTAL_DATA_SAP_NEWS;
      return this.news;
    }

    // 4. LocalStorage 폴백
    const cached = localStorage.getItem(this.STORAGE_NEWS_KEY);
    if (cached) {
      try { this.news = JSON.parse(cached); } catch (e) {}
    }
    return this.news;
  },

  async loadKnowledge() {
    // 1. Supabase 시도
    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (client) {
      try {
        const { data, error } = await client
          .from('sap_knowledge')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          this.knowledge = data;
          return this.knowledge;
        }
      } catch (e) {
        console.warn('Supabase sap_knowledge 로드 실패, REST/로컬 폴백 사용:', e);
      }
    }

    // 2. 서버 REST API 시도
    try {
      const res = await fetch('/api/sap-knowledge');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.knowledge = data;
          return this.knowledge;
        }
      }
    } catch (e) {}

    // 3. Initial JS 폴백
    if (Array.isArray(window.PORTAL_DATA_SAP_KNOWLEDGE) && window.PORTAL_DATA_SAP_KNOWLEDGE.length > 0) {
      this.knowledge = window.PORTAL_DATA_SAP_KNOWLEDGE;
      return this.knowledge;
    }

    return this.knowledge;
  },

  cacheNews(data) {
    try { localStorage.setItem(this.STORAGE_NEWS_KEY, JSON.stringify(data)); } catch (e) {}
  },

  /**
   * 뉴스 필터링 검색
   */
  getFilteredNews(category = 'All', keyword = '') {
    return this.news.filter(item => {
      const matchCat = (category === 'All' || item.category === category);
      if (!matchCat) return false;
      if (!keyword) return true;
      const q = keyword.toLowerCase();
      return (
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        (item.source && item.source.toLowerCase().includes(q))
      );
    });
  },

  /**
   * 지식 베이스 필터링 검색
   */
  getFilteredKnowledge(topic = 'All', keyword = '') {
    return this.knowledge.filter(item => {
      const matchTopic = (topic === 'All' || item.topic === topic);
      if (!matchTopic) return false;
      if (!keyword) return true;
      const q = keyword.toLowerCase();
      return (
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.content && item.content.toLowerCase().includes(q)) ||
        (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q)))
      );
    });
  },

  /**
   * SAP Integration Suite LLM 컨설팅 / Groovy 스크립트 도우미 질의
   */
  async askConsulting(question, topic = 'General') {
    if (!question || !question.trim()) {
      return { success: false, message: '질문 내용을 입력해주세요.' };
    }

    // 1. 서버 REST API (/api/sap-consulting) 호출 시도
    try {
      const res = await fetch('/api/sap-consulting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), topic })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.answer) {
          return { success: true, answer: data.answer, timestamp: data.timestamp };
        }
      }
    } catch (e) {}

    // 2. 오프라인/로컬 지능형 도우미 (내장 컨설팅 엔진)
    return this.generateOfflineConsulting(question.trim(), topic);
  },

  generateOfflineConsulting(q, topic) {
    const qLower = q.toLowerCase();
    
    // 1. iFlow 프로세스 상세 디자인 질의 (ERP HTTPS ➔ XML/JSON ➔ 레거시 REST ➔ JSON/XML ➔ ERP 응답 등)
    if (
      (qLower.includes('디자인') || qLower.includes('design') || qLower.includes('iflow') || qLower.includes('설계') || qLower.includes('프로세스')) &&
      (qLower.includes('erp') || qLower.includes('rest') || qLower.includes('xml') || qLower.includes('https') || qLower.includes('변환') || qLower.includes('step'))
    ) {
      return {
        success: true,
        answer: `### 📐 SAP Integration Suite iFlow 표준 아키텍처 사양서\n\n**시나리오:** ERP HTTPS 호출 ➔ XML to JSON 변환 ➔ 레거시 REST 전송 ➔ JSON to XML 변환 ➔ ERP 동기 응답\n\nSAP Design Guidelines 및 Business Accelerator Hub 베스트 프랙티스(3계층 구조)에 기반한 Step별 상세 구현 가이드입니다.\n\n---\n\n#### [1] iFlow 3계층 아키텍처 다이어그램\n\`\`\`\n[Main Integration Process]\n  ERP Sender (HTTPS)\n    └──> [Content Modifier: Init Context & MPL Properties]\n           └──> [Process Call: Call Sub_TransformAndCallLegacy] ──────────┐\n                  └──> [Content Modifier: Set ERP XML Response Header]     │\n                         └──> Message End Event (HTTP 200 OK)              │\n                                                                           │\n[Local Integration Process: Sub_TransformAndCallLegacy] <──────────────────┘\n  Start SubProcess Event\n    └──> [XML to JSON Converter] (Streaming: ON)\n           └──> [Content Modifier: Set REST Headers & Method]\n                  └──> [Request-Reply: Legacy REST Receiver (HTTP Adapter)]\n                         └──> [Router: Check HTTP Status 200 vs Fault]\n                                ├──> [Normal: JSON to XML Converter] ➔ End SubProcess\n                                └──> [Error: Throw Custom Business Exception]\n\n[Exception Subprocess: Error Handling & Fault Envelope]\n  Error Start Event\n    └──> [Groovy Script: Parse CamelExceptionCaught & Log to MPL]\n           └──> [Content Modifier: Construct Fault XML Response]\n                  └──> Message End Event (Return Fault XML to ERP)\n\`\`\`\n\n---\n\n#### [2] iFlow Step별 상세 설정 가이드\n\n1. **Step 1: ERP HTTPS 호출 (Inbound Sender)**\n   - **Adapter**: HTTPS Sender Adapter\n   - **Address**: \`/erp/legacy/order/v1\`\n   - **Authorization**: User Role (\`ESBMessaging.send\`) 또는 Client Certificate\n   - **Content Modifier (Init Context)**:\n     - Exchange Property: \`ERP_TxID = xpath(//Header/TransactionID/text())\`\n     - Exchange Property: \`Original_Payload = \${body}\`\n     - Header: \`Content-Type = application/xml\`\n\n2. **Step 2: XML to JSON 변환 (Data Transformation)**\n   - **컴포넌트**: \`XML to JSON Converter\`\n   - **Streaming**: \`true\` (메모리 절약 및 OOM 방지 표준)\n   - **Suppress JSON Root Element**: 요구 규격에 맞춰 설정 (false 권장)\n   - **JSON Output Encoding**: \`UTF-8\`\n   - *참고: 비즈니스 필드 매핑 및 연산이 수반되는 경우 Message Mapping(Graphical) 선행 적용*\n\n3. **Step 3: 레거시 REST 전송 (Outbound Communication)**\n   - **컴포넌트**: \`Request-Reply\` + \`HTTP Receiver Adapter\`\n   - **Content Modifier (Pre-REST)**:\n     - Header: \`Content-Type = application/json; charset=utf-8\`\n     - Header: \`Accept = application/json\`\n     - Header: \`CamelHttpMethod = POST\`\n   - **HTTP Receiver Adapter**:\n     - Address: \`https://legacy.internal.corp/api/v1/orders\`\n     - Authentication: \`OAuth2 Client Credentials\` (Security Material 별칭 참조)\n     - Throw Exception on Failure: \`false\` (HTTP 4xx/5xx 응답을 Router에서 안전하게 수신 및 분기)\n\n4. **Step 4: JSON to XML 변환 (Response Transformation)**\n   - **컴포넌트**: \`JSON to XML Converter\`\n   - **Add XML Root Element**: \`LegacyOrderResponse\`\n   - **Namespace**: \`http://erp.corp.com/legacy/response\`\n   - **Streaming**: \`true\`\n\n5. **Step 5: ERP 동기 응답 (Outbound Response)**\n   - **Content Modifier (Post-REST Response)**:\n     - Header: \`Content-Type = application/xml; charset=utf-8\`\n     - Header: \`CamelHttpResponseCode = 200\`\n   - **End Event**: Message End Event를 통해 ERP에 동기 XML 본문 반환\n\n6. **Step 6: 예외 처리 (Exception Subprocess)**\n   - **Error Start Event**: 런타임 오류 감지\n   - **Groovy Script**: \`CamelExceptionCaught\` 객체로부터 상태 코드 및 스택트레이스 추출 후 MPL 커스텀 프로퍼티 등록\n   - **Content Modifier**: ERP 표준 Fault XML (\`<Fault><Code>E500</Code><Message>\${property.ErrorMessage}</Message></Fault>\`) 생성 후 Message End Event로 안전 반환\n\n---\n\n#### [3] SAP API Management (Cloud Foundry) 및 베스트 프랙티스 연계\n- **API Management Facade**: Cloud Integration iFlow 전면에 API Proxy를 배치하여 \`VerifyAPIKey\`, \`SpikeArrest\`(초당 100건 제한), \`Quota\` 정책을 적용함으로써 백엔드 과부하를 방지합니다.\n- **보안 격리**: 비밀번호 및 API 토큰은 iFlow 내 하드코딩하지 않고 SAP Cloud Integration의 **Security Material (Secure Store)**에만 등록하여 운영합니다.`,
        timestamp: new Date().toLocaleTimeString()
      };
    }

    // 2. API Management 정책 질의
    if (qLower.includes('api management') || qLower.includes('apim') || qLower.includes('api 매니지먼트') || qLower.includes('spikearrest')) {
      return {
        success: true,
        answer: `### 🛡️ SAP API Management (Cloud Foundry) 아키텍처 가이드\n\n1. **역할 분담 (Facade Pattern)**:\n   - **SAP API Management**: 인가(\`VerifyAPIKey\`, \`OAuthV2\`), 트래픽 스로틀링(\`SpikeArrest\`, \`Quota\`), 경량 프로토콜 변환(\`XMLtoJSON\`).\n   - **Cloud Integration**: 복잡한 비즈니스 스키마 매핑, 사내 레거시 연동(Cloud Connector), 트랜잭션 오케스트레이션.\n\n2. **API Proxy 필수 정책**:\n   - **VerifyAPIKey (Pre-Flow)**: \`<APIKey ref="request.header.apikey"/>\` 로 무단 접근 차단.\n   - **SpikeArrest (Pre-Flow)**: 순간 폭주 트래픽 방어.\n   - **FaultRules**: 백엔드 시스템(ERP/레거시)의 내부 에러 스택을 은닉하고 표준화된 API 에러 반환.`,
        timestamp: new Date().toLocaleTimeString()
      };
    }

    // 3. Groovy 스크립트 작성 질의
    if (qLower.includes('groovy') || qLower.includes('그루비') || qLower.includes('스크립트') || qLower.includes('json') || qLower.includes('xml')) {
      return {
        success: true,
        answer: `### ⚡ SAP Cloud Integration - Groovy 표준 솔루션\n\n문의하신 내용에 맞춰 SAP 공식 런타임 표준에 부합하는 Groovy 스크립트를 작성했습니다.\n\n\`\`\`groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\nimport groovy.json.JsonSlurper\nimport groovy.json.JsonOutput\n\ndef Message processData(Message message) {\n    // 1. 메시지 바디 및 프로퍼티 취득\n    def body = message.getBody(java.lang.String)\n    def properties = message.getProperties()\n    \n    // 2. JSON 파싱 및 데이터 변환\n    def slurper = new JsonSlurper()\n    def parsed = slurper.parseText(body)\n    \n    // 요구사항에 따른 데이터 가공\n    parsed.processedTimestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ssXXX")\n    parsed.status = "SUCCESS"\n    \n    // 3. 결과 직렬화 및 헤더 세팅\n    message.setBody(JsonOutput.toJson(parsed))\n    message.setHeader("Content-Type", "application/json")\n    message.setProperty("IsProcessed", "true")\n    \n    return message\n}\n\`\`\`\n\n**핵심 가이드:**\n1. \`Message\` 객체는 반드시 \`com.sap.gateway.ip.core.customdev.util.Message\`를 임포트해야 합니다.\n2. 프로퍼티는 iFlow 내부 교환 변수로 안전하게 유지되며 타겟 시스템으로 전달되지 않습니다.\n3. 대용량(10MB 이상) 처리 시에는 문자열 대신 \`Reader\` 또는 \`InputStream\` 기반 스트리밍 처리를 권장합니다.`,
        timestamp: new Date().toLocaleTimeString()
      };
    }

    // Splitter / Aggregator 패턴 질의
    if (qLower.includes('split') || qLower.includes('aggregate') || qLower.includes('분할') || qLower.includes('취합') || qLower.includes('배치')) {
      return {
        success: true,
        answer: `### 🏗️ Splitter & Aggregator 아키텍처 패턴 가이드\n\n1. **General Splitter 단계**:\n   - XPath 또는 JSONPath를 이용해 단위 항목 리스트를 분할합니다.\n   - \`Streaming\` 옵션을 체크하여 메모리 누수를 방지합니다.\n\n2. **개별 서브프로세스 단계**:\n   - 각 건별 유효성 검증 및 백엔드 OData/REST API 호출을 수행합니다.\n   - 실패 시 \`Exception Subprocess\`를 구성하여 실패 건만 별도 로그/DLQ로 전송합니다.\n\n3. **Aggregator 단계**:\n   - **Correlation Expression**: \`\${header.BatchId}\` 또는 \`\${property.OrderBatchKey}\`\n   - **Completion Condition**: \`\${property.CamelSplitSize} == \${property.CamelSplitIndex} + 1\`\n   - **Aggregation Strategy**: Combine XML or Combine JSON을 선택하여 단일 응답 문서로 병합합니다.`,
        timestamp: new Date().toLocaleTimeString()
      };
    }

    // 마이그레이션 PO to IS
    if (qLower.includes('migration') || qLower.includes('마이그레이션') || qLower.includes('po') || qLower.includes('전환')) {
      return {
        success: true,
        answer: `### 🚀 SAP PO ➔ SAP Integration Suite 전환 핵심 전략\n\n1. **Migration Assessment Tool 활용**:\n   - 온프레미스 PO 시스템에서 기존 인터페이스 디렉터리를 스캔하여 호환성 리포트와 T-Shirt 사이즈(난이도)를 자동 도출합니다.\n\n2. **Java Mapping 전환**:\n   - 기존의 컴파일된 Java Mapping JAR 파일은 유지보수가 용이하고 경량인 **Groovy Script**로 1:1 재작성합니다.\n\n3. **Cloud Connector 연동**:\n   - 사내 On-Premises RFC, IDoc, JDBC 시스템은 방화벽 인바운드 포트 개방 없이 SAP Cloud Connector(SCC) 가상 매핑을 통해 Cloud Integration과 암호화 터널을 체결합니다.`,
        timestamp: new Date().toLocaleTimeString()
      };
    }

    // 기본 가이드 응답
    return {
      success: true,
      answer: `### ⚡ SAP Integration Suite 전문가 컨설팅 요약\n\n**질의 내용:** "${q}"\n\nSAP Cloud Integration 공식 개발 가이드(Help Portal) 및 베스트 프랙티스 기준 답변입니다:\n\n1. **아키텍처 구성**: iFlow 내에서 라우팅과 데이터 변환은 표준 메시지 매핑을 우선 검토하고, 복잡한 동적 비즈니스 분기는 Groovy 스크립트로 캡슐화하는 것이 유지보수 표준입니다.\n2. **예외 처리(Fault Handling)**: 타겟 시스템의 비정상 응답에 대비하여 \`Exception Subprocess\`를 배치하고 커스텀 MPL(Message Processing Log)을 남겨 추적성을 확보하세요.\n3. **상세 지식 탐색**: 상단의 [기술 지식] 탭에서 Groovy 기본 구조, 어댑터 모범 사례, OAuth2 자격증명 관리 샘플 코드를 즉시 복사하여 활용하실 수 있습니다.`,
      timestamp: new Date().toLocaleTimeString()
    };
  }
};
