# Pruebas automatizadas y de estrés — Clan-FC / TiendaMenos

Este documento describe la batería de pruebas agregada para validar los
requisitos del enunciado (CRUD Cliente, CRUD Producto, Ventas/DetalleVenta,
seguridad y validaciones) y el comportamiento bajo carga.

## 1. Resultado de ejecución

Comando ejecutado sobre la entrega:

```powershell
cd backend
.\mvnw.cmd test
```

**Resultado:** `Tests run: 232, Failures: 0, Errors: 0, Skipped: 2` (BUILD SUCCESS).

Omitidas (intencional):
1. `BackendApplicationTests` — requiere PostgreSQL activo con `database/schema.sql`
   (`@Disabled`).
2. `CheckoutConcurrencyStressTest` — prueba de estrés/concurrencia real contra
   PostgreSQL; solo corre con `RUN_STRESS_TESTS=true` (`@EnabledIfEnvironmentVariable`).

## 2. Cobertura (JaCoCo)

Se agregó `jacoco-maven-plugin` al `pom.xml`. La fase `test` genera el reporte:

```powershell
cd backend
.\mvnw.cmd test
# Reporte: backend\target\site\jacoco\index.html
```

## 3. Inventario de pruebas nuevas (requisitos)

| Requisito | Clase de prueba | Tipo | Qué valida |
|---|---|---|---|
| RF1.1.1, RF1.4, correo=username, BCrypt, roles | `ClienteServiceTest` | Unit (Mockito) | Alta con `username=correo` y BCrypt; `ROLE_USER/ROLE_ADMIN`; correo duplicado; rol inválido; país inexistente; edición conserva hash si no hay password; rehash al cambiar; no degradar/eliminar último ADMIN; **RF1.4** no borra cliente con ventas/otras FK; listado CLIENTE+ADMIN. |
| RF1.1.1, seguridad ADMIN, 401/403/409 | `ClienteControllerTest` | MVC slice + `SecurityConfig` | CRUD `/api/clientes` solo ADMIN; validaciones de DTO (400 + `campos.*`); 409 por duplicado; 401 sin sesión; 403 sin rol. |
| RF2.1.1, seguridad, inactivos | `ProductoControllerTest` (ampliado) | MVC slice | RF2.1.1 (SKU/nombre/precio/stock/categoría/sede/garantía); `incluirInactivos=true` solo ADMIN; catálogo público ignora inactivos. |
| Ventas: stock, snapshot, total, transacción, cliente POS, anulación | `CheckoutServiceTest` (ampliado) | Unit (Mockito) | Descuento de stock por sede; stock insuficiente/sede inactiva/producto inactivo/duplicado; cliente POS como comprador y kardex firmado por cajero; **snapshot** precio/IVA/subtotal/total; anulación repone stock + kardex DEVOLUCION y no borra si falla reversión. |
| Ventas: propiedad/roles, anulación | `OrdenesControllerTest` | MVC slice | CLIENTE ve solo sus órdenes; ADMIN/CAJERO privilegiados; orden ajena → 404 (no filtra existencia); `DELETE /api/ordenes/{id}` solo ADMIN. |
| Autenticación JWT (correo) | `AuthControllerTest` | MVC slice | Login con correo devuelve JWT Bearer/rol/país; credenciales inválidas 401; autoregistro público 201 CLIENTE. |
| Login por username/correo | `UsuarioDetailsServiceTest` | Unit | Carga por username o correo; mapea `ROLE_*`; bloquea usuario desactivado/inexistente. |
| RF1.1.1 | `ClienteRequestValidationTest` | Bean Validation | Nombre/correo/password/rol/país; password nula válida en edición. |
| RF2.1.1 | `ProductoRequestValidationTest` | Bean Validation | SKU, nombre, descripción, precio>0, sede/categoría obligatorias, stock>=0, garantía 0..60, imagen, opcionales. |
| Carrito venta | `CheckoutRequestValidationTest` | Bean Validation | Carrito no vacío, sede obligatoria, método de pago, producto/cantidad por línea (1..1000). |

## 4. Pruebas existentes (se mantienen verdes)

La suite también incluye pruebas previas del proyecto: `Caja*`, `Categoria*`,
`Dashboard*`, `Incidencia*`, `ProductoServiceTest`, `ProductoSedeStock*`,
`ReporteSemanal*`, `Sede*`, `TaxCalculation*`, `UsuarioService*`, utilitarios
(`DashboardUtils`, `PeruFiscalUtils`), modelos y slices MVC de caja/sede/producto.

## 5. Pruebas de estrés / carga

Ver [`stress/README.md`](../stress/README.md).

| Prueba | Tipo | Ejecución |
|---|---|---|
| `stress/CheckoutConcurrencyStressTest.java` | JUnit + Spring + PostgreSQL real | Solo con `RUN_STRESS_TESTS=true`. 100 cobros concurrentes / 20 hilos / 40 unidades → 40 éxitos, 60 `StockInsuficiente`, stock final 0, sin sobreventa. |
| `stress/Stress-Test.ps1` | Carga HTTP concurrente (PowerShell 7) | Contra API en ejecución. Mide latencia/throughput/estados y verifica consistencia de stock (`stock_final == inicial - éxitos`). |
| `stress/k6-checkout.js` | Carga k6 (VUs con ramp-up) | `k6 run ...` contra API. Reporta `checkout_ok`/`checkout_stock_rechazado`; `teardown` falla si el stock queda negativo. |

**Qué demuestra la prueba de concurrencia:** el checkout usa inventario con
bloqueo (`findForUpdate` / operación transaccional) y valida stock antes de
confirmar; bajo concurrencia no se venden más unidades que las disponibles.

## 6. Comandos útiles

```powershell
# Suite completa (sin estrés real de BD)
cd backend
.\mvnw.cmd test

# Una clase
.\mvnw.cmd test -Dtest=ClienteServiceTest

# Controlador/slice
.\mvnw.cmd test -Dtest=OrdenesControllerTest

# Cobertura JaCoCo
.\mvnw.cmd test
# abrir backend\target\site\jacoco\index.html

# Estrés JUnit real (requiere PostgreSQL + seed)
$env:RUN_STRESS_TESTS="true"
.\mvnw.cmd test -Dtest=CheckoutConcurrencyStressTest
Remove-Item Env:\RUN_STRESS_TESTS

# Estrés HTTP (backend corriendo)
pwsh -File ..\stress\Stress-Test.ps1 -Intentos 120 -Concurrencia 20
```

## 7. Limitaciones conocidas

- Las pruebas de estrés real (JUnit/PowerShell/k6) **no** se ejecutan en la suite
  por defecto porque requieren backend/BD y consumen stock.
- `BackendApplicationTests` está `@Disabled` por la misma razón (smoke de
  contexto con PostgreSQL).
- Las pruebas unitarias/MVC usan Mockito/slices: validan lógica, contratos y
  seguridad, pero no sustituyen una prueba de integración end-to-end con BD real
  (para eso existe la prueba de estrés JUnit condicional y los scripts HTTP).
- Hibernate Validator emite avisos `HV000271` sobre `@Valid` en `List` dentro de
  `CheckoutRequest`; no afectan el resultado de las pruebas. Se puede migrar a
  `List<@Valid ItemCheckoutRequest>` si se desea eliminar el warning.