# WebSSH System Tray (PowerShell)
# Run via launch.bat

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$PORT = 7654
$URL  = "http://127.0.0.1:$PORT"

# Start Node server
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $scriptDir -WindowStyle Hidden -PassThru

Start-Sleep -Milliseconds 1500

# Open browser
Start-Process $URL

# Tray icon (using built-in shield icon)
$tray           = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon      = [System.Drawing.SystemIcons]::Application
$tray.Text      = "WebSSH - 실행 중 (포트 $PORT)"
$tray.Visible   = $true

# Context menu
$menu = New-Object System.Windows.Forms.ContextMenuStrip

$itemOpen = New-Object System.Windows.Forms.ToolStripMenuItem
$itemOpen.Text = "🌐  WebSSH 열기"
$itemOpen.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$itemOpen.Add_Click({ Start-Process $URL })

$itemSep1 = New-Object System.Windows.Forms.ToolStripSeparator

$itemRestart = New-Object System.Windows.Forms.ToolStripMenuItem
$itemRestart.Text = "↺  서버 재시작"
$itemRestart.Add_Click({
    try { $nodeProcess | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Milliseconds 500
    $script:nodeProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $scriptDir -WindowStyle Hidden -PassThru
    Start-Sleep -Milliseconds 1000
    $tray.ShowBalloonTip(2000, "WebSSH", "서버가 재시작되었습니다.", [System.Windows.Forms.ToolTipIcon]::Info)
})

$itemSep2 = New-Object System.Windows.Forms.ToolStripSeparator

$itemExit = New-Object System.Windows.Forms.ToolStripMenuItem
$itemExit.Text = "✕  종료"
$itemExit.Add_Click({
    $tray.Visible = $false
    try { $nodeProcess | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}
    try { Stop-Process -Name "node" -ErrorAction SilentlyContinue } catch {}
    [System.Windows.Forms.Application]::Exit()
})

$menu.Items.AddRange(@($itemOpen, $itemSep1, $itemRestart, $itemSep2, $itemExit))
$tray.ContextMenuStrip = $menu

# Double-click to open browser
$tray.Add_DoubleClick({ Start-Process $URL })

# Show startup notification
$tray.ShowBalloonTip(3000, "WebSSH", "서버가 시작되었습니다.`n$URL", [System.Windows.Forms.ToolTipIcon]::Info)

# Keep running
[System.Windows.Forms.Application]::Run()
