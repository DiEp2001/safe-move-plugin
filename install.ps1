param(
    [string]$TargetRoot = "$env:APPDATA\Adobe\CEP\extensions"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $scriptDir "CSXS\manifest.xml"

if (-not (Test-Path $manifestPath)) {
    throw "Khong tim thay file manifest: $manifestPath"
}

[xml]$manifest = Get-Content -Path $manifestPath
$bundleId = $manifest.ExtensionManifest.ExtensionBundleId

if ([string]::IsNullOrWhiteSpace($bundleId)) {
    throw "Khong doc duoc ExtensionBundleId tu manifest."
}

$targetDir = Join-Path $TargetRoot $bundleId
$backupRoot = Join-Path $TargetRoot "_backup"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $backupRoot ($bundleId + "-" + $timestamp)

Write-Host ""
Write-Host "SAFE MOVE PANEL INSTALLER" -ForegroundColor Cyan
Write-Host "Nguon   : $scriptDir"
Write-Host "Dich    : $targetDir"
Write-Host ""

New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null

if (Test-Path $targetDir) {
    New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
    Write-Host "Dang backup ban cu..." -ForegroundColor Yellow
    Copy-Item -Path $targetDir -Destination $backupDir -Recurse -Force
}

Write-Host "Dang xoa ban cu trong thu muc CEP..." -ForegroundColor Yellow
Remove-Item -LiteralPath $targetDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Dang copy extension moi..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$exclude = @(".git", ".gitignore")
Get-ChildItem -LiteralPath $scriptDir -Force |
    Where-Object { $exclude -notcontains $_.Name } |
    ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $targetDir -Recurse -Force
    }

$csxsVersions = 8..14
foreach ($version in $csxsVersions) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$version"
    New-Item -Path $regPath -Force | Out-Null
    New-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -PropertyType String -Force | Out-Null
}

Write-Host ""
Write-Host "Cai dat hoan tat." -ForegroundColor Green
if (Test-Path $backupDir) {
    Write-Host "Backup cu: $backupDir"
}
Write-Host "Neu Illustrator dang mo, hay tat va mo lai panel." -ForegroundColor Cyan
Write-Host ""
Read-Host "Nhan Enter de dong"
