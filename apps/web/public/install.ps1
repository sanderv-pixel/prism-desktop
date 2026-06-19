# Prism extension installer for Windows
# Usage:
#   irm https://goprism.dev/install.ps1 | iex
#   & ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Cursor
#   & ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Code

$ErrorActionPreference = 'Stop'

param(
    [switch]$Cursor,
    [switch]$Code
)

$DownloadUrl = 'https://goprism.dev/prism-extension.vsix'
$TempPath = Join-Path $env:TEMP 'prism-extension.vsix'

function Resolve-EditorCli {
    param(
        [Parameter(Mandatory)]
        [string]$Name
    )

    # 1. PATH
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    # 2. Windows default install locations
    $candidates = switch ($Name) {
        'code' {
            @(
                Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'
                Join-Path $env:ProgramFiles 'Microsoft VS Code\bin\code.cmd'
                Join-Path ${env:ProgramFiles(x86)} 'Microsoft VS Code\bin\code.cmd'
            )
        }
        'cursor' {
            @(
                Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\bin\cursor.cmd'
                Join-Path $env:LOCALAPPDATA 'Programs\Cursor\resources\app\bin\cursor.cmd'
                Join-Path $env:ProgramFiles 'Cursor\resources\app\bin\cursor.cmd'
                Join-Path ${env:ProgramFiles(x86)} 'Cursor\resources\app\bin\cursor.cmd'
            )
        }
        default { @() }
    }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $null
}

function Resolve-Target {
    param(
        [string[]]$Preference
    )

    foreach ($name in $Preference) {
        $cli = Resolve-EditorCli -Name $name
        if ($cli) {
            return @{ Name = $name; Cli = $cli }
        }
    }

    return $null
}

$target = $null
if ($Code) {
    $target = Resolve-Target -Preference @('code')
} elseif ($Cursor) {
    $target = Resolve-Target -Preference @('cursor')
}

# Default: prefer code, then cursor
if (-not $target) {
    $target = Resolve-Target -Preference @('code', 'cursor')
}

if (-not $target) {
    $msg = @"
Could not find 'code' or 'cursor'.
Add the editor's CLI to PATH, or pass -Code / -Cursor explicitly.

Common fixes:
  VS Code: Add "C:\Users\<you>\AppData\Local\Programs\Microsoft VS Code\bin" to PATH
  Cursor:  Add "C:\Users\<you>\AppData\Local\Programs\cursor\resources\app\bin" to PATH

Explicit install examples:
  VS Code: & ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Code
  Cursor:  & ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Cursor
"@
    Write-Error $msg
    exit 1
}

try {
    Write-Host "Installing Prism extension for $($target.Name)..."
    Write-Host "Using CLI: $($target.Cli)"

    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempPath -UseBasicParsing
    & $target.Cli --install-extension $TempPath

    Write-Host 'Prism extension installed successfully.'
    Write-Host "Open $($target.Name) and run 'Prism: Enable Prism' from the Command Palette if needed."
} finally {
    if (Test-Path $TempPath) {
        Remove-Item $TempPath -Force -ErrorAction SilentlyContinue
    }
}
