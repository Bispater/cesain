import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center
                bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4">
      <div class="w-full max-w-md">
        <!-- Marca -->
        <div class="flex flex-col items-center mb-8">
          <div class="h-20 w-20 rounded-2xl bg-accent grid place-items-center shadow-lg shadow-black/20">
            <span class="text-4xl font-extrabold text-brand-800">C</span>
          </div>
          <h1 class="mt-5 text-2xl font-bold text-white">CESAIN</h1>
          <p class="text-brand-200 text-sm">Centro de Salud Integral</p>
        </div>

        <!-- Tarjeta -->
        <form (ngSubmit)="entrar()"
              class="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <h2 class="text-xl font-bold text-gray-800">Iniciar Sesión</h2>

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-600">Correo electrónico</label>
            <input [(ngModel)]="email" name="email" type="email"
                   placeholder="admin@cesain.cl"
                   class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800
                          outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200" />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-600">Contraseña</label>
            <input [(ngModel)]="password" name="password" type="password"
                   placeholder="••••••••"
                   class="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800
                          outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200" />
          </div>

          @if (error()) {
            <p class="text-sm text-red-500">{{ error() }}</p>
          }

          <button type="submit" [disabled]="cargando()"
                  class="w-full rounded-lg bg-brand-600 hover:bg-brand-700 transition-colors
                         text-white font-semibold py-3 shadow-md disabled:opacity-60">
            {{ cargando() ? 'Entrando…' : 'Entrar' }}
          </button>

          <p class="text-xs text-center text-gray-400 pt-1">
            Acceso con cuenta autorizada de CESAIN
          </p>
        </form>
      </div>
    </div>
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = 'admin@cesain.cl';
  password = '';
  readonly error = signal('');
  readonly cargando = signal(false);

  async entrar() {
    this.error.set('');
    if (!this.email.trim() || !this.password) {
      this.error.set('Ingresa tu correo y contraseña.');
      return;
    }
    this.cargando.set(true);
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/']);
    } catch (e) {
      this.error.set(mensajeError((e as { code?: string }).code));
    } finally {
      this.cargando.set(false);
    }
  }
}

function mensajeError(code?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'El correo no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet.';
    default:
      return 'No se pudo iniciar sesión. Intenta nuevamente.';
  }
}
