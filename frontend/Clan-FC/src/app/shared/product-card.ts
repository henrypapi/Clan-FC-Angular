// src/app/shared/product-card.ts
import { Component, input, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <article class="card-producto group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 overflow-hidden flex flex-col fade-in relative">
      
      <!-- Clic en la imagen lleva al detalle o catálogo filtrado -->
      <div class="relative cursor-pointer" [routerLink]="['/catalogo']" [queryParams]="{ q: product().nombre }">
        <div class="h-44 bg-gradient-to-br flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-300" [class]="gradiente()">
          <span>{{ emoji() }}</span>
        </div>
        
        <!-- Badges reactivos con Control Flow -->
        @if (product().stock === 0) {
          <span class="badge badge-agotado absolute top-3 left-3">AGOTADO</span>
        } @else if (product().stock <= product().stockMinimo) {
          <span class="badge badge-bajo absolute top-3 left-3">¡ÚLTIMAS {{ product().stock }}!</span>
        } @else {
          <span class="badge badge-ok absolute top-3 left-3">DISPONIBLE</span>
        }

        @if (product().unidadesVendidas > 0) {
          <span class="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-[10px] font-bold text-rose-600 px-2 py-1 rounded-full shadow">
            🔥 {{ product().unidadesVendidas }} vendido(s)
          </span>
        }
      </div>

      <div class="p-4 flex flex-col gap-1.5 flex-1">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ product().categoriaNombre ?? 'General' }}</span>
        
        <h3 class="font-semibold text-slate-800 leading-snug line-clamp-2 min-h-[2.6rem] cursor-pointer hover:text-indigo-600 transition" [routerLink]="['/catalogo']" [queryParams]="{ q: product().nombre }">
          {{ product().nombre }}
        </h3>
        
        <p class="text-xs text-amber-500 select-none" title="Valoración de clientes">
          {{ estrellas() }} <span class="text-slate-400 text-[11px]">({{ valoracionDummy() }})</span>
        </p>

        @if (product().garantiaMeses) {
          <p class="text-[10px] text-emerald-600 font-semibold select-none">🛡️ {{ product().garantiaMeses }} meses de garantía</p>
        }

        <div class="flex items-end justify-between mt-auto pt-2">
          <div>
            <p class="text-lg font-extrabold text-slate-900">{{ product().precioBase | currency:'PEN':'S/ ' }}</p>
            <p class="text-[10px] text-slate-400">12 MSI de {{ (product().precioBase / 12) | currency:'PEN':'S/ ' }}</p>
          </div>
          
          <button 
            (click)="addToCart()"
            [disabled]="product().stock === 0"
            [class]="product().stock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-110 active:scale-95 text-white shadow-md'" 
            class="rounded-full w-10 h-10 flex items-center justify-center transition text-xl font-bold">
            {{ product().stock === 0 ? '–' : '+' }}
          </button>
        </div>
      </div>
    </article>
  `
})
export class ProductCard {
  product = input.required<any>(); // Definirías tu interface Producto luego
  
  private cartService = inject(CartService);
  private toastService = inject(ToastService);

  // Computeds para reemplazar funciones sueltas de tienda-tarjetas.js
  gradiente = computed(() => {
    const GRADIENTES = ["from-sky-100 to-blue-200", "from-emerald-100 to-teal-200", "from-amber-100 to-orange-200", "from-violet-100 to-purple-200"];
    return GRADIENTES[this.product().idProducto % GRADIENTES.length];
  });

  emoji = computed(() => {
    const ICONOS: Record<string, string[]> = {
      Audio: ["🎧", "🎙️", "🔊", "🎵"], Computacion: ["💻", "🖥️", "⌨️", "🖱️"],
      Smartphones: ["📱", "📲", "🔌", "🛰️"], Gaming: ["🎮", "🕹️", "👾", "🏆"], Accesorios: ["🔋", "🧵", "📡", "🧰"]
    };
    const lista = ICONOS[this.product().categoriaNombre] || ["📦"];
    return lista[this.product().idProducto % lista.length];
  });

  estrellas = computed(() => {
    const n = 35 + ((this.product().idProducto * 7) % 16);
    const llenas = Math.floor(n / 10);
    const media = (n % 10) >= 5;
    return "★".repeat(llenas) + (media ? "⯨" : "") + "☆".repeat(5 - llenas - (media ? 1 : 0));
  });

  valoracionDummy = computed(() => ((this.product().idProducto * 13) % 120) + 8);

  addToCart() {
    try {
      this.cartService.add({ ...this.product(), _emoji: this.emoji() });
      this.toastService.show(`✔ "${this.product().nombre}" agregado al carrito`, 'exito');
    } catch (err: any) {
      this.toastService.show(err.message, 'error');
    }
  }
}