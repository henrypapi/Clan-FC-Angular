// src/core/services/auth.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';

export interface UserSession {
  username: string;
  rol: string;
  nombreCompleto?: string;
  paisCodigo?: string;
  paisNombre?: string;
  banderaEmoji?: string;
  sedeId?: number;
  sedeNombre?: string;
  cajaNumero?: number;
  token?: string;
  tokenType?: string;
  expiresInMs?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly SESSION_KEY = 'tm_sesion';

  // Inicializa leyendo el sessionStorage, igual que tu código original
  readonly currentUser = signal<UserSession | null>(this.loadSession());

  private loadSession(): UserSession | null {
    // FIX: Previene la ejecución en SSR
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  saveSession(session: UserSession) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    this.currentUser.set(session);
  }

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    this.currentUser.set(null);
    this.toast.show('Sesión cerrada. ¡Vuelve pronto!', 'info');
    this.router.navigate(['/login']);
  }

  hasRole(...roles: string[]): boolean {
    const user = this.currentUser();
    return !!user && roles.includes(user.rol);
  }
}
