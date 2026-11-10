package com.tienda;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Smoke test de arranque completo. Requiere una instancia real de PostgreSQL
 * (ddl-auto=validate y esquema en 3FN), por lo que se desactiva en entornos
 * sin base de datos. Para ejecutarlo: levantar PostgreSQL, crear la base
 * `tiendamenos`, aplicar `database/schema.sql` y quitar @Disabled.
 */
@Disabled("Requiere PostgreSQL activo con el esquema de database/schema.sql")
@SpringBootTest
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
