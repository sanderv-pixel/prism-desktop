# Prism Overlay - one-line installer for Windows.
#
#   irm https://goprism.dev/install.ps1 | iex
#
# No admin, no .NET install needed (the .exe is self-contained).
$ErrorActionPreference = 'Stop'

$dest = Join-Path $env:LOCALAPPDATA 'Prism'
$exe  = Join-Path $dest 'PrismOverlay.exe'
$url  = if ($env:PRISM_EXE_URL) { $env:PRISM_EXE_URL } else { 'https://goprism.dev/download/PrismOverlay.exe' }

Write-Host '-> Downloading Prism...'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Get-Process PrismOverlay -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
Invoke-WebRequest -Uri $url -OutFile $exe
# Clear the "downloaded from the internet" mark so SmartScreen doesn't nag.
Unblock-File -Path $exe

# Launch at login.
$run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
New-ItemProperty -Path $run -Name 'PrismOverlay' -Value "`"$exe`"" -PropertyType String -Force | Out-Null

# Link this device to your account. The dashboard's personalized command sets
# $env:PRISM_LINK_TOKEN; exchange it for an account-bound key and write it to the
# registry the overlay reads (HKCU\Software\Prism\Overlay\ApiKey) BEFORE first launch,
# so earnings credit your account from impression #1. Without a token it self-registers.
$apiBase = if ($env:PRISM_API_URL) { $env:PRISM_API_URL.TrimEnd('/') } else { 'https://goprism.dev' }
if ($env:PRISM_LINK_TOKEN) {
  Write-Host '-> Linking this device to your Prism account...'
  try {
    $body = @{ token = $env:PRISM_LINK_TOKEN } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Method Post -Uri "$apiBase/api/auth/link/exchange" -ContentType 'application/json' -Body $body
    if ($resp.apiKey) {
      New-Item -Path 'HKCU:\Software\Prism\Overlay' -Force | Out-Null
      Set-ItemProperty -Path 'HKCU:\Software\Prism\Overlay' -Name 'ApiKey' -Value $resp.apiKey
      Write-Host '   Linked - your earnings will credit this account automatically.'
    } else {
      Write-Host '   Could not link (token expired or already used); it will run unlinked.'
    }
  } catch {
    Write-Host '   Could not link (token expired or already used); it will run unlinked.'
  }
}

Write-Host '-> Launching Prism...'
Start-Process $exe

Write-Host ''
Write-Host 'Prism is running in your system tray (look for its icon).'
Write-Host 'If you installed from your dashboard, this device is already linked.'
Write-Host 'Otherwise, use "Connect account" to link it to your Prism account.'
Write-Host 'Uninstall any time:  irm https://goprism.dev/uninstall.ps1 | iex'
