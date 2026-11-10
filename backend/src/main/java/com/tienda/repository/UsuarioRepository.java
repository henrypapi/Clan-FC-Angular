package com.tienda.repository;

import com.tienda.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Acceso a la tabla usuarios. */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /** Usado por UserDetailsServiceImpl durante el login. */
    Optional<Usuario> findByUsernameIgnoreCase(String username);

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    /* ------------------- CRUD de clientes (RF1) ------------------- */

    List<Usuario> findAllByRolNombreIgnoreCaseOrderByNombreCompletoAsc(String rol);

    /** Clientes: roles CLIENTE y ADMIN (ROLE_USER / ROLE_ADMIN). */
    List<Usuario> findAllByRolNombreInOrderByNombreCompletoAsc(java.util.Collection<String> roles);

    List<Usuario> findAllByOrderByNombreCompletoAsc();

    boolean existsByEmailIgnoreCaseAndIdUsuarioNot(String email, Long idUsuario);

    boolean existsByUsernameIgnoreCaseAndIdUsuarioNot(String username, Long idUsuario);

    long countByRolNombreIgnoreCase(String rol);
}
