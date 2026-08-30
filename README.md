# MADANG3 (PORTAL BANG) - Integrated Data & AI Portal System

[![Service Status](https://img.shields.io/badge/Production-https%3A%2F%2Fmadang3.com-brightgreen)](https://madang3.com)
[![GCP App Engine](https://img.shields.io/badge/GCP-App%20Engine%20(Node.js%2022)-blue)](https://cloud.google.com/appengine)
[![GitHub Repository](https://img.shields.io/badge/GitHub-bangtae%2Fmadang3-black)](https://github.com/bangtae/madang3)

**MADANG3**는 클라이언트 사이드 MVC(Model-View-Controller) 아키텍처와 Node.js Express 백엔드를 결합한 **통합 데이터 및 대화형 AI 포털 서비스**입니다. Google Gemini LLM API, Supabase 데이터베이스, GCP App Engine 인프라 및 자동화 배포 워크플로우(`/gcp`, `/git`)를 포함합니다.

🌐 **운영 서비스 주소**: [https://madang3.com](https://madang3.com) (및 [https://www.madang3.com](https://www.madang3.com))

---

## 📌 주요 기능 (Key Features)

- 🤖 **대화형 AI & Gemini LLM 연동**: Google Gemini API 기반 멀티턴 대화, 모델 추론 및 주식/데이터 분석 지원 (`llmHelper.js`, `apiModel.js`)
- 📊 **통합 데이터 포털 & Supabase DB**: Supabase 데이터베이스 동기화 및 실시간 데이터 모델 지원 (`setup_supabase.md`, `scripts/push_*`)
- 🏗️ **클린 MVC 아키텍처**: 비즈니스 로직(Controller), 데이터 처리(Model), UI 렌더링(View) 분리로 유지보수성 극대화
- ☁️ **GCP App Engine 자동 무중단 배포**: `app.yaml` 기반 Node.js 22 최적화 인프라 및 Google-Managed SSL 지원
- ⚡ **에이전트 원클릭 워크플로우**:
  - `/gcp`: 로컬 소스 변경 시 GCP App Engine 및 `madang3.com`에 원클릭 자동 배포 및 헬스체크
  - `/git`: 로컬 변경 내역 자동 스테이징, AI 커밋 메시지 생성 및 `origin main` 원클릭 푸시

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 / 서비스 | 상세 설명 |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3, JavaScript (ES6+) | 모듈형 클라이언트 MVC 패턴 기반 데이터 및 AI UI |
| **Backend** | Node.js (v22+), Express.js | API 프록시 서버, 정적 파일 제공 및 서버 라우팅 (`server.js`) |
| **AI / LLM** | Google Gemini API | 대화형 AI 및 스마트 포털 유틸리티 |
| **Database** | Supabase (PostgreSQL) | 클라우드 데이터베이스 및 테이블 시드 스크립트 |
| **Cloud / Infra** | Google Cloud Platform (App Engine) | F1 인스턴스, 자동 스케일링, `madang3.com` 커스텀 도메인 및 Managed SSL |
| **Automation** | PowerShell, MinGit, AGY Workflows | 로컬 서버 실행 스크립트(`server.ps1`), `/gcp`, `/git` 워크플로우 |

---

## 📂 프로젝트 구조 (Directory Structure)

```text
madang3/
├── .agents/
│   └── workflows/
│       ├── gcp.md             # /gcp 에이전트 배포 워크플로우 명세
│       └── git.md             # /git 에이전트 Git 푸시 워크플로우 명세
├── app/
│   ├── controllers/           # 비즈니스 로직 및 이벤트 핸들러 (appController.js)
│   ├── core/                  # 애플리케이션 핵심 설정 (config.js)
│   ├── models/                # AI 및 데이터 API 모델 (apiModel.js, stockTempModel.js)
│   ├── utils/                 # LLM 및 다운로드 헬퍼 모듈 (llmHelper.js, downloadHelper.js)
│   ├── views/                 # UI DOM 렌더링 및 View 모듈 (uiView.js, stockTempView.js)
│   └── main.js                # 애플리케이션 프론트엔드 엔트리 포인트
├── data/                      # 시드 데이터, SQL 스키마 및 메뉴 설정
├── scripts/                   # GCP 배포, Supabase 동기화 및 자동화 스크립트
├── app.yaml                   # GCP App Engine Node.js 22 설정 파일
├── Dockerfile                 # Cloud Run / 컨테이너 배포용 Docker 설정
├── index.html                 # 메인 웹 포털 인터페이스
├── login.html                 # 로그인 및 인증 인터페이스
├── package.json               # Node.js 패키지 및 npm 스크립트 ("start", "deploy")
├── server.js                  # Express 웹 서버 엔트리 포인트
├── server.ps1                 # 로컬 개발 서버 구동 PowerShell 스크립트
├── style.css                  # 통합 UI 디자인 및 애니메이션 스타일시트
└── README.md                  # 프로젝트 통합 안내 및 현행화 문서
```

---

## 🚀 빠른 시작 가이드 (Quick Start)

### 1. 로컬 환경 실행

#### Option A: Node.js 서버 실행 (권장)
```bash
# 의존성 설치
npm install

# 서버 실행 (기본 포트: 3000 / PORT 환경변수 설정 가능)
npm start
```

#### Option B: PowerShell 개발 서버 실행
```powershell
.\server.ps1
```

접속 주소: `http://localhost:3000` (또는 지정 포트)

---

### 2. 자동화 워크플로우 명령어 (AGY / Antigravity Workflow)

Antigravity 대화창에서 아래 커맨드를 입력하여 소스 코드 반영 및 배포를 원클릭으로 실행할 수 있습니다.

- **`/git` 실행**: 로컬 변경 사항 스테이징 -> AI 커밋 메시지 작성 -> GitHub (`origin main`) 자동 푸시
- **`/gcp` 실행**: 구문 검사 -> GCP App Engine 자동 배포 -> `https://madang3.com` 헬스체크 및 트래픽 전환

---

## 📝 관련 시스템 문서 (Documentation)

- [`0_vision.md`](file:///c:/Users/bangt/Downloads/madang3/0_vision.md): 프로젝트 비전 및 통합 데이터 포털 방향성
- [`architecture_baseline.md`](file:///c:/Users/bangt/Downloads/madang3/architecture_baseline.md): 시스템 베이스라인 아키텍처
- [`specification.md`](file:///c:/Users/bangt/Downloads/madang3/specification.md): 요구사항 및 상세 명세
- [`setup_supabase.md`](file:///c:/Users/bangt/Downloads/madang3/setup_supabase.md): Supabase 연동 및 DB 구축 가이드
- [`.agents/workflows/gcp.md`](file:///c:/Users/bangt/Downloads/madang3/.agents/workflows/gcp.md): GCP 배포 상세 워크플로우
- [`.agents/workflows/git.md`](file:///c:/Users/bangt/Downloads/madang3/.agents/workflows/git.md): Git 버전 관리 상세 워크플로우
