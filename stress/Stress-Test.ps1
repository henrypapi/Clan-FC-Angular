<#
.SYNOPSIS
  Prueba de carga/estrés contra la API de ventas (POS checkout).

.DESCRIPTION
  Inicia sesión, obtiene un producto/sede/cliente con stock y dispara N cobros
  concurrentes (1 unidad por cobro) contra POST /api/pos/cobros.

  Al final compara el stock inicial vs final para detectar sobreventa:
    stock_final == stock_inicial - ventas_exitosas  => OK (sin sobreventa)
    stock_final < 0 o inconsistente                 => FALLO

  ADVERTENCIA: consume stock real y crea órdenes reales en la BD configurada.
  Úsalo contra una base de datos de pruebas.

.REQUIREMENTS
  PowerShell 7+ (ForEach-Object -Parallel). Backend en ejecución y BD con datos
  semilla (usuarios, sedes, productos con stock).

.EXAMPLE
  pwsh -File .\stress\Stress-Test.ps1 -BaseUrl http://localhost:8080/api `
       -Usuario admin -Password admin123 -Intentos 120 -Concurrencia 20
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = "http://localhost:8080/api",
    [string]$Usuario = "admin",
    [string]$Password = "admin123",
    [int]$Intentos = 100,
    [int]$Concurrencia = 20,
    [long]$ProductoId = 0,
    [long]$SedeId = 0,
    [long]$ClienteId = 0
)

$ErrorActionPreference = 'Stop'

