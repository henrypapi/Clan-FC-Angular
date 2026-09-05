// src/core/services/toast.service.ts
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'info' | 'exito' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  // Signal que mantiene el estado reactivo de las notificaciones
  readonly toasts = signal<Toast[]>([]);
  private idCounter = 0;

  show(message: string, type: 'info' | 'exito' | 'error' = 'info') {
    const id = this.idCounter++;
    this.toasts.update(current => [...current, { id, message, type }]);

    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t.id !== id));
    }, 3000);
  }
}