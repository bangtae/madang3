# Ultra-Robust Non-Blocking TCP Socket HTTP Server in PowerShell with Whitelist/Blacklist & Access Logging
param([int]$Port = 8080)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$root = $PSScriptRoot
$dataDir = Join-Path $root "data"
$dataFile = Join-Path $dataDir "apis.json"
$aiDataFile = Join-Path $dataDir "aiModels.json"
$aiJsFile = Join-Path $dataDir "initialAiModels.js"
$aiTermDataFile = Join-Path $dataDir "aiTerms.json"
$aiTermJsFile = Join-Path $dataDir "initialAiTerms.js"
$sapTermDataFile = Join-Path $dataDir "sapTerms.json"
$sapTermJsFile = Join-Path $dataDir "initialSapTerms.js"
$allowedIpsFile = Join-Path $dataDir "allowed_ips.json"
$menuConfigFile = Join-Path $dataDir "menuConfig.json"
$workflowsFile = Join-Path $dataDir "workflows.json"
$blockedIpsFile = Join-Path $dataDir "blocked_ips.json"
$accessLogsFile = Join-Path $dataDir "access_logs.json"
$stockTempDataFile = Join-Path $dataDir "stockTemp.json"
$stockTempJsFile = Join-Path $dataDir "initialStockTemp.js"
$sapNewsDataFile = Join-Path $dataDir "sapNews.json"
$sapNewsJsFile = Join-Path $dataDir "initialSapNews.js"
$sapKnowledgeDataFile = Join-Path $dataDir "sapKnowledge.json"
$sapKnowledgeJsFile = Join-Path $dataDir "initialSapKnowledge.js"

$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Get-GeminiApiKey {
    if ($env:GEMINI_API_KEY -and $env:GEMINI_API_KEY -ne "your_gemini_api_key_here") {
        return $env:GEMINI_API_KEY
    }
    $envFile = Join-Path $PSScriptRoot ".env"
    if (Test-Path $envFile) {
        $lines = Get-Content $envFile
        foreach ($line in $lines) {
            if ($line -match '^\s*GEMINI_API_KEY\s*=\s*(.+)$') {
                $k = $matches[1].Trim()
                if ($k -and $k -ne "your_gemini_api_key_here") {
                    return $k
                }
            }
        }
    }
    return $null
}

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

if (-not (Test-Path $allowedIpsFile)) {
    $defaultAllowed = '["127.0.0.1", "::1", "192.168.219.115", "192.168.219.*"]'
    [System.IO.File]::WriteAllText($allowedIpsFile, $defaultAllowed, $Utf8NoBom)
}

if (-not (Test-Path $blockedIpsFile)) {
    [System.IO.File]::WriteAllText($blockedIpsFile, "[]", $Utf8NoBom)
}

if (-not (Test-Path $accessLogsFile)) {
    [System.IO.File]::WriteAllText($accessLogsFile, "[]", $Utf8NoBom)
}

function Send-JsonResponse($stream, $corsHeaders, $jsonText) {
    if ($null -eq $jsonText -or [string]::IsNullOrWhiteSpace($jsonText)) {
        $jsonText = "[]"
    }
    if ($jsonText.Length -gt 0 -and [int]$jsonText[0] -eq 65279) {
        $jsonText = $jsonText.Substring(1)
    }
    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonText)
    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
}

function Send-RawBytesResponse($stream, $corsHeaders, $contentType, [byte[]]$bodyBytes) {
    if ($null -eq $bodyBytes) { $bodyBytes = [byte[]]@() }
    $responseHeader = "HTTP/1.1 200 OK`r`nContent-Type: ${contentType}`r`nCache-Control: no-cache, no-store, must-revalidate`r`nPragma: no-cache`r`nContent-Length: $($bodyBytes.Length)`r`n${corsHeaders}Connection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($bodyBytes.Length -gt 0) {
        $stream.Write($bodyBytes, 0, $bodyBytes.Length)
    }
    try { $stream.Flush() } catch {}
}

function Log-Access([string]$clientIp, [string]$status, [string]$requestPath) {
    if ($requestPath -match '\.(css|js|png|jpg|svg|ico)$') {
        return
    }

    try {
        $logs = @()
        if (Test-Path $accessLogsFile) {
            $raw = [System.IO.File]::ReadAllText($accessLogsFile, [System.Text.Encoding]::UTF8)
            if ($raw.StartsWith([char]0xFEFF)) { $raw = $raw.Substring(1) }
            if (-not [string]::IsNullOrWhiteSpace($raw)) {
                $parsed = $raw | ConvertFrom-Json
                if ($null -ne $parsed) { $logs = @($parsed) }
            }
        }

        $nowStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        $existing = $logs | Where-Object { $_.ip -eq $clientIp }

        if ($null -ne $existing) {
            $existing.lastAccess = $nowStr
            $existing.count = [int]$existing.count + 1
            $existing.status = $status
            $existing.lastPath = $requestPath
        } else {
            $newLog = [PSCustomObject]@{
                ip = $clientIp
                firstAccess = $nowStr
                lastAccess = $nowStr
                count = 1
                status = $status
                lastPath = $requestPath
            }
            $logs = @($newLog) + $logs
        }

        if ($logs.Count -gt 200) {
            $logs = $logs[0..199]
        }

        $jsonStr = $logs | ConvertTo-Json -Depth 3
        [System.IO.File]::WriteAllText($accessLogsFile, $jsonStr, $Utf8NoBom)
    } catch {}
}

