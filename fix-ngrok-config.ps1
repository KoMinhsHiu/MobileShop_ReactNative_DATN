# Script để fix lỗi ngrok config
# Chạy script này: .\fix-ngrok-config.ps1

Write-Host "=== Fix Ngrok Config ===" -ForegroundColor Green

# Tìm file config ngrok
$configPaths = @(
    "$env:LOCALAPPDATA\ngrok\ngrok.yml",
    "$env:USERPROFILE\.ngrok2\ngrok.yml",
    "$env:USERPROFILE\.config\ngrok\ngrok.yml"
)

$configFile = $null
foreach ($path in $configPaths) {
    if (Test-Path $path) {
        $configFile = $path
        Write-Host "Found config file: $path" -ForegroundColor Yellow
        break
    }
}

if ($configFile) {
    Write-Host "`nCurrent config file content:" -ForegroundColor Cyan
    Get-Content $configFile
    
    Write-Host "`nDo you want to:" -ForegroundColor Yellow
    Write-Host "1. Fix update_channel property"
    Write-Host "2. Delete and recreate config file"
    Write-Host "3. Just view the file"
    
    $choice = Read-Host "Enter choice (1/2/3)"
    
    if ($choice -eq "1") {
        # Fix update_channel
        $content = Get-Content $configFile -Raw
        $content = $content -replace "update_channel:\s*''", "update_channel: stable"
        $content = $content -replace "update_channel:\s*$", "update_channel: stable"
        Set-Content -Path $configFile -Value $content -NoNewline
        Write-Host "Fixed update_channel property" -ForegroundColor Green
    }
    elseif ($choice -eq "2") {
        # Delete and recreate
        Remove-Item $configFile -Force
        Write-Host "Deleted config file. Please run: ngrok config add-authtoken YOUR_AUTHTOKEN" -ForegroundColor Yellow
    }
    else {
        Write-Host "Config file location: $configFile" -ForegroundColor Cyan
    }
} else {
    Write-Host "Config file not found. Creating new one..." -ForegroundColor Yellow
    
    # Create directory if not exists
    $configDir = "$env:LOCALAPPDATA\ngrok"
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Force -Path $configDir | Out-Null
        Write-Host "Created directory: $configDir" -ForegroundColor Green
    }
    
    Write-Host "`nPlease run the following command to add your authtoken:" -ForegroundColor Yellow
    Write-Host "ngrok config add-authtoken YOUR_AUTHTOKEN" -ForegroundColor Cyan
    Write-Host "`nGet your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
}

Write-Host "`n=== Done ===" -ForegroundColor Green





