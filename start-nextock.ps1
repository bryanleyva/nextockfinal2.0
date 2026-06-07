# ===============================================================
#  NEXTOCK - Arranque para PRUEBAS INTERNAS (red local / LAN)
#  Levanta el microservicio ML (8000) y el backend que ademas
#  sirve el frontend Angular ya compilado (3000).
#  Requisito previo (una sola vez): compilar el frontend
#     cd nextockfrontend-angular ; npm run build
# ===============================================================
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$ml   = Join-Path $raiz "MLNEXTOCK"
$be   = Join-Path $raiz "nextockbackend2.0"

Write-Host "Iniciando microservicio ML (puerto 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$ml'; .\.venv\Scripts\python.exe -m uvicorn src.api:app --port 8000"

Start-Sleep -Seconds 3
Write-Host "Iniciando backend + frontend (puerto 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$be'; node dist/main.js"

# Mostrar IPs de red local
$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -ExpandProperty IPAddress
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host " NEXTOCK listo para pruebas internas" -ForegroundColor Green
Write-Host "  En esta PC:        http://localhost:3000"
foreach ($ip in $ips) { Write-Host "  En la red local:   http://$($ip):3000" }
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Usuario demo: admin@nextock.com / admin123"
