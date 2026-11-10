# Pruebas de carga / estrés

Estas pruebas ejercitan el flujo crítico de **venta transaccional**:
`POST /api/pos/cobros` (checkout con validación de stock, descuento, detalle y
total). El objetivo es comprobar que bajo concurrencia **no haya sobreventa**
(stock negativo o inconsistente).

> **Advertencia:** consumen stock real y crean órdenes reales. Ejecútalas contra
> una base de datos de pruebas con datos semilla (`backend/database/schema.sql`).

## 1) PowerShell (Windows, sin dependencias extra)

Requiere **PowerShell 7+** (`pwsh`) y backend en ejecución.

```powershell
pwsh -File .\stress\Stress-Test.ps1 `
  -BaseUrl http://localhost:8080/api `
  -Usuario admin -Password admin123 `
  -Intentos 120 -Concurrencia 20
```

Parámetros útiles:
- `-ProductoId`, `-SedeId`, `-ClienteId`: fijan los datos (si se omiten, el script
  elige un producto con stock, una sede activa y un cliente).
- `-Intentos`: total de cobros (1 unidad por cobro).
- `-Concurrencia`: hilos/rampas paralelas.

Criterio de éxito:
- `stock_final == stock_inicial - ventas_exitosas`
- `stock_final >= 0`
- código de salida `0` (sin sobreventa). Si hay inconsistencia, sale con `1`.

## 2) k6 (carga con VUs y umbrales)

Requiere [k6](https://k6.io/docs/get-started/installation/) y backend en ejecución.

```bash
k6 run -e BASE_URL=http://localhost:8080/api -e USUARIO=admin -e PASSWORD=admin123 stress/k6-checkout.js
```

Variables opcionales: `PRODUCTO_ID`, `SEDE_ID`, `CLIENTE_ID`.
Genera `stress/k6-summary.json` y reporta `checkout_ok` (201) vs
`checkout_stock_rechazado` (409). Un `409` por stock agotado es esperado; lo que
no debe ocurrir es stock negativo.

## 3) Prueba JUnit de concurrencia real (BD)

`backend/src/test/java/com/tienda/stress/CheckoutConcurrencyStressTest.java`

- **No corre por defecto** (evita depender de PostgreSQL en CI/local).
- Requiere `RUN_STRESS_TESTS=true` y una BD PostgreSQL con `schema.sql` + seed.
- Lanza 100 cobros concurrentes (20 hilos) sobre 40 unidades y verifica:
  40 éxitos, 60 rechazos por stock, stock final 0, nunca negativo.

```powershell
$env:RUN_STRESS_TESTS="true"
cd backend
.\mvnw.cmd test -Dtest=CheckoutConcurrencyStressTest
Remove-Item Env:\RUN_STRESS_TESTS
```

## Resultado esperado (enunciado)

Con stock limitado, los cobros concurrentes deben serializarse (lock/validación)
de forma que:
- se acepten solo ventas hasta agotar stock,
- el resto falle con `409 Stock insuficiente`,
- el inventario nunca quede negativo y el total vendido sea consistente.
