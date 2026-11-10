package com.tienda.service;

import com.tienda.dto.ClienteRequest;
import com.tienda.dto.ClienteResponse;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.model.Pais;
import com.tienda.model.Rol;
import com.tienda.model.Usuario;
import com.tienda.repository.OrdenRepository;
import com.tienda.repository.PaisRepository;
import com.tienda.repository.RolRepository;
import com.tienda.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * CRUD de CLIENTES (RF1).
 *
 * Un cliente es un {@link Usuario} autenticable. El correo se usa como
 * {@code username} (RF de seguridad) y la contraseña se almacena con BCrypt.
 * El rol se expone con la nomenclatura pedida (ROLE_USER / ROLE_ADMIN) y se
 * traduce a la nomenclatura interna (CLIENTE / ADMIN / CAJERO).
 */
@Service
@RequiredArgsConstructor
public class ClienteService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PaisRepository paisRepository;
    private final OrdenRepository ordenRepository;
    private final PasswordEncoder passwordEncoder;

    /* ------------------------------- READ -------------------------------- */

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar(String filtro, boolean incluirPersonal) {
        // Sin "incluirPersonal" se listan las cuentas de cliente: CLIENTE
        // (ROLE_USER) y ADMIN (ROLE_ADMIN), que son los dos roles que el
        // requisito permite asignar a un cliente.
        List<Usuario> usuarios = incluirPersonal
                ? usuarioRepository.findAllByOrderByNombreCompletoAsc()
                : usuarioRepository.findAllByRolNombreInOrderByNombreCompletoAsc(
                        List.of("CLIENTE", "ADMIN"));

        if (filtro == null || filtro.isBlank()) {
            return usuarios.stream().map(ClienteResponse::from).toList();
        }
        String texto = filtro.trim().toLowerCase(Locale.ROOT);
        return usuarios.stream()
                .filter(u -> contiene(u.getNombreCompleto(), texto)
                        || contiene(u.getEmail(), texto)
                        || contiene(u.getUsername(), texto))
                .map(ClienteResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse obtenerPorId(Long id) {
        return ClienteResponse.from(buscar(id));
    }

    /* ------------------------------ CREATE ------------------------------- */

    @Transactional
    public ClienteResponse crear(ClienteRequest request) {
        String correo = normalizarCorreo(request.correo());
        if (request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("La contraseña es obligatoria para crear el cliente");
        }

        if (usuarioRepository.existsByEmailIgnoreCase(correo)
                || usuarioRepository.existsByUsernameIgnoreCase(correo)) {
            throw new IllegalArgumentException("El correo " + correo + " ya está registrado");
        }

        Rol rol = resolverRol(request.rol());
        Pais pais = resolverPais(request.idPais());

        Usuario usuario = Usuario.builder()
                .rol(rol)
                // El correo ES el nombre de usuario (credencial de login).
                .username(correo)
                .email(correo)
                // BCrypt con salt aleatoria: nunca se guarda texto plano.
                .passwordHash(passwordEncoder.encode(request.password()))
                .nombreCompleto(request.nombreCompleto().trim())
                .pais(pais)
                .activo(request.activo() == null || request.activo())
                .build();

        return ClienteResponse.from(usuarioRepository.save(usuario));
    }

    /* ------------------------------ UPDATE ------------------------------- */

    @Transactional
    public ClienteResponse actualizar(Long id, ClienteRequest request) {
        Usuario usuario = buscar(id);
        String correo = normalizarCorreo(request.correo());

        if (usuarioRepository.existsByEmailIgnoreCaseAndIdUsuarioNot(correo, id)
                || usuarioRepository.existsByUsernameIgnoreCaseAndIdUsuarioNot(correo, id)) {
            throw new IllegalArgumentException("El correo " + correo + " ya está registrado");
        }

        usuario.setEmail(correo);
        usuario.setUsername(correo);
        usuario.setNombreCompleto(request.nombreCompleto().trim());
        Rol nuevoRol = resolverRol(request.rol());
        // No dejar el sistema sin administradores al degradar al último ADMIN.
        if ("ADMIN".equalsIgnoreCase(usuario.getRol().getNombre())
                && !"ADMIN".equalsIgnoreCase(nuevoRol.getNombre())
                && usuarioRepository.countByRolNombreIgnoreCase("ADMIN") <= 1) {
            throw new IllegalArgumentException(
                    "No se puede quitar el rol al último administrador del sistema");
        }
        usuario.setRol(nuevoRol);
        usuario.setPais(resolverPais(request.idPais()));
        if (request.activo() != null) {
            usuario.setActivo(request.activo());
        }
        // Contraseña opcional: en edición, blank = conservar la actual.
        if (request.password() != null && !request.password().isBlank()) {
            usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        return ClienteResponse.from(usuarioRepository.save(usuario));
    }

    /* ------------------------------ DELETE ------------------------------- */

    /**
     * RF1.4 — Restricción de clave foránea.
     *
     * No se permite borrar físicamente un cliente que ya tiene ventas
     * (ordenes.id_usuario es FK con ON DELETE RESTRICT). En ese caso se
     * devuelve un 409 explicativo y se sugiere desactivarlo. Si no tiene
     * referencias, se elimina de verdad.
     */
    @Transactional
    public void eliminar(Long id) {
        Usuario usuario = buscar(id);

        if ("ADMIN".equalsIgnoreCase(usuario.getRol().getNombre())
                && usuarioRepository.countByRolNombreIgnoreCase("ADMIN") <= 1) {
            throw new IllegalArgumentException("No se puede eliminar el último administrador del sistema");
        }

        long ventas = ordenRepository.countByUsuarioIdUsuario(id);
        if (ventas > 0) {
            throw new IllegalArgumentException(
                    "No se puede eliminar al cliente porque tiene " + ventas
                            + " venta(s) asociada(s). Desactívelo en lugar de borrarlo (RF1.4).");
        }

        try {
            usuarioRepository.delete(usuario);
        } catch (DataIntegrityViolationException ex) {
            // Otras FK (cajas, movimientos, incidencias) también protegen el histórico.
            throw new IllegalArgumentException(
                    "No se puede eliminar al cliente: está referenciado por otros registros del sistema. "
                            + "Desactívelo en lugar de borrarlo (RF1.4).");
        }
    }

    /* ------------------------------ Privados ----------------------------- */

    private Usuario buscar(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Cliente no encontrado (id=" + id + ")"));
    }

    private String normalizarCorreo(String correo) {
        return correo.trim().toLowerCase(Locale.ROOT);
    }

    /** ROLE_USER -> CLIENTE · ROLE_ADMIN -> ADMIN · CAJERO se conserva. */
    private Rol resolverRol(String rolSolicitado) {
        String nombre = switch (rolSolicitado.trim().toUpperCase(Locale.ROOT)) {
            case "ROLE_ADMIN", "ADMIN" -> "ADMIN";
            case "ROLE_USER", "USER", "CLIENTE" -> "CLIENTE";
            case "CAJERO" -> "CAJERO";
            default -> throw new IllegalArgumentException("Rol no permitido: " + rolSolicitado);
        };
        return rolRepository.findByNombreIgnoreCase(nombre)
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol no encontrado: " + nombre));
    }

    private Pais resolverPais(Long idPais) {
        if (idPais == null) {
            throw new IllegalArgumentException("El país es obligatorio");
        }
        return paisRepository.findById(idPais)
                .filter(Pais::getActivo)
                .orElseThrow(() -> new RecursoNoEncontradoException("País no encontrado (id=" + idPais + ")"));
    }

    private boolean contiene(String valor, String texto) {
        return valor != null && valor.toLowerCase(Locale.ROOT).contains(texto);
    }
}
