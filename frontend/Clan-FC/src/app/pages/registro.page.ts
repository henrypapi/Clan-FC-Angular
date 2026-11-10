// src/app/pages/registro.page.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Pais } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

/**
 * Países de respaldo cuando el visitante (público) no tiene sesión.
 * GET /api/paises requiere autenticación, por lo que se usa esta lista
 * mientras no exista sesión; replica el catálogo sembrado en el backend.
 */
const PAISES_FALLBACK: Pais[] = [
  { idPais: 1, codigoIso2: 'PE', nombre: 'Perú', banderaEmoji: '🇵🇪' },
  { idPais: 2, codigoIso2: 'CO', nombre: 'Colombia', banderaEmoji: '🇨🇴' },
  { idPais: 3, codigoIso2: 'CL', nombre: 'Chile', banderaEmoji: '🇨🇱' },
  { idPais: 4, codigoIso2: 'AR', nombre: 'Argentina', banderaEmoji: '🇦🇷' },
  { idPais: 5, codigoIso2: 'EC', nombre: 'Ecuador', banderaEmoji: '🇪🇨' },
  { idPais: 6, codigoIso2: 'BO', nombre: 'Bolivia', banderaEmoji: '🇧🇴' },
  { idPais: 7, codigoIso2: 'US', nombre: 'Estados Unidos', banderaEmoji: '🇺🇸' },
  { idPais: 8, codigoIso2: 'ES', nombre: 'España', banderaEmoji: '🇪🇸' }
];

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-100">
      <section class="w-full max-w-lg">
        <a routerLink="/" class="lg:hidden block text-2xl font-extrabold text-indigo-600 mb-8 text-center">
          Tienda<span class="text-emerald-500">Menos</span><span class="text-rose-500">.</span>
        </a>

        <div class="bg-white rounded-3xl shadow-xl p-8 md:p-10 fade-in">
          <h1 class="text-2xl font-extrabold text-slate-800">Crea tu cuenta</h1>
          <p class="text-sm text-slate-500 mt-1 mb-7">Regístrate para comprar más rápido. Es gratis.</p>

          <form [formGroup]="registroForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">Correo electrónico</span>
              <input formControlName="email" type="email" placeholder="tucorreo@demo.com"
                     class="mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition" />
              <span class="text-[11px] text-slate-400">Será tu usuario para iniciar sesión.</span>
            </label>

            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">Nombre completo</span>
              <input formControlName="nombreCompleto" type="text" placeholder="María Compradora"
                     class="mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition" />
            </label>

            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">Contraseña</span>
              <input formControlName="password" type="password" placeholder="Mínimo 6 caracteres"
                     class="mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition" />
            </label>

            <label class="block">
              <span class="text-xs font-bold text-slate-600 uppercase tracking-wide">País fiscal</span>
              <select formControlName="idPais"
                      class="mt-1.5 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition">
                <option value="">— Selecciona tu país —</option>
                @for (pais of paises(); track pais.idPais) {
                  <option [value]="pais.idPais">{{ pais.banderaEmoji || '🌐' }} {{ pais.nombre }}</option>
                }
              </select>
            </label>

            <button type="submit" [disabled]="registroForm.invalid || isLoading()"
                    class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-3 rounded-xl shadow-md transition">
              {{ isLoading() ? 'Creando cuenta…' : 'Crear cuenta' }}
            </button>
          </form>

          <footer class="mt-7 pt-6 border-t border-slate-100 text-center text-sm">
            ¿Ya tienes cuenta? <a routerLink="/login" class="text-indigo-600 font-bold hover:underline">Inicia sesión →</a>
          </footer>
        </div>
      </section>
    </main>
  `
})
export class RegistroPage implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  isLoading = signal(false);
  paises = signal<Pais[]>(PAISES_FALLBACK);

  registroForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
    nombreCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    idPais: ['', Validators.required]
  });

  async ngOnInit() {
    // GET /api/paises es público: el formulario puede cargar el catálogo real.
    try {
      const paises = await this.api.getPaises();
      if (paises?.length) this.paises.set(paises);
    } catch {
      // Mantenemos la lista de respaldo
    }
  }

  async onSubmit() {
    if (this.registroForm.invalid) return;
    this.isLoading.set(true);
    const value = this.registroForm.value;

    try {
      await this.api.registro({
        // El correo ES el nombre de usuario (RF de autenticación).
        username: value.email!,
        email: value.email!,
        password: value.password!,
        nombreCompleto: value.nombreCompleto!,
        idPais: Number(value.idPais)
      });
      this.toast.show('✔ Cuenta creada. ¡Inicia sesión!', 'exito');
      this.router.navigate(['/login']);
    } catch (err: any) {
      const message = err?.error?.error
        || err?.error?.message
        || err?.error?.mensaje
        || (err?.status === 409 ? 'Ese usuario o correo ya está registrado' : 'No se pudo crear la cuenta');
      this.toast.show(message, 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
