[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$supabaseUrl = "https://your-supabase-project.supabase.co"
$anonKey = "your-supabase-anon-key"

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json; charset=utf-8"
}

$root = $PSScriptRoot
$allowedFile = Join-Path (Split-Path $root -Parent) "data\allowed_ips.json"

if (Test-Path $allowedFile) {
    Write-Host "Reading allowed_ips.json..."
    $raw = [System.IO.File]::ReadAllText($allowedFile, [System.Text.Encoding]::UTF8)
    $ips = $raw | ConvertFrom-Json

    $payload = @()
    foreach ($ip in $ips) {
        $payload += @{
            ip_address = [string]$ip
            rule_type = "allowed"
            memo = "기본 관리자 허용 IP"
        }
    }

    Add-Type -AssemblyName System.Web.Extensions
    $serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
    $jsonBody = $serializer.Serialize($payload)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

    try {
        $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ip_rules" -Method Post -Headers $headers -Body $bytes
        Write-Host "✅ IP Rules Uploaded Successfully! ($($payload.Count) IPs)"
    } catch {
        Write-Host "Upload Error: $($_.Exception.Message)"
    }
}
