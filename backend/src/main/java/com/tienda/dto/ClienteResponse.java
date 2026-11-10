package com.tienda.dto;

import com.tienda.model.Pais;
import com.tienda.model.Usuario;

import java.time.OffsetDateTime;

/**
 * Cliente expuesto a la API. Nunca incluye el hash de la contraseña.
 * {@code correo} es la credencial de acceso (username = correo).
 */
public record ClienteResponse(
        Long idUsuario,
        String correo,
        String username,
        String nombreCompleto,
        String rol,
        Long idPais,
        String paisNombre,
        String banderaEmoji,
        Boolean activo,
        OffsetDateTime fechaCreacion
) {
    public static ClienteResponse from(Usuario u) {
        Pais pais = u.getPais();
        return new ClienteResponse(
                u.getIdUsuario(),
                u.getEmail(),
                u.getUsername(),
                u.getNombreCompleto(),
                u.getRol() != null ? u.getRol().getNombre() : null,
                pais != null ? pais.getIdPais() : null,
                pais != null ? pais.getNombre() : null,
                Pais.banderaDesde(pais != null ? pais.getCodigoIso2() : null),
                u.getActivo(),
                u.getFechaCreacion()
        );
    }
}
