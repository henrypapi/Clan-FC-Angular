package com.tienda.service;

import com.tienda.dto.ProductoRequest;
import com.tienda.dto.ProductoResponse;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.model.Categoria;
import com.tienda.model.Producto;
import com.tienda.model.Proveedor;
import com.tienda.model.ProductoSedeStock;
import com.tienda.model.Sede;
import com.tienda.repository.CategoriaRepository;
import com.tienda.repository.ProductoRepository;
import com.tienda.repository.ProveedorRepository;
import com.tienda.repository.ProductoSedeStockRepository;
import com.tienda.repository.SedeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Lógica de negocio del inventario (CRUD de productos, ADMIN).
 * Reglas: SKU único, categoría obligatoria y existente, stock/precio >= 0.
 */
@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final ProveedorRepository proveedorRepository;
    private final ProductoSedeStockRepository stockRepository;
    private final SedeRepository sedeRepository;

    /* ----------------------------- Catálogo ------------------------------- */

    /** Catálogo público: solo activos, con búsqueda y filtro de categoría. */
    @Transactional(readOnly = true)
    public List<ProductoResponse> buscarCatalogo(String busqueda, Long categoriaId) {
        String texto = normalizar(busqueda);
        return respuestas(productoRepository.buscarCatalogo(texto, categoriaId));
    }

    @Transactional(readOnly = true)
    public ProductoResponse obtenerPorId(Long id) {
        return respuestas(List.of(buscarProducto(id))).get(0);
    }

    /* ---------------------------- Inventario ------------------------------ */

    /** Vista admin: incluye inactivos. */
    @Transactional(readOnly = true)
    public List<ProductoResponse> buscarInventario(String busqueda, Long categoriaId) {
        String texto = normalizar(busqueda);
        return respuestas(productoRepository.buscarInventario(texto, categoriaId));
    }

    @Transactional
    public ProductoResponse crear(ProductoRequest request) {
        validarSkuUnico(request.sku(), null);
        Categoria categoria = buscarCategoria(request.categoriaId());

        Producto producto = Producto.builder()
                .sku(request.sku().trim().toUpperCase())
                .nombre(request.nombre().trim())
                .descripcion(request.descripcion())
                .precioBase(request.precioBase())
                .garantiaMeses(request.garantiaMeses() == null ? 12 : request.garantiaMeses())
                .proveedor(buscarProveedor(request.proveedorId()))
                .imagenUrl(request.imagenUrl())
                .categoria(categoria)
                .activo(request.activo() == null || request.activo())
                .build();

        Producto guardado = productoRepository.save(producto);
        Sede sede = buscarSede(request.sedeId());
        stockRepository.save(ProductoSedeStock.builder()
                .producto(guardado).sede(sede)
                .stock(request.stock()).stockMinimo(request.stockMinimo()).build());
        return ProductoResponse.from(guardado, request.stock(), request.stockMinimo());
    }

    @Transactional
    public ProductoResponse actualizar(Long id, ProductoRequest request) {
        Producto producto = buscarProducto(id);
        validarSkuUnico(request.sku(), id);
        Categoria categoria = buscarCategoria(request.categoriaId());

        producto.setSku(request.sku().trim().toUpperCase());
        producto.setNombre(request.nombre().trim());
        producto.setDescripcion(request.descripcion());
        producto.setPrecioBase(request.precioBase());
        if (request.garantiaMeses() != null) producto.setGarantiaMeses(request.garantiaMeses());
        producto.setProveedor(buscarProveedor(request.proveedorId()));
        producto.setImagenUrl(request.imagenUrl());
        producto.setCategoria(categoria);
        if (request.activo() != null) producto.setActivo(request.activo());

        Producto guardado = productoRepository.save(producto);
        ProductoSedeStock inventario = stockRepository
                .findByProductoIdProductoAndSedeIdSede(id, request.sedeId())
                .orElseGet(() -> ProductoSedeStock.builder()
                        .producto(guardado).sede(buscarSede(request.sedeId())).build());
        inventario.setStock(request.stock());
        inventario.setStockMinimo(request.stockMinimo());
        stockRepository.save(inventario);
        return respuestas(List.of(guardado)).get(0);
    }

    /** Baja lógica: conserva órdenes, kardex e integridad referencial. */
    @Transactional
    public void eliminar(Long id) {
        Producto producto = buscarProducto(id);
        producto.setActivo(Boolean.FALSE);
    }

    /* ------------------------- Consultas auxiliares ----------------------- */

    /** Productos con stock <= mínimo (alertas dashboard Entregable 3). */
    @Transactional(readOnly = true)
    public List<ProductoResponse> productosConStockBajo() {
        return stockRepository.findAll().stream()
                .filter(s -> s.getStock() <= s.getStockMinimo())
                .map(s -> ProductoResponse.from(s.getProducto(), s.getStock(), s.getStockMinimo()))
                .toList();
    }

    @Transactional(readOnly = true)
    public BigDecimal valorInventario() {
        return stockRepository.valorInventarioTotal();
    }

    /* ------------------------------ Privados ------------------------------ */

    private void validarSkuUnico(String sku, Long idExcluido) {
        productoRepository.findBySkuIgnoreCase(sku).ifPresent(p -> {
            if (!p.getIdProducto().equals(idExcluido)) {
                throw new IllegalArgumentException("El SKU " + sku + " ya existe");
            }
        });
    }

    private Categoria buscarCategoria(Long id) {
        return categoriaRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Categoría " + id + " no encontrada"));
    }

    /** null = sin proveedor asignado. */
    private Proveedor buscarProveedor(Long id) {
        if (id == null) return null;
        return proveedorRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proveedor " + id + " no encontrado"));
    }

    private Producto buscarProducto(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto " + id + " no encontrado"));
    }

    private Sede buscarSede(Long id) {
        return sedeRepository.findById(id)
                .filter(Sede::getActiva)
                .orElseThrow(() -> new RecursoNoEncontradoException("Sede " + id + " no encontrada o inactiva"));
    }

    private List<ProductoResponse> respuestas(List<Producto> productos) {
        if (productos.isEmpty()) return List.of();
        Map<Long, ProductoSedeStockRepository.StockResumen> stock = new HashMap<>();
        stockRepository.resumirStock(productos.stream().map(Producto::getIdProducto).toList())
                .forEach(r -> stock.put(r.getProductoId(), r));
        return productos.stream().map(p -> {
            var r = stock.get(p.getIdProducto());
            int total = r == null ? 0 : Math.toIntExact(r.getStockTotal());
            int minimo = r == null ? 0 : r.getStockMinimo();
            return ProductoResponse.from(p, total, minimo);
        }).toList();
    }

    private String normalizar(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
