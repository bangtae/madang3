[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$instanceName = "portal-bang-vm"
$zone = "us-central1-a"
$project = "madang2-trans"
$bucketName = "gs://madang2-trans-portal-storage"

$root = $PSScriptRoot
$projectDir = Split-Path $root -Parent
$zipPath = Join-Path $projectDir "portal_bang_deploy.zip"

Write-Host "1. Creating GCP Storage Bucket (US-CENTRAL1)..."
cmd /c "gsutil mb -p $project -c standard -l US-CENTRAL1 $bucketName"

Write-Host "2. Uploading deployment zip to GCP Cloud Storage..."
cmd /c "gsutil cp `"$zipPath`" $bucketName/portal_bang_deploy.zip"

Write-Host "3. Updating code and restarting web service inside GCP VM..."
$remoteCmd = "sudo apt-get update -y && sudo apt-get install -y unzip nodejs npm && mkdir -p /var/www/portal_bang && gsutil cp $bucketName/portal_bang_deploy.zip ~/portal_bang_deploy.zip && unzip -o ~/portal_bang_deploy.zip -d /var/www/portal_bang/ && cd /var/www/portal_bang && npm install --only=production && sudo npm install -g pm2 && pm2 restart all || pm2 start server.js --name portal-bang && pm2 save"

cmd /c "gcloud compute ssh $instanceName --zone=$zone --project=$project --tunnel-through-iap --command=`"$remoteCmd`" --quiet"

Write-Host "=========================================================="
Write-Host "🎉 GCP VM DEPLOYMENT COMPLETED!"
Write-Host "👉 Website URL: http://34.72.224.182:8080"
Write-Host "=========================================================="
