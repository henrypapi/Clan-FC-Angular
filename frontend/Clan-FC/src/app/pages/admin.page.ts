import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    <div class="min-h-screen bg-slate-100 font-sans text-slate-800 flex">
      
      <!-- SIDEBAR LATERAL -->
      <aside class="w-64 bg-slate-950 text-slate-300 flex flex-col fixed inset-y-0 z-40">
        <div class="px-6 py-6 border-b border-white/10">
          <p class="text-[10px] uppercase tracking-[0.25em] text-indigo-400 font-semibold">Suite ejecutiva</p>
          <h2 class="text-lg font-extrabold text-white mt-2">TiendaMenos</h2>
        </div>
        
        <nav class="flex-1 px-3 py-5 space-y-1">
          <button (click)="activeSection.set('resumen')" [class.nav-activa]="activeSection() === 'resumen'" class="w-full text-left exec-link">🏛️ Resumen</button>
          <button (click)="activeSection.set('inventario')" [class.nav-activa]="activeSection() === 'inventario'" class="w-full text-left exec-link">📦 Inventario</button>
          <button (click)="activeSection.set('usuarios')" [class.nav-activa]="activeSection() === 'usuarios'" class="w-full text-left exec-link">👥 Usuarios</button>
        </nav>
        
        <div class="px-6 py-4 border-t border-white/10 text-[11px] text-slate-500">
          <button (click)="auth.logout()" class="hover:text-white underline decoration-dotted">Cerrar sesión</button>
        </div>
      </aside>

      <!-- CONTENIDO PRINCIPAL -->
      <div class="flex-1 pl-64">
        <header class="bg-white/85 backdrop-blur border-b border-slate-200 sticky top-0 z-20 px-8 py-3.5 flex justify-between items-center">
          <h1 class="text-sm font-bold text-slate-900">Centro de administración</h1>
          <span class="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold">Admin: {{ auth.currentUser()?.username }}</span>
        </header>

        <main class="p-8">
          @switch (activeSection()) {
            
            @case ('resumen') {
              <!-- KPI DASHBOARD -->
              <section class="fade-in">
                <h2 class="section-title mb-5">Visión General del Negocio</h2>
                <div class="grid grid-cols-3 gap-5">
                  <div class="kpi-card">
                    <p class="kpi-label">Productos Activos</p>
                    <p class="kpi-value text-indigo-600">{{ totalProductos() }}</p>
                  </div>
                  <div class="kpi-card">
                    <p class="kpi-label">Valor del Inventario</p>
                    <p class="kpi-value text-emerald-600">{{ valorInventario() | currency:'PEN':'S/ ' }}</p>
                  </div>
                  <div class="kpi-card">
                    <p class="kpi-label">Alertas de Stock</p>
                    <p class="kpi-value" [class]="stockBajoCount() > 0 ? 'text-rose-500' : 'text-slate-800'">
                      {{ stockBajoCount() }}
                    </p>
                  </div>
                </div>
              </section>
            }
            
            @case ('inventario') {
              <section class="grid xl:grid-cols-[360px_1fr] gap-8 items-start fade-in">
                
                <!-- Formulario Reactivo (Alta/Edición) -->
                <aside class="card-exec p-6 sticky top-24">
                  <h2 class="text-lg font-bold text-slate-800 mb-4">{{ isEditing() ? '✎ Editar' : '➕ Agregar' }} producto</h2>
                  
                  <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="space-y-3 text-sm">
                    <input formControlName="sku" placeholder="SKU (ej. ELEC-005)" class="input-exec" />
                    <input formControlName="nombre" placeholder="Nombre del producto" class="input-exec" />
                    
                    <select formControlName="categoriaId" class="input-exec bg-white">
                      <option value="">— Seleccione categoría —</option>
                      @for (cat of categorias(); track cat.idCategoria) {
                        <option [value]="cat.idCategoria">{{ cat.nombre }}</option>
                      }
                    </select>
                    
                    <div class="grid grid-cols-2 gap-3">
                      <label class="block">
                        <span class="text-xs text-slate-500">Precio (S/)</span>
                        <input formControlName="precioBase" type="number" step="0.01" class="input-exec" />
                      </label>
                      <label class="block">
                        <span class="text-xs text-slate-500">Stock actual</span>
                        <input formControlName="stock" type="number" class="input-exec" />
                      </label>
                    </div>
                    
                    <label class="block">
                      <span class="text-xs text-slate-500">Stock mínimo (Alerta)</span>
                      <input formControlName="stockMinimo" type="number" class="input-exec" />
                    </label>

                    <div class="flex gap-2 pt-2">
                      <button type="submit" [disabled]="productForm.invalid" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:bg-slate-300 transition">
                        Guardar
                      </button>
                      @if (isEditing()) {
                        <button type="button" (click)="cancelEdit()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 rounded-lg transition">Cancelar</button>
                      }
                    </div>
                  </form>
                </aside>

                <!-- Tabla de Datos -->
                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-4 border-b border-slate-100">
                    <h2 class="text-lg font-bold text-slate-800">📦 Gestión de inventario</h2>
                  </header>
                  <table class="w-full text-sm text-left">
                    <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                      <tr>
                        <th class="px-5 py-3">Producto</th>
                        <th class="px-4 py-3 text-right">Precio</th>
                        <th class="px-4 py-3 text-center">Stock</th>
                        <th class="px-5 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (p of productos(); track p.idProducto) {
                        <tr class="hover:bg-indigo-50/40 transition">
                          <td class="px-5 py-3">
                            <p class="font-semibold text-slate-800 truncate max-w-[220px]">{{ p.nombre }}</p>
                            <p class="text-[11px] font-mono text-slate-400">{{ p.sku }}</p>
                          </td>
                          <td class="px-4 py-3 text-right font-bold text-slate-800">{{ p.precioBase | currency:'PEN':'S/ ' }}</td>
                          <td class="px-4 py-3 text-center">
                            @if (p.stock === 0) {
                              <span class="badge badge-agotado">Agotado</span>
                            } @else if (p.stock <= p.stockMinimo) {
                              <span class="badge badge-bajo">Bajo ({{ p.stock }})</span>
                            } @else {
                              <span class="badge badge-ok">OK ({{ p.stock }})</span>
                            }
                          </td>
                          <td class="px-5 py-3 text-center whitespace-nowrap">
                            <button (click)="editProduct(p)" class="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg mr-2 hover:bg-indigo-100 transition">Editar</button>
                            <button (click)="deleteProduct(p.idProducto)" class="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition">🗑</button>
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Sin productos registrados.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }

            @case ('usuarios') {
              <section class="grid xl:grid-cols-[380px_1fr] gap-8 items-start fade-in">
                <aside class="card-exec p-6 xl:sticky xl:top-24">
                  <div class="flex items-start gap-3 mb-6">
                    <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-lg">👤</span>
                    <div>
                      <h2 class="text-lg font-bold text-slate-800">Nuevo usuario</h2>
                      <p class="text-xs text-slate-400 mt-0.5">Crea accesos para caja o clientes.</p>
                    </div>
                  </div>

                  <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="space-y-3 text-sm">
                    <label class="block">
                      <span class="text-xs font-semibold text-slate-500">Nombre completo</span>
                      <input formControlName="nombreCompleto" placeholder="Ej. Ana Torres" class="input-exec mt-1" />
                    </label>

                    <div class="grid grid-cols-2 gap-3">
                      <label class="block">
                        <span class="text-xs font-semibold text-slate-500">Usuario</span>
                        <input formControlName="username" placeholder="ana.torres" class="input-exec mt-1" autocomplete="off" />
                      </label>
                      <label class="block">
                        <span class="text-xs font-semibold text-slate-500">Contraseña</span>
                        <input formControlName="password" type="password" placeholder="Mín. 6 caracteres" class="input-exec mt-1" autocomplete="new-password" />
                      </label>
                    </div>

                    <label class="block">
                      <span class="text-xs font-semibold text-slate-500">Rol</span>
                      <select formControlName="rol" class="input-exec bg-white mt-1">
                        <option value="CAJERO">Cajero</option>
                        <option value="CLIENTE">Cliente</option>
                      </select>
                    </label>

                    @if (userForm.controls.rol.value === 'CAJERO') {
                      <div class="grid grid-cols-2 gap-3">
                        <label class="block">
                          <span class="text-xs font-semibold text-slate-500">Sede</span>
                          <select formControlName="sedeId" class="input-exec bg-white mt-1">
                            @for (sede of sedes(); track sede.idSede) {
                              <option [value]="sede.idSede">{{ sede.nombre }}</option>
                            }
                          </select>
                        </label>
                        <label class="block">
                          <span class="text-xs font-semibold text-slate-500">N.º de caja</span>
                          <input formControlName="cajaNumero" type="number" min="1" class="input-exec mt-1" />
                        </label>
                      </div>
                    }

                    <button type="submit" [disabled]="userForm.invalid" class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-xl transition mt-2">
                      Crear usuario
                    </button>
                  </form>
                </aside>

                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 class="text-lg font-bold text-slate-800">Gestión de usuarios</h2>
                      <p class="text-xs text-slate-400 mt-0.5">{{ usuarios().length }} accesos registrados</p>
                    </div>
                    <div class="flex gap-2 text-[11px] font-bold">
                      <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{{ cajerosCount() }} cajeros</span>
                      <span class="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">{{ clientesCount() }} clientes</span>
                    </div>
                  </header>

                  <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                      <thead class="thead-exec text-slate-500 uppercase text-[10px] tracking-wide">
                        <tr>
                          <th class="px-5 py-3">Usuario</th>
                          <th class="px-4 py-3">Rol</th>
                          <th class="px-4 py-3">Asignación</th>
                          <th class="px-5 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (user of usuarios(); track user.username) {
                          <tr class="hover:bg-indigo-50/40 transition">
                            <td class="px-5 py-4">
                              <div class="flex items-center gap-3">
                                <span class="inline-flex h-9 w-9 items-center justify-center rounded-full font-extrabold text-xs"
                                  [class]="user.rol === 'ADMIN' ? 'bg-amber-100 text-amber-700' : (user.rol === 'CAJERO' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700')">
                                  {{ userInitials(user) }}
                                </span>
                                <div><p class="font-semibold text-slate-800">{{ user.nombreCompleto || user.username }}</p><p class="text-[11px] text-slate-400">&#64;{{ user.username }}</p></div>
                              </div>
                            </td>
                            <td class="px-4 py-4"><span class="text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full"
                              [class]="user.rol === 'ADMIN' ? 'bg-amber-100 text-amber-700' : (user.rol === 'CAJERO' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700')">{{ user.rol }}</span></td>
                            <td class="px-4 py-4 text-xs text-slate-500">
                              @if (user.rol === 'CAJERO') {
                                <p class="font-semibold text-slate-700">{{ sedeName(user.sedeId) }}</p><p class="text-[11px]">Caja {{ user.cajaNumero || 1 }}</p>
                              } @else { <span>Sin caja asignada</span> }
                            </td>
                            <td class="px-5 py-4 text-right">
                              @if (user.rol !== 'ADMIN') {
                                <button (click)="deleteUser(user)" class="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Eliminar</button>
                              } @else { <span class="text-[10px] text-slate-400">Protegido</span> }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            }
          }
        </main>
      </div>
    </div>
  `
})
export class AdminPage implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  // Estado UI
  activeSection = signal('inventario');
  
  // Datos
  productos = signal<any[]>([]);
  categorias = signal<any[]>([]);
  usuarios = signal<any[]>([]);
  sedes = signal<any[]>([]);

  // Formularios Reactivos
  isEditing = signal(false);
  editingId = signal<number | null>(null);
  
  productForm = this.fb.group({
    sku: ['', Validators.required],
    nombre: ['', Validators.required],
    categoriaId: ['', Validators.required],
    precioBase: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [5, Validators.required]
  });

  userForm = this.fb.group({
    nombreCompleto: ['', Validators.required],
    username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rol: ['CAJERO', Validators.required],
    sedeId: [1, Validators.required],
    cajaNumero: [1, [Validators.required, Validators.min(1)]]
  });

  // KPIs automáticos (Se recalculan solos al crear/editar/borrar)
  totalProductos = computed(() => this.productos().length);
  valorInventario = computed(() => this.productos().reduce((acc, p) => acc + (p.precioBase * p.stock), 0));
  stockBajoCount = computed(() => this.productos().filter(p => p.stock <= p.stockMinimo).length);
  cajerosCount = computed(() => this.usuarios().filter(user => user.rol === 'CAJERO').length);
  clientesCount = computed(() => this.usuarios().filter(user => user.rol === 'CLIENTE').length);

  async ngOnInit() {
    const db = await this.api.getMockDb();
    this.productos.set(db.productos || []);
    this.categorias.set(db.categorias || []);
    this.usuarios.set(db.perfiles || db.usuarios || []);
    this.sedes.set(db.sedes || []);
  }

  saveProduct() {
    if (this.productForm.invalid) return;

    const formValue = this.productForm.value;
    const currentProducts = this.productos();

    if (this.isEditing() && this.editingId() !== null) {
      // Mapea y reemplaza el producto editado
      const updatedProducts = currentProducts.map(p => 
        p.idProducto === this.editingId() 
          ? { ...p, ...formValue, categoriaId: Number(formValue.categoriaId) } 
          : p
      );
      this.productos.set(updatedProducts);
      this.toast.show('✔ Producto actualizado correctamente', 'exito');
    } else {
      // Crea un nuevo producto y lo empuja al inicio del Signal
      const newProduct = {
        ...formValue,
        idProducto: Date.now(), // ID Ficticio
        categoriaId: Number(formValue.categoriaId),
        activo: true
      };
      this.productos.update(p => [newProduct, ...p]);
      this.toast.show('✔ Producto agregado al inventario', 'exito');
    }

    this.cancelEdit();
  }

  editProduct(product: any) {
    this.isEditing.set(true);
    this.editingId.set(product.idProducto);
    
    // Rellena el formulario con los datos de la fila
    this.productForm.patchValue({
      sku: product.sku,
      nombre: product.nombre,
      categoriaId: product.categoriaId,
      precioBase: product.precioBase,
      stock: product.stock,
      stockMinimo: product.stockMinimo
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.productForm.reset({ stock: 0, stockMinimo: 5 }); // Reset con valores default
  }

  deleteProduct(id: number) {
    if (confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) {
      this.productos.update(p => p.filter(item => item.idProducto !== id));
      this.toast.show('🗑 Producto eliminado', 'info');
      
      if (this.editingId() === id) {
        this.cancelEdit();
      }
    }
  }

  async saveUser() {
    if (this.userForm.invalid) return;

    const value = this.userForm.getRawValue();
    const username = value.username!.trim().toLowerCase();

    if (this.usuarios().some(user => user.username.toLowerCase() === username)) {
      this.toast.show('Ese nombre de usuario ya está registrado', 'error');
      return;
    }

    const selectedSede = this.sedes().find(sede => sede.idSede === Number(value.sedeId));
    const newUser = {
      username,
      password: value.password,
      nombreCompleto: value.nombreCompleto!.trim(),
      rol: value.rol,
      idPais: 1,
      sedeId: value.rol === 'CAJERO' ? Number(value.sedeId) : null,
      sedeNombre: value.rol === 'CAJERO' ? selectedSede?.nombre : null,
      cajaNumero: value.rol === 'CAJERO' ? Number(value.cajaNumero) : null
    };

    const updatedUsers = [...this.usuarios(), newUser];
    this.usuarios.set(updatedUsers);
    await this.api.saveMockUsers(updatedUsers);
    this.userForm.reset({ rol: 'CAJERO', sedeId: 1, cajaNumero: 1 });
    this.toast.show(`✔ Usuario ${username} creado correctamente`, 'exito');
  }

  async deleteUser(userToDelete: any) {
    if (userToDelete.rol === 'ADMIN') return;
    if (!confirm(`¿Eliminar al usuario ${userToDelete.username}? Ya no podrá iniciar sesión.`)) return;

    const updatedUsers = this.usuarios().filter(user => user.username !== userToDelete.username);
    this.usuarios.set(updatedUsers);
    await this.api.saveMockUsers(updatedUsers);
    this.toast.show(`Usuario ${userToDelete.username} eliminado`, 'info');
  }

  sedeName(sedeId: number | null): string {
    return this.sedes().find(sede => sede.idSede === Number(sedeId))?.nombre || 'Sin sede';
  }

  userInitials(user: any): string {
    const name = user.nombreCompleto || user.username;
    return name.split(' ').slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  }
}
