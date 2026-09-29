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

