import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../shared/product-card';
import { CategoryCard } from '../shared/category-card';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ProductCard, CategoryCard],
  template: `
    <main class="flex-1">
      
      <!-- HERO PROMOCIONAL -->
      <section class="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white">
        <div class="max-w-7xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center relative">
          <div class="fade-in">
            <span class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest">
              ⚡ Semana de bienvenida
            </span>
            <h1 class="mt-4 text-4xl md:text-5xl font-extrabold leading-[1.1]">
              Todo lo que buscas,<br /><span class="text-amber-300">hasta 40% menos.</span>
            </h1>
            <p class="mt-4 text-indigo-100/90 max-w-md text-sm md:text-base">
              Electrónica, hogar, oficina y deporte con precios que sí te convienen.
              Compra sin registrarte; inicia sesión solo al pagar.
            </p>
            <div class="mt-7 flex flex-wrap gap-3">
              <a routerLink="/catalogo" class="bg-white text-indigo-700 font-bold px-6 py-3 rounded-full shadow-lg shadow-indigo-900/30 hover:-translate-y-0.5 hover:shadow-xl transition text-sm">
                Comprar ahora →
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- CATEGORÍAS -->
      <section class="max-w-7xl mx-auto px-4 pt-12">
        <h2 class="text-2xl font-extrabold text-slate-800 mb-5">Explora por categoría</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (cat of categorias(); track cat.idCategoria) {
            <app-category-card [category]="cat" />
          }
        </div>
      </section>

      <!-- LO MÁS POPULAR -->
      <section class="max-w-7xl mx-auto px-4 py-12">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 class="text-2xl font-extrabold text-slate-800">🔥 Lo más popular</h2>
            <p class="text-xs text-slate-400 mt-0.5">Lo que todos están comprando esta semana</p>
          </div>
          <a routerLink="/catalogo" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow transition">
            Ver catálogo completo →
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          @for (prod of populares(); track prod.idProducto) {
            <app-product-card [product]="prod" />
          } @empty {
            <p class="text-center text-slate-400 py-16 col-span-full">
              <span class="text-4xl block mb-2">📦</span>Todavía no hay productos para mostrar.
            </p>
          }
        </div>
      </section>
    </main>
  `
})
export class HomePage implements OnInit {
  private api = inject(ApiService);
  
  categorias = signal<any[]>([]);
  populares = signal<any[]>([]);

  async ngOnInit() {
    // Almacenamos los datos en Signals tras la carga inicial
    const db = await this.api.getMockDb();
    this.categorias.set(db.categorias.filter((c: any) => c.activa !== false));
    this.populares.set(db.productos.slice(0, 8)); // Simulación de los 8 más vendidos
  }
}