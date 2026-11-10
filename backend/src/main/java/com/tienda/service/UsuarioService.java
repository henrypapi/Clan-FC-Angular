package com.tienda.service;

import com.tienda.dto.RegistroUsuarioRequest;
import com.tienda.dto.UsuarioResponse;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.model.Pais;
import com.tienda.model.Rol;
import com.tienda.model.Usuario;
import com.tienda.repository.PaisRepository;
import com.tienda.repository.RolRepository;
import com.tienda.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Gestión de cuentas:
 *  - REGISTRO PÚBLICO: cualquiera crea su cuenta; el rol asignado siempre es
 *    CLIENTE y el país elegido define su IVA de consumidor final.
 *  - ALTA DE PERSONAL: solo ADMIN puede crear usuarios CAJERO/ADMIN/CLIENTE
 *    (endpoint /api/usuarios protegido por rol).
 */
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PaisRepository paisRepository;
    private final PasswordEncoder passwordEncoder;

    /** Autoregistro público -> rol CLIENTE obligatorio. El correo es el username. */
    @Transactional
    public UsuarioResponse registrarse(RegistroUsuarioRequest request) {
        return crear(request.email(), request.email(), request.password(),
                request.nombreCompleto(), "CLIENTE", request.idPais());
    }

    /** Alta de usuario por ADMIN (permite roles internos). */
    @Transactional
    public UsuarioResponse crearPorAdmin(RegistroUsuarioRequest request, String rolNombre) {
        // Para CLIENTE el correo es la credencial; el username recibido se ignora.
        String username = "CLIENTE".equalsIgnoreCase(rolNombre)
                ? request.email()
                : (request.username() == null || request.username().isBlank()
                        ? request.email() : request.username());
        return crear(username, request.email(), request.password(),
                request.nombreCompleto(), rolNombre, request.idPais());
    }

    /** Alias usado por los tests y por integraciones previas. */
    @Transactional
    public UsuarioResponse crear(RegistroUsuarioRequest request, String rolNombre) {
        return crearPorAdmin(request, rolNombre);
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtenerPorId(Long idUsuario) {
        return usuarioRepository.findById(idUsuario)
                .map(UsuarioResponse::from)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Usuario no encontrado (id=" + idUsuario + ")"));
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listar() {
        return usuarioRepository.findAll().stream()
                .map(UsuarioResponse::from)
                .toList();
    }

    /**
     * Desactiva una cuenta sin borrar sus relaciones históricas. El ADMIN no
     * puede eliminar otra cuenta ADMIN por este endpoint.
     */
    @Transactional
    public void desactivar(Long idUsuario) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Usuario no encontrado (id=" + idUsuario + ")"));

        if ("ADMIN".equalsIgnoreCase(usuario.getRol().getNombre())) {
            throw new IllegalArgumentException("No se permite desactivar una cuenta ADMIN");
        }

        usuario.setActivo(Boolean.FALSE);
    }

    /* ------------------------------ Privados ------------------------------ */

    private UsuarioResponse crear(String username, String email, String passwordPlano,
                                  String nombreCompleto, String rolNombre, Long idPais) {
        String usernameFinal = (username == null || username.isBlank())
                ? email.trim().toLowerCase(java.util.Locale.ROOT)
                : username.trim();
        // Unicidad amigable (las columnas UNIQUE son la última defensa).
        if (usuarioRepository.existsByUsernameIgnoreCase(usernameFinal))
            throw new DataIntegrityViolationException("El nombre de usuario ya está en uso");
        if (usuarioRepository.existsByEmailIgnoreCase(email.trim()))
            throw new DataIntegrityViolationException("El correo ya está registrado");

        Rol rol = rolRepository.findByNombreIgnoreCase(rolNombre)
                .orElseThrow(() -> new RecursoNoEncontradoException("Rol no encontrado: " + rolNombre));

        Pais pais = paisRepository.findById(idPais)
                .filter(Pais::getActivo)
                .orElseThrow(() -> new RecursoNoEncontradoException("País no encontrado (id=" + idPais + ")"));

        Usuario usuario = Usuario.builder()
                .rol(rol)
                .username(usernameFinal)
                .email(email.trim().toLowerCase())
                // BCrypt con salt aleatoria: nunca se guarda texto plano.
                .passwordHash(passwordEncoder.encode(passwordPlano))
                .nombreCompleto(nombreCompleto.trim())
                .pais(pais)
                .activo(Boolean.TRUE)
                .build();

        return UsuarioResponse.from(usuarioRepository.save(usuario));
    }
}
