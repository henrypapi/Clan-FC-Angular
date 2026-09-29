package com.tienda.dto;

public record LoginResponse(
        String token,
        String tokenType,
        long expiresInMs,
        String username,
        String nombreCompleto,
        String rol,
        String paisCodigo,
        String paisNombre,
        String banderaEmoji
) {}
