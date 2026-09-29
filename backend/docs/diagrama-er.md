# Diagrama entidad–relación (3FN)

```mermaid
erDiagram
    ROLES ||--o{ USUARIOS : asigna
    PAISES ||--o{ USUARIOS : residencia_fiscal
    PAISES ||--o{ EMPRESAS_CLIENTES : tributacion
    PAISES ||--o{ ORDENES : contexto_fiscal
    CATEGORIAS ||--o{ PRODUCTOS : clasifica
    PROVEEDORES ||--o{ PRODUCTOS : suministra
    PRODUCTOS ||--o{ PRODUCTO_SEDE_STOCK : distribuye
    SEDES ||--o{ PRODUCTO_SEDE_STOCK : almacena
    SEDES ||--o{ CAJAS : contiene
    USUARIOS o|--o{ CAJAS : opera
    USUARIOS ||--o{ ORDENES : registra
    EMPRESAS_CLIENTES o|--o{ ORDENES : factura
    ORDENES ||--|{ DETALLE_ORDENES : contiene
    PRODUCTOS ||--o{ DETALLE_ORDENES : vendido_como
    PRODUCTOS ||--o{ MOVIMIENTOS_ALMACEN : afecta
    PROVEEDORES o|--o{ MOVIMIENTOS_ALMACEN : origina
    USUARIOS ||--o{ MOVIMIENTOS_ALMACEN : registra
    PRODUCTOS ||--o{ INCIDENCIAS : reporta
    ORDENES o|--o{ INCIDENCIAS : relacionada
    USUARIOS ||--o{ INCIDENCIAS : informa
    CAJAS ||--o{ CAJA_MOVIMIENTOS : registra
    USUARIOS ||--o{ CAJA_MOVIMIENTOS : ejecuta
    SEDES ||--o{ CAJA_MOVIMIENTOS : ocurre_en

    ROLES {
        bigint id_rol PK
        text nombre UK
        text descripcion
    }
    PAISES {
        bigint id_pais PK
        text codigo_iso2 UK
        text nombre UK
        numeric tasa_iva_general
        numeric tasa_iva_reducido
    }
    USUARIOS {
        bigint id_usuario PK
        bigint id_rol FK
        bigint id_pais FK
        text username UK
        text email UK
        text password_hash
    }
    CATEGORIAS {
        bigint id_categoria PK
        text nombre UK
        boolean activa
    }
    PROVEEDORES {
        bigint id_proveedor PK
        text nombre UK
        text email
    }
    PRODUCTOS {
        bigint id_producto PK
        bigint id_categoria FK
        bigint id_proveedor FK
        text sku UK
        numeric precio_base
        integer stock
    }
    SEDES {
        bigint id_sede PK
        text nombre
        text direccion
    }
    PRODUCTO_SEDE_STOCK {
        bigint id_producto_sede_stock PK
        bigint id_producto FK
        bigint id_sede FK
        integer stock
        integer stock_minimo
    }
    EMPRESAS_CLIENTES {
        bigint id_empresa PK
        bigint id_pais FK
        text rfc UK
        text regimen_fiscal
        numeric tasa_iva
    }
    CAJAS {
        bigint id_caja PK
        bigint id_sede FK
        bigint id_usuario FK
        integer numero_caja
        numeric efectivo
    }
    ORDENES {
        bigint id_orden PK
        bigint id_usuario FK
        bigint id_empresa_cliente FK
        bigint id_pais FK
        text folio UK
        numeric subtotal
        numeric iva
        numeric total
    }
    DETALLE_ORDENES {
        bigint id_detalle PK
        bigint id_orden FK
        bigint id_producto FK
        integer cantidad
        numeric precio_unitario
    }
    MOVIMIENTOS_ALMACEN {
        bigint id_movimiento PK
        bigint id_producto FK
        bigint id_proveedor FK
        bigint id_usuario FK
        text tipo
        integer cantidad
    }
    INCIDENCIAS {
        bigint id_incidencia PK
        bigint id_producto FK
        bigint id_orden FK
        bigint reportado_por FK
        text estado
    }
    CAJA_MOVIMIENTOS {
        bigint id_movimiento PK
        bigint id_caja FK
        bigint id_usuario FK
        bigint id_sede FK
        text tipo
        numeric monto
    }
```

## Justificación de tercera forma normal

- **Primera forma normal:** todos los atributos contienen valores atómicos; los productos de una orden se guardan como filas independientes en `detalle_ordenes`.
- **Segunda forma normal:** cada tabla utiliza una clave primaria simple y sus atributos dependen completamente de ella. La relación producto–sede se resuelve mediante `producto_sede_stock` con unicidad compuesta.
- **Tercera forma normal:** roles, países, categorías, proveedores y sedes se separan en catálogos. Sus datos descriptivos no se repiten en usuarios, productos u órdenes.
- Los campos `sku`, `nombre_producto`, `tasa_iva` e importes de una venta son **instantáneas históricas deliberadas**, no dependencias transitivas: preservan el comprobante aunque cambien el catálogo o las reglas fiscales.
- `caja_movimientos.id_sede` es una dimensión de auditoría explícita para consultas históricas. La sede registrada representa el lugar del evento y no se deriva de la asignación actual de la caja.

El DDL ejecutable se encuentra en [`../database/schema.sql`](../database/schema.sql).
