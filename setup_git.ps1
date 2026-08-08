# Automated Portable Git Setup & Repository Initializer via GitHub API
$targetDir = "$env:LOCALAPPDATA\Programs\MinGit"
$zipFile = "$env:TEMP\mingit.zip"
$gitExe = "$targetDir\cmd\git.exe"

if (-not (Test-Path $gitExe)) {
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Write-Host "Fetching latest MinGit download URL from GitHub..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/git-for-windows/git/releases/latest" -UserAgent "PowerShell"
    $asset = $releases.assets | Where-Object { $_.name -like "MinGit-*-64-bit.zip" } | Select-Object -First 1
    if ($null -eq $asset) {
        Write-Error "Could not find MinGit asset"
        exit 1
    }
    Write-Host "Downloading $($asset.name)..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipFile
    Write-Host "Extracting Git components..."
    Expand-Archive -Path $zipFile -DestinationPath $targetDir -Force
    Remove-Item $zipFile -ErrorAction SilentlyContinue
}

Write-Host "Git Binary ready at: $gitExe"

Set-Location "C:\Users\bangt\Downloads\portal_bang"

Write-Host "Initializing Git Repository..."
& "$gitExe" init
& "$gitExe" config user.name "Vibe Developer"
& "$gitExe" config user.email "vibe@developer.local"

Write-Host "Staging files for commit..."
& "$gitExe" add .

Write-Host "Creating initial commit..."
& "$gitExe" commit -m "feat: API Portal Web App completed (Responsive Web & Central Sync Server)"

Write-Host "SUCCESS: Git Initialization & Commit Completed!"
