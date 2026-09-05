// src/app/shared/toast.ts
import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="fixed bottom-6 right-6 space-y-2 z-50">
      @for (t of toastService.toasts(); track t.id) {
        <div 
          class="text-white text-sm px-4 py-3 rounded-xl shadow-lg transition-all duration-300 max-w-xs fade-in"
          [ngClass]="{
            'bg-slate-800': t.type === 'info',
            'bg-emerald-600': t.type === 'exito',
            'bg-red-600': t.type === 'error'
          }">
          {{ t.message }}
        </div>
      }
    </div>
  `
})
export class Toast {
  toastService = inject(ToastService);
}