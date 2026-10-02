# TiendaMenos

Aplicación de comercio y gestión con frontend Angular y API REST Spring Boot.

## Backend y entregables académicos

La guía completa de instalación del backend, autenticación JWT y pruebas está
en [`backend/README.md`](backend/README.md).

- Diagrama ER en 3FN: [`backend/docs/diagrama-er.md`](backend/docs/diagrama-er.md)
- DDL PostgreSQL: [`backend/database/schema.sql`](backend/database/schema.sql)
- Migración segura desde la versión anterior: [`backend/database/migration_v2_normalizacion.sql`](backend/database/migration_v2_normalizacion.sql)
- Colección Postman: [`backend/postman/TiendaMenos-API.postman_collection.json`](backend/postman/TiendaMenos-API.postman_collection.json)

## Frontend

Frontend de **TiendaMenos**, desarrollado con **Angular**.
La aplicación está orientada a la gestión de productos, catálogo, carrito de compras y administración.

## Requisitos

* Node.js
* npm
* Angular

## Instalación

```bash
cd frontend/Clan-FC
npm install
```

## Ejecución

```bash
npm start
```

La aplicación estará disponible en:

```text
http://localhost:4200
```

## Tecnologías

* Angular
* TypeScript
* Tailwind CSS
* RxJS

## Estructura

* `src/app/` — Páginas y componentes.
* `src/core/` — Servicios y configuración.
* `public/` — Recursos y datos de prueba.
* `src/app/app.routes.ts` — Rutas y protección por roles.

## Funcionalidades actuales

* Catálogo de productos.
* Búsqueda de productos.
* Filtros por categoría.
* Ordenamiento por precio y popularidad.
* Carrito de compras persistente.
* Control de cantidades según stock.
* Proceso de checkout.
* Panel administrativo.
* Gestión visual de inventario.
* Rutas públicas y protegidas.
* Control de acceso mediante roles.
* Notificaciones mediante Toast.
* Diseño responsive.

## Datos de prueba

El frontend utiliza `mock_data.json` por defecto para facilitar la demostración
visual sin dependencias. El backend crea cuentas demo `admin`, `cajero` y
`cliente`; las contraseñas están documentadas en `backend/README.md`.

Para autenticar el frontend contra la API JWT, cambia `USE_API` a `true` en
`frontend/Clan-FC/src/core/config.ts` y ejecuta ambos proyectos.

## Pendientes

* Reemplazar los datos mock por datos provenientes de la API.
* Completar la integración de productos y categorías mediante la API.
* Integrar completamente el proceso de pedidos con el backend.

## Estado del frontend

El frontend cuenta con la interfaz y funcionalidades principales. El inicio de
sesión ya admite JWT al activar la API; la migración del catálogo y los pedidos
desde los datos mock hacia PostgreSQL sigue siendo incremental.
