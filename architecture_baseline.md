# architecture_baseline.md - 아키텍처 기준서

## 1. 디렉터리 구조 및 역할 분담
```
/
├── app/
│   ├── core/           # 설정, 공통 상수 (config.js)
│   ├── models/         # LocalStorage 데이터 CRUD 핸들러 (apiModel.js)
│   ├── views/          # 3단 레이아웃 UI 및 화면 컴포넌트 (uiView.js)
│   ├── controllers/    # 탭 이동, API 등록 및 LLM 카테고리 자동화 컨트롤러 (appController.js)
│   └── utils/          # LLM API 호출 헬퍼 및 유틸리티 (llmHelper.js)
├── tests/              # 유닛 테스트 / 데이터 검증 코드
├── backups/            # 파일 버전 백업 저장소
├── logs/               # 로그 저장소
├── specification.md    # PRD 명세서
├── architecture_baseline.md # 기술 아키텍처 기준서
├── decision_log.md     # 기술 의사결정 기록 일지
├── version_ledger.md   # 백업 이력 관리 대장
├── RULE.md             # 프로젝트 개발 규칙
├── plan.md             # 구현 단계별 개발 계획서
├── progress.md         # 개발 진행 상황 표
├── .env                # 환경 변수 설정
└── index.html          # 진입점 HTML
```

## 2. 모듈화 가이드라인
- 모든 스크립트는 ES Module (`type="module"`) 방식으로 작성
- 파일당 코드 수는 200~300줄 이내 유지
- DOM 이벤트 처리와 데이터 처리는 컨트롤러(`controllers/`)에서 중재
