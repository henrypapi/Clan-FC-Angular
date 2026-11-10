# Informe de entrega — TiendaMenos (Clan-FC)

**Fecha:** 9 de noviembre de 2026
**Carpeta de entrega:** `C:\Users\Tacza\Desktop\Clan-FC-Entrega`
**Base:** última versión de `origin/main` del repositorio Clan-FC-Angular (commit `ddeaf21`), con el frontend Angular del 11 de octubre portado y adaptado a JWT.

---

## 1. Resumen ejecutivo

El proyecto base ya contaba con una arquitectura sólida (Spring Boot + JWT + PostgreSQL + Angular) y con gran parte del dominio de ventas resuelto: checkout transaccional, descuento de stock con bloqueo pesimista, snapshot de precio y cálculo de totales. **Lo que faltaba era el CRUD de Clientes como tal, la pantalla de Ventas en el panel administrativo, la selección de cliente en el POS y varios ajustes de seguridad/validación.**

En esta entrega se completó todo eso y se dejó en **una sola carpeta** (`Clan-FC-Entrega`) lista para compilar y ejecutar. No se tocó el árbol de trabajo local original; el trabajo previo quedó respaldado en la rama `respaldo-local-2026-11-09`.

### Verificación realizada

| Verificación | Comando | Resultado |
| --- | --- | --- |
| Compilación backend | `backend\mvnw.cmd "-Dmaven.test.skip=true" compile` | ✅ `BUILD SUCCESS` |
| Build frontend | `npm run build` (Angular 21) | ✅ `Application bundle generation complete` |
| Pruebas unitarias + slices MVC | `backend\mvnw.cmd test` | ✅ 136 pruebas, 0 fallos, 1 omitida (smoke test que requiere PostgreSQL) |

---

## 2. Mapeo de entidades solicitadas → modelo existente

El proyecto ya usaba una nomenclatura distinta a la del enunciado. Para no romper el esquema en 3FN ni el histórico, se mapeó así:

| Enunciado | Modelo real | Tabla | Observación |
| --- | --- | --- | --- |
| Cliente | `Usuario` con rol `CLIENTE` | `usuarios` | El correo es el `username` (credencial). Rol expuesto como `ROLE_USER` / `ROLE_ADMIN`. |
| Producto | `Producto` + `ProductoSedeStock` | `productos`, `producto_sede_stock` | El stock vive por sede (3FN); el catálogo no duplica stock. |
| Venta | `Orden` | `ordenes` | Cabecera: cliente, sede, subtotal, IVA, total, método de pago, estado. |
| DetalleVenta | `DetalleOrden` | `detalle_ordenes` | Guarda `sku`, `nombreProducto`, `cantidad`, `precioUnitario`, `ivaLinea`, `subtotalLinea`. |

**Decisión clave:** el "Cliente" no se creó como una tabla nueva. Se reutiliza `usuarios`, porque el requisito pide que el cliente tenga correo como usuario, contraseña BCrypt y rol. Crear una tabla aparte habría duplicado identidades y roto el login/JWT y las FK de ventas.

---

## 3. Matriz de requisitos: estado inicial, brecha y solución

### 3.1 CRUD de Cliente

