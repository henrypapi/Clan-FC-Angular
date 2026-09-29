
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProductCard } from '../shared/product-card';
@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule, ProductCard],
  template: `
    <main class="catalog-page flex-1 min-h-screen">
      <!-- Buscador y Filtros -->
      <section class="catalog-hero text-white">
        <div class="max-w-7xl mx-auto px-4 py-10">
          <h1 class="catalog-title text-3xl md:text-4xl font-extrabold">Catálogo completo</h1>
          <div class="mt-6 flex flex-col sm:flex-row gap-3">
            <input type="search" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" (keyup.enter)="updateUrl()"
                   placeholder="🔍 Busca por nombre o SKU..."
                   class="catalog-search flex-1 rounded-full bg-white text-slate-800 px-5 py-3.5 text-sm outline-none focus:ring-4 focus:ring-emerald-300" />
            <select [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event); updateUrl()"
                    class="catalog-search rounded-full bg-white text-slate-800 px-5 py-3.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-emerald-300">
              <option value="populares">Más populares</option>
              <option value="precioAsc">Precio: menor a mayor</option>
              <option value="precioDesc">Precio: mayor a menor</option>
            </select>
          </div>
          <!-- Chips de Categoría -->
          <div class="flex flex-wrap gap-2 mt-5">
            <button (click)="setCategory(null)"
                    [class]="!activeCategory() && !stockBajo() ? 'bg-white text-indigo-700 font-bold' : 'bg-white/10 text-indigo-100'"
                    class="catalog-chip text-xs px-4 py-1.5 rounded-full border transition-all">Todas</button>
            @for (cat of categorias(); track cat.idCategoria) {
              <button (click)="setCategory(cat.idCategoria)"
                      [class]="activeCategory() === cat.idCategoria ? 'bg-white text-indigo-700 font-bold' : 'bg-white/10 text-indigo-100'"
                      class="catalog-chip text-xs px-4 py-1.5 rounded-full border transition-all">
                {{ cat.nombre }}
              </button>
            }
            <button (click)="toggleStockBajo()"
                    [class]="stockBajo() ? 'bg-white text-indigo-700 font-bold' : 'bg-white/10 text-indigo-100'"
                    class="catalog-chip text-xs px-4 py-1.5 rounded-full border transition-all">⏰ Últimas piezas</button>
          </div>
        </div>
      </section>
      <!-- Resultados -->
      <section class="max-w-7xl mx-auto px-4 py-8">
        <p class="results-count text-xs mb-4">{{ filteredProducts().length }} producto(s) encontrado(s)</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          @for (prod of filteredProducts(); track prod.idProducto) {
            <app-product-card [product]="prod" />
          } @empty {
            <p class="col-span-full text-center text-slate-400 py-16">
              <span class="text-4xl block mb-2">🔍</span>Sin resultados para tu búsqueda.
            </p>
          }
        </div>
      </section>
    </main>
  `
})
export class CatalogPage implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  productos = signal<any[]>([]);
  categorias = signal<any[]>([]);
  searchQuery = signal('');
  sortBy = signal('populares');
  activeCategory = signal<number | null>(null);
  stockBajo = signal(false);
  filteredProducts = computed(() => {
    let list = this.productos();
    if (this.activeCategory()) list = list.filter(p => p.categoriaId === this.activeCategory());
    if (this.stockBajo()) list = list.filter(p => p.stock > 0 && p.stock <= p.stockMinimo);
    const query = this.searchQuery().toLowerCase();
    if (query) list = list.filter(p => p.nombre.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
    switch (this.sortBy()) {
      case 'precioAsc': return [...list].sort((a, b) => a.precioBase - b.precioBase);
      case 'precioDesc': return [...list].sort((a, b) => b.precioBase - a.precioBase);
      default: return list;
    }
  });
  async ngOnInit() {
    const db = await this.api.getMockDb();
    this.productos.set(db.productos.filter((p: any) => p.activo !== false));
    this.categorias.set(db.categorias.filter((c: any) => c.activa !== false));
    this.route.queryParams.subscribe(params => {
      this.searchQuery.set(params['q'] || '');
      this.activeCategory.set(params['cat'] ? Number(params['cat']) : null);
      this.stockBajo.set(params['stock'] === 'bajo');
    });
  }
  updateUrl() {
    this.router.navigate([], {
      queryParams: {
        q: this.searchQuery() || null,
        cat: this.activeCategory() || null,
        stock: this.stockBajo() ? 'bajo' : null
      },
      queryParamsHandling: 'merge'
    });
  }
  setCategory(id: number | null) {
    this.activeCategory.set(id);
    this.stockBajo.set(false);
    this.updateUrl();
  }
  toggleStockBajo() {
    this.stockBajo.set(true);
    this.activeCategory.set(null);
    this.updateUrl();
  }
}
