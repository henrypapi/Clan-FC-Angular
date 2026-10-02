// src/core/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CONFIG } from '../config'; // El que creamos en el paso 1
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly MOCK_KEY = 'tm_mock_db_v8';

  // Configura cabeceras con el JWT emitido por POST /api/auth/login.
  private getHeaders(authRequired = true): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (authRequired) {
      const token = this.auth.currentUser()?.token;
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return headers;
  }

  // Wrapper para llamadas (Usa la API real si CONFIG.USE_API es true)
  async fetchApi<T>(path: string, options: { method?: string, body?: any, auth?: boolean } = {}): Promise<T> {
    const { method = 'GET', body, auth = true } = options;
    const url = `${CONFIG.BASE_URL}${path}`;
    
    if (method === 'GET') {
      return firstValueFrom(this.http.get<T>(url, { headers: this.getHeaders(auth) }));
    } else if (method === 'POST') {
      return firstValueFrom(this.http.post<T>(url, body, { headers: this.getHeaders(auth) }));
    } else if (method === 'PUT') {
      return firstValueFrom(this.http.put<T>(url, body, { headers: this.getHeaders(auth) }));
    } else if (method === 'DELETE') {
      return firstValueFrom(this.http.delete<T>(url, { headers: this.getHeaders(auth) }));
    }
    throw new Error('Método no soportado');
  }

  // ==========================================
  // Lógica MOCK DB (Para cuando USE_API = false)
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
    localStorage.setItem(this.MOCK_KEY, JSON.stringify(db));
  }

  async authenticateMock(username: string, password: string): Promise<any | null> {
    const db = await this.getMockDb();
    const normalizedUsername = username.trim().toLowerCase();
    return (db.perfiles || db.usuarios || []).find((user: any) =>
      user.username.toLowerCase() === normalizedUsername && user.password === password
    ) || null;
  }

  async login(username: string, password: string): Promise<any | null> {
    if (CONFIG.USE_API) {
      return this.fetchApi('/auth/login', {
        method: 'POST',
        body: { username, password },
        auth: false
      });
    }

    return this.authenticateMock(username, password);
  }

  async saveMockUsers(users: any[]): Promise<void> {
    const db = await this.getMockDb();
    db.perfiles = users;
    this.saveMockDb(db);
  }

  // Utilidad para obtener sede actual (reemplaza tu getSedeActual)
  getSedeActual(): number {
    return Number(localStorage.getItem('tm_sede_actual')) || 1;
  }

  setSedeActual(idSede: number) {
    localStorage.setItem('tm_sede_actual', String(idSede));
  }
}
