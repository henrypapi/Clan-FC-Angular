package com.tienda.controller;

import com.tienda.config.SecurityConfig;
import com.tienda.dto.OrdenResponse;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.security.JwtService;
import com.tienda.security.UsuarioDetailsService;
import com.tienda.service.CheckoutService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas MVC de ventas (órdenes): listado por rol, detalle con control de
 * propiedad y anulación solo ADMIN.
 */
@WebMvcTest(OrdenesController.class)
@Import(SecurityConfig.class)
@DisplayName("OrdenesController — Integration Tests")
class OrdenesControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private CheckoutService checkoutService;
    @MockitoBean private JwtService jwtService;
    @MockitoBean private UsuarioDetailsService usuarioDetailsService;

    private OrdenResponse orden() {
        return new OrdenResponse(
                1L,
                "ORD-20260101-120000-ABC",
                "CAJA",
                "PAGADA",
                "Cliente Demo",
                1L,
                "Lima Centro",
                null,
                null,
                "Perú",
                "🇵🇪",
                "GENERAL",
                new BigDecimal("18.00"),
                new BigDecimal("100.00"),
                new BigDecimal("18.00"),
                new BigDecimal("118.00"),
                "EFECTIVO",
                OffsetDateTime.now(),
                List.of()
        );
    }

    @Test
    @DisplayName("GET /api/ordenes como CLIENTE consulta solo sus órdenes")
    @WithMockUser(username = "cliente", roles = "CLIENTE")
    void listarComoCliente() throws Exception {
        when(checkoutService.listarSegunRol("cliente", false, false))
                .thenReturn(List.of(orden()));

        mockMvc.perform(get("/api/ordenes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].folio", is("ORD-20260101-120000-ABC")));
    }

    @Test
    @DisplayName("GET /api/ordenes como ADMIN consulta todas")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void listarComoAdmin() throws Exception {
        when(checkoutService.listarSegunRol("admin", true, false))
                .thenReturn(List.of(orden()));

        mockMvc.perform(get("/api/ordenes"))
                .andExpect(status().isOk());

        verify(checkoutService).listarSegunRol("admin", true, false);
    }

    @Test
    @DisplayName("GET /api/ordenes como CAJERO consulta las ventas de caja")
    @WithMockUser(username = "cajero", roles = "CAJERO")
    void listarComoCajero() throws Exception {
        when(checkoutService.listarSegunRol("cajero", false, true))
                .thenReturn(List.of(orden()));

        mockMvc.perform(get("/api/ordenes"))
                .andExpect(status().isOk());

        verify(checkoutService).listarSegunRol("cajero", false, true);
    }

    @Test
    @DisplayName("GET /api/ordenes sin sesión devuelve 401")
    void listarSinAutenticacion() throws Exception {
        mockMvc.perform(get("/api/ordenes"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/ordenes/{id} como CLIENTE valida propiedad")
    @WithMockUser(username = "cliente", roles = "CLIENTE")
    void obtenerComoCliente() throws Exception {
        when(checkoutService.obtenerPorId(1L, "cliente", false)).thenReturn(orden());

        mockMvc.perform(get("/api/ordenes/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is(118.00)));

        verify(checkoutService).obtenerPorId(1L, "cliente", false);
    }

    @Test
    @DisplayName("GET /api/ordenes/{id} como ADMIN puede ver cualquier orden")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void obtenerComoAdmin() throws Exception {
        when(checkoutService.obtenerPorId(1L, "admin", true)).thenReturn(orden());

        mockMvc.perform(get("/api/ordenes/1"))
                .andExpect(status().isOk());

        verify(checkoutService).obtenerPorId(1L, "admin", true);
    }

    @Test
    @DisplayName("GET /api/ordenes/{id} de otro cliente devuelve 404")
    @WithMockUser(username = "cliente", roles = "CLIENTE")
    void obtenerOrdenAjena() throws Exception {
        when(checkoutService.obtenerPorId(1L, "cliente", false))
                .thenThrow(new RecursoNoEncontradoException("Orden 1 no encontrada"));

        mockMvc.perform(get("/api/ordenes/1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("Orden 1 no encontrada")));
    }

    @Test
    @DisplayName("DELETE /api/ordenes/{id} como ADMIN anula y repone stock")
    @WithMockUser(username = "admin", roles = "ADMIN")
    void eliminarComoAdmin() throws Exception {
        mockMvc.perform(delete("/api/ordenes/1"))
                .andExpect(status().isNoContent());

        verify(checkoutService).eliminar(1L, "admin");
    }

    @Test
    @DisplayName("DELETE /api/ordenes/{id} como CLIENTE devuelve 403")
    @WithMockUser(username = "cliente", roles = "CLIENTE")
    void eliminarComoCliente() throws Exception {
        mockMvc.perform(delete("/api/ordenes/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE /api/ordenes/{id} sin sesión devuelve 401")
    void eliminarSinAutenticacion() throws Exception {
        mockMvc.perform(delete("/api/ordenes/1"))
                .andExpect(status().isUnauthorized());
    }
}
