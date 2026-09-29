-- TiendaMenos - Esquema PostgreSQL normalizado (3FN)
-- PostgreSQL 15+

begin;

create table if not exists roles (
    id_rol bigint generated always as identity primary key,
    nombre varchar(30) not null unique,
    descripcion varchar(200),
    constraint roles_nombre_check check (nombre in ('ADMIN', 'CAJERO', 'CLIENTE'))
);

create table if not exists paises (
    id_pais bigint generated always as identity primary key,
    codigo_iso2 varchar(2) not null unique,
    nombre varchar(60) not null unique,
    tasa_iva_general numeric(5,2) not null,
    tasa_iva_reducido numeric(5,2) not null,
    activo boolean not null default true,
    constraint paises_codigo_iso2_check check (codigo_iso2 ~ '^[A-Z]{2}$'),
    constraint paises_iva_general_check check (tasa_iva_general between 0 and 100),
    constraint paises_iva_reducido_check check (tasa_iva_reducido between 0 and 100)
);

create table if not exists categorias (
    id_categoria bigint generated always as identity primary key,
    nombre varchar(80) not null unique,
    descripcion varchar(255),
    activa boolean not null default true,
    fecha_creacion timestamptz not null default now()
);

create table if not exists proveedores (
    id_proveedor bigint generated always as identity primary key,
    nombre varchar(120) not null unique,
    contacto_nombre varchar(120),
    telefono varchar(30),
    email varchar(100),
    activo boolean not null default true,
    fecha_registro timestamptz not null default now()
);

create table if not exists sedes (
    id_sede bigint generated always as identity primary key,
    nombre varchar(80) not null,
    direccion varchar(120),
    telefono varchar(20),
    activa boolean not null default true,
    fecha_creacion timestamptz not null default now()
);

create table if not exists usuarios (
    id_usuario bigint generated always as identity primary key,
    id_rol bigint not null references roles(id_rol) on update restrict on delete restrict,
    id_pais bigint references paises(id_pais) on update restrict on delete set null,
    username varchar(50) not null unique,
    email varchar(100) not null unique,
    password_hash varchar(100) not null,
    nombre_completo varchar(120) not null,
    activo boolean not null default true,
    fecha_creacion timestamptz not null default now(),
    constraint usuarios_username_check check (username ~ '^[A-Za-z0-9._-]{3,50}$')
);

create table if not exists productos (
    id_producto bigint generated always as identity primary key,
    id_categoria bigint not null references categorias(id_categoria) on update restrict on delete restrict,
    id_proveedor bigint references proveedores(id_proveedor) on update restrict on delete set null,
    sku varchar(40) not null unique,
    nombre varchar(120) not null,
    descripcion varchar(500),
    precio_base numeric(12,2) not null,
    stock integer not null default 0,
    stock_minimo integer not null default 5,
    garantia_meses integer not null default 12,
    imagen_url varchar(300),
    activo boolean not null default true,
    fecha_creacion timestamptz not null default now(),
    fecha_actualizacion timestamptz not null default now(),
    constraint productos_precio_check check (precio_base >= 0),
    constraint productos_stock_check check (stock >= 0),
    constraint productos_stock_minimo_check check (stock_minimo >= 0),
    constraint productos_garantia_check check (garantia_meses >= 0)
);

create table if not exists empresas_clientes (
    id_empresa bigint generated always as identity primary key,
    id_pais bigint references paises(id_pais) on update restrict on delete restrict,
    razon_social varchar(150) not null,
    rfc varchar(13) not null unique,
    regimen_fiscal varchar(20) not null,
    tasa_iva numeric(5,2) not null,
    contacto_email varchar(100),
    activo boolean not null default true,
    fecha_registro timestamptz not null default now(),
    constraint empresas_regimen_check check (regimen_fiscal in ('EXENTO', 'GENERAL', 'REDUCIDO')),
    constraint empresas_tasa_iva_check check (tasa_iva between 0 and 100)
);

