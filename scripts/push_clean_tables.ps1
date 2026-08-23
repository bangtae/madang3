# Push clean datasets to Supabase Cloud DB

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
$dataDir = Join-Path (Split-Path $root -Parent) "data"

function Upload-JsonData($jsonFileName, $tableName, $mappingFunc) {
    $filePath = Join-Path $dataDir $jsonFileName
    if (-not (Test-Path $filePath)) { return }

    Write-Host "Reading $jsonFileName..."
    $raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
    if ($raw.StartsWith([char]0xFEFF)) { $raw = $raw.Substring(1) }

    # JS assignment prefix removal if present
    $eqIdx = $raw.IndexOf("=")
    if ($eqIdx -ge 0 -and $eqIdx -lt 50) {
        $raw = $raw.Substring($eqIdx + 1).Trim().TrimEnd(';')
    }

    # regex cleaning for PowerShell ConvertFrom-Json compatibility if needed
    $items = $raw | ConvertFrom-Json
    Write-Host "Parsed $($items.Count) items for table [$tableName]."

    $payloadList = @()
    foreach ($item in $items) {
        $payloadList += (& $mappingFunc $item)
    }

    # Chunk upload (chunk size 30)
    for ($i = 0; $i -lt $payloadList.Count; $i += 30) {
        $endIdx = [Math]::Min($i + 29, $payloadList.Count - 1)
        $chunk = $payloadList[$i..$endIdx]
        $jsonBody = $chunk | ConvertTo-Json -Depth 5 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

        try {
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$tableName" -Method Post -Headers $headers -Body $bytes
            Write-Host " -> Uploaded chunk [$i .. $endIdx] to $tableName"
        } catch {
            $err = $_.Exception.Message
            Write-Host " -> Upload error: $err"
        }
    }
    Write-Host "✅ Table [$tableName] Migration Finished!"
}

# 1. AI Models Upload
Upload-JsonData "aiModels.json" "ai_models" {
    param($item)
    return @{
        id = [string]$item.id
        title = [string]$item.title
        category = if ($item.category) { [string]$item.category } else { "기타" }
        provider = if ($item.provider) { [string]$item.provider } else { if ($item.developer) { [string]$item.developer } else { "" } }
        description = if ($item.description) { [string]$item.description } else { if ($item.summary) { [string]$item.summary } else { "" } }
    }
}

# 2. AI Terms Upload
Upload-JsonData "aiTerms.json" "ai_terms" {
    param($item)
    return @{
        id = [string]$item.id
        term = [string]$item.term
        definition = if ($item.definition) { [string]$item.definition } else { if ($item.summary) { [string]$item.summary } else { "" } }
        category = if ($item.category) { [string]$item.category } else { "기타" }
    }
}

# 3. SAP Terms Upload
Upload-JsonData "sapTerms.json" "sap_terms" {
    param($item)
    return @{
        id = [string]$item.id
        term = [string]$item.term
        definition = if ($item.definition) { [string]$item.definition } else { if ($item.summary) { [string]$item.summary } else { "" } }
        category = if ($item.category) { [string]$item.category } else { "기타" }
    }
}

Write-Host "=========================================================="
Write-Host "🎉 DATASETS FOR ai_models, ai_terms, sap_terms POPULATED!"
Write-Host "=========================================================="
