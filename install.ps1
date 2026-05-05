[CmdletBinding()]
param(
    [ValidateSet('all', 'start', 'update', 'doctor', 'uninstall', 'exit')]
    [string]$Command = 'all',
    [string]$TargetDir = "exocore-web"
)

$RepoUrl = "https://github.com/Exocore-Organization/exocore-web.git"
$Branch = "main"
$ESC = [char]27
$C = @{ R="$ESC[0m"; G="$ESC[32m"; Y="$ESC[33m"; C="$ESC[36m"; Rd="$ESC[31m"; B="$ESC[1m" }

function Write-Banner {
    Write-Host @"
$($C.C)$($C.B)  ███████╗██╗  ██╗██████╗  ██████╗  ██████╗ ██████╗ ███████╗$($C.R)
$($C.C)$($C.B)  ██╔════╝╚██╗██╔╝██╔═══██╗██╔════╝ ██╔═══██╗██╔══██╗██╔════╝$($C.R)
$($C.C)$($C.B)  █████╗   ╚███╔╝ ██║   ██║██║      ██║   ██║██████╔╝█████╗  $($C.R)
$($C.C)$($C.B)  ██╔══╝   ██╔██╗ ██║   ██║██║      ██║   ██║██╔══██╗██╔══╝  $($C.R)
$($C.C)$($C.B)  ███████╗██╔╝ ██╗╚██████╔╝╚██████╗ ╚██████╔╝██║  ██║███████╗$($C.R)
$($C.C)$($C.B)  ╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝$($C.R)
$($C.B)  Browser-based IDE  •  Windows Installer$($C.R)
"@
}

function Log($m) { Write-Host "${C.C}[exocore]${C.R} $m" }
function Ok($m)  { Write-Host "${C.G}[  ok  ]${C.R} $m" }
function Warn($m){ Write-Host "${C.Y}[ warn ]${C.R} $m" }
function Err($m) { Write-Host "${C.Rd}[error ]${C.R} $m" -ForegroundColor Red }

function Ensure-Cmd($name, $id) {
    if (Get-Command $name -ErrorAction SilentlyContinue) { Ok "$name installed"; return $true }
    Warn "$name not found, installing via winget..."
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { Err "winget missing"; return $false }
    $p = Start-Process winget -Wait -PassThru -NoNewWindow -ArgumentList "install","--id",$id,"--silent","--accept-source-agreements","--accept-package-agreements"
    if ($p.ExitCode -notin 0,1641,3010) { Err "Failed to install $name"; return $false }
    $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
    Ok "$name installed"; return $true
}

function Check-Node { if (-not (Ensure-Cmd node "OpenJS.NodeJS.LTS")) { return $false }; Ok "Node.js $(node -v)"; $true }
function Check-Git  { if (-not (Ensure-Cmd git "Git.Git")) { return $false }; Ok "$(git --version)"; $true }

function Fetch-Repo {
    $MaxRetries = 3
    $RetryDelay = 3

    if (Test-Path (Join-Path $TargetDir ".git")) {
        Log "Updating at $TargetDir..."
        Push-Location $TargetDir

        $Attempt = 0
        $Success = $false
        while (-not $Success -and $Attempt -lt $MaxRetries) {
            git pull --ff-only origin $Branch
            if ($?) {
                $Success = $true
            } else {
                $Attempt++
                Warn "Git pull failed. Retrying ($Attempt/$MaxRetries) in $RetryDelay seconds..."
                Start-Sleep -Seconds $RetryDelay
            }
        }
        Pop-Location
        if (-not $Success) { Err "Pull failed after multiple attempts"; return $false }
    } else {
        Log "Cloning to $TargetDir..."

        $Attempt = 0
        $Success = $false
        while (-not $Success -and $Attempt -lt $MaxRetries) {
            git clone --depth=1 --branch $Branch $RepoUrl $TargetDir
            if ($?) {
                $Success = $true
            } else {
                $Attempt++
                Warn "Git clone failed. Retrying ($Attempt/$MaxRetries) in $RetryDelay seconds..."
                Start-Sleep -Seconds $RetryDelay
            }
        }
        if (-not $Success) { Err "Clone failed after multiple attempts"; return $false }
    }

    Ok "Source ready at $TargetDir"; return $true
}

