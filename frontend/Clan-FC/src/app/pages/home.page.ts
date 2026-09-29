import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../shared/product-card';
import { CategoryCard } from '../shared/category-card';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ProductCard, CategoryCard],
  template: `
    <main class="store-main">
      <section class="hero-section">
        <div class="hero-orbit hero-orbit-one"></div>
        <div class="hero-orbit hero-orbit-two"></div>
        <div class="store-shell hero-grid">
          <div class="hero-copy fade-in">
            <span class="eyebrow"><i></i> Selección premium · Precios honestos</span>
            <h1>Tecnología para <span>hacer más.</span></h1>
            <p>
              Equipa tu día con productos elegidos por rendimiento, diseño y precio.
              Compra fácil, recibe rápido y cuenta con respaldo local.
            </p>
            <div class="hero-actions">
              <a routerLink="/catalogo" class="button button-primary">Explorar catálogo <span>→</span></a>
              <a routerLink="/catalogo" [queryParams]="{ stock: 'bajo' }" class="button button-secondary">Ver ofertas</a>
            </div>
            <div class="hero-proof">
              <div><strong>+24 h</strong><span>Despacho rápido</span></div>
              <div><strong>12 meses</strong><span>Garantía real</span></div>
              <div><strong>4 sedes</strong><span>Atención cercana</span></div>
            </div>
          </div>
          <div class="hero-visual fade-in">
            <img
              src="/images/tiendamenos-tech-hero.png"
              alt="Selección premium de tecnología TiendaMenos"
            />
            <div class="hero-offer"><small>OFERTA DE LA SEMANA</small><strong>Hasta 35% dscto.</strong></div>
            <div class="hero-rating"><span>★</span><strong>4.9</strong><small>Clientes felices</small></div>
          </div>
        </div>
      </section>

      <section class="benefit-strip">
        <div class="store-shell benefit-grid">
          <div><span>🚚</span><p><strong>Envíos a todo el Perú</strong><small>Seguimiento en cada etapa</small></p></div>
          <div><span>🔒</span><p><strong>Compra 100% segura</strong><small>Tus datos siempre protegidos</small></p></div>
          <div><span>↺</span><p><strong>Cambios sin complicaciones</strong><small>Hasta 30 días</small></p></div>
          <div><span>🎧</span><p><strong>Asesoría especializada</strong><small>Estamos para ayudarte</small></p></div>
        </div>
      </section>

      <section class="store-shell section-block">
        <div class="section-heading">
          <div><span class="section-kicker">Encuentra lo tuyo</span><h2>Compra por categoría</h2></div>
          <a routerLink="/catalogo">Ver todas <span>→</span></a>
        </div>
        <div class="category-grid">
          @for (cat of categorias(); track cat.idCategoria) {
            <app-category-card [category]="cat" />
          }
        </div>
      </section>

      <section class="store-shell section-block products-section">
        <div class="section-heading">
          <div><span class="section-kicker">Elegidos para ti</span><h2>Tres formas de mejorar tu día</h2></div>
          <div class="carousel-actions" aria-label="Controles del carrusel">
            <button type="button" (click)="previousProducts()" aria-label="Productos anteriores">←</button>
            <span>{{ carouselPage() + 1 }} / {{ carouselTotalPages() }}</span>
            <button type="button" (click)="nextProducts()" aria-label="Siguientes productos">→</button>
          </div>
        </div>

        <div class="product-carousel-shell">
          <div class="carousel-glow"></div>
          <div class="product-carousel" [attr.data-page]="carouselPage()">
          @for (prod of carouselProducts(); track prod.idProducto) {
            <div class="carousel-slide"><app-product-card [product]="prod" /></div>
          } @empty {
            <p class="empty-state">
              <span class="text-4xl block mb-2">📦</span>Todavía no hay productos para mostrar.
            </p>
          }
          </div>
          <div class="carousel-progress"><i [style.width.%]="carouselProgress()"></i></div>
        </div>

        <div class="carousel-footer">
          <p><strong>Selección que cambia contigo.</strong> Descubre una nueva combinación cada vez.</p>
          <a routerLink="/catalogo" class="button button-primary">Ver todos los productos <span>→</span></a>
        </div>
      </section>

      <section class="store-shell brand-story">
        <div class="brand-story-copy">
          <span class="section-kicker">Tecnología sin complicaciones</span>
          <h2>No vendemos cajas.<br />Elegimos herramientas para tu vida.</h2>
          <p>Comparamos, seleccionamos y respaldamos cada producto para que tú solo tengas que disfrutarlo.</p>
          <a routerLink="/catalogo" [queryParams]="{ cat: 2 }">Explorar productividad <span>↗</span></a>
        </div>
        <div class="brand-story-stats">
          <div><strong>01</strong><span>Productos seleccionados por utilidad real.</span></div>
          <div><strong>02</strong><span>Stock visible y precios siempre transparentes.</span></div>
          <div><strong>03</strong><span>Asesoría humana antes y después de comprar.</span></div>
        </div>
      </section>

      <section class="store-shell newsletter">
        <div><span class="section-kicker">Beneficios exclusivos</span><h2>Que las mejores ofertas te encuentren.</h2><p>Novedades, lanzamientos y descuentos sin llenar tu bandeja.</p></div>
        <form class="newsletter-form" (submit)="$event.preventDefault()"><input type="email" placeholder="tu@email.com" aria-label="Correo electrónico"/><button type="submit">Quiero enterarme</button></form>
      </section>

      <footer class="site-footer">
        <div class="store-shell footer-grid"><div><strong>Tienda<span>Menos</span></strong><p>Tecnología elegida para hacer tu vida más simple.</p></div><div><b>Compra</b><a routerLink="/catalogo">Catálogo</a><a routerLink="/carrito">Mi carrito</a></div><div><b>Ayuda</b><span>Envíos y entregas</span><span>Cambios y garantía</span></div><div><b>Contacto</b><span>Lun–Sáb, 9:00–19:00</span><span>hola@tiendamenos.pe</span></div></div>
        <div class="store-shell footer-bottom">© 2026 TiendaMenos. Compra inteligente, vive mejor.</div>
      </footer>
    </main>
  `
})
export class HomePage implements OnInit {
  private api = inject(ApiService);
  
  categorias = signal<any[]>([]);
  populares = signal<any[]>([]);
  carouselPage = signal(0);

  carouselTotalPages = computed(() => Math.max(1, Math.ceil(this.populares().length / 3)));
  carouselProducts = computed(() => {
    const products = this.populares();
    if (!products.length) return [];
    const start = this.carouselPage() * 3;
    return Array.from({ length: Math.min(3, products.length) }, (_, index) => products[(start + index) % products.length]);
  });
  carouselProgress = computed(() => ((this.carouselPage() + 1) / this.carouselTotalPages()) * 100);

  async ngOnInit() {
    // Almacenamos los datos en Signals tras la carga inicial
    const db = await this.api.getMockDb();
    this.categorias.set(db.categorias.filter((c: any) => c.activa !== false));
    this.populares.set(db.productos.filter((p: any) => p.activo !== false).slice(0, 12));
  }

  nextProducts() {
    this.carouselPage.update(page => (page + 1) % this.carouselTotalPages());
  }

  previousProducts() {
    this.carouselPage.update(page => (page - 1 + this.carouselTotalPages()) % this.carouselTotalPages());
  }
}
