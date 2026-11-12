// src/core/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CONFIG } from '../config';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

// ==========================================
// Tipos de la API (contratos del backend)
// ==========================================
export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  username: string;
  nombreCompleto: string | null;
  rol: string;
  paisCodigo: string | null;
  paisNombre: string | null;
  banderaEmoji: string | null;
}

/** El login devuelve el JWT y los datos de sesión en una sola respuesta. */
export type LoginResult = LoginResponse;

export interface Producto {
  idProducto: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precioBase: number;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
  categoriaId: number;
  categoriaNombre: string;
  garantiaMeses: number | null;
  proveedorId: number | null;
  proveedorNombre: string | null;
  imagenUrl: string | null;
  activo: boolean;
}

export interface ProductoRequest {
  sku: string;
  nombre: string;
  descripcion?: string | null;
  precioBase: number;
  sedeId: number;
  stock: number;
  stockMinimo: number;
  categoriaId: number;
  garantiaMeses?: number | null;
  proveedorId?: number | null;
  imagenUrl?: string | null;
  activo?: boolean;
}

export interface Categoria {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
}

export interface CategoriaRequest {
  nombre: string;
  descripcion?: string | null;
  activa?: boolean;
}

export interface Pais {
  idPais: number;
  codigoIso2: string;
  nombre: string;
  tasaIvaGeneral?: number;
  tasaIvaReducido?: number;
  activo?: boolean;
  banderaEmoji?: string;
}

export interface Empresa {
  idEmpresa: number;
  razonSocial: string;
  rfc: string;
  regimenFiscal: string;
  tasaIva: number;
  idPais: number;
  paisCodigo: string;
  paisNombre: string;
  banderaEmoji: string;
}

export interface Sede {
  idSede: number;
  nombre: string;
  direccion: string;
  telefono: string;
  activa: boolean;
  efectivoTotal: number;
  totalProductos: number;
  totalOrdenes: number;
  incidencias: number;
}

export interface SedeRequest {
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  activa?: boolean;
}

export interface Proveedor {
  idProveedor: number;
  nombre: string;
  contactoNombre: string;
  telefono: string;
  email: string;
  activo: boolean;
}

export interface ProveedorRequest {
  nombre: string;
  contactoNombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  activo?: boolean;
}

export interface Usuario {
  idUsuario: number;
  username: string;
  email: string;
  nombreCompleto: string;
  rol: string;
  idPais: number | null;
  paisNombre: string | null;
  banderaEmoji: string | null;
  activo: boolean;
}

export interface UsuarioUpdateRequest {
  username?: string | null;
  email: string;
  password?: string | null;
  nombreCompleto: string;
  idPais?: number | null;
  rol?: string | null;
  activo?: boolean;
}

/** Cliente (RF1): el correo es la credencial de acceso. */
export interface Cliente {
  idUsuario: number;
  correo: string;
  username: string;
  nombreCompleto: string;
  rol: string;
  idPais: number | null;
  paisNombre: string | null;
  banderaEmoji: string | null;
  activo: boolean;
  fechaCreacion?: string;
}

export interface ClienteRequest {
  nombreCompleto: string;
  correo: string;
  /** Obligatoria al crear; en edición, vacía = conservar la actual. */
  password?: string | null;
  rol: string;
  idPais: number;
  activo?: boolean;
}

export interface RegistroUsuarioRequest {
  username?: string;
  email: string;
  password: string;
  nombreCompleto: string;
  idPais: number;
}

export interface OrdenItem {
  idDetalle: number;
  sku: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  ivaLinea: number;
  subtotalLinea: number;
}

export interface Orden {
  idOrden: number;
  folio: string;
  canal: string;
  estado: string;
  usuarioNombre: string;
  sedeId: number;
  sedeNombre: string;
  empresaId: number | null;
  empresaNombre: string;
  paisNombre: string | null;
  banderaEmoji: string;
  regimenFiscal: string;
  tasaIva: number;
  subtotal: number;
  iva: number;
  total: number;
  metodoPago: string;
  fechaCreacion: string;
  items: OrdenItem[];
}

export interface CheckoutBody {
  items: { productoId: number; cantidad: number }[];
  sedeId: number;
  empresaClienteId: number | null;
  clienteId: number | null;
  metodoPago: string;
}

export interface Caja {
  idCaja: number;
  idSede: number;
  sedeNombre: string;
  numeroCaja: number;
  efectivo: number;
  estado: string;
  idUsuario: number | null;
  usuarioUsername: string | null;
  fechaApertura: string | null;
  fechaCierre: string | null;
}

