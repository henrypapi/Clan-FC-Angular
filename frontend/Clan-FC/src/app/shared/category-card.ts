import { Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/catalogo']" [queryParams]="{ cat: category().idCategoria }"
       class="card-producto group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:border-indigo-300 block">
      <span class="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br items-center justify-center text-2xl mb-3" [class]="gradiente()">
        {{ emoji() }}
      </span>
      <p class="font-bold text-slate-800 group-hover:text-indigo-600 transition">{{ category().nombre }}</p>
      <p class="text-[11px] text-slate-400">Ver productos</p>
    </a>
  `
})
export class CategoryCard {
  category = input.required<any>();
  
  gradiente = computed(() => {
    const GRADIENTES = ["from-sky-100 to-blue-200", "from-emerald-100 to-teal-200", "from-amber-100 to-orange-200", "from-violet-100 to-purple-200"];
    return GRADIENTES[this.category().idCategoria % GRADIENTES.length];
  });

  emoji = computed(() => {
    const EMOJIS: Record<string, string> = { Audio: "🎧", Computacion: "💻", Smartphones: "📱", Gaming: "🎮", Accesorios: "🔌" };
    return EMOJIS[this.category().nombre] ?? "🛍️";
  });
}