| Requisito | Estado en el proyecto base | Brecha | Solución implementada |
| --- | --- | --- | --- |
| Crear / listar / editar / eliminar cliente | Solo existía `UsuarioController` para personal (ADMIN/CAJERO/CLIENTE) con fines de login. | No había endpoints ni pantalla de Clientes. | `ClienteController` + `ClienteService` + `ClienteRequest` / `ClienteResponse` (`/api/clientes`). Pantalla **Clientes** en el panel admin. |
| Correo como nombre de usuario | El login era por `username`; el registro pedía `username` aparte. | El requisito exige que el correo sea el usuario. | Al crear/editar cliente: `username = email`. El login y el JWT aceptan correo o usuario. Registro público ya no pide `username`. |
| Contraseña con BCrypt | Ya existía `BCryptPasswordEncoder` y el registro lo usaba. | El CRUD de clientes no existía. | `ClienteService` cifra con `passwordEncoder.encode(...)`. En edición, contraseña vacía conserva la actual. |
| Rol `ROLE_USER` / `ROLE_ADMIN` | El modelo interno usa `CLIENTE` / `ADMIN` / `CAJERO`. | El enunciado usa nomenclatura `ROLE_*`. | Traducción bidireccional: `ROLE_USER → CLIENTE`, `ROLE_ADMIN → ADMIN`; la API expone el rol interno y el formulario ofrece `ROLE_USER` / `ROLE_ADMIN`. |
| Validaciones RF1.1.1 | Parciales en el alta de usuarios. | Faltaban reglas explícitas y mensajes. | `ClienteRequest`: nombre 3–120, correo válido ≤100, contraseña 6–72 (obligatoria al crear), rol permitido, país obligatorio y activo. Correo único (case-insensitive). |
| Restricción de FK al eliminar (RF1.4) | `ordenes.id_usuario` ya era FK. | No había borrado de clientes ni control del error. | `ClienteService.eliminar`: bloquea si tiene ventas (`countByUsuarioIdUsuario`) o si es el último ADMIN; captura `DataIntegrityViolationException` y devuelve 409 con mensaje claro. Se sugiere desactivar en lugar de borrar. |

**Archivos nuevos/afectados (backend):**

- `dto/ClienteRequest.java`, `dto/ClienteResponse.java`
- `service/ClienteService.java`
- `controller/ClienteController.java`
- `repository/UsuarioRepository.java` (consultas por rol/email)
- `repository/OrdenRepository.java` (`countByUsuarioIdUsuario`)
- `service/UsuarioService.java`, `service/UsuarioDetailsService.java`, `controller/AuthController.java` (login por correo, alias `crear`/`obtenerPorId`)
- `model/Usuario.java` (`username` ahora admite 100 caracteres)
- `dto/RegistroUsuarioRequest.java` (`username` opcional)

### 3.2 CRUD de Producto

| Requisito | Estado en el proyecto base | Brecha | Solución implementada |
| --- | --- | --- | --- |
| Crear / listar / editar / eliminar producto | ✅ Ya existía completo (`ProductoController`, `ProductoService`). | Faltaba reforzar validaciones y reflejar la baja lógica en la UI. | Se mantuvo el CRUD y se reforzó `ProductoRequest`. La pantalla admin ahora muestra el estado **Inactivo** y permite reactivar. |
| Validaciones RF2.1.1 | Existían `@NotBlank`, `@Size`, `@DecimalMin`, `@PositiveOrZero`. | Faltaban mensajes, rango de SKU/nombre y garantía acotada. | SKU 2–40, nombre 2–120, descripción ≤500, precio > 0, stock/stock mínimo ≥ 0, garantía 0–60, imagen ≤300. Categoría y sede obligatorias. |
| Restricción de FK al eliminar (RF2.4) | `ProductoService.eliminar` ya hacía baja lógica (`activo = false`). | La UI eliminaba la fila de la lista, pero al recargar reaparecía; no se explicaba la decisión. | Se documentó la baja lógica en el servicio y se ajustó la UI: el producto queda **inactivo**, visible con badge, y se puede reactivar con el checkbox "Producto activo". Así nunca se rompen `detalle_ordenes`, `movimientos_almacen` ni `incidencias`. |

**Decisión de diseño RF2.4:** se eligió **baja lógica** en lugar de borrado físico. Es la única estrategia segura cuando el producto ya tiene ventas o kardex: PostgreSQL rechazaría el `DELETE` por las FK `ON DELETE RESTRICT`, y borrar el histórico contable/auditoría no es aceptable. La UI lo comunica como "dar de baja".

### 3.3 Ventas y DetalleVenta

