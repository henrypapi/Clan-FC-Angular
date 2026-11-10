package com.tienda.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Petición de alta/edición de producto (ADMIN).
 * La validación se aplica automáticamente con @Valid en el controller.
 *
 * RF2.1.1 — Reglas de validación:
 *  - SKU obligatorio, único, 2..40 caracteres.
 *  - Nombre obligatorio, 2..120 caracteres.
 *  - Precio mayor que cero y no negativo.
 *  - Stock y stock mínimo enteros >= 0.
 *  - Categoría y sede obligatorias y existentes.
 *  - Garantía entre 0 y 60 meses.
 */
public record ProductoRequest(
        @NotBlank(message = "El SKU es obligatorio")
        @Size(min = 2, max = 40, message = "El SKU debe tener entre 2 y 40 caracteres")
        String sku,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 120, message = "El nombre debe tener entre 2 y 120 caracteres")
        String nombre,

        @Size(max = 500, message = "La descripción no puede superar 500 caracteres")
        String descripcion,

        @NotNull(message = "El precio es obligatorio")
        @DecimalMin(value = "0.01", message = "El precio debe ser mayor que cero")
        BigDecimal precioBase,

        @NotNull(message = "La sede es obligatoria")
        Long sedeId,

        @NotNull(message = "El stock es obligatorio")
        @PositiveOrZero(message = "El stock no puede ser negativo")
        Integer stock,

        @NotNull(message = "El stock mínimo es obligatorio")
        @PositiveOrZero(message = "El stock mínimo no puede ser negativo")
        Integer stockMinimo,

        @NotNull(message = "La categoría es obligatoria")
        Long categoriaId,

        /** Garantía del fabricante en meses (0-60). */
        @Min(value = 0, message = "La garantía no puede ser negativa")
        @Max(value = 60, message = "La garantía no puede superar 60 meses")
        Integer garantiaMeses,

        /** Proveedor que surte el producto (opcional). */
        Long proveedorId,

        @Size(max = 300, message = "La URL de imagen no puede superar 300 caracteres")
        String imagenUrl,

        Boolean activo
) {
}
