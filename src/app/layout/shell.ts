import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ConfirmDialog } from '../shared/confirm/confirm-dialog';
import { Icon, IconName } from '../shared/icon/icon';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog, Icon],
  template: `
    <div class="min-h-screen flex bg-[#f4f1f8]">
      <!-- Sidebar -->
      <aside class="w-64 shrink-0 bg-gradient-to-b from-brand-700 to-brand-900 text-white
                    flex flex-col p-5 sticky top-0 h-screen">
        <div class="flex items-center gap-3 mb-8">
          <div class="h-11 w-11 rounded-xl bg-accent grid place-items-center">
            <span class="text-2xl font-extrabold text-brand-800">C</span>
          </div>
          <div>
            <p class="font-bold leading-tight">CESAIN</p>
            <p class="text-[11px] text-brand-200">Centro de Salud Integral</p>
          </div>
        </div>

        <nav class="flex flex-col gap-1 text-sm">
          @for (item of nav; track item.path) {
            <a [routerLink]="item.path"
               routerLinkActive="bg-white/15 text-white"
               [routerLinkActiveOptions]="{ exact: item.path === '/' }"
               class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-brand-100
                      hover:bg-white/10 transition-colors">
              <app-icon [name]="item.icon" />{{ item.label }}
            </a>
          }
        </nav>

        <div class="mt-auto pt-4 border-t border-white/10">
          <p class="text-xs text-brand-200 mb-2 truncate">{{ auth.usuario()?.email }}</p>
          <button (click)="salir()"
                  class="w-full text-left text-sm text-brand-100 hover:text-white
                         flex items-center gap-2.5 px-1 py-1">
            <app-icon name="logout" [size]="18" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <!-- Contenido -->
      <main class="flex-1 min-w-0 p-6 md:p-8 overflow-x-hidden">
        <router-outlet />
      </main>
    </div>

    <app-confirm-dialog />
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  private router = inject(Router);

  readonly nav: { path: string; label: string; icon: IconName }[] = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/liquidaciones', label: 'Liquidaciones', icon: 'liquidaciones' },
    { path: '/profesionales', label: 'Profesionales', icon: 'profesionales' },
    { path: '/prestaciones', label: 'Prestaciones', icon: 'prestaciones' },
    { path: '/importar', label: 'Importar Excel', icon: 'importar' },
  ];

  async salir() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