| Requisito | Estado en el proyecto base | Brecha | Solución implementada |
| --- | --- | --- | --- |
| Seleccionar cliente existente | El checkout web usaba al usuario autenticado; el POS no permitía elegir cliente. | El POS siempre vendía al cajero autenticado. | `CheckoutRequest.clienteId`; `CheckoutService` resuelve `comprador` (cliente elegido) vs `autenticado` (quien cobra). `GET /api/pos/clientes` alimenta el selector del POS. |
| Agregar/quitar varios productos | ✅ El POS ya tenía ticket dinámico. | Bug real: el ticket guardaba `idProducto` pero la plantilla y los métodos buscaban `productoId`, por lo que no se agrupaban las líneas ni funcionaban los botones +/−. | Se normalizó el ítem del ticket con `productoId` además de `idProducto`; `addToTicket` y `changeQty` ya agrupan, incrementan, decrementan y eliminan líneas. |
| Verificar disponibilidad de stock | ✅ `CheckoutService` usa `findForUpdate` con bloqueo pesimista y valida stock por sede. | — | Se conserva y se documenta. Si no alcanza, lanza `StockInsuficienteException` y **toda la transacción hace rollback**. |
| Descontar stock al guardar | ✅ Ya se descontaba en `producto_sede_stock`. | — | Se conserva. Se registra además el movimiento de salida en el kardex. |
| Guardar `precioUnitario` (snapshot) | ✅ `DetalleOrden.precioUnitario` se llena desde `Producto.precioBase` al momento de la venta. | — | Se conserva; el precio histórico no cambia si luego se edita el producto. |
| Calcular y guardar el total | ✅ `subtotal`, `iva`, `total` se acumulan por línea y se persisten. | — | Se conserva; el backend siempre recalcula y **nunca confía en montos del frontend**. |
| Guardado transaccional con rollback | ✅ `@Transactional` en `procesar`. | — | Se conserva. Cualquier línea sin stock aborta la venta completa. |
| Listado de ventas con cliente y total | No existía en el panel admin. | Faltaba la vista. | Nueva sección **Ventas** en el admin: folio/fecha, cliente, sede, total, estado y acciones. |
| Ver detalle con todos los `DetalleVenta` | El backend ya devolvía `items` en `OrdenResponse`. | No había modal/pantalla de detalle. | Modal de detalle con producto, SKU, cantidad, precio unitario, subtotal, IVA y total. |
| Eliminar venta revirtiendo stock, transaccional | No existía endpoint de anulación. | Faltaba la operación. | `DELETE /api/ordenes/{id}` (solo ADMIN) → `CheckoutService.eliminar`: repone stock por cada línea con `findForUpdate`, registra movimiento `DEVOLUCION` en kardex y borra la orden (detalles en cascada). Todo en una transacción. |

**Archivos afectados (backend):**

- `dto/CheckoutRequest.java` (`clienteId`)
- `service/CheckoutService.java` (comprador vs autenticado, IVA por país del comprador, `eliminar` con reversión, control de propiedad en el detalle)
- `service/AlmacenService.java` (`registrarDevolucionVenta`)
- `controller/OrdenesController.java` (`DELETE /{id}`, detalle con control de propiedad)
- `controller/PosController.java` (`GET /api/pos/clientes`)
- `config/SecurityConfig.java` (reglas de clientes, órdenes, países, CORS)
- `exception/GlobalExceptionHandler.java` (409 amigables para unique/FK)

### 3.4 Seguridad

| Requisito | Estado inicial | Solución implementada |
| --- | --- | --- |
| Correo como usuario | El registro pedía `username` y correo por separado. | El registro público usa el correo como `username`. El login acepta correo o usuario. |
| Contraseña BCrypt | ✅ Ya existía. | Se mantiene en todo el CRUD de clientes y en el registro. |
| Roles `ROLE_USER` / `ROLE_ADMIN` | Internamente `CLIENTE` / `ADMIN` / `CAJERO`. | Mapeo explícito y validado en `ClienteService.resolverRol`. |
| Protección de endpoints | Parcial. | `/api/clientes/**` solo ADMIN; `/api/ordenes/**` DELETE solo ADMIN; `/api/pos/**` CAJERO/ADMIN; `/api/paises` GET público (lo necesita el registro); catálogo público. |
| Aislamiento de datos | `GET /api/ordenes/{id}` permitía a cualquier autenticado ver cualquier orden (IDOR). | Ahora ADMIN/CAJERO ven cualquiera; un CLIENTE solo las suyas (404 si es ajena). |
| Inventario con inactivos | `?incluirInactivos=true` era público. | Solo ADMIN lo obtiene; el frontend envía JWT al pedir inventario. |
| CORS | Orígenes fijos. | `http://localhost:*` y `http://127.0.0.1:*` para desarrollo. |
| Último administrador | Se podía borrar/degradar al último ADMIN. | Bloqueado al eliminar y al cambiar de rol. |

