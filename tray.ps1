# DEFiNE-ZiON-AiTTY — Windows System Tray
# Run via launch.bat

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$PORT      = 7654
$URL       = "http://127.0.0.1:$PORT"
$scriptDir = $PSScriptRoot   # bat에서 호출해도 항상 스크립트 위치 반환

# data 디렉터리 생성 (없으면)
$dataDir = Join-Path $scriptDir "data"
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

$logFile = Join-Path $dataDir "server.log"
$pidFile = Join-Path $dataDir "server.pid"

# ── 기존 프로세스 정리 ──────────────────────────────────────────────
function Stop-ExistingServer {
    # PID 파일로 종료 시도
    if (Test-Path $pidFile) {
        $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($oldPid) {
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
        }
        Remove-Item $pidFile -ErrorAction SilentlyContinue
    }
    # 포트 점유 프로세스도 종료
    $conn = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn -and $conn.OwningProcess -gt 4) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
}

# ── 서버 시작 ───────────────────────────────────────────────────────
function Start-Server {
    Stop-ExistingServer
    $proc = Start-Process `
        -FilePath    "node" `
        -ArgumentList "server.js" `
        -WorkingDirectory $scriptDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError  $logFile `
        -PassThru
    $proc.Id | Out-File $pidFile -Encoding ascii
    return $proc
}

# 서버 시작
$nodeProcess = Start-Server
Start-Sleep -Milliseconds 1800

# 브라우저 열기
Start-Process $URL

# ── 트레이 아이콘 ───────────────────────────────────────────────────
$tray          = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon     = [System.Drawing.SystemIcons]::Application
$tray.Text     = "ZiON-AiTTY  (port $PORT)"
$tray.Visible  = $true

# 컨텍스트 메뉴
$menu = New-Object System.Windows.Forms.ContextMenuStrip

$itemOpen = New-Object System.Windows.Forms.ToolStripMenuItem
$itemOpen.Text = "  WebSSH 열기"
$itemOpen.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$itemOpen.Add_Click({ Start-Process $URL })

$itemLog = New-Object System.Windows.Forms.ToolStripMenuItem
$itemLog.Text = "  로그 보기"
$itemLog.Add_Click({
    if (Test-Path $logFile) { Start-Process notepad $logFile }
    else { [System.Windows.Forms.MessageBox]::Show("로그 파일이 없습니다.") }
})

$itemSep1 = New-Object System.Windows.Forms.ToolStripSeparator

$itemRestart = New-Object System.Windows.Forms.ToolStripMenuItem
$itemRestart.Text = "  서버 재시작"
$itemRestart.Add_Click({
    $script:nodeProcess = Start-Server
    Start-Sleep -Milliseconds 1200
    $tray.ShowBalloonTip(2000, "ZiON-AiTTY", "서버가 재시작되었습니다.", [System.Windows.Forms.ToolTipIcon]::Info)
})

$itemSep2 = New-Object System.Windows.Forms.ToolStripSeparator

$itemExit = New-Object System.Windows.Forms.ToolStripMenuItem
$itemExit.Text = "  종료"
$itemExit.Add_Click({
    $tray.Visible = $false
    Stop-ExistingServer
    [System.Windows.Forms.Application]::Exit()
})

$menu.Items.AddRange(@($itemOpen, $itemLog, $itemSep1, $itemRestart, $itemSep2, $itemExit))
$tray.ContextMenuStrip = $menu
$tray.Add_DoubleClick({ Start-Process $URL })

$tray.ShowBalloonTip(3000, "ZiON-AiTTY", "서버가 시작되었습니다.`n$URL", [System.Windows.Forms.ToolTipIcon]::Info)

[System.Windows.Forms.Application]::Run()