export interface CajaMovimientoRequest {
  idCaja: number;
  tipo: string; // FONDOS_INICIALES, VENTA, RETIRO, AJUSTE
  monto: number;
  referencia?: string | null;
}

export interface TotalesImpuestos {
  subtotal: number;
  tasaIva: number;
  regimenFiscal: string;
  iva: number;
  total: number;
  paisCodigo: string | null;
  paisNombre: string | null;
  banderaEmoji: string | null;
}

export interface Incidencia {
  idIncidencia: number;
  tipo: string;
  estado: string;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  descripcion: string;
  usuarioNombre: string;
  fecha: string;
}

export interface IncidenciaRequest {
  productoId: number;
  ordenId?: number | null;
  tipo?: string | null;
  cantidad: number;
  descripcion: string;
}

/** Codifica un texto a Base64 (seguro para UTF-8 y para SSR). */
export function toBase64(value: string): string {
  if (typeof btoa === 'function') {
    const bytes = new Uint8Array(new TextEncoder().encode(value));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  return '';
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  auth?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly MOCK_KEY = 'tm_mock_db_v4';

  // Configura cabeceras con el JWT emitido por POST /api/auth/login.
  private getHeaders(authRequired = true, hasBody = false): HttpHeaders {
    let headers = new HttpHeaders();
    if (hasBody) {
      headers = headers.set('Content-Type', 'application/json');
    }
    const token = this.auth.currentUser()?.token;
    if (authRequired && token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Wrapper para llamadas a la API real
  async fetchApi<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true } = options;
    const url = `${CONFIG.BASE_URL}${path}`;
    const hasBody = body !== undefined && body !== null;
    const headers = this.getHeaders(auth, hasBody);

    switch (method) {
      case 'GET':
        return firstValueFrom(this.http.get<T>(url, { headers }));
      case 'POST':
        return firstValueFrom(this.http.post<T>(url, body ?? null, { headers }));
      case 'PUT':
        return firstValueFrom(this.http.put<T>(url, body ?? null, { headers }));
      case 'PATCH':
        return firstValueFrom(this.http.patch<T>(url, body ?? null, { headers }));
      case 'DELETE':
        return firstValueFrom(this.http.delete<T>(url, { headers }));
      default:
        throw new Error('Método no soportado');
    }
  }

  // ==========================================
  // AUTENTICACIÓN
  // ==========================================
  /** POST /api/auth/login. Devuelve el JWT + datos de sesión. */
  async login(username: string, password: string): Promise<LoginResult> {
    return this.fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false,
    });
  }

  /** POST /api/auth/registro (público). Crea una cuenta CLIENTE. */
  registro(request: RegistroUsuarioRequest): Promise<Usuario> {
    return this.fetchApi<Usuario>('/auth/registro', { method: 'POST', body: request, auth: false });
  }

  // ==========================================
  // CATÁLOGO (público)
  // ==========================================
  getProductos(busqueda?: string, categoriaId?: number | null, incluirInactivos = false): Promise<Producto[]> {
    const params: string[] = [];
    if (busqueda) params.push(`busqueda=${encodeURIComponent(busqueda)}`);
    if (categoriaId != null) params.push(`categoriaId=${categoriaId}`);
    if (incluirInactivos) params.push('incluirInactivos=true');
    const qs = params.length ? `?${params.join('&')}` : '';
    // El catálogo es público; el inventario con inactivos exige JWT de ADMIN.
    return this.fetchApi<Producto[]>(`/productos${qs}`, { auth: incluirInactivos });
  }

  getProducto(id: number): Promise<Producto> {
    return this.fetchApi<Producto>(`/productos/${id}`, { auth: false });
  }

  crearProducto(request: ProductoRequest): Promise<Producto> {
    return this.fetchApi<Producto>('/productos', { method: 'POST', body: request });
  }

  actualizarProducto(id: number, request: ProductoRequest): Promise<Producto> {
    return this.fetchApi<Producto>(`/productos/${id}`, { method: 'PUT', body: request });
  }

  eliminarProducto(id: number): Promise<void> {
    return this.fetchApi<void>(`/productos/${id}`, { method: 'DELETE' });
  }

  getCategorias(todas = false): Promise<Categoria[]> {
    return this.fetchApi<Categoria[]>(`/categorias${todas ? '?todas=true' : ''}`, { auth: false });
  }

  crearCategoria(request: CategoriaRequest): Promise<Categoria> {
    return this.fetchApi<Categoria>('/categorias', { method: 'POST', body: request });
  }

  actualizarCategoria(id: number, request: CategoriaRequest): Promise<Categoria> {
    return this.fetchApi<Categoria>(`/categorias/${id}`, { method: 'PUT', body: request });
  }

  eliminarCategoria(id: number): Promise<void> {
    return this.fetchApi<void>(`/categorias/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // PAÍSES / EMPRESAS / SEDES / PROVEEDORES
  // ==========================================
  getPaises(): Promise<Pais[]> {
    // Endpoint público: el formulario de registro lo usa sin sesión.
    return this.fetchApi<Pais[]>('/paises', { auth: false });
  }

  getEmpresas(): Promise<Empresa[]> {
    return this.fetchApi<Empresa[]>('/empresas');
  }

  getSedes(todas = false): Promise<Sede[]> {
    return this.fetchApi<Sede[]>(`/sedes${todas ? '/todas' : ''}`);
  }

  crearSede(request: SedeRequest): Promise<Sede> {
    return this.fetchApi<Sede>('/sedes', { method: 'POST', body: request });
  }

  actualizarSede(id: number, request: SedeRequest): Promise<Sede> {
    return this.fetchApi<Sede>(`/sedes/${id}`, { method: 'PUT', body: request });
  }

  eliminarSede(id: number): Promise<void> {
    return this.fetchApi<void>(`/sedes/${id}`, { method: 'DELETE' });
  }

  getProveedores(soloActivos = false): Promise<Proveedor[]> {
    return this.fetchApi<Proveedor[]>(`/proveedores${soloActivos ? '?soloActivos=true' : ''}`);
  }

  crearProveedor(request: ProveedorRequest): Promise<Proveedor> {
    return this.fetchApi<Proveedor>('/proveedores', { method: 'POST', body: request });
  }

  actualizarProveedor(id: number, request: ProveedorRequest): Promise<Proveedor> {
    return this.fetchApi<Proveedor>(`/proveedores/${id}`, { method: 'PUT', body: request });
  }

  eliminarProveedor(id: number): Promise<void> {
    return this.fetchApi<void>(`/proveedores/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // USUARIOS / ÓRDENES
  // ==========================================
  getUsuarios(): Promise<Usuario[]> {
    return this.fetchApi<Usuario[]>('/usuarios');
  }

  crearUsuario(request: RegistroUsuarioRequest, rol = 'CLIENTE'): Promise<Usuario> {
    return this.fetchApi<Usuario>(`/usuarios?rol=${encodeURIComponent(rol)}`, {
      method: 'POST',
      body: request,
    });
  }

  actualizarUsuario(id: number, request: UsuarioUpdateRequest): Promise<Usuario> {
    return this.fetchApi<Usuario>(`/usuarios/${id}`, { method: 'PUT', body: request });
  }

  desactivarUsuario(id: number): Promise<void> {
    return this.fetchApi<void>(`/usuarios/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // CLIENTES (RF1) — CRUD con correo como username
  // ==========================================
  getClientes(filtro?: string, incluirPersonal = false): Promise<Cliente[]> {
    const params: string[] = [];
    if (filtro) params.push(`filtro=${encodeURIComponent(filtro)}`);
    if (incluirPersonal) params.push('incluirPersonal=true');
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.fetchApi<Cliente[]>(`/clientes${qs}`);
  }

  getCliente(id: number): Promise<Cliente> {
    return this.fetchApi<Cliente>(`/clientes/${id}`);
  }

  crearCliente(request: ClienteRequest): Promise<Cliente> {
    return this.fetchApi<Cliente>('/clientes', { method: 'POST', body: request });
  }

  actualizarCliente(id: number, request: ClienteRequest): Promise<Cliente> {
    return this.fetchApi<Cliente>(`/clientes/${id}`, { method: 'PUT', body: request });
  }

  eliminarCliente(id: number): Promise<void> {
    return this.fetchApi<void>(`/clientes/${id}`, { method: 'DELETE' });
  }

  /** Clientes para el selector del POS (CAJERO/ADMIN). */
  getClientesPos(): Promise<Cliente[]> {
    return this.fetchApi<Cliente[]>('/pos/clientes');
  }

  getOrdenes(): Promise<Orden[]> {
    return this.fetchApi<Orden[]>('/ordenes');
  }

  getOrden(id: number): Promise<Orden> {
    return this.fetchApi<Orden>(`/ordenes/${id}`);
  }

  /** Anula una venta y repone el stock (solo ADMIN). */
  eliminarOrden(id: number): Promise<void> {
    return this.fetchApi<void>(`/ordenes/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // CHECKOUT / POS / IMPUESTOS
  // ==========================================
  checkout(body: CheckoutBody): Promise<Orden> {
    return this.fetchApi<Orden>('/checkout', { method: 'POST', body });
  }

  posCobro(body: CheckoutBody): Promise<Orden> {
    return this.fetchApi<Orden>('/pos/cobros', { method: 'POST', body });
  }

  previewImpuestos(subtotalBase: number, empresaClienteId: number | null): Promise<TotalesImpuestos> {
    return this.fetchApi<TotalesImpuestos>('/impuestos/preview', {
      method: 'POST',
      body: { subtotalBase, empresaClienteId },
    });
  }

  // ==========================================
  // CAJAS
  // ==========================================
  getCajasPorSede(idSede: number): Promise<Caja[]> {
    return this.fetchApi<Caja[]>(`/cajas/sede/${idSede}`);
  }

  getCajaAbierta(idSede: number): Promise<Caja | null> {
    return this.fetchApi<Caja | null>(`/cajas/abierta/sede/${idSede}`);
  }

  crearCaja(request: any): Promise<Caja> {
    return this.fetchApi<Caja>('/cajas', { method: 'POST', body: request });
  }

  habilitarCaja(id: number, idUsuario: number, fondosIniciales: number): Promise<Caja> {
    return this.fetchApi<Caja>(
      `/cajas/${id}/habilitar?idUsuario=${idUsuario}&fondosIniciales=${fondosIniciales}`,
      { method: 'POST' },
    );
  }

  cerrarCaja(id: number): Promise<Caja> {
    return this.fetchApi<Caja>(`/cajas/${id}/cerrar`, { method: 'POST' });
  }

  getCajaMovimientos(): Promise<any[]> {
    return this.fetchApi<any[]>('/cajas/movimientos');
  }

  registrarMovimientoCaja(request: CajaMovimientoRequest): Promise<any> {
    return this.fetchApi<any>('/cajas/movimientos', { method: 'POST', body: request });
  }

  // ==========================================
  // DASHBOARD (ADMIN)
  // ==========================================
  getDashboardComparacion(): Promise<any> {
    return this.fetchApi<any>('/dashboard/comparacion');
  }

  getDashboardAlertas(): Promise<any> {
    return this.fetchApi<any>('/dashboard/alertas');
  }

  getDashboardFinanzas(): Promise<any> {
    return this.fetchApi<any>('/dashboard/finanzas');
  }

  getDashboardInventario(): Promise<any> {
    return this.fetchApi<any>('/dashboard/inventario');
  }

  getDashboardStockSede(idSede: number): Promise<any[]> {
    return this.fetchApi<any[]>(`/dashboard/sede/${idSede}/stock`);
  }

  // ==========================================
  // ALMACÉN / REPORTES / INCIDENCIAS
  // ==========================================
  getAlmacenMovimientos(): Promise<any[]> {
    return this.fetchApi<any[]>('/almacen/movimientos');
  }

  registrarAlmacenMovimiento(request: any): Promise<any> {
    return this.fetchApi<any>('/almacen/movimientos', { method: 'POST', body: request });
  }

  getReporteSemanal(): Promise<any> {
    return this.fetchApi<any>('/reportes/semanal');
  }

  getIncidencias(): Promise<Incidencia[]> {
    return this.fetchApi<Incidencia[]>('/incidencias');
  }

  crearIncidencia(request: IncidenciaRequest): Promise<Incidencia> {
    return this.fetchApi<Incidencia>('/incidencias', { method: 'POST', body: request });
  }

  cambiarEstadoIncidencia(id: number, estado: string, resolucion?: string): Promise<Incidencia> {
    return this.fetchApi<Incidencia>(`/incidencias/${id}/estado`, {
      method: 'PATCH',
      body: { estado, resolucion },
    });
  }

  // ==========================================
  // Lógica MOCK DB (se mantiene por compatibilidad)
  // Las páginas ya NO la utilizan.
  // ==========================================
  async getMockDb(): Promise<any> {
    if (typeof localStorage === 'undefined') {
      return { categorias: [], productos: [], empresas: [], sedes: [] };
    }
    let db = localStorage.getItem(this.MOCK_KEY);
    if (!db) {
      // Lee el json que pusimos en public/data/
      const seed = await firstValueFrom(this.http.get('/data/mock_data.json'));
      localStorage.setItem(this.MOCK_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(db);
  }

  saveMockDb(db: any) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.MOCK_KEY, JSON.stringify(db));
    }
  }

  // Utilidad para obtener sede actual (reemplaza tu getSedeActual)
  getSedeActual(): number {
    if (typeof localStorage === 'undefined') return 1;
    return Number(localStorage.getItem('tm_sede_actual')) || 1;
  }

  setSedeActual(idSede: number) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tm_sede_actual', String(idSede));
    }
  }
}
