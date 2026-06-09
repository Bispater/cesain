import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfesionalService } from '../../core/services/profesional.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { Profesional } from '../../core/models/profesional.model';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';

/** Draft del formulario: el % se maneja como entero (25) y se convierte a 0.25 al guardar. */
function vacio(): Profesional {
  return { id: '', nombre: '', rut: '', especialidad: '', tipoProfesional: 'MEDICO', sede: 'Valparaíso', porcentajeClinica: 25, email: '', telefono: '', activo: true };
}

@Component({
  selector: 'app-profesionales',
  imports: [FormsModule, Spinner],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Profesionales</h1>
        <p class="text-sm text-gray-500">
          Ingresa y edita los profesionales del centro médico, su sede y el % de arriendo. Se guarda en la nube.
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
            <th class="px-4 py-3 font-semibold">Sede</th>
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
              <td class="px-4 py-3 text-gray-600">{{ p.sede }}</td>
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

    <!-- Modal -->
    @if (draft(); as d) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrar()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-4">
            {{ editandoId() ? 'Editar profesional' : 'Nuevo profesional' }}
          </h2>

          <div class="grid grid-cols-2 gap-4">
            <label class="text-sm col-span-2">
              <span class="text-gray-600">Nombre</span>
              <input [(ngModel)]="d.nombre" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">RUT</span>
              <input [(ngModel)]="d.rut" placeholder="12.345.678-9" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Tipo</span>
              <select [(ngModel)]="d.tipoProfesional" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                @for (t of cat.tipos(); track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
              </select>
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Especialidad</span>
              <input [(ngModel)]="d.especialidad" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Sede</span>
              <select [(ngModel)]="d.sede" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                @for (s of cat.sedes(); track s.id) { <option [value]="s.nombre">{{ s.nombre }}</option> }
              </select>
            </label>
            <label class="text-sm">
              <span class="text-gray-600">% Arriendo (clínica)</span>
              <input type="number" min="0" max="100" [(ngModel)]="d.porcentajeClinica"
                     class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Estado</span>
              <select [ngModel]="d.activo" (ngModelChange)="d.activo = $event === 'true' || $event === true"
                      class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                <option [ngValue]="true">Activo</option>
                <option [ngValue]="false">Inactivo</option>
              </select>
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Email</span>
              <input [(ngModel)]="d.email" type="email" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Teléfono</span>
              <input [(ngModel)]="d.telefono" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
          </div>

          @if (errorForm()) { <p class="text-sm text-red-500 mt-3">{{ errorForm() }}</p> }

          <div class="flex justify-end gap-3 mt-6">
            <button (click)="cerrar()" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button (click)="guardar()" [disabled]="guardando()"
                    class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {{ guardando() ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Profesionales {
  readonly svc = inject(ProfesionalService);
  readonly cat = inject(CatalogosService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly draft = signal<Profesional | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);
  readonly guardando = signal(false);

  abrirNuevo() {
    this.errorForm.set(null);
    this.editandoId.set(null);
    this.draft.set(vacio());
  }

  abrirEditar(p: Profesional) {
    this.errorForm.set(null);
    this.editandoId.set(p.id);
    // % se muestra como entero en el formulario.
    this.draft.set({ ...p, porcentajeClinica: Math.round(p.porcentajeClinica * 100) });
  }

  cerrar() {
    this.draft.set(null);
  }

  async guardar() {
    const d = this.draft();
    if (!d) return;
    if (!d.nombre.trim()) { this.errorForm.set('El nombre es obligatorio.'); return; }
    const pct = Math.min(100, Math.max(0, +d.porcentajeClinica || 0)) / 100;

    this.guardando.set(true);
    try {
      if (this.editandoId()) {
        await this.svc.actualizar({ ...d, porcentajeClinica: pct });
      } else {
        const id = slug(d.nombre) || `prof-${crypto.randomUUID().slice(0, 8)}`;
        await this.svc.crear({ ...d, id, porcentajeClinica: pct });
      }
      const editado = !!this.editandoId();
      this.cerrar();
      this.toast.exito(editado ? 'Profesional actualizado' : 'Profesional creado');
    } catch (e) {
      this.errorForm.set('No se pudo guardar: ' + (e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }

  async confirmarEliminar(p: Profesional) {
    const ok = await this.confirm.ask({
      titulo: 'Eliminar profesional',
      mensaje: `¿Eliminar a "${p.nombre}"? Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (ok) { await this.svc.eliminar(p.id); this.toast.exito('Profesional eliminado'); }
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
