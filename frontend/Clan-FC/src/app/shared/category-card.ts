import { Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a [routerLink]="['/catalogo']" [queryParams]="{ cat: category().idCategoria }" class="category-card">
      <img [src]="image()" [alt]="category().nombre" loading="lazy" />
      <span class="category-overlay"></span>
      <span class="category-copy"><small>{{ emoji() }} Selección</small><strong>{{ category().nombre }}</strong><em>Explorar →</em></span>
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

  image = computed(() => {
    const IMAGES: Record<string, string> = {
      Audio: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85',
      Computacion: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85',
      Smartphones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85',
      Gaming: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=700&q=85',
      Accesorios: 'https://images.unsplash.com/photo-1577375729078-820d5283031c?auto=format&fit=crop&w=700&q=85'
    };
    return IMAGES[this.category().nombre] ?? IMAGES['Accesorios'];
  });
}