function Install-Deps {
    Log "Installing npm dependencies..."
    Push-Location $TargetDir
    $env:PUPPETEER_SKIP_DOWNLOAD="1"
    npm install --omit=dev --legacy-peer-deps --no-audit --no-fund
    $r=$?; Pop-Location
    if (-not $r) { Err "npm install failed"; return $false }
    Ok "Dependencies installed"; $true
}

function Start-Server {
    Log "Starting Exocore..."
    Write-Host "`n  $($C.G)Server starting...$($C.R)`n"
    $env:PUPPETEER_SKIP_DOWNLOAD = "1"
    $env:EXOCORE_LOCAL = "true"
    $env:NODE_ENV = "production"
    Set-Location $TargetDir
    npm start
}

function Show-Doctor {
    Write-Host ""; Log "TARGET_DIR: $TargetDir"
    if (Get-Command node -ErrorAction SilentlyContinue) { Log "node: $(node -v)" } else { Warn "node not found" }
    if (Get-Command npm  -ErrorAction SilentlyContinue) { Log "npm: $(npm -v)"   } else { Warn "npm not found"  }
    if (Get-Command git  -ErrorAction SilentlyContinue) { Log "git: $(git --version)" } else { Warn "git not found" }
    if (Test-Path (Join-Path $TargetDir "package.json")) { Ok "package.json found" } else { Warn "package.json missing" }
    if ($env:EXOCORE_LOCAL -eq "true") { Ok "EXOCORE_LOCAL=true (dev-gate bypassed)" } else { Warn "EXOCORE_LOCAL not set" }
    Write-Host ""
}

function Show-Finish {
    $absDir = (Get-Item $TargetDir).FullName
    Write-Host @"
$($C.G)$($C.B)╔══════════════════════════════════════════════╗$($C.R)
$($C.G)$($C.B)║     Exocore installed successfully!          ║$($C.R)
$($C.G)$($C.B)╚══════════════════════════════════════════════╝$($C.R)

  Start:   cd $absDir && npm start
"@
}

function Do-Uninstall {
    Warn "This will remove '$TargetDir' and all its contents."
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -ne 'yes') { Log "Uninstall cancelled"; return }
    if (Test-Path $TargetDir) {
        Log "Removing $TargetDir..."
        Remove-Item -Recurse -Force $TargetDir -ErrorAction SilentlyContinue
        if (Test-Path $TargetDir) { Warn "Some files may be locked. Delete manually if needed." }
        else { Ok "Uninstalled" }
    } else { Warn "$TargetDir not found" }
}

function Install-Exocore {
    param([ValidateSet('all','start','update','doctor','uninstall','exit')][string]$Command = 'all')
    Write-Banner
    switch ($Command) {
        'exit'      { Log "Exiting"; return }
        'doctor'    { Show-Doctor }
        'uninstall' { Do-Uninstall }
        'start' {
            if (-not (Check-Node)) { return }
            if (-not (Test-Path (Join-Path $TargetDir "package.json"))) { Warn "package.json not found. Run 'all' or 'update' first."; return }
            Start-Server
        }
        'update' {
            if (-not (Check-Git)) { return }
            if (-not (Fetch-Repo)) { return }
            Start-Server
        }
        'all' {
            if (-not (Check-Git)) { return }
            if (-not (Check-Node)) { return }
            if (-not (Fetch-Repo)) { return }
            if (-not (Install-Deps)) { return }
            Show-Finish
            Start-Server
        }
    }
}

if ($MyInvocation.ScriptName -eq '' -or $MyInvocation.InvocationName -eq '.') {
    Install-Exocore -Command $Command
}
