# PORTAL BANG

웹 기반 개인화 포털 서비스 및 대화형 AI/LLM 연동 애플리케이션 프로젝트입니다.

---

## 📌 프로젝트 소개 (Overview)

**PORTAL BANG**은 MVC(Model-View-Controller) 아키텍처를 기반으로 설계된 경량 웹 애플리케이션입니다. LLM(대형 언어 모델) 연동 및 유용한 유틸리티 기능을 통합하여 사용자 맞춤형 포털 환경을 제공합니다.

---

## ✨ 주요 기능 (Key Features)

- **대화형 LLM 연동**: LLM API와의 효율적인 통신 및 응답 처리 (`llmHelper.js`)
- **다운로드 유틸리티**: 파일 다운로드 및 세션/데이터 저장 지원 (`downloadHelper.js`)
- **모듈화된 MVC 구조**: Controller, Model, View, Core로 분리된 클린 웹 아키텍처
- **로컬 테스트 스크립트 제공**: PowerShell 기반 간이 개발 서버 지원 (`server.ps1`)

---

## 📂 디렉토리 구조 (Directory Structure)

```text
portal_bang/
├── app/
│   ├── controllers/   # 비즈니스 로직 및 이벤트 컨트롤러 (appController.js)
│   ├── core/          # 앱 핵심 설정 (config.js)
│   ├── models/        # API 데이터 모델 (apiModel.js)
│   ├── utils/         # LLM 및 다운로드 헬퍼 함수 (llmHelper.js, downloadHelper.js)
│   ├── views/         # UI 렌더링 및 뷰 로직 (uiView.js)
│   └── main.js        # 애플리케이션 엔트리 포인트
├── index.html         # 메인 HTML UI
├── style.css          # 기본 스타일시트
├── server.ps1         # 로컬 실행용 PowerShell 스크립트
├── setup_git.ps1      # Git 환경 설정 스크립트
└── docs/              # 설계 및 아키텍처 문서
    ├── 0_vision.md
    ├── 1_user_profile.md
    ├── architecture_baseline.md
    ├── decision_log.md
    └── specification.md
🛠 기술 스택 (Tech Stack)
Frontend: HTML5, CSS3, JavaScript (Vanilla ES6+)

Architecture: Client-side MVC Architecture

Environment / Scripting: PowerShell (Windows Local Server)

Integration: External LLM REST APIs

🚀 실행 방법 (Getting Started)
로컬 환경 실행
Windows PowerShell 환경에서 포함된 스크립트를 사용하여 로컬 개발 서버를 실행할 수 있습니다.

리포지토리 클론:

Bash
git clone https://github.com/bangtae/madang3.git
cd madang3
로컬 서버 실행:

PowerShell
.\server.ps1
브라우저 접속:
웹 브라우저를 열고 http://localhost:8080 (또는 지정된 포트)로 접속합니다.

📝 프로젝트 문서 안내 (Documentation)
0_vision.md: 프로젝트의 비전과 방향성

architecture_baseline.md: 시스템 구조 및 베이스라인 아키텍처

specification.md: 명세 및 요구사항 정의

decision_log.md: 개발 의사결정 기록