function Get-Token {
    $body = @{ username = $Usuario; password = $Password } | ConvertTo-Json -Compress
    $resp = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post `
        -ContentType 'application/json' -Body $body -TimeoutSec 30
    if (-not $resp.token) { throw "Login sin token. Respuesta: $($resp | ConvertTo-Json -Compress)" }
    return $resp.token
}

$token = Get-Token
$headers = @{ Authorization = "Bearer $token" }

# Producto con stock
if ($ProductoId -le 0) {
    $productos = Invoke-RestMethod -Uri "$BaseUrl/productos" -Headers $headers -TimeoutSec 30
    $candidato = @($productos | Where-Object { $_.activo -ne $false -and $_.stock -gt 0 } | Select-Object -First 1)
    if ($candidato.Count -eq 0) { throw "No hay productos activos con stock. Crea uno o pasa -ProductoId." }
    $ProductoId = [long]$candidato[0].idProducto
}

# Sede activa
if ($SedeId -le 0) {
    $sedes = Invoke-RestMethod -Uri "$BaseUrl/sedes" -Headers $headers -TimeoutSec 30
    $sede = @($sedes | Where-Object { $_.activa -ne $false } | Select-Object -First 1)
    if ($sede.Count -eq 0) { throw "No hay sedes activas. Pasa -SedeId." }
    $SedeId = [long]$sede[0].idSede
}

# Cliente (opcional)
$clienteIdValue = $null
if ($ClienteId -gt 0) {
    $clienteIdValue = [long]$ClienteId
} else {
    try {
        $clientes = Invoke-RestMethod -Uri "$BaseUrl/pos/clientes" -Headers $headers -TimeoutSec 30
        $cli = @($clientes | Select-Object -First 1)
        if ($cli.Count -gt 0) { $clienteIdValue = [long]$cli[0].idUsuario }
    } catch { }
}

# Stock inicial (catálogo público)
$prodAntes = Invoke-RestMethod -Uri "$BaseUrl/productos/$ProductoId" -Headers $headers -TimeoutSec 30
$stockAntes = [int]$prodAntes.stock

$bodyObj = @{
    items      = @(@{ productoId = [long]$ProductoId; cantidad = 1 })
    sedeId     = [long]$SedeId
    clienteId  = $clienteIdValue
    metodoPago = 'EFECTIVO'
}
$bodyJson = $bodyObj | ConvertTo-Json -Depth 5 -Compress

Write-Host "===== STRESS TEST: POS CHECKOUT =====" -ForegroundColor Cyan
Write-Host "BaseUrl      : $BaseUrl"
Write-Host "Producto     : $ProductoId ($($prodAntes.nombre))"
Write-Host "Sede         : $SedeId"
Write-Host "ClienteId    : $clienteIdValue"
Write-Host "Intentos     : $Intentos"
Write-Host "Concurrencia : $Concurrencia"
Write-Host "Stock antes  : $stockAntes"
Write-Host ""

$inicio = [DateTime]::UtcNow
$resultados = 1..$Intentos | ForEach-Object -Parallel {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $null = Invoke-RestMethod -Uri "$using:BaseUrl/pos/cobros" -Method Post `
            -Headers @{ Authorization = "Bearer $using:token" } `
            -ContentType 'application/json' -Body $using:bodyJson -TimeoutSec 60
        $sw.Stop()
        [pscustomobject]@{ Ok = $true; Status = 201; Ms = $sw.Elapsed.TotalMilliseconds; Error = $null }
    } catch {
        $sw.Stop()
        $status = 0
        $msg = $_.Exception.Message
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch { }
        }
        [pscustomobject]@{ Ok = $false; Status = $status; Ms = $sw.Elapsed.TotalMilliseconds; Error = $msg }
    }
} -ThrottleLimit $Concurrencia
$duracionTotal = ([DateTime]::UtcNow - $inicio).TotalSeconds

$prodDespues = Invoke-RestMethod -Uri "$BaseUrl/productos/$ProductoId" -Headers $headers -TimeoutSec 30
$stockDespues = [int]$prodDespues.stock

$ok = @($resultados | Where-Object { $_.Ok })
$fail = @($resultados | Where-Object { -not $_.Ok })
$lat = @($resultados | ForEach-Object { [double]$_.Ms } | Sort-Object)
$avg = if ($lat.Count) { [Math]::Round((($lat | Measure-Object -Average).Average), 2) } else { 0 }
$min = if ($lat.Count) { [Math]::Round($lat[0], 2) } else { 0 }
$max = if ($lat.Count) { [Math]::Round($lat[$lat.Count - 1], 2) } else { 0 }
$p95idx = [Math]::Min($lat.Count - 1, [Math]::Floor($lat.Count * 0.95))
$p95 = if ($lat.Count) { [Math]::Round($lat[$p95idx], 2) } else { 0 }
$esperado = $stockAntes - $ok.Count
$oversell = ($stockDespues -lt 0) -or ($stockDespues -ne $esperado)
$throughput = if ($duracionTotal -gt 0) { [Math]::Round($Intentos / $duracionTotal, 2) } else { 0 }

$porStatus = $resultados | Group-Object Status | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Count)" }

Write-Host "===== RESULTADO =====" -ForegroundColor Cyan
Write-Host "Duración total : $([Math]::Round($duracionTotal,2)) s"
Write-Host "Throughput     : $throughput req/s"
Write-Host "Éxitos (201)   : $($ok.Count)"
Write-Host "Fallos         : $($fail.Count)"
Write-Host "Estados HTTP   : $($porStatus -join ', ')"
Write-Host "Latencia ms    : min=$min avg=$avg p95=$p95 max=$max"
Write-Host "Stock antes    : $stockAntes"
Write-Host "Stock después  : $stockDespues"
Write-Host "Stock esperado : $esperado (antes - éxitos)"
Write-Host ""

if ($oversell) {
    Write-Host "FALLO: posible sobreventa o inconsistencia de stock." -ForegroundColor Red
    exit 1
} else {
    Write-Host "OK: sin sobreventa detectada; el stock es consistente." -ForegroundColor Green
    if ($stockDespues -eq 0 -and $fail.Count -gt 0) {
        Write-Host "Nota: hubo rechazos esperados por stock insuficiente (409)." -ForegroundColor Yellow
    }
    exit 0
}
