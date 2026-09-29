
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar';
import { Toast } from './shared/toast';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Toast],
  template: `
    <!-- Barra de anuncios -->
    <div class="store-announcement text-center py-2 px-4">
      🚚 Envío GRATIS en compras +S/ 999 &nbsp;·&nbsp; 💳 12 MSI con tarjetas participantes &nbsp;·&nbsp; 🔄 30 días de garantía
    </div>
    <!-- Navbar Reactivo -->
    <app-navbar />
    <!-- Contenido Dinámico de la Ruta -->
    <div class="flex-1 min-h-screen flex flex-col">
      <router-outlet />
    </div>
    <!-- Contenedor de Alertas -->
    <app-toast />
  `
})
export class App {}
