package com.tienda.controller;

import com.tienda.config.SecurityConfig;
import com.tienda.dto.ClienteRequest;
import com.tienda.dto.ClienteResponse;
import com.tienda.security.JwtService;
import com.tienda.security.UsuarioDetailsService;
import com.tienda.service.ClienteService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.OffsetDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas MVC del CRUD de Clientes (RF1): seguridad ADMIN, validaciones
 * RF1.1.1 y respuestas de error 409/404.
 */
@WebMvcTest(ClienteController.class)
@Import(SecurityConfig.class)
@DisplayName("ClienteController — Integration Tests (RF1)")
class ClienteControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private ClienteService clienteService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UsuarioDetailsService usuarioDetailsService;

    private ClienteResponse respuesta() {
        return new ClienteResponse(
                10L, "cliente@test.pe", "cliente@test.pe", "Cliente Test",
                "CLIENTE", 1L, "Perú", "🇵🇪", true, OffsetDateTime.now());
    }

    private ClienteRequest requestValido() {
        return new ClienteRequest(
                "Cliente Nuevo", "nuevo@test.pe", "secreto123", "ROLE_USER", 1L, true);
    }

    @Test
    @DisplayName("GET /api/clientes como ADMIN lista clientes")
    @WithMockUser(roles = "ADMIN")
    void listarComoAdmin() throws Exception {
        when(clienteService.listar(null, false)).thenReturn(List.of(respuesta()));

        mockMvc.perform(get("/api/clientes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].correo", is("cliente@test.pe")))
                .andExpect(jsonPath("$[0].rol", is("CLIENTE")));
    }

    @Test
    @DisplayName("GET /api/clientes sin sesión devuelve 401")
    void listarSinAutenticacion() throws Exception {
        mockMvc.perform(get("/api/clientes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/clientes como CLIENTE devuelve 403")
    @WithMockUser(roles = "CLIENTE")
    void listarComoCliente() throws Exception {
        mockMvc.perform(get("/api/clientes"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/clientes como ADMIN crea el cliente")
    @WithMockUser(roles = "ADMIN")
    void crearComoAdmin() throws Exception {
        when(clienteService.crear(any())).thenReturn(respuesta());

        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestValido())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.correo", is("cliente@test.pe")))
                .andExpect(jsonPath("$.username", is("cliente@test.pe")));

        verify(clienteService).crear(any());
    }

    @Test
    @DisplayName("POST /api/clientes valida RF1.1.1 (nombre, correo, password, país)")
    @WithMockUser(roles = "ADMIN")
    void crearConDatosInvalidos() throws Exception {
        ClienteRequest invalido = new ClienteRequest(
                "A", "no-es-email", "123", "ROLE_USER", null, true);

        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalido)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("Error de validación")))
                .andExpect(jsonPath("$.campos.nombreCompleto").exists())
                .andExpect(jsonPath("$.campos.correo").exists())
                .andExpect(jsonPath("$.campos.password").exists())
                .andExpect(jsonPath("$.campos.idPais").exists());
    }

    @Test
    @DisplayName("POST /api/clientes con correo duplicado devuelve 409")
    @WithMockUser(roles = "ADMIN")
    void crearCorreoDuplicado() throws Exception {
        when(clienteService.crear(any()))
                .thenThrow(new IllegalArgumentException("El correo ya está registrado"));

        mockMvc.perform(post("/api/clientes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestValido())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", containsString("ya está registrado")));
    }

    @Test
    @DisplayName("PUT /api/clientes/{id} actualiza como ADMIN")
    @WithMockUser(roles = "ADMIN")
    void actualizarComoAdmin() throws Exception {
        when(clienteService.actualizar(anyLong(), any())).thenReturn(respuesta());

        mockMvc.perform(put("/api/clientes/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestValido())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correo", is("cliente@test.pe")));
    }

    @Test
    @DisplayName("DELETE /api/clientes/{id} como ADMIN devuelve 204")
    @WithMockUser(roles = "ADMIN")
    void eliminarComoAdmin() throws Exception {
        mockMvc.perform(delete("/api/clientes/10"))
                .andExpect(status().isNoContent());

        verify(clienteService).eliminar(10L);
    }

    @Test
    @DisplayName("DELETE /api/clientes/{id} como CLIENTE devuelve 403")
    @WithMockUser(roles = "CLIENTE")
    void eliminarComoCliente() throws Exception {
        mockMvc.perform(delete("/api/clientes/10"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/clientes/{id} como ADMIN devuelve el detalle")
    @WithMockUser(roles = "ADMIN")
    void obtenerComoAdmin() throws Exception {
        when(clienteService.obtenerPorId(10L)).thenReturn(respuesta());

        mockMvc.perform(get("/api/clientes/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombreCompleto", is("Cliente Test")));
    }
}
