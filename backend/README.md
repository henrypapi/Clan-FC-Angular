# Backend TiendaMenos

API REST de TiendaMenos desarrollada con Java 17, Spring Boot, Spring Security,
JPA/Hibernate, PostgreSQL y autenticación JWT.

## Entregables

- Diagrama ER y justificación de 3FN: [`docs/diagrama-er.md`](docs/diagrama-er.md)
- DDL PostgreSQL: [`database/schema.sql`](database/schema.sql)
- Migración desde el esquema anterior: [`database/migration_v2_normalizacion.sql`](database/migration_v2_normalizacion.sql)
- Datos mínimos de demostración: [`database/seed.sql`](database/seed.sql)
- Colección Postman: [`postman/TiendaMenos-API.postman_collection.json`](postman/TiendaMenos-API.postman_collection.json)
- API REST: controladores en `src/main/java/com/tienda/controller`
- Seguridad JWT con roles `ADMIN`, `CAJERO` y `CLIENTE`

## Requisitos

- Java JDK 17
- PostgreSQL 15 o superior
- Postman (opcional, para probar la API)

No es necesario instalar Maven: el repositorio incluye Maven Wrapper.

## 1. Crear la base de datos

Desde una terminal con PostgreSQL disponible:

```bash
createdb -U postgres tiendamenos
psql -U postgres -d tiendamenos -f database/schema.sql
psql -U postgres -d tiendamenos -f database/seed.sql
```

En pgAdmin se puede crear una base llamada `tiendamenos` y ejecutar, en orden,
el contenido de `schema.sql` y `seed.sql` con Query Tool.

Si ya se creó la base con una versión anterior, primero haga una copia de
seguridad y ejecute:

```bash
psql -U postgres -d tiendamenos -f database/migration_v2_normalizacion.sql
```

El esquema está en tercera forma normal (3FN), usa claves foráneas, restricciones
`CHECK`, índices para las relaciones y tipos `numeric` para valores monetarios.
Hibernate está configurado con `ddl-auto=validate`: valida el modelo, pero no
modifica el esquema entregado.

### Por qué el modelo sí está en 3FN

- `productos` contiene únicamente datos del catálogo; el stock no se repite allí.
- `producto_sede_stock` es la única fuente de inventario y su clave candidata es
  `(id_producto, id_sede)`.
- Toda orden, incidencia y movimiento de almacén identifica la sede afectada.
- `caja_movimientos` referencia la caja y no repite la sede, que se obtiene desde
  `cajas`; así se elimina la dependencia transitiva.
- Claves foráneas, importes, cantidades, estados y tasas tienen restricciones
  `NOT NULL`/`CHECK`, y todas las claves foráneas de consulta tienen índice.

## 2. Configurar variables

Los valores por defecto sirven para PostgreSQL local con usuario y contraseña
`postgres`. Se pueden reemplazar sin editar código.

PowerShell:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/tiendamenos"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "tu_contrasena"
$env:JWT_SECRET = "una_clave_base64_de_al_menos_32_bytes"
```

Bash:

```bash
export DB_URL='jdbc:postgresql://localhost:5432/tiendamenos'
export DB_USERNAME='postgres'
export DB_PASSWORD='tu_contrasena'
export JWT_SECRET='una_clave_base64_de_al_menos_32_bytes'
```

Para generar una clave JWT Base64 segura:

```bash
openssl rand -base64 32
```

La clave incluida en `application.properties` es únicamente para desarrollo.

## 3. Ejecutar el backend

Windows:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Linux/macOS:

```bash
cd backend
./mvnw spring-boot:run
```

La API queda disponible en `http://localhost:8080/api`.

## Usuarios de demostración

Al arrancar, `DataLoader` crea las cuentas si todavía no existen:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| ADMIN | `admin` | `admin123` |
| CAJERO | `cajero` | `cajero123` |
| CLIENTE | `cliente` | `cliente123` |

Estas credenciales son solo para desarrollo.

## Autenticación JWT

Solicitar un token:

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Enviar el valor `token` de la respuesta en las rutas protegidas:

```http
Authorization: Bearer <token>
```

Matriz de acceso principal:

| Recurso | Público | CLIENTE | CAJERO | ADMIN |
| --- | :---: | :---: | :---: | :---: |
| Catálogo GET | Sí | Sí | Sí | Sí |
| Registro y login | Sí | Sí | Sí | Sí |
| Checkout | No | Sí | No | Sí |
| Caja, POS, almacén y reportes | No | No | Sí | Sí |
| Productos, categorías, sedes y usuarios (escritura) | No | No | No | Sí |
| Dashboard | No | No | No | Sí |

El administrador puede crear un cajero con `POST /api/usuarios?rol=CAJERO` y
desactivarlo con `DELETE /api/usuarios/{id}`. La baja es lógica: conserva la
integridad del historial y evita nuevos inicios de sesión.

## Probar con Postman

1. Importar `postman/TiendaMenos-API.postman_collection.json`.
2. Ejecutar uno de los requests `Login`.
3. El script de Postman guarda automáticamente el JWT en `jwt_token`.
4. Ejecutar las solicitudes de la carpeta correspondiente al rol autenticado.

Las variables `producto_id`, `usuario_id` y `sede_id` se pueden modificar en la
colección según los registros existentes.

Las ventas y los movimientos de almacén reciben `sedeId`. Esto evita descontar
un stock global ambiguo y permite auditar exactamente qué sucursal fue afectada.

## Compilar y ejecutar pruebas

```powershell
.\mvnw.cmd test
```

Si Maven no puede escribir en el repositorio global, use uno dentro del proyecto:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=.m2-cache" test
```

Para compilar sin iniciar PostgreSQL:

```powershell
.\mvnw.cmd -DskipTests compile
```

