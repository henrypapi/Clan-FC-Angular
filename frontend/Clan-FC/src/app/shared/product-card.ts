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
    <article class="product-card fade-in">
      
      <!-- Clic en la imagen lleva al detalle o catálogo filtrado -->
      <div class="product-media" [routerLink]="['/catalogo']" [queryParams]="{ q: product().nombre }">
        <div class="product-image-wrap">
          <img [src]="product().imagenUrl" [alt]="product().nombre" loading="lazy" (error)="onImageError($event)" />
          <span class="image-fallback">{{ emoji() }}</span>
        </div>
        
        <!-- Badges reactivos con Control Flow -->
        @if (product().stock === 0) {
          <span class="badge badge-agotado stock-badge">AGOTADO</span>
        } @else if (product().stock <= product().stockMinimo) {
          <span class="badge badge-bajo stock-badge">ÚLTIMAS {{ product().stock }}</span>
        } @else {
          <span class="badge badge-ok stock-badge">EN STOCK</span>
        }

        @if (product().unidadesVendidas > 0) {
          <span class="sales-badge">
            Popular · {{ product().unidadesVendidas }} vendidos
          </span>
        }
      </div>

      <div class="product-content">
        <span class="product-category">{{ product().categoriaNombre ?? 'General' }}</span>
        
        <h3 [routerLink]="['/catalogo']" [queryParams]="{ q: product().nombre }">
          {{ product().nombre }}
        </h3>
        
        <p class="product-rating" title="Valoración de clientes">
          {{ estrellas() }} <span>({{ valoracionDummy() }})</span>
        </p>

        @if (product().garantiaMeses) {
          <p class="product-warranty">✓ {{ product().garantiaMeses }} meses de garantía</p>
        }

        <div class="product-bottom">
          <div>
            <p class="product-price">{{ product().precioBase | currency:'PEN':'S/ ' }}</p>
            <p class="product-installment">12 cuotas de {{ (product().precioBase / 12) | currency:'PEN':'S/ ' }}</p>
          </div>
          
          <button 
            (click)="addToCart()"
            [disabled]="product().stock === 0"
            class="add-button">
            {{ product().stock === 0 ? '–' : '＋' }}
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

  onImageError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  addToCart() {
    try {
      this.cartService.add({ ...this.product(), _emoji: this.emoji() });
      this.toastService.show(`✔ "${this.product().nombre}" agregado al carrito`, 'exito');
    } catch (err: any) {
      this.toastService.show(err.message, 'error');
    }
  }
}
