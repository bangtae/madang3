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
$blockedIpsFile = Join-Path $dataDir "blocked_ips.json"
$accessLogsFile = Join-Path $dataDir "access_logs.json"

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
    if ($jsonText.StartsWith([char]0xFEFF)) {
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

# 8080 포트를 점유 중인 기존 프로세스 자동 정리 (Port Conflict Auto-Recovery)
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
    $listener.Start()
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host " ⚡ PORTAL BANG Ultra-Robust Non-Blocking Server Started!" -ForegroundColor Green
    Write-Host " 🌐 Local Access:   http://localhost:$Port" -ForegroundColor White
    Write-Host " 🛡️ Access Filter: Active (Allowed IPs & Blacklist Enforced)" -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Port $Port is already in use and recovery failed. Error: $_" -ForegroundColor Red
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
                                    $promptText = "Analyze the AI/ML term '$cleanTerm'. Respond STRICTLY with a valid JSON object with keys: 'parentTerm' (most relevant parent concept), 'category' (one of: '기초 개념', '신경망 / 아키텍처', '모델 / 엔진', '학습 / 기법', '응용 / 서비스'), 'importance' (one of: '핵심 기초', '중급 기술', '심화 개념'), 'relatedTerms' (array of 3-4 string terms), 'summary' (1-2 sentence beginner friendly summary in Korean), 'docsUrl' (relevant Wikipedia or documentation URL). Do NOT output markdown ticks."
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
                                $cat = "기초 개념"
                                $parent = ""
                                $imp = "핵심 기초"
                                $rel = @("AI", "Machine Learning")
                                $sum = "입력하신 '$cleanTerm'은(는) 인공지능 및 머신러닝 분야의 중요 기술 개념입니다."
                                $url = "https://ko.wikipedia.org/wiki/Special:Search?search=" + [System.Uri]::EscapeDataString($cleanTerm)

                                if ($lowerT -match "gemini|제미나이|gpt|claude|deepseek|qwen|llama|llm|거대언어") {
                                    $cat = "모델 / 엔진"
                                    $parent = "LLM (거대언어모델)"
                                    $imp = "응용 / 서비스"
                                    $rel = @("LLM", "GPT-4o", "Claude 3.5", "Gemini")
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
                    Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"AI 용어 분석 실패"}'
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
                                    $promptText = "Analyze the SAP ERP term '$cleanTerm'. Respond STRICTLY with a valid JSON object with keys: 'parentTerm' (most relevant parent SAP concept like 'SAP ERP', 'SAP S/4HANA', 'ABAP (Advanced Business Application Programming)', 'SAP BTP (Business Technology Platform)', 'SAP Fiori / SAPUI5', or empty for top-level), 'category' (one of: '모듈 / 코어', '개발 / ABAP', '아키텍처 / 플랫폼', '데이터 / 분석', '운영 / 관리'), 'importance' (one of: '핵심 기초', '중급 기술', '심화 개념'), 'relatedTerms' (array of 3-4 string terms), 'summary' (1-2 sentence beginner friendly summary in Korean), 'docsUrl' (relevant SAP documentation or Wikipedia URL). Do NOT output markdown ticks."
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
                                $cat = "모듈 / 코어"
                                $parent = "SAP ERP"
                                $imp = "핵심 기초"
                                $rel = @("SAP ERP", "SAP S/4HANA")
                                $sum = "입력하신 '$cleanTerm'은(는) SAP 엔터프라이즈 환경의 중요한 업무 및 아키텍처 개념입니다."
                                $url = "https://ko.wikipedia.org/wiki/Special:Search?search=" + [System.Uri]::EscapeDataString($cleanTerm)

                                if ($lowerT -match "abap|cds|rap|fiori|ui5|odata") {
                                    $cat = "개발 / ABAP"
                                    if ($lowerT -match "fiori|ui5|odata") { $parent = "SAP Fiori / SAPUI5" } else { $parent = "ABAP (Advanced Business Application Programming)" }
                                    $imp = "중급 기술"
                                    $rel = @("ABAP", "SAP Fiori / SAPUI5", "OData Service")
                                } elseif ($lowerT -match "btp|hana|basis|cloud") {
                                    $cat = "아키텍처 / 플랫폼"
                                    if ($lowerT -match "hana") { $parent = "SAP S/4HANA" } else { $parent = "SAP ERP" }
                                    $imp = "핵심 기초"
                                    $rel = @("HANA DB", "SAP BTP (Business Technology Platform)")
                                } elseif ($lowerT -match "sac|analytics|bw|bi") {
                                    $cat = "데이터 / 분석"
                                    $parent = "SAP BTP (Business Technology Platform)"
                                    $imp = "응용 / 서비스"
                                    $rel = @("SAP Analytics Cloud (SAC)", "SAP BTP")
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
                    Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"SAP 용어 분석 실패"}'
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