create table if not exists cajas (
    id_caja bigint generated always as identity primary key,
    id_sede bigint not null references sedes(id_sede) on update restrict on delete restrict,
    id_usuario bigint references usuarios(id_usuario) on update restrict on delete set null,
    numero_caja integer not null default 1,
    efectivo numeric(12,2) not null default 0,
    estado varchar(15) not null default 'CERRADA',
    fecha_creacion timestamptz not null default now(),
    fecha_apertura timestamptz,
    fecha_cierre timestamptz,
    constraint cajas_sede_numero_unique unique (id_sede, numero_caja),
    constraint cajas_numero_check check (numero_caja > 0),
    constraint cajas_efectivo_check check (efectivo >= 0),
    constraint cajas_estado_check check (estado in ('ABIERTA', 'CERRADA', 'HABILITADA'))
);

create table if not exists producto_sede_stock (
    id_producto_sede_stock bigint generated always as identity primary key,
    id_producto bigint not null references productos(id_producto) on update restrict on delete cascade,
    id_sede bigint not null references sedes(id_sede) on update restrict on delete cascade,
    stock integer not null default 0,
    stock_minimo integer not null default 5,
    fecha_actualizacion timestamptz not null default now(),
    constraint producto_sede_stock_unique unique (id_producto, id_sede),
    constraint producto_sede_stock_stock_check check (stock >= 0),
    constraint producto_sede_stock_minimo_check check (stock_minimo >= 0)
);

create table if not exists ordenes (
    id_orden bigint generated always as identity primary key,
    id_usuario bigint not null references usuarios(id_usuario) on update restrict on delete restrict,
    id_empresa_cliente bigint references empresas_clientes(id_empresa) on update restrict on delete set null,
    id_pais bigint references paises(id_pais) on update restrict on delete set null,
    folio varchar(30) not null unique,
    canal varchar(10) not null,
    regimen_fiscal varchar(20) not null,
    tasa_iva numeric(5,2) not null,
    subtotal numeric(12,2) not null,
    iva numeric(12,2) not null,
    total numeric(12,2) not null,
    metodo_pago varchar(20) not null default 'EFECTIVO',
    estado varchar(15) not null default 'PAGADA',
    fecha_creacion timestamptz not null default now(),
    constraint ordenes_canal_check check (canal in ('WEB', 'CAJA')),
    constraint ordenes_regimen_check check (regimen_fiscal in ('EXENTO', 'GENERAL', 'REDUCIDO')),
    constraint ordenes_tasa_iva_check check (tasa_iva between 0 and 100),
    constraint ordenes_importes_check check (subtotal >= 0 and iva >= 0 and total = subtotal + iva),
    constraint ordenes_estado_check check (estado in ('PAGADA', 'CANCELADA'))
);

create table if not exists detalle_ordenes (
    id_detalle bigint generated always as identity primary key,
    id_orden bigint not null references ordenes(id_orden) on update restrict on delete cascade,
    id_producto bigint not null references productos(id_producto) on update restrict on delete restrict,
    sku varchar(40) not null,
    nombre_producto varchar(120) not null,
    cantidad integer not null,
    precio_unitario numeric(12,2) not null,
    iva_linea numeric(12,2) not null,
    subtotal_linea numeric(12,2) not null,
    constraint detalle_cantidad_check check (cantidad > 0),
    constraint detalle_importes_check check (precio_unitario >= 0 and iva_linea >= 0 and subtotal_linea >= 0)
);

create table if not exists movimientos_almacen (
    id_movimiento bigint generated always as identity primary key,
    id_producto bigint not null references productos(id_producto) on update restrict on delete restrict,
    id_proveedor bigint references proveedores(id_proveedor) on update restrict on delete set null,
    id_usuario bigint not null references usuarios(id_usuario) on update restrict on delete restrict,
    tipo varchar(15) not null,
    cantidad integer not null,
    stock_resultante integer not null,
    referencia varchar(60),
    nota varchar(255),
    fecha timestamptz not null default now(),
    constraint movimientos_tipo_check check (tipo in ('ENTRADA', 'SALIDA_VENTA', 'DEVOLUCION', 'MERMA', 'AJUSTE')),
    constraint movimientos_cantidad_check check (cantidad > 0),
    constraint movimientos_stock_check check (stock_resultante >= 0)
);

