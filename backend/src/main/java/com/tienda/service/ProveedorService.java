package com.tienda.service;

import com.tienda.dto.ProveedorRequest;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.model.Proveedor;
import com.tienda.repository.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Catálogo y gestión de proveedores (ADMIN). */
@Service
@RequiredArgsConstructor
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;

    @Transactional(readOnly = true)
    public List<Proveedor> listarActivos() {
        return proveedorRepository.findAllByActivoTrueOrderByNombreAsc();
    }

    @Transactional(readOnly = true)
    public List<Proveedor> listarTodos() {
        return proveedorRepository.findAllByOrderByNombreAsc();
    }

    @Transactional(readOnly = true)
    public Proveedor obtenerPorId(Long id) {
        return proveedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor " + id + " no encontrado"));
    }

    @Transactional
    public Proveedor crear(ProveedorRequest request) {
        String nombre = request.nombre().trim();
        if (proveedorRepository.existsByNombreIgnoreCase(nombre)) {
            throw new DataIntegrityViolationException("Ya existe un proveedor con ese nombre");
        }
        return proveedorRepository.save(Proveedor.builder()
                .nombre(nombre)
                .contactoNombre(request.contactoNombre())
                .telefono(request.telefono())
                .email(request.email())
                .activo(request.activo() != null ? request.activo() : Boolean.TRUE)
                .build());
    }

    @Transactional
    public Proveedor actualizar(Long id, ProveedorRequest request) {
        Proveedor proveedor = obtenerPorId(id);
        String nombre = request.nombre().trim();
        if (!proveedor.getNombre().equalsIgnoreCase(nombre)
                && proveedorRepository.existsByNombreIgnoreCaseAndIdProveedorNot(nombre, id)) {
            throw new DataIntegrityViolationException("Ya existe un proveedor con ese nombre");
        }
        proveedor.setNombre(nombre);
        proveedor.setContactoNombre(request.contactoNombre());
        proveedor.setTelefono(request.telefono());
        proveedor.setEmail(request.email());
        if (request.activo() != null) {
            proveedor.setActivo(request.activo());
        }
        return proveedorRepository.save(proveedor);
    }

    @Transactional
    public void eliminar(Long id) {
        Proveedor proveedor = obtenerPorId(id);
        try {
            proveedorRepository.delete(proveedor);
            proveedorRepository.flush();
        } catch (Exception ex) {
            proveedor.setActivo(Boolean.FALSE);
            proveedorRepository.save(proveedor);
        }
    }
}
