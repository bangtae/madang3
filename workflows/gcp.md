---
description: 변경된 소스 코드를 GCP App Engine(madang3.com)에 주기적으로 재배포하고 검증하는 에이전트 워크플로우
---

# `/gcp` 변경 소스 GCP 자동 배포 워크플로우

이 워크플로우는 사용자가 `/gcp` 커맨드를 입력했을 때, AI 에이전트가 로컬에서 수정된 소스 코드를 GCP App Engine(`madang2-trans` 프로젝트 / `madang3.com`)에 자동으로 안전하게 재배포하고 검증을 완료하기 위한 작업 지침입니다.

---

## 🤖 에이전트 실행 절차 (Agent Execution Steps)

`/gcp` 실행 요청 시 AI 에이전트는 아래 4개 단계를 연속으로 수행합니다.

### 1단계: 배포 전 소스 코드 및 구문 점검
Windows 환경 호환성을 위해 `gcloud.cmd` 및 `node -c` 구문 검사를 수행합니다.

```powershell
# 1. 변경된 파일 상태 점검
git status --short

# 2. 메인 서버 코드 구문 검사
node -c server.js

# 3. 활성화된 GCP 프로젝트 확인 (기본값: madang2-trans)
gcloud.cmd config get-value project
```

---

### 2단계: GCP App Engine 재배포 실행
현재 소스 코드를 GCP App Engine Standard 환경에 배포합니다.

```powershell
# 옵션 A: gcloud.cmd 직접 배포 (권장)
gcloud.cmd app deploy app.yaml --project=madang2-trans --quiet

# 옵션 B: 배포 스크립트 실행
powershell -ExecutionPolicy Bypass -File ./scripts/deploy_to_gcp.ps1
```

---

### 3단계: 배포 결과 및 madang3.com 접속 실증 검증
배포 성공 후 신규 서비스 버전 및 도메인 접속 상태를 검증합니다.

```powershell
# 1. 트래픽 100% 수신 중인 활성 버전 확인
gcloud.cmd app versions list --filter="traffic_split > 0"

# 2. 운영 도메인 (https://madang3.com) 상태 확인
gcloud.cmd app browse --project=madang2-trans
```

---

### 4단계: 실시간 로그 감시 및 이전 버전 정리

```powershell
# 1. 실시간 서버 이벤트 로그 스트리밍
gcloud.cmd app logs tail -s default

# 2. 이전 구버전 목록 조회 및 정리
gcloud.cmd app versions list
# gcloud.cmd app versions delete <OLD_VERSION_ID> --quiet
```
