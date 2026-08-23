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

Write-Host "Extracting AI Models from aiModels.json..."
$raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Matches object blocks
$blocks = [regex]::Matches($raw, '\{"id":".*?"createdAt":".*?"\}')

$payload = @()
foreach ($b in $blocks) {
    $text = $b.Value
    $id = if ($text -match '"id":"([^"]+)"') { $Matches[1] } else { "" }
    $title = if ($text -match '"title":"([^"]+)"') { $Matches[1] } else { "" }
    $cat = if ($text -match '"category":"([^"]+)"') { $Matches[1] } else { "기타" }
    $prov = if ($text -match '"developer":"([^"]+)"') { $Matches[1] } elseif ($text -match '"provider":"([^"]+)"') { $Matches[1] } else { "" }
    $desc = if ($text -match '"summary":"([^"]+)"') { $Matches[1] } elseif ($text -match '"description":"([^"]+)"') { $Matches[1] } else { "" }

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

Write-Host "Found $($payload.Count) valid AI Models."

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
        Write-Host " -> Uploaded chunk [$i .. $endIdx]"
    } catch {
        Write-Host " -> Upload Error: $($_.Exception.Message)"
    }
}

Write-Host "=========================================================="
Write-Host "✅ AI Models Upload Completed! Total: $($payload.Count) items"
Write-Host "=========================================================="
