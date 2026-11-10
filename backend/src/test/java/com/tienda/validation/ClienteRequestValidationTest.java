package com.tienda.validation;

import com.tienda.dto.ClienteRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de las reglas de validación RF1.1.1 del alta/edición de clientes.
 */
@DisplayName("ClienteRequest — Validaciones RF1.1.1")
class ClienteRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private ClienteRequest valido() {
        return new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", "secreto123", "ROLE_USER", 1L, true);
    }

    private Set<String> campos(ClienteRequest request) {
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
    @DisplayName("El nombre debe tener al menos 3 caracteres")
    void nombreCorto() {
        ClienteRequest request = new ClienteRequest(
                "A", "nuevo@test.pe", "secreto123", "ROLE_USER", 1L, true);
        assertThat(campos(request)).contains("nombreCompleto");
    }

    @Test
    @DisplayName("El nombre no puede superar 120 caracteres")
    void nombreLargo() {
        ClienteRequest request = new ClienteRequest(
                "A".repeat(121), "nuevo@test.pe", "secreto123", "ROLE_USER", 1L, true);
        assertThat(campos(request)).contains("nombreCompleto");
    }

    @Test
    @DisplayName("El correo debe tener formato de email")
    void correoInvalido() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", "no-es-email", "secreto123", "ROLE_USER", 1L, true);
        assertThat(campos(request)).contains("correo");
    }

    @Test
    @DisplayName("El correo no puede superar 100 caracteres")
    void correoLargo() {
        String correo = "a".repeat(95) + "@test.pe";
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", correo, "secreto123", "ROLE_USER", 1L, true);
        assertThat(campos(request)).contains("correo");
    }

    @Test
    @DisplayName("La contraseña debe tener al menos 6 caracteres")
    void passwordCorta() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", "12345", "ROLE_USER", 1L, true);
        assertThat(campos(request)).contains("password");
    }

    @Test
    @DisplayName("El rol solo admite ROLE_USER / ROLE_ADMIN (y alias internos)")
    void rolInvalido() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", "secreto123", "SUPERADMIN", 1L, true);
        assertThat(campos(request)).contains("rol");
    }

    @Test
    @DisplayName("El país es obligatorio")
    void idPaisNulo() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", "secreto123", "ROLE_USER", null, true);
        assertThat(campos(request)).contains("idPais");
    }

    @Test
    @DisplayName("El correo es obligatorio")
    void correoNulo() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", null, "secreto123", "ROLE_USER", 1L, true);
        assertThat(campos(request)).contains("correo");
    }

    @Test
    @DisplayName("En edición la contraseña puede ser nula (se conserva la actual)")
    void passwordNulaPermitidaEnEdicion() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", null, "ROLE_USER", 1L, true);
        assertThat(campos(request)).doesNotContain("password");
    }
}
