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

Write-Host "Reading aiModels.json..."
$raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 2147483647

$items = $serializer.DeserializeObject($raw)
Write-Host "Found $($items.Count) AI Models in JSON."

$payload = @()
foreach ($item in $items) {
    $prov = if ($item.ContainsKey("developer")) { [string]$item["developer"] } elseif ($item.ContainsKey("provider")) { [string]$item["provider"] } else { "" }
    $desc = if ($item.ContainsKey("summary")) { [string]$item["summary"] } elseif ($item.ContainsKey("description")) { [string]$item["description"] } else { "" }
    $cat = if ($item.ContainsKey("category")) { [string]$item["category"] } else { "기타" }

    $payload += @{
        id = [string]$item["id"]
        title = [string]$item["title"]
        category = $cat
        provider = $prov
        description = $desc
    }
}

Write-Host "Uploading $($payload.Count) AI Models to Supabase ai_models table..."

for ($i = 0; $i -lt $payload.Count; $i += 10) {
    $endIdx = [Math]::Min($i + 9, $payload.Count - 1)
    $chunk = $payload[$i..$endIdx]
    $jsonBody = $serializer.Serialize($chunk)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

    try {
        $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ai_models" -Method Post -Headers $headers -Body $bytes
        Write-Host " -> Uploaded chunk [$i .. $endIdx] / $($payload.Count)"
    } catch {
        Write-Host " -> Upload Error: $($_.Exception.Message)"
    }
}

Write-Host "=========================================================="
Write-Host "✅ AI Models Upload Finished! Total: $($payload.Count) items"
Write-Host "=========================================================="