create table if not exists incidencias (
    id_incidencia bigint generated always as identity primary key,
    id_producto bigint not null references productos(id_producto) on update restrict on delete restrict,
    id_orden bigint references ordenes(id_orden) on update restrict on delete set null,
    reportado_por bigint not null references usuarios(id_usuario) on update restrict on delete restrict,
    tipo varchar(15) not null,
    estado varchar(15) not null default 'REPORTADA',
    cantidad integer not null default 1,
    descripcion varchar(500) not null,
    fecha_reporte timestamptz not null default now(),
    resolucion varchar(500),
    constraint incidencias_tipo_check check (tipo in ('DEVOLUCION', 'DEFECTO', 'GARANTIA')),
    constraint incidencias_estado_check check (estado in ('REPORTADA', 'EN_REVISION', 'RESUELTA', 'CANCELADA')),
    constraint incidencias_cantidad_check check (cantidad > 0)
);

create table if not exists caja_movimientos (
    id_movimiento bigint generated always as identity primary key,
    id_caja bigint not null references cajas(id_caja) on update restrict on delete restrict,
    id_usuario bigint not null references usuarios(id_usuario) on update restrict on delete restrict,
    id_sede bigint not null references sedes(id_sede) on update restrict on delete restrict,
    tipo varchar(20) not null,
    monto numeric(12,2) not null,
    saldo_despues numeric(12,2) not null,
    referencia varchar(100),
    fecha timestamptz not null default now(),
    constraint caja_movimientos_tipo_check check (tipo in ('FONDOS_INICIALES', 'VENTA', 'RETIRO', 'AJUSTE')),
    constraint caja_movimientos_saldo_check check (saldo_despues >= 0)
);

-- PostgreSQL no crea índices automáticamente en las columnas FK.
create index if not exists usuarios_id_rol_idx on usuarios (id_rol);
create index if not exists usuarios_id_pais_idx on usuarios (id_pais);
create index if not exists productos_id_categoria_idx on productos (id_categoria);
create index if not exists productos_id_proveedor_idx on productos (id_proveedor);
create index if not exists productos_activo_categoria_idx on productos (activo, id_categoria);
create index if not exists empresas_id_pais_idx on empresas_clientes (id_pais);
create index if not exists cajas_id_usuario_idx on cajas (id_usuario);
create index if not exists producto_sede_id_sede_idx on producto_sede_stock (id_sede);
create index if not exists ordenes_id_usuario_idx on ordenes (id_usuario);
create index if not exists ordenes_id_empresa_idx on ordenes (id_empresa_cliente);
create index if not exists ordenes_id_pais_idx on ordenes (id_pais);
create index if not exists ordenes_estado_fecha_idx on ordenes (estado, fecha_creacion desc);
create index if not exists detalle_id_orden_idx on detalle_ordenes (id_orden);
create index if not exists detalle_id_producto_idx on detalle_ordenes (id_producto);
create index if not exists movimientos_id_producto_idx on movimientos_almacen (id_producto);
create index if not exists movimientos_id_proveedor_idx on movimientos_almacen (id_proveedor);
create index if not exists movimientos_id_usuario_idx on movimientos_almacen (id_usuario);
create index if not exists incidencias_id_producto_idx on incidencias (id_producto);
create index if not exists incidencias_id_orden_idx on incidencias (id_orden);
create index if not exists incidencias_reportado_por_idx on incidencias (reportado_por);
create index if not exists incidencias_estado_fecha_idx on incidencias (estado, fecha_reporte desc);
create index if not exists caja_movimientos_id_caja_idx on caja_movimientos (id_caja);
create index if not exists caja_movimientos_id_usuario_idx on caja_movimientos (id_usuario);
create index if not exists caja_movimientos_id_sede_idx on caja_movimientos (id_sede);

commit;
