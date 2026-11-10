package com.tienda.validation;

import com.tienda.dto.ProductoRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de las reglas de validación RF2.1.1 del alta/edición de productos.
 */
@DisplayName("ProductoRequest — Validaciones RF2.1.1")
class ProductoRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private ProductoRequest valido() {
        return new ProductoRequest(
                "SKU-001", "Producto de prueba", "Descripción",
                new BigDecimal("10.00"), 1L, 10, 5, 1L, 12, null, null, true);
    }

    private Set<String> campos(ProductoRequest request) {
        return validator.validate(request).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    @DisplayName("Un request completo no tiene violaciones")
    void requestValido() {
        assertThat(campos(valido())).isEmpty();
    }

    @Test
    @DisplayName("El SKU debe tener entre 2 y 40 caracteres")
    void skuCorto() {
        ProductoRequest request = new ProductoRequest(
                "A", "Producto", null, new BigDecimal("10.00"), 1L, 10, 5, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("sku");
    }

    @Test
    @DisplayName("El SKU no puede superar 40 caracteres")
    void skuLargo() {
        ProductoRequest request = new ProductoRequest(
                "A".repeat(41), "Producto", null, new BigDecimal("10.00"), 1L, 10, 5, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("sku");
    }

    @Test
    @DisplayName("El nombre debe tener entre 2 y 120 caracteres")
    void nombreCorto() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "A", null, new BigDecimal("10.00"), 1L, 10, 5, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("nombre");
    }

    @Test
    @DisplayName("El nombre no puede superar 120 caracteres")
    void nombreLargo() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "A".repeat(121), null, new BigDecimal("10.00"), 1L, 10, 5, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("nombre");
    }

    @Test
    @DisplayName("La descripción no puede superar 500 caracteres")
    void descripcionLarga() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "Producto", "A".repeat(501),
                new BigDecimal("10.00"), 1L, 10, 5, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("descripcion");
    }

    @Test
    @DisplayName("El precio es obligatorio")
    void precioNulo() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "Producto", null, null, 1L, 10, 5, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("precioBase");
    }

    @Test
    @DisplayName("El precio debe ser mayor que cero")
    void precioCeroONegativo() {
        ProductoRequest cero = new ProductoRequest(
                "SKU-001", "Producto", null, BigDecimal.ZERO, 1L, 10, 5, 1L, 12, null, null, true);
        ProductoRequest negativo = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("-1.00"), 1L, 10, 5, 1L, 12, null, null, true);

        assertThat(campos(cero)).contains("precioBase");
        assertThat(campos(negativo)).contains("precioBase");
    }

    @Test
    @DisplayName("La sede y la categoría son obligatorias")
    void sedeYCategoriaObligatorias() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("10.00"), null, 10, 5, null, 12, null, null, true);
        assertThat(campos(request)).contains("sedeId", "categoriaId");
    }

    @Test
    @DisplayName("El stock y stock mínimo no pueden ser negativos")
    void stockNegativo() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("10.00"), 1L, -1, -1, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("stock", "stockMinimo");
    }

    @Test
    @DisplayName("El stock es obligatorio")
    void stockNulo() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("10.00"), 1L, null, 5, 1L, 12, null, null, true);
        assertThat(campos(request)).contains("stock");
    }

    @Test
    @DisplayName("La garantía debe estar entre 0 y 60 meses")
    void garantiaFueraDeRango() {
        ProductoRequest negativa = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("10.00"), 1L, 10, 5, 1L, -1, null, null, true);
        ProductoRequest excesiva = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("10.00"), 1L, 10, 5, 1L, 61, null, null, true);

        assertThat(campos(negativa)).contains("garantiaMeses");
        assertThat(campos(excesiva)).contains("garantiaMeses");
    }

    @Test
    @DisplayName("La URL de imagen no puede superar 300 caracteres")
    void imagenLarga() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("10.00"), 1L, 10, 5, 1L, 12, null,
                "A".repeat(301), true);
        assertThat(campos(request)).contains("imagenUrl");
    }

    @Test
    @DisplayName("Garantía nula y activo nulo son válidos (valores por defecto)")
    void camposOpcionalesNulos() {
        ProductoRequest request = new ProductoRequest(
                "SKU-001", "Producto", null, new BigDecimal("10.00"), 1L, 10, 5, 1L, null, null, null, null);
        assertThat(campos(request)).isEmpty();
    }
}
