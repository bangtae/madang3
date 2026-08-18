# Ultra-Robust Non-Blocking TCP Socket HTTP Server in PowerShell with Whitelist/Blacklist & Access Logging
param([int]$Port = 8080)

$root = $PSScriptRoot
$dataDir = Join-Path $root "data"
$dataFile = Join-Path $dataDir "apis.json"
$allowedIpsFile = Join-Path $dataDir "allowed_ips.json"
$blockedIpsFile = Join-Path $dataDir "blocked_ips.json"
$accessLogsFile = Join-Path $dataDir "access_logs.json"

$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

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
}

function Log-Access([string]$clientIp, [string]$status, [string]$requestPath) {
    # 정적 리소스 파일(.js, .css, .png 등)은 로그 폭주 방지를 위해 기록 생략
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

$ip = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($ip, $Port)

try {
    $listener.Start()
    Write-Host "TCP Web server started on port $Port"
    Write-Host "Serving files from: $root"
    Write-Host "API Data File: $dataFile"
    Write-Host "Allowed IPs File: $allowedIpsFile"
    Write-Host "Blocked IPs File: $blockedIpsFile"
    Write-Host "Access Logs File: $accessLogsFile"
    Write-Host "Access locally: http://localhost:$Port"
    Write-Host "Access from smartphone/laptop: http://192.168.219.115:$Port"
} catch {
    Write-Host "Could not start TcpListener on port $Port"
    exit 1
}

while ($true) {
    $client = $null
    try {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 3000
        $client.SendTimeout = 3000

        $remoteEndPoint = $client.Client.RemoteEndPoint
        $clientIpObj = $remoteEndPoint.Address
        if ($clientIpObj.IsIPv4MappedToIPv6) {
            $clientIpObj = $clientIpObj.MapToIPv4()
        }
        $clientIp = $clientIpObj.ToString().Trim()
        if ($clientIp.StartsWith("::ffff:")) {
            $clientIp = $clientIp.Substring(7).Trim()
        }

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
            continue
        }

        $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
        $lines = $requestText -split "\r?\n"
        if ($lines.Length -eq 0 -or [string]::IsNullOrWhiteSpace($lines[0])) {
            continue
        }

        $requestLine = $lines[0]
        $parts = $requestLine -split '\s+'
        if ($parts.Length -lt 2) {
            continue
        }

        $method = $parts[0]
        $urlPath = [System.Uri]::UnescapeDataString($parts[1])
        if ($urlPath.Contains("?")) {
            $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("?"))
        }

        # Log allowed access (excluding static assets)
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
                    }
                }
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        elseif ($urlPath -eq "/api/allowed-ips") {
            if ($method -eq "GET") {
                $jsonContent = '["127.0.0.1", "::1", "192.168.219.115", "192.168.219.*"]'
                if (Test-Path $allowedIpsFile) {
                    $jsonContent = [System.IO.File]::ReadAllText($allowedIpsFile, [System.Text.Encoding]::UTF8)
                }
                Send-JsonResponse $stream $corsHeaders $jsonContent
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
                $jsonContent = "[]"
                if (Test-Path $blockedIpsFile) {
                    $jsonContent = [System.IO.File]::ReadAllText($blockedIpsFile, [System.Text.Encoding]::UTF8)
                }
                Send-JsonResponse $stream $corsHeaders $jsonContent
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
                $jsonContent = "[]"
                if (Test-Path $accessLogsFile) {
                    $jsonContent = [System.IO.File]::ReadAllText($accessLogsFile, [System.Text.Encoding]::UTF8)
                }
                Send-JsonResponse $stream $corsHeaders $jsonContent
            }
            elseif ($method -eq "DELETE") {
                [System.IO.File]::WriteAllText($accessLogsFile, "[]", $Utf8NoBom)
                Send-JsonResponse $stream $corsHeaders '{"status":"ok"}'
            }
        }
        else {
            if ($urlPath -eq "/") { $urlPath = "/index.html" }
            $filePath = [System.IO.Path]::Combine($root, $urlPath.TrimStart('/').Replace('/', '\'))

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".svg"  { "image/svg+xml" }
                    default { "application/octet-stream" }
                }

                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nCache-Control: no-cache, no-store, must-revalidate`r`nPragma: no-cache`r`nContent-Length: $($bytes.Length)`r`n${corsHeaders}Connection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($bytes, 0, $bytes.Length)
            } else {
                $notFound = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`n${corsHeaders}Connection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($notFound)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
            }
        }
    } catch {
        # continue loop safely
    } finally {
        if ($null -ne $client) {
            try { $client.Close() } catch {}
        }
    }
}
