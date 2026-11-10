package com.tienda.security;

import com.tienda.model.Pais;
import com.tienda.model.Rol;
import com.tienda.model.Usuario;
import com.tienda.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Pruebas del puente Usuario -> Spring Security: login por username o correo,
 * traducción del rol a ROLE_* y bloqueo de cuentas desactivadas.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UsuarioDetailsService — Autenticación")
class UsuarioDetailsServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @InjectMocks private UsuarioDetailsService usuarioDetailsService;

    private Usuario cliente;
    private Usuario admin;

    @BeforeEach
    void setUp() {
        Pais peru = Pais.builder().idPais(1L).codigoIso2("PE").nombre("Perú").build();
        cliente = Usuario.builder()
                .idUsuario(1L)
                .rol(Rol.builder().idRol(3L).nombre("CLIENTE").build())
                .username("cliente@test.pe")
                .email("cliente@test.pe")
                .passwordHash("$2a$10$hash")
                .nombreCompleto("Cliente Demo")
                .pais(peru)
                .activo(true)
                .build();
        admin = Usuario.builder()
                .idUsuario(2L)
                .rol(Rol.builder().idRol(1L).nombre("ADMIN").build())
                .username("admin")
                .email("admin@test.pe")
                .passwordHash("$2a$10$hash")
                .nombreCompleto("Admin Demo")
                .pais(peru)
                .activo(true)
                .build();
    }

    @Test
    @DisplayName("Carga un usuario por su username")
    void cargaPorUsername() {
        when(usuarioRepository.findByUsernameIgnoreCase("cliente@test.pe"))
                .thenReturn(Optional.of(cliente));

        UserDetails details = usuarioDetailsService.loadUserByUsername("cliente@test.pe");

        assertThat(details.getUsername()).isEqualTo("cliente@test.pe");
        assertThat(details.getPassword()).isEqualTo("$2a$10$hash");
        assertThat(details.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_CLIENTE");
    }

    @Test
    @DisplayName("Si el username no existe, busca por correo (correo = username)")
    void cargaPorEmail() {
        when(usuarioRepository.findByUsernameIgnoreCase("cliente@test.pe"))
                .thenReturn(Optional.empty());
        when(usuarioRepository.findByEmailIgnoreCase("cliente@test.pe"))
                .thenReturn(Optional.of(cliente));

        UserDetails details = usuarioDetailsService.loadUserByUsername("cliente@test.pe");

        assertThat(details.getUsername()).isEqualTo("cliente@test.pe");
    }

    @Test
    @DisplayName("El rol ADMIN se traduce a ROLE_ADMIN")
    void rolAdmin() {
        when(usuarioRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.of(admin));

        UserDetails details = usuarioDetailsService.loadUserByUsername("admin");

        assertThat(details.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    @DisplayName("Un usuario desactivado no puede autenticarse")
    void usuarioDesactivado() {
        cliente.setActivo(false);
        when(usuarioRepository.findByUsernameIgnoreCase("cliente@test.pe"))
                .thenReturn(Optional.of(cliente));

        assertThatThrownBy(() -> usuarioDetailsService.loadUserByUsername("cliente@test.pe"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("desactivado");
    }

    @Test
    @DisplayName("Un usuario inexistente lanza UsernameNotFoundException")
    void usuarioInexistente() {
        when(usuarioRepository.findByUsernameIgnoreCase("nadie"))
                .thenReturn(Optional.empty());
        when(usuarioRepository.findByEmailIgnoreCase("nadie"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioDetailsService.loadUserByUsername("nadie"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("no encontrado");
    }
}
