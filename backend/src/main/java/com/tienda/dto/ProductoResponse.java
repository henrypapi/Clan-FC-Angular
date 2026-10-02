package com.tienda.dto;

import com.tienda.model.Producto;
import com.tienda.model.Proveedor;

import java.math.BigDecimal;

/**
 * Respuesta de producto hacia el frontend.
 * Incluye categoriaNombre, garantía en meses y proveedor para las vistas
 * cliente/POS/admin, sin exponer entidades JPA.
 */
public record ProductoResponse(
        Long idProducto,
        String sku,
        String nombre,
        String descripcion,
        BigDecimal precioBase,
        Integer stock,
        Integer stockMinimo,
        Boolean stockBajo,
        Long categoriaId,
        String categoriaNombre,
        Integer garantiaMeses,
        Long proveedorId,
        String proveedorNombre,
        String imagenUrl,
        Boolean activo
) {
    public static ProductoResponse from(Producto p) {
        return from(p, 0, 0);
    }

    /** El stock proviene de producto_sede_stock, nunca del catálogo productos. */
    public static ProductoResponse from(Producto p, Integer stock, Integer stockMinimo) {
        Proveedor proveedor = p.getProveedor();
        return new ProductoResponse(
                p.getIdProducto(),
                p.getSku(),
                p.getNombre(),
                p.getDescripcion(),
                p.getPrecioBase(),
                stock,
                stockMinimo,
                stock <= stockMinimo,
                p.getCategoria().getIdCategoria(),
                p.getCategoria().getNombre(),
                p.getGarantiaMeses(),
                proveedor != null ? proveedor.getIdProveedor() : null,
                proveedor != null ? proveedor.getNombre() : null,
                p.getImagenUrl(),
                p.getActivo()
        );
    }
}
