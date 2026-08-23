Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 2147483647

$supabaseUrl = "https://your-supabase-project.supabase.co"
$anonKey = "your-supabase-anon-key"

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json; charset=utf-8"
    "Prefer" = "resolution=merge-duplicates"
}

$root = $PSScriptRoot
$dataDir = Join-Path (Split-Path $root -Parent) "data"

function Upload-ApisNet() {
    $filePath = Join-Path $dataDir "apis.json"
    if (-not (Test-Path $filePath)) { return }

    Write-Host "Reading apis.json..."
    $raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
    if ($raw.StartsWith([char]0xFEFF)) { $raw = $raw.Substring(1) }

    $items = $serializer.DeserializeObject($raw)
    Write-Host "Parsed $($items.Count) API items for [apis] table."

    $payloadList = @()
    foreach ($item in $items) {
        $payloadList += @{
            id = [string]$item["id"]
            title = [string]$item["title"]
            category = if ($item["category"]) { [string]$item["category"] } else { "기타" }
            service_url = if ($item["serviceUrl"]) { [string]$item["serviceUrl"] } else { "" }
            description = if ($item["docsUrl"]) { [string]$item["docsUrl"] } else { "" }
        }
    }

    for ($i = 0; $i -lt $payloadList.Count; $i += 50) {
        $endIdx = [Math]::Min($i + 49, $payloadList.Count - 1)
        $chunk = $payloadList[$i..$endIdx]
        $jsonBody = $serializer.Serialize($chunk)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

        try {
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/apis" -Method Post -Headers $headers -Body $bytes
            Write-Host " -> Uploaded APIs chunk [$i .. $endIdx] / $($payloadList.Count)"
        } catch {
            Write-Host " -> Error uploading APIs chunk: $($_.Exception.Message)"
        }
    }
    Write-Host "✅ Table [apis] Uploaded Successfully! Total: $($payloadList.Count) items"
}

Upload-ApisNet
