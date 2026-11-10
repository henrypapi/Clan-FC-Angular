package com.tienda.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Solicitud de registro PÚBLICO (autoregistro de clientes).
 *
 * El rol asignado siempre es CLIENTE. El CORREO es la credencial de acceso:
 * se copia a {@code username}, por lo que el campo {@code username} es
 * opcional y se mantiene solo por compatibilidad (si viene vacío se usa el
 * correo).
 */
public record RegistroUsuarioRequest(
        @Size(max = 100, message = "El usuario no puede superar 100 caracteres")
        String username,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 100, message = "El correo no puede superar 100 caracteres")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 6, max = 72, message = "La contraseña debe tener entre 6 y 72 caracteres")
        String password, // se hashea con BCrypt

        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 3, max = 120, message = "El nombre debe tener entre 3 y 120 caracteres")
        String nombreCompleto,

        @NotNull(message = "El país es obligatorio")
        Long idPais                                 // país fiscal: define su IVA
) {
}
