# Prism Overlay — one-line installer for Windows.
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

Write-Host '-> Launching Prism...'
Start-Process $exe

Write-Host ''
Write-Host 'Prism is running in your system tray (look for its icon).'
Write-Host 'Use "Connect account" to link your account for live ads + earnings.'
Write-Host 'Uninstall any time:  irm https://goprism.dev/uninstall.ps1 | iex'
