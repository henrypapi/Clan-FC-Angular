package com.tienda.service;

import com.tienda.dto.MovimientoAlmacenRequest;
import com.tienda.dto.MovimientoResponse;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.model.*;
import com.tienda.repository.MovimientoAlmacenRepository;
import com.tienda.repository.ProveedorRepository;
import com.tienda.repository.ProductoSedeStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

/**
 * ALMACÉN — kardex del inventario.
 *
 * registrar: entradas de mercancía, mermas y devoluciones que reporta el
 * cajero; el stock se ajusta y queda rastro (quién, cuándo, cuánto, factura).
 * registrarSalidaVenta: lo invoca CheckoutService en cada venta.
 */
@Service
@RequiredArgsConstructor
public class AlmacenService {

    private final MovimientoAlmacenRepository movimientosRepository;
    private final ProveedorRepository proveedorRepository;
    private final ProductoSedeStockRepository stockRepository;

    /** Tipos permitidos desde la interfaz del POS. */
    private static final List<String> TIPOS_UI = List.of("ENTRADA", "DEVOLUCION", "MERMA", "AJUSTE");

    /** Entrada/salida manual con producto ya cargado. */
    @Transactional
    public MovimientoResponse registrar(Producto producto, MovimientoAlmacenRequest request, Usuario usuario) {
        String tipoTexto = (request.tipo() == null || request.tipo().isBlank())
                ? "ENTRADA" : request.tipo().trim().toUpperCase(Locale.ROOT);
        if (!TIPOS_UI.contains(tipoTexto)) {
            throw new IllegalArgumentException("Tipo de movimiento inválido: " + tipoTexto);
        }
        TipoMovimiento tipo = TipoMovimiento.valueOf(tipoTexto);

        ProductoSedeStock inventario = stockRepository
                .findForUpdate(producto.getIdProducto(), request.sedeId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "El producto no tiene inventario configurado en la sede " + request.sedeId()));

        boolean suma = (tipo == TipoMovimiento.ENTRADA || tipo == TipoMovimiento.DEVOLUCION);
        int nuevoStock = suma
                ? inventario.getStock() + request.cantidad()
                : inventario.getStock() - request.cantidad();

        if (nuevoStock < 0) {
            throw new IllegalArgumentException("Stock insuficiente para descontar "
                    + request.cantidad() + " unidades (disponible: " + inventario.getStock() + ")");
        }
        inventario.setStock(nuevoStock);

        Proveedor proveedor = request.proveedorId() != null
                ? proveedorRepository.findById(request.proveedorId()).orElse(null)
                : null;

        MovimientoAlmacen guardado = movimientosRepository.save(MovimientoAlmacen.builder()
                .tipo(tipo)
                .producto(producto)
                .sede(inventario.getSede())
                .cantidad(request.cantidad())
                .stockResultante(nuevoStock)
                .referencia(request.referencia())
                .nota(request.nota())
                .proveedor(proveedor)
                .usuario(usuario)
                .build());

        return MovimientoResponse.from(guardado);
    }

    /** Kardex visible en POS: últimos 100 movimientos. */
    @Transactional(readOnly = true)
    public List<MovimientoResponse> listarRecientes() {
        return movimientosRepository.findTop100ByOrderByFechaDesc().stream()
                .map(MovimientoResponse::from).toList();
    }

    /**
     * SALIDA_VENTA por cada línea vendida — misma transacción del checkout:
     * si la venta hace rollback, el kardex también.
     */
    @Transactional
    public void registrarSalidaVenta(ProductoSedeStock inventario, int cantidad,
                                     String folioOrden, Usuario usuario) {
        movimientosRepository.save(MovimientoAlmacen.builder()
                .tipo(TipoMovimiento.SALIDA_VENTA)
                .producto(inventario.getProducto())
                .sede(inventario.getSede())
                .cantidad(cantidad)
                .stockResultante(inventario.getStock())
                .referencia(folioOrden)
                .usuario(usuario)
                .build());
    }
}
