package com.tienda.service;

import com.tienda.dto.CheckoutRequest;
import com.tienda.dto.OrdenResponse;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.exception.StockInsuficienteException;
import com.tienda.model.*;
import com.tienda.repository.EmpresaClienteRepository;
import com.tienda.repository.ProductoSedeStockRepository;
import com.tienda.repository.SedeRepository;
import com.tienda.repository.OrdenRepository;
import com.tienda.repository.ProductoRepository;
import com.tienda.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.HashSet;
import java.security.SecureRandom;

/**
 * PROCESO DE CHECKOUT / VENTA EN CAJA (Entregable 2) — todo bajo una única
 * transacción de PostgreSQL (@Transactional):
 *
 *   a) Validación y RESERVA de stock (descuento atómico por línea).
 *   b) Registro de la orden con subtotal, IVA parametrizado y total.
 *   c) Inserción en ordenes + detalle_ordenes con canal WEB/CAJA y snapshot
 *      fiscal del régimen/tasa aplicados.
 *   d) Descuento definitivo del inventario (mismo UPDATE del paso "a":
 *      si algo falla después, el rollback devuelve el stock).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

    private final OrdenRepository ordenRepository;
    private final ProductoSedeStockRepository stockRepository;
    private final SedeRepository sedeRepository;
    private final ProductoRepository productoRepository;
    private final EmpresaClienteRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;
    private final TaxCalculationService taxService;
    private final AlmacenService almacenService; // kardex: SALIDA_VENTA por línea

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter FOLIO_FECHA =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    /**
     * Procesa una venta completa.
     * @param request  items + empresa compradora + método de pago
     * @param canal    WEB (cliente online) o CAJA (POS del cajero)
     * @param username usuario autenticado que ejecuta la operación
     */
    @Transactional
    public OrdenResponse procesar(CheckoutRequest request, CanalVenta canal, String username) {
        // --- Datos base de la venta ---
        // El login acepta usuario o correo; el correo es el username del cliente.
        Usuario autenticado = usuarioRepository.findByUsernameIgnoreCase(username)
                .or(() -> usuarioRepository.findByEmailIgnoreCase(username))
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado: " + username));

        // Cliente seleccionado en el POS (si viene). Si no, compra el autenticado.
        Usuario comprador = autenticado;
        if (request.clienteId() != null) {
            comprador = usuarioRepository.findById(request.clienteId())
                    .filter(u -> Boolean.TRUE.equals(u.getActivo()))
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "Cliente " + request.clienteId() + " no encontrado o inactivo"));
        }

        Sede sede = sedeRepository.findById(request.sedeId())
                .filter(Sede::getActiva)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Sede " + request.sedeId() + " no encontrada o inactiva"));

        EmpresaCliente empresa = null;
        if (request.empresaClienteId() != null) {
            empresa = empresaRepository.findById(request.empresaClienteId())
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "Empresa cliente " + request.empresaClienteId() + " no encontrada"));
        }

        RegimenFiscal regimen = taxService.regimenDe(empresa);
        // Sin empresa: el país del COMPRADOR define su IVA de consumidor final.
        BigDecimal tasa = taxService.resolverTasa(empresa, comprador.getPais());

        // --- Orden cabecera (aún sin montos; se llenan al recorrer líneas) ---
        Orden orden = Orden.builder()
                .folio(generarFolio())
                .canal(canal)
                .usuario(comprador)
                .sede(sede)
                .empresaCliente(empresa)
                .pais(empresa != null ? empresa.getPais() : comprador.getPais()) // snapshot país fiscal
                .regimenFiscal(regimen)
                .tasaIva(tasa)
                .subtotal(BigDecimal.ZERO)
                .iva(BigDecimal.ZERO)
                .total(BigDecimal.ZERO)
                .metodoPago(normalizarMetodoPago(request.metodoPago()))
                .estado(EstadoOrden.PAGADA)
                .build();

        BigDecimal acumuladoBase = BigDecimal.ZERO;
        BigDecimal acumuladoIva = BigDecimal.ZERO;
        var productosProcesados = new HashSet<Long>();

        // --- Por cada línea: reservar stock + crear detalle ---
        for (CheckoutRequest.ItemCheckoutRequest item : request.items()) {
            if (!productosProcesados.add(item.productoId())) {
                throw new IllegalArgumentException(
                        "Cada producto debe aparecer una sola vez en el carrito");
            }
            int cantidad = item.cantidad() == null ? 1 : item.cantidad();

            Producto producto = productoRepository.findById(item.productoId())
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "Producto " + item.productoId() + " no encontrado"));

            if (!Boolean.TRUE.equals(producto.getActivo())) {
                throw new StockInsuficienteException(
                        "El producto \"" + producto.getNombre() + "\" no está disponible");
            }

            // d) DESCUENTO DEFINITIVO ATÓMICO: falla si el stock ya no alcanza
            // (protege contra ventas simultáneas del mismo inventario).
            ProductoSedeStock inventario = stockRepository
                    .findForUpdate(producto.getIdProducto(), sede.getIdSede())
                    .orElseThrow(() -> new StockInsuficienteException(
                            "El producto no está disponible en " + sede.getNombre()));
            if (inventario.getStock() < cantidad) {
                throw new StockInsuficienteException("Stock insuficiente para \""
                        + producto.getNombre() + "\" (disponible: "
                        + inventario.getStock() + ", solicitado: " + cantidad + ")");
            }
            inventario.setStock(inventario.getStock() - cantidad);

            BigDecimal precioUnitario = producto.getPrecioBase();
            BigDecimal subtotalLinea = precioUnitario.multiply(BigDecimal.valueOf(cantidad))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal ivaLinea = taxService.calcularIva(subtotalLinea, tasa);

            orden.addItem(DetalleOrden.builder()
                    .orden(orden)
                    .producto(producto)
                    .sku(producto.getSku())
                    .nombreProducto(producto.getNombre())
                    .cantidad(cantidad)
                    .precioUnitario(precioUnitario)
                    .ivaLinea(ivaLinea)
                    .subtotalLinea(subtotalLinea)
                    .build());

            acumuladoBase = acumuladoBase.add(subtotalLinea);
            acumuladoIva = acumuladoIva.add(ivaLinea);

            // Kardex: la venta queda trazada en movimientos_almacen.
            // Se registra quién ejecutó el cobro (autenticado), no el comprador.
            almacenService.registrarSalidaVenta(
                    inventario, cantidad, orden.getFolio(), autenticado);
        }

        // --- b/c) Montos finales y persistencia en cascada ---
        orden.setSubtotal(acumuladoBase.setScale(2, RoundingMode.HALF_UP));
        orden.setIva(acumuladoIva.setScale(2, RoundingMode.HALF_UP));
        orden.setTotal(orden.getSubtotal().add(orden.getIva()));

        Orden guardada = ordenRepository.save(orden);
        log.info("Orden {} registrada: canal={}, items={}, total={}",
                guardada.getFolio(), canal, guardada.getDetalles().size(), guardada.getTotal());

        return OrdenResponse.from(guardada);
    }

    /** Lista órdenes según el rol del solicitante (autorización de lectura). */
    @Transactional(readOnly = true)
    public List<OrdenResponse> listarSegunRol(String username, boolean esAdmin, boolean esCajero) {
        List<Orden> ordenes;
        if (esAdmin) {
            ordenes = ordenRepository.findAllByOrderByFechaCreacionDesc();           // ADMIN: todas
        } else if (esCajero) {
            ordenes = ordenRepository.findAllByCanalOrderByFechaCreacionDesc(CanalVenta.CAJA); // CAJERO: sus cobros de caja
        } else {
            Usuario usuario = usuarioRepository.findByUsernameIgnoreCase(username)
                    .or(() -> usuarioRepository.findByEmailIgnoreCase(username))
                    .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
            ordenes = ordenRepository.findAllByUsuarioIdUsuarioOrderByFechaCreacionDesc(usuario.getIdUsuario()); // CLIENTE: las suyas
        }
        return ordenes.stream().map(OrdenResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OrdenResponse obtenerPorId(Long id) {
        return ordenRepository.findById(id)
                .map(OrdenResponse::from)
                .orElseThrow(() -> new RecursoNoEncontradoException("Orden " + id + " no encontrada"));
    }

    /**
     * Detalle con control de propiedad: ADMIN/CAJERO ven cualquier orden; un
     * CLIENTE solo puede consultar las suyas. Se devuelve 404 (no 403) para no
     * revelar la existencia de órdenes ajenas.
     */
    @Transactional(readOnly = true)
    public OrdenResponse obtenerPorId(Long id, String username, boolean privilegiado) {
        Orden orden = ordenRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Orden " + id + " no encontrada"));

        if (!privilegiado && !esPropietario(orden, username)) {
            throw new RecursoNoEncontradoException("Orden " + id + " no encontrada");
        }
        return OrdenResponse.from(orden);
    }

    private boolean esPropietario(Orden orden, String username) {
        Usuario dueno = orden.getUsuario();
        return dueno != null && (dueno.getUsername().equalsIgnoreCase(username)
                || (dueno.getEmail() != null && dueno.getEmail().equalsIgnoreCase(username)));
    }

    /**
     * Anula (elimina) una venta y REVIERTE el stock de cada línea.
     *
     * Toda la operación es transaccional: si falla la reversión de cualquier
     * producto, no se borra la orden y el stock queda intacto. Además se
     * registra un movimiento DEVOLUCION en el kardex (trazabilidad).
     */
    @Transactional
    public void eliminar(Long id, String username) {
        Orden orden = ordenRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Orden " + id + " no encontrada"));

        Usuario ejecutor = usuarioRepository.findByUsernameIgnoreCase(username)
                .or(() -> usuarioRepository.findByEmailIgnoreCase(username))
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado: " + username));

        for (DetalleOrden detalle : orden.getDetalles()) {
            ProductoSedeStock inventario = stockRepository
                    .findForUpdate(detalle.getProducto().getIdProducto(), orden.getSede().getIdSede())
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No existe inventario del producto " + detalle.getSku()
                                    + " en la sede de la venta; no se puede revertir el stock"));

            inventario.setStock(inventario.getStock() + detalle.getCantidad());
            almacenService.registrarDevolucionVenta(
                    inventario, detalle.getCantidad(), orden.getFolio(), ejecutor);
        }

        int lineas = orden.getDetalles().size();
        ordenRepository.delete(orden);
        log.info("Orden {} anulada: stock revertido en {} línea(s)", orden.getFolio(), lineas);
    }

    /* ------------------------------ Privados ------------------------------ */

    /**
     * Folio legible y prácticamente único: ORD-{fecha}-{sufijo aleatorio}.
     * El sufijo evita colisiones si dos ventas se confirman en el mismo segundo.
     */
    private String generarFolio() {
        String sufijo = Integer.toString(100 + RANDOM.nextInt(900), 36).toUpperCase(Locale.ROOT);
        String folio = "ORD-" + LocalDateTime.now().format(FOLIO_FECHA) + "-" + sufijo;
        return ordenRepository.existsByFolio(folio) ? folio + "-" + RANDOM.nextInt(10) : folio;
    }

    private String normalizarMetodoPago(String metodoPago) {
        if (metodoPago == null || metodoPago.isBlank()) return "EFECTIVO";
        return switch (metodoPago.trim().toUpperCase(Locale.ROOT)) {
            case "TARJETA" -> "TARJETA";
            case "TRANSFERENCIA" -> "TRANSFERENCIA";
            default -> "EFECTIVO";
        };
    }
}
