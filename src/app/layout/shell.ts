import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ProfesionalService } from '../core/services/profesional.service';
import { ConfirmDialog } from '../shared/confirm/confirm-dialog';
import { Icon, IconName } from '../shared/icon/icon';
import { Toast } from '../shared/toast/toast';
import { APP_VERSION } from '../core/version';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialog, Icon, Toast],
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
                      transition-all duration-200 md:translate-x-0"
               [class.-translate-x-full]="!menuAbierto()"
               [class.md:w-16]="colapsado()"
               [class.md:p-3]="colapsado()">
          <div class="flex items-center mb-6" [class.gap-3]="!colapsado()" [class.justify-center]="colapsado()">
            <div class="h-11 w-11 rounded-xl bg-accent grid place-items-center shrink-0">
              <span class="text-2xl font-extrabold text-brand-800">C</span>
            </div>
            @if (!colapsado()) {
              <div class="flex-1">
                <p class="font-bold leading-tight">CESAIN</p>
                <p class="text-[11px] text-brand-200">Centro de Salud Integral</p>
              </div>
            }
            <button (click)="menuAbierto.set(false)" aria-label="Cerrar menú"
                    class="md:hidden p-1 rounded-lg hover:bg-white/10">
              <app-icon name="close" [size]="20" />
            </button>
            @if (!colapsado()) {
              <button (click)="toggleColapsar()" aria-label="Esconder menú" title="Esconder menú"
                      class="hidden md:grid place-items-center p-1 rounded-lg hover:bg-white/10 text-brand-200 hover:text-white">
                <app-icon name="colapsar" [size]="20" />
              </button>
            }
          </div>

          @if (colapsado()) {
            <button (click)="toggleColapsar()" title="Mostrar menú"
                    class="hidden md:grid place-items-center mb-3 h-9 w-9 mx-auto rounded-lg hover:bg-white/10 text-brand-200 hover:text-white">
              <app-icon name="menu" [size]="20" />
            </button>
          }

          <nav class="flex flex-col gap-1 text-sm">
            @for (item of navVisible(); track item.path) {
              <a [routerLink]="item.path" (click)="menuAbierto.set(false)"
                 routerLinkActive="bg-white/15 text-white"
                 [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                 class="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-brand-100
                        hover:bg-white/10 transition-colors"
                 [class.md:justify-center]="colapsado()">
                <app-icon [name]="item.icon" />
                @if (!colapsado()) { <span>{{ item.label }}</span> }
                @if (colapsado()) {
                  <span class="pointer-events-none absolute left-full ml-2 hidden md:block whitespace-nowrap rounded-md
                               bg-gray-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                    {{ item.label }}
                  </span>
                }
              </a>
            }
          </nav>

          <div class="mt-auto pt-4 border-t border-white/10">
            @if (!colapsado()) {
              <p class="text-xs text-brand-200 mb-2 truncate">{{ auth.usuario()?.email }}</p>
            }
            <button (click)="salir()" title="Cerrar sesión"
                    class="group relative w-full text-sm text-brand-100 hover:text-white flex items-center gap-2.5 px-1 py-1"
                    [class.md:justify-center]="colapsado()">
              <app-icon name="logout" [size]="18" />
              @if (!colapsado()) { <span>Cerrar sesión</span> }
              @if (colapsado()) {
                <span class="pointer-events-none absolute left-full ml-2 hidden md:block whitespace-nowrap rounded-md
                             bg-gray-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                  Cerrar sesión
                </span>
              }
            </button>
            @if (!colapsado()) { <p class="text-[10px] text-brand-300/70 mt-3">v{{ version }}</p> }
          </div>
        </aside>

        <!-- Contenido -->
        <main class="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-x-hidden">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-confirm-dialog />
    <app-toast />
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  private router = inject(Router);
  // Se instancia aquí para que la sincronización profesional↔liquidaciones corra siempre.
  private prof = inject(ProfesionalService);
  readonly menuAbierto = signal(false);
  /** Sidebar colapsado en escritorio (preferencia del usuario, persiste). */
  readonly colapsado = signal(localStorage.getItem('cesain_sidebar_colapsado') === '1');

  toggleColapsar() {
    this.colapsado.update((v) => !v);
    localStorage.setItem('cesain_sidebar_colapsado', this.colapsado() ? '1' : '0');
  }

  readonly version = APP_VERSION;

  readonly nav: { path: string; label: string; icon: IconName; soloAdmin?: boolean; apsorad?: boolean }[] = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/liquidaciones', label: 'Liquidaciones', icon: 'liquidaciones', soloAdmin: true },
    { path: '/profesionales', label: 'Profesionales', icon: 'profesionales', soloAdmin: true },
    { path: '/prestaciones', label: 'Prestaciones', icon: 'prestaciones', soloAdmin: true },
    { path: '/apsorad', label: 'APSORAD', icon: 'apsorad', apsorad: true },
    { path: '/dentistas', label: 'DENTAL', icon: 'dentista' },
    { path: '/configuracion', label: 'Configuración', icon: 'config', soloAdmin: true },
  ];

  /** Items visibles según el rol. */
  readonly navVisible = computed(() =>
    this.nav.filter((i) =>
      i.apsorad ? this.auth.puedeApsorad() : i.soloAdmin ? this.auth.puedeAdmin() : true,
    ),
  );

  async salir() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
