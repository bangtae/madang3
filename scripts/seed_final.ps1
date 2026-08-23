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

function Upload-Dataset($fileName, $tableName, $mappingBlock) {
    $filePath = Join-Path $dataDir $fileName
    if (-not (Test-Path $filePath)) { return }

    Write-Host "Processing $fileName -> $tableName..."
    $raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
    if ($raw.StartsWith([char]0xFEFF)) { $raw = $raw.Substring(1) }

    $items = $serializer.Deserialize($raw, [System.Object[]])
    $payloadList = @()

    foreach ($item in $items) {
        $dict = & $mappingBlock $item
        $payloadList += $dict
    }

    Write-Host "Total items to upload: $($payloadList.Count)"
    
    # 20개 단위 분할 전송
    for ($i = 0; $i -lt $payloadList.Count; $i += 20) {
        $endIndex = [Math]::Min($i + 19, $payloadList.Count - 1)
        $slice = $payloadList[$i..$endIndex]
        $jsonPayload = $serializer.Serialize($slice)
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonPayload)

        try {
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$tableName" -Method Post -Headers $headers -Body $bytes
        } catch {
            Write-Host "Error uploading chunk [$i~$endIndex]: $_"
        }
    }
    Write-Host "SUCCESS: $tableName ($($payloadList.Count) items)"
}

# 1. APIs
Upload-Dataset "apis.json" "apis" {
    param($item)
    return @{
        id = [string]$item["id"]
        title = [string]$item["title"]
        category = if ($item["category"]) { [string]$item["category"] } else { "기타" }
        service_url = if ($item["serviceUrl"]) { [string]$item["serviceUrl"] } else { "" }
        description = if ($item["docsUrl"]) { [string]$item["docsUrl"] } else { "" }
    }
}

# 2. AI Models
Upload-Dataset "aiModels.json" "ai_models" {
    param($item)
    return @{
        id = [string]$item["id"]
        title = [string]$item["title"]
        category = if ($item["category"]) { [string]$item["category"] } else { "기타" }
        provider = if ($item["provider"]) { [string]$item["provider"] } else { "" }
        description = if ($item["description"]) { [string]$item["description"] } else { "" }
    }
}

# 3. AI Terms
Upload-Dataset "aiTerms.json" "ai_terms" {
    param($item)
    return @{
        id = [string]$item["id"]
        term = [string]$item["term"]
        definition = if ($item["definition"]) { [string]$item["definition"] } else { "" }
        category = if ($item["category"]) { [string]$item["category"] } else { "기타" }
    }
}

# 4. SAP Terms
Upload-Dataset "sapTerms.json" "sap_terms" {
    param($item)
    return @{
        id = [string]$item["id"]
        term = [string]$item["term"]
        definition = if ($item["definition"]) { [string]$item["definition"] } else { "" }
        category = if ($item["category"]) { [string]$item["category"] } else { "기타" }
    }
}

Write-Host "FINISHED MIGRATION TO SUPABASE!"
