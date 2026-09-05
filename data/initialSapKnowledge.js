// data/initialSapKnowledge.js - SAP Integration Suite / Cloud Integration 개발 및 컨설팅 가이드
window.PORTAL_DATA_SAP_KNOWLEDGE = [
  {
    "id": "sap_know_groovy_basic",
    "topic": "Groovy Script",
    "title": "Groovy 스크립트 기본 구조 및 Message 객체 핸들링",
    "content": `SAP Cloud Integration에서 커스텀 로직 처리를 위한 기본 Groovy 스크립트 템플릿입니다.\n\n\`\`\`groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\nimport java.util.HashMap\n\ndef Message processData(Message message) {\n    // 1. 메시지 바디 조회 (문자열 또는 스트림)\n    def body = message.getBody(java.lang.String)\n    \n    // 2. 헤더 및 프로퍼티 조회\n    def headers = message.getHeaders()\n    def properties = message.getProperties()\n    def customHeader = headers.get("SapCustomHeader")\n    \n    // 3. 프로퍼티 및 헤더 설정\n    message.setProperty("ProcessedFlag", "Y")\n    message.setHeader("Content-Type", "application/json")\n    \n    // 4. 바디 수정 및 반환\n    message.setBody(body)\n    return message\n}\n\`\`\`\n\n- processData(Message message) 메서드가 런타임 진입점입니다.\n- 헤더는 외부 프로토콜(HTTP 등)로 전달될 수 있으나, 프로퍼티는 iFlow 내부 교환 변수(Exchange)로만 격리 유지됩니다.`,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Groovy", "Message", "Basic", "Header", "Property"]
  },
  {
    "id": "sap_know_groovy_mpl",
    "topic": "Groovy Script",
    "title": "Message Processing Log(MPL) 커스텀 로깅 및 첨부파일 기록",
    "content": `모니터링 대시보드에서 iFlow 추적 및 디버깅을 위해 커스텀 로그 및 바디를 MPL에 첨부하는 패턴입니다.\n\n\`\`\`groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\n\ndef Message processData(Message message) {\n    def messageLog = messageLogFactory.getMessageLog(message)\n    def body = message.getBody(java.lang.String)\n    \n    if (messageLog != null) {\n        // 1. 사용자 정의 헤더 로깅 (모니터 화면에 검색 필드로 표시)\n        messageLog.addCustomHeaderProperty("OrderNumber", message.getProperty("OrderNumber") ?: "N/A")\n        \n        // 2. 텍스트 페이로드 첨부 (Attachment)\n        messageLog.addAttachmentAsString("Debug_Payload", body, "text/plain")\n    }\n    \n    return message\n}\n\`\`\`\n\n주의: 프로덕션 환경에서는 대용량 페이로드 첨부 시 데이터베이스 저장소 부하가 발생하므로 디버그 플래그가 활성화된 경우에만 기록하도록 설계합니다.`,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Groovy", "MPL", "Logging", "Monitoring", "Debug"]
  },
  {
    "id": "sap_know_groovy_json_xml",
    "topic": "Groovy Script",
    "title": "JsonSlurper 및 XmlSlurper를 활용한 데이터 파싱과 변환",
    "content": `Groovy 내장 파서를 활용하여 JSON과 XML 페이로드를 고속 파싱하고 가공하는 표준 기법입니다.\n\n\`\`\`groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\nimport groovy.json.JsonSlurper\nimport groovy.json.JsonOutput\n\ndef Message processData(Message message) {\n    def body = message.getBody(java.lang.String)\n    def slurper = new JsonSlurper()\n    def data = slurper.parseText(body)\n    \n    // 비즈니스 로직 가공 (예: 필터링 및 필드 추가)\n    data.status = "VERIFIED"\n    data.processedAt = new Date().format("yyyy-MM-dd HH:mm:ss")\n    \n    // JSON 문자열로 직렬화\n    message.setBody(JsonOutput.toJson(data))\n    message.setHeader("Content-Type", "application/json")\n    return message\n}\n\`\`\`\n\nXmlSlurper 사용 시 메모리 효율적인 구조를 유지하므로 XSLT 대신 복잡한 동적 비즈니스 분기에 유용합니다.`,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Groovy", "JSON", "XML", "Slurper", "Transform"]
  },
  {
    "id": "sap_know_mapping_udf",
    "topic": "Message Mapping",
    "title": "Message Mapping Groovy UDF (사용자 정의 함수) 개발 표준",
    "content": `그래픽 메시지 매핑에서 기본 내장 함수로 해결되지 않는 복잡한 로직을 구현하는 Groovy UDF 규칙입니다.\n\n### UDF 실행 모드 구분\n1. Single Values: 각 입력값 하나당 하나의 결과값 반환 (1:1 매핑)\n2. All Values of a Context: 큐 내의 컨텍스트(구분자 사이의 값들) 전체를 배열로 받아 처리\n3. All Values of a Queue: 큐 전체의 모든 컨텍스트와 값들을 일괄 처리\n\n\`\`\`groovy\n// All Values of a Context 예제: 특정 조건에 맞는 값만 필터링\ndef void filterValidValues(String[] inputValues, Output output, MappingContext context) {\n    for (String val : inputValues) {\n        if (val != null && !val.trim().isEmpty() && val != "__SUPPRESS__") {\n            output.addValue(val.trim())\n        }\n    }\n}\n\`\`\`\n\n- MappingContext를 통해 글로벌 파라미터 및 프로퍼티를 교환할 수 있습니다.`,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Message Mapping", "UDF", "Groovy", "Queue", "Context"]
  },
  {
    "id": "sap_know_iflow_patterns",
    "topic": "Integration Patterns",
    "title": "엔터프라이즈 통합 패턴: Splitter & Aggregator 및 멱등성 보장",
    "content": `대량의 배치 데이터를 개별 건으로 분할(Split) 처리 후 다시 취합(Aggregate)하는 표준 아키텍처 패턴입니다.\n\n### 구성 단계\n1. General Splitter: XML/JSON 페이로드를 단위 노드별로 분할\n2. Processing Subprocess: 분할된 메시지에 대해 변환, 검증, 타겟 API 호출 수행\n3. Aggregator:\n   - Correlation Expression: 동일 배치 식별자 (예: \${header.BatchId})\n   - Completion Condition: 분할 총 건수 (\${property.CamelSplitSize} == \${property.CamelSplitIndex} + 1)\n   - Aggregation Strategy: Combine XML or Combine JSON\n\n### 멱등성(Idempotent) 패턴\n- 동일한 요청 중복 수신 방지를 위해 Idempotent Process Call 단계를 배치하고 메시지 고유 키(Message ID, OrderNo)를 기준으로 이미 처리된 트랜잭션을 조기 필터링합니다.`,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Pattern", "Splitter", "Aggregator", "Idempotent", "iFlow"]
  },
  {
    "id": "sap_know_adapters_best_practice",
    "topic": "Adapters",
    "title": "Cloud Integration 핵심 어댑터 구성 가이드 (OData, REST, SFTP, SOAP)",
    "content": `자주 사용하는 SAP 및 외부 시스템 어댑터 설정 모범 사례입니다.\n\n1. OData V2/V4 어댑터:\n   - 대량 데이터 조회 시 $top, $skip 페이징 또는 Server-driven Paging 자동 처리 옵션 활성화\n   - 엔터티 생성/수정 시 $batch 요청 묶음 처리를 통해 왕복 네트워크 지연 최소화\n2. HTTP / REST 어댑터:\n   - 타겟 API 에러(4xx, 5xx) 발생 시 iFlow 중단을 방지하려면 'Throw Exception on Failure' 체크 해제 후 상태 코드(\${header.CamelHttpResponseCode})에 따라 라우팅 처리\n3. SFTP 어댑터:\n   - 파일 폴링 시 다른 프로세스와의 경합 방지를 위해 'Read Lock' (rename, done file, marker file) 전략 필수 지정\n   - 처리 완료 후 'Archive' 또는 'Delete' 디렉터리 분리`,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Adapter", "OData", "REST", "SFTP", "SOAP", "Performance"]
  },
  {
    "id": "sap_know_security_credentials",
    "topic": "Security",
    "title": "보안 자격증명 관리 및 OAuth2 Client Credentials 연동",
    "content": `SAP BTP 및 외부 SaaS 시스템(ServiceNow, Salesforce, Concur) 연동 시의 보안 관리 표준입니다.\n\n### 보안 아티팩트 관리 (Monitor -> Security Material)\n- User Credentials: ID/패스워드 암호화 저장\n- OAuth2 Client Credentials: Client ID, Client Secret, Token Service URL을 등록하여 어댑터에서 토큰 자동 갱신(Auto Refresh) 관리\n- KeyStore: 사설 인증서(.p12, .jks) 및 공개 서명 키 등록\n\n### iFlow 내 스크립트에서 보안 정보 안전하게 가져오기\n\`\`\`groovy\nimport com.sap.it.api.ITApiFactory\nimport com.sap.it.api.securestore.SecureStoreService\nimport com.sap.it.api.securestore.UserCredential\n\ndef secureStore = ITApiFactory.getApi(SecureStoreService.class, null)\ndef credential = secureStore.getUserCredential(\"MY_SECURE_PARAM\")\nString username = credential.getUsername()\nString password = new String(credential.getPassword())\n\`\`\``,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Security", "OAuth2", "KeyStore", "SecureStore", "ITApiFactory"]
  },
  {
    "id": "sap_know_po_to_cpi_migration",
    "topic": "Migration",
    "title": "SAP PO(Process Orchestration)에서 Cloud Integration 마이그레이션 가이드",
    "content": `SAP PO 온프레미스 인터페이스를 SAP Integration Suite(Cloud Integration)로 전환할 때의 핵심 가이드입니다.\n\n### 주요 구성 요소 전환 매핑\n1. Integration Directory (Scenario) -> Integration Flow (iFlow): 그래픽 인터페이스 플로우로 직접 재설계 또는 Migration Assessment 도구로 자동 패키지 변환\n2. Java Mapping -> Groovy Script: 고속 경량 Groovy로 전환하여 유지보수성 및 디버깅 용이성 확보\n3. RFC / IDoc 연동 -> Cloud Connector(SCC) 연결: 방화벽 인바운드 포트 오픈 없이 SCC의 가상 호스트 매핑을 통해 RFC/IDoc 어댑터 통신\n4. Message Monitoring -> BTP Monitor & Edge Integration Cell: 클라우드 기반 모니터링 및 하이브리드 온프레미스 처리가 필요한 경우 Edge Integration Cell 고려`,
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": ["Migration", "SAP PO", "Cloud Integration", "BTP", "Cloud Connector"]
  }
];
