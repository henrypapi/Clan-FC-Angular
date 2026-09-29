// src/app/pages/login.page.ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-100">
      <section class="w-full max-w-md">
        <!-- Logo móvil -->
        <a routerLink="/" class="lg:hidden block text-2xl font-extrabold text-indigo-600 mb-8 text-center">
          Tienda<span class="text-emerald-500">Menos</span><span class="text-rose-500">.</span>
        </a>

        <div class="bg-white rounded-3xl shadow-xl p-8 md:p-10 fade-in">
          <h1 class="text-2xl font-extrabold text-slate-800">Inicia sesión</h1>
          <p class="text-sm text-slate-500 mt-1 mb-7">Ingresa tus credenciales para continuar</p>

          <!-- Formulario Reactivo -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">Usuario</span>
              <input formControlName="username" type="text" placeholder="ej. admin"
                     class="mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition" />
            </label>

            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">Contraseña</span>
              <input formControlName="password" type="password" placeholder="••••••••"
                     class="mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition" />
            </label>

            <button type="submit" [disabled]="loginForm.invalid || isLoading()"
                    class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 rounded-xl shadow-md transition">
              {{ isLoading() ? 'Validando...' : 'Ingresar' }}
            </button>
          </form>

          <footer class="mt-7 pt-6 border-t border-slate-100 text-center text-sm">
            ¿Nuevo en TiendaMenos? <a routerLink="/registro" class="text-emerald-600 font-bold hover:underline">Crea tu cuenta →</a>
          </footer>
        </div>
      </section>
    </main>
  `
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private api = inject(ApiService);

  isLoading = signal(false);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  async onSubmit() {
    if (this.loginForm.invalid) return;
    
    this.isLoading.set(true);
    const { username, password } = this.loginForm.value;

    try {
      const user = await this.api.login(username!, password!);

      if (!user) {
        this.toast.show('Usuario o contraseña incorrectos', 'error');
        return;
      }

      const session = {
        username: user.username,
        rol: user.rol,
        nombreCompleto: user.nombreCompleto,
        paisCodigo: user.paisCodigo,
        paisNombre: user.paisNombre,
        banderaEmoji: user.banderaEmoji || '🇵🇪',
        sedeId: user.sedeId,
        sedeNombre: user.sedeNombre,
        cajaNumero: user.cajaNumero,
        token: user.token,
        tokenType: user.tokenType,
        expiresInMs: user.expiresInMs
      };
      
      this.auth.saveSession(session);
      this.toast.show(`✔ Bienvenido ${session.username}`, 'exito');
      
      // Redirección según rol (reemplaza tu diccionario DESTINO_POR_ROL)
      const destination = session.rol === 'ADMIN' ? '/admin' : (session.rol === 'CAJERO' ? '/pos' : '/');
      this.router.navigate([destination]);
    } catch (error) {
      this.toast.show('Error de autenticación', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
