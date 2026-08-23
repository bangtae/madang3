[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$instanceName = "portal-bang-vm"
$zone = "us-central1-a"
$project = "madang2-trans"

$root = $PSScriptRoot
$projectDir = Split-Path $root -Parent
$zipPath = Join-Path $projectDir "portal_bang_deploy.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Write-Host "1. Zipping latest source files..."
# Create deployment zip excluding node_modules & git
$excludePatterns = @("*.zip", ".git*", "node_modules*")

Add-Type -AssemblyName System.IO.Compression.FileSystem
$compressionLevel = [System.IO.Compression.CompressionLevel]::Optimal

# Get files
$filesToZip = Get-ChildItem -Path $projectDir -Recurse | Where-Object {
    $rel = $_.FullName.Substring($projectDir.Length)
    $skip = $false
    foreach ($pat in $excludePatterns) {
        if ($rel -like "*$pat*") { $skip = $true; break }
    }
    -not $skip -and -not $_.PSIsContainer
}

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
foreach ($file in $filesToZip) {
    $relPath = $file.FullName.Substring($projectDir.Length + 1)
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relPath, $compressionLevel)
}
$zip.Dispose()

Write-Host "✅ Created portal_bang_deploy.zip ($([math]::Round((Get-Item $zipPath).Length/1KB, 2)) KB)"

Write-Host "2. Uploading zip file to GCP VM ($instanceName)..."
$scpCmd = "gcloud compute scp portal_bang_deploy.zip ${instanceName}:~/portal_bang_deploy.zip --zone=$zone --project=$project --quiet"
cmd /c $scpCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Zip file uploaded to VM!"
    Write-Host "3. Unzipping and updating web service in VM..."
    
    $remoteScript = "sudo apt-get update -y && sudo apt-get install -y unzip nodejs npm && mkdir -p /var/www/portal_bang && unzip -o ~/portal_bang_deploy.zip -d /var/www/portal_bang/ && cd /var/www/portal_bang && npm install --only=production && sudo npm install -g pm2 && pm2 restart all || pm2 start server.js --name portal-bang && pm2 save"
    
    $sshCmd = "gcloud compute ssh $instanceName --zone=$zone --project=$project --command=`"$remoteScript`" --quiet"
    cmd /c $sshCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "=========================================================="
        Write-Host "🎉 DEPLOYMENT COMPLETED SUCCESSFUL!"
        Write-Host "👉 External URL: http://34.72.224.182:8080 or http://34.72.224.182"
        Write-Host "=========================================================="
    }
}
