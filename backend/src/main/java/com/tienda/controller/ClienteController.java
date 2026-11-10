package com.tienda.controller;

import com.tienda.dto.ClienteRequest;
import com.tienda.dto.ClienteResponse;
import com.tienda.service.ClienteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * CRUD de CLIENTES — exclusivo del rol ADMIN.
 *
 *  GET    /api/clientes            -> lista (filtro opcional ?filtro=)
 *  GET    /api/clientes/{id}       -> detalle
 *  POST   /api/clientes            -> crear (correo = username, BCrypt, rol)
 *  PUT    /api/clientes/{id}       -> actualizar
 *  DELETE /api/clientes/{id}       -> eliminar (respeta FK: RF1.4)
 */
@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    @GetMapping
    public List<ClienteResponse> listar(
            @RequestParam(required = false) String filtro,
            @RequestParam(defaultValue = "false") boolean incluirPersonal) {
        return clienteService.listar(filtro, incluirPersonal);
    }

    @GetMapping("/{id}")
    public ClienteResponse obtener(@PathVariable Long id) {
        return clienteService.obtenerPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteResponse crear(@Valid @RequestBody ClienteRequest request) {
        return clienteService.crear(request);
    }

    @PutMapping("/{id}")
    public ClienteResponse actualizar(@PathVariable Long id,
                                      @Valid @RequestBody ClienteRequest request) {
        return clienteService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        clienteService.eliminar(id);
    }
}
