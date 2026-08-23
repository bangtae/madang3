# Direct Data Seeder to Supabase Cloud DB using REST API

$supabaseUrl = "https://your-supabase-project.supabase.co"
$anonKey = "your-supabase-anon-key"

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"
}

$root = $PSScriptRoot
$dataDir = Join-Path (Split-Path $root -Parent) "data"

# 1. APIs Upload
$apisPath = Join-Path $dataDir "apis.json"
if (Test-Path $apisPath) {
    Write-Host "Uploading APIs to Supabase..."
    $rawApis = [System.IO.File]::ReadAllText($apisPath, [System.Text.Encoding]::UTF8)
    $parsedApis = $rawApis | ConvertFrom-Json
    
    $payloadApis = @()
    foreach ($item in $parsedApis) {
        $payloadApis += @{
            id = $item.id
            title = $item.title
            category = $item.category
            service_url = if ($item.serviceUrl) { $item.serviceUrl } else { "" }
            description = if ($item.docsUrl) { $item.docsUrl } else { "" }
        }
    }
    
    # Send in chunks of 50
    for ($i = 0; $i -lt $payloadApis.Count; $i += 50) {
        $chunk = $payloadApis[$i..[Math]::Min($i + 49, $payloadApis.Count - 1)]
        $jsonBody = $chunk | ConvertTo-Json -Depth 5
        try {
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/apis" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
            Write-Host "Uploaded APIs chunk [$i ~ $($i + $chunk.Count)]"
        } catch {
            Write-Host "Error uploading APIs: $_"
        }
    }
}

# 2. AI Models Upload
$aiModelsPath = Join-Path $dataDir "aiModels.json"
if (Test-Path $aiModelsPath) {
    Write-Host "Uploading AI Models to Supabase..."
    $rawAi = [System.IO.File]::ReadAllText($aiModelsPath, [System.Text.Encoding]::UTF8)
    $parsedAi = $rawAi | ConvertFrom-Json
    
    $payloadAi = @()
    foreach ($item in $parsedAi) {
        $payloadAi += @{
            id = $item.id
            title = $item.title
            category = $item.category
            provider = if ($item.provider) { $item.provider } else { "" }
            description = if ($item.description) { $item.description } else { "" }
            specs = if ($item.specs) { $item.specs } else { @{} }
            tags = if ($item.tags) { $item.tags } else { @() }
        }
    }

    for ($i = 0; $i -lt $payloadAi.Count; $i += 50) {
        $chunk = $payloadAi[$i..[Math]::Min($i + 49, $payloadAi.Count - 1)]
        $jsonBody = $chunk | ConvertTo-Json -Depth 5
        try {
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ai_models" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
            Write-Host "Uploaded AI Models chunk [$i ~ $($i + $chunk.Count)]"
        } catch {
            Write-Host "Error uploading AI Models: $_"
        }
    }
}

# 3. AI Terms Upload
$aiTermsPath = Join-Path $dataDir "aiTerms.json"
if (Test-Path $aiTermsPath) {
    Write-Host "Uploading AI Terms to Supabase..."
    $rawAiTerms = [System.IO.File]::ReadAllText($aiTermsPath, [System.Text.Encoding]::UTF8)
    $parsedAiTerms = $rawAiTerms | ConvertFrom-Json
    
    $payloadAiTerms = @()
    foreach ($item in $parsedAiTerms) {
        $payloadAiTerms += @{
            id = $item.id
            term = $item.term
            definition = if ($item.definition) { $item.definition } else { "" }
            category = if ($item.category) { $item.category } else { "기타" }
            tags = if ($item.tags) { $item.tags } else { @() }
        }
    }

    for ($i = 0; $i -lt $payloadAiTerms.Count; $i += 50) {
        $chunk = $payloadAiTerms[$i..[Math]::Min($i + 49, $payloadAiTerms.Count - 1)]
        $jsonBody = $chunk | ConvertTo-Json -Depth 5
        try {
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/ai_terms" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
            Write-Host "Uploaded AI Terms chunk [$i ~ $($i + $chunk.Count)]"
        } catch {
            Write-Host "Error uploading AI Terms: $_"
        }
    }
}

# 4. SAP Terms Upload
$sapTermsPath = Join-Path $dataDir "sapTerms.json"
if (Test-Path $sapTermsPath) {
    Write-Host "Uploading SAP Terms to Supabase..."
    $rawSapTerms = [System.IO.File]::ReadAllText($sapTermsPath, [System.Text.Encoding]::UTF8)
    $parsedSapTerms = $rawSapTerms | ConvertFrom-Json
    
    $payloadSapTerms = @()
    foreach ($item in $parsedSapTerms) {
        $payloadSapTerms += @{
            id = $item.id
            term = $item.term
            definition = if ($item.definition) { $item.definition } else { "" }
            category = if ($item.category) { $item.category } else { "기타" }
            tags = if ($item.tags) { $item.tags } else { @() }
        }
    }

    for ($i = 0; $i -lt $payloadSapTerms.Count; $i += 50) {
        $chunk = $payloadSapTerms[$i..[Math]::Min($i + 49, $payloadSapTerms.Count - 1)]
        $jsonBody = $chunk | ConvertTo-Json -Depth 5
        try {
            $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/sap_terms" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
            Write-Host "Uploaded SAP Terms chunk [$i ~ $($i + $chunk.Count)]"
        } catch {
            Write-Host "Error uploading SAP Terms: $_"
        }
    }
}

Write-Host "🎉 Data migration to Supabase Cloud DB finished successfully!"
