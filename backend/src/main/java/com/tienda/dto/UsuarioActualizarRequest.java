package com.tienda.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Petición de edición de usuario desde el panel ADMIN.
 * La contraseña es opcional: si viene vacía o nula, se preserva la actual.
 */
public record UsuarioActualizarRequest(
        @Size(max = 50) String username,
        @NotBlank @Email @Size(max = 100) String email,
        @Size(max = 100) String password,
        @NotBlank @Size(max = 120) String nombreCompleto,
        Long idPais,
        String rol,
        Boolean activo
) {}
