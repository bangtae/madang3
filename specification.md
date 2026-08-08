# specification.md - 제품 요구사항 명세서 (PRD)

## 1. 시스템 요구사항
- **실행 환경**: Modern Web Browsers (Chrome, Edge, Safari 등)
- **데이터 지속성**: Browser LocalStorage
- **외부 연동**: LLM API (자동 카테고리 태깅 기능용)

## 2. 데이터 모델 스키마 (API Item)
```json
{
  "id": "api_1722830000000",
  "title": "API 서비스 이름",
  "serviceUrl": "https://api.example.com",
  "docsUrl": "https://docs.example.com",
  "category": "AI / 머신러닝",
  "description": "자동 생성되거나 사용자가 작성한 설명",
  "createdAt": "2026-08-05T04:55:00.000Z"
}
```

## 3. UI/UX 사양
- **헤더 (Top Nav)**:
  - 브랜드 로고/타이틀
  - 탭 버튼: `메인`, `API`
- **사이드바 (Left Sidebar)**:
  - `메인` 탭 클릭 시: 메인 홈 메뉴
  - `API` 탭 클릭 시: `API 정보` 메뉴 표시
- **본문 (Main Content Area)**:
  - 메인 뷰: 카드 형태의 통계 대시보드 (총 API 수, 카테고리 수, 최근 등록 API 등)
  - API 정보 뷰: 
    - [신규 API 추가] 폼 (서비스 URL, 사용법 URL 입력 -> AI 카테고리 자동 추천 -> 저장)
    - [API 목록] 카드/테이블 뷰 및 검색/필터
