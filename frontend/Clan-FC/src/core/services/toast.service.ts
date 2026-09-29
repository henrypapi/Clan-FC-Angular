
import { Injectable, signal } from '@angular/core';
export interface Toast {
  id: number;
  message: string;
  type: 'info' | 'exito' | 'error';
}
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private idCounter = 0;
  show(message: string, type: 'info' | 'exito' | 'error' = 'info') {
    const id = this.idCounter++;
    this.toasts.update(current => [...current, { id, message, type }]);
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t.id !== id));
    }, 3000);
  }
}
