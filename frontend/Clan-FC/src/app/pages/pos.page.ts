import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <div class="bg-slate-900 min-h-screen text-slate-100 font-sans">
      
      <!-- BARRA SUPERIOR Y PESTAÑAS -->
      <header class="bg-slate-800 border-b border-slate-700 shadow">
        <nav class="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center gap-4">
          <a routerLink="/" class="text-lg font-extrabold text-white">Tienda<span class="text-emerald-400">Menos</span></a>
          <span class="text-xs bg-emerald-600 px-2.5 py-1 rounded-full font-bold tracking-wide">🧾 CAJA / POS</span>
          <span class="text-xs text-slate-400">Cajero: {{ auth.currentUser()?.username }}</span>
          
          <div class="ml-auto flex items-center gap-3 text-sm">
            <span class="text-xs font-bold text-emerald-400">💵 {{ efectivoCaja() | currency:'PEN':'S/ ' }}</span>
            <button (click)="auth.logout()" class="text-xs underline decoration-dotted hover:text-rose-400">Cerrar sesión</button>
          </div>
        </nav>

        <div class="max-w-[1400px] mx-auto px-4 flex gap-1 overflow-x-auto">
          <button (click)="activeTab.set('venta')" [class]="activeTab() === 'venta' ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400'" class="px-4 py-2.5 text-sm font-bold border-b-2 whitespace-nowrap">💰 Venta</button>
          <button (click)="activeTab.set('almacen')" [class]="activeTab() === 'almacen' ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400'" class="px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap">📦 Almacén</button>
          <button (click)="activeTab.set('incidencias')" [class]="activeTab() === 'incidencias' ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400'" class="px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap">⚠️ Incidencias</button>
          <button (click)="activeTab.set('reporte')" [class]="activeTab() === 'reporte' ? 'border-emerald-400 text-white' : 'border-transparent text-slate-400'" class="px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap">📊 Reporte</button>
        </div>
      </header>

      <main class="max-w-[1400px] mx-auto p-4">
        
        @switch (activeTab()) {
          @case ('venta') {
            <!-- PESTAÑA 1: VENTA -->
            <section class="grid lg:grid-cols-[1fr_430px] gap-4 items-start fade-in">
              <!-- Catálogo rápido -->
              <div class="bg-slate-800/60 rounded-2xl border border-slate-700 overflow-hidden">
                <div class="p-4 space-y-3">
                  <div class="flex flex-wrap gap-2">
                    <input type="search" [(ngModel)]="searchQuery" placeholder="🔍 Buscar por nombre o SKU..." class="flex-1 min-w-[200px] bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 p-4 pt-1 max-h-[62vh] overflow-y-auto">
                  @for (prod of filteredCatalog(); track prod.idProducto) {
                    <button (click)="addToTicket(prod)" class="bg-white text-slate-800 rounded-xl p-3 text-left hover:ring-2 hover:ring-emerald-500 active:scale-95 transition shadow-sm">
                      <span class="text-3xl block mb-1">{{ getEmoji(prod.categoriaNombre) }}</span>
                      <p class="text-[11px] font-semibold leading-tight line-clamp-2 min-h-[2rem]">{{ prod.nombre }}</p>
                      <p class="mt-1 flex justify-between items-baseline">
                        <b class="text-emerald-600 text-sm">{{ prod.precioBase | currency:'PEN':'S/ ' }}</b>
                        <span class="text-[9px] text-slate-400">{{ prod.stock }} u.</span>
                      </p>
                    </button>
                  }
                </div>
              </div>

              <!-- Ticket de cobro -->
              <aside class="bg-white text-slate-800 rounded-2xl shadow-2xl overflow-hidden lg:sticky lg:top-4">
                <header class="bg-emerald-600 text-white px-5 py-3 flex justify-between items-center">
                  <h2 class="font-extrabold tracking-wide">TICKET DE VENTA</h2>
                  <button (click)="ticket.set([])" class="text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-full transition">✕ Limpiar</button>
                </header>

                <div class="p-4 space-y-3 border-b border-dashed border-slate-300">
                  <label class="block">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente / País fiscal</span>
                    <select [(ngModel)]="selectedEmpresaId" class="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white outline-none">
                      <option [ngValue]="null">Consumidor final (18%)</option>
                      @for (emp of empresas(); track emp.idEmpresa) {
                        <option [ngValue]="emp.idEmpresa">{{ emp.banderaEmoji }} {{ emp.razonSocial }}</option>
                      }
                    </select>
                  </label>
                  
                  <label class="block">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Método de pago</span>
                    <div class="mt-1 grid grid-cols-2 gap-1.5 text-xs font-semibold">
                      <button (click)="metodoPago.set('EFECTIVO')" [class]="metodoPago() === 'EFECTIVO' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'" class="py-2 rounded-xl border-2 transition">💵 Efectivo</button>
                      <button (click)="metodoPago.set('TARJETA')" [class]="metodoPago() === 'TARJETA' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'" class="py-2 rounded-xl border-2 transition">💳 Tarjeta</button>
                      <button (click)="metodoPago.set('YAPE')" [class]="metodoPago() === 'YAPE' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'" class="py-2 rounded-xl border-2 transition">📱 Yape</button>
                    </div>
                  </label>
                </div>

                <ul class="max-h-64 overflow-y-auto divide-y divide-slate-100 text-sm">
                  @for (t of ticket(); track t.productoId) {
                    <li class="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                      <span class="text-xl">{{ getEmoji('') }}</span>
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold truncate text-[13px]">{{ t.nombre }}</p>
                        <p class="text-[11px] text-slate-400">{{ t.precioBase | currency:'PEN':'S/ ' }} c/u</p>
                      </div>
                      <div class="flex items-center gap-1">
                        <button (click)="changeQty(t.productoId, -1)" class="w-6 h-6 rounded-full border font-bold hover:bg-slate-100">−</button>
                        <span class="w-7 text-center font-bold">{{ t.cantidad }}</span>
                        <button (click)="changeQty(t.productoId, 1)" class="w-6 h-6 rounded-full border font-bold hover:bg-slate-100">+</button>
                      </div>
                      <span class="w-20 text-right font-bold text-[13px]">{{ (t.precioBase * t.cantidad) | currency:'PEN':'S/ ' }}</span>
                    </li>
                  } @empty {
                    <p class="text-center text-xs text-slate-400 py-8">Toca un producto para agregarlo</p>
                  }
                </ul>

                <div class="p-4 space-y-1.5 text-sm border-t border-dashed border-slate-300">
                  <div class="flex justify-between"><span class="text-slate-500">Subtotal</span><b>{{ subtotalBase() | currency:'PEN':'S/ ' }}</b></div>
                  <div class="flex justify-between"><span class="text-slate-500">IVA ({{ currentTaxes().tasa }}%)</span><b>{{ currentTaxes().iva | currency:'PEN':'S/ ' }}</b></div>
                  <div class="flex justify-between items-end pt-2">
                    <span class="font-extrabold text-slate-800 text-lg">TOTAL</span>
                    <b class="text-3xl font-extrabold text-emerald-600 tracking-tight">{{ currentTaxes().total | currency:'PEN':'S/ ' }}</b>
                  </div>
                </div>

                <div class="p-4 pt-0">
                  <button (click)="cobrar()" [disabled]="ticket().length === 0 || isProcessing()" class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-lg py-3.5 rounded-xl shadow-md transition">
                    {{ isProcessing() ? 'PROCESANDO...' : 'COBRAR' }}
                  </button>
                </div>
              </aside>
            </section>
          }
          @case ('almacen') {
            <section class="fade-in"><p class="text-slate-400">Pestaña de Almacén (En construcción...)</p></section>
          }
          @case ('incidencias') {
            <section class="fade-in"><p class="text-slate-400">Pestaña de Incidencias (En construcción...)</p></section>
          }
          @case ('reporte') {
            <section class="fade-in"><p class="text-slate-400">Pestaña de Reporte (En construcción...)</p></section>
          }
        }
      </main>

      <!-- MODAL: HABILITAR CAJA -->
      @if (showHabilitarModal()) {
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white text-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center fade-in">
            <p class="text-6xl mb-3">🔐</p>
            <h3 class="text-2xl font-extrabold">Habilitación de Caja</h3>
            <p class="text-sm text-slate-500 mt-1 mb-4">Ingresa el fondo inicial para operar.</p>
            
            <label class="block text-left mb-4">
              <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Fondo inicial (S/)</span>
              <input type="number" [(ngModel)]="fondoInicial" min="1" class="mt-1 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-center focus:border-emerald-500 outline-none" />
            </label>

            <button (click)="habilitarCaja()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-lg py-3.5 rounded-xl shadow-lg transition">
              ✅ Habilitar Caja
            </button>
          </div>
        </div>
      }

      <!-- MODAL: COBRO EXITOSO -->
      @if (showExitoModal()) {
        <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white text-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center fade-in">
            <p class="text-6xl mb-3">💰</p>
            <h3 class="text-2xl font-extrabold">Cobro realizado</h3>
            <p class="text-sm text-slate-500 mt-1 mb-6">La venta quedó registrada en caja.</p>
            <button (click)="showExitoModal.set(false)" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition">
              Nueva venta →
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class PosPage implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  // Tabs
  activeTab = signal('venta');

  // Estado Modal Caja
  cajaHabilitada = signal(false);
  showHabilitarModal = signal(false);
  fondoInicial = signal(200);
  efectivoCaja = signal(0);

  // Estado Venta
  catalogo = signal<any[]>([]);
  empresas = signal<any[]>([]);
  searchQuery = signal('');
  selectedEmpresaId = signal<number | null>(null);
  metodoPago = signal('EFECTIVO');
  ticket = signal<any[]>([]);
  
  isProcessing = signal(false);
  showExitoModal = signal(false);

  // Computed Catalog (Filtra solo con stock)
  filteredCatalog = computed(() => {
    let list = this.catalogo().filter(p => p.stock > 0);
    const query = this.searchQuery().toLowerCase();
    if (query) {
      list = list.filter(p => p.nombre.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
    }
    return list;
  });

  // Computed Ticket
  subtotalBase = computed(() => this.ticket().reduce((acc, t) => acc + (t.precioBase * t.cantidad), 0));
  
  currentTaxes = computed(() => {
    const subtotal = this.subtotalBase();
    const empId = this.selectedEmpresaId();
    const empresa = this.empresas().find(e => e.idEmpresa === empId);
    const tasa = empresa ? Number(empresa.tasaIva || 18) : 18;
    const iva = (subtotal * tasa) / 100;
    return { tasa, iva, total: subtotal + iva };
  });

  async ngOnInit() {
    this.verificarHabilitacion();
    
    // Cargar Catálogo Mock
    const db = await this.api.getMockDb();
    this.catalogo.set(db.productos || []);
    this.empresas.set(db.empresas || []);
  }

  // --- LÓGICA DE CAJA ---
  verificarHabilitacion() {
    // Si estamos en SSR, ignoramos
    if (typeof localStorage === 'undefined') return;

    const cajero = this.auth.currentUser()?.username;
    const key = `tm_caja_habilitada_${cajero}`;
    const estado = localStorage.getItem(key);
    
    if (estado === 'true') {
      this.cajaHabilitada.set(true);
      this.efectivoCaja.set(Number(localStorage.getItem(`${key}_fondo`)) || 0);
    } else {
      this.showHabilitarModal.set(true);
    }
  }

  habilitarCaja() {
    if (this.fondoInicial() <= 0) {
      this.toast.show('Monto inválido', 'error');
      return;
    }
    const cajero = this.auth.currentUser()?.username;
    const key = `tm_caja_habilitada_${cajero}`;
    
    localStorage.setItem(key, 'true');
    localStorage.setItem(`${key}_fondo`, String(this.fondoInicial()));
    
    this.cajaHabilitada.set(true);
    this.efectivoCaja.set(this.fondoInicial());
    this.showHabilitarModal.set(false);
    this.toast.show(`✅ Caja habilitada con S/ ${this.fondoInicial()}`, 'exito');
  }

  // --- LÓGICA DE TICKET ---
  getEmoji(cat: string): string {
    const emojis: Record<string, string> = { Audio: "🎧", Computacion: "💻", Smartphones: "📱", Gaming: "🎮", Accesorios: "🔌" };
    return emojis[cat] ?? "📦";
  }

  addToTicket(prod: any) {
    const current = this.ticket();
    const existing = current.find(t => t.productoId === prod.idProducto);

    if (existing) {
      if (existing.cantidad >= prod.stock) {
        this.toast.show(`Stock máximo alcanzado para ${prod.nombre}`, 'error');
        return;
      }
      existing.cantidad++;
      this.ticket.set([...current]);
    } else {
      this.ticket.set([...current, { ...prod, cantidad: 1 }]);
    }
  }

  changeQty(productoId: number, diff: number) {
    let current = this.ticket();
    const item = current.find(t => t.productoId === productoId);
    if (!item) return;

    item.cantidad += diff;
    if (item.cantidad <= 0) {
      this.ticket.set(current.filter(t => t.productoId !== productoId));
    } else {
      item.cantidad = Math.min(item.cantidad, item.stock);
      this.ticket.set([...current]);
    }
  }

  async cobrar() {
    if (!this.cajaHabilitada()) {
      this.showHabilitarModal.set(true);
      return;
    }

    this.isProcessing.set(true);
    
    try {
      // Simular delay de API
      await new Promise(r => setTimeout(r, 800));
      
      // Si el pago es en efectivo, sumarlo a la caja local
      if (this.metodoPago() === 'EFECTIVO') {
        this.efectivoCaja.update(c => c + this.currentTaxes().total);
        const cajero = this.auth.currentUser()?.username;
        localStorage.setItem(`tm_caja_habilitada_${cajero}_fondo`, String(this.efectivoCaja()));
      }

      this.toast.show('✔ Cobro registrado en caja', 'exito');
      this.ticket.set([]); // Limpiar ticket
      this.showExitoModal.set(true);
    } catch (err) {
      this.toast.show('Error al procesar cobro', 'error');
    } finally {
      this.isProcessing.set(false);
    }
  }
}