### 3.5 Validaciones

- **Cliente:** `@NotBlank`, `@Size(3..120)`, `@Email`, `@Size(max=100)`, `@Size(6..72)`, `@Pattern` de rol, `@NotNull` de país. Unicidad de correo/usuario case-insensitive.
- **Producto:** ver 3.2.
- **Venta:** `@NotEmpty` de ítems, `@NotNull` de sede, `@NotBlank` de método de pago, cantidad positiva y producto no repetido (el backend rechaza duplicados para que el stock sea determinista).
- **Errores:** `GlobalExceptionHandler` devuelve mensajes legibles (400/404/409) en lugar de trazas SQL.

---

## 4. Frontend: qué se agregó

| Archivo | Cambio |
| --- | --- |
| `src/core/services/api.service.ts` | Login JWT (`Bearer`), `LoginResponse`/`LoginResult`, métodos de Cliente (`getClientes`, `getCliente`, `crearCliente`, `actualizarCliente`, `eliminarCliente`, `getClientesPos`), de Ventas (`getOrdenes`, `getOrden`, `eliminarOrden`), `sedeId`/`clienteId` en `CheckoutBody`, `getPaises` público, inventario con JWT. |
| `src/core/services/auth.service.ts` | `UserSession` con `token`, `tokenType`, `expiresIn`. |
| `src/app/pages/login.page.ts` | Guarda el JWT en la sesión. |
| `src/app/pages/registro.page.ts` | Sin campo `username`; el correo es la credencial; países públicos; validadores alineados. |
| `src/app/pages/admin.page.ts` | Nuevas secciones **Clientes** (alta/edición/baja, búsqueda, rol, país, activo) y **Ventas** (listado, detalle en modal, anulación con reposición de stock). Inventario: selector de sede, checkbox de activo y badge "Inactivo". |
| `src/app/pages/pos.page.ts` | Selector de cliente, carga de `/pos/clientes`, checkout con `sedeId` y `clienteId`, ticket corregido (`productoId`). |
| `src/app/pages/cart.page.ts` | Checkout web envía `sedeId` y `clienteId: null`. |
| `src/core/config.ts` | `USE_API: true`, `BASE_URL: http://localhost:8080/api`. |

El frontend compila con Angular 21 y `npm run build` sin errores.

---

## 5. API relevante

### Clientes (solo ADMIN)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/clientes?filtro=&incluirPersonal=` | Lista clientes (CLIENTE + ADMIN). |
| GET | `/api/clientes/{id}` | Detalle. |
| POST | `/api/clientes` | Crea cliente (correo = username, BCrypt). |
| PUT | `/api/clientes/{id}` | Edita (contraseña vacía = conservar). |
| DELETE | `/api/clientes/{id}` | Borra si no tiene ventas; si tiene, 409 (RF1.4). |

### Productos

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/productos?busqueda=&categoriaId=&incluirInactivos=` | Catálogo público; inactivos solo ADMIN. |
| POST/PUT/DELETE | `/api/productos` | CRUD (ADMIN). DELETE = baja lógica (RF2.4). |

### Ventas

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/checkout` | Venta web (CLIENTE/ADMIN). |
| POST | `/api/pos/cobro` | Venta de caja (CAJERO/ADMIN) con `clienteId` opcional. |
| GET | `/api/pos/clientes` | Selector de clientes del POS. |
| GET | `/api/ordenes` | Listado según rol. |
| GET | `/api/ordenes/{id}` | Detalle con ítems (cliente solo las suyas). |
| DELETE | `/api/ordenes/{id}` | Anula venta y repone stock (ADMIN). |

---

## 6. Base de datos

