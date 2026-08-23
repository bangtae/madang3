[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$instanceName = "portal-bang-vm"
$zone = "us-central1-a"
$project = "madang2-trans"

$root = $PSScriptRoot
$projectDir = Split-Path $root -Parent
$zipPath = Join-Path $projectDir "portal_bang_deploy.zip"

if (-not (Test-Path $zipPath)) {
    Write-Host "Creating zip file..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($projectDir, $zipPath)
}

Write-Host "1. Uploading via GCP IAP Tunneling..."
$scpCmd = "gcloud compute scp portal_bang_deploy.zip ${instanceName}:~/portal_bang_deploy.zip --zone=$zone --project=$project --tunnel-through-iap --quiet"
cmd /c $scpCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Zip file uploaded via IAP!"
    
    $remoteScript = "sudo apt-get update -y && sudo apt-get install -y unzip nodejs npm && mkdir -p /var/www/portal_bang && unzip -o ~/portal_bang_deploy.zip -d /var/www/portal_bang/ && cd /var/www/portal_bang && npm install --only=production && sudo npm install -g pm2 && pm2 restart all || pm2 start server.js --name portal-bang && pm2 save"
    
    $sshCmd = "gcloud compute ssh $instanceName --zone=$zone --project=$project --tunnel-through-iap --command=`"$remoteScript`" --quiet"
    cmd /c $sshCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "=========================================================="
        Write-Host "🎉 DEPLOYMENT TO GCP VM SUCCESSFUL!"
        Write-Host "👉 VM IP: http://34.72.224.182:8080 (or http://34.72.224.182)"
        Write-Host "=========================================================="
    }
} else {
    Write-Host "SCP IAP failed. Trying Cloud Storage method..."
    $bucketName = "gs://madang2-trans-portal-deploy"
    cmd /c "gsutil mb -p $project -l $zone $bucketName"
    cmd /c "gsutil cp portal_bang_deploy.zip $bucketName/portal_bang_deploy.zip"
    
    $remoteGsScript = "sudo apt-get update -y && sudo apt-get install -y unzip nodejs npm && mkdir -p /var/www/portal_bang && gsutil cp $bucketName/portal_bang_deploy.zip ~/portal_bang_deploy.zip && unzip -o ~/portal_bang_deploy.zip -d /var/www/portal_bang/ && cd /var/www/portal_bang && npm install --only=production && sudo npm install -g pm2 && pm2 restart all || pm2 start server.js --name portal-bang && pm2 save"
    
    cmd /c "gcloud compute ssh $instanceName --zone=$zone --project=$project --tunnel-through-iap --command=`"$remoteGsScript`" --quiet"
}
