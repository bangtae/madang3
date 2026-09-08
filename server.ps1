# Ultra-Robust Non-Blocking TCP Socket HTTP Server in PowerShell with Whitelist/Blacklist & Access Logging
param([int]$Port = 8080)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
[System.Net.WebRequest]::DefaultWebProxy = $null
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
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
$stockCouncilDataFile = Join-Path $dataDir "stockCouncilReports.json"
$stockCouncilJsFile = Join-Path $dataDir "initialStockCouncilReports.js"
$stockDebateDataFile = Join-Path $dataDir "stockDebateLogs.json"
$stockDebateJsFile = Join-Path $dataDir "initialStockDebateLogs.js"
$sapNewsDataFile = Join-Path $dataDir "sapNews.json"
$sapNewsJsFile = Join-Path $dataDir "initialSapNews.js"
$sapKnowledgeDataFile = Join-Path $dataDir "sapKnowledge.json"
$sapKnowledgeJsFile = Join-Path $dataDir "initialSapKnowledge.js"

$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Get-GeminiApiKey {
    if ($env:GEMINI_API_KEY -and $env:GEMINI_API_KEY -ne "your_gemini_api_key_here") {
        return $env:GEMINI_API_KEY
    }
    $candidateFiles = @()
    if ($PSScriptRoot) { $candidateFiles += (Join-Path $PSScriptRoot ".env") }
    if ($script:root) { $candidateFiles += (Join-Path $script:root ".env") }
    $candidateFiles += (Join-Path (Get-Location) ".env")
    $candidateFiles += "C:\Users\bangt\Downloads\madang3\.env"

    foreach ($envFile in $candidateFiles) {
        if ($envFile -and (Test-Path $envFile)) {
            try {
                $lines = [System.IO.File]::ReadAllLines($envFile, [System.Text.Encoding]::UTF8)
                foreach ($line in $lines) {
                    if ($line -match '^\s*GEMINI_API_KEY\s*=\s*(.+)$') {
                        $k = $matches[1].Trim().Trim('"').Trim("'")
                        if ($k -and $k -ne "your_gemini_api_key_here") {
                            return $k
                        }
                    }
                }
            } catch {}
        }
    }
    return $null
}

$telegramConfigFile = Join-Path $dataDir "telegramConfig.json"
$script:telegramAlertCooldown = @{}
$script:telegramLastUpdateId = 0
$telegramPollSw = [System.Diagnostics.Stopwatch]::StartNew()

function Get-TelegramConfig {
    $botToken = ""
    $chatIds = ""
    $localEnv = "C:\Users\bangt\Downloads\madang6\agent_supervisor\.env"
    if (Test-Path $localEnv) {
        try {
            $lines = Get-Content $localEnv
            foreach ($line in $lines) {
                if ($line -match '^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.+)$') {
                    $botToken = $matches[1].Trim(' "''')
                } elseif ($line -match '^\s*TELEGRAM_ALLOWED_CHAT_IDS\s*=\s*(.+)$') {
                    $chatIds = $matches[1].Trim(' "''')
                }
            }
        } catch {}
    }
    if ((-not $botToken -or -not $chatIds) -and (Test-Path $telegramConfigFile)) {
        try {
            $tRaw = [System.IO.File]::ReadAllText($telegramConfigFile, [System.Text.Encoding]::UTF8)
            $tObj = $tRaw | ConvertFrom-Json
            if (-not $botToken) { $botToken = $tObj.botToken }
            if (-not $chatIds) { $chatIds = $tObj.allowedChatIds }
        } catch {}
    }
    return [PSCustomObject]@{
        botToken = $botToken
        allowedChatIds = $chatIds
        enabled = [bool](-not [string]::IsNullOrWhiteSpace($botToken) -and -not [string]::IsNullOrWhiteSpace($chatIds))
    }
}

function Get-NormalizedIpList([string]$filePath) {
    if ([string]::IsNullOrWhiteSpace($filePath)) { return @() }
    if (-not (Test-Path -LiteralPath $filePath -ErrorAction SilentlyContinue)) { return @() }
    try {
        $raw = Get-Content -Encoding utf8 -Raw $filePath
        if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
        $data = $raw | ConvertFrom-Json
        $result = [System.Collections.Generic.List[string]]::new()
        function Extract-Strings($obj) {
            if ($null -eq $obj) { return }
            if ($obj -is [string]) {
                $trimmed = $obj.Trim()
                if ($trimmed -and $trimmed -notmatch '^@\{' -and $trimmed -notmatch 'System\.Object') {
                    $result.Add($trimmed)
                }
            } elseif ($obj -is [System.Collections.IEnumerable]) {
                foreach ($item in $obj) { Extract-Strings $item }
            } elseif ($obj.PSObject -and $obj.PSObject.Properties['value']) {
                Extract-Strings $obj.value
            }
        }
        Extract-Strings $data
        return @($result | Select-Object -Unique)
    } catch {
        return @()
    }
}

