package com.tienda.service;

import com.tienda.dto.CheckoutRequest;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.exception.StockInsuficienteException;
import com.tienda.model.*;
import com.tienda.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CheckoutService — Unit Tests")
class CheckoutServiceTest {
    @Mock private OrdenRepository ordenRepository;
    @Mock private ProductoSedeStockRepository stockRepository;
    @Mock private SedeRepository sedeRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private EmpresaClienteRepository empresaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private TaxCalculationService taxService;
    @Mock private AlmacenService almacenService;
    @InjectMocks private CheckoutService checkoutService;

    private Producto producto;
    private ProductoSedeStock inventario;
    private Usuario usuario;
    private Sede sede;

    @BeforeEach
    void setUp() {
        Pais pais = Pais.builder().idPais(1L).codigoIso2("PE").nombre("Perú").build();
        usuario = Usuario.builder().idUsuario(1L).username("cliente")
                .nombreCompleto("Cliente Demo").pais(pais).activo(true).build();
        sede = Sede.builder().idSede(1L).nombre("Lima Centro").activa(true).build();
        producto = Producto.builder().idProducto(1L).sku("AUD-001")
                .nombre("Audífonos").precioBase(new BigDecimal("100.00"))
                .activo(true).build();
        inventario = ProductoSedeStock.builder().producto(producto).sede(sede)
                .stock(10).stockMinimo(2).build();
    }

