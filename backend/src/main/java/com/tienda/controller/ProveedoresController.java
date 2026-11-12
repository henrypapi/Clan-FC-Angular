package com.tienda.controller;

import com.tienda.dto.ProveedorRequest;
import com.tienda.model.Proveedor;
import com.tienda.service.ProveedorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Proveedores: lectura para POS/admin; alta y edición ADMIN. */
@RestController
@RequestMapping("/api/proveedores")
@RequiredArgsConstructor
public class ProveedoresController {

    private final ProveedorService proveedorService;

    @GetMapping
    public List<Proveedor> listar(@RequestParam(defaultValue = "false") boolean soloActivos) {
        return soloActivos ? proveedorService.listarActivos() : proveedorService.listarTodos();
    }

    @GetMapping("/{id}")
    public Proveedor obtener(@PathVariable Long id) {
        return proveedorService.obtenerPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Proveedor crear(@Valid @RequestBody ProveedorRequest request) {
        return proveedorService.crear(request);
    }

    @PutMapping("/{id}")
    public Proveedor actualizar(@PathVariable Long id, @Valid @RequestBody ProveedorRequest request) {
        return proveedorService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        proveedorService.eliminar(id);
    }
}
