import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, Producto, Categoria, Proveedor, Sede, Usuario, Pais, Cliente, ClienteRequest, Orden } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="min-h-screen bg-slate-100 font-sans text-slate-800 flex">

      <!-- SIDEBAR LATERAL -->
      <aside class="w-64 bg-slate-950 text-slate-300 flex flex-col fixed inset-y-0 z-40">
        <div class="px-6 py-6 border-b border-white/10">
          <p class="text-[10px] uppercase tracking-[0.25em] text-indigo-400 font-semibold">Suite ejecutiva</p>
          <h2 class="text-lg font-extrabold text-white mt-2">TiendaMenos</h2>
        </div>

        <nav class="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <button (click)="activeSection.set('resumen')" [class.nav-activa]="activeSection() === 'resumen'" class="w-full text-left exec-link">🏛️ Resumen</button>
          <button (click)="activeSection.set('inventario')" [class.nav-activa]="activeSection() === 'inventario'" class="w-full text-left exec-link">📦 Inventario</button>
          <button (click)="activeSection.set('categorias')" [class.nav-activa]="activeSection() === 'categorias'" class="w-full text-left exec-link">🗂️ Categorías</button>
          <button (click)="activeSection.set('usuarios')" [class.nav-activa]="activeSection() === 'usuarios'" class="w-full text-left exec-link">👥 Usuarios</button>
          <button (click)="activeSection.set('clientes')" [class.nav-activa]="activeSection() === 'clientes'" class="w-full text-left exec-link">🧑‍💼 Clientes</button>
          <button (click)="activeSection.set('ventas')" [class.nav-activa]="activeSection() === 'ventas'" class="w-full text-left exec-link">🧾 Ventas</button>
          <button (click)="activeSection.set('proveedores')" [class.nav-activa]="activeSection() === 'proveedores'" class="w-full text-left exec-link">🚚 Proveedores</button>
          <button (click)="activeSection.set('sedes')" [class.nav-activa]="activeSection() === 'sedes'" class="w-full text-left exec-link">🏬 Sedes</button>
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

                <div class="grid grid-cols-2 gap-5 mt-5">
                  <div class="card-exec p-5">
                    <p class="kpi-label">Ingresos Totales</p>
                    <p class="kpi-value text-emerald-600">{{ ingresosTotales() | currency:'PEN':'S/ ' }}</p>
                    <p class="text-xs text-slate-400 mt-1">IVA recaudado: {{ ivaTotal() | currency:'PEN':'S/ ' }}</p>
                  </div>
                  <div class="card-exec p-5">
                    <p class="kpi-label mb-2">Alertas del sistema</p>
                    <ul class="text-xs space-y-1 max-h-40 overflow-y-auto">
                      @for (a of alertas(); track a.titulo) {
                        <li class="flex items-start gap-2">
                          <span>{{ a.severidad === 'CRITICA' ? '🔴' : '🟡' }}</span>
                          <span class="text-slate-600">{{ a.titulo }}</span>
                        </li>
                      } @empty {
                        <li class="text-slate-400">Sin alertas.</li>
                      }
                    </ul>
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

                    <select formControlName="sedeId" class="input-exec bg-white">
                      <option value="">— Sede del inventario —</option>
                      @for (s of sedes(); track s.idSede) {
                        <option [value]="s.idSede">{{ s.nombre }}</option>
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

                    <label class="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" formControlName="activo" class="accent-indigo-600" /> Producto activo (visible en catálogo)
                    </label>

                    <div class="flex gap-2 pt-2">
                      <button type="submit" [disabled]="productForm.invalid || saving()" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:bg-slate-300 transition">
                        {{ saving() ? 'Guardando…' : 'Guardar' }}
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
                            @if (!p.activo) { <span class="badge badge-agotado">Inactivo</span> }
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

            @case ('categorias') {
              <section class="grid xl:grid-cols-[360px_1fr] gap-8 items-start fade-in">
                <aside class="card-exec p-6 sticky top-24">
                  <h2 class="text-lg font-bold text-slate-800 mb-4">{{ editingCat() ? '✎ Editar' : '➕ Agregar' }} categoría</h2>
                  <form [formGroup]="categoriaForm" (ngSubmit)="saveCategoria()" class="space-y-3 text-sm">
                    <input formControlName="nombre" placeholder="Nombre" class="input-exec" />
                    <input formControlName="descripcion" placeholder="Descripción" class="input-exec" />
                    <div class="flex gap-2 pt-2">
                      <button type="submit" [disabled]="categoriaForm.invalid || saving()" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:bg-slate-300 transition">Guardar</button>
                      @if (editingCat()) {
                        <button type="button" (click)="cancelEditCat()" class="flex-1 bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg transition">Cancelar</button>
                      }
                    </div>
                  </form>
                </aside>

                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-4 border-b border-slate-100"><h2 class="text-lg font-bold text-slate-800">🗂️ Categorías</h2></header>
                  <table class="w-full text-sm text-left">
                    <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                      <tr>
                        <th class="px-5 py-3">Nombre</th>
                        <th class="px-4 py-3">Descripción</th>
                        <th class="px-4 py-3 text-center">Estado</th>
                        <th class="px-5 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (c of categorias(); track c.idCategoria) {
                        <tr class="hover:bg-indigo-50/40 transition">
                          <td class="px-5 py-3 font-semibold text-slate-800">{{ c.nombre }}</td>
                          <td class="px-4 py-3 text-slate-500">{{ c.descripcion }}</td>
                          <td class="px-4 py-3 text-center">
                            @if (c.activa) { <span class="badge badge-ok">Activa</span> } @else { <span class="badge badge-agotado">Inactiva</span> }
                          </td>
                          <td class="px-5 py-3 text-center whitespace-nowrap">
                            <button (click)="editCategoria(c)" class="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg mr-2 hover:bg-indigo-100 transition">Editar</button>
                            <button (click)="deleteCategoria(c.idCategoria)" class="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition">🗑</button>
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Sin categorías registradas.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }

            @case ('usuarios') {
              <section class="grid xl:grid-cols-[360px_1fr] gap-8 items-start fade-in">
                <aside class="card-exec p-6 sticky top-24">
                  <h2 class="text-lg font-bold text-slate-800 mb-4">➕ Nuevo usuario</h2>
                  <form [formGroup]="usuarioForm" (ngSubmit)="saveUsuario()" class="space-y-3 text-sm">
                    <input formControlName="username" placeholder="Usuario" class="input-exec" />
                    <input formControlName="email" type="email" placeholder="Email" class="input-exec" />
                    <input formControlName="password" type="password" placeholder="Contraseña (mín. 6)" class="input-exec" />
                    <input formControlName="nombreCompleto" placeholder="Nombre completo" class="input-exec" />
                    <select formControlName="idPais" class="input-exec bg-white">
                      <option value="">— País fiscal —</option>
                      @for (pais of paises(); track pais.idPais) {
                        <option [value]="pais.idPais">{{ pais.banderaEmoji || '🌐' }} {{ pais.nombre }}</option>
                      }
                    </select>
                    <select formControlName="rol" class="input-exec bg-white">
                      <option value="CLIENTE">CLIENTE</option>
                      <option value="CAJERO">CAJERO</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button type="submit" [disabled]="usuarioForm.invalid || saving()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:bg-slate-300 transition">Crear usuario</button>
                  </form>
                </aside>

                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-4 border-b border-slate-100"><h2 class="text-lg font-bold text-slate-800">👥 Usuarios</h2></header>
                  <table class="w-full text-sm text-left">
                    <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                      <tr>
                        <th class="px-5 py-3">Usuario</th>
                        <th class="px-4 py-3">Email</th>
                        <th class="px-4 py-3 text-center">Rol</th>
                        <th class="px-4 py-3 text-center">País</th>
                        <th class="px-5 py-3 text-center">Activo</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (u of usuarios(); track u.idUsuario) {
                        <tr class="hover:bg-indigo-50/40 transition">
                          <td class="px-5 py-3">
                            <p class="font-semibold text-slate-800">{{ u.nombreCompleto }}</p>
                            <p class="text-[11px] font-mono text-slate-400">{{ u.username }}</p>
                          </td>
                          <td class="px-4 py-3 text-slate-500">{{ u.email }}</td>
                          <td class="px-4 py-3 text-center"><span class="badge badge-ok">{{ u.rol }}</span></td>
                          <td class="px-4 py-3 text-center">{{ u.banderaEmoji }} {{ u.paisNombre || '—' }}</td>
                          <td class="px-5 py-3 text-center">{{ u.activo ? '✅' : '⛔' }}</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">Sin usuarios.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }

            @case ('clientes') {
              <section class="grid xl:grid-cols-[360px_1fr] gap-8 items-start fade-in">
                <aside class="card-exec p-6 sticky top-24">
                  <h2 class="text-lg font-bold text-slate-800 mb-4">{{ editingCliente() ? '✎ Editar' : '➕ Nuevo' }} cliente</h2>
                  <form [formGroup]="clienteForm" (ngSubmit)="saveCliente()" class="space-y-3 text-sm">
                    <input formControlName="nombreCompleto" placeholder="Nombre completo" class="input-exec" />
                    <input formControlName="correo" type="email" placeholder="Correo (será el usuario)" class="input-exec" />
                    <input formControlName="password" type="password"
                           [placeholder]="editingCliente() ? 'Nueva contraseña (opcional)' : 'Contraseña (mín. 6)'"
                           class="input-exec" />
                    <select formControlName="idPais" class="input-exec bg-white">
                      <option value="">— País fiscal —</option>
                      @for (pais of paises(); track pais.idPais) {
                        <option [value]="pais.idPais">{{ pais.banderaEmoji || '🌐' }} {{ pais.nombre }}</option>
                      }
                    </select>
                    <select formControlName="rol" class="input-exec bg-white">
                      <option value="ROLE_USER">ROLE_USER (cliente)</option>
                      <option value="ROLE_ADMIN">ROLE_ADMIN (administrador)</option>
                    </select>
                    <label class="flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" formControlName="activo" class="accent-indigo-600" /> Cuenta activa
                    </label>
                    <p class="text-[11px] text-slate-400">La contraseña se guarda cifrada con BCrypt. El correo es la credencial de acceso.</p>
                    <div class="flex gap-2 pt-2">
                      <button type="submit" [disabled]="clienteForm.invalid || saving()" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg disabled:bg-slate-300 transition">
                        {{ saving() ? 'Guardando…' : 'Guardar' }}
                      </button>
                      @if (editingCliente()) {
                        <button type="button" (click)="cancelEditCliente()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 rounded-lg transition">Cancelar</button>
                      }
                    </div>
                  </form>
                </aside>

                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                    <h2 class="text-lg font-bold text-slate-800">🧑‍💼 Clientes</h2>
                    <input [value]="filtroClientes()" (input)="filtroClientes.set($any($event.target).value)"
                           placeholder="Buscar por nombre o correo…" class="input-exec max-w-xs" />
                  </header>
                  <table class="w-full text-sm text-left">
                    <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                      <tr>
                        <th class="px-5 py-3">Cliente</th>
                        <th class="px-4 py-3 text-center">Rol</th>
                        <th class="px-4 py-3 text-center">País</th>
                        <th class="px-4 py-3 text-center">Estado</th>
                        <th class="px-5 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (c of clientesFiltrados(); track c.idUsuario) {
                        <tr class="hover:bg-indigo-50/40 transition">
                          <td class="px-5 py-3">
                            <p class="font-semibold text-slate-800">{{ c.nombreCompleto }}</p>
                            <p class="text-[11px] font-mono text-slate-400">{{ c.correo }}</p>
                          </td>
                          <td class="px-4 py-3 text-center">
                            <span class="badge" [class]="c.rol === 'ADMIN' ? 'badge-bajo' : 'badge-ok'">{{ c.rol }}</span>
                          </td>
                          <td class="px-4 py-3 text-center">{{ c.banderaEmoji }} {{ c.paisNombre || '—' }}</td>
                          <td class="px-4 py-3 text-center">{{ c.activo ? '✅' : '⛔' }}</td>
                          <td class="px-5 py-3 text-center whitespace-nowrap">
                            <button (click)="editCliente(c)" class="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg mr-2 hover:bg-indigo-100 transition">Editar</button>
                            <button (click)="deleteCliente(c)" class="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition">🗑</button>
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="5" class="px-4 py-8 text-center text-slate-400">Sin clientes registrados.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }

            @case ('ventas') {
              <section class="fade-in space-y-5">
                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 class="text-lg font-bold text-slate-800">🧾 Ventas</h2>
                      <p class="text-xs text-slate-400">Listado de órdenes con cliente, sede y total. Anular repone el stock.</p>
                    </div>
                    <button (click)="cargarOrdenes()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition">⟳ Actualizar</button>
                  </header>
                  <table class="w-full text-sm text-left">
                    <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                      <tr>
                        <th class="px-5 py-3">Folio / Fecha</th>
                        <th class="px-4 py-3">Cliente</th>
                        <th class="px-4 py-3">Sede</th>
                        <th class="px-4 py-3 text-right">Total</th>
                        <th class="px-4 py-3 text-center">Estado</th>
                        <th class="px-5 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (v of ordenes(); track v.idOrden) {
                        <tr class="hover:bg-indigo-50/40 transition">
                          <td class="px-5 py-3">
                            <p class="font-mono font-semibold text-slate-800">{{ v.folio }}</p>
                            <p class="text-[11px] text-slate-400">{{ v.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</p>
                          </td>
                          <td class="px-4 py-3">
                            <p class="font-semibold text-slate-700">{{ v.usuarioNombre }}</p>
                            <p class="text-[11px] text-slate-400">{{ v.canal }}</p>
                          </td>
                          <td class="px-4 py-3 text-slate-500">{{ v.sedeNombre }}</td>
                          <td class="px-4 py-3 text-right font-bold text-slate-800">{{ v.total | currency:'PEN':'S/ ' }}</td>
                          <td class="px-4 py-3 text-center"><span class="badge badge-ok">{{ v.estado }}</span></td>
                          <td class="px-5 py-3 text-center whitespace-nowrap">
                            <button (click)="verVenta(v)" class="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg mr-2 hover:bg-indigo-100 transition">Ver detalle</button>
                            <button (click)="eliminarVenta(v)" class="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition">🗑</button>
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Sin ventas registradas.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>

                @if (ventaDetalle(); as v) {
                  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="cerrarVenta()">
                    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
                      <header class="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                        <div>
                          <h3 class="text-lg font-bold text-slate-800">Venta {{ v.folio }}</h3>
                          <p class="text-xs text-slate-500">
                            {{ v.fechaCreacion | date:'dd/MM/yyyy HH:mm' }} · {{ v.usuarioNombre }} · {{ v.sedeNombre }}
                          </p>
                        </div>
                        <button (click)="cerrarVenta()" class="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
                      </header>
                      <div class="p-6 space-y-4">
                        <table class="w-full text-sm text-left">
                          <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                            <tr>
                              <th class="px-3 py-2">Producto</th>
                              <th class="px-3 py-2 text-center">Cant.</th>
                              <th class="px-3 py-2 text-right">P. Unit.</th>
                              <th class="px-3 py-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                            @for (it of v.items; track it.idDetalle) {
                              <tr>
                                <td class="px-3 py-2">
                                  <p class="font-semibold text-slate-700">{{ it.nombreProducto }}</p>
                                  <p class="text-[11px] font-mono text-slate-400">{{ it.sku }}</p>
                                </td>
                                <td class="px-3 py-2 text-center">{{ it.cantidad }}</td>
                                <td class="px-3 py-2 text-right">{{ it.precioUnitario | currency:'PEN':'S/ ' }}</td>
                                <td class="px-3 py-2 text-right font-semibold">{{ it.subtotalLinea | currency:'PEN':'S/ ' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>

                        <div class="text-right text-sm space-y-1 border-t border-slate-100 pt-3">
                          <p class="text-slate-500">Subtotal: {{ v.subtotal | currency:'PEN':'S/ ' }}</p>
                          <p class="text-slate-500">IVA ({{ v.tasaIva }}%): {{ v.iva | currency:'PEN':'S/ ' }}</p>
                          <p class="font-extrabold text-lg text-slate-900">Total: {{ v.total | currency:'PEN':'S/ ' }}</p>
                        </div>

                        <button (click)="eliminarVenta(v)" class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition">
                          🗑 Anular venta y reponer stock
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </section>
            }

            @case ('proveedores') {
              <section class="fade-in">
                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-4 border-b border-slate-100"><h2 class="text-lg font-bold text-slate-800">🚚 Proveedores</h2></header>
                  <table class="w-full text-sm text-left">
                    <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                      <tr>
                        <th class="px-5 py-3">Proveedor</th>
                        <th class="px-4 py-3">Contacto</th>
                        <th class="px-4 py-3">Teléfono</th>
                        <th class="px-4 py-3">Email</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (pv of proveedores(); track pv.idProveedor) {
                        <tr class="hover:bg-indigo-50/40 transition">
                          <td class="px-5 py-3 font-semibold text-slate-800">{{ pv.nombre }}</td>
                          <td class="px-4 py-3 text-slate-500">{{ pv.contactoNombre }}</td>
                          <td class="px-4 py-3 text-slate-500">{{ pv.telefono }}</td>
                          <td class="px-4 py-3 text-slate-500">{{ pv.email }}</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Sin proveedores.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }

            @case ('sedes') {
              <section class="fade-in">
                <div class="card-exec overflow-hidden">
                  <header class="px-6 py-4 border-b border-slate-100"><h2 class="text-lg font-bold text-slate-800">🏬 Sedes</h2></header>
                  <table class="w-full text-sm text-left">
                    <thead class="thead-exec text-slate-500 uppercase text-[11px] tracking-wide">
                      <tr>
                        <th class="px-5 py-3">Sede</th>
                        <th class="px-4 py-3">Dirección</th>
                        <th class="px-4 py-3">Teléfono</th>
                        <th class="px-5 py-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (s of sedes(); track s.idSede) {
                        <tr class="hover:bg-indigo-50/40 transition">
                          <td class="px-5 py-3 font-semibold text-slate-800">{{ s.nombre }}</td>
                          <td class="px-4 py-3 text-slate-500">{{ s.direccion }}</td>
                          <td class="px-4 py-3 text-slate-500">{{ s.telefono }}</td>
                          <td class="px-5 py-3 text-center">
                            @if (s.activa) { <span class="badge badge-ok">Activa</span> } @else { <span class="badge badge-agotado">Inactiva</span> }
                          </td>
                        </tr>
                      } @empty {
                        <tr><td colspan="4" class="px-4 py-8 text-center text-slate-400">Sin sedes.</td></tr>
                      }
                    </tbody>
                  </table>
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
  saving = signal(false);

  // Datos
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  usuarios = signal<Usuario[]>([]);
  clientes = signal<Cliente[]>([]);
  ordenes = signal<Orden[]>([]);
  proveedores = signal<Proveedor[]>([]);
  sedes = signal<Sede[]>([]);
  paises = signal<Pais[]>([]);
  alertas = signal<any[]>([]);
  ingresosTotales = signal(0);
  ivaTotal = signal(0);

  // Formularios Reactivos
  isEditing = signal(false);
  editingId = signal<number | null>(null);

  productForm = this.fb.group({
    sku: ['', Validators.required],
    nombre: ['', Validators.required],
    categoriaId: ['', Validators.required],
    sedeId: ['', Validators.required],
    precioBase: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [5, Validators.required],
    activo: [true]
  });

  // Categorías
  editingCat = signal(false);
  editingCatId = signal<number | null>(null);
  categoriaForm = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: ['']
  });

  // Usuarios
  usuarioForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    idPais: ['', Validators.required],
    rol: ['CLIENTE', Validators.required]
  });

  // Clientes (RF1): correo como username + rol ROLE_USER / ROLE_ADMIN
  editingCliente = signal(false);
  editingClienteId = signal<number | null>(null);
  filtroClientes = signal('');
  clienteForm = this.fb.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    // Obligatoria al crear; en edición vacía = conservar la actual.
    password: ['', [Validators.minLength(6), Validators.maxLength(72)]],
    rol: ['ROLE_USER', Validators.required],
    idPais: ['', Validators.required],
    activo: [true]
  });

  // Ventas
  ventaDetalle = signal<Orden | null>(null);

  // KPIs automáticos (Se recalculan solos al crear/editar/borrar)
  totalProductos = computed(() => this.productos().length);
  valorInventario = computed(() => this.productos().reduce((acc, p) => acc + (Number(p.precioBase) * Number(p.stock)), 0));
  stockBajoCount = computed(() => this.productos().filter(p => Number(p.stock) <= Number(p.stockMinimo)).length);

  clientesFiltrados = computed(() => {
    const q = this.filtroClientes().trim().toLowerCase();
    if (!q) return this.clientes();
    return this.clientes().filter(c =>
      c.nombreCompleto.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q));
  });

  async ngOnInit() {
    await Promise.all([
      this.cargarProductos(),
      this.cargarCategorias(),
      this.cargarUsuarios(),
      this.cargarClientes(),
      this.cargarOrdenes(),
      this.cargarProveedores(),
      this.cargarSedes(),
      this.cargarPaises(),
      this.cargarDashboard()
    ]);
    // Sede por defecto para el alta de productos.
    const sedeActual = this.sedes()[0];
    if (sedeActual && !this.productForm.value.sedeId) {
      this.productForm.patchValue({ sedeId: String(sedeActual.idSede) });
    }
  }

  private async cargarProductos() {
    try {
      this.productos.set(await this.api.getProductos(undefined, null, true));
    } catch { this.toast.show('No se pudieron cargar los productos', 'error'); }
  }

  private async cargarCategorias() {
    try {
      this.categorias.set(await this.api.getCategorias(true));
    } catch { this.toast.show('No se pudieron cargar las categorías', 'error'); }
  }

  private async cargarUsuarios() {
    try {
      this.usuarios.set(await this.api.getUsuarios());
    } catch { /* ignorar */ }
  }

  private async cargarProveedores() {
    try {
      this.proveedores.set(await this.api.getProveedores());
    } catch { /* ignorar */ }
  }

  private async cargarSedes() {
    try {
      this.sedes.set(await this.api.getSedes(true));
    } catch { /* ignorar */ }
  }

  private async cargarPaises() {
    try {
      this.paises.set(await this.api.getPaises());
    } catch { /* ignorar */ }
  }

  private async cargarDashboard() {
    try {
      const [finanzas, alertas] = await Promise.all([
        this.api.getDashboardFinanzas(),
        this.api.getDashboardAlertas()
      ]);
      this.ingresosTotales.set(Number(finanzas?.ingresosTotales ?? 0));
      this.ivaTotal.set(Number(finanzas?.ivaTotal ?? 0));
      this.alertas.set(alertas?.alertas ?? []);
    } catch { /* ignorar */ }
  }

  // ==================== PRODUCTOS ====================
  async saveProduct() {
    if (this.productForm.invalid) return;
    this.saving.set(true);

    const formValue = this.productForm.value;
    const base = this.editingId() != null ? this.productos().find(p => p.idProducto === this.editingId()) : undefined;

    const payload = {
      sku: formValue.sku!,
      nombre: formValue.nombre!,
      descripcion: base?.descripcion ?? '',
      precioBase: Number(formValue.precioBase),
      sedeId: Number(formValue.sedeId),
      stock: Number(formValue.stock),
      stockMinimo: Number(formValue.stockMinimo),
      categoriaId: Number(formValue.categoriaId),
      garantiaMeses: base?.garantiaMeses ?? 0,
      proveedorId: base?.proveedorId ?? null,
      imagenUrl: base?.imagenUrl ?? '',
      activo: formValue.activo ?? true
    };

    try {
      if (this.isEditing() && this.editingId() !== null) {
        const updated = await this.api.actualizarProducto(this.editingId()!, payload);
        this.productos.update(list => list.map(p => p.idProducto === updated.idProducto ? updated : p));
        this.toast.show('✔ Producto actualizado correctamente', 'exito');
      } else {
        const created = await this.api.crearProducto(payload);
        this.productos.update(list => [created, ...list]);
        this.toast.show('✔ Producto agregado al inventario', 'exito');
      }
      this.cancelEdit();
    } catch (err: any) {
      this.toast.show(err?.error?.error || err?.error?.message || 'No se pudo guardar el producto', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  editProduct(product: Producto) {
    this.isEditing.set(true);
    this.editingId.set(product.idProducto);

    this.productForm.patchValue({
      sku: product.sku,
      nombre: product.nombre,
      categoriaId: String(product.categoriaId),
      sedeId: String(this.productForm.value.sedeId || this.sedes()[0]?.idSede || ''),
      precioBase: product.precioBase,
      stock: product.stock,
      stockMinimo: product.stockMinimo,
      activo: product.activo
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.productForm.reset({ stock: 0, stockMinimo: 5, activo: true, sedeId: this.productForm.value.sedeId ?? '' });
  }

  async deleteProduct(id: number) {
    if (!confirm('¿Dar de baja este producto? Se ocultará del catálogo pero conservará el historial de ventas.')) return;
    try {
      await this.api.eliminarProducto(id);
      // RF2.4: baja lógica; el producto queda inactivo, no se borra físicamente.
      this.productos.update(list => list.map(p => p.idProducto === id ? { ...p, activo: false } : p));
      this.toast.show('🗑 Producto dado de baja (inactivo)', 'info');
      if (this.editingId() === id) this.cancelEdit();
    } catch (err: any) {
      this.toast.show(err?.error?.error || err?.error?.message || 'No se pudo eliminar el producto', 'error');
    }
  }

  // ==================== CATEGORÍAS ====================
  async saveCategoria() {
    if (this.categoriaForm.invalid) return;
    this.saving.set(true);
    const value = this.categoriaForm.value;

    try {
      if (this.editingCat() && this.editingCatId() !== null) {
        const updated = await this.api.actualizarCategoria(this.editingCatId()!, {
          nombre: value.nombre!,
          descripcion: value.descripcion ?? ''
        });
        this.categorias.update(list => list.map(c => c.idCategoria === updated.idCategoria ? updated : c));
        this.toast.show('✔ Categoría actualizada', 'exito');
      } else {
        const created = await this.api.crearCategoria({
          nombre: value.nombre!,
          descripcion: value.descripcion ?? '',
          activa: true
        });
        this.categorias.update(list => [...list, created]);
        this.toast.show('✔ Categoría creada', 'exito');
      }
      this.cancelEditCat();
    } catch (err: any) {
      this.toast.show(err?.error?.error || err?.error?.message || 'No se pudo guardar la categoría', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  editCategoria(c: Categoria) {
    this.editingCat.set(true);
    this.editingCatId.set(c.idCategoria);
    this.categoriaForm.patchValue({ nombre: c.nombre, descripcion: c.descripcion ?? '' });
  }

  cancelEditCat() {
    this.editingCat.set(false);
    this.editingCatId.set(null);
    this.categoriaForm.reset({ nombre: '', descripcion: '' });
  }

  async deleteCategoria(id: number) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await this.api.eliminarCategoria(id);
      this.categorias.update(list => list.filter(c => c.idCategoria !== id));
      this.toast.show('🗑 Categoría eliminada', 'info');
      if (this.editingCatId() === id) this.cancelEditCat();
    } catch (err: any) {
      this.toast.show(err?.error?.error || err?.error?.message || 'No se pudo eliminar la categoría', 'error');
    }
  }

  // ==================== USUARIOS ====================
  async saveUsuario() {
    if (this.usuarioForm.invalid) return;
    this.saving.set(true);
    const value = this.usuarioForm.value;

    try {
      const created = await this.api.crearUsuario({
        username: value.username!,
        email: value.email!,
        password: value.password!,
        nombreCompleto: value.nombreCompleto!,
        idPais: Number(value.idPais)
      }, value.rol ?? 'CLIENTE');

      this.usuarios.update(list => [...list, created]);
      this.toast.show(`✔ Usuario ${created.username} creado`, 'exito');
      this.usuarioForm.reset({ rol: 'CLIENTE' });
    } catch (err: any) {
      this.toast.show(err?.error?.error || err?.error?.message || 'No se pudo crear el usuario', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  // ==================== CLIENTES (RF1) ====================
  private async cargarClientes() {
    try {
      this.clientes.set(await this.api.getClientes());
    } catch {
      this.toast.show('No se pudieron cargar los clientes', 'error');
    }
  }

  async saveCliente() {
    if (this.clienteForm.invalid) return;
    const value = this.clienteForm.value;
    const password = value.password?.trim() || null;

    if (!this.editingCliente() && !password) {
      this.toast.show('La contraseña es obligatoria para crear el cliente', 'error');
      return;
    }

    this.saving.set(true);
    const payload: ClienteRequest = {
      nombreCompleto: value.nombreCompleto!.trim(),
      correo: value.correo!.trim().toLowerCase(),
      password,
      rol: value.rol!,
      idPais: Number(value.idPais),
      activo: value.activo ?? true
    };

    try {
      if (this.editingCliente() && this.editingClienteId() !== null) {
        const updated = await this.api.actualizarCliente(this.editingClienteId()!, payload);
        this.clientes.update(list => list.map(c => c.idUsuario === updated.idUsuario ? updated : c));
        this.toast.show('✔ Cliente actualizado', 'exito');
      } else {
        const created = await this.api.crearCliente(payload);
        this.clientes.update(list => [...list, created]);
        this.toast.show('✔ Cliente creado', 'exito');
      }
      this.cancelEditCliente();
    } catch (err: any) {
      this.toast.show(
        err?.error?.error || err?.error?.message || err?.error?.detalle || 'No se pudo guardar el cliente',
        'error');
    } finally {
      this.saving.set(false);
    }
  }

  editCliente(c: Cliente) {
    this.editingCliente.set(true);
    this.editingClienteId.set(c.idUsuario);
    this.clienteForm.patchValue({
      nombreCompleto: c.nombreCompleto,
      correo: c.correo,
      password: '',
      rol: c.rol === 'ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER',
      idPais: String(c.idPais ?? ''),
      activo: c.activo
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditCliente() {
    this.editingCliente.set(false);
    this.editingClienteId.set(null);
    this.clienteForm.reset({ rol: 'ROLE_USER', activo: true });
  }

  async deleteCliente(c: Cliente) {
    if (!confirm(`¿Eliminar al cliente ${c.nombreCompleto}? Si tiene ventas asociadas no se podrá borrar.`)) return;
    try {
      await this.api.eliminarCliente(c.idUsuario);
      this.clientes.update(list => list.filter(x => x.idUsuario !== c.idUsuario));
      this.toast.show('🗑 Cliente eliminado', 'info');
      if (this.editingClienteId() === c.idUsuario) this.cancelEditCliente();
    } catch (err: any) {
      this.toast.show(err?.error?.error || err?.error?.message || 'No se pudo eliminar el cliente', 'error');
    }
  }

  // ==================== VENTAS ====================
  async cargarOrdenes() {
    try {
      this.ordenes.set(await this.api.getOrdenes());
    } catch {
      this.toast.show('No se pudieron cargar las ventas', 'error');
    }
  }

  async verVenta(o: Orden) {
    try {
      this.ventaDetalle.set(await this.api.getOrden(o.idOrden));
    } catch {
      // Si falla el detalle, mostramos lo que ya viene en el listado.
      this.ventaDetalle.set(o);
    }
  }

  cerrarVenta() {
    this.ventaDetalle.set(null);
  }

  async eliminarVenta(o: Orden) {
    if (!confirm(`¿Anular la venta ${o.folio}? Se repondrá el stock de todos sus productos.`)) return;
    try {
      await this.api.eliminarOrden(o.idOrden);
      this.ordenes.update(list => list.filter(x => x.idOrden !== o.idOrden));
      this.ventaDetalle.set(null);
      this.toast.show('🗑 Venta anulada y stock repuesto', 'info');
      // El stock cambió: refrescamos el inventario y los KPIs.
      await Promise.all([this.cargarProductos(), this.cargarDashboard()]);
    } catch (err: any) {
      this.toast.show(err?.error?.error || err?.error?.message || 'No se pudo anular la venta', 'error');
    }
  }
}