- `backend/database/schema.sql` es la fuente de verdad (`ddl-auto=validate`).
- Cambios aplicados:
  - `usuarios.username` pasa a `varchar(100)` para admitir el correo completo.
  - Check de username relajado a `char_length(username) >= 3` (los usuarios demo `admin`, `cajero`, `cliente` siguen siendo válidos).
  - `ALTER` idempotentes para bases existentes.
- `backend/database/seed.sql` ya inserta catálogo, stock por sede, países y empresas demo.
- Los usuarios demo los crea `DataLoader` al arrancar si no existen.

---

## 7. Cómo ejecutar la entrega

### 7.1 Requisitos

- Java 17+ (el `pom.xml` fija `java.version=17`; validado con Java 21.0.11).
- PostgreSQL 15+.
- Node.js 20+ y npm.

### 7.2 Base de datos

```bash
createdb -U postgres tiendamenos
psql -U postgres -d tiendamenos -f backend/database/schema.sql
psql -U postgres -d tiendamenos -f backend/database/seed.sql
```

Si la base ya existía de una versión anterior, ejecutar `schema.sql` (los `ALTER` son idempotentes) o la migración correspondiente.

### 7.3 Backend

```powershell
cd C:\Users\Tacza\Desktop\Clan-FC-Entrega\backend
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "tu_contrasena"
.\mvnw.cmd spring-boot:run
```

API: `http://localhost:8080/api`

### 7.4 Frontend

```powershell
cd C:\Users\Tacza\Desktop\Clan-FC-Entrega\frontend\Clan-FC
npm install
npm start
```

App: `http://localhost:4200`

### 7.5 Credenciales demo

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| ADMIN | `admin` | `admin123` |
| CAJERO | `cajero` | `cajero123` |
| CLIENTE | `cliente` | `cliente123` |

El login también acepta el correo (`admin@tiendamenos.pe`, etc.).

---

## 8. Flujo de prueba sugerido

1. Entrar como `admin` → **Clientes** → crear un cliente con correo y contraseña, rol `ROLE_USER` y país.
2. Cerrar sesión e iniciar con ese correo/contraseña (valida correo como username + BCrypt).
3. Como `admin` → **Inventario** → crear/editar un producto (sede, precio, stock, activo).
4. Como `cajero` → **POS** → elegir cliente, agregar varios productos, ajustar cantidades, cobrar.
5. Como `admin` → **Ventas** → ver el detalle (cliente, ítems, precio unitario, total).
6. Anular la venta → verificar que el stock vuelve a **Inventario**.
7. Intentar borrar un cliente con ventas → debe responder 409 y sugerir desactivarlo (RF1.4).
8. Dar de baja un producto → queda inactivo, no desaparece del historial (RF2.4).

---

## 9. Decisiones de diseño y limitaciones

1. **Cliente = Usuario.** Evita duplicar identidades y mantiene el login/JWT y las FK de ventas. El rol distingue cliente (`CLIENTE`/`ROLE_USER`) de staff (`ADMIN`, `CAJERO`).
2. **Baja lógica de productos (RF2.4).** Es la única opción segura con ventas/kardex. Se puede reactivar desde el formulario.
3. **Borrado de clientes (RF1.4).** Si tiene ventas, se bloquea con 409; se recomienda desactivar (`activo = false`).
4. **El backend manda en los montos.** El frontend solo envía `productoId` + `cantidad`; precios, IVA y total se recalculan en el servidor.
5. **Stock por sede.** El POS y el checkout envían `sedeId`; el descuento se hace sobre `producto_sede_stock` con bloqueo pesimista.
6. **Edición de producto y sede.** El formulario usa la sede seleccionada (por defecto la primera) para fijar el stock. Si se opera con varias sedes, conviene editar el stock desde el módulo de almacén por sede.
7. **Pruebas.** La suite (`.\mvnw.cmd test`) pasa: **232 pruebas, 0 fallos y 2 omitidas**. Omitidas: `BackendApplicationTests` (smoke de contexto; requiere PostgreSQL + `schema.sql`) y `CheckoutConcurrencyStressTest` (estrés/concurrencia real; requiere `RUN_STRESS_TESTS=true` y PostgreSQL). Se agregaron pruebas unitarias (Mockito), MVC (`@WebMvcTest` + `SecurityConfig`), validación Bean Validation y pruebas de estrés/carga. Cobertura JaCoCo: `backend\target\site\jacoco\index.html` tras `mvnw.cmd test`. Detalle y matriz en [`docs/PRUEBAS.md`](docs/PRUEBAS.md).
8. **`node_modules`.** La carpeta de entrega incluye `node_modules` para que el frontend arranque sin reinstalar; si se prefiere una entrega liviana, se puede borrar y ejecutar `npm install`.