function Save-IpList([string]$filePath, [string[]]$ips) {
    $cleanList = @($ips | Where-Object { $_ -and $_ -notmatch '^@\{' -and $_ -notmatch 'System\.Object' } | Select-Object -Unique)
    $json = "[" + (($cleanList | ForEach-Object { "`"$_`"" }) -join ", ") + "]"
    [System.IO.File]::WriteAllText($filePath, $json, [System.Text.UTF8Encoding]::new($false))
}

function Is-PrivateOrLocalIp([string]$ip) {
    if ([string]::IsNullOrWhiteSpace($ip)) { return $true }
    $clean = $ip -replace '^.*:', ''
    if ($clean -in @("127.0.0.1", "localhost", "::1", "")) { return $true }
    if ($clean.StartsWith("192.168.") -or $clean.StartsWith("10.") -or $clean.StartsWith("169.254.")) { return $true }
    if ($clean -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.') { return $true }
    return $false
}

function Send-TelegramNewIpAlert([string]$clientIp, [string]$requestPath, [string]$currentStatus) {
    if (Is-PrivateOrLocalIp $clientIp) { return }
    $tCfg = Get-TelegramConfig
    if (-not $tCfg.enabled) { return }

    $nowSec = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    if ($script:telegramAlertCooldown.ContainsKey($clientIp)) {
        $lastSec = $script:telegramAlertCooldown[$clientIp]
        if (($nowSec - $lastSec) -lt 3600) { return }
    }
    $script:telegramAlertCooldown[$clientIp] = $nowSec

    # 화이트리스트 / 블랙리스트 등록 상태 판별 (정규화된 리스트 사용)
    $aList = Get-NormalizedIpList $allowedIpsFile
    $bList = Get-NormalizedIpList $blockedIpsFile

    $isAllowed = $false
    foreach ($p in $aList) {
        if (-not $isAllowed -and ($clientIp -eq $p -or $clientIp -like $p)) { $isAllowed = $true }
    }

    $isBlocked = $false
    foreach ($p in $bList) {
        if (-not $isBlocked -and ($clientIp -eq $p -or $clientIp -like $p)) { $isBlocked = $true }
    }

    $buttons = @()
    $stateDesc = $currentStatus
    if ($isAllowed) {
        $stateDesc = "🟢 화이트리스트 등록됨 (접속 허용 중)"
        $buttons = @(
            [PSCustomObject]@{ text = "⛔ 블랙리스트로 차단"; callback_data = "block:$clientIp" }
        )
    } elseif ($isBlocked) {
        $stateDesc = "🔴 블랙리스트 등록됨 (접속 차단 중)"
        $buttons = @(
            [PSCustomObject]@{ text = "✅ 화이트리스트로 허용"; callback_data = "allow:$clientIp" }
        )
    } else {
        $stateDesc = if ($currentStatus) { $currentStatus } else { "⚪ 미분류 (신규 외부 유입)" }
        $buttons = @(
            [PSCustomObject]@{ text = "✅ 화이트리스트 허용"; callback_data = "allow:$clientIp" },
            [PSCustomObject]@{ text = "⛔ 블랙리스트 차단"; callback_data = "block:$clientIp" }
        )
    }

    $kstTime = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $msgText = "🌐 <b>[외부 IP 유입 모니터링 알림]</b>`n`n" +
               "• <b>접속 IP:</b> <code>$clientIp</code>`n" +
               "• <b>접속 일시:</b> $kstTime (KST)`n" +
               "• <b>요청 경로:</b> <code>$requestPath</code>`n" +
               "• <b>현재 상태:</b> $stateDesc`n`n" +
               "아래 버튼을 눌러 권한을 변경할 수 있습니다:"

    $cIds = $tCfg.allowedChatIds.Split(',')
    foreach ($cId in $cIds) {
        $cleanId = $cId.Trim()
        if (-not $cleanId) { continue }
        $jsonPayload = [PSCustomObject]@{
            chat_id = $cleanId
            text = $msgText
            parse_mode = "HTML"
            reply_markup = [PSCustomObject]@{
                inline_keyboard = ,$buttons
            }
        }
        $bodyData = $jsonPayload | ConvertTo-Json -Depth 5 -Compress

        try {
            $apiUrl = "https://api.telegram.org/bot$($tCfg.botToken)/sendMessage"
            $r = Invoke-WebRequest -Uri $apiUrl -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($bodyData)) -ContentType "application/json; charset=utf-8" -TimeoutSec 4 -UseBasicParsing -ErrorAction SilentlyContinue
        } catch {}
    }
}

function Check-TelegramCallbackUpdates {
    $tCfg = Get-TelegramConfig
    if (-not $tCfg.enabled) { return }

    $targetOffset = $script:telegramLastUpdateId + 1
    $url = "https://api.telegram.org/bot$($tCfg.botToken)/getUpdates?offset=$targetOffset&timeout=0"
    try {
        $res = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($res.Content) {
            $data = $res.Content | ConvertFrom-Json
            if ($data.ok -and $data.result) {
                foreach ($upd in $data.result) {
                    if ($upd.update_id -ge $script:telegramLastUpdateId) {
                        $script:telegramLastUpdateId = [int]$upd.update_id
                    }
                    if ($upd.callback_query) {
                        $cq = $upd.callback_query
                        $parts = $cq.data -split ':', 2
                        if ($parts.Length -eq 2) {
                            $action = $parts[0]
                            $targetIp = $parts[1]

                            $allowed = Get-NormalizedIpList $allowedIpsFile
                            $blocked = Get-NormalizedIpList $blockedIpsFile

                            $resTitle = ""
                            $toastText = ""
                            if ($action -eq "allow") {
                                if ($targetIp -notin $allowed) { $allowed += $targetIp }
                                $blocked = @($blocked | Where-Object { $_ -ne $targetIp })
                                $resTitle = "✅ 화이트리스트 허용 완료"
                                $toastText = "$targetIp IP가 화이트리스트에 등록되었습니다."
                            } elseif ($action -eq "block") {
                                if ($targetIp -notin $blocked) { $blocked += $targetIp }
                                $allowed = @($allowed | Where-Object { $_ -ne $targetIp })
                                $resTitle = "⛔ 블랙리스트 차단 완료"
                                $toastText = "$targetIp IP가 블랙리스트에 등록되었습니다."
                            }

                            Save-IpList $allowedIpsFile $allowed
                            Save-IpList $blockedIpsFile $blocked

                            $fromUser = if ($cq.from.username) { "@$($cq.from.username)" } else { $cq.from.first_name }
                            $kstNow = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                            $updatedText = "🌐 <b>[외부 IP 유입 처리 완료]</b>`n`n" +
                                           "• <b>대상 IP:</b> <code>$targetIp</code>`n" +
                                           "• <b>처리 결과:</b> <b>$resTitle</b>`n" +
                                           "• <b>처리 일시:</b> $kstNow (KST)`n" +
                                           "• <b>처리 관리자:</b> $fromUser"

                            # 1. Edit message
                            $editBody = @{
                                chat_id = $cq.message.chat.id
                                message_id = $cq.message.message_id
                                text = $updatedText
                                parse_mode = "HTML"
                            } | ConvertTo-Json -Compress
                            try {
                                Invoke-WebRequest -Uri "https://api.telegram.org/bot$($tCfg.botToken)/editMessageText" -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($editBody)) -ContentType "application/json; charset=utf-8" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
                            } catch {}

                            # 2. Answer callback query
                            $ansBody = @{
                                callback_query_id = $cq.id
                                text = $toastText
                            } | ConvertTo-Json -Compress
                            try {
                                Invoke-WebRequest -Uri "https://api.telegram.org/bot$($tCfg.botToken)/answerCallbackQuery" -Method POST -Body ([System.Text.Encoding]::UTF8.GetBytes($ansBody)) -ContentType "application/json; charset=utf-8" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
                            } catch {}

                            Write-Host " [Telegram Action] $targetIp -> $resTitle by $fromUser" -ForegroundColor Green
                        }
                    }
                }
            }
        }
    } catch {}
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
    try {
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        if ($bodyBytes.Length -gt 0) {
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
        }
        $stream.Flush()
    } catch {
        # Client aborted connection before write completed
    }
}

function Log-Access([string]$clientIp, [string]$status, [string]$requestPath) {
    if ([string]::IsNullOrWhiteSpace($clientIp)) { return }
    if ($requestPath -match '\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|map|ttf)$') {
        return
    }

    $cleanIp = $clientIp.Trim().Replace("::ffff:", "")
    $targetFile = if ($script:accessLogsFile) { $script:accessLogsFile } else { Join-Path (Get-Location) "data\access_logs.json" }

    try {
        $logs = [System.Collections.Generic.List[PSCustomObject]]::new()
        if (Test-Path $targetFile) {
            try {
                $raw = [System.IO.File]::ReadAllText($targetFile, [System.Text.Encoding]::UTF8)
                if ($raw.StartsWith([char]0xFEFF)) { $raw = $raw.Substring(1) }
                $raw = $raw.Trim()
                if (-not [string]::IsNullOrWhiteSpace($raw) -and $raw.StartsWith("[")) {
                    $parsed = ConvertFrom-Json -InputObject $raw
                    if ($null -ne $parsed) {
                        foreach ($item in @($parsed)) {
                            if ($item -and $item.ip) {
                                $logs.Add($item)
                            }
                        }
                    }
                }
            } catch {
                Write-Host " [Log-Access Corrupt JSON Recovered: $($_.Exception.Message)]" -ForegroundColor Yellow
                $logs.Clear()
            }
        }

        $nowStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        $foundIdx = -1
        for ($i = 0; $i -lt $logs.Count; $i++) {
            if ($logs[$i].ip -eq $cleanIp) {
                $foundIdx = $i
                break
            }
        }

        if ($foundIdx -ge 0) {
            $existing = $logs[$foundIdx]
            $existing.lastAccess = $nowStr
            $existing.count = [int]$existing.count + 1
            $existing.status = $status
            $existing.lastPath = if ($requestPath) { $requestPath } else { "/" }
            # 최근 접속 항목을 맨 앞으로 이동
            $logs.RemoveAt($foundIdx)
            $logs.Insert(0, $existing)
        } else {
            $newLog = [PSCustomObject]@{
                ip = $cleanIp
                firstAccess = $nowStr
                lastAccess = $nowStr
                count = 1
                status = $status
                lastPath = if ($requestPath) { $requestPath } else { "/" }
            }
            $logs.Insert(0, $newLog)
        }

        # 최대 300건 유지
        while ($logs.Count -gt 300) {
            $logs.RemoveAt($logs.Count - 1)
        }

        $outEncoder = if ($script:Utf8NoBom) { $script:Utf8NoBom } else { [System.Text.UTF8Encoding]::new($false) }
        $jsonStr = $logs | ConvertTo-Json -Depth 3
        [System.IO.File]::WriteAllText($targetFile, $jsonStr, $outEncoder)

        # 미분류 신규 외부 IP인 경우 텔레그램 알림 발송
        if ($status -eq "ALLOWED" -or $status -eq "MISC" -or $status -eq "BLOCKED_UNAUTHORIZED") {
            $aList = Get-NormalizedIpList $script:allowedIpsFile
            $bList = Get-NormalizedIpList $script:blockedIpsFile
            $isKnown = $false
            foreach ($p in $aList) {
                if (-not $isKnown -and ($cleanIp -eq $p -or $cleanIp -like $p)) { $isKnown = $true }
            }
            if (-not $isKnown) {
                foreach ($p in $bList) {
                    if (-not $isKnown -and ($cleanIp -eq $p -or $cleanIp -like $p)) { $isKnown = $true }
                }
            }
            if (-not $isKnown -and -not (Is-PrivateOrLocalIp $cleanIp)) {
                Send-TelegramNewIpAlert $cleanIp $requestPath "신규 미분류 접속"
            }
        }
    } catch {
        Write-Host " [Log-Access Error] $($_.Exception.Message)" -ForegroundColor Red
    }
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
            if ($telegramPollSw.ElapsedMilliseconds -gt 30000) {
                $telegramPollSw.Restart()
                Check-TelegramCallbackUpdates
            }
            Start-Sleep -Milliseconds 20
            continue
        }

        $client = $listener.AcceptTcpClient()
        $clientIp = $client.Client.RemoteEndPoint.Address.ToString()
        Write-Host " [Conn] Connected from $clientIp" -ForegroundColor DarkCyan

        # 1. IP Blacklist Check
        $blockedIps = Get-NormalizedIpList $blockedIpsFile

        $isBlocked = $false
        foreach ($bPattern in $blockedIps) {
            if ($null -ne $bPattern -and -not $isBlocked) {
                $strB = $bPattern.ToString().Trim()
                if ($clientIp -eq $strB -or $clientIp -like $strB) {
                    $isBlocked = $true
                }
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
        $allowedIps = @("127.0.0.1", "::1", "192.168.219.115", "192.168.219.*", "192.168.*") + (Get-NormalizedIpList $allowedIpsFile)

        $isAllowed = $false
        foreach ($ipPattern in $allowedIps) {
            if ($null -ne $ipPattern -and -not $isAllowed) {
                $strPattern = $ipPattern.ToString().Trim()
                if ($clientIp -eq $strPattern -or $clientIp -like $strPattern) {
                    $isAllowed = $true
                }
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

        $ms = New-Object System.IO.MemoryStream
        $ms.Write($buffer, 0, $bytesRead)
        $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
        if ($requestText -match 'Content-Length:\s*(\d+)') {
            $contentLength = [int]$Matches[1]
            $headerEndIdx = $requestText.IndexOf("`r`n`r`n")
            if ($headerEndIdx -ge 0) {
                $headerByteCount = [System.Text.Encoding]::UTF8.GetByteCount($requestText.Substring(0, $headerEndIdx + 4))
                $totalExpected = $headerByteCount + $contentLength
                $readSw = [System.Diagnostics.Stopwatch]::StartNew()
                while ($ms.Length -lt $totalExpected -and $readSw.ElapsedMilliseconds -lt 3000) {
                    if ($stream.DataAvailable) {
                        $extraRead = $stream.Read($buffer, 0, $buffer.Length)
                        if ($extraRead -gt 0) {
                            $ms.Write($buffer, 0, $extraRead)
                        }
                    } else {
                        Start-Sleep -Milliseconds 10
                    }
                }
            }
        }
        $requestText = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
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
        elseif ($urlPath -eq "/api/stock-council-reports") {
            if ($method -eq "GET") {
                if (Test-Path $stockCouncilDataFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($stockCouncilDataFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } elseif (Test-Path $stockCouncilJsFile) {
                    $rawText = [System.IO.File]::ReadAllText($stockCouncilJsFile, [System.Text.Encoding]::UTF8)
                    $cleanJson = $rawText -replace '^window\.PORTAL_DATA_STOCK_COUNCIL\s*=\s*', '' -replace ';\s*$', ''
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
                        try {
                            $incoming = $postData | ConvertFrom-Json
                            $existingList = [System.Collections.Generic.List[object]]::new()
                            if (Test-Path $stockCouncilDataFile) {
                                $rawExisting = [System.IO.File]::ReadAllText($stockCouncilDataFile, [System.Text.Encoding]::UTF8)
                                $parsedExisting = $rawExisting | ConvertFrom-Json
                                if ($parsedExisting -is [System.Array]) {
                                    $existingList.AddRange($parsedExisting)
                                } elseif ($parsedExisting) {
                                    $existingList.Add($parsedExisting)
                                }
                            }
                            if ($incoming -is [System.Array]) {
                                $saveText = $postData
                            } else {
                                $foundIdx = -1
                                if ($incoming.id) {
                                    for ($i = 0; $i -lt $existingList.Count; $i++) {
                                        if ($existingList[$i].id -eq $incoming.id) { $foundIdx = $i; break }
                                    }
                                }
                                if ($foundIdx -ge 0) {
                                    $existingList[$foundIdx] = $incoming
                                } else {
                                    $existingList.Insert(0, $incoming)
                                }
                                $saveText = $existingList | ConvertTo-Json -Depth 10
                            }
                            [System.IO.File]::WriteAllText($stockCouncilDataFile, $saveText, $Utf8NoBom)
                            $jsContent = "// data/initialStockCouncilReports.js`nwindow.PORTAL_DATA_STOCK_COUNCIL = $saveText;`n"
                            [System.IO.File]::WriteAllText($stockCouncilJsFile, $jsContent, $Utf8NoBom)
                        } catch {
                            [System.IO.File]::WriteAllText($stockCouncilDataFile, $postData, $Utf8NoBom)
                        }
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/stock-council-analyze") {
            $stockQuery = "005930"
            if ($requestText -match '"stock"\s*:\s*"([^"]+)"') {
                $stockQuery = $Matches[1]
            }
            $pyPath = "C:\Users\bangt\Downloads\madang6\newsfilter_threads_agent\.venv\Scripts\python.exe"
            $dankaScript = "C:\Users\bangt\Downloads\madang6\서브주식에이전트_단가\main.py"
            if ((Test-Path $pyPath) -and (Test-Path $dankaScript)) {
                Start-Process -FilePath $pyPath -ArgumentList "`"$dankaScript`" --stock `"$stockQuery`" --ondemand-only" -WorkingDirectory "C:\Users\bangt\Downloads\madang6\서브주식에이전트_단가" -WindowStyle Hidden
                Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"분석이 시작되었습니다."}'
            } else {
                Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"분석 실행 환경을 찾을 수 없습니다."}'
            }
        }
        elseif ($urlPath -eq "/api/stock-debates") {
            if ($method -eq "GET") {
                if (Test-Path $stockDebateDataFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($stockDebateDataFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } elseif (Test-Path $stockDebateJsFile) {
                    $rawText = [System.IO.File]::ReadAllText($stockDebateJsFile, [System.Text.Encoding]::UTF8)
                    $cleanJson = $rawText -replace '^window\.PORTAL_DATA_STOCK_DEBATES\s*=\s*', '' -replace ';\s*$', ''
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
                        try {
                            $incomingObj = $postData | ConvertFrom-Json
                            $existingList = @()
                            if (Test-Path $stockDebateDataFile) {
                                try {
                                    $rawExisting = [System.IO.File]::ReadAllText($stockDebateDataFile, [System.Text.Encoding]::UTF8)
                                    $parsed = $rawExisting | ConvertFrom-Json
                                    if ($parsed -is [System.Array]) { $existingList = [System.Collections.ArrayList]@($parsed) }
                                    elseif ($parsed) { $existingList = [System.Collections.ArrayList]@($parsed) }
                                } catch {}
                            }
                            if ($incomingObj -is [System.Array]) {
                                $existingList = [System.Collections.ArrayList]@($incomingObj)
                            } elseif ($incomingObj -and $incomingObj.id) {
                                $filtered = @($existingList | Where-Object { $_.id -ne $incomingObj.id })
                                $existingList = [System.Collections.ArrayList]@($filtered)
                                $existingList.Insert(0, $incomingObj)
                            }
                            $finalJson = $existingList | ConvertTo-Json -Depth 10
                            [System.IO.File]::WriteAllText($stockDebateDataFile, $finalJson, $Utf8NoBom)
                            $jsContent = "// data/initialStockDebateLogs.js`nwindow.PORTAL_DATA_STOCK_DEBATES = $finalJson;`n"
                            [System.IO.File]::WriteAllText($stockDebateJsFile, $jsContent, $Utf8NoBom)
                        } catch {
                            [System.IO.File]::WriteAllText($stockDebateDataFile, $postData, $Utf8NoBom)
                        }
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
            elseif ($method -eq "DELETE") {
                $deleteId = ""
                $deleteAll = $false
                if ($requestLine -match '[?&]id=([^&\s]+)') {
                    $deleteId = [System.Uri]::UnescapeDataString($Matches[1]).Trim()
                }
                if ($requestLine -match '[?&]all=true') {
                    $deleteAll = $true
                }
                
                try {
                    $existingList = @()
                    if (Test-Path $stockDebateDataFile) {
                        try {
                            $rawExisting = [System.IO.File]::ReadAllText($stockDebateDataFile, [System.Text.Encoding]::UTF8)
                            $parsed = $rawExisting | ConvertFrom-Json
                            if ($parsed -is [System.Array]) { $existingList = [System.Collections.ArrayList]@($parsed) }
                            elseif ($parsed) { $existingList = [System.Collections.ArrayList]@($parsed) }
                        } catch {}
                    }

                    if ($deleteAll) {
                        $existingList = @()
                    } elseif (-not [string]::IsNullOrWhiteSpace($deleteId)) {
                        $filtered = @($existingList | Where-Object { $_.id -ne $deleteId })
                        $existingList = [System.Collections.ArrayList]@($filtered)
                    }

                    $finalJson = $existingList | ConvertTo-Json -Depth 10
                    if (-not $finalJson) { $finalJson = "[]" }
                    [System.IO.File]::WriteAllText($stockDebateDataFile, $finalJson, $Utf8NoBom)
                    $jsContent = "// data/initialStockDebateLogs.js`nwindow.PORTAL_DATA_STOCK_DEBATES = $finalJson;`n"
                    [System.IO.File]::WriteAllText($stockDebateJsFile, $jsContent, $Utf8NoBom)
                    Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"삭제 완료되었습니다."}'
                } catch {
                    Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"삭제 처리 중 오류가 발생했습니다."}'
                }
            }
        }
        elseif ($urlPath -eq "/api/stock-debates/trigger") {
            $stockQuery = "005930"
            if ($requestLine -match '[?&]stock=([^&\s]+)') {
                $stockQuery = [System.Uri]::UnescapeDataString($Matches[1]).Trim()
            } elseif ($requestText -match '"stock"\s*:\s*"([^"]+)"') {
                $stockQuery = $Matches[1].Trim()
            }
            if ($stockQuery -notmatch '^\d{6}$') {
                $krxMapPath = Join-Path $PSScriptRoot "data\krx_stock_map.json"
                if (Test-Path $krxMapPath) {
                    try {
                        $krxMapJson = [System.IO.File]::ReadAllText($krxMapPath, [System.Text.Encoding]::UTF8)
                        $krxMap = $krxMapJson | ConvertFrom-Json
                        if ($krxMap -and $krxMap.$stockQuery) {
                            $stockQuery = $krxMap.$stockQuery
                        } else {
                            $cleanQ = $stockQuery.Replace(" ", "")
                            if ($krxMap -and $krxMap.$cleanQ) {
                                $stockQuery = $krxMap.$cleanQ
                            }
                        }
                    } catch {}
                }
            }
            $pyPath = "C:\Users\bangt\Downloads\madang6\newsfilter_threads_agent\.venv\Scripts\python.exe"
            $debateScript = "C:\Users\bangt\Downloads\madang6\debate_arena.py"
            if ((Test-Path $pyPath) -and (Test-Path $debateScript)) {
                Start-Process -FilePath $pyPath -ArgumentList @($debateScript, "--stock", $stockQuery, "--sync") -WorkingDirectory "C:\Users\bangt\Downloads\madang6" -WindowStyle Hidden
                Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"끝장 토론이 성공적으로 소집되었습니다. 잠시 후 피드가 갱신됩니다."}'
            } else {
                Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"토론 실행 환경을 찾을 수 없습니다."}'
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
                $webRes = Invoke-WebRequest -Uri $targetUrl -TimeoutSec 3 -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -ErrorAction Stop
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
                    UseBasicParsing = $true
                    ErrorAction = "Stop"
                }
                if ($method -in @("POST", "PUT") -and -not [string]::IsNullOrWhiteSpace($reqBody)) {
                    $webParams["Body"] = $reqBody
                    $webParams["ContentType"] = "application/json; charset=utf-8"
                }

                $proxyRes = Invoke-WebRequest @webParams
                $rawBytes = if ($proxyRes.RawContentStream) { $proxyRes.RawContentStream.ToArray() } else { [System.Text.Encoding]::UTF8.GetBytes($proxyRes.Content) }
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
        elseif ($urlPath -eq "/api/sap-agent/status") {
            $taskName = "SAPIntegrationSuiteAgent"
            $taskState = "Unknown"
            $lastRun = "확인 불가"
            $nextRun = "확인 불가"
            $isRunning = $false

            # 1. Windows 작업 스케줄러 상태 조회
            try {
                $schRaw = schtasks /query /tn $taskName /fo CSV 2>$null
                if ($schRaw) {
                    $csv = $schRaw | ConvertFrom-Csv
                    $csvArr = @($csv)
                    if ($csvArr.Length -gt 0) {
                        $taskState = $csvArr[0].Status
                        $nextRun = $csvArr[0].'Next Run Time'
                    }
                }
            } catch {}

            # 2. 실행 중인 PowerShell 프로세스(sap_collector.ps1) 확인
            try {
                $runningProcs = Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%sap_collector.ps1%'" -ErrorAction SilentlyContinue
                if ($runningProcs) {
                    $isRunning = $true
                    $taskState = "Running"
                } elseif ($taskState -eq "Running") {
                    $isRunning = $true
                }
            } catch {}

            # 3. 수집된 뉴스 총 건수 파악
            $newsCount = 0
            $targetNewsPath = Join-Path $PSScriptRoot "data\sapNews.json"
            if (-not (Test-Path $targetNewsPath)) {
                $targetNewsPath = "C:\Users\bangt\Downloads\madang3\data\sapNews.json"
            }
            if (Test-Path $targetNewsPath) {
                try {
                    $jsonRaw = [System.IO.File]::ReadAllText($targetNewsPath, [System.Text.Encoding]::UTF8)
                    if ($jsonRaw.StartsWith([char]0xFEFF)) { $jsonRaw = $jsonRaw.Substring(1) }
                    $arr = $jsonRaw | ConvertFrom-Json
                    $newsCount = @($arr).Count
                } catch {}
                if ($newsCount -eq 0) {
                    try {
                        $newsCount = @(Get-Content $targetNewsPath | Where-Object { $_ -match '"id":\s*"sap_news_' }).Count
                    } catch {}
                }
            }

            # 4. 설정 파일 조회
            $sapCfgFile = Join-Path $dataDir "sapAgentConfig.json"
            $sapBaseUrl = "http://127.0.0.1:8080"
            $intervalMin = 720
            if (Test-Path $sapCfgFile) {
                try {
                    $cRaw = [System.IO.File]::ReadAllText($sapCfgFile, [System.Text.Encoding]::UTF8)
                    if ($cRaw.StartsWith([char]0xFEFF)) { $cRaw = $cRaw.Substring(1) }
                    $cObj = $cRaw | ConvertFrom-Json
                    if ($cObj) {
                        if ($cObj.agentBaseUrl) { $sapBaseUrl = $cObj.agentBaseUrl }
                        if ($cObj.intervalMinutes) { $intervalMin = [int]$cObj.intervalMinutes }
                    }
                } catch {}
            }

            $statObj = [PSCustomObject]@{
                is_running = $isRunning
                task_state = $taskState
                last_run_time = $lastRun
                next_run_time = $nextRun
                total_news_count = $newsCount
                agent_base_url = $sapBaseUrl
                interval_minutes = $intervalMin
                agent_dir = "C:\Users\bangt\Downloads\madang6\sap-integration-agent"
            }
            Send-JsonResponse $stream $corsHeaders ($statObj | ConvertTo-Json -Depth 3 -Compress)
        }
        elseif ($urlPath -eq "/api/sap-agent/start") {
            $taskName = "SAPIntegrationSuiteAgent"
            try {
                & schtasks /run /tn $taskName | Out-Null
                Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"SAP Integration Suite 에이전트 작업을 시작했습니다."}'
            } catch {
                Send-JsonResponse $stream $corsHeaders "{`"success`":false,`"message`":`"실행 실패: $($_.Exception.Message)`"}"
            }
        }
        elseif ($urlPath -eq "/api/sap-agent/stop") {
            $taskName = "SAPIntegrationSuiteAgent"
            try {
                & schtasks /end /tn $taskName 2>$null | Out-Null
                $procs = Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%sap_collector.ps1%'" -ErrorAction SilentlyContinue
                if ($procs) {
                    foreach ($p in $procs) {
                        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"SAP Integration Suite 에이전트 작업을 중지했습니다."}'
            } catch {
                Send-JsonResponse $stream $corsHeaders "{`"success`":false,`"message`":`"중지 실패: $($_.Exception.Message)`"}"
            }
        }
        elseif ($urlPath -eq "/api/sap-agent/trigger") {
            $agentScript = "C:\Users\bangt\Downloads\madang6\sap-integration-agent\sap_collector.ps1"
            if (Test-Path $agentScript) {
                try {
                    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
                    $pinfo.FileName = "powershell.exe"
                    $pinfo.Arguments = "-ExecutionPolicy Bypass -File `"$agentScript`" -Once"
                    $pinfo.WorkingDirectory = "C:\Users\bangt\Downloads\madang6\sap-integration-agent"
                    $pinfo.UseShellExecute = $false
                    $pinfo.CreateNoWindow = $true
                    $proc = [System.Diagnostics.Process]::Start($pinfo)
                    $proc.WaitForExit(15000)

                    $cnt = 0
                    if (Test-Path $sapNewsDataFile) {
                        $nRaw = [System.IO.File]::ReadAllText($sapNewsDataFile, [System.Text.Encoding]::UTF8)
                        if ($nRaw.StartsWith([char]0xFEFF)) { $nRaw = $nRaw.Substring(1) }
                        $nArr = $nRaw | ConvertFrom-Json
                        if ($nArr) { $cnt = @($nArr).Count }
                    }
                    Send-JsonResponse $stream $corsHeaders "{`"success`":true,`"message`":`"SAP 소식 즉시 수집을 완료했습니다.`",`"newsCount`":$cnt}"
                } catch {
                    Send-JsonResponse $stream $corsHeaders "{`"success`":false,`"message`":`"수집 실행 실패: $($_.Exception.Message)`"}"
                }
            } else {
                Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"sap_collector.ps1 스크립트를 찾을 수 없습니다."}'
            }
        }
        elseif ($urlPath -eq "/api/sap-agent/config") {
            $sapCfgFile = Join-Path $dataDir "sapAgentConfig.json"
            if ($method -eq "GET") {
                if (Test-Path $sapCfgFile) {
                    $jsonBytes = [System.IO.File]::ReadAllBytes($sapCfgFile)
                    Send-RawBytesResponse $stream $corsHeaders "application/json; charset=utf-8" $jsonBytes
                } else {
                    $defaultSapCfg = '{"agentBaseUrl":"http://127.0.0.1:8080","intervalMinutes":720,"taskName":"SAPIntegrationSuiteAgent"}'
                    Send-JsonResponse $stream $corsHeaders $defaultSapCfg
                }
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($sapCfgFile, $postData, $Utf8NoBom)
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"SAP 에이전트 설정이 저장되었습니다."}'
            }
        }
        elseif ($urlPath -eq "/api/agent/ping") {
            $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
            $targetUrl = ""
            if ($headerBodySplit.Length -eq 2) {
                try {
                    $bodyObj = $headerBodySplit[1] | ConvertFrom-Json
                    if ($bodyObj -and $bodyObj.url) {
                        $targetUrl = $bodyObj.url.Trim()
                    }
                } catch {}
            }
            if ([string]::IsNullOrWhiteSpace($targetUrl)) {
                Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"유효한 URL이 지정되지 않았습니다."}'
            } else {
                $cleanTarget = $targetUrl -replace 'localhost', '127.0.0.1'

                # 자기 자신(현재 서버 포트)에 대한 ping 요청 시 단일 스레드 데드락 방지
                if ($cleanTarget -match ":$Port(/|$)" -or $cleanTarget -eq "http://127.0.0.1:$Port" -or $cleanTarget -eq "http://localhost:$Port") {
                    $pingOut = [PSCustomObject]@{
                        success = $true
                        statusCode = 200
                        latencyMs = 1
                        url = $targetUrl
                        message = "연결 성공 (로컬 포털 서버 가동 중, 1ms)"
                    }
                    Send-JsonResponse $stream $corsHeaders ($pingOut | ConvertTo-Json -Compress)
                } else {
                    $sw = [System.Diagnostics.Stopwatch]::StartNew()
                    try {
                        $pingRes = Invoke-WebRequest -Uri $cleanTarget -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
                        $sw.Stop()
                        $pingOut = [PSCustomObject]@{
                            success = $true
                            statusCode = [int]$pingRes.StatusCode
                            latencyMs = [int]$sw.ElapsedMilliseconds
                            url = $targetUrl
                            message = "연결 성공 ($([int]$sw.ElapsedMilliseconds)ms, HTTP $([int]$pingRes.StatusCode))"
                        }
                        Send-JsonResponse $stream $corsHeaders ($pingOut | ConvertTo-Json -Compress)
                    } catch {
                        $sw.Stop()
                        $errOut = [PSCustomObject]@{
                            success = $false
                            latencyMs = [int]$sw.ElapsedMilliseconds
                            url = $targetUrl
                            error = $_.Exception.Message
                            message = "연결 실패: 에이전트 서버가 응답하지 않습니다."
                        }
                        Send-JsonResponse $stream $corsHeaders ($errOut | ConvertTo-Json -Compress)
                    }
                }
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
                                    try {
                                        $knowRaw = [System.IO.File]::ReadAllText($sapKnowledgeDataFile, [System.Text.Encoding]::UTF8)
                                        $knowList = $knowRaw | ConvertFrom-Json
                                        $qTerms = $userQuestion.ToLower().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
                                        $scoredList = @()
                                        foreach ($item in $knowList) {
                                            $score = 0
                                            $txt = "$($item.title) $($item.topic) $($item.content)".ToLower()
                                            foreach ($w in $qTerms) {
                                                if ($w.Length -gt 1 -and $txt.Contains($w)) { $score += 2 }
                                            }
                                            $scoredList += [PSCustomObject]@{ Item = $item; Score = $score }
                                        }
                                        $top = $scoredList | Sort-Object Score -Descending | Select-Object -First 4
                                        foreach ($s in $top) {
                                            $k = $s.Item
                                            $knowledgeSnippet += "[사내 등록 지식: $($k.topic) - $($k.title)]`n$($k.content)`n`n"
                                        }
                                    } catch {}
                                }

                                $newsSnippet = ""
                                if (Test-Path $sapNewsDataFile) {
                                    try {
                                        $newsRaw = [System.IO.File]::ReadAllText($sapNewsDataFile, [System.Text.Encoding]::UTF8)
                                        $newsList = $newsRaw | ConvertFrom-Json
                                        foreach ($n in $newsList[0..1]) {
                                            $newsSnippet += "[SAP 최신 뉴스/업데이트]: $($n.title) ($($n.category))`n"
                                        }
                                    } catch {}
                                }

                                $systemPrompt = @"
당신은 세계 최고 수준의 SAP Integration Suite (Cloud Integration, API Management, Open Connectors) 수석 솔루션 아키텍트이자 Groovy 스크립트 전문가입니다.

[답변 생성 핵심 원칙]
1. 사용자의 질문에 정확히 맞추어 실무 적용 가능한 완벽한 iFlow 단계별 구성 가이드, 프로토콜 설정(Adapter, Content Modifier, Request-Reply, Exception Subprocess 등) 및 무결한 Groovy 코드를 작성하세요.
2. 아래에 제공된 [사내 SAP Integration Suite 등록 지식베이스]를 적극 반영하여, 최신 SAP BTP 표준과 모범 사례(Best Practices)에 입각하여 답변하세요.
3. 인사말이나 '고객님은 ... 전문가로서' 같은 불필요한 사족을 절대 출력하지 말고 곧바로 본론을 서술하세요.
4. [답변 포맷 구조 규칙 - 반드시 준수]:
   - 먼저 상단에 간결하고 명확한 요약 섹션을 작성하세요:
     ### 📋 핵심 요약 및 추천 iFlow 구성
     (3~5줄 분량의 개요 및 필수 iFlow 스텝 목록)
   - 요약이 끝나면 반드시 아래 구분자 한 줄을 단독으로 출력하세요:
     ---DETAILS---
   - 구분자 아래에는 상세 설정과 코드를 빠짐없이 완벽하게 작성하세요:
     ### 🔍 상세 구현 가이드 & Groovy 코드
     (각 스텝별 세부 설정 파라미터, Adapter 프로토콜 설정, Request-Reply, 무결한 Groovy 스크립트 전문, Exception Subprocess, End Event 및 테스트 검증 절차)
5. Groovy 스크립트 작성 시 processData(Message message) 시그니처와 com.sap.gateway.ip.core.customdev.util.Message 임포트를 정확히 준수하세요.
6. 마지막 End Event 및 테스트/검증 요령까지 생략 없이 100% 완전하게 문장을 끝맺으세요.
"@
                                $userContentText = @"
$(if (-not [string]::IsNullOrWhiteSpace($knowledgeSnippet)) { "[사내 SAP Integration Suite 등록 지식베이스]`n$knowledgeSnippet`n" })
$(if (-not [string]::IsNullOrWhiteSpace($newsSnippet)) { "[사내 등록 최신 SAP 뉴스/업데이트]`n$newsSnippet`n" })
[사용자 질문]: $userQuestion
"@

                                $isSearchQuery = ($userQuestion -match "최신|뉴스|공지|업데이트|릴리즈|검색|동향|사이트|url|링크")
                                $modelList = @("gemini-2.5-flash-lite", "gemini-2.5-flash")
                                $gResp = $null

                                # Gemini 호출 람다 (검색 도구 옵션 포함)
                                $callGemini = {
                                    param([bool]$withSearch)
                                    $payloadObj = [PSCustomObject]@{
                                        system_instruction = [PSCustomObject]@{
                                            parts = @( [PSCustomObject]@{ text = $systemPrompt } )
                                        }
                                        contents = @(
                                            [PSCustomObject]@{
                                                role = "user"
                                                parts = @( [PSCustomObject]@{ text = $userContentText } )
                                            }
                                        )
                                        generationConfig = [PSCustomObject]@{
                                            temperature = 0.2
                                            maxOutputTokens = 8192
                                        }
                                    }
                                    if ($withSearch) {
                                        $payloadObj | Add-Member -NotePropertyName "tools" -NotePropertyValue @( [PSCustomObject]@{ google_search = [PSCustomObject]@{} } )
                                    }
                                    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($payloadObj | ConvertTo-Json -Depth 6))

                                    foreach ($mName in $modelList) {
                                        $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/${mName}:generateContent?key=$geminiKey"
                                        try {
                                            $res = Invoke-RestMethod -Uri $geminiUrl -Method Post -ContentType "application/json" -Body $jsonBytes -TimeoutSec 75 -ErrorAction Stop
                                            if ($res.candidates -and $res.candidates[0].content.parts[0].text) {
                                                return $res
                                            }
                                        } catch {}
                                    }
                                    return $null
                                }

                                try {
                                    # 기술/설계 질문은 검색도구 없이 온전한 코드/다이어그램 생성, 뉴스/최신 질문은 검색도구 활성화
                                    if ($isSearchQuery) {
                                        $gResp = & $callGemini $true
                                        # 검색 결과가 비정상적으로 잘렸거나 너무 짧은 경우 온전한 생성을 위해 재시도
                                        if ($null -eq $gResp -or ($gResp.candidates[0].content.parts[0].text.Length -lt 1500 -and $gResp.candidates[0].content.parts[0].text -match ":\s*$")) {
                                            $retryResp = & $callGemini $false
                                            if ($null -ne $retryResp) { $gResp = $retryResp }
                                        }
                                    } else {
                                        $gResp = & $callGemini $false
                                    }

                                    if ($null -ne $gResp -and $gResp.candidates -and $gResp.candidates[0].content.parts[0].text) {
                                        $answerText = $gResp.candidates[0].content.parts[0].text

                                        # Grounding 출처 링크 추가 (검색 도구 사용 시)
                                        if ($gResp.candidates[0].groundingMetadata -and $gResp.candidates[0].groundingMetadata.groundingChunks) {
                                            $sources = @()
                                            foreach ($chunk in $gResp.candidates[0].groundingMetadata.groundingChunks) {
                                                if ($chunk.web -and $chunk.web.uri -and -not ($sources | Where-Object { $_.uri -eq $chunk.web.uri })) {
                                                    $srcTitle = if ($chunk.web.title) { $chunk.web.title } else { "SAP 공식 문서/참조" }
                                                    $sources += [PSCustomObject]@{ uri = $chunk.web.uri; title = $srcTitle }
                                                }
                                            }
                                            if ($sources.Count -gt 0) {
                                                $answerText += "`n`n---`n#### 🌐 실시간 인터넷 검색 및 공식 SAP 참조 자료`n"
                                                $idx = 1
                                                foreach ($src in $sources[0..[Math]::Min(4, $sources.Count - 1)]) {
                                                    $answerText += "$idx. [$($src.title)]($($src.uri))`n"
                                                    $idx++
                                                }
                                            }
                                        }

                                        $consultingResult = [PSCustomObject]@{
                                            success = $true
                                            answer = $answerText
                                            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                                        }
                                    } else {
                                        $consultingResult = [PSCustomObject]@{
                                            success = $false
                                            message = "Gemini API로부터 유효한 답변을 받지 못했습니다. 잠시 후 다시 시도해주세요."
                                        }
                                    }
                                } catch {
                                    $consultingResult = [PSCustomObject]@{
                                        success = $false
                                        message = "Gemini API 호출 실패: $($_.Exception.Message)"
                                    }
                                }
                            }
                        }
                    } catch {
                        $consultingResult = [PSCustomObject]@{
                            success = $false
                            message = "요청 처리 중 오류 발생: $($_.Exception.Message)"
                        }
                    }
                }

                if ($null -eq $consultingResult) {
                    $consultingResult = [PSCustomObject]@{
                        success = $false
                        message = "GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 유효한 Gemini API 키를 설정해주세요."
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

                                    $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$geminiKey"
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

                                    $geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$geminiKey"
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
        elseif ($urlPath -eq "/api/telegram/test-alert") {
            $testIp = "203.0.113.88"
            if ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    try {
                        $bObj = $headerBodySplit[1] | ConvertFrom-Json
                        if ($bObj -and $bObj.ip) { $testIp = $bObj.ip }
                    } catch {}
                }
            }
            Send-TelegramNewIpAlert $testIp "/test" "테스트 유입 시뮬레이션"
            Send-JsonResponse $stream $corsHeaders '{"success":true,"message":"텔레그램 알림 발송 완료"}'
        }
        elseif ($urlPath -match "^/api/system/agents") {
            $madang6Dir = "C:\Users\bangt\Downloads\madang6"
            $pyExe = Join-Path $madang6Dir "newsfilter_threads_agent\.venv\Scripts\python.exe"
            if (-not (Test-Path $pyExe)) { $pyExe = "python" }

            $agentDefs = @(
                @{ id = "threads"; name = "Threads AI 뉴스 에이전트"; category = "main"; icon = "📰"; cwd = (Join-Path $madang6Dir "newsfilter_threads_agent"); script = "main.py"; args = @(); pattern = "newsfilter_threads_agent" },
                @{ id = "sap"; name = "SAP Integration Suite 에이전트"; category = "main"; icon = "⚙️"; cwd = (Join-Path $madang6Dir "sap-integration-agent"); script = "main.py"; args = @(); pattern = "sap-integration-agent" },
                @{ id = "supervisor"; name = "AI 통합 감독관 (Supervisor)"; category = "main"; icon = "🛡️"; cwd = (Join-Path $madang6Dir "agent_supervisor"); script = "main.py"; args = @(); pattern = "agent_supervisor" },
                @{ id = "lead_orchestrator"; name = "메인 주식 총괄 에이전트 (Lead)"; category = "stock_lead"; icon = "📈"; cwd = (Join-Path $madang6Dir "메인주식총괄에이전트"); script = "main.py"; args = @("--interval", "60"); pattern = "메인주식총괄에이전트" },
                @{ id = "sub_danka"; name = "단가 분석 에이전트"; category = "sub_council"; icon = "⚖️"; cwd = (Join-Path $madang6Dir "서브주식에이전트_단가"); script = "main.py"; args = @("--stock", "005930"); pattern = "서브주식에이전트_단가" },
                @{ id = "sub_growth"; name = "성장론자 에이전트"; category = "sub_council"; icon = "🚀"; cwd = (Join-Path $madang6Dir "서브주식에이전트_성장론자"); script = "main.py"; args = @("--interval", "60"); pattern = "서브주식에이전트_성장론자" },
                @{ id = "sub_cautious"; name = "신중론자 에이전트"; category = "sub_council"; icon = "🛡️"; cwd = (Join-Path $madang6Dir "서브주식에이전트_신중론자"); script = "main.py"; args = @("--interval", "60"); pattern = "서브주식에이전트_신중론자" },
                @{ id = "sub_technical"; name = "기술적분석가 에이전트"; category = "sub_council"; icon = "📊"; cwd = (Join-Path $madang6Dir "서브주식에이전트_기술적분석가"); script = "main.py"; args = @("--interval", "60"); pattern = "서브주식에이전트_기술적분석가" },
                @{ id = "sub_jurini"; name = "주린이 에이전트"; category = "sub_council"; icon = "🌱"; cwd = (Join-Path $madang6Dir "서브주식에이전트_주린이"); script = "main.py"; args = @("--interval", "60"); pattern = "서브주식에이전트_주린이" }
            )

            $procs = @(Get-CimInstance -ClassName Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "python*" } | Select-Object ProcessId, CommandLine)

            if ($urlPath -eq "/api/system/agents" -and $method -eq "GET") {
                $agentList = @()
                foreach ($def in $agentDefs) {
                    $matchProc = $procs | Where-Object {
                        $cmd = $_.CommandLine
                        if (-not $cmd) { return $false }
                        if ($cmd -like "*$($def.pattern)*") { return $true }
                        if ($def.cwd -and ($cmd -like "*$($def.cwd)*")) { return $true }
                        return $false
                    } | Select-Object -First 1
                    $agentList += [PSCustomObject]@{
                        id = $def.id
                        name = $def.name
                        category = $def.category
                        icon = $def.icon
                        is_running = [bool]($null -ne $matchProc)
                        pid = if ($matchProc) { [int]$matchProc.ProcessId } else { $null }
                    }
                }
                $runningCnt = @($agentList | Where-Object { $_.is_running }).Count
                $resObj = [PSCustomObject]@{
                    success = $true
                    agents = $agentList
                    totalCount = $agentList.Count
                    runningCount = $runningCnt
                }
                $jsonOut = $resObj | ConvertTo-Json -Depth 4
                Send-JsonResponse $stream $corsHeaders $jsonOut
            }
            elseif ($urlPath -match "^/api/system/agents/([^/]+)/(start|stop)$" -and $method -eq "POST") {
                $targetId = $Matches[1]
                $targetAction = $Matches[2]

                if ($targetId -eq "sub_council_all") {
                    $subDefs = $agentDefs | Where-Object { $_.category -eq "sub_council" }
                    $actCount = 0
                    foreach ($sub in $subDefs) {
                        $match = $procs | Where-Object { $_.CommandLine -like "*$($sub.pattern)*" } | Select-Object -First 1
                        if ($targetAction -eq "start") {
                            if (-not $match) {
                                $scriptPath = Join-Path $sub.cwd $sub.script
                                $fullArgs = if ($sub.args.Length -gt 0) { "`"$scriptPath`" $($sub.args -join ' ')" } else { "`"$scriptPath`"" }
                                Start-Process -FilePath $pyExe -ArgumentList $fullArgs -WorkingDirectory $sub.cwd -WindowStyle Hidden
                                $actCount++
                            }
                        } else {
                            if ($match) {
                                Stop-Process -Id $match.ProcessId -Force -ErrorAction SilentlyContinue
                                $actCount++
                            }
                        }
                    }
                    $msg = if ($targetAction -eq "start") { "5대 주식 서브에이전트 일괄 기동 ($actCount 개 신규 시작)" } else { "5대 주식 서브에이전트 일괄 중지 ($actCount 개 종료)" }
                    Send-JsonResponse $stream $corsHeaders (@{ success = $true; message = $msg } | ConvertTo-Json)
                }
                else {
                    $foundDef = $agentDefs | Where-Object { $_.id -eq $targetId } | Select-Object -First 1
                    if (-not $foundDef) {
                        Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"에이전트를 찾을 수 없습니다."}'
                    } else {
                        $match = $procs | Where-Object { $_.CommandLine -like "*$($foundDef.pattern)*" } | Select-Object -First 1
                        if ($targetAction -eq "start") {
                            if ($match) {
                                Send-JsonResponse $stream $corsHeaders (@{ success = $true; message = "이미 가동 중입니다. (PID: $($match.ProcessId))"; pid = $match.ProcessId } | ConvertTo-Json)
                            } else {
                                $scriptPath = Join-Path $foundDef.cwd $foundDef.script
                                $fullArgs = if ($foundDef.args.Length -gt 0) { "`"$scriptPath`" $($foundDef.args -join ' ')" } else { "`"$scriptPath`"" }
                                $p = Start-Process -FilePath $pyExe -ArgumentList $fullArgs -WorkingDirectory $foundDef.cwd -WindowStyle Hidden -PassThru
                                Start-Sleep -Milliseconds 600
                                Send-JsonResponse $stream $corsHeaders (@{ success = $true; message = "[$($foundDef.name)] 기동 완료"; pid = $p.Id } | ConvertTo-Json)
                            }
                        } else {
                            if (-not $match) {
                                Send-JsonResponse $stream $corsHeaders (@{ success = $true; message = "이미 정지된 상태입니다." } | ConvertTo-Json)
                            } else {
                                Stop-Process -Id $match.ProcessId -Force -ErrorAction SilentlyContinue
                                Send-JsonResponse $stream $corsHeaders (@{ success = $true; message = "[$($foundDef.name)] 정지 완료 (PID: $($match.ProcessId))" } | ConvertTo-Json)
                            }
                        }
                    }
                }
            }
            else {
                Send-JsonResponse $stream $corsHeaders '{"success":false,"message":"Not Found"}'
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
                try {
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($notFoundBytes, 0, $notFoundBytes.Length)
                    $stream.Flush()
                } catch {}
            }
        }
        $client.Close()
    } catch {
        Write-Host " [Server Error] $_" -ForegroundColor Red
        Write-Host " [Position] $($_.InvocationInfo.PositionMessage)" -ForegroundColor Magenta
        Write-Host " [Trace] $($_.ScriptStackTrace)" -ForegroundColor Yellow
        Start-Sleep -Milliseconds 20
    }
}

