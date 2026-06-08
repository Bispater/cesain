import { Component, inject, signal } from '@angular/core';
import { CatalogosService, ItemCatalogo } from '../../core/services/catalogos.service';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-configuracion',
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Configuración</h1>
      <p class="text-sm text-gray-500">
        Administra los tipos de profesional y las sedes que aparecen en los formularios.
      </p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
      <!-- Tipos -->
      <section class="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
        <h2 class="font-bold text-gray-800 mb-1">Tipos de profesional</h2>
        <p class="text-xs text-gray-400 mb-4">Ej: Médico, Kinesiólogo, Nutricionista…</p>

        <div class="flex gap-2 mb-4">
          <input [value]="nuevoTipo()" (input)="nuevoTipo.set($any($event.target).value)"
                 (keyup.enter)="agregarTipo()" placeholder="Nuevo tipo…"
                 class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm
                        focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
          <button (click)="agregarTipo()"
                  class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4">
            Agregar
          </button>
        </div>

        <ul class="divide-y divide-gray-100">
          @for (t of cat.tipos(); track t.id) {
            <li class="flex items-center justify-between py-2.5">
              <span class="text-sm text-gray-700">{{ t.nombre }}</span>
              <button (click)="eliminar('tipo', t)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </li>
          } @empty {
            <li class="py-3 text-sm text-gray-400">{{ cat.cargando() ? 'Cargando…' : 'Sin tipos.' }}</li>
          }
        </ul>
      </section>

      <!-- Sedes -->
      <section class="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
        <h2 class="font-bold text-gray-800 mb-1">Sedes</h2>
        <p class="text-xs text-gray-400 mb-4">Ej: Valparaíso, Quintero, Viña del Mar…</p>

        <div class="flex gap-2 mb-4">
          <input [value]="nuevaSede()" (input)="nuevaSede.set($any($event.target).value)"
                 (keyup.enter)="agregarSede()" placeholder="Nueva sede…"
                 class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm
                        focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
          <button (click)="agregarSede()"
                  class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4">
            Agregar
          </button>
        </div>

        <ul class="divide-y divide-gray-100">
          @for (s of cat.sedes(); track s.id) {
            <li class="flex items-center justify-between py-2.5">
              <span class="text-sm text-gray-700">{{ s.nombre }}</span>
              <button (click)="eliminar('sede', s)" class="text-xs text-red-500 hover:underline">Eliminar</button>
            </li>
          } @empty {
            <li class="py-3 text-sm text-gray-400">{{ cat.cargando() ? 'Cargando…' : 'Sin sedes.' }}</li>
          }
        </ul>
      </section>
    </div>
  `,
})
export class Configuracion {
  readonly cat = inject(CatalogosService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly nuevoTipo = signal('');
  readonly nuevaSede = signal('');

  async agregarTipo() {
    const n = this.nuevoTipo().trim();
    if (!n) return;
    await this.cat.agregarTipo(n);
    this.nuevoTipo.set('');
    this.toast.exito('Tipo agregado');
  }

  async agregarSede() {
    const n = this.nuevaSede().trim();
    if (!n) return;
    await this.cat.agregarSede(n);
    this.nuevaSede.set('');
    this.toast.exito('Sede agregada');
  }

  async eliminar(que: 'tipo' | 'sede', item: ItemCatalogo) {
    const ok = await this.confirm.ask({
      titulo: que === 'tipo' ? 'Eliminar tipo' : 'Eliminar sede',
      mensaje: `¿Eliminar "${item.nombre}"? Los profesionales que ya lo tengan no se modifican.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (!ok) return;
    if (que === 'tipo') await this.cat.eliminarTipo(item.id);
    else await this.cat.eliminarSede(item.id);
    this.toast.exito('Eliminado');
  }
}
