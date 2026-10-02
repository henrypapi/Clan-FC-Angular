package com.tienda.service;

import com.tienda.dto.IncidenciaRequest;
import com.tienda.model.*;
import com.tienda.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("IncidenciaService — Unit Tests")
class IncidenciaServiceTest {
    @Mock private IncidenciaRepository incidenciaRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private OrdenRepository ordenRepository;
    @Mock private SedeRepository sedeRepository;
    @Mock private AlmacenService almacenService;
    @InjectMocks private IncidenciaService incidenciaService;

    private Producto producto;
    private Sede sede;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        producto = Producto.builder().idProducto(1L).sku("AUD-001")
                .nombre("Audífonos").garantiaMeses(12).build();
        sede = Sede.builder().idSede(1L).nombre("Lima Centro").activa(true).build();
        usuario = Usuario.builder().idUsuario(1L).username("cajero1")
                .nombreCompleto("Cajero Demo").build();
    }

    @Test
    void crearDevolucionRegistraReingresoEnLaSede() {
        when(productoRepository.findById(1L)).thenReturn(Optional.of(producto));
        when(sedeRepository.findById(1L)).thenReturn(Optional.of(sede));
        when(incidenciaRepository.save(any())).thenAnswer(inv -> {
            Incidencia i = inv.getArgument(0);
            i.setIdIncidencia(7L);
            return i;
        });

        var request = new IncidenciaRequest(1L, 1L, null, "DEVOLUCION", 1,
                "Cliente devolvió el producto");
        var respuesta = incidenciaService.crear(request, usuario);

        assertThat(respuesta.estado()).isEqualTo("REPORTADA");
        assertThat(respuesta.sedeId()).isEqualTo(1L);
        verify(almacenService).registrar(eq(producto), any(), eq(usuario));
    }

    @Test
    void resolverDefectoRegistraMermaEnLaMismaSede() {
        Incidencia incidencia = Incidencia.builder().idIncidencia(7L)
                .tipo(TipoIncidencia.DEFECTO).estado(EstadoIncidencia.EN_REVISION)
                .producto(producto).sede(sede).cantidad(2).descripcion("Defecto de fábrica")
                .reportadoPor(usuario).build();
        when(incidenciaRepository.findById(7L)).thenReturn(Optional.of(incidencia));
        when(incidenciaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var respuesta = incidenciaService.cambiarEstado(7L, "RESUELTA", "Cambio aprobado", usuario);

        assertThat(respuesta.estado()).isEqualTo("RESUELTA");
        verify(almacenService).registrar(eq(producto), any(), eq(usuario));
    }
}
