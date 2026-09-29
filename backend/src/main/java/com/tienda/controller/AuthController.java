package com.tienda.controller;

import com.tienda.dto.LoginRequest;
import com.tienda.dto.LoginResponse;
import com.tienda.dto.RegistroUsuarioRequest;
import com.tienda.dto.UsuarioResponse;
import com.tienda.model.Usuario;
import com.tienda.repository.UsuarioRepository;
import com.tienda.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import com.tienda.security.JwtService;

/**
 * Autenticación JWT y registro público.
 *
 *  POST /api/auth/login    -> valida credenciales y devuelve JWT Bearer.
 *  POST /api/auth/registro -> AUTOREGISTRO público: crea cuenta CLIENTE con
 *                             país fiscal (define su IVA de consumidor final).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioService usuarioService;
    private final UsuarioRepository usuarioRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        Usuario usuario = usuarioRepository.findByUsernameIgnoreCase(request.username())
                .orElseThrow();
        String token = jwtService.generateToken(usuario);
        var pais = usuario.getPais();

        return new LoginResponse(
                token,
                "Bearer",
                jwtService.getExpirationMs(),
                usuario.getUsername(),
                usuario.getNombreCompleto(),
                usuario.getRol().getNombre(),
                pais != null ? pais.getCodigoIso2() : null,
                pais != null ? pais.getNombre() : null,
                com.tienda.model.Pais.banderaDesde(pais != null ? pais.getCodigoIso2() : null));
    }

    /** Registro PÚBLICO: no requiere sesión; asigna rol CLIENTE. */
    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResponse registrarme(@Valid @RequestBody RegistroUsuarioRequest request) {
        return usuarioService.registrarse(request);
    }
}
