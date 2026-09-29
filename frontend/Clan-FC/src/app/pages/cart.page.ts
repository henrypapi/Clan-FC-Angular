
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe],
  template: `
    <main class="cart-page max-w-6xl w-full mx-auto px-4 py-8 min-h-screen">
      @if (orderSuccess()) {
        <!-- VISTA ÉXITO -->
        <div class="cart-card max-w-lg mx-auto text-center bg-white rounded-3xl p-10 fade-in">
          <p class="text-6xl mb-4">✅</p>
          <h2 class="text-2xl font-extrabold text-slate-800">¡Pedido confirmado!</h2>
          <p class="text-sm text-slate-500 mt-2 mb-6">Tu compra fue registrada en el inventario.</p>
          <button routerLink="/catalogo" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition">
            Seguir comprando
          </button>
        </div>
      } @else if (cart.items().length === 0) {
        <!-- ESTADO VACÍO -->
        <div class="max-w-md mx-auto text-center py-20 fade-in">
          <p class="text-6xl mb-4">🛒</p>
          <h2 class="text-xl font-bold text-slate-700">Tu carrito está vacío</h2>
          <a routerLink="/catalogo" class="mt-6 inline-block bg-indigo-600 text-white font-semibold px-6 py-3 rounded-full">
            Ir al catálogo →
          </a>
        </div>
      } @else {
        <!-- VISTA CARRITO -->
        <div class="grid lg:grid-cols-[1fr_380px] gap-8 items-start fade-in">
          <section class="cart-card bg-white rounded-2xl overflow-hidden">
            <header class="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h1 class="cart-heading text-lg font-bold text-slate-800">🛒 Mi carrito</h1>
              <button (click)="cart.clear()" class="text-xs text-slate-400 hover:text-red-500 underline decoration-dotted">Vaciar carrito</button>
            </header>
            <ul class="divide-y divide-slate-100">
              @for (item of cart.items(); track item.productoId) {
                <li class="px-6 py-4 flex items-center gap-4">
                  <span class="text-2xl">{{ item.emoji }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-slate-800 truncate">{{ item.nombre }}</p>
                    <p class="text-[11px] text-slate-400">{{ item.precioBase | currency:'PEN':'S/ ' }} c/u</p>
                  </div>
                  <div class="cart-quantity flex items-center gap-1.5">
                    <button (click)="cart.changeQuantity(item.productoId, item.cantidad - 1)" class="w-7 h-7 rounded-full border border-slate-300 font-bold hover:bg-slate-50">−</button>
                    <span class="w-8 text-center font-bold text-sm">{{ item.cantidad }}</span>
                    <button (click)="cart.changeQuantity(item.productoId, item.cantidad + 1)" class="w-7 h-7 rounded-full border border-slate-300 font-bold hover:bg-slate-50">+</button>
                  </div>
                  <div class="w-24 text-right">
                    <p class="font-extrabold text-slate-800 text-sm">{{ (item.precioBase * item.cantidad) | currency:'PEN':'S/ ' }}</p>
                  </div>
                </li>
              }
            </ul>
          </section>
          <aside class="cart-summary bg-white p-6 space-y-5 lg:sticky lg:top-24">
            <h2 class="font-bold text-slate-800">Resumen de compra</h2>
            <label class="block">
              <span class="text-xs font-bold uppercase text-slate-500">Régimen fiscal</span>
              <!-- Desacoplamos el ngModel del Signal para evitar colisiones -->
              <select [ngModel]="selectedEmpresaId()" (ngModelChange)="selectedEmpresaId.set($event)" class="mt-1.5 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white outline-none">
                <option [ngValue]="null">Consumidor final (18% IVA local)</option>
                @for (emp of empresas(); track emp.idEmpresa) {
                  <option [ngValue]="emp.idEmpresa">{{ emp.banderaEmoji }} {{ emp.razonSocial }} ({{ emp.tasaIva }}%)</option>
                }
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-bold uppercase text-slate-500">Método de pago</span>
              <select [ngModel]="metodoPago()" (ngModelChange)="metodoPago.set($event)" class="mt-1.5 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="TARJETA">💳 Tarjeta</option>
                <option value="EFECTIVO">💵 Efectivo</option>
              </select>
            </label>
            <!-- Cálculos automáticos extraídos del computed() -->
            <dl class="space-y-2 text-sm border-t border-dashed border-slate-200 pt-4">
              <div class="flex justify-between"><dt class="text-slate-500">Subtotal</dt><dd class="font-semibold">{{ cart.subtotalBase() | currency:'PEN':'S/ ' }}</dd></div>
              <div class="flex justify-between"><dt class="text-slate-500">IVA ({{ currentTaxes().tasa }}%)</dt><dd class="font-semibold">{{ currentTaxes().iva | currency:'PEN':'S/ ' }}</dd></div>
              <div class="flex justify-between text-lg border-t border-slate-200 pt-3">
                <dt class="font-extrabold text-slate-800">Total</dt><dd class="checkout-total font-extrabold">{{ currentTaxes().total | currency:'PEN':'S/ ' }}</dd>
              </div>
            </dl>
            <button (click)="confirmOrder()" [disabled]="isProcessing() || cart.items().length === 0" class="primary-action w-full disabled:bg-slate-300 text-white font-bold py-3 rounded-xl shadow-md transition">
              {{ isProcessing() ? 'Procesando...' : 'Confirmar pedido' }}
            </button>
            @if (!auth.currentUser()) {
              <p class="text-xs text-center text-slate-500">🔒 Necesitas <a routerLink="/login" class="text-indigo-600 font-semibold underline">iniciar sesión</a> para comprar.</p>
            }
          </aside>
        </div>
      }
    </main>
  `
})
export class CartPage implements OnInit {
  cart = inject(CartService);
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  empresas = signal<any[]>([]);
  selectedEmpresaId = signal<number | null>(null);
  metodoPago = signal('TARJETA');
  isProcessing = signal(false);
  orderSuccess = signal(false);
  currentTaxes = computed(() => {
    const subtotal = this.cart.subtotalBase();
    const empId = this.selectedEmpresaId();
    const empresa = this.empresas().find(e => e.idEmpresa === empId);
    const tasa = empresa ? Number(empresa.tasaIva || 18) : 18;
    const iva = (subtotal * tasa) / 100;
    return { tasa, iva, total: subtotal + iva };
  });
  async ngOnInit() {
    const db = await this.api.getMockDb();
    this.empresas.set(db.empresas || []);
  }
  async confirmOrder() {
    if (!this.auth.currentUser()) {
      this.toast.show('Inicia sesión para completar tu compra 🔒', 'error');
      this.router.navigate(['/login']);
      return;
    }
    this.isProcessing.set(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      this.toast.show('✔ Pedido registrado exitosamente', 'exito');
      this.cart.clear();
      this.orderSuccess.set(true);
    } catch (err: any) {
      this.toast.show('Error al procesar el pedido', 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }
}
