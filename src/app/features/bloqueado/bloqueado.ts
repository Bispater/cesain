import { Component } from '@angular/core';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '../../core/firebase';

/**
 * Pantalla de bloqueo global (interruptor environment.appBloqueada).
 * Se muestra en TODAS las rutas cuando el sistema está deshabilitado y, al
 * cargar, cierra cualquier sesión que haya quedado en caché en el navegador
 * (borrar la cuenta en Firebase Auth no cierra las sesiones ya iniciadas).
 */
@Component({
  selector: 'app-bloqueado',
  template: `
    <div class="min-h-screen grid place-items-center p-6 text-center
                bg-gradient-to-br from-brand-700 to-brand-900">
      <div class="max-w-md">
        <div class="mx-auto mb-6 h-16 w-16 rounded-2xl bg-accent grid place-items-center">
          <span class="text-3xl font-extrabold text-brand-800">C</span>
        </div>
        <h1 class="text-2xl font-bold text-white mb-3">Acceso no disponible</h1>
        <p class="text-brand-100 leading-relaxed">
          El acceso a este sistema está temporalmente deshabilitado.
          Para reactivarlo, por favor comunícate con el administrador del sistema.
        </p>
      </div>
    </div>
  `,
})
export class Bloqueado {
  constructor() {
    signOut(firebaseAuth()).catch(() => {});
  }
}
