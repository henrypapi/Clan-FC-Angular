package com.tienda.service;

import com.tienda.dto.CheckoutRequest;
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

import static org.assertj.core.api.Assertions.*;
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
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 2)), 1L, null, "TARJETA");
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
                List.of(new CheckoutRequest.ItemCheckoutRequest(1L, 2)), 1L, null, "EFECTIVO");

        assertThatThrownBy(() -> checkoutService.procesar(request, CanalVenta.CAJA, "cliente"))
                .isInstanceOf(StockInsuficienteException.class)
                .hasMessageContaining("Stock insuficiente");
    }
}
