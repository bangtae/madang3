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
$filePath = Join-Path (Split-Path $root -Parent) "data\user_export_apis.json"

Write-Host "Reading user_export_apis.json..."
$raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 2147483647

$rootObj = $serializer.DeserializeObject($raw)
$categoriesDict = $rootObj["categories"]

$payload = @()

foreach ($catKey in $categoriesDict.Keys) {
    $apiList = $categoriesDict[$catKey]
    foreach ($item in $apiList) {
        $payload += @{
            id = [string]$item["id"]
            title = [string]$item["title"]
            category = [string]$catKey
            service_url = if ($item["serviceUrl"]) { [string]$item["serviceUrl"] } else { "" }
            description = if ($item["docsUrl"]) { [string]$item["docsUrl"] } else { "" }
        }
    }
}

Write-Host "Extracted $($payload.Count) total API items from user exported categories!"

for ($i = 0; $i -lt $payload.Count; $i += 40) {
    $endIdx = [Math]::Min($i + 39, $payload.Count - 1)
    $chunk = $payload[$i..$endIdx]
    $jsonBody = $serializer.Serialize($chunk)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

    try {
        $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/apis" -Method Post -Headers $headers -Body $bytes
        Write-Host " -> Uploaded user export chunk [$i .. $endIdx] / $($payload.Count)"
    } catch {
        Write-Host " -> Upload Error: $($_.Exception.Message)"
    }
}

Write-Host "=========================================================="
Write-Host "✅ FINISHED! All $($payload.Count) exported APIs uploaded to Supabase!"
Write-Host "=========================================================="