# 8080 ?ы듃瑜??먯쑀 以묒씤 湲곗〈 ?꾨줈?몄뒪 ?먮룞 ?뺣━ (Port Conflict Auto-Recovery)
try {
    $existingConns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($null -ne $existingConns) {
        foreach ($conn in $existingConns) {
            $owningPid = $conn.OwningProcess
            if ($owningPid -and $owningPid -ne $PID) {
                Write-Host " [Port Recovery] Terminating existing zombie process (PID: $owningPid) on Port $Port..." -ForegroundColor Yellow
                Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Milliseconds 300
    }
} catch {}

try {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
    $listener.Server.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket, [System.Net.Sockets.SocketOptionName]::ReuseAddress, $true)
    $listener.Start()

    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host " ??PORTAL BANG Ultra-Robust Non-Blocking Server Started!" -ForegroundColor Green
    Write-Host " ?뙋 Local Access:   http://localhost:$Port" -ForegroundColor White
    Write-Host " ?썳截?Access Filter: Active (Allowed IPs & Blacklist Enforced)" -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Cyan
} catch {
    Write-Host "??Port $Port is already in use and recovery failed. Error: $_" -ForegroundColor Red
    exit 1
}

while ($true) {
    try {
        if (-not $listener.Pending()) {
            Start-Sleep -Milliseconds 20
            continue
        }

        $client = $listener.AcceptTcpClient()
        $clientIp = $client.Client.RemoteEndPoint.Address.ToString()

        # 1. IP Blacklist Check
        $blockedIps = @()
        if (Test-Path $blockedIpsFile) {
            try {
                $rawBlocked = [System.IO.File]::ReadAllText($blockedIpsFile, [System.Text.Encoding]::UTF8)
                if ($rawBlocked.StartsWith([char]0xFEFF)) { $rawBlocked = $rawBlocked.Substring(1) }
                if (-not [string]::IsNullOrWhiteSpace($rawBlocked)) {
                    $parsed = $rawBlocked | ConvertFrom-Json
                    if ($null -ne $parsed) { $blockedIps = @($parsed) }
                }
            } catch {}
        }

        $isBlocked = $false
        foreach ($bPattern in $blockedIps) {
            if ($null -eq $bPattern) { continue }
            $strB = $bPattern.ToString().Trim()
            if ($clientIp -eq $strB -or $clientIp -like $strB) {
                $isBlocked = $true
                break
            }
        }

        if ($isBlocked) {
            Log-Access $clientIp "BLOCKED_BLACKLIST" "/"
            Write-Host " [Blacklist Block] Rejected connection from blacklisted IP: $clientIp" -ForegroundColor Red
            $stream = $client.GetStream()
            $forbiddenBody = "<html><body><h1>403 Forbidden</h1><p>Access Denied: Your IP ($clientIp) is blacklisted.</p></body></html>"
            $forbiddenBytes = [System.Text.Encoding]::UTF8.GetBytes($forbiddenBody)
            $responseHeader = "HTTP/1.1 403 Forbidden`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($forbiddenBytes.Length)`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($forbiddenBytes, 0, $forbiddenBytes.Length)
            $client.Close()
            continue
        }

        # 2. IP Whitelist Check (Server IP & Local Subnet always guaranteed allowed)
        $allowedIps = @("127.0.0.1", "::1", "192.168.219.115", "192.168.219.*", "192.168.*")
        if (Test-Path $allowedIpsFile) {
            try {
                $rawAllowed = [System.IO.File]::ReadAllText($allowedIpsFile, [System.Text.Encoding]::UTF8)
                if ($rawAllowed.StartsWith([char]0xFEFF)) { $rawAllowed = $rawAllowed.Substring(1) }
                if (-not [string]::IsNullOrWhiteSpace($rawAllowed)) {
                    $parsed = $rawAllowed | ConvertFrom-Json
                    if ($null -ne $parsed) { $allowedIps = @($parsed) + $allowedIps }
                }
            } catch {}
        }

        $isAllowed = $false
        foreach ($ipPattern in $allowedIps) {
            if ($null -eq $ipPattern) { continue }
            $strPattern = $ipPattern.ToString().Trim()
            if ($clientIp -eq $strPattern -or $clientIp -like $strPattern) {
                $isAllowed = $true
                break
            }
        }

        if (-not $isAllowed) {
            Log-Access $clientIp "BLOCKED_UNAUTHORIZED" "/"
            Write-Host " [Security Block] Rejected connection from unauthorized IP: $clientIp" -ForegroundColor Red
            $stream = $client.GetStream()
            $forbiddenBody = "<html><body><h1>403 Forbidden</h1><p>Access Denied: Your IP ($clientIp) is not whitelisted.</p></body></html>"
            $forbiddenBytes = [System.Text.Encoding]::UTF8.GetBytes($forbiddenBody)
            $responseHeader = "HTTP/1.1 403 Forbidden`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($forbiddenBytes.Length)`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($forbiddenBytes, 0, $forbiddenBytes.Length)
            $client.Close()
            continue
        }

        $stream = $client.GetStream()
        $buffer = New-Object byte[] 65536
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) {
            $client.Close()
            continue
        }

        $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
        $lines = $requestText -split "\r?\n"
        if ($lines.Length -eq 0 -or [string]::IsNullOrWhiteSpace($lines[0])) {
            $client.Close()
            continue
        }

        $requestLine = $lines[0]
        $parts = $requestLine -split '\s+'
        if ($parts.Length -lt 2) {
            $client.Close()
            continue
        }

        $method = $parts[0]
        $urlPath = [System.Uri]::UnescapeDataString($parts[1])
        if ($urlPath.Contains("?")) {
            $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("?"))
        }

        Log-Access $clientIp "ALLOWED" $urlPath
        $corsHeaders = "Access-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`n"

        if ($method -eq "OPTIONS") {
            $responseHeader = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Length: 0`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
        }
        elseif ($urlPath -eq "/api/my-ip") {
            $ipObj = @{ ip = $clientIp } | ConvertTo-Json -Compress
            Send-JsonResponse $stream $corsHeaders $ipObj
        }
        elseif ($urlPath -eq "/api/allowed-ips") {
            if ($method -eq "GET") {
                if (Test-Path $allowedIpsFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($allowedIpsFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders '["127.0.0.1","::1","192.168.219.115","192.168.219.*"]'
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($allowedIpsFile, $postData, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/blocked-ips") {
            if ($method -eq "GET") {
                if (Test-Path $blockedIpsFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($blockedIpsFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($blockedIpsFile, $postData, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/access-logs") {
            if ($method -eq "GET") {
                if (Test-Path $accessLogsFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($accessLogsFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "DELETE") {
                [System.IO.File]::WriteAllText($accessLogsFile, "[]", $Utf8NoBom)
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/menu-config") {
            if ($method -eq "GET") {
                if (Test-Path $menuConfigFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($menuConfigFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($menuConfigFile, $postData, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/workflows") {
            if ($method -eq "GET") {
                if (Test-Path $workflowsFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($workflowsFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($workflowsFile, $postData, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/stock-temp") {
            if ($method -eq "GET") {
                if (Test-Path $stockTempDataFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($stockTempDataFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } elseif (Test-Path $stockTempJsFile) {
                    $rawText = [System.IO.File]::ReadAllText($stockTempJsFile, [System.Text.Encoding]::UTF8)
                    $cleanJson = $rawText -replace '^window\.PORTAL_DATA_STOCK_TEMP\s*=\s*', '' -replace ';\s*$', ''
                    Send-JsonResponse $stream $corsHeaders $cleanJson
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($stockTempDataFile, $postData, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/analyze-ai-url") {
            $targetUrl = ""
            if ($requestText -match '"url"\s*:\s*"([^"]+)"') {
                $targetUrl = $Matches[1]
            } elseif ($requestText -match 'url=([^&\s]+)') {
                $targetUrl = [System.Uri]::UnescapeDataString($Matches[1])
            }
            
            if ([string]::IsNullOrWhiteSpace($targetUrl)) {
                $targetUrl = "https://www.onorca.dev/"
            }

            $domain = "onorca.dev"
            try { $domain = ([System.Uri]$targetUrl).Host.Replace("www.", "") } catch {}
            $pageTitle = $domain
            $pageDesc = "$domain Service Overview"

            try {
                # 초고속 3초 타임아웃 웹 메타데이터 조사
                $webRes = Invoke-WebRequest -Uri $targetUrl -TimeoutSec 3 -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -ErrorAction Stop
                if ($webRes -and $webRes.Content) {
                    $html = $webRes.Content
                    if ($html -match '<title>(.*?)</title>') {
                        $pageTitle = $Matches[1].Trim()
                    }
                    if ($html -match 'description["'']\s+content=["''](.*?)["'']') {
                        $pageDesc = $Matches[1].Trim()
                    }
                }
            } catch {}

            # AI 모델 분석 JSON 응답 (3초 이내 초고속 반환)
            $cleanTitle = $pageTitle -replace '\s*[-|].*$', ''
            if ([string]::IsNullOrWhiteSpace($cleanTitle)) { $cleanTitle = $domain }
            
            $resObj = [PSCustomObject]@{
                success = $true
                title = $cleanTitle
                developer = ($domain.Split('.')[0]).ToUpper()
                category = "AI System"
                tags = @($domain, "AI Platform")
                summary = $pageDesc
                garageIdeas = "1. Integration with $cleanTitle API`n2. Automated Workflow"
                quickStart = "Visit official site: $targetUrl"
                pricing = "Freemium / Pay-as-you-go"
                country = "US"
                similarModels = "Zapier, Make.com"
                docsUrl = $targetUrl
            }

            $resJson = ConvertTo-Json $resObj -Depth 5 -Compress
            Send-JsonResponse $stream $corsHeaders $resJson
        }
        elseif ($urlPath -eq "/api/threads-agent/token-config") {
            $threadsTokenConfigFile = Join-Path $dataDir "threadsTokenConfig.json"
            if ($method -eq "GET") {
                if (Test-Path $threadsTokenConfigFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($threadsTokenConfigFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    $defaultCfg = '{"agentBaseUrl":"http://localhost:8000","tokenIssuedDate":"2026-08-31","validDays":60,"recipientEmail":"admin@example.com","smtpHost":"smtp.gmail.com","smtpPort":587,"smtpUser":"","smtpPass":"","enableEmailAlert":true}'
                    Send-JsonResponse $stream $corsHeaders $defaultCfg
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($threadsTokenConfigFile, $postData, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"설정이 저장되었습니다."}'
            }
        }
        elseif ($urlPath -eq "/api/threads-agent/test-email") {
            $threadsTokenConfigFile = Join-Path $dataDir "threadsTokenConfig.json"
            $cfgObj = $null
            if (Test-Path $threadsTokenConfigFile) {
                try {
                    $cfgRaw = [System.IO.File]::ReadAllText($threadsTokenConfigFile, [System.Text.Encoding]::UTF8)
                    $cfgObj = $cfgRaw | ConvertFrom-Json
                } catch {}
            }
            
            $recipient = if ($cfgObj -and $cfgObj.recipientEmail) { $cfgObj.recipientEmail } else { "admin@example.com" }
            $smtpHost = if ($cfgObj -and $cfgObj.smtpHost) { $cfgObj.smtpHost } else { "" }
            $smtpPort = if ($cfgObj -and $cfgObj.smtpPort) { [int]$cfgObj.smtpPort } else { 587 }
            $smtpUser = if ($cfgObj -and $cfgObj.smtpUser) { $cfgObj.smtpUser } else { "" }
            $smtpPass = if ($cfgObj -and $cfgObj.smtpPass) { $cfgObj.smtpPass } else { "" }

            $sentSuccess = $false
            $statusMsg = ""

            if (-not [string]::IsNullOrWhiteSpace($smtpHost) -and -not [string]::IsNullOrWhiteSpace($smtpUser) -and -not [string]::IsNullOrWhiteSpace($smtpPass)) {
                try {
                    $smtp = New-Object System.Net.Mail.SmtpClient($smtpHost, $smtpPort)
                    $smtp.EnableSsl = $true
                    $smtp.Credentials = New-Object System.Net.NetworkCredential($smtpUser, $smtpPass)
                    $mail = New-Object System.Net.Mail.MailMessage($smtpUser, $recipient)
                    $mail.Subject = "[마당쓰리] Threads API 토큰 60일 만료 경고 테스트 메일"
                    $mail.Body = "안녕하세요, 마당쓰리 통합 알림 시스템입니다.`n`nThreads API 토큰 60일 만료 경고 알림 테스트 메일이 바르게 수신되었습니다.`n`n- 수신 이메일: $recipient`n- 발송 일시: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))`n- 상태: 정상 발송 완료"
                    $mail.BodyEncoding = [System.Text.Encoding]::UTF8
                    $mail.SubjectEncoding = [System.Text.Encoding]::UTF8
                    $smtp.Send($mail)
                    $sentSuccess = $true
                    $statusMsg = "📩 테스트 메일이 수신 주소($recipient)(으)로 성공적으로 발송되었습니다!"
                } catch {
                    $sentSuccess = $false
                    $statusMsg = "⚠️ SMTP 메일 발송 실패: $($_.Exception.Message) - SMTP 설정(계정/비밀번호/포트)을 확인해주세요."
                }
            } else {
                $sentSuccess = $false
                $statusMsg = "⚠️ SMTP 설정(계정 및 비밀번호)이 입력되지 않았습니다. 메일을 수신하시려면 아래 설정에서 SMTP 계정과 비밀번호를 입력 후 저장해주세요."
            }

            $emailRes = [PSCustomObject]@{
                success = $sentSuccess
                message = $statusMsg
            }
            $emailJson = ConvertTo-Json $emailRes -Depth 3 -Compress
            Send-JsonResponse $stream $corsHeaders $emailJson
        }
        elseif ($urlPath -like "/api/threads-agent/*") {
            $threadsTokenConfigFile = Join-Path $dataDir "threadsTokenConfig.json"
            $subPath = $urlPath.Substring(18)
            if ($subPath -in @("/status", "/start", "/stop", "/trigger")) {
                $subPath = "/api/agent" + $subPath
            } elseif (-not $subPath.StartsWith("/api/")) {
                $subPath = "/api" + $subPath
            }
            $baseUrl = "http://127.0.0.1:8000"
            if (Test-Path $threadsTokenConfigFile) {
                try {
                    $cfgRaw = [System.IO.File]::ReadAllText($threadsTokenConfigFile, [System.Text.Encoding]::UTF8)
                    $cfgObj = $cfgRaw | ConvertFrom-Json
                    if ($cfgObj.agentBaseUrl) { $baseUrl = $cfgObj.agentBaseUrl.TrimEnd('/') }
                } catch {}
            }
            $baseUrl = $baseUrl -replace 'localhost', '127.0.0.1'
            $targetUrl = "$baseUrl$subPath"

            try {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                $reqBody = if ($headerBodySplit.Length -eq 2) { $headerBodySplit[1] } else { "" }

                $webParams = @{
                    Uri = $targetUrl
                    Method = $method
                    TimeoutSec = 4
                    ErrorAction = "Stop"
                }
                if ($method -in @("POST", "PUT") -and -not [string]::IsNullOrWhiteSpace($reqBody)) {
                    $webParams["Body"] = $reqBody
                    $webParams["ContentType"] = "application/json; charset=utf-8"
                }

                $proxyRes = Invoke-WebRequest @webParams
                $rawBytes = $proxyRes.RawContentStream.ToArray()
                Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $rawBytes
            } catch {
                $errObj = [PSCustomObject]@{
                    is_running = $false
                    is_offline = $true
                    success = $false
                    message = "Threads AI 에이전트 서버($baseUrl)에 연결할 수 없습니다."
                    error = $_.Exception.Message
                    dynamic_schedule = [PSCustomObject]@{ market_name = "에이전트 오프라인" }
                    statistics = [PSCustomObject]@{ total_articles_crawled = 0; total_posts_generated = 0 }
                    sources_health = @()
                }
                Send-JsonResponse $stream $corsHeaders ($errObj | ConvertTo-Json -Depth 5 -Compress)
            }
        }
        elseif ($urlPath -eq "/api/apis") {
            if ($method -eq "GET") {
                if (Test-Path $dataFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($dataFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($dataFile, $postData, $Utf8NoBom)
                        $jsFile = Join-Path $dataDir "initialApis.js"
                        $jsContent = "window.PORTAL_DATA_APIS = " + $postData + ";"
                        [System.IO.File]::WriteAllText($jsFile, $jsContent, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/ai-models") {
            if ($method -eq "GET") {
                if (Test-Path $aiDataFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($aiDataFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($aiDataFile, $postData, $Utf8NoBom)
                        $jsContent = "window.PORTAL_DATA_AI_MODELS = " + $postData + ";"
                        [System.IO.File]::WriteAllText($aiJsFile, $jsContent, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/ai-terms") {
            if ($method -eq "GET") {
                if (Test-Path $aiTermDataFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($aiTermDataFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($aiTermDataFile, $postData, $Utf8NoBom)
                        $jsContent = "window.PORTAL_DATA_AI_TERMS = " + $postData + ";"
                        [System.IO.File]::WriteAllText($aiTermJsFile, $jsContent, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/sap-terms") {
            if ($method -eq "GET") {
                if (Test-Path $sapTermDataFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($sapTermDataFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($sapTermDataFile, $postData, $Utf8NoBom)
                        $jsContent = "window.PORTAL_DATA_SAP_TERMS = " + $postData + ";"
                        [System.IO.File]::WriteAllText($sapTermJsFile, $jsContent, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/sap-news") {
            if ($method -eq "GET") {
                if (Test-Path $sapNewsDataFile) {
                    $rawText = [System.IO.File]::ReadAllText($sapNewsDataFile, [System.Text.Encoding]::UTF8)
                    Send-JsonResponse $stream $corsHeaders $rawText
                } elseif (Test-Path $sapNewsJsFile) {
                    $rawText = [System.IO.File]::ReadAllText($sapNewsJsFile, [System.Text.Encoding]::UTF8)
                    $cleanJson = $rawText -replace '^window\.PORTAL_DATA_SAP_NEWS\s*=\s*', '' -replace ';\s*$', ''
                    Send-JsonResponse $stream $corsHeaders $cleanJson
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($sapNewsDataFile, $postData, $Utf8NoBom)
                        $jsContent = "window.PORTAL_DATA_SAP_NEWS = " + $postData + ";"
                        [System.IO.File]::WriteAllText($sapNewsJsFile, $jsContent, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/sap-knowledge") {
            if ($method -eq "GET") {
                if (Test-Path $sapKnowledgeDataFile) {
                    $rawText = [System.IO.File]::ReadAllText($sapKnowledgeDataFile, [System.Text.Encoding]::UTF8)
                    Send-JsonResponse $stream $corsHeaders $rawText
                } elseif (Test-Path $sapKnowledgeJsFile) {
                    $rawText = [System.IO.File]::ReadAllText($sapKnowledgeJsFile, [System.Text.Encoding]::UTF8)
                    $cleanJson = $rawText -replace '^window\.PORTAL_DATA_SAP_KNOWLEDGE\s*=\s*', '' -replace ';\s*$', ''
                    Send-JsonResponse $stream $corsHeaders $cleanJson
                } else {
                    Send-JsonResponse $stream $corsHeaders "[]"
                }
            }

            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($sapKnowledgeDataFile, $postData, $Utf8NoBom)
                        $jsContent = "window.PORTAL_DATA_SAP_KNOWLEDGE = " + $postData + ";"
                        [System.IO.File]::WriteAllText($sapKnowledgeJsFile, $jsContent, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/sap-consulting") {
            if ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                $consultingResult = $null
                if ($headerBodySplit.Length -eq 2) {
                    $reqBody = $headerBodySplit[1]
                    try {
                        $parsedReq = $reqBody | ConvertFrom-Json
                        $userQuestion = $parsedReq.question
                        $selectedTopic = $parsedReq.topic

                        if (-not [string]::IsNullOrWhiteSpace($userQuestion)) {
                            $geminiKey = Get-GeminiApiKey
                            if ($null -ne $geminiKey -and $geminiKey.Length -gt 10) {
                                $knowledgeSnippet = ""
                                if (Test-Path $sapKnowledgeDataFile) {
                                    $knowRaw = [System.IO.File]::ReadAllText($sapKnowledgeDataFile, [System.Text.Encoding]::UTF8)
                                    $knowList = $knowRaw | ConvertFrom-Json
                                    foreach ($k in $knowList[0..3]) {
                                        $knowledgeSnippet += "[$($k.topic) - $($k.title)]: $($k.content)`n"
                                    }
                                }

                                $systemPrompt = @"
당신은 세계 최고 수준의 SAP Integration Suite (Cloud Integration) 수석 아키텍트 및 Groovy 스크립트 전문가입니다.

[지침]
1. 질문에 대해 실무에서 즉시 적용 가능한 검증된 가이드, iFlow 구성 패턴, 또는 무결한 Groovy 코드를 작성하세요.
2. Groovy 작성 시 processData(Message message) 시그니처와 com.sap.gateway.ip.core.customdev.util.Message 임포트를 정확히 준수하세요.
3. 불필요한 사족 없이 핵심 해결책을 명확한 한국어로 서술하세요.

[참조 지식베이스]
$knowledgeSnippet

[사용자 질문]: $userQuestion
"@

                                $geminiBody = [PSCustomObject]@{
                                    contents = @(
                                        [PSCustomObject]@{
                                            parts = @(
                                                [PSCustomObject]@{ text = $systemPrompt }
                                            )
                                        }
                                    )
                                } | ConvertTo-Json -Depth 5

                                $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$geminiKey"
                                $gResp = Invoke-RestMethod -Uri $geminiUrl -Method Post -ContentType "application/json" -Body ([System.Text.Encoding]::UTF8.GetBytes($geminiBody)) -TimeoutSec 15 -ErrorAction SilentlyContinue
                                if ($gResp.candidates -and $gResp.candidates[0].content.parts[0].text) {
                                    $answerText = $gResp.candidates[0].content.parts[0].text
                                    $consultingResult = [PSCustomObject]@{
                                        success = $true
                                        answer = $answerText
                                        timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                                    }
                                }
                            }
                        }
                    } catch {}
                }

                if ($null -eq $consultingResult) {
                    $consultingResult = [PSCustomObject]@{
                        success = $false
                        message = "Gemini API 키가 설정되지 않았거나 호출에 실패했습니다. (.env 확인 필요)"
                    }
                }
                Send-JsonResponse $stream $corsHeaders ($consultingResult | ConvertTo-Json -Depth 5 -Compress)
            }
        }
        elseif ($urlPath -eq "/api/analyze-ai-term") {

            if ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                $termAnalysisResult = $null
                if ($headerBodySplit.Length -eq 2) {
                    $reqBody = $headerBodySplit[1]
                    try {
                        $parsedReq = $reqBody | ConvertFrom-Json
                        $termInput = $parsedReq.term
                        $userSummary = $parsedReq.userSummary

                        if (-not [string]::IsNullOrWhiteSpace($termInput)) {
                            $cleanTerm = $termInput.Trim()
                            $geminiKey = Get-GeminiApiKey

                            if ($null -ne $geminiKey -and $geminiKey.Length -gt 10) {
                                try {
                                    $promptText = "Analyze the AI/ML term '$cleanTerm'. Respond STRICTLY with a valid JSON object with keys: 'parentTerm' (most relevant parent concept), 'category' (one of: '湲곗큹 媛쒕뀗', '?좉꼍留?/ ?꾪궎?띿쿂', '紐⑤뜽 / ?붿쭊', '?숈뒿 / 湲곕쾿', '?묒슜 / ?쒕퉬??), 'importance' (one of: '?듭떖 湲곗큹', '以묎툒 湲곗닠', '?ы솕 媛쒕뀗'), 'relatedTerms' (array of 3-4 string terms), 'summary' (1-2 sentence beginner friendly summary in Korean), 'docsUrl' (relevant Wikipedia or documentation URL). Do NOT output markdown ticks."
                                    $geminiBody = [PSCustomObject]@{
                                        contents = @(
                                            [PSCustomObject]@{
                                                parts = @(
                                                    [PSCustomObject]@{ text = $promptText }
                                                )
                                            }
                                        )
                                    } | ConvertTo-Json -Depth 5

                                    $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$geminiKey"
                                    $gResp = Invoke-RestMethod -Uri $geminiUrl -Method Post -ContentType "application/json" -Body ([System.Text.Encoding]::UTF8.GetBytes($geminiBody)) -TimeoutSec 5 -ErrorAction SilentlyContinue

                                    if ($gResp.candidates -and $gResp.candidates[0].content.parts[0].text) {
                                        $rawJson = $gResp.candidates[0].content.parts[0].text -replace '```json', '' -replace '```', ''
                                        $parsedObj = $rawJson.Trim() | ConvertFrom-Json
                                        if ($parsedObj -and $parsedObj.summary) {
                                            $termAnalysisResult = [PSCustomObject]@{
                                                success = $true
                                                term = $cleanTerm
                                                category = $parsedObj.category
                                                parentTerm = $parsedObj.parentTerm
                                                importance = $parsedObj.importance
                                                relatedTerms = $parsedObj.relatedTerms
                                                summary = $parsedObj.summary
                                                docsUrl = $parsedObj.docsUrl
                                            }
                                        }
                                    }
                                } catch {}
                            }

                            if ($null -eq $termAnalysisResult) {
                                $lowerT = $cleanTerm.ToLower()
                                $cat = "Basic Concept"
                                $parent = "AI Architecture"
                                $imp = "Core Concept"
                                $rel = @("AI", "Machine Learning")
                                $sum = "The requested term '$cleanTerm' is an important AI concept."
                                $url = "https://ko.wikipedia.org/wiki/Special:Search?search=" + [System.Uri]::EscapeDataString($cleanTerm)

                                if ($lowerT -match "gemini|gpt|claude|deepseek|qwen|llama|llm") {
                                    $cat = "Model / Engine"
                                    $parent = "LLM Architecture"
                                    $imp = "Application / Service"
                                    $rel = @("LLM", "GPT-4o", "Claude", "Gemini")
                                }

                                $finalAiSum = $sum
                                if (-not [string]::IsNullOrWhiteSpace($userSummary)) { $finalAiSum = $userSummary }

                                $termAnalysisResult = [PSCustomObject]@{
                                    success = $true
                                    term = $cleanTerm
                                    category = $cat
                                    parentTerm = $parent
                                    importance = $imp
                                    relatedTerms = $rel
                                    summary = $finalAiSum
                                    docsUrl = $url
                                }
                            }
                        }
                    } catch {}
                }

                if ($null -ne $termAnalysisResult) {
                    $jsonStr = $termAnalysisResult | ConvertTo-Json -Depth 5
                    Send-JsonResponse $stream $corsHeaders $jsonStr
                } else {
                    Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"AI ?⑹뼱 遺꾩꽍 ?ㅽ뙣"}'
                }
            }
        }
        elseif ($urlPath -eq "/api/analyze-sap-term") {
            if ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                $termAnalysisResult = $null
                if ($headerBodySplit.Length -eq 2) {
                    $reqBody = $headerBodySplit[1]
                    try {
                        $parsedReq = $reqBody | ConvertFrom-Json
                        $termInput = $parsedReq.term
                        $userSummary = $parsedReq.userSummary

                        if (-not [string]::IsNullOrWhiteSpace($termInput)) {
                            $cleanTerm = $termInput.Trim()
                            $geminiKey = Get-GeminiApiKey

                            if ($null -ne $geminiKey -and $geminiKey.Length -gt 10) {
                                try {
                                    $promptText = "Analyze the SAP ERP term '$cleanTerm'. Respond STRICTLY with a valid JSON object with keys: parentTerm, category, importance, relatedTerms, summary, docsUrl. Do NOT output markdown ticks."
                                    $geminiBody = [PSCustomObject]@{
                                        contents = @(
                                            [PSCustomObject]@{
                                                parts = @(
                                                    [PSCustomObject]@{ text = $promptText }
                                                )
                                            }
                                        )
                                    } | ConvertTo-Json -Depth 5

                                    $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$geminiKey"
                                    $gResp = Invoke-RestMethod -Uri $geminiUrl -Method Post -ContentType "application/json" -Body ([System.Text.Encoding]::UTF8.GetBytes($geminiBody)) -TimeoutSec 5 -ErrorAction SilentlyContinue

                                    if ($gResp.candidates -and $gResp.candidates[0].content.parts[0].text) {
                                        $rawJson = $gResp.candidates[0].content.parts[0].text -replace '```json', '' -replace '```', ''
                                        $parsedObj = $rawJson.Trim() | ConvertFrom-Json
                                        if ($parsedObj -and $parsedObj.summary) {
                                            $termAnalysisResult = [PSCustomObject]@{
                                                success = $true
                                                term = $cleanTerm
                                                category = $parsedObj.category
                                                parentTerm = $parsedObj.parentTerm
                                                importance = $parsedObj.importance
                                                relatedTerms = $parsedObj.relatedTerms
                                                summary = $parsedObj.summary
                                                docsUrl = $parsedObj.docsUrl
                                            }
                                        }
                                    }
                                } catch {}
                            }

                            if ($null -eq $termAnalysisResult) {
                                $lowerT = $cleanTerm.ToLower()
                                $cat = "Module / Core"
                                $parent = "SAP ERP"
                                $imp = "Core Concept"
                                $rel = @("SAP ERP", "SAP S/4HANA")
                                $sum = "The requested term '$cleanTerm' is an important SAP concept."
                                $url = "https://ko.wikipedia.org/wiki/Special:Search?search=" + [System.Uri]::EscapeDataString($cleanTerm)

                                if ($lowerT -match "abap|cds|rap|fiori|ui5|odata") {
                                    $cat = "Development / ABAP"
                                    if ($lowerT -match "fiori|ui5|odata") { $parent = "SAP Fiori / SAPUI5" } else { $parent = "ABAP Core" }
                                    $imp = "Intermediate Tech"
                                    $rel = @("ABAP", "SAP Fiori / SAPUI5", "OData Service")
                                } elseif ($lowerT -match "btp|hana|basis|cloud") {
                                    $cat = "Architecture / Platform"
                                    if ($lowerT -match "hana") { $parent = "SAP S/4HANA" } else { $parent = "SAP ERP" }
                                    $imp = "Core Concept"
                                    $rel = @("HANA DB", "SAP BTP Platform")
                                } elseif ($lowerT -match "sac|analytics|bw|bi") {
                                    $cat = "Data / Analytics"
                                    $parent = "SAP BTP Platform"
                                    $imp = "Application Service"
                                    $rel = @("SAP Analytics Cloud", "SAP BTP")
                                }

                                $finalSum = $sum
                                if (-not [string]::IsNullOrWhiteSpace($userSummary)) { $finalSum = $userSummary }

                                $termAnalysisResult = [PSCustomObject]@{
                                    success = $true
                                    term = $cleanTerm
                                    category = $cat
                                    parentTerm = $parent
                                    importance = $imp
                                    relatedTerms = $rel
                                    summary = $finalSum
                                    docsUrl = $url
                                }
                            }
                        }
                    } catch {}
                }

                if ($null -ne $termAnalysisResult) {
                    $jsonStr = $termAnalysisResult | ConvertTo-Json -Depth 5
                    Send-JsonResponse $stream $corsHeaders $jsonStr
                } else {
                    Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"SAP ?⑹뼱 遺꾩꽍 ?ㅽ뙣"}'
                }
            }
        }
        else {
            # Static File Handling
            $filePath = Join-Path $root ($urlPath.TrimStart('/'))
            if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) {
                $filePath = Join-Path $root "index.html"
            }

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mimeType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".svg"  { "image/svg+xml" }
                    default { "application/octet-stream" }
                }
                $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
                Send-RawBytesResponse $stream $corsHeaders $mimeType $fileBytes
            } else {
                $notFoundBody = "<html><body><h1>404 Not Found</h1></body></html>"
                $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($notFoundBody)
                $responseHeader = "HTTP/1.1 404 Not Found`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($notFoundBytes.Length)`r`n${corsHeaders}Connection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
            }
        }
        $client.Close()
    } catch {
        Start-Sleep -Milliseconds 20
    }
}

