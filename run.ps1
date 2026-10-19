param(
    [string]$Model = $env:BEE2BEE_MODEL,
    [int]$ApiPort = 4002,
    [int]$P2pPort = 4003
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$nodeArgs = if ($Model) {
    @('-m', 'bee2bee', 'serve-ollama', '--model', $Model, '--host', '127.0.0.1', '--port', "$P2pPort", '--api-port', "$ApiPort")
} else {
    @('-m', 'bee2bee', 'api', '--host', '127.0.0.1', '--port', "$ApiPort", '--p2p-port', "$P2pPort")
}

Write-Host 'Starting Bee2Bee node...' -ForegroundColor Yellow
$node = Start-Process -FilePath 'python' -ArgumentList $nodeArgs -NoNewWindow -PassThru

try {
    Set-Location (Join-Path $root 'app')
    if (-not (Test-Path 'node_modules')) {
        npm install
    }
    Write-Host 'Local web app: http://localhost:3000' -ForegroundColor Green
    npm run dev
}
finally {
    if ($node -and -not $node.HasExited) {
        Stop-Process -Id $node.Id -Force
    }
}
