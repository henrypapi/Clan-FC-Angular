package com.tienda.stress;

import com.tienda.dto.CheckoutRequest;
import com.tienda.exception.StockInsuficienteException;
import com.tienda.model.CanalVenta;
import com.tienda.model.Categoria;
import com.tienda.model.Pais;
import com.tienda.model.Producto;
import com.tienda.model.ProductoSedeStock;
import com.tienda.model.Rol;
import com.tienda.model.Sede;
import com.tienda.model.Usuario;
import com.tienda.repository.CategoriaRepository;
import com.tienda.repository.MovimientoAlmacenRepository;
import com.tienda.repository.OrdenRepository;
import com.tienda.repository.PaisRepository;
import com.tienda.repository.ProductoRepository;
import com.tienda.repository.ProductoSedeStockRepository;
import com.tienda.repository.RolRepository;
import com.tienda.repository.SedeRepository;
import com.tienda.repository.UsuarioRepository;
import com.tienda.service.CheckoutService;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PRUEBA DE ESTRÉS / CONCURRENCIA REAL contra PostgreSQL.
 *
 * Se ejecuta solo cuando RUN_STRESS_TESTS=true porque necesita:
 *   - PostgreSQL activo con database/schema.sql aplicado.
 *   - Datos semilla (roles, países, al menos una sede y una categoría).
 *
 * Qué valida:
 *   - 100 cobros concurrentes (20 hilos) sobre un producto con 40 unidades.
 *   - Exactamente 40 ventas exitosas y 60 rechazos por stock.
 *   - El stock final es 0 y nunca queda negativo (no hay sobreventa).
 *
 * Ejecución:
 *   PowerShell:
 *     $env:RUN_STRESS_TESTS="true"
 *     .\mvnw.cmd test -Dtest=CheckoutConcurrencyStressTest
 */
@SpringBootTest
@Tag("stress")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(named = "RUN_STRESS_TESTS", matches = "true")
@DisplayName("Checkout — Stress de concurrencia (requiere PostgreSQL)")
class CheckoutConcurrencyStressTest {

    private static final int STOCK_INICIAL = 40;
    private static final int INTENTOS = 100;
    private static final int HILOS = 20;

    @Autowired private CheckoutService checkoutService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private PaisRepository paisRepository;
    @Autowired private SedeRepository sedeRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private ProductoSedeStockRepository stockRepository;
    @Autowired private OrdenRepository ordenRepository;
    @Autowired private MovimientoAlmacenRepository movimientoRepository;

    private Usuario cliente;
    private Producto producto;
    private ProductoSedeStock stock;
    private Sede sede;

    @BeforeAll
    void prepararDatos() {
        Rol rol = rolRepository.findByNombreIgnoreCase("CLIENTE")
                .orElseThrow(() -> new IllegalStateException("Falta el rol CLIENTE en la BD"));
        Pais pais = paisRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta un país en la BD"));
        sede = sedeRepository.findAll().stream().filter(Sede::getActiva).findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta una sede activa en la BD"));
        Categoria categoria = categoriaRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta una categoría en la BD"));

        String sufijo = Long.toString(System.nanoTime());

        cliente = usuarioRepository.save(Usuario.builder()
                .rol(rol)
                .username("stress-" + sufijo + "@test.pe")
                .email("stress-" + sufijo + "@test.pe")
                .passwordHash("$2a$10$stress")
                .nombreCompleto("Cliente Stress")
                .pais(pais)
                .activo(true)
                .build());

        producto = productoRepository.save(Producto.builder()
                .sku("STRESS-" + sufijo)
                .nombre("Producto Stress")
                .descripcion("Producto temporal para prueba de concurrencia")
                .precioBase(new BigDecimal("10.00"))
                .garantiaMeses(0)
                .categoria(categoria)
                .activo(true)
                .build());

        stock = stockRepository.save(ProductoSedeStock.builder()
                .producto(producto)
                .sede(sede)
                .stock(STOCK_INICIAL)
                .stockMinimo(0)
                .build());
    }

    @AfterAll
    void limpiarDatos() {
        if (cliente != null) {
            ordenRepository.findAllByUsuarioIdUsuarioOrderByFechaCreacionDesc(cliente.getIdUsuario())
                    .forEach(ordenRepository::delete);
        }
        if (producto != null) {
            // El kardex referencia producto/sede: se limpia antes de borrar el producto.
            movimientoRepository.findAll().stream()
                    .filter(m -> m.getProducto() != null
                            && producto.getIdProducto().equals(m.getProducto().getIdProducto()))
                    .forEach(movimientoRepository::delete);
            stockRepository.findByProductoIdProductoAndSedeIdSede(
                            producto.getIdProducto(), sede.getIdSede())
                    .ifPresent(stockRepository::delete);
            productoRepository.delete(producto);
        }
        if (cliente != null) {
            usuarioRepository.delete(cliente);
        }
    }

    @Test
    @DisplayName("100 cobros concurrentes sobre 40 unidades: no hay sobreventa")
    void noHaySobreventaBajoConcurrencia() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(HILOS);
        CountDownLatch inicio = new CountDownLatch(1);
        AtomicInteger exitos = new AtomicInteger();
        AtomicInteger sinStock = new AtomicInteger();
        List<Future<?>> futuros = new ArrayList<>();

        for (int i = 0; i < INTENTOS; i++) {
            futuros.add(pool.submit(() -> {
                inicio.await();
                try {
                    checkoutService.procesar(
                            new CheckoutRequest(
                                    List.of(new CheckoutRequest.ItemCheckoutRequest(
                                            producto.getIdProducto(), 1)),
                                    sede.getIdSede(),
                                    null,
                                    cliente.getIdUsuario(),
                                    "EFECTIVO"),
                            CanalVenta.CAJA,
                            cliente.getUsername());
                    exitos.incrementAndGet();
                } catch (StockInsuficienteException e) {
                    sinStock.incrementAndGet();
                }
                return null;
            }));
        }

        inicio.countDown();
        for (Future<?> futuro : futuros) {
            futuro.get(60, TimeUnit.SECONDS);
        }
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);

        ProductoSedeStock stockFinal = stockRepository.findById(stock.getId()).orElseThrow();

        assertThat(exitos.get())
                .as("ventas exitosas")
                .isEqualTo(STOCK_INICIAL);
        assertThat(sinStock.get())
                .as("rechazos por stock")
                .isEqualTo(INTENTOS - STOCK_INICIAL);
        assertThat(stockFinal.getStock())
                .as("stock final")
                .isZero();
        assertThat(stockFinal.getStock())
                .as("el stock nunca puede ser negativo")
                .isGreaterThanOrEqualTo(0);
    }
}
