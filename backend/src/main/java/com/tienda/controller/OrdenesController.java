package com.tienda.controller;

import com.tienda.dto.OrdenResponse;
import com.tienda.service.CheckoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Consulta de órdenes según el rol autenticado:
 *  - ADMIN:   todas las ventas
 *  - CAJERO:  cobros realizados en caja (canal CAJA)
 *  - CLIENTE: únicamente sus propias compras web
 */
@RestController
@RequestMapping("/api/ordenes")
@RequiredArgsConstructor
public class OrdenesController {

    private final CheckoutService checkoutService;

    @GetMapping
    public List<OrdenResponse> listar(Authentication authentication) {
        boolean esAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean esCajero = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CAJERO"));

        return checkoutService.listarSegunRol(authentication.getName(), esAdmin, esCajero);
    }

    /**
     * Detalle de una orden (ticket / futuro PDF).
     * ADMIN/CAJERO: cualquier orden. CLIENTE: solo las propias.
     */
    @GetMapping("/{id}")
    public OrdenResponse obtener(@PathVariable Long id, Authentication authentication) {
        boolean privilegiado = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_CAJERO"));
        return checkoutService.obtenerPorId(id, authentication.getName(), privilegiado);
    }

    /**
     * Anula una venta y repone el stock (solo ADMIN). Operación transaccional.
     *  DELETE /api/ordenes/{id}
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id, Authentication authentication) {
        checkoutService.eliminar(id, authentication.getName());
    }
}
