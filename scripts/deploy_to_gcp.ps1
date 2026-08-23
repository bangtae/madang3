[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$project = "madang2-trans"
$region = "asia-northeast3"

Write-Host "=========================================================="
Write-Host "🚀 Deploying PORTAL BANG to GCP (Project: $project)"
Write-Host "=========================================================="

# Try App Engine Deploy first
Write-Host "[1/2] Attempting GCP App Engine Deployment..."
$appDeployCmd = "gcloud app deploy app.yaml --project=$project --quiet"
$deployRes = cmd /c $appDeployCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ App Engine Deploy Successful!"
    cmd /c "gcloud app browse --project=$project"
    exit 0
}

Write-Host "App Engine deploy output: $deployRes"
Write-Host "[2/2] Attempting GCP Cloud Run Source Deployment..."
$cloudRunCmd = "gcloud run deploy portal-bang --source . --region=$region --project=$project --allow-unauthenticated --quiet"
cmd /c $cloudRunCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cloud Run Deploy Successful!"
} else {
    Write-Host "❌ Deployment failed. Check GCP credentials or API permissions."
}
