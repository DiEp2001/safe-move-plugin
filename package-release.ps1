param(
    [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectName = Split-Path -Leaf $scriptDir
$manifestPath = Join-Path $scriptDir "CSXS\manifest.xml"

if (-not (Test-Path $manifestPath)) {
    throw "Khong tim thay file manifest: $manifestPath"
}

[xml]$manifest = Get-Content -Path $manifestPath
$bundleVersion = $manifest.ExtensionManifest.ExtensionBundleVersion

if ([string]::IsNullOrWhiteSpace($bundleVersion)) {
    $bundleVersion = "1.0.0"
}

function Get-NextPatchVersion([string]$versionText) {
    $parts = $versionText.Split(".")

    while ($parts.Count -lt 3) {
        $parts += "0"
    }

    $major = 0
    $minor = 0
    $patch = 0

    [void][int]::TryParse($parts[0], [ref]$major)
    [void][int]::TryParse($parts[1], [ref]$minor)
    [void][int]::TryParse($parts[2], [ref]$patch)

    $patch++
    return "$major.$minor.$patch"
}

$oldVersion = $bundleVersion
$bundleVersion = Get-NextPatchVersion $bundleVersion
$manifest.ExtensionManifest.ExtensionBundleVersion = $bundleVersion
$manifest.Save($manifestPath)

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $scriptDir "release"
}

$stagingRoot = Join-Path $OutputDir "_staging"
$stagingDir = Join-Path $stagingRoot $projectName
$packageBaseName = "SAFE-MOVE-PANEL-v" + $bundleVersion
$zipPath = Join-Path $OutputDir ($packageBaseName + ".zip")

$includeNames = @(
    "client",
    "jsx",
    "CSXS",
    "install.bat",
    "install.ps1",
    "README-INSTALL.txt"
)

Write-Host ""
Write-Host "SAFE MOVE PANEL PACKAGER" -ForegroundColor Cyan
Write-Host "Source : $scriptDir"
Write-Host "Output : $zipPath"
Write-Host "Version: $oldVersion -> $bundleVersion"
Write-Host ""

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

if (Test-Path $stagingRoot) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

foreach ($name in $includeNames) {
    $sourcePath = Join-Path $scriptDir $name
    if (-not (Test-Path $sourcePath)) {
        throw "Khong tim thay file/thu muc can dong goi: $sourcePath"
    }

    Copy-Item -LiteralPath $sourcePath -Destination $stagingDir -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $stagingRoot -Recurse -Force

Write-Host "Dong goi hoan tat." -ForegroundColor Green
Write-Host "File zip: $zipPath"
Write-Host ""
