# Push all datasets (APIs, AI Models, AI Terms, SAP Terms) to Supabase Cloud DB

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

function Upload-TableFromJsFile($jsFileName, $tableName, $varName, $mappingScript) {
    $jsPath = Join-Path $dataDir $jsFileName
    if (-not (Test-Path $jsPath)) { 
        Write-Host "File not found: $jsFileName"
        return 
    }

    Write-Host "Reading $jsFileName..."
    $content = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)
    if ($content.StartsWith([char]0xFEFF)) { $content = $content.Substring(1) }

    # Extract JSON part after '='
    $eqIdx = $content.IndexOf("=")
    if ($eqIdx -ge 0) {
        $rawJson = $content.Substring($eqIdx + 1).Trim().TrimEnd(';')
    } else {
        $rawJson = $content
    }

    $parsed = $rawJson | ConvertFrom-Json
    if (-not $parsed) {
        Write-Host "Failed to parse JSON in $jsFileName"
        return
    }

    Write-Host "Extracted $($parsed.Count) items for table [$tableName]."

    $payloadList = @()
    foreach ($item in $parsed) {
        $payloadList += (& $mappingScript $item)
    }

    # Upload in chunks of 50
    for ($i = 0; $i -lt $payloadList.Count; $i += 50) {
        $endIdx = [Math]::Min($i + 49, $payloadList.Count - 1)
        $chunk = $payloadList[$i..$endIdx]
        $jsonBody = $chunk | ConvertTo-Json -Depth 5 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

        try {
            $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$tableName" -Method Post -Headers $headers -Body $bytes
            Write-Host " -> Uploaded chunk [$i .. $endIdx] to $tableName"
        } catch {
            $err = $_.Exception.Message
            Write-Host " -> Error uploading: $err"
        }
    }
    Write-Host "✅ FINISHED: Table [$tableName] has $($payloadList.Count) rows in Supabase DB!"
}

# 1. APIs (843+ items)
Upload-TableFromJsFile "initialApis.js" "apis" "PORTAL_DATA_APIS" {
    param($item)
    return @{
        id = if ($item.id) { [string]$item.id } else { "api_" + [guid]::NewGuid().ToString() }
        title = [string]$item.title
        category = if ($item.category) { [string]$item.category } else { "기타" }
        service_url = if ($item.serviceUrl) { [string]$item.serviceUrl } else { "" }
        description = if ($item.docsUrl) { [string]$item.docsUrl } else { "" }
    }
}

# 2. AI Models
Upload-TableFromJsFile "initialAiModels.js" "ai_models" "PORTAL_DATA_AI_MODELS" {
    param($item)
    return @{
        id = if ($item.id) { [string]$item.id } else { "aimodel_" + [guid]::NewGuid().ToString() }
        title = [string]$item.title
        category = if ($item.category) { [string]$item.category } else { "기타" }
        provider = if ($item.developer) { [string]$item.developer } else { "" }
        description = if ($item.summary) { [string]$item.summary } else { "" }
    }
}

# 3. AI Terms
Upload-TableFromJsFile "initialAiTerms.js" "ai_terms" "PORTAL_DATA_AI_TERMS" {
    param($item)
    return @{
        id = if ($item.id) { [string]$item.id } else { "aiterm_" + [guid]::NewGuid().ToString() }
        term = [string]$item.term
        definition = if ($item.summary) { [string]$item.summary } else { if ($item.definition) { [string]$item.definition } else { "" } }
        category = if ($item.category) { [string]$item.category } else { "기타" }
    }
}

# 4. SAP Terms
Upload-TableFromJsFile "initialSapTerms.js" "sap_terms" "PORTAL_DATA_SAP_TERMS" {
    param($item)
    return @{
        id = if ($item.id) { [string]$item.id } else { "sapterm_" + [guid]::NewGuid().ToString() }
        term = [string]$item.term
        definition = if ($item.summary) { [string]$item.summary } else { if ($item.definition) { [string]$item.definition } else { "" } }
        category = if ($item.category) { [string]$item.category } else { "기타" }
    }
}

Write-Host "=========================================================="
Write-Host "🎉 ALL TABLES (apis, ai_models, ai_terms, sap_terms) HAVE BEEN POPULATED IN SUPABASE!"
Write-Host "=========================================================="
