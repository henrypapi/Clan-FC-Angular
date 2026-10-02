-- TiendaMenos v2: migra una base existente al modelo 3FN sin perder inventario.
-- Ejecutar una sola vez sobre la versión anterior, con una copia de seguridad.

begin;

lock table productos, producto_sede_stock, ordenes, movimientos_almacen in share row exclusive mode;

-- La sede es obligatoria para saber qué inventario atendió cada evento.
alter table ordenes add column if not exists id_sede bigint;
alter table movimientos_almacen add column if not exists id_sede bigint;
alter table incidencias add column if not exists id_sede bigint;

update ordenes
set id_sede = (select id_sede from sedes order by id_sede limit 1)
where id_sede is null;

update movimientos_almacen
set id_sede = (select id_sede from sedes order by id_sede limit 1)
where id_sede is null;

update incidencias
set id_sede = (select id_sede from sedes order by id_sede limit 1)
where id_sede is null;

do $$
begin
    if not exists (select 1 from sedes) then
        raise exception 'Debe existir al menos una sede antes de migrar';
    end if;

    if not exists (select 1 from pg_constraint where conname = 'ordenes_id_sede_fkey') then
        alter table ordenes add constraint ordenes_id_sede_fkey
            foreign key (id_sede) references sedes(id_sede) on update restrict on delete restrict;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'movimientos_almacen_id_sede_fkey') then
        alter table movimientos_almacen add constraint movimientos_almacen_id_sede_fkey
            foreign key (id_sede) references sedes(id_sede) on update restrict on delete restrict;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'incidencias_id_sede_fkey') then
        alter table incidencias add constraint incidencias_id_sede_fkey
            foreign key (id_sede) references sedes(id_sede) on update restrict on delete restrict;
    end if;
end $$;

alter table ordenes alter column id_sede set not null;
alter table movimientos_almacen alter column id_sede set not null;
alter table incidencias alter column id_sede set not null;

-- Copia el stock global antiguo a la primera sede solo cuando aún no existe
-- una fila producto-sede. Después elimina la fuente de verdad duplicada.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'productos' and column_name = 'stock'
    ) then
        execute $sql$
            insert into producto_sede_stock (id_producto, id_sede, stock, stock_minimo)
            select p.id_producto, s.id_sede, p.stock, p.stock_minimo
            from productos p
            cross join lateral (select id_sede from sedes order by id_sede limit 1) s
            on conflict (id_producto, id_sede) do nothing
        $sql$;
        alter table productos drop column stock;
        alter table productos drop column stock_minimo;
    end if;
end $$;

-- id_sede era transitivamente dependiente de id_caja; la sede se consulta por
-- caja_movimientos.id_caja -> cajas.id_sede.
alter table caja_movimientos drop column if exists id_sede;

-- Reglas que también deben quedar en instalaciones ya existentes.
create unique index if not exists usuarios_username_lower_uk on usuarios (lower(username));
create unique index if not exists usuarios_email_lower_uk on usuarios (lower(email));

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'caja_movimientos_monto_check') then
        alter table caja_movimientos add constraint caja_movimientos_monto_check check (monto >= 0);
    end if;
end $$;

create index if not exists ordenes_id_sede_idx on ordenes (id_sede);
create index if not exists movimientos_id_sede_idx on movimientos_almacen (id_sede);
create index if not exists incidencias_id_sede_idx on incidencias (id_sede);
drop index if exists caja_movimientos_id_sede_idx;

commit;
