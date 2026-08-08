# Ultra-Robust Non-Blocking TCP Socket HTTP Server in PowerShell
param([int]$Port = 8080)

$root = $PSScriptRoot
$dataDir = Join-Path $root "data"
$dataFile = Join-Path $dataDir "apis.json"

if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

$ip = [System.Net.IPAddress]::Any
$listener = New-Object System.Net.Sockets.TcpListener($ip, $Port)

try {
    $listener.Start()
    Write-Host "TCP Web server started on port $Port"
    Write-Host "Serving files from: $root"
    Write-Host "API Data File: $dataFile"
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

        $corsHeaders = "Access-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`n"

        if ($method -eq "OPTIONS") {
            $responseHeader = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Length: 0`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
        }
        elseif ($urlPath -eq "/api/apis") {
            if ($method -eq "GET") {
                $jsonContent = "[]"
                if (Test-Path $dataFile) {
                    $jsonContent = [System.IO.File]::ReadAllText($dataFile, [System.Text.Encoding]::UTF8)
                }
                $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
                $responseHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($jsonBytes.Length)`r`n${corsHeaders}Connection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($jsonBytes, 0, $jsonBytes.Length)
            }
            elseif ($method -eq "POST") {
                $headerBodySplit = $requestText -split "\r?\n\r?\n", 2
                if ($headerBodySplit.Length -eq 2) {
                    $postData = $headerBodySplit[1]
                    if (-not [string]::IsNullOrWhiteSpace($postData)) {
                        [System.IO.File]::WriteAllText($dataFile, $postData, [System.Text.Encoding]::UTF8)
                    }
                }
                $resBody = '{"status":"ok"}'
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resBody)
                $responseHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($resBytes.Length)`r`n${corsHeaders}Connection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($responseHeader)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($resBytes, 0, $resBytes.Length)
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

                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`n${corsHeaders}Connection: close`r`n`r`n"
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
