# Robust Supabase Data Inserter
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

function Load-JsonFile($filePath) {
    $raw = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
    if ($raw.StartsWith([char]0xFEFF)) {
        $raw = $raw.Substring(1)
    }
    return ConvertFrom-Json -InputObject $raw
}

# 1. APIs Upload
$apisPath = Join-Path $dataDir "apis.json"
if (Test-Path $apisPath) {
    Write-Host "[1/4] Uploading APIs..."
    $apis = Load-JsonFile $apisPath
    $payload = @()
    foreach ($item in $apis) {
        $payload += [PSCustomObject]@{
            id = [string]$item.id
            title = [string]$item.title
            category = if ($item.category) { [string]$item.category } else { "기타" }
            service_url = if ($item.serviceUrl) { [string]$item.serviceUrl } else { "" }
            description = if ($item.docsUrl) { [string]$item.docsUrl } else { "" }
        }
    }
    
    # 20개 단위 분할 전송
    for ($i = 0; $i -lt $payload.Count; $i += 20) {
        $chunk = $payload[$i..[Math]::Min($i + 19, $payload.Count - 1)]
        $json = $chunk | ConvertTo-Json -Depth 5 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        try {
            $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/apis" -Method Post -Headers $headers -Body $bytes
        } catch {
            Write-Host "API chunk error: $_"
        }
    }
    Write-Host "✅ APIs Uploaded: $($payload.Count) items"
}

# 2. AI Models Upload
$aiModelsPath = Join-Path $dataDir "aiModels.json"
if (Test-Path $aiModelsPath) {
    Write-Host "[2/4] Uploading AI Models..."
    $aiModels = Load-JsonFile $aiModelsPath
    $payload = @()
    foreach ($item in $aiModels) {
        $payload += [PSCustomObject]@{
            id = [string]$item.id
            title = [string]$item.title
            category = if ($item.category) { [string]$item.category } else { "기타" }
            provider = if ($item.provider) { [string]$item.provider } else { "" }
            description = if ($item.description) { [string]$item.description } else { "" }
        }
    }
    
    for ($i = 0; $i -lt $payload.Count; $i += 20) {
        $chunk = $payload[$i..[Math]::Min($i + 19, $payload.Count - 1)]
        $json = $chunk | ConvertTo-Json -Depth 5 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        try {
            $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ai_models" -Method Post -Headers $headers -Body $bytes
        } catch {
            Write-Host "AI Model chunk error: $_"
        }
    }
    Write-Host "✅ AI Models Uploaded: $($payload.Count) items"
}

# 3. AI Terms Upload
$aiTermsPath = Join-Path $dataDir "aiTerms.json"
if (Test-Path $aiTermsPath) {
    Write-Host "[3/4] Uploading AI Terms..."
    $aiTerms = Load-JsonFile $aiTermsPath
    $payload = @()
    foreach ($item in $aiTerms) {
        $payload += [PSCustomObject]@{
            id = [string]$item.id
            term = [string]$item.term
            definition = if ($item.definition) { [string]$item.definition } else { "" }
            category = if ($item.category) { [string]$item.category } else { "기타" }
        }
    }
    
    for ($i = 0; $i -lt $payload.Count; $i += 20) {
        $chunk = $payload[$i..[Math]::Min($i + 19, $payload.Count - 1)]
        $json = $chunk | ConvertTo-Json -Depth 5 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        try {
            $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ai_terms" -Method Post -Headers $headers -Body $bytes
        } catch {
            Write-Host "AI Term chunk error: $_"
        }
    }
    Write-Host "✅ AI Terms Uploaded: $($payload.Count) items"
}

# 4. SAP Terms Upload
$sapTermsPath = Join-Path $dataDir "sapTerms.json"
if (Test-Path $sapTermsPath) {
    Write-Host "[4/4] Uploading SAP Terms..."
    $sapTerms = Load-JsonFile $sapTermsPath
    $payload = @()
    foreach ($item in $sapTerms) {
        $payload += [PSCustomObject]@{
            id = [string]$item.id
            term = [string]$item.term
            definition = if ($item.definition) { [string]$item.definition } else { "" }
            category = if ($item.category) { [string]$item.category } else { "기타" }
        }
    }
    
    for ($i = 0; $i -lt $payload.Count; $i += 20) {
        $chunk = $payload[$i..[Math]::Min($i + 19, $payload.Count - 1)]
        $json = $chunk | ConvertTo-Json -Depth 5 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        try {
            $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/sap_terms" -Method Post -Headers $headers -Body $bytes
        } catch {
            Write-Host "SAP Term chunk error: $_"
        }
    }
    Write-Host "✅ SAP Terms Uploaded: $($payload.Count) items"
}

Write-Host "🎉 ALL DATA SUCCESSFULLY MIGRATED TO SUPABASE!"
