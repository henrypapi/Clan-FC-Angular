// src/app/app.component.ts
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
    <div class="announcement-bar">
      <div class="store-shell announcement-content">
        <span>Envíos a todo el Perú</span>
        <span class="announcement-highlight">Envío gratis desde S/ 999</span>
        <span class="announcement-extra">Compra segura · Garantía incluida</span>
      </div>
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
