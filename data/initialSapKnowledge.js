// data/initialSapKnowledge.js - Auto-updated by SAP Agent
window.PORTAL_DATA_SAP_KNOWLEDGE = [
  {
    "id": "sap_know_groovy_basic",
    "topic": "Groovy Script",
    "title": "Groovy 스크립트 기본 구조 및 Message 객체 핸들링",
    "content": "SAP Cloud Integration에서 커스텀 비즈니스 로직 처리를 위한 기본 Groovy 스크립트 템플릿입니다.\n\n```groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\n\ndef Message processData(Message message) {\n    def body = message.getBody(java.lang.String)\n    def headers = message.getHeaders()\n    def properties = message.getProperties()\n    \n    // 프로퍼티(iFlow 내부 교환 변수) 및 헤더 세팅\n    message.setProperty(\"ProcessedFlag\", \"Y\")\n    message.setHeader(\"Content-Type\", \"application/json; charset=utf-8\")\n    message.setBody(body)\n    return message\n}\n```\n\n- `processData(Message message)`가 표준 진입점입니다.\n- 헤더는 외부 송수신 프로토콜로 전달될 수 있으나, 프로퍼티는 iFlow 내부 교환용으로 안전하게 유지됩니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Groovy",
      "Message",
      "Basic",
      "Header",
      "Property"
    ]
  },
  {
    "id": "sap_know_groovy_mpl",
    "topic": "Groovy Script",
    "title": "Message Processing Log(MPL) 커스텀 로깅 및 첨부파일 기록",
    "content": "운영 모니터링 대시보드에서 iFlow 추적 및 디버깅을 위해 주문번호 등의 비즈니스 키와 요청 본문을 MPL에 첨부하는 패턴입니다.\n\n```groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\n\ndef Message processData(Message message) {\n    def messageLog = messageLogFactory.getMessageLog(message)\n    def body = message.getBody(java.lang.String)\n    \n    if (messageLog != null) {\n        def orderNo = message.getProperty(\"OrderNumber\") ?: \"N/A\"\n        messageLog.addCustomHeaderProperty(\"OrderNumber\", orderNo)\n        messageLog.addAttachmentAsString(\"Debug_Payload\", body, \"text/plain\")\n    }\n    return message\n}\n```",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Groovy",
      "MPL",
      "Logging",
      "Monitoring",
      "Debug"
    ]
  },
  {
    "id": "sap_know_groovy_json_xml",
    "topic": "Groovy Script",
    "title": "JsonSlurper 및 XmlSlurper를 활용한 고속 페이로드 파싱과 변환",
    "content": "Groovy 내장 파서를 활용하여 JSON 및 XML 페이로드를 고속 파싱하고 동적 가공하는 표준 기법입니다.\n\n```groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\nimport groovy.json.JsonSlurper\nimport groovy.json.JsonOutput\n\ndef Message processData(Message message) {\n    def body = message.getBody(java.lang.String)\n    def slurper = new JsonSlurper()\n    def data = slurper.parseText(body)\n    \n    data.status = \"VERIFIED\"\n    data.processedAt = new Date().format(\"yyyy-MM-dd'T'HH:mm:ssXXX\")\n    \n    message.setBody(JsonOutput.toJson(data))\n    message.setHeader(\"Content-Type\", \"application/json\")\n    return message\n}\n```",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Groovy",
      "JSON",
      "XML",
      "Slurper",
      "Transform"
    ]
  },
  {
    "id": "sap_know_groovy_exception_stack",
    "topic": "Groovy Script",
    "title": "Exception Subprocess 내 상세 에러 원인 및 스택트레이스 추출",
    "content": "iFlow 실행 중 예외 발생 시 `CamelExceptionCaught` 프로퍼티에서 실패 원인 메시지와 스택트레이스를 추출해 JSON 에러 응답으로 구성하는 템플릿입니다.\n\n```groovy\nimport com.sap.gateway.ip.core.customdev.util.Message\nimport groovy.json.JsonOutput\n\ndef Message processData(Message message) {\n    def ex = message.getProperty(\"CamelExceptionCaught\") as Exception\n    def errMsg = ex ? ex.getMessage() : \"알 수 없는 런타임 오류\"\n    \n    def errDetail = [\n        status: 500,\n        error: errMsg,\n        timestamp: new Date().format(\"yyyy-MM-dd'T'HH:mm:ssXXX\"),\n        correlationId: message.getHeaders().get(\"SAP_MessageProcessingLogID\")\n    ]\n    message.setBody(JsonOutput.toJson(errDetail))\n    message.setHeader(\"Content-Type\", \"application/json\")\n    return message\n}\n```",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Groovy",
      "Exception",
      "ErrorHandling",
      "CamelException",
      "Troubleshooting"
    ]
  },
  {
    "id": "sap_know_groovy_hmac_sign",
    "topic": "Groovy Script",
    "title": "HMAC-SHA256 디지털 서명 생성 및 Base64 인코딩",
    "content": "외부 REST API와의 보안 연동 시 요청 헤더에 HMAC-SHA256 디지털 서명을 첨부하기 위한 Groovy 암호화 구현 패턴입니다.\n\n```groovy\nimport javax.crypto.Mac\nimport javax.crypto.spec.SecretKeySpec\nimport java.util.Base64\n\ndef String sign(String secret, String data) {\n    Mac mac = Mac.getInstance(\"HmacSHA256\")\n    SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(\"UTF-8\"), \"HmacSHA256\")\n    mac.init(keySpec)\n    return Base64.encoder.encodeToString(mac.doFinal(data.getBytes(\"UTF-8\")))\n}\n```",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Groovy",
      "HMAC",
      "Security",
      "Base64",
      "Signature"
    ]
  },
  {
    "id": "sap_know_mapping_udf",
    "topic": "Message Mapping",
    "title": "Message Mapping Groovy UDF (사용자 정의 함수) 개발 표준",
    "content": "그래픽 메시지 매핑에서 기본 내장 함수로 해결되지 않는 복잡한 로직을 구현하는 Groovy UDF 규칙입니다.\n\n- **Single Values**: 1:1 단순 필드 값 변환 시 사용\n- **All Values of a Context**: 부모 노드나 컨텍스트 변경 시점 처리\n- **All Values of a Queue**: 큐 전체 데이터 취합, 정렬 및 순서 제어",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Message Mapping",
      "UDF",
      "Groovy",
      "Queue",
      "Context"
    ]
  },
  {
    "id": "sap_know_mapping_namespace_clean",
    "topic": "Message Mapping",
    "title": "XML 네임스페이스 제거 및 동적 스키마 변환 기법",
    "content": "XSLT 매핑이나 XML 변환 시 네임스페이스 불일치로 매핑이 누락되는 문제를 해결하기 위한 표준 네임스페이스 제거 XSLT 템플릿입니다.\n\n```xml\n<xsl:stylesheet version=\"1.0\" xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\">\n  <xsl:template match=\"*\">\n    <xsl:element name=\"{local-name()}\">\n      <xsl:apply-templates select=\"@*|node()\"/>\n    </xsl:element>\n  </xsl:template>\n</xsl:stylesheet>\n```",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Message Mapping",
      "XSLT",
      "XML",
      "Namespace",
      "Clean"
    ]
  },
  {
    "id": "sap_know_mapping_value_mapping",
    "topic": "Message Mapping",
    "title": "Value Mapping 테이블을 활용한 코드 동적 변환 및 캐싱",
    "content": "국가 코드, 결제 수단 코드 등 이기종 시스템 간 코드 매핑을 하드코딩하지 않고 Cloud Integration의 Value Mapping 아티팩트로 분리하여 무중단 갱신하는 운영 표준입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Value Mapping",
      "Code",
      "Cache",
      "Enterprise",
      "Lookup"
    ]
  },
  {
    "id": "sap_know_iflow_patterns",
    "topic": "Integration Patterns",
    "title": "엔터프라이즈 통합 패턴: Splitter & Aggregator 및 멱등성 보장",
    "content": "대량의 배치 데이터를 개별 건으로 분할(Split) 처리 후 다시 취합(Aggregate)하는 표준 아키텍처 패턴 및 중복 수신 방지(Idempotent Process Call) 패턴을 적용합니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Pattern",
      "Splitter",
      "Aggregator",
      "Idempotent",
      "iFlow"
    ]
  },
  {
    "id": "sap_know_pattern_router_choice",
    "topic": "Integration Patterns",
    "title": "Content-Based Router 및 Multicast(Sequential vs Parallel) 설계 패턴",
    "content": "메시지 본문이나 헤더 조건에 따라 분기하는 Router 구성과 여러 타깃 시스템에 동시 또는 순차 전송하는 Multicast 모범 사례입니다.\n\n- Parallel 처리 시 공유 변수 락 및 DB 커넥션 풀 경합에 유의해야 합니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Pattern",
      "Router",
      "Multicast",
      "Parallel",
      "Architecture"
    ]
  },
  {
    "id": "sap_know_pattern_loop_pagination",
    "topic": "Integration Patterns",
    "title": "Looping Process Call을 활용한 REST/OData 대용량 페이징 처리",
    "content": "타깃 API가 최대 100건/1000건 제한을 가진 경우 `$top` / `$skip` 또는 Cursor 기반 토큰을 루프 조건식으로 평가하여 전량 수신 완료 시까지 반복 호출하는 iFlow 패턴입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Pattern",
      "Looping",
      "Pagination",
      "REST",
      "OData"
    ]
  },
  {
    "id": "sap_know_pattern_datastore_retry",
    "topic": "Integration Patterns",
    "title": "Data Store 기반 비동기 버퍼링 및 자동 재시도(Retry) 파이프라인",
    "content": "타깃 시스템 점검 또는 일시적 네트워크 장애 시 메시지를 Data Store(Write)에 보관하고, 타이머 기반 재전송 iFlow가 주기적으로 미처리 메시지를 재시도(Read -> Poll)하는 내결함성 설계입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Pattern",
      "DataStore",
      "Retry",
      "DeadLetterQueue",
      "FaultTolerance"
    ]
  },
  {
    "id": "sap_know_adapters_best_practice",
    "topic": "Adapters",
    "title": "Cloud Integration 핵심 어댑터 구성 가이드 (OData, REST, SFTP, SOAP)",
    "content": "OData V2/V4 배치 및 페이징, REST 에러 핸들링(Throw Exception on Failure 관리), SFTP 락 파일 관리 모범 사례입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Adapter",
      "OData",
      "REST",
      "SFTP",
      "SOAP",
      "Performance"
    ]
  },
  {
    "id": "sap_know_adapter_rest_error_handling",
    "topic": "Adapters",
    "title": "REST 어댑터 HTTP 4xx/5xx 에러 수신 시 커스텀 파싱 및 흐름 제어",
    "content": "HTTP 수신자가 400 Bad Request 또는 404를 반환해도 iFlow가 즉시 붉은색 에러로 종료되지 않도록 `Throw Exception on Failure`를 해제하고 HTTP Status 코드를 수신해 정상 분기 처리하는 표준 패턴입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Adapter",
      "REST",
      "HTTP",
      "Status",
      "ErrorHandling"
    ]
  },
  {
    "id": "sap_know_adapter_sftp_lock",
    "topic": "Adapters",
    "title": "SFTP 어댑터 파일 잠금(Locking) 및 임시 디렉터리 핸들링",
    "content": "SFTP 송수신 시 부분 기록된 불완전 파일 읽기를 방지하기 위해 파일 쓰기 시 `.tmp` 확장자로 전송 완료 후 최종 파일명으로 원자적(Atomic) 이름 변경을 수행하는 구성 가이드입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Adapter",
      "SFTP",
      "Locking",
      "File",
      "Reliability"
    ]
  },
  {
    "id": "sap_know_adapter_event_mesh",
    "topic": "Adapters",
    "title": "SAP Event Mesh 및 AMQP 어댑터를 활용한 비동기 이벤트 연동",
    "content": "S/4HANA 비즈니스 이벤트(비즈니스 파트너 생성, 주문 상태 변경 등)를 Cloud Integration의 AMQP 어댑터를 통해 비동기 큐/토픽으로 수신하여 시스템 간 결합도를 최소화하는 이벤트 기반 아키텍처입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Adapter",
      "EventMesh",
      "AMQP",
      "EventDriven",
      "Asynchronous"
    ]
  },
  {
    "id": "sap_know_adapter_jdbc_cloud_connector",
    "topic": "Adapters",
    "title": "Cloud Connector를 통한 온프레미스 데이터베이스(JDBC) 직접 연동",
    "content": "사내망에 위치한 Oracle, MS SQL Server, SAP HANA 데이터베이스에 Cloud Connector의 TCP 터널링을 구성하고 JDBC 어댑터로 SELECT / INSERT / UPDATE 배치를 안전하게 처리하는 가이드입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Adapter",
      "JDBC",
      "CloudConnector",
      "OnPremise",
      "Database"
    ]
  },
  {
    "id": "sap_know_security_credentials",
    "topic": "Security",
    "title": "보안 자격증명 관리 및 OAuth2 Client Credentials 연동",
    "content": "SAP BTP 및 외부 SaaS 시스템 연동 시 OAuth2 Client Credentials, KeyStore 및 ITApiFactory를 통한 보안 자격증명 조회 패턴입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Security",
      "OAuth2",
      "KeyStore",
      "SecureStore",
      "ITApiFactory"
    ]
  },
  {
    "id": "sap_know_security_itapi_factory",
    "topic": "Security",
    "title": "ITApiFactory를 통한 보안 매개변수(Secure Parameter) 동적 호출",
    "content": "코드 내에 비밀번호나 API 토큰을 하드코딩하지 않고, BTP 모니터링의 Security Material에 등록된 파라미터를 Groovy에서 실시간 조회하는 모범 사례입니다.\n\n```groovy\nimport com.sap.it.api.ITApiFactory\nimport com.sap.it.api.securestore.SecureStoreService\n\ndef secureService = ITApiFactory.getService(SecureStoreService.class, null)\ndef credential = secureService.getUserCredential(\"MY_SECURE_TOKEN\")\ndef token = new String(credential.getPassword())\n```",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Security",
      "ITApiFactory",
      "SecureParameter",
      "Token",
      "BestPractice"
    ]
  },
  {
    "id": "sap_know_security_pgp",
    "topic": "Security",
    "title": "PGP Encryptor / Decryptor 파이프라인 및 디지털 서명 검증",
    "content": "금융권 및 대외 전송 문서의 기밀성과 무결성을 위해 PGP 공개키/개인키 기반의 자동 암호화/복호화 및 디지털 서명 검증 파이프라인 구성 방법입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Security",
      "PGP",
      "Encryption",
      "KeyRing",
      "Sign"
    ]
  },
  {
    "id": "sap_know_po_to_cpi_migration",
    "topic": "Migration",
    "title": "SAP PO(Process Orchestration)에서 Cloud Integration 마이그레이션 가이드",
    "content": "SAP PO 온프레미스 인터페이스(Java 매핑, RFC/IDoc, 디렉터리 시나리오)를 SAP Cloud Integration iFlow 및 Groovy로 전환하는 전략입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Migration",
      "SAP PO",
      "Cloud Integration",
      "BTP",
      "Cloud Connector"
    ]
  },
  {
    "id": "sap_know_migration_java_mapping_groovy",
    "topic": "Migration",
    "title": "SAP PO Java Mapping 코드를 Cloud Integration Groovy로 전환하는 가이드",
    "content": "기존 SAP PI/PO의 `com.sap.aii.mapping.api.Transformation` 인터페이스 기반 Java Mapping을 Cloud Integration의 `processData(Message message)` Groovy 스크립트로 1:1 변환하는 단계별 가이드입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Migration",
      "JavaMapping",
      "Groovy",
      "Conversion",
      "Refactoring"
    ]
  },
  {
    "id": "sap_know_migration_partner_directory",
    "topic": "Migration",
    "title": "Partner Directory를 활용한 EDI/B2B 거래처별 동적 파라미터화",
    "content": "수십 개 협력사와의 EDI 인터페이스를 단일 iFlow로 통합하고, 거래처 ID(Sender/Receiver Partner)에 따라 엔드포인트 URL, 자격증명 별칭, 변환 XSLT를 Partner Directory에서 동적 로드하는 고효율 아키텍처입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Migration",
      "PartnerDirectory",
      "B2B",
      "EDI",
      "DynamicRouting"
    ]
  },
  {
    "id": "sap_know_migration_edge_integration_cell",
    "topic": "Migration",
    "title": "Edge Integration Cell (EIC) 하이브리드 온프레미스 런타임 구축 가이드",
    "content": "클라우드 제어 플레인을 유지하면서 온프레미스 Kubernetes 클러스터(SUSE Rancher, RedHat OpenShift) 상에 SAP Integration Suite 런타임을 배포하여 데이터 주권 및 로컬 통신 지연을 최소화하는 아키텍처 가이드입니다.",
    "doc_url": "https://help.sap.com/docs/cloud-integration/sap-cloud-integration/development?locale=en-US",
    "tags": [
      "Migration",
      "EdgeIntegrationCell",
      "Kubernetes",
      "Hybrid",
      "Architecture"
    ]
  },
  {
    "id": "sap_know_iflow_erp_to_legacy_rest_pattern",
    "topic": "iFlow Architecture",
    "title": "ERP HTTPS -> XML/JSON 변환 -> 레거시 REST -> JSON/XML -> ERP 동기 응답 표준 iFlow 설계",
    "content": "### 3계층 iFlow 아키텍처 (Main Process + Local SubProcess + Exception SubProcess)\n\n1. ERP HTTPS Inbound: HTTPS Sender Adapter (/erp/legacy/order/v1) + Content Modifier (TransactionID 보관)\n2. XML to JSON Converter: Streaming=ON, Suppress JSON Root Element 설정\n3. 레거시 REST 전송: Request-Reply + HTTP Receiver (OAuth2 Client Credentials, Throw Exception on Failure=false)\n4. JSON to XML Converter: Add XML Root Element (LegacyOrderResponse), Streaming=ON\n5. ERP 동기 응답: Content-Type application/xml, HTTP 200 반환\n6. Exception Subprocess: CamelExceptionCaught 파싱 및 ERP 표준 Fault XML 생성 반환",
    "doc_url": "https://help.sap.com/docs/integration-suite/isuite-integrations-and-apis/design-guidelines?locale=en-US",
    "tags": [
      "iFlow",
      "Architecture",
      "HTTPS",
      "REST",
      "XML",
      "JSON",
      "Converter",
      "DesignGuidelines"
    ]
  },
  {
    "id": "sap_know_apim_edge_facade_pattern",
    "topic": "API Management",
    "title": "SAP API Management (Cloud Foundry)를 활용한 iFlow 보안 및 트래픽 게이트웨이(Facade) 설계",
    "content": "### SAP API Management & Cloud Integration 연계 아키텍처\n\n- API Management (Edge): VerifyAPIKey, SpikeArrest(초당 트래픽 제한), Quota, XMLtoJSON 정책을 전면에 배치하여 백엔드 보호\n- Cloud Integration (Core): 복잡한 비즈니스 스키마 매핑, 사내 레거시 연동(Cloud Connector), 트랜잭션 오케스트레이션",
    "doc_url": "https://help.sap.com/docs/sap-api-management/sap-api-management/sap-api-management-in-cloud-foundry-environment?locale=en-US",
    "tags": [
      "APIManagement",
      "APIProxy",
      "CloudFoundry",
      "SpikeArrest",
      "VerifyAPIKey",
      "Security",
      "Architecture"
    ]
  },
  {
    "id": "sap_know_hub_field_service_best_practices",
    "topic": "Design Guidelines",
    "title": "SAP Business Accelerator Hub 표준 패키지 기반 iFlow 설계 지침 (Design Guidelines)",
    "content": "### SAP Business Accelerator Hub 패키지 표준 설계 원칙\n\n1. 프로세스 모듈화: Main Process와 Local Integration Process(Process Call) 분리\n2. 변환 컴포넌트 최적화: 단순 변환은 Converter(Streaming=ON), 복잡한 비즈니스 변환은 Message Mapping\n3. 장애 격리: HTTP Receiver Throw Exception on Failure=false 설정 후 Router 분기, Exception Subprocess에서 MPL 로깅\n4. 추적성 확보: 비즈니스 키를 MPL Custom Header Property에 등록",
    "doc_url": "https://api.sap.com/package/SAPS4HANAIntegrationwithSAPFieldServiceManagement/integrationflow",
    "tags": [
      "DesignGuidelines",
      "BusinessHub",
      "AcceleratorHub",
      "S4HANA",
      "FieldService",
      "BestPractice",
      "Streaming"
    ]
  }
];
