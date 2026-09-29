# TiendaMenos - Frontend

Frontend de **TiendaMenos**, desarrollado con **Angular**.
La aplicación está orientada a la gestión de productos, catálogo, carrito de compras y administración.

## Requisitos

* Node.js
* npm
* Angular

## Instalación

```bash
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

Actualmente el proyecto utiliza `mock_data.json` y almacenamiento local para determinadas operaciones.

**No hay usuarios de prueba registrados actualmente.**

## Pendientes

* Conectar el frontend con la API real del backend.
* Reemplazar los datos mock por datos provenientes de la API.
* Completar la integración de productos y categorías mediante la API.
* Integrar completamente el proceso de pedidos con el backend.
* Configurar usuarios reales provenientes del sistema de autenticación del backend.

## Estado del proyecto

El frontend cuenta con la interfaz y funcionalidades principales implementadas, pero **la integración completa con el backend/API todavía está pendiente**.
