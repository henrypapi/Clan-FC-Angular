package com.tienda.service;

import com.tienda.dto.MovimientoAlmacenRequest;
import com.tienda.exception.RecursoNoEncontradoException;
import com.tienda.model.*;
import com.tienda.repository.MovimientoAlmacenRepository;
import com.tienda.repository.ProductoSedeStockRepository;
import com.tienda.repository.ProveedorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AlmacenService — Unit Tests")
class AlmacenServiceTest {
    @Mock private MovimientoAlmacenRepository movimientoRepository;
    @Mock private ProveedorRepository proveedorRepository;
    @Mock private ProductoSedeStockRepository stockRepository;
    @InjectMocks private AlmacenService almacenService;

    private Producto producto;
    private ProductoSedeStock inventario;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        Sede sede = Sede.builder().idSede(1L).nombre("Lima Centro").activa(true).build();
        producto = Producto.builder().idProducto(1L).sku("AUD-001")
                .nombre("Audífonos").activo(true).build();
        inventario = ProductoSedeStock.builder().producto(producto).sede(sede)
                .stock(28).stockMinimo(5).build();
        usuario = Usuario.builder().idUsuario(1L).username("admin").build();
    }

    @Test
    void registrarEntradaActualizaInventarioDeLaSede() {
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));
        when(movimientoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var respuesta = almacenService.registrar(producto,
                new MovimientoAlmacenRequest(1L, 1L, 10, "ENTRADA", null, "FAC-001", "Compra"),
                usuario);

        assertThat(inventario.getStock()).isEqualTo(38);
        assertThat(respuesta.sedeId()).isEqualTo(1L);
        verify(movimientoRepository).save(any(MovimientoAlmacen.class));
    }

    @Test
    void mermaConStockInsuficienteEsRechazada() {
        when(stockRepository.findForUpdate(1L, 1L)).thenReturn(Optional.of(inventario));
        assertThatThrownBy(() -> almacenService.registrar(producto,
                new MovimientoAlmacenRequest(1L, 1L, 100, "MERMA", null, null, "Dañados"),
                usuario))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Stock insuficiente");
    }

    @Test
    void productoSinInventarioEnSedeEsRechazado() {
        when(stockRepository.findForUpdate(1L, 9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> almacenService.registrar(producto,
                new MovimientoAlmacenRequest(1L, 9L, 1, "ENTRADA", null, null, null), usuario))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("sede 9");
    }

    @Test
    void listarMovimientosRecientes() {
        when(movimientoRepository.findTop100ByOrderByFechaDesc()).thenReturn(List.of());
        assertThat(almacenService.listarRecientes()).isEmpty();
    }
}
