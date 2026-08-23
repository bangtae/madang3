$root = $PSScriptRoot
$projectRoot = Split-Path $root -Parent

$files = @(
    "app\models\aiModel.js",
    "app\models\apiModel.js",
    "app\models\aiTermModel.js",
    "app\models\sapTermModel.js",
    "app\views\uiView.js",
    "app\controllers\appController.js",
    "app\main.js"
)

foreach ($f in $files) {
    $fullPath = Join-Path $projectRoot $f
    $content = Get-Content $fullPath -Raw -Encoding UTF8
    
    # Simple brace balance check
    $openBraces = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
    $closeBraces = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count

    Write-Host "File [$f]: OpenBraces=$openBraces, CloseBraces=$closeBraces"
    if ($openBraces -ne $closeBraces) {
        Write-Host " ❌ MISMATCH IN $f !"
    } else {
        Write-Host " ✅ Syntax Balanced: $f"
    }
}