---

## 10. Pruebas automatizadas y de estrés

### 10.1 Automatizadas (incluidas en `mvn test`)

Se cubren los requisitos del enunciado:
- **Cliente (RF1):** `ClienteServiceTest`, `ClienteControllerTest`, `ClienteRequestValidationTest`, `UsuarioDetailsServiceTest` (correo=username, BCrypt, `ROLE_USER/ROLE_ADMIN`, RF1.1.1, RF1.4, login por correo, seguridad ADMIN/401/403).
- **Producto (RF2):** `ProductoRequestValidationTest` y ampliaciones de `ProductoControllerTest`/slices (RF2.1.1, `incluirInactivos` solo ADMIN, baja lógica segura ya existente).
- **Ventas/DetalleVenta:** `CheckoutServiceTest` ampliado y `OrdenesControllerTest` (cliente existente/POS, múltiples productos, stock insuficiente, snapshot de precio/IVA/subtotal, total, transacción/anulación con reversión de stock, propiedad de órdenes, anulación solo ADMIN).
- **Auth/seguridad:** `AuthControllerTest` (JWT con correo, 401 credenciales inválidas, autoregistro).
- **Carrito:** `CheckoutRequestValidationTest` (sede, ítems, cantidades 1..1000).

### 10.2 Estrés / carga (requieren entorno de ejecución)

Ubicación: [`stress/`](stress/) y `backend/src/test/java/com/tienda/stress/`.

- **`CheckoutConcurrencyStressTest` (JUnit, BD real):** 100 cobros concurrentes / 20 hilos sobre 40 unidades. Verifica 40 éxitos, 60 rechazos por stock insuficiente, **stock final 0 y nunca negativo**. Solo con `RUN_STRESS_TESTS=true` + PostgreSQL.
- **`stress/Stress-Test.ps1` (PowerShell 7):** carga HTTP concurrente contra `POST /api/pos/cobros`; reporta latencia/throughput/estados y valida consistencia de stock (`stock_final == inicial - éxitos`, salida 1 si detecta sobreventa).
- **`stress/k6-checkout.js` (k6):** ramp-up de VUs; `checkout_ok`/`checkout_stock_rechazado`; `teardown` falla si el stock queda negativo. Genera `stress/k6-summary.json`.

Comandos de ejemplo: ver [`docs/PRUEBAS.md`](docs/PRUEBAS.md) y [`stress/README.md`](stress/README.md).

---

## 11. Checklist final

- [x] CRUD de Cliente con correo como usuario, BCrypt, roles y validaciones.
- [x] Restricción de FK al eliminar cliente (RF1.4).
- [x] CRUD de Producto con validaciones y baja lógica segura (RF2.1.1 / RF2.4).
- [x] Venta con cliente existente, múltiples productos, stock, snapshot de precio, total y transacción.
- [x] Listado de ventas con cliente y total.
- [x] Detalle de venta con todos los `DetalleVenta`.
- [x] Anulación de venta con reversión transaccional de stock.
- [x] JWT, BCrypt, roles y reglas de acceso.
- [x] **Pruebas automatizadas** (232, 0 fallos, 2 omitidas intencionales) + cobertura JaCoCo.
- [x] **Pruebas de estrés/carga** (JUnit concurrencia real opcional, PowerShell y k6).
- [x] Backend compila y frontend construye.
- [x] Todo entregado en una sola carpeta: `C:\Users\Tacza\Desktop\Clan-FC-Entrega`.
