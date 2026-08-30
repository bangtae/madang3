---
description: 변경 사항을 스테이징하고 커밋/푸시(origin main)하며, 선택적으로 /gcp 배포까지 연동하는 워크플로우
---

# `/git` 자동 커밋 & GitHub 푸시 워크플로우

이 워크플로우는 사용자가 `/git` 커맨드를 입력했을 때, 로컬 변경 사항을 검서·스테이징하고 시맨틱 커밋 메시지(feat, fix, docs 등)를 자동 생성하여 `origin main` 브랜치에 푸시한 후, 선택적으로 GCP 배포(`/gcp`)까지 연속 실행하기 위한 에이전트 지침입니다.

---

## 🤖 에이전트 실행 절차 (Agent Execution Steps)

`/git` 실행 요청 시 AI 에이전트는 아래 5단계를 연속으로 수행합니다.

### 1단계: Git 실행 환경 및 PATH 자동 설정
Windows 환경에서 `git` 명령어가 전역 등록되지 않은 경우 MinGit 경로를 자동 감지하여 실행합니다.

```powershell
# Git 바이너리 경로 정의
$gitBin = if (Test-Path "$env:LOCALAPPDATA\Programs\MinGit\cmd\git.exe") {
    "$env:LOCALAPPDATA\Programs\MinGit\cmd\git.exe"
} else {
    "git"
}
```

---

### 2단계: 로컬 변경 사항 점검 (Pre-commit Status)
변경된 파일 목록과 상태를 확인합니다.

```powershell
& $gitBin status --short
```

---

### 3단계: 스테이징 및 커밋 메시지 자동 생성 (Stage & Commit)
변경 파일 전체를 스테이징하고, 변경 내역에 맞는 커밋 메시지를 작성하여 커밋합니다.

```powershell
# 1. 변경 파일 스테이징
& $gitBin add .

# 2. 시맨틱 커밋 실행 (에이전트가 변경점에 따라 적절한 메시지 생성)
& $gitBin commit -m "feat: update portal application features and workflow scripts"
```

---

### 4단계: GitHub 원격 저장소 푸시 (Push to origin main)
`origin main` 브랜치로 푸시를 수행합니다.

```powershell
& $gitBin push origin main
```

---

### 5단계: 배포 연동 (Optional GCP Deploy Integration)
GitHub 푸시가 완료된 후, 최신 소스를 GCP App Engine에도 즉시 반영할지 확인하거나 `/gcp` 워크플로우를 호출합니다.

```powershell
# /gcp 워크플로우 자동 연동 또는 안내
powershell -ExecutionPolicy Bypass -File ./scripts/deploy_to_gcp.ps1
```
