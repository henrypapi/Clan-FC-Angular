package com.tienda.repository;

import com.tienda.model.ProductoSedeStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Collection;

public interface ProductoSedeStockRepository extends JpaRepository<ProductoSedeStock, Long> {

    List<ProductoSedeStock> findBySedeIdSede(Long idSede);

    Optional<ProductoSedeStock> findByProductoIdProductoAndSedeIdSede(Long idProducto, Long idSede);

    /** Bloqueo de fila para evitar sobreventas concurrentes en una sede. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT pss FROM ProductoSedeStock pss WHERE pss.producto.idProducto = :productoId AND pss.sede.idSede = :sedeId")
    Optional<ProductoSedeStock> findForUpdate(@Param("productoId") Long productoId,
                                              @Param("sedeId") Long sedeId);

    interface StockResumen {
        Long getProductoId();
        Long getStockTotal();
        Integer getStockMinimo();
    }

    /** Agrega el inventario en una sola consulta, evitando N+1 en catálogo. */
    @Query("""
           SELECT pss.producto.idProducto AS productoId,
                  SUM(pss.stock) AS stockTotal,
                  MIN(pss.stockMinimo) AS stockMinimo
           FROM ProductoSedeStock pss
           WHERE pss.producto.idProducto IN :productoIds
           GROUP BY pss.producto.idProducto
           """)
    List<StockResumen> resumirStock(@Param("productoIds") Collection<Long> productoIds);

    @Query("SELECT COALESCE(SUM(p.precioBase * pss.stock), 0) " +
           "FROM ProductoSedeStock pss JOIN pss.producto p " +
           "WHERE pss.sede.idSede = :sedeId")
    BigDecimal valorInventarioPorSede(@Param("sedeId") Long sedeId);

    @Query("SELECT COUNT(pss) FROM ProductoSedeStock pss " +
           "WHERE pss.sede.idSede = :sedeId AND pss.stock <= pss.stockMinimo")
    long contarStockBajoPorSede(@Param("sedeId") Long sedeId);

    @Query("SELECT COALESCE(SUM(p.precioBase * pss.stock), 0) " +
           "FROM ProductoSedeStock pss JOIN pss.producto p")
    BigDecimal valorInventarioTotal();

    @Query("SELECT p FROM ProductoSedeStock p WHERE p.sede.idSede = :idSede AND p.stock <= p.stockMinimo")
    List<ProductoSedeStock> encontrarStockBajoPorSede(@Param("idSede") Long idSede);
}
