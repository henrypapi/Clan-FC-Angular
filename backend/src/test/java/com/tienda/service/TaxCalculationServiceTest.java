package com.tienda.service;

import com.tienda.model.EmpresaCliente;
import com.tienda.model.Pais;
import com.tienda.model.RegimenFiscal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;

/**
 * Pruebas del núcleo de IVA. La API actual recibe las entidades ya resueltas
 * (Pais / EmpresaCliente), por lo que no se necesitan repositorios mockeados.
 */
@DisplayName("TaxCalculationService — Unit Tests")
class TaxCalculationServiceTest {

    private TaxCalculationService taxCalculationService;
    private Pais peru;

    @BeforeEach
    void setUp() {
        taxCalculationService = new TaxCalculationService();
        // Equivalente a los defaults de application.properties.
        ReflectionTestUtils.setField(taxCalculationService, "tasaGeneral", BigDecimal.valueOf(16));
        ReflectionTestUtils.setField(taxCalculationService, "tasaReducido", BigDecimal.valueOf(8));
        ReflectionTestUtils.setField(taxCalculationService, "tasaExenta", BigDecimal.ZERO);

        peru = Pais.builder()
                .idPais(3L).codigoIso2("PE").nombre("Perú")
                .tasaIvaGeneral(BigDecimal.valueOf(18))
                .tasaIvaReducido(BigDecimal.valueOf(18))
                .build();
    }

    private EmpresaCliente empresa(RegimenFiscal regimen, BigDecimal tasaIva, Pais pais) {
        return EmpresaCliente.builder()
                .idEmpresa(1L).rfc("TEST123").razonSocial("Test SA")
                .regimenFiscal(regimen)
                .tasaIva(tasaIva)
                .pais(pais)
                .build();
    }

    @Test
    @DisplayName("Tasa general del país para consumidor final")
    void tasaGeneralPais() {
        assertThat(taxCalculationService.resolverTasa(null, peru))
                .isEqualByComparingTo(BigDecimal.valueOf(18));
    }

    @Test
    @DisplayName("Régimen EXENTO aplica 0%")
    void tasaExento() {
        EmpresaCliente exento = empresa(RegimenFiscal.EXENTO, null, peru);
        assertThat(taxCalculationService.resolverTasa(exento, null))
                .isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Régimen REDUCIDO usa la tasa reducida del país")
    void tasaReducido() {
        EmpresaCliente reducido = empresa(RegimenFiscal.REDUCIDO, null, peru);
        assertThat(taxCalculationService.resolverTasa(reducido, null))
                .isEqualByComparingTo(BigDecimal.valueOf(18));
    }

    @Test
    @DisplayName("Override manual de la empresa sin país vinculado")
    void tasaOverrideEmpresa() {
        EmpresaCliente general = empresa(RegimenFiscal.GENERAL, BigDecimal.valueOf(12), null);
        assertThat(taxCalculationService.resolverTasa(general, null))
                .isEqualByComparingTo(BigDecimal.valueOf(12));
    }

    @Test
    @DisplayName("Consumidor final sin país usa el default configurado")
    void tasaDefaultSinPais() {
        assertThat(taxCalculationService.resolverTasa(null, null))
                .isEqualByComparingTo(BigDecimal.valueOf(16));
    }

    @Test
    @DisplayName("Cálculo de IVA: base * tasa / 100")
    void calcularIva() {
        assertThat(taxCalculationService.calcularIva(BigDecimal.valueOf(1000), BigDecimal.valueOf(18)))
                .isEqualByComparingTo(BigDecimal.valueOf(180));
    }

    @Test
    @DisplayName("Desglose completo con país y bandera")
    void calcularTotales() {
        var resultado = taxCalculationService.calcularTotales(BigDecimal.valueOf(1000), null, peru);

        assertThat(resultado.tasaIva()).isEqualByComparingTo(BigDecimal.valueOf(18));
        assertThat(resultado.iva()).isEqualByComparingTo(BigDecimal.valueOf(180));
        assertThat(resultado.total()).isEqualByComparingTo(BigDecimal.valueOf(1180));
        assertThat(resultado.paisCodigo()).isEqualTo("PE");
        assertThat(resultado.banderaEmoji()).isEqualTo("🇵🇪");
        assertThat(resultado.regimenFiscal()).isEqualTo("GENERAL");
    }

    @Test
    @DisplayName("Desglose exento no suma IVA")
    void calcularTotalesExento() {
        EmpresaCliente exento = empresa(RegimenFiscal.EXENTO, null, peru);

        var resultado = taxCalculationService.calcularTotales(BigDecimal.valueOf(500), exento, null);

        assertThat(resultado.tasaIva()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(resultado.iva()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(resultado.total()).isEqualByComparingTo(BigDecimal.valueOf(500));
    }
}
