
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CONFIG } from '../config';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly MOCK_KEY = 'tm_mock_db_v4';
  private getHeaders(authRequired = true): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (authRequired) {
      const creds = this.auth.currentUser()?.credencialBase64;
      if (creds) {
        headers = headers.set('Authorization', `Basic ${creds}`);
      }
    }
    return headers;
  }
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
  async getMockDb(): Promise<any> {
    if (typeof localStorage === 'undefined') {
      return { categorias: [], productos: [], empresas: [], sedes: [] };
    }
    let db = localStorage.getItem(this.MOCK_KEY);
    if (!db) {
      const seed = await firstValueFrom(this.http.get('/data/mock_data.json'));
      localStorage.setItem(this.MOCK_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(db);
  }
  saveMockDb(db: any) {
    localStorage.setItem(this.MOCK_KEY, JSON.stringify(db));
  }
  getSedeActual(): number {
    return Number(localStorage.getItem('tm_sede_actual')) || 1;
  }
  setSedeActual(idSede: number) {
    localStorage.setItem('tm_sede_actual', String(idSede));
  }
}
