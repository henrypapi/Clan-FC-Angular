package com.tienda.validation;

import com.tienda.dto.CheckoutRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de validación del carrito de venta (checkout web y POS).
 */
@DisplayName("CheckoutRequest — Validaciones del carrito")
class CheckoutRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private CheckoutRequest valido() {
        return new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)),
                1L, null, null, "EFECTIVO");
    }

    private Set<String> campos(CheckoutRequest request) {
        return validator.validate(request).stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
    }

    @Test
    @DisplayName("Un carrito válido no tiene violaciones")
    void requestValido() {
        assertThat(campos(valido())).isEmpty();
    }

    @Test
    @DisplayName("El carrito no puede estar vacío")
    void itemsVacio() {
        CheckoutRequest request = new CheckoutRequest(List.of(), 1L, null, null, "EFECTIVO");
        assertThat(campos(request)).contains("items");
    }

    @Test
    @DisplayName("El carrito no puede ser nulo")
    void itemsNulo() {
        CheckoutRequest request = new CheckoutRequest(null, 1L, null, null, "EFECTIVO");
        assertThat(campos(request)).contains("items");
    }

    @Test
    @DisplayName("La sede es obligatoria")
    void sedeNula() {
        CheckoutRequest request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)), null, null, null, "EFECTIVO");
        assertThat(campos(request)).contains("sedeId");
    }

    @Test
    @DisplayName("El método de pago es obligatorio")
    void metodoPagoVacio() {
        CheckoutRequest request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)), 1L, null, null, " ");
        assertThat(campos(request)).contains("metodoPago");
    }

    @Test
    @DisplayName("Cada línea debe referenciar un producto")
    void itemProductoNulo() {
        CheckoutRequest request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(null, 1)), 1L, null, null, "EFECTIVO");
        assertThat(campos(request)).contains("items[0].productoId");
    }

    @Test
    @DisplayName("La cantidad debe ser al menos 1")
    void itemCantidadCero() {
        CheckoutRequest request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 0)), 1L, null, null, "EFECTIVO");
        assertThat(campos(request)).contains("items[0].cantidad");
    }

    @Test
    @DisplayName("La cantidad no puede superar 1000")
    void itemCantidadExcesiva() {
        CheckoutRequest request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1001)), 1L, null, null, "EFECTIVO");
        assertThat(campos(request)).contains("items[0].cantidad");
    }
}
