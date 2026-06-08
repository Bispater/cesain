import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ConfirmDialog } from '../shared/confirm/confirm-dialog';
import { Icon, IconName } from '../shared/icon/icon';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog, Icon],
  template: `
    <div class="min-h-screen bg-[#f4f1f8]">
      <!-- Barra superior (solo móvil) -->
      <div class="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-brand-700 text-white px-4 py-3 shadow">
        <button (click)="menuAbierto.set(true)" aria-label="Abrir menú"
                class="p-1.5 -ml-1 rounded-lg hover:bg-white/10">
          <app-icon name="menu" [size]="22" />
        </button>
        <div class="h-8 w-8 rounded-lg bg-accent grid place-items-center">
          <span class="text-lg font-extrabold text-brand-800">C</span>
        </div>
        <span class="font-bold">CESAIN</span>
      </div>

      <div class="flex">
        <!-- Fondo oscuro (móvil) -->
        @if (menuAbierto()) {
          <div class="fixed inset-0 bg-black/40 z-40 md:hidden" (click)="menuAbierto.set(false)"></div>
        }

        <!-- Sidebar / Drawer -->
        <aside class="fixed md:sticky top-0 z-50 md:z-auto h-screen w-64 shrink-0
                      bg-gradient-to-b from-brand-700 to-brand-900 text-white flex flex-col p-5
                      transition-transform duration-200 md:translate-x-0"
               [class.-translate-x-full]="!menuAbierto()">
          <div class="flex items-center gap-3 mb-8">
            <div class="h-11 w-11 rounded-xl bg-accent grid place-items-center">
              <span class="text-2xl font-extrabold text-brand-800">C</span>
            </div>
            <div class="flex-1">
              <p class="font-bold leading-tight">CESAIN</p>
              <p class="text-[11px] text-brand-200">Centro de Salud Integral</p>
            </div>
            <button (click)="menuAbierto.set(false)" aria-label="Cerrar menú"
                    class="md:hidden p-1 rounded-lg hover:bg-white/10">
              <app-icon name="close" [size]="20" />
            </button>
          </div>

          <nav class="flex flex-col gap-1 text-sm">
            @for (item of nav; track item.path) {
              <a [routerLink]="item.path" (click)="menuAbierto.set(false)"
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
        <main class="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-x-hidden">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-confirm-dialog />
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  private router = inject(Router);
  readonly menuAbierto = signal(false);

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
