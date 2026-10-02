-- Datos mínimos para desarrollo y para ejecutar la colección Postman.
-- Las cuentas demo se crean desde DataLoader con contraseñas BCrypt.

insert into paises (codigo_iso2, nombre, tasa_iva_general, tasa_iva_reducido)
values
    ('PE', 'Perú', 18.00, 10.00),
    ('CO', 'Colombia', 19.00, 5.00),
    ('MX', 'México', 16.00, 8.00)
on conflict (codigo_iso2) do nothing;

insert into sedes (nombre, direccion, telefono)
select 'Sede Lima Centro', 'Av. Principal 100, Lima', '+51 1 555 0100'
where not exists (select 1 from sedes where nombre = 'Sede Lima Centro');

insert into roles (nombre, descripcion)
values
    ('ADMIN', 'Gestión total del sistema'),
    ('CAJERO', 'Punto de venta, caja y almacén'),
    ('CLIENTE', 'Catálogo, carrito y compras')
on conflict (nombre) do nothing;

insert into categorias (nombre, descripcion)
values
    ('Audio', 'Audífonos, parlantes y accesorios de sonido'),
    ('Accesorios', 'Periféricos y accesorios tecnológicos'),
    ('Gaming', 'Equipos y periféricos para videojuegos')
on conflict (nombre) do nothing;

insert into proveedores (nombre, contacto_nombre, email)
select 'Tech Distribuciones', 'Equipo comercial', 'ventas@techdistribuciones.pe'
where not exists (select 1 from proveedores where nombre = 'Tech Distribuciones');

insert into productos (id_categoria, id_proveedor, sku, nombre, descripcion,
                       precio_base, garantia_meses, imagen_url)
select c.id_categoria, p.id_proveedor, 'AUD-L8-PRO', 'Audífonos L8 Pro',
       'Audífonos Bluetooth con estuche y pantalla táctil', 189.00, 12,
       '/images/products/earbuds-black-main.png'
from categorias c cross join proveedores p
where c.nombre = 'Audio' and p.nombre = 'Tech Distribuciones'
  and not exists (select 1 from productos where sku = 'AUD-L8-PRO');

insert into productos (id_categoria, id_proveedor, sku, nombre, descripcion,
                       precio_base, garantia_meses, imagen_url)
select c.id_categoria, p.id_proveedor, 'ACC-LAP-001', 'Soporte Laptop Aluminio Ajustable',
       'Soporte ergonómico ajustable para laptop', 299.00, 12,
       '/images/catalog/soporte-laptop.jpg'
from categorias c cross join proveedores p
where c.nombre = 'Accesorios' and p.nombre = 'Tech Distribuciones'
  and not exists (select 1 from productos where sku = 'ACC-LAP-001');

insert into producto_sede_stock (id_producto, id_sede, stock, stock_minimo)
select p.id_producto, s.id_sede,
       case when p.sku = 'AUD-L8-PRO' then 24 else 15 end,
       5
from productos p cross join sedes s
where s.nombre = 'Sede Lima Centro'
  and p.sku in ('AUD-L8-PRO', 'ACC-LAP-001')
on conflict (id_producto, id_sede) do nothing;