    @Test
    void procesaVentaYDescuentaStockDeLaSede() {
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(taxService.regimenDe(null)).thenReturn(RegimenFiscal.GENERAL);
        when(taxService.resolverTasa(null, usuario.getPais())).thenReturn(new BigDecimal("18.00"));
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));
        when(taxService.calcularIva(new BigDecimal("200.00"), new BigDecimal("18.00")))
                .thenReturn(new BigDecimal("36.00"));
        when(ordenRepository.existsByFolio(anyString())).thenReturn(false);
        when(ordenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 2)), 1L, null, null, "TARJETA");
        var respuesta = checkoutService.procesar(request, CanalVenta.WEB, "cliente");

        assertThat(respuesta.total()).isEqualByComparingTo("236.00");
        assertThat(respuesta.sedeId()).isEqualTo(1L);
        assertThat(inventario.getStock()).isEqualTo(8);
        verify(almacenService).registrarSalidaVenta(inventario, 2, respuesta.folio(), usuario);
    }

    @Test
    void rechazaVentaCuandoLaSedeNoTieneStock() {
        inventario.setStock(1);
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(taxService.regimenDe(null)).thenReturn(RegimenFiscal.GENERAL);
        when(taxService.resolverTasa(null, usuario.getPais())).thenReturn(new BigDecimal("18.00"));
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));
        when(ordenRepository.existsByFolio(anyString())).thenReturn(false);

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 2)), 1L, null, null, "EFECTIVO");

        assertThatThrownBy(() -> checkoutService.procesar(request, CanalVenta.CAJA, "cliente"))
                .isInstanceOf(StockInsuficienteException.class)
                .hasMessageContaining("Stock insuficiente");
    }

    @Test
    @DisplayName("POS: el cliente seleccionado es el comprador y define su IVA")
    void usaClienteSeleccionadoComoComprador() {
        Pais colombia = Pais.builder().idPais(2L).codigoIso2("CO").nombre("Colombia")
                .tasaIvaGeneral(new BigDecimal("19.00"))
                .tasaIvaReducido(new BigDecimal("5.00")).build();
        Usuario cajero = Usuario.builder().idUsuario(9L).username("cajero")
                .email("cajero@test.pe").nombreCompleto("Cajero")
                .pais(usuario.getPais()).activo(true).build();
        Usuario comprador = Usuario.builder().idUsuario(2L).username("comprador@test.pe")
                .email("comprador@test.pe").nombreCompleto("Comprador Mostrador")
                .pais(colombia).activo(true).build();

        when(usuarioRepository.findByUsernameIgnoreCase("cajero")).thenReturn(Optional.of(cajero));
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(comprador));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(taxService.regimenDe(null)).thenReturn(RegimenFiscal.GENERAL);
        when(taxService.resolverTasa(null, colombia)).thenReturn(new BigDecimal("19.00"));
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));
        when(taxService.calcularIva(new BigDecimal("100.00"), new BigDecimal("19.00")))
                .thenReturn(new BigDecimal("19.00"));
        when(ordenRepository.existsByFolio(anyString())).thenReturn(false);
        when(ordenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)), 1L, null, 2L, "EFECTIVO");
        var respuesta = checkoutService.procesar(request, CanalVenta.CAJA, "cajero");

        assertThat(respuesta.usuarioNombre()).isEqualTo("Comprador Mostrador");
        assertThat(respuesta.tasaIva()).isEqualByComparingTo("19.00");
        assertThat(respuesta.total()).isEqualByComparingTo("119.00");
        // El kardex lo firma quien cobra (cajero), no el comprador.
        verify(almacenService).registrarSalidaVenta(inventario, 1, respuesta.folio(), cajero);
    }

    @Test
    @DisplayName("Rechaza el mismo producto repetido en el carrito")
    void rechazaProductoDuplicadoEnElCarrito() {
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(taxService.regimenDe(null)).thenReturn(RegimenFiscal.GENERAL);
        when(taxService.resolverTasa(null, usuario.getPais())).thenReturn(new BigDecimal("18.00"));
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));
        when(taxService.calcularIva(new BigDecimal("100.00"), new BigDecimal("18.00")))
                .thenReturn(new BigDecimal("18.00"));
        when(ordenRepository.existsByFolio(anyString())).thenReturn(false);

        var request = new CheckoutRequest(List.of(
                new CheckoutRequest.ItemCheckoutRequest(1L, 1),
                new CheckoutRequest.ItemCheckoutRequest(1L, 1)), 1L, null, null, "EFECTIVO");

        assertThatThrownBy(() -> checkoutService.procesar(request, CanalVenta.CAJA, "cliente"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("una sola vez");
    }

    @Test
    @DisplayName("Rechaza producto inactivo")
    void rechazaProductoInactivo() {
        producto.setActivo(false);
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(taxService.regimenDe(null)).thenReturn(RegimenFiscal.GENERAL);
        when(taxService.resolverTasa(null, usuario.getPais())).thenReturn(new BigDecimal("18.00"));
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(ordenRepository.existsByFolio(anyString())).thenReturn(false);

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)), 1L, null, null, "EFECTIVO");

        assertThatThrownBy(() -> checkoutService.procesar(request, CanalVenta.CAJA, "cliente"))
                .isInstanceOf(StockInsuficienteException.class)
                .hasMessageContaining("no está disponible");
    }

    @Test
    @DisplayName("Guarda snapshot de precio, IVA y subtotal por línea")
    void guardaSnapshotDePrecioYDetalle() {
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(taxService.regimenDe(null)).thenReturn(RegimenFiscal.GENERAL);
        when(taxService.resolverTasa(null, usuario.getPais())).thenReturn(new BigDecimal("18.00"));
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));
        when(taxService.calcularIva(new BigDecimal("200.00"), new BigDecimal("18.00")))
                .thenReturn(new BigDecimal("36.00"));
        when(ordenRepository.existsByFolio(anyString())).thenReturn(false);
        when(ordenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 2)), 1L, null, null, "TARJETA");
        var respuesta = checkoutService.procesar(request, CanalVenta.WEB, "cliente");

        assertThat(respuesta.items()).singleElement().satisfies(item -> {
            assertThat(item.sku()).isEqualTo("AUD-001");
            assertThat(item.nombreProducto()).isEqualTo("Audífonos");
            assertThat(item.cantidad()).isEqualTo(2);
            assertThat(item.precioUnitario()).isEqualByComparingTo("100.00");
            assertThat(item.subtotalLinea()).isEqualByComparingTo("200.00");
            assertThat(item.ivaLinea()).isEqualByComparingTo("36.00");
        });
    }

    @Test
    @DisplayName("Anular venta repone stock y registra devolución en kardex")
    void eliminarRevierteStockYRegistraDevolucion() {
        Orden orden = ordenConDetalle(detalle(3));
        inventario.setStock(7);

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(usuarioRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.of(usuario));
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));

        checkoutService.eliminar(1L, "admin");

        assertThat(inventario.getStock()).isEqualTo(10);
        verify(almacenService).registrarDevolucionVenta(inventario, 3, "ORD-TEST-001", usuario);
        verify(ordenRepository).delete(orden);
    }

    @Test
    @DisplayName("Si no hay inventario no se borra la orden (rollback)")
    void eliminarSinInventarioNoBorraLaOrden() {
        Orden orden = ordenConDetalle(detalle(3));

        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));
        when(usuarioRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.of(usuario));
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> checkoutService.eliminar(1L, "admin"))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("No existe inventario");

        verify(ordenRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Un CLIENTE solo ve sus propias órdenes (404 para las ajenas)")
    void clienteSoloPuedeVerSusPropiasOrdenes() {
        Orden orden = ordenConDetalle(null);
        when(ordenRepository.findById(1L)).thenReturn(Optional.of(orden));

        assertThat(checkoutService.obtenerPorId(1L, "cliente", false).folio())
                .isEqualTo("ORD-TEST-001");
        assertThatThrownBy(() -> checkoutService.obtenerPorId(1L, "otro@test.pe", false))
                .isInstanceOf(RecursoNoEncontradoException.class);
        // ADMIN/CAJERO son privilegiados.
        assertThat(checkoutService.obtenerPorId(1L, "admin", true).folio())
                .isEqualTo("ORD-TEST-001");
    }

    @Test
    @DisplayName("CLIENTE lista solo sus órdenes")
    void listarSegunRolClienteSoloSusOrdenes() {
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(ordenRepository.findAllByUsuarioIdUsuarioOrderByFechaCreacionDesc(1L))
                .thenReturn(List.of(ordenConDetalle(null)));

        assertThat(checkoutService.listarSegunRol("cliente", false, false)).hasSize(1);
    }

    @Test
    @DisplayName("ADMIN lista todas las órdenes")
    void listarSegunRolAdminTodas() {
        when(ordenRepository.findAllByOrderByFechaCreacionDesc())
                .thenReturn(List.of(ordenConDetalle(null)));

        assertThat(checkoutService.listarSegunRol("admin", true, false)).hasSize(1);
    }

    @Test
    @DisplayName("CAJERO lista las ventas de caja")
    void listarSegunRolCajeroSoloCaja() {
        when(ordenRepository.findAllByCanalOrderByFechaCreacionDesc(CanalVenta.CAJA))
                .thenReturn(List.of(ordenConDetalle(null)));

        assertThat(checkoutService.listarSegunRol("cajero", false, true)).hasSize(1);
    }

    @Test
    @DisplayName("Rechaza sede inactiva")
    void rechazaSedeInactiva() {
        sede.setActiva(false);
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)), 1L, null, null, "EFECTIVO");

        assertThatThrownBy(() -> checkoutService.procesar(request, CanalVenta.CAJA, "cliente"))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("Sede 1 no encontrada o inactiva");
    }

    @Test
    @DisplayName("Rechaza cliente seleccionado inactivo")
    void rechazaClienteSeleccionadoInactivo() {
        Usuario comprador = Usuario.builder().idUsuario(2L).username("inactivo@test.pe")
                .email("inactivo@test.pe").nombreCompleto("Inactivo")
                .pais(usuario.getPais()).activo(false).build();

        when(usuarioRepository.findByUsernameIgnoreCase("cajero")).thenReturn(Optional.of(usuario));
        when(usuarioRepository.findById(2L)).thenReturn(Optional.of(comprador));

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)), 1L, null, 2L, "EFECTIVO");

        assertThatThrownBy(() -> checkoutService.procesar(request, CanalVenta.CAJA, "cajero"))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("no encontrado o inactivo");
    }

    @Test
    @DisplayName("Rechaza producto inexistente")
    void rechazaProductoInexistente() {
        when(usuarioRepository.findByUsernameIgnoreCase("cliente")).thenReturn(Optional.of(usuario));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(taxService.regimenDe(null)).thenReturn(RegimenFiscal.GENERAL);
        when(taxService.resolverTasa(null, usuario.getPais())).thenReturn(new BigDecimal("18.00"));
        when(productoRepository.findById(1L)).thenReturn(Optional.empty());
        when(ordenRepository.existsByFolio(anyString())).thenReturn(false);

        var request = new CheckoutRequest(
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 1)), 1L, null, null, "EFECTIVO");

        assertThatThrownBy(() -> checkoutService.procesar(request, CanalVenta.CAJA, "cliente"))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("Producto 1 no encontrado");
    }

    /* ------------------------------ Helpers ------------------------------ */

    private DetalleOrden detalle(int cantidad) {
        return DetalleOrden.builder()
                .producto(producto)
                .sku(producto.getSku())
                .nombreProducto(producto.getNombre())
                .cantidad(cantidad)
                .precioUnitario(new BigDecimal("100.00"))
                .ivaLinea(new BigDecimal("54.00"))
                .subtotalLinea(new BigDecimal("300.00"))
                .build();
    }

    private Orden ordenConDetalle(DetalleOrden detalle) {
        Orden orden = Orden.builder()
                .idOrden(1L)
                .folio("ORD-TEST-001")
                .canal(CanalVenta.CAJA)
                .usuario(usuario)
                .sede(sede)
                .regimenFiscal(RegimenFiscal.GENERAL)
                .tasaIva(new BigDecimal("18.00"))
                .subtotal(new BigDecimal("300.00"))
                .iva(new BigDecimal("54.00"))
                .total(new BigDecimal("354.00"))
                .metodoPago("EFECTIVO")
                .estado(EstadoOrden.PAGADA)
                .build();
        if (detalle != null) {
            orden.addItem(detalle);
        }
        return orden;
    }
}
