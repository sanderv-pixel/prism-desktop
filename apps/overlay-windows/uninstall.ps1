# Prism Overlay — uninstaller.
#   irm https://goprism.dev/uninstall.ps1 | iex
$ErrorActionPreference = 'SilentlyContinue'

Write-Host '-> Quitting Prism...'
Get-Process PrismOverlay | Stop-Process -Force
Start-Sleep -Milliseconds 500

Write-Host '-> Removing launch-at-login + files + settings...'
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'PrismOverlay'
Remove-Item -Recurse -Force (Join-Path $env:LOCALAPPDATA 'Prism')
Remove-Item -Recurse -Force 'HKCU:\Software\Prism'

Write-Host 'Prism removed.'
