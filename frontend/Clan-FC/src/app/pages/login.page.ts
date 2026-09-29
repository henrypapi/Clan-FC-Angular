
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-page flex-1 flex items-center justify-center p-6 md:p-12">
      <section class="w-full max-w-md">
        <!-- Logo móvil -->
        <a routerLink="/" class="lg:hidden block text-2xl font-extrabold text-indigo-600 mb-8 text-center">
          Tienda<span class="text-emerald-500">Menos</span><span class="text-rose-500">.</span>
        </a>
        <div class="auth-card bg-white rounded-3xl p-8 md:p-10 fade-in">
          <h1 class="auth-title text-2xl font-extrabold text-slate-800">Inicia sesión</h1>
          <p class="text-sm text-slate-500 mt-1 mb-7">Ingresa tus credenciales para continuar</p>
          <!-- Formulario Reactivo -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">Usuario</span>
              <input formControlName="username" type="text" placeholder="ej. admin"
                     class="auth-input mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none transition" />
            </label>
            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">Contraseña</span>
              <input formControlName="password" type="password" placeholder="••••••••"
                     class="auth-input mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none transition" />
            </label>
            <button type="submit" [disabled]="loginForm.invalid || isLoading()"
                    class="auth-submit w-full disabled:bg-indigo-300 text-white font-bold py-3 rounded-xl shadow-md transition">
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
      // NOTA: Para esta demo, simularemos el login validando si es admin/cajero/cliente.
      // Aquí enlazarías la llamada real HTTP o al Mock de tu ApiService.
      const fakeSession = {
        username: username!,
        rol: username === 'admin' ? 'ADMIN' : (username === 'cajero' ? 'CAJERO' : 'CLIENTE'),
        banderaEmoji: '🇵🇪'
      };
      this.auth.saveSession(fakeSession);
      this.toast.show(`✔ Bienvenido ${fakeSession.username}`, 'exito');
      const destination = fakeSession.rol === 'ADMIN' ? '/admin' : (fakeSession.rol === 'CAJERO' ? '/pos' : '/');
      this.router.navigate([destination]);
    } catch (error) {
      this.toast.show('Error de autenticación', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
