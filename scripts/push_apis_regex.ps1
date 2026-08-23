[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$supabaseUrl = "https://your-supabase-project.supabase.co"
$anonKey = "your-supabase-anon-key"

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json; charset=utf-8"
    "Prefer" = "resolution=merge-duplicates"
}

$root = $PSScriptRoot
$filePath = Join-Path (Split-Path $root -Parent) "data\apis.json"

Write-Host "Reading apis.json via Regex..."
$raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Regex Match all objects {"id":...}
$pattern = '\{"id":"([^"]+)","title":"([^"]*)","serviceUrl":"([^"]*)","docsUrl":"([^"]*)","category":"([^"]*)"[^}]*\}'
$matches = [regex]::Matches($raw, $pattern)

Write-Host "Matched $($matches.Count) API items!"

$payload = @()
foreach ($m in $matches) {
    $payload += @{
        id = $m.Groups[1].Value
        title = $m.Groups[2].Value
        service_url = $m.Groups[3].Value
        description = $m.Groups[4].Value
        category = if ($m.Groups[5].Value) { $m.Groups[5].Value } else { "기타" }
    }
}

Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 2147483647

for ($i = 0; $i -lt $payload.Count; $i += 40) {
    $endIdx = [Math]::Min($i + 39, $payload.Count - 1)
    $chunk = $payload[$i..$endIdx]
    $jsonBody = $serializer.Serialize($chunk)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

    try {
        $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/apis" -Method Post -Headers $headers -Body $bytes
        Write-Host " -> Uploaded APIs chunk [$i .. $endIdx] / $($payload.Count)"
    } catch {
        Write-Host " -> Upload error: $($_.Exception.Message)"
    }
}

Write-Host "=========================================================="
Write-Host "✅ FINISHED! All $($payload.Count) APIs inserted to Supabase apis table!"
Write-Host "=========================================================="
