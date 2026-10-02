import { AfterViewInit, Component, computed, ElementRef, HostListener, inject, input, OnDestroy, OnInit, output, signal, ViewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div class="product-modal-backdrop" (click)="onBackdropClick($event)">
      <section #dialogPanel class="product-modal" role="dialog" aria-modal="true"
               aria-labelledby="product-modal-title" tabindex="-1">
        <button type="button" class="product-modal-close" (click)="close()" aria-label="Cerrar detalle">×</button>

        <div class="product-gallery">
          <div class="product-gallery-main">
            <img [src]="selectedImage()" [alt]="product().nombre" />
            @if (images().length > 1) {
              <button type="button" class="gallery-arrow gallery-arrow-left" (click)="previousImage()" aria-label="Imagen anterior">‹</button>
              <button type="button" class="gallery-arrow gallery-arrow-right" (click)="nextImage()" aria-label="Imagen siguiente">›</button>
              <span class="gallery-counter">{{ selectedIndex() + 1 }} / {{ images().length }}</span>
            }
          </div>

          @if (images().length > 1) {
            <div class="product-thumbnails" aria-label="Galería del producto">
              @for (image of images(); track image; let index = $index) {
                <button type="button" [class.active]="selectedImage() === image"
                        (click)="selectImage(image, index)"
                        [attr.aria-label]="'Ver imagen ' + (index + 1)">
                  <img [src]="image" alt="" />
                </button>
              }
            </div>
          }
        </div>

        <div class="product-modal-info">
          <div class="product-modal-topline">
            <span>{{ product().categoriaNombre ?? 'General' }}</span>
            <small>SKU {{ product().sku }}</small>
          </div>
          <h2 id="product-modal-title">{{ product().nombre }}</h2>
          <div class="product-modal-rating"><span>★★★★★</span> Producto seleccionado por TiendaMenos</div>
          <p class="product-modal-description">{{ product().descripcion }}</p>

          <div class="product-feature-list">
            <div><i>✓</i><span><strong>Stock disponible</strong>{{ product().stock }} unidades</span></div>
            <div><i>✓</i><span><strong>Garantía incluida</strong>{{ product().garantiaMeses || 6 }} meses</span></div>
            <div><i>✓</i><span><strong>Compra protegida</strong>Cambios sin complicaciones</span></div>
          </div>

          <div class="product-modal-purchase">
            <div>
              <small>Precio online</small>
              <strong>{{ product().precioBase | currency:'PEN':'S/ ' }}</strong>
              <span>12 cuotas de {{ (product().precioBase / 12) | currency:'PEN':'S/ ' }}</span>
            </div>
            <button type="button" (click)="addToCart()" [disabled]="product().stock === 0">
              {{ product().stock === 0 ? 'Producto agotado' : 'Agregar al carrito' }}
            </button>
          </div>
          <p class="product-modal-note">🚚 Envíos a todo el Perú · Pago seguro · Respaldo local</p>
        </div>
      </section>
    </div>
  `
})
export class ProductDetailModal implements OnInit, AfterViewInit, OnDestroy {
  product = input.required<any>();
  closed = output<void>();

  @ViewChild('dialogPanel') dialogPanel?: ElementRef<HTMLElement>;

  private cartService = inject(CartService);
  private toastService = inject(ToastService);
  private previousBodyOverflow = '';

  selectedImage = signal('');
  selectedIndex = signal(0);
  images = computed<string[]>(() => {
    const gallery = Array.isArray(this.product().imagenes) ? this.product().imagenes : [];
    return gallery.length ? gallery : [this.product().imagenUrl];
  });

  ngOnInit() {
    this.selectedImage.set(this.images()[0]);
    if (typeof document !== 'undefined') {
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  }

  ngAfterViewInit() {
    this.dialogPanel?.nativeElement.focus();
  }

  ngOnDestroy() {
    if (typeof document !== 'undefined') document.body.style.overflow = this.previousBodyOverflow;
  }

  @HostListener('document:keydown.escape')
  close() {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) this.close();
  }

  selectImage(image: string, index: number) {
    this.selectedImage.set(image);
    this.selectedIndex.set(index);
  }

  previousImage() {
    const index = (this.selectedIndex() - 1 + this.images().length) % this.images().length;
    this.selectImage(this.images()[index], index);
  }

  nextImage() {
    const index = (this.selectedIndex() + 1) % this.images().length;
    this.selectImage(this.images()[index], index);
  }

  addToCart() {
    try {
      this.cartService.add(this.product());
      this.toastService.show(`✔ "${this.product().nombre}" agregado al carrito`, 'exito');
    } catch (err: any) {
      this.toastService.show(err.message, 'error');
    }
  }
}
