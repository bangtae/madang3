# scripts/translate_sap_news.ps1 - Batch Translate SAP Integration Suite News to Korean
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

Add-Type -AssemblyName System.Web

$madang3Dir = "c:\Users\bangt\Downloads\madang3"
$localNewsFile = Join-Path $madang3Dir "data\sapNews.json"
$localJsFile = Join-Path $madang3Dir "data\initialSapNews.js"
$agentDataNewsFile = "C:\Users\bangt\Downloads\madang6\sap-integration-agent\data\sapNews.json"

$supabaseUrl = "https://vouwdahhvvfxlcpyywij.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdXdkYWhodnZmeGxjcHl5d2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzM4NDEsImV4cCI6MjEwMjgwOTg0MX0.L4Jh3gNS3p21S3skGnP_r2ID6cuaQuuIPNoFSy-IETw"

function Translate-ToKorean([string]$text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return $text }
    
    $koreanChars = [regex]::Matches($text, '[\uac00-\ud7a3]').Count
    $alphaChars = [regex]::Matches($text, '[a-zA-Z]').Count
    if ($koreanChars -gt 15 -and $koreanChars -gt $alphaChars) {
        return $text
    }

    $retries = 3
    for ($i = 0; $i -lt $retries; $i++) {
        try {
            $encoded = [System.Uri]::EscapeDataString($text)
            $url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=$encoded"
            $resp = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 15 -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            if ($resp -and $resp[0]) {
                $translated = ($resp[0] | ForEach-Object { $_[0] }) -join ""
                if ($translated) {
                    $translated = [System.Web.HttpUtility]::HtmlDecode($translated)
                    return $translated.Trim()
                }
            }
        }
        catch {
            Start-Sleep -Milliseconds 400
        }
    }
    return $text
}

if (-not (Test-Path $localNewsFile)) {
    Write-Error "sapNews.json not found: $localNewsFile"
    exit 1
}

$rawJson = [System.IO.File]::ReadAllText($localNewsFile, [System.Text.Encoding]::UTF8)
$items = $rawJson | ConvertFrom-Json

Write-Host "Total items to process: $($items.Count)"
$count = 0
$updatedCount = 0

foreach ($item in $items) {
    $count++
    $oldTitle = $item.title
    $oldSummary = $item.summary

    $translatedTitle = Translate-ToKorean $item.title
    $translatedSummary = Translate-ToKorean $item.summary

    if ($translatedTitle -ne $oldTitle -or $translatedSummary -ne $oldSummary) {
        $item.title = $translatedTitle
        $item.summary = $translatedSummary
        $updatedCount++
    }

    if ($count % 10 -eq 0 -or $count -eq $items.Count) {
        $dispTitle = if ($item.title.Length -gt 35) { $item.title.Substring(0, 35) + "..." } else { $item.title }
        Write-Host "[$count / $($items.Count)] Translated: $dispTitle"
    }

    Start-Sleep -Milliseconds 60
}

Write-Host "`nTranslation complete! Total updated: $updatedCount / $($items.Count)"

# 1. Save to madang3 data files
$jsonOut = $items | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($localNewsFile, $jsonOut, $utf8NoBom)
Write-Host "Saved to $localNewsFile"

$jsContent = "// data/initialSapNews.js - Auto-updated by SAP Agent`nwindow.PORTAL_DATA_SAP_NEWS = $jsonOut;`n"
[System.IO.File]::WriteAllText($localJsFile, $jsContent, $utf8NoBom)
Write-Host "Saved to $localJsFile"

# 2. Sync to agent data file if exists
if (Test-Path (Split-Path $agentDataNewsFile -Parent)) {
    [System.IO.File]::WriteAllText($agentDataNewsFile, $jsonOut, $utf8NoBom)
    Write-Host "Saved to $agentDataNewsFile"
}

# 3. Sync to Supabase in batches of 40
if ($supabaseUrl -and $anonKey) {
    Write-Host "Syncing translated items to Supabase sap_news table..."
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json; charset=utf-8"
        "Prefer" = "resolution=merge-duplicates"
    }

    $batchSize = 40
    for ($b = 0; $b -lt $items.Count; $b += $batchSize) {
        $endIdx = [Math]::Min($b + $batchSize - 1, $items.Count - 1)
        $batch = $items[$b..$endIdx]
        try {
            $batchJson = $batch | ConvertTo-Json -Depth 4 -Compress
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($batchJson)
            $null = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/sap_news" -Method Post -Headers $headers -Body $bodyBytes -TimeoutSec 15
            Write-Host " -> Synced batch [$b - $endIdx] to Supabase."
        } catch {
            Write-Warning "Supabase sync error on batch [$b - $endIdx]: $($_.Exception.Message)"
        }
    }
    Write-Host "Supabase synchronization finished."
}

Write-Host "All tasks completed successfully!"
