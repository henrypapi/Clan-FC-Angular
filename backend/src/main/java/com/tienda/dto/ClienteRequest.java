package com.tienda.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Alta / edición de un CLIENTE (RF1.1.1).
 *
 * En este sistema el "Cliente" es un {@code Usuario} cuyo rol es CLIENTE
 * (ROLE_USER) o, si se indica, ADMIN (ROLE_ADMIN). El correo es la credencial
 * de acceso: se copia a la columna {@code username}, por lo que el login
 * funciona tanto con el correo como con el nombre de usuario.
 *
 * Reglas de validación aplicadas:
 *  - nombreCompleto: obligatorio, 3..120 caracteres.
 *  - correo: obligatorio, formato email, máximo 100, único.
 *  - password: obligatorio al crear (6..72), opcional al editar
 *    (null/blank = conservar la contraseña actual). Se guarda con BCrypt.
 *  - rol: ROLE_USER / ROLE_ADMIN (también se aceptan USER, ADMIN, CLIENTE,
 *    CAJERO para compatibilidad con la nomenclatura interna).
 *  - idPais: obligatorio (define la tasa de IVA de consumidor final).
 */
public record ClienteRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 3, max = 120, message = "El nombre debe tener entre 3 y 120 caracteres")
        String nombreCompleto,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 100, message = "El correo no puede superar 100 caracteres")
        String correo,

        @Size(min = 6, max = 72, message = "La contraseña debe tener entre 6 y 72 caracteres")
        String password,

        @NotBlank(message = "El rol es obligatorio")
        @Pattern(
                regexp = "(?i)ROLE_USER|ROLE_ADMIN|USER|ADMIN|CLIENTE|CAJERO",
                message = "El rol debe ser ROLE_USER o ROLE_ADMIN")
        String rol,

        @NotNull(message = "El país es obligatorio")
        Long idPais,

        Boolean activo
) {
}
