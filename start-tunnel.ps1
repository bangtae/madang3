# start-tunnel.ps1 - Cloudflare Quick Tunnel execution script for Threads AI Agent (Port 8000)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $scriptDir) { $scriptDir = Get-Location }

$cloudflaredExe = Join-Path $scriptDir "cloudflared.exe"

if (-not (Test-Path $cloudflaredExe)) {
    $globalCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($globalCmd) {
        $cloudflaredExe = "cloudflared"
    } else {
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host " 🚀 Cloudflare Tunnel 실행 파일(cloudflared.exe) 다운로드 중..." -ForegroundColor Yellow
        Write-Host "============================================================" -ForegroundColor Cyan
        $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $url -OutFile $cloudflaredExe -UseBasicParsing
            Write-Host " ✅ cloudflared.exe 다운로드 완료!" -ForegroundColor Green
        } catch {
            Write-Host " ❌ cloudflared.exe 다운로드 실패: $_" -ForegroundColor Red
            Write-Host " 아래 주소에서 직접 다운로드하여 프로젝트 폴더에 저장하세요:" -ForegroundColor Yellow
            Write-Host " $url" -ForegroundColor White
            exit 1
        }
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " 🌐 Threads AI 에이전트(포트 8000) Cloudflare Quick Tunnel 시작" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " 📌 터널 연결 후 출력되는 trycloudflare.com HTTPS URL을 복사하여" -ForegroundColor Yellow
Write-Host "    GCP 웹 UI -> [Threads 토큰 & 에이전트 설정] 모달 -> '에이전트 Base URL'에 저장하세요." -ForegroundColor Yellow
Write-Host " 🛑 종료하려면 Ctrl + C 를 누르세요.`n" -ForegroundColor Gray

& $cloudflaredExe tunnel --url http://127.0.0.1:8000
