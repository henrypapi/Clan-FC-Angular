// src/app/shared/navbar.ts
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="site-header">
      <nav class="store-shell nav-shell">
        <a routerLink="/" class="brand" aria-label="TiendaMenos, inicio">
          <span class="brand-mark">TM</span>
          <span class="brand-copy">Tienda<span>Menos</span><small>Tecnología que suma</small></span>
        </a>

        <div class="nav-links">
          <a routerLink="/">Inicio</a>
          <a routerLink="/catalogo">Catálogo</a>
          <a routerLink="/catalogo" [queryParams]="{ cat: 2 }">Computación</a>
          <a routerLink="/catalogo" [queryParams]="{ cat: 3 }">Smartphones</a>
          
          <!-- Control Flow para ocultar/mostrar según ROL -->
          @if (auth.hasRole('CAJERO', 'ADMIN')) {
            <a routerLink="/pos">Caja</a>
          }
          @if (auth.hasRole('ADMIN')) {
            <a routerLink="/admin">Administración</a>
          }
        </div>

        <!-- Zona de Sesión y Carrito -->
        <div class="nav-actions">
          
          @if (auth.currentUser(); as user) {
            <!-- UI Usuario Logueado -->
            <span class="user-pill"
              [class]="user.rol === 'ADMIN' ? 'bg-amber-100 text-amber-800' : (user.rol === 'CAJERO' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700')">
              {{ user.banderaEmoji }} {{ user.username }} · {{ user.rol }}
            </span>
            <button (click)="auth.logout()" class="nav-text-button">Salir</button>
          } @else {
            <!-- UI Visitante -->
            <a routerLink="/login" class="account-link"><span class="account-icon">⌾</span><span>Ingresar</span></a>
          }

          <!-- Carrito Reactivo -->
          <a routerLink="/carrito" title="Ver mi carrito" class="cart-button">
            <span aria-hidden="true">🛒</span><span class="cart-label">Carrito</span>
            @if (cart.totalUnits() > 0) {
              <span class="cart-count">
                {{ cart.totalUnits() }}
              </span>
            }
          </a>
        </div>
      </nav>
    </header>
  `
})
export class Navbar {
  auth = inject(AuthService);
  cart = inject(CartService);
}
