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
$filePath = Join-Path (Split-Path $root -Parent) "data\aiModels.json"

Write-Host "Extracting AI Models via Regex..."
$raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Regex to match individual AI model objects
$pattern = '\{"id":"([^"]+)","title":"([^"]+)"[^}]*\}'
$matches = [regex]::Matches($raw, $pattern)

Write-Host "Matched $($matches.Count) raw AI Model blocks."

$payload = @()
foreach ($m in $matches) {
    $block = $m.Value
    
    $id = if ($block -match '"id":"([^"]+)"') { $matches[0].Groups[1].Value } else { "" }
    $title = if ($block -match '"title":"([^"]+)"') { $matches[0].Groups[1].Value } else { "" }
    
    # Simple extraction
    $cat = if ($block -match '"category":"([^"]+)"') { $matches[0].Groups[1].Value } else { "기타" }
    $prov = if ($block -match '"developer":"([^"]+)"') { $matches[0].Groups[1].Value } elseif ($block -match '"provider":"([^"]+)"') { $matches[0].Groups[1].Value } else { "" }
    $desc = if ($block -match '"summary":"([^"]+)"') { $matches[0].Groups[1].Value } elseif ($block -match '"description":"([^"]+)"') { $matches[0].Groups[1].Value } else { "" }

    if ($id -and $title) {
        $payload += @{
            id = $id
            title = $title
            category = $cat
            provider = $prov
            description = $desc
        }
    }
}

Write-Host "Valid AI Models count: $($payload.Count)"

Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 2147483647

for ($i = 0; $i -lt $payload.Count; $i += 10) {
    $endIdx = [Math]::Min($i + 9, $payload.Count - 1)
    $chunk = $payload[$i..$endIdx]
    $jsonBody = $serializer.Serialize($chunk)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

    try {
        $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ai_models" -Method Post -Headers $headers -Body $bytes
        Write-Host " -> Uploaded AI Models chunk [$i .. $endIdx]"
    } catch {
        Write-Host " -> Error: $($_.Exception.Message)"
    }
}

Write-Host "=========================================================="
Write-Host "✅ AI Models Upload Finished!"
Write-Host "=========================================================="
