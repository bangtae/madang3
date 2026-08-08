# plan.md - 모듈화 개발 로드맵

## Phase 1: 기본 스켈레톤 및 3단 레이아웃 구축
- [ ] `index.html` 및 `style.css` 작성 (3단 레이아웃: 상단 헤더, 좌측 사이드바, 중앙 본문)
- [ ] 상단 메뉴 (`메인`, `API`) 및 좌측 메뉴 (`API 정보`) 탭 전환 반응형 UI 구현

## Phase 2: LocalStorage 데이터 모델 및 CRUD 구현
- [ ] `app/models/apiModel.js` - API 정보 추가, 읽기, 삭제, 수정 함수 개발
- [ ] 더미 데이터 생성 및 로컬스토리지 연동 테스트

## Phase 3: API 정보 관리 뷰 & 메인 대시보드 뷰 연동
- [ ] `app/views/uiView.js` - 대시보드 카드 뷰 및 API 등록/목록 UI 컴포넌트 렌더링
- [ ] `app/controllers/appController.js` - 탭 전환 및 이벤트 리스너 바인딩

## Phase 4: LLM 자동 카테고리 태깅 기능 통합
- [ ] `app/utils/llmHelper.js` - API URL 전달 시 LLM 기반 카테고리 추론 로직 작성
- [ ] API 등록 폼에 'AI 자동 카테고리 생성' 연동

## Phase 5: 최종 검토, 예외 처리 및 UI Polish
- [ ] 비어있는 입력값 처리, URL 형식 검증, 엣지 케이스 테스트
- [ ] UI/UX 미세 스타일 및 반응형 다듬기
