# scripts/extract_chrome_bookmarks.ps1 - 크롬 북마크 추출 및 포털 데이터 생성기
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$chromePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Bookmarks"
if (-not (Test-Path $chromePath)) {
    Write-Error "Chrome Bookmarks file not found at: $chromePath"
    exit 1
}

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
                $bm = [ordered]@{
                    id         = "bm_$($script:bIdCounter)"
                    title      = if ($child.name) { $child.name } else { $domain }
                    url        = $child.url
                    domain     = $domain
                    folderPath = $finalFolder
                    dateAdded  = $child.date_added
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

# 재귀적으로 트리를 array 형태로 변환 (항상 Array 보장)
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

$jsonPath = Join-Path $dataDir "chromeBookmarks.json"
$jsPath = Join-Path $dataDir "initialBookmarks.js"

$jsonText = $exportPayload | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($jsonPath, $jsonText, [System.Text.Encoding]::UTF8)

$jsText = "// data/initialBookmarks.js - Extracted Chrome Bookmarks`nwindow.PORTAL_DATA_BOOKMARKS = $jsonText;`n"
[System.IO.File]::WriteAllText($jsPath, $jsText, [System.Text.Encoding]::UTF8)

Write-Host "✅ Chrome Bookmarks Extracted Cleanly!"
Write-Host "   Total Bookmarks: $($allBookmarks.Count)"
Write-Host "   Top Folders Count: $($finalTree.children.Count)"
foreach ($tf in $finalTree.children) {
    Write-Host "    - $($tf.name) ($($tf.count) items)"
}
