package com.tienda.controller;

import com.tienda.config.SecurityConfig;
import com.tienda.dto.LoginRequest;
import com.tienda.dto.RegistroUsuarioRequest;
import com.tienda.dto.UsuarioResponse;
import com.tienda.model.Pais;
import com.tienda.model.Rol;
import com.tienda.model.Usuario;
import com.tienda.repository.UsuarioRepository;
import com.tienda.security.JwtService;
import com.tienda.security.UsuarioDetailsService;
import com.tienda.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas del login JWT (incluye login por correo) y del autoregistro público.
 */
@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@DisplayName("AuthController — Login JWT y registro")
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private UsuarioService usuarioService;
    @MockitoBean private UsuarioRepository usuarioRepository;
    @MockitoBean private AuthenticationManager authenticationManager;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UsuarioDetailsService usuarioDetailsService;

    private Usuario cliente() {
        Pais peru = Pais.builder().idPais(1L).codigoIso2("PE").nombre("Perú").build();
        return Usuario.builder()
                .idUsuario(1L)
                .rol(Rol.builder().idRol(3L).nombre("CLIENTE").build())
                .username("cliente@test.pe")
                .email("cliente@test.pe")
                .passwordHash("$2a$10$hash")
                .nombreCompleto("Cliente Demo")
                .pais(peru)
                .activo(true)
                .build();
    }

    @Test
    @DisplayName("Login con correo devuelve JWT y datos del usuario")
    void loginConCorreoDevuelveToken() throws Exception {
        Usuario usuario = cliente();
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken("cliente@test.pe", null));
        when(usuarioRepository.findByUsernameIgnoreCase("cliente@test.pe"))
                .thenReturn(Optional.empty());
        when(usuarioRepository.findByEmailIgnoreCase("cliente@test.pe"))
                .thenReturn(Optional.of(usuario));
        when(jwtService.generateToken(usuario)).thenReturn("jwt-token");
        when(jwtService.getExpirationMs()).thenReturn(3_600_000L);

        LoginRequest request = new LoginRequest("cliente@test.pe", "secreto123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", is("jwt-token")))
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.rol", is("CLIENTE")))
                .andExpect(jsonPath("$.paisCodigo", is("PE")));
    }

    @Test
    @DisplayName("Credenciales inválidas devuelven 401")
    void loginCredencialesInvalidas() throws Exception {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad credentials"));

        LoginRequest request = new LoginRequest("cliente@test.pe", "incorrecta");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("Credenciales inválidas")));
    }

    @Test
    @DisplayName("El autoregistro público crea una cuenta CLIENTE")
    void registroPublico() throws Exception {
        UsuarioResponse respuesta = new UsuarioResponse(
                20L, "nuevo@test.pe", "nuevo@test.pe", "Nuevo Cliente",
                "CLIENTE", 1L, "Perú", "🇵🇪", true);
        when(usuarioService.registrarse(any())).thenReturn(respuesta);

        RegistroUsuarioRequest request = new RegistroUsuarioRequest(
                null, "nuevo@test.pe", "secreto123", "Nuevo Cliente", 1L);

        mockMvc.perform(post("/api/auth/registro")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email", is("nuevo@test.pe")))
                .andExpect(jsonPath("$.rol", is("CLIENTE")));
    }
}
