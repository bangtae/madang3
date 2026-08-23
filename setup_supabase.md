# PORTAL BANG - Supabase 무료 클라우드 DB 연동 가이드

본 포털 시스템은 **Supabase 무료 클라우드 데이터베이스**를 지원합니다.
Supabase를 연동하면 **노트북 로컬**과 **GCP 배포 서버**에서 동일한 무료 DB에 접속하여 **여러 사람이 실시간으로 데이터를 공유**할 수 있습니다.

---

## 1. Supabase 1분 무료 프로젝트 생성

1. [Supabase 공식 홈페이지 (supabase.com)](https://supabase.com)에 접속하여 무료 가입 후 로그인을 진행합니다.
2. **[New Project]** 버튼을 클릭하여 새 프로젝트를 생성합니다.
   - **Name**: `portal-bang-db` (원하는 이름)
   - **Database Password**: 안전한 암호 설정
   - **Region**: `N. Virginia (us-east-1)` 또는 `Tokyo (ap-northeast-1)` 선택 후 **Create new project** 클릭.

---

## 2. DB 테이블 자동 생성 (1초 소요)

1. Supabase 대시보드 좌측 메뉴에서 **[SQL Editor]** 아이콘을 클릭합니다.
2. **[New query]** 버튼을 누릅니다.
3. 프로젝트 내 `data/supabase_schema.sql` 파일의 전체 내용을 복사하여 쿼리 창에 붙여넣습니다.
4. 우측 하단의 **[Run]** (또는 Ctrl+Enter) 버튼을 눌러 실행합니다.
   - `apis`, `ai_models`, `ai_terms`, `sap_terms`, `ip_rules`, `agent_workflows` 테이블 및 보안 정책(RLS)이 자동 생성됩니다.

---

## 3. 앱 소스 코드에 Supabase 접속 정보 입력

1. Supabase 대시보드 좌측 메뉴의 **[Project Settings] (톱니바퀴) ➔ [API]** 로 이동합니다.
2. 아래 2가지 값을 복사합니다:
   - **Project URL** (예: `https://xyzwhatever.supabase.co`)
   - **Project API keys ➔ anon public** 키 (예: `eyJhbGciOiJIUzI1NiIsInR...`)

3. 프로젝트 파일 `app/core/config.js`를 열어 아래 항목을 수정합니다:

```javascript
window.CONFIG = {
  STORAGE_KEY: 'portal_api_items',
  DEFAULT_CATEGORIES: ['AI / LLM', '지도 / 위치', '날씨', '소셜 / 인증', '기타'],
  
  // 🔽 Supabase 접속 정보 대입
  SUPABASE_URL: 'https://your-actual-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-actual-anon-key-here',
  ...
};
```

---

## 4. 로컬 및 GCP 배포 환경 적용 완료!

- **노트북 로컬**: `index.html`을 브라우저로 직접 열거나 로컬 서버를 실행하면, 자동으로 Supabase Cloud DB에 연결되어 236개 이상의 기본 데이터가 초기 시딩(Seeding)되고 연동됩니다.
- **GCP 배포**: 수정된 소스를 GCP(VM / App Engine / Cloud Run / Static Web)에 배포하시면, **접속한 모든 사용자가 실시간으로 공유된 데이터를 조회, 수정, 등록**할 수 있습니다.
