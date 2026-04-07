# DEFiNE-ZiON-AiTTY — Windows System Tray
# Run via launch.bat

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$PORT      = 7654
$URL       = "http://127.0.0.1:$PORT"
$scriptDir = $PSScriptRoot   # Always returns the script's own directory, even when called from a bat

# Set console title (visible in Task Manager Details as the window title)
$host.UI.RawUI.WindowTitle = "AiTTY — Tray"

# Create data directory if it doesn't exist
$dataDir = Join-Path $scriptDir "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

# Save this process's PID so it can be identified/killed externally
$PID | Out-File (Join-Path $dataDir "tray.pid") -Encoding ascii

$logFile = Join-Path $dataDir "server.log"
$pidFile = Join-Path $dataDir "server.pid"

# ── Stop existing processes ─────────────────────────────────────────
function Stop-ExistingServer {
    # Try to stop using PID file
    if (Test-Path $pidFile) {
        $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($oldPid) {
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
        }
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
    # Also stop any process occupying the port
    $conn = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn -and $conn.OwningProcess -gt 4) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
}

# ── Start server ────────────────────────────────────────────────────
function Start-Server {
    Stop-ExistingServer
    $proc = Start-Process `
        -FilePath    "cmd" `
        -ArgumentList "/c node server.js >> `"$logFile`" 2>&1" `
        -WorkingDirectory $scriptDir `
        -WindowStyle Hidden `
        -PassThru
    $proc.Id | Out-File $pidFile -Encoding ascii
    return $proc
}

# Start server
$nodeProcess = Start-Server
Start-Sleep -Milliseconds 1800

# Open browser
Start-Process $URL

# ── Tray icon ───────────────────────────────────────────────────────
$tray          = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon     = [System.Drawing.SystemIcons]::Application
$tray.Text     = "ZiON-AiTTY  (port $PORT)"
$tray.Visible  = $true

# Context menu
$menu = New-Object System.Windows.Forms.ContextMenuStrip

$itemOpen = New-Object System.Windows.Forms.ToolStripMenuItem
$itemOpen.Text = "  Open AiTTY"
$itemOpen.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$itemOpen.Add_Click({ Start-Process $URL })

$itemLog = New-Object System.Windows.Forms.ToolStripMenuItem
$itemLog.Text = "  View Log"
$itemLog.Add_Click({
    if (Test-Path $logFile) { Start-Process notepad $logFile }
    else { [System.Windows.Forms.MessageBox]::Show("Log file not found.") }
})

$itemSep1 = New-Object System.Windows.Forms.ToolStripSeparator

$itemRestart = New-Object System.Windows.Forms.ToolStripMenuItem
$itemRestart.Text = "  Restart Server"
$itemRestart.Add_Click({
    $script:nodeProcess = Start-Server
    Start-Sleep -Milliseconds 1200
    $tray.ShowBalloonTip(2000, "ZiON-AiTTY", "Server has been restarted.", [System.Windows.Forms.ToolTipIcon]::Info)
})

$itemSep2 = New-Object System.Windows.Forms.ToolStripSeparator

$itemExit = New-Object System.Windows.Forms.ToolStripMenuItem
$itemExit.Text = "  Exit"
$itemExit.Add_Click({
    $tray.Visible = $false
    Stop-ExistingServer
    Remove-Item (Join-Path $dataDir "tray.pid") -ErrorAction SilentlyContinue
    [System.Windows.Forms.Application]::Exit()
})

$menu.Items.AddRange(@($itemOpen, $itemLog, $itemSep1, $itemRestart, $itemSep2, $itemExit))
$tray.ContextMenuStrip = $menu
$tray.Add_DoubleClick({ Start-Process $URL })

$tray.ShowBalloonTip(3000, "ZiON-AiTTY", "Server has started.`n$URL", [System.Windows.Forms.ToolTipIcon]::Info)

[System.Windows.Forms.Application]::Run()
