package com.tienda.config;

import com.tienda.security.JwtAuthenticationFilter;
import com.tienda.security.UsuarioDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuración stateless con JWT.
 *
 * Modelo de autorización:
 *  - Lecturas del catálogo (GET productos/categorías): público.
 *  - Escrituras de inventario: solo ROLE_ADMIN.
 *  - Resto de endpoints futuros (/api/ordenes, /api/dashboard): autenticados.
 *
 * El cliente obtiene un token en POST /api/auth/login y lo envía como
 * Authorization: Bearer &lt;token&gt; en los endpoints protegidos.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // habilita @PreAuthorize por método si se necesita afinar
@RequiredArgsConstructor
public class SecurityConfig {

    private final UsuarioDetailsService usuarioDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // API REST stateless consumida por el frontend con fetch(): no usamos cookies de sesión ni CSRF token.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        // --- Registro público de clientes (autoregistro) ---
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/registro").permitAll()
                        // --- Catálogo público (vista CLIENTE) ---
                        .requestMatchers(HttpMethod.GET, "/api/productos/**", "/api/categorias/**").permitAll()
                        // --- Gestión de inventario (vista ADMIN) ---
                        .requestMatchers("/api/productos/**", "/api/categorias/**").hasRole("ADMIN")
                        // --- Alta/listado de usuarios (cajeros y admins): solo ADMIN ---
                        .requestMatchers("/api/usuarios/**").hasRole("ADMIN")
                        // --- Sedes: lectura autenticada, escritura solo ADMIN ---
                        .requestMatchers(HttpMethod.GET, "/api/sedes/**").authenticated()
                        .requestMatchers("/api/sedes/**").hasRole("ADMIN")
                        // --- Cajas y movimientos: cajero y admin ---
                        .requestMatchers("/api/cajas/**").hasAnyRole("CAJERO", "ADMIN")
                        // --- Dashboard ejecutivo: solo ADMIN ---
                        .requestMatchers("/api/dashboard/**").hasRole("ADMIN")
                        // --- Checkout web del cliente ---
                        .requestMatchers(HttpMethod.POST, "/api/checkout").hasAnyRole("CLIENTE", "ADMIN")
                        // --- Punto de venta, almacén, incidencias y reportes (cajero) ---
                        .requestMatchers("/api/pos/**", "/api/almacen/**", "/api/incidencias/**", "/api/reportes/**")
                            .hasAnyRole("CAJERO", "ADMIN")
                        // --- Empresas/régimen fiscal y calculadora de impuestos ---
                        .requestMatchers(HttpMethod.GET, "/api/paises").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/empresas").hasRole("ADMIN") // registro B2B
                        .requestMatchers("/api/empresas/**", "/api/impuestos/**").authenticated()
                        // --- Endpoints de entregables siguientes ---
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // --- Órdenes y todo lo demás requieren sesión ---
                        .anyRequest().authenticated())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** BCrypt para hashear y verificar contraseñas de usuarios. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(usuarioDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    /**
     * CORS: permite que Live Server (VS Code, puertos 5500-5501) llame a la API.
     * Sin esto, el navegador bloquearía fetch() cross-origin.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://127.0.0.1:5500", "http://localhost:5500",
                "http://127.0.0.1:5501", "http://localhost:5501",
                "http://127.0.0.1:4200", "http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
