
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="site-header sticky top-0 z-40 backdrop-blur">
      <nav class="site-nav max-w-7xl mx-auto px-4 flex items-center gap-5">
        <!-- Logo -->
        <a routerLink="/" class="brand-mark text-2xl font-extrabold tracking-tight shrink-0">
          Tienda<span class="text-emerald-500">Menos</span><span class="text-rose-500">.</span>
        </a>
        <!-- Enlaces -->
        <div class="hidden lg:flex items-center gap-5 text-sm font-medium">
          <a routerLink="/catalogo" class="nav-link font-semibold">Catálogo</a>
          <!-- Control Flow para ocultar/mostrar según ROL -->
          @if (auth.hasRole('CAJERO', 'ADMIN')) {
            <a routerLink="/pos" class="nav-link font-semibold">🧾 Caja</a>
          }
          @if (auth.hasRole('ADMIN')) {
            <a routerLink="/admin" class="nav-link font-semibold">Panel Admin</a>
          }
        </div>
        <!-- Zona de Sesión y Carrito -->
        <div class="ml-auto flex items-center gap-3">
          @if (auth.currentUser(); as user) {
            <!-- UI Usuario Logueado -->
            <span class="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-semibold"
              [class]="user.rol === 'ADMIN' ? 'bg-amber-100 text-amber-800' : (user.rol === 'CAJERO' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700')">
              {{ user.banderaEmoji }} {{ user.username }} · {{ user.rol }}
            </span>
            <button (click)="auth.logout()" class="text-xs text-slate-500 hover:text-rose-600 underline decoration-dotted">Salir</button>
          } @else {
            <!-- UI Visitante -->
            <a routerLink="/login" class="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition">Iniciar sesión</a>
            <a routerLink="/registro" class="hidden sm:inline-block text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full transition">Crear cuenta</a>
          }
          <!-- Carrito Reactivo -->
          <a routerLink="/carrito" title="Ver mi carrito" class="cart-button relative p-2 rounded-full transition text-xl">
            🛒
            @if (cart.totalUnits() > 0) {
              <span class="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
