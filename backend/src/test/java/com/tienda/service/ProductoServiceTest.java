package com.tienda.service;

import com.tienda.dto.ProductoRequest;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.model.*;
import com.tienda.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductoServiceTest {
    @Mock private ProductoRepository productoRepository;
    @Mock private CategoriaRepository categoriaRepository;
    @Mock private ProveedorRepository proveedorRepository;
    @Mock private ProductoSedeStockRepository stockRepository;
    @Mock private SedeRepository sedeRepository;
    @InjectMocks private ProductoService productoService;

    private Producto producto;
    private Categoria categoria;
    private Sede sede;

    @BeforeEach
    void setUp() {
        categoria = Categoria.builder().idCategoria(1L).nombre("Audio").build();
        sede = Sede.builder().idSede(1L).nombre("Lima Centro").activa(true).build();
        producto = Producto.builder().idProducto(1L).sku("AUD-001")
                .nombre("Audífonos OneOdio").precioBase(new BigDecimal("549.00"))
                .categoria(categoria).activo(true).build();
    }

    @Test
    void catalogoUsaStockAgregadoDeLasSedes() {
        var resumen = mock(ProductoSedeStockRepository.StockResumen.class);
        when(resumen.getProductoId()).thenReturn(1L);
        when(resumen.getStockTotal()).thenReturn(28L);
        when(resumen.getStockMinimo()).thenReturn(5);
        when(productoRepository.buscarCatalogo("audio", null)).thenReturn(List.of(producto));
        when(stockRepository.resumirStock(List.of(1L))).thenReturn(List.of(resumen));

        var resultado = productoService.buscarCatalogo("audio", null);

        assertThat(resultado).singleElement().satisfies(p -> {
            assertThat(p.stock()).isEqualTo(28);
            assertThat(p.stockMinimo()).isEqualTo(5);
        });
    }

    @Test
    void crearProductoCreaInventarioPorSede() {
        when(productoRepository.findBySkuIgnoreCase("AUD-003")).thenReturn(Optional.empty());
        when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(productoRepository.save(any())).thenAnswer(inv -> {
            Producto p = inv.getArgument(0);
            p.setIdProducto(3L);
            return p;
        });

        var request = new ProductoRequest("AUD-003", "Nuevo audífono", "Descripción",
                new BigDecimal("199.00"), 1L, 20, 4, 1L, 12, null, null, true);
        var respuesta = productoService.crear(request);

        assertThat(respuesta.stock()).isEqualTo(20);
        verify(stockRepository).save(argThat(s -> s.getSede() == sede && s.getStock() == 20));
    }

    @Test
    void skuDuplicadoEsRechazado() {
        when(productoRepository.findBySkuIgnoreCase("AUD-001")).thenReturn(Optional.of(producto));
        var request = new ProductoRequest("AUD-001", "Duplicado", null,
                new BigDecimal("100.00"), 1L, 10, 5, 1L, 12, null, null, true);

        assertThatThrownBy(() -> productoService.crear(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ya existe");
    }

    @Test
    void eliminarProductoEsBajaLogica() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        productoService.eliminar(1L);
        assertThat(producto.getActivo()).isFalse();
        verify(productoRepository, never()).delete(any());
    }

    @Test
    void productoInexistenteLanzaExcepcion() {
        when(productoRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> productoService.obtenerPorId(99L))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void valorInventarioSaleDeInventarioPorSede() {
        when(stockRepository.valorInventarioTotal()).thenReturn(new BigDecimal("223433.00"));
        assertThat(productoService.valorInventario()).isEqualByComparingTo("223433.00");
    }
}
