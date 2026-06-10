import { Component, inject, signal } from '@angular/core';
import { ProfesionalService } from '../../core/services/profesional.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { Profesional } from '../../core/models/profesional.model';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';
import { ProfesionalForm } from '../../shared/profesional-form/profesional-form';

@Component({
  selector: 'app-profesionales',
  imports: [Spinner, ProfesionalForm],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Profesionales</h1>
        <p class="text-sm text-gray-500">
          Ingresa y edita los profesionales del centro médico, sus sedes y el % de arriendo. Se guarda en la nube.
        </p>
      </div>
      <button (click)="abrirNuevo()"
              class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">
        + Nuevo profesional
      </button>
    </header>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <input [value]="svc.busqueda()" (input)="svc.busqueda.set($any($event.target).value)"
             placeholder="Buscar por nombre o especialidad..."
             class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm w-72
                    focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
      <select [value]="svc.filtroTipo()" (change)="svc.filtroTipo.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200">
        <option value="TODOS">Todos los tipos</option>
        @for (t of cat.tipos(); track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
      </select>
      <select [value]="svc.filtroSede()" (change)="svc.filtroSede.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200">
        <option value="TODAS">Todas las sedes</option>
        @for (s of cat.sedes(); track s.id) { <option [value]="s.nombre">{{ s.nombre }}</option> }
      </select>
      <span class="text-sm text-gray-400 ml-auto">{{ svc.filtradas().length }} profesional(es)</span>
    </div>

    @if (svc.error()) {
      <div class="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{{ svc.error() }}</div>
    }

    <!-- Tabla -->
    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[820px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Profesional</th>
            <th class="px-4 py-3 font-semibold">Tipo</th>
            <th class="px-4 py-3 font-semibold">Especialidad</th>
            <th class="px-4 py-3 font-semibold">Sedes</th>
            <th class="px-4 py-3 font-semibold text-right">% Arriendo</th>
            <th class="px-4 py-3 font-semibold">Contacto</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (p of svc.filtradas(); track p.id) {
            <tr class="hover:bg-gray-50" [class.opacity-40]="!p.activo">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ p.nombre }}</p>
                @if (p.rut) { <p class="text-xs text-gray-400">{{ p.rut }}</p> }
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-100 text-brand-700">{{ cat.labelTipo(p.tipoProfesional) }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ p.especialidad }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  @for (s of p.sedes; track s) {
                    <span class="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600">{{ s }}</span>
                  } @empty { <span class="text-gray-300">—</span> }
                </div>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-amber-700">{{ (p.porcentajeClinica * 100) }}%</td>
              <td class="px-4 py-3 text-xs text-gray-500">
                @if (p.email) { <div>{{ p.email }}</div> }
                @if (p.telefono) { <div>{{ p.telefono }}</div> }
                @if (!p.email && !p.telefono) { <span class="text-gray-300">—</span> }
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button (click)="abrirEditar(p)" class="text-xs text-brand-600 hover:underline mr-3">Editar</button>
                <button (click)="confirmarEliminar(p)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargando()) { <app-spinner label="Cargando profesionales…" /> }
              @else { No hay profesionales para este filtro. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Modal (componente compartido) -->
    @if (mostrarForm()) {
      <app-profesional-form [profesional]="editando()"
                            (guardado)="mostrarForm.set(false)"
                            (cerrado)="mostrarForm.set(false)" />
    }
  `,
})
export class Profesionales {
  readonly svc = inject(ProfesionalService);
  readonly cat = inject(CatalogosService);
  private liqSvc = inject(LiquidacionService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly mostrarForm = signal(false);
  readonly editando = signal<Profesional | null>(null);

  abrirNuevo() {
    this.editando.set(null);
    this.mostrarForm.set(true);
  }

  abrirEditar(p: Profesional) {
    this.editando.set(p);
    this.mostrarForm.set(true);
  }

  async confirmarEliminar(p: Profesional) {
    // Sus liquidaciones activas se van a la papelera junto con él (no quedan
    // huérfanas: si se recrea al profesional, no debe heredar datos antiguos).
    const liqs = this.liqSvc.activas().filter(
      (l) => l.profesionalId === p.id || l.profesional === p.nombre,
    );
    const aviso = liqs.length
      ? ` Sus ${liqs.length} liquidación(es) se enviarán a la papelera.`
      : '';
    const ok = await this.confirm.ask({
      titulo: 'Eliminar profesional',
      mensaje: `¿Eliminar a "${p.nombre}"?${aviso} Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (!ok) return;
    await this.svc.eliminar(p.id);
    for (const l of liqs) await this.liqSvc.eliminarLiquidacion(l.id);
    this.toast.exito(liqs.length
      ? `Profesional eliminado (${liqs.length} liquidación(es) a la papelera)`
      : 'Profesional eliminado');
  }
}
