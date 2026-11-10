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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Pruebas unitarias del CRUD de Clientes (RF1).
 *
 * Cubre: correo como username, BCrypt, roles ROLE_USER/ROLE_ADMIN,
 * validaciones de negocio y restricción de borrado por FK (RF1.4).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ClienteService — Unit Tests (RF1)")
class ClienteServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RolRepository rolRepository;
    @Mock private PaisRepository paisRepository;
    @Mock private OrdenRepository ordenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private ClienteService clienteService;

    private Rol rolCliente;
    private Rol rolAdmin;
    private Pais peru;
    private Usuario cliente;
    private ClienteRequest requestValido;

    @BeforeEach
    void setUp() {
        rolCliente = Rol.builder().idRol(3L).nombre("CLIENTE").build();
        rolAdmin = Rol.builder().idRol(1L).nombre("ADMIN").build();
        peru = Pais.builder()
                .idPais(1L).codigoIso2("PE").nombre("Perú")
                .tasaIvaGeneral(new BigDecimal("18.00"))
                .tasaIvaReducido(new BigDecimal("18.00"))
                .activo(true).build();
        cliente = Usuario.builder()
                .idUsuario(10L).rol(rolCliente)
                .username("cliente@test.pe").email("cliente@test.pe")
                .passwordHash("$2a$10$old").nombreCompleto("Cliente Test")
                .pais(peru).activo(true).build();
        requestValido = new ClienteRequest(
                "Cliente Nuevo", "Nuevo@Test.PE", "secreto123", "ROLE_USER", 1L, true);
    }

    /* ------------------------------ CREATE ------------------------------ */

    @Test
    @DisplayName("Crear cliente: correo = username y contraseña BCrypt")
    void crearClienteUsaCorreoComoUsernameYHasheaPassword() {
        when(usuarioRepository.existsByEmailIgnoreCase("nuevo@test.pe")).thenReturn(false);
        when(usuarioRepository.existsByUsernameIgnoreCase("nuevo@test.pe")).thenReturn(false);
        when(rolRepository.findByNombreIgnoreCase("CLIENTE")).thenReturn(Optional.of(rolCliente));
        when(paisRepository.findById(1L)).thenReturn(Optional.of(peru));
        when(passwordEncoder.encode("secreto123")).thenReturn("$2a$10$hash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setIdUsuario(20L);
            return u;
        });

        ClienteResponse respuesta = clienteService.crear(requestValido);

        assertThat(respuesta.correo()).isEqualTo("nuevo@test.pe");
        assertThat(respuesta.username()).isEqualTo("nuevo@test.pe");
        assertThat(respuesta.rol()).isEqualTo("CLIENTE");
        assertThat(respuesta.activo()).isTrue();

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(captor.capture());
        Usuario guardado = captor.getValue();
        assertThat(guardado.getUsername()).isEqualTo("nuevo@test.pe");
        assertThat(guardado.getEmail()).isEqualTo("nuevo@test.pe");
        assertThat(guardado.getPasswordHash()).isEqualTo("$2a$10$hash");
        assertThat(guardado.getNombreCompleto()).isEqualTo("Cliente Nuevo");
        assertThat(guardado.getRol()).isSameAs(rolCliente);
    }

    @Test
    @DisplayName("Crear cliente con ROLE_ADMIN asigna el rol ADMIN")
    void crearClienteConRolAdmin() {
        ClienteRequest request = new ClienteRequest(
                "Admin Nuevo", "admin2@test.pe", "secreto123", "ROLE_ADMIN", 1L, true);

        when(usuarioRepository.existsByEmailIgnoreCase("admin2@test.pe")).thenReturn(false);
        when(usuarioRepository.existsByUsernameIgnoreCase("admin2@test.pe")).thenReturn(false);
        when(rolRepository.findByNombreIgnoreCase("ADMIN")).thenReturn(Optional.of(rolAdmin));
        when(paisRepository.findById(1L)).thenReturn(Optional.of(peru));
        when(passwordEncoder.encode("secreto123")).thenReturn("$2a$10$hash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        ClienteResponse respuesta = clienteService.crear(request);

        assertThat(respuesta.rol()).isEqualTo("ADMIN");
        verify(rolRepository).findByNombreIgnoreCase("ADMIN");
    }

    @Test
    @DisplayName("Crear cliente con correo duplicado devuelve error de negocio")
    void crearClienteCorreoDuplicado() {
        when(usuarioRepository.existsByEmailIgnoreCase("nuevo@test.pe")).thenReturn(true);

        assertThatThrownBy(() -> clienteService.crear(requestValido))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya está registrado");

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Crear cliente sin contraseña es rechazado")
    void crearClienteSinPassword() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", "   ", "ROLE_USER", 1L, true);

        assertThatThrownBy(() -> clienteService.crear(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("contraseña es obligatoria");

        verifyNoInteractions(usuarioRepository, rolRepository, paisRepository, passwordEncoder);
    }

    @Test
    @DisplayName("Crear cliente con rol no permitido es rechazado")
    void crearClienteRolInvalido() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", "secreto123", "SUPERADMIN", 1L, true);

        when(usuarioRepository.existsByEmailIgnoreCase("nuevo@test.pe")).thenReturn(false);
        when(usuarioRepository.existsByUsernameIgnoreCase("nuevo@test.pe")).thenReturn(false);

        assertThatThrownBy(() -> clienteService.crear(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Rol no permitido");
    }

    @Test
    @DisplayName("Crear cliente con país inexistente devuelve 404 de negocio")
    void crearClientePaisInexistente() {
        when(usuarioRepository.existsByEmailIgnoreCase("nuevo@test.pe")).thenReturn(false);
        when(usuarioRepository.existsByUsernameIgnoreCase("nuevo@test.pe")).thenReturn(false);
        when(rolRepository.findByNombreIgnoreCase("CLIENTE")).thenReturn(Optional.of(rolCliente));
        when(paisRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clienteService.crear(requestValido))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("País no encontrado");
    }

    /* ------------------------------ UPDATE ------------------------------ */

    @Test
    @DisplayName("Editar sin contraseña conserva el hash BCrypt actual")
    void actualizarSinPasswordConservaHash() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Editado", "cliente@test.pe", "", "ROLE_USER", 1L, true);

        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cliente));
        when(usuarioRepository.existsByEmailIgnoreCaseAndIdUsuarioNot("cliente@test.pe", 10L))
                .thenReturn(false);
        when(usuarioRepository.existsByUsernameIgnoreCaseAndIdUsuarioNot("cliente@test.pe", 10L))
                .thenReturn(false);
        when(rolRepository.findByNombreIgnoreCase("CLIENTE")).thenReturn(Optional.of(rolCliente));
        when(paisRepository.findById(1L)).thenReturn(Optional.of(peru));
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        ClienteResponse respuesta = clienteService.actualizar(10L, request);

        assertThat(cliente.getPasswordHash()).isEqualTo("$2a$10$old");
        assertThat(respuesta.nombreCompleto()).isEqualTo("Cliente Editado");
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    @DisplayName("Editar con contraseña nueva vuelve a hashear con BCrypt")
    void actualizarConPasswordRehashea() {
        ClienteRequest request = new ClienteRequest(
                "Cliente Editado", "cliente@test.pe", "nueva123", "ROLE_USER", 1L, true);

        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cliente));
        when(usuarioRepository.existsByEmailIgnoreCaseAndIdUsuarioNot("cliente@test.pe", 10L))
                .thenReturn(false);
        when(usuarioRepository.existsByUsernameIgnoreCaseAndIdUsuarioNot("cliente@test.pe", 10L))
                .thenReturn(false);
        when(rolRepository.findByNombreIgnoreCase("CLIENTE")).thenReturn(Optional.of(rolCliente));
        when(paisRepository.findById(1L)).thenReturn(Optional.of(peru));
        when(passwordEncoder.encode("nueva123")).thenReturn("$2a$10$new");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        clienteService.actualizar(10L, request);

        assertThat(cliente.getPasswordHash()).isEqualTo("$2a$10$new");
        verify(passwordEncoder).encode("nueva123");
    }

    @Test
    @DisplayName("Editar con correo de otro cliente es rechazado")
    void actualizarCorreoDeOtroCliente() {
        ClienteRequest request = new ClienteRequest(
                "Cliente", "otro@test.pe", null, "ROLE_USER", 1L, true);

        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cliente));
        when(usuarioRepository.existsByEmailIgnoreCaseAndIdUsuarioNot("otro@test.pe", 10L))
                .thenReturn(true);

        assertThatThrownBy(() -> clienteService.actualizar(10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya está registrado");
    }

    @Test
    @DisplayName("No se puede degradar al último administrador")
    void actualizarUltimoAdminNoPuedeDegradar() {
        Usuario admin = Usuario.builder()
                .idUsuario(1L).rol(rolAdmin).username("admin").email("admin@test.pe")
                .passwordHash("x").nombreCompleto("Admin").pais(peru).activo(true).build();
        ClienteRequest request = new ClienteRequest(
                "Admin", "admin@test.pe", null, "ROLE_USER", 1L, true);

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(usuarioRepository.existsByEmailIgnoreCaseAndIdUsuarioNot("admin@test.pe", 1L))
                .thenReturn(false);
        when(usuarioRepository.existsByUsernameIgnoreCaseAndIdUsuarioNot("admin@test.pe", 1L))
                .thenReturn(false);
        when(rolRepository.findByNombreIgnoreCase("CLIENTE")).thenReturn(Optional.of(rolCliente));
        when(usuarioRepository.countByRolNombreIgnoreCase("ADMIN")).thenReturn(1L);

        assertThatThrownBy(() -> clienteService.actualizar(1L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("último administrador");
    }

    /* ------------------------------ DELETE ------------------------------ */

    @Test
    @DisplayName("RF1.4: no se puede eliminar un cliente con ventas")
    void eliminarClienteConVentas() {
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cliente));
        when(ordenRepository.countByUsuarioIdUsuario(10L)).thenReturn(3L);

        assertThatThrownBy(() -> clienteService.eliminar(10L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("venta(s)");

        verify(usuarioRepository, never()).delete(any());
    }

    @Test
    @DisplayName("No se puede eliminar al último administrador")
    void eliminarUltimoAdmin() {
        Usuario admin = Usuario.builder()
                .idUsuario(1L).rol(rolAdmin).username("admin").email("admin@test.pe")
                .passwordHash("x").nombreCompleto("Admin").pais(peru).activo(true).build();

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(admin));
        when(usuarioRepository.countByRolNombreIgnoreCase("ADMIN")).thenReturn(1L);

        assertThatThrownBy(() -> clienteService.eliminar(1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("último administrador");

        verify(ordenRepository, never()).countByUsuarioIdUsuario(anyLong());
    }

    @Test
    @DisplayName("Cliente sin ventas se elimina físicamente")
    void eliminarClienteSinVentas() {
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cliente));
        when(ordenRepository.countByUsuarioIdUsuario(10L)).thenReturn(0L);

        clienteService.eliminar(10L);

        verify(usuarioRepository).delete(cliente);
    }

    @Test
    @DisplayName("RF1.4: otras FK también bloquean el borrado")
    void eliminarClienteConOtraFk() {
        when(usuarioRepository.findById(10L)).thenReturn(Optional.of(cliente));
        when(ordenRepository.countByUsuarioIdUsuario(10L)).thenReturn(0L);
        doThrow(new DataIntegrityViolationException("fk"))
                .when(usuarioRepository).delete(cliente);

        assertThatThrownBy(() -> clienteService.eliminar(10L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("referenciado");
    }

    /* ------------------------------- READ ------------------------------- */

    @Test
    @DisplayName("Listado de clientes incluye CLIENTE y ADMIN, excluye CAJERO")
    void listarClientesSinPersonal() {
        when(usuarioRepository.findAllByRolNombreInOrderByNombreCompletoAsc(
                List.of("CLIENTE", "ADMIN"))).thenReturn(List.of(cliente));

        List<ClienteResponse> resultado = clienteService.listar(null, false);

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).correo()).isEqualTo("cliente@test.pe");
        verify(usuarioRepository).findAllByRolNombreInOrderByNombreCompletoAsc(
                List.of("CLIENTE", "ADMIN"));
    }

    @Test
    @DisplayName("El filtro busca por nombre, correo o username")
    void listarClientesConFiltro() {
        when(usuarioRepository.findAllByRolNombreInOrderByNombreCompletoAsc(
                List.of("CLIENTE", "ADMIN"))).thenReturn(List.of(cliente));

        assertThat(clienteService.listar("test", false)).hasSize(1);
        assertThat(clienteService.listar("zzz", false)).isEmpty();
    }

    @Test
    @DisplayName("incluirPersonal=true lista todos los usuarios")
    void listarConPersonal() {
        when(usuarioRepository.findAllByOrderByNombreCompletoAsc()).thenReturn(List.of(cliente));

        assertThat(clienteService.listar(null, true)).hasSize(1);
        verify(usuarioRepository).findAllByOrderByNombreCompletoAsc();
    }

    @Test
    @DisplayName("Obtener cliente inexistente devuelve 404 de negocio")
    void obtenerClienteInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> clienteService.obtenerPorId(99L))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("Cliente no encontrado");
    }
}
