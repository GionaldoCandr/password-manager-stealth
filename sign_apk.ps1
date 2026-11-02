# Script Otomatis Zipalign & Apksign (Signature Scheme v2 & v3)
$buildTools = "C:\Users\Pertamina Foundation\AppData\Local\Android\Sdk\build-tools\36.0.0"
$zipalign = "$buildTools\zipalign.exe"
$apksigner = "$buildTools\apksigner.bat"
$keystore = "$PSScriptRoot\app-gui\stealth-release.jks"
$destDir = "$PSScriptRoot\app"
$targetApk = "$destDir\app.apk"
$tempApk = "$destDir\app-aligned.apk"

# Cari APK hasil build terbaru dari Gradle
$releaseDir = "$PSScriptRoot\app-gui\src-tauri\gen\android\app\build\outputs\apk\universal\release"
$latestApk = Get-ChildItem -Path $releaseDir -Filter "*.apk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latestApk) {
    Write-Error "Tidak ditemukan file APK di $releaseDir!"
    exit 1
}

Write-Host "==> Ditemukan file APK build terbaru: $($latestApk.FullName)" -ForegroundColor Cyan

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

if (Test-Path $tempApk) {
    Remove-Item $tempApk -Force
}

Write-Host "==> Menyelaraskan ZIP (Zipalign 4-byte)..." -ForegroundColor Cyan
& $zipalign -p -f 4 $latestApk.FullName $tempApk

Write-Host "==> Menandatangani APK (Signature Scheme v2 & v3)..." -ForegroundColor Cyan
& $apksigner sign --ks $keystore --ks-pass pass:admin123 --ks-key-alias stealth-vault --key-pass pass:admin123 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --v4-signing-enabled false $tempApk

Move-Item $tempApk $targetApk -Force

Write-Host "==> Verifikasi Integritas Tanda Tangan..." -ForegroundColor Green
& $apksigner verify --verbose $targetApk

Write-Host "==> APK Siap Dipasang di Android! Tersimpan di: $targetApk" -ForegroundColor Green
