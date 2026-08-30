---
description: 변경된 소스 코드를 GCP Cloud Run(madang3) 및 App Engine에 주기적으로 재배포하고 검증하는 에이전트 워크플로우
---

# `/gcp` 변경 소스 GCP 자동 배포 워크플로우

이 워크플로우는 사용자가 `/gcp` 커맨드를 입력했을 때, AI 에이전트가 로컬에서 수정된 소스 코드를 GCP 서비스(`madang3` / `madang2-trans` 프로젝트)에 자동으로 안전하게 재배포하고 검증을 완료하기 위한 작업 지침입니다.

---

## 🌐 1. 라이브 운영 및 접속 URL 목록

- 🚀 **GCP Cloud Run 메인 라이브 URL (외부 즉시 접속 가능)**:
  👉 **[https://madang3-264643074286.asia-northeast3.run.app/](https://madang3-264643074286.asia-northeast3.run.app/)**
- ☁️ **App Engine 서브 URL**:
  👉 [https://madang2-trans.du.r.appspot.com/](https://madang2-trans.du.r.appspot.com/)
- 🌐 **커스텀 도메인**:
  👉 `https://madang3.com/` (Google Webmaster Central TXT 소유권 검증 후 연결)

---

## 🤖 2. 에이전트 실행 절차 (Agent Execution Steps)

`/gcp` 실행 요청 시 AI 에이전트는 아래 4개 단계를 연속으로 수행합니다.

### 1단계: 배포 전 소스 코드 및 구문 점검
```powershell
# 1. 변경된 파일 상태 점검
git status --short

# 2. 메인 서버 코드 구문 검사
node -c server.js
```

---

### 2단계: GCP Cloud Run / App Engine 재배포 실행

```powershell
# 옵션 A: GCP Cloud Run madang3 서비스 배포 (권장 - madang3 URL 유지)
gcloud.cmd run deploy madang3 --source . --region=asia-northeast3 --allow-unauthenticated --quiet

# 옵션 B: GCP App Engine 배포
gcloud.cmd app deploy app.yaml --project=madang2-trans --quiet
```

---

### 3단계: 배포 결과 및 madang3 서비스 접속 검증

```powershell
# Cloud Run 서비스 접속 상태 확인 (StatusCode 200)
powershell -Command "(Invoke-WebRequest -Uri 'https://madang3-264643074286.asia-northeast3.run.app/' -UseBasicParsing).StatusCode"
```

---

### 4단계: 실시간 로그 감시

```powershell
gcloud.cmd run services logs tail madang3 --region=asia-northeast3
```
