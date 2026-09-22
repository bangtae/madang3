# scripts/sync_chrome_bookmarks.ps1 - 크롬 북마크 원클릭 추출 및 GCP Cloud Run 동기화 스크립트
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " ⭐ 마당 포털 - 크롬 북마크 최신 동기화 프로그램" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan

$chromePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Bookmarks"
if (-not (Test-Path $chromePath)) {
    Write-Host "❌ 크롬 북마크 파일을 찾을 수 없습니다: $chromePath" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/3] 로컬 Chrome 북마크 파싱 중..." -ForegroundColor Yellow
$raw = [System.IO.File]::ReadAllText($chromePath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$dataDir = Join-Path (Split-Path -Parent $PSScriptRoot) "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }

$allBookmarks = [System.Collections.ArrayList]@()
$bIdCounter = 1

function Get-Domain([string]$url) {
    if (-not $url) { return "" }
    try {
        $uri = [System.Uri]$url
        return $uri.Host.ToLower()
    } catch {
        return ""
    }
}

function Classify-Bookmark([string]$folderPath, [string]$title, [string]$domain) {
    $f = if ($folderPath) { $folderPath.ToLower() } else { '' }
    $t = if ($title) { $title.ToLower() } else { '' }
    $d = if ($domain) { $domain.ToLower() } else { '' }
    $all = "$f $t $d"

    if ($f -match 'ai서비스|인공지능' -or $all -match 'chatgpt|openai|claude|gemini|anthropic|huggingface|midjourney|generative|perplexity|sora') {
        return @{ id = 'ai'; name = '🤖 AI & 신기술' }
    }
    if ($f -match '디벨러퍼|개발' -or $all -match 'github|gitlab|stackoverflow|docker|kubernetes|developer|npm|pypi|w3schools|mdn|spring|abap|vscode|console|aws|gcp|azure') {
        return @{ id = 'dev'; name = '💻 개발 & IT 기술' }
    }
    if ($f -match '크립토|가상화폐|비트코인' -or $all -match 'crypto|coin|upbit|bithumb|binance|metamask|token|defi|blockchain') {
        return @{ id = 'crypto'; name = '🪙 가상화폐' }
    }
    if ($f -match '릴 에스테이트|부동산|아파트|청약' -or $all -match 'hogangnono|asil|부동산|realty|apt|land|zigbang|dabang|applyhome') {
        return @{ id = 'realestate'; name = '🏢 부동산 & 청약' }
    }
    if ($f -match '스탁|투자|애낼리시스|파이낸스' -or $all -match 'stock|증권|dart|krx|etf|invest|kospi|kosdaq|finance|sec\.gov|fnguide|seekingalpha') {
        return @{ id = 'stock'; name = '📈 주식 & 투자' }
    }
    if ($f -match '레이버|노동|노무' -or $all -match 'notion|slack|jira|trello|confluence|asana|productivity|monday|workplace') {
        return @{ id = 'work'; name = '💼 업무 & 생산성' }
    }
    if ($f -match '콘텐츠|마케팅|디자인' -or $all -match 'design|figma|canva|marketing|advertising|adobe|behance|dribbble|unsplash|youtube') {
        return @{ id = 'contents'; name = '🎨 콘텐츠 & 마케팅' }
    }
    if ($f -match '샤핑|쇼핑|유용한생활' -or $all -match 'shopping|coupang|11st|gmarket|naver\.com\/shopping|smartstore|aliexpress|amazon') {
        return @{ id = 'life'; name = '🛒 쇼핑 & 생활 편의' }
    }
    if ($f -match '스터디|공부|강의|교육' -or $all -match 'study|inflearn|udemy|coursera|fastcampus|class101|edx|nomadcoders') {
        return @{ id = 'study'; name = '📚 교육 & 스터디' }
    }
    if ($f -match '인포|인사이트|미디어|뉴스' -or $all -match 'news|media|insight|brunch|medium|naver\.com\/news|daum\.net|hankyung|mk\.co') {
        return @{ id = 'news'; name = '📰 뉴스 & 인사이트' }
    }

    return @{ id = 'etc'; name = '📁 기타 & 유틸리티' }
}

function Traverse-Node($node, $currentPath) {
    $fName = $node.name
    $isRootContainer = ($fName -eq "북마크바" -or $fName -eq "북마크" -or $fName -eq "기타 북마크" -or $fName -eq "모바일 북마크")
    $newPath = if ($isRootContainer) {
        $currentPath
    } else {
        if ($currentPath) { "$currentPath > $fName" } else { $fName }
    }

    if ($node.children) {
        foreach ($child in $node.children) {
            if ($child.type -eq "url") {
                $finalFolder = if ($newPath) { $newPath } else { "기본 북마크" }
                $domain = Get-Domain $child.url
                $title = if ($child.name) { $child.name } else { $domain }
                $cat = Classify-Bookmark $finalFolder $title $domain
                $bm = [ordered]@{
                    id           = "bm_$($script:bIdCounter)"
                    title        = $title
                    url          = $child.url
                    domain       = $domain
                    category     = $cat.id
                    categoryName = $cat.name
                    folderPath   = $finalFolder
                    dateAdded    = $child.date_added
                }
                $script:bIdCounter++
                [void]$allBookmarks.Add($bm)
            } elseif ($child.type -eq "folder") {
                Traverse-Node $child $newPath
            }
        }
    }
}

if ($raw.roots.bookmark_bar) { Traverse-Node $raw.roots.bookmark_bar "" }
if ($raw.roots.other) { Traverse-Node $raw.roots.other "" }
if ($raw.roots.synced) { Traverse-Node $raw.roots.synced "" }

# 폴더 계층 트리 빌드
$treeRoot = [ordered]@{
    name     = "전체 북마크"
    path     = "전체"
    count    = $allBookmarks.Count
    children = [ordered]@{}
}

foreach ($bm in $allBookmarks) {
    $parts = $bm.folderPath -split "\s*>\s*"
    $curr = $treeRoot
    $runningPath = ""

    foreach ($p in $parts) {
        $p = $p.Trim()
        if (-not $p) { continue }
        $runningPath = if ($runningPath) { "$runningPath > $p" } else { $p }

        if (-not $curr.children.Contains($p)) {
            $curr.children[$p] = [ordered]@{
                name     = $p
                path     = $runningPath
                count    = 0
                children = [ordered]@{}
            }
        }
        $curr = $curr.children[$p]
        $curr.count++
    }
}

function Convert-TreeToArray($node) {
    $subList = [System.Collections.ArrayList]@()
    foreach ($k in $node.children.Keys) {
        $childNode = $node.children[$k]
        $subList.Add([ordered]@{
            name     = $childNode.name
            path     = $childNode.path
            count    = $childNode.count
            children = Convert-TreeToArray $childNode
        }) | Out-Null
    }
    return $subList
}

$finalTree = [ordered]@{
    name     = "전체 북마크"
    path     = "전체"
    count    = $allBookmarks.Count
    children = Convert-TreeToArray $treeRoot
}

$exportPayload = [ordered]@{
    totalCount = $allBookmarks.Count
    updatedAt  = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    tree       = $finalTree
    bookmarks  = $allBookmarks
}

Write-Host "[2/3] 로컬 프로젝트 파일 갱신 중..." -ForegroundColor Yellow
$jsonPath = Join-Path $dataDir "chromeBookmarks.json"
$jsPath = Join-Path $dataDir "initialBookmarks.js"

$jsonText = $exportPayload | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($jsonPath, $jsonText, [System.Text.Encoding]::UTF8)

$jsText = "// data/initialBookmarks.js - Extracted Chrome Bookmarks`nwindow.PORTAL_DATA_BOOKMARKS = $jsonText;`n"
[System.IO.File]::WriteAllText($jsPath, $jsText, [System.Text.Encoding]::UTF8)

Write-Host "      로컬 북마크 $($allBookmarks.Count)개 저장 완료." -ForegroundColor Green

Write-Host "[3/3] GCP Cloud Run 원격 서버로 동기화 전송 중..." -ForegroundColor Yellow
$gcpUrl = "https://madang3-264643074286.asia-northeast3.run.app/api/bookmarks/sync"
try {
    $postBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonText)
    $resp = Invoke-RestMethod -Uri $gcpUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $postBytes -TimeoutSec 30
    if ($resp.success) {
        Write-Host "===========================================================" -ForegroundColor Green
        Write-Host " ✨ GCP Cloud Run 동기화 성공!" -ForegroundColor Green
        Write-Host "    - 동기화 건수: $($resp.count)개" -ForegroundColor White
        Write-Host "    - 동기화 시각: $($resp.updatedAt)" -ForegroundColor White
        Write-Host "    - 사이트 주소: https://madang3-264643074286.asia-northeast3.run.app" -ForegroundColor Cyan
        Write-Host "===========================================================" -ForegroundColor Green
    } else {
        Write-Host "⚠️ GCP 응답: $($resp.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ GCP Cloud Run 전송 실패 (서버 배포 상태 확인 필요): $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "동기화가 완료되었습니다. 창을 닫으려면 아무 키나 누르세요..." -ForegroundColor Gray
