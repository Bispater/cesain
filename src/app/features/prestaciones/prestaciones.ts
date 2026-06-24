import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrestacionService } from '../../core/services/prestacion.service';
import { CATEGORIAS, Prestacion } from '../../core/models/prestacion.model';
import { Prevision } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { MonedaInput } from '../../shared/directives/moneda-input';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';

const PREVISIONES: Prevision[] = ['FONASA', 'ISAPRE', 'PARTICULAR'];

function vacia(): Prestacion {
  return { id: '', codigo: '', nombre: '', prevision: 'FONASA', categoria: 'Ecografía', valorBono: 0, valorCopago: 0, activo: true };
}

@Component({
  selector: 'app-prestaciones',
  imports: [FormsModule, ClpPipe, MonedaInput, Spinner],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Catálogo de prestaciones</h1>
        <p class="text-sm text-gray-500">
          Listado maestro global de todas las prestaciones y precios (independiente de cada
          profesional). Se guarda en la nube (Firestore).
        </p>
      </div>
      <button (click)="abrirNueva()"
              class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">
        + Nueva prestación
      </button>
    </header>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <input [value]="svc.busqueda()" (input)="svc.setBusqueda($any($event.target).value)"
             placeholder="Buscar por nombre o código..."
             class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm w-72
                    focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />

      <div class="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
        @for (p of chips; track p) {
          <button (click)="svc.setFiltroPrevision(p)"
                  class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  [class]="svc.filtroPrevision() === p ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
            {{ p === 'TODAS' ? 'Todas' : p }}
          </button>
        }
      </div>

      <select [value]="svc.filtroCategoria()" (change)="svc.setFiltroCategoria($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODAS">Todas las categorías</option>
        @for (c of svc.categorias(); track c) { <option [value]="c">{{ c }}</option> }
      </select>

      <span class="text-sm text-gray-400 ml-auto">{{ svc.filtradas().length }} prestación(es)</span>
    </div>

    @if (svc.error()) {
      <div class="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
        {{ svc.error() }}
      </div>
    }

    <!-- Tabla -->
    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">CÓDIGO</th>
            <th class="px-4 py-3 font-semibold">PRESTACIÓN</th>
            <th class="px-4 py-3 font-semibold">CATEGORÍA</th>
            <th class="px-4 py-3 font-semibold">PREVISIÓN</th>
            <th class="px-4 py-3 font-semibold text-right">VALOR TOTAL BONO</th>
            <th class="px-4 py-3 font-semibold text-right">VALOR COPAGO</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (p of svc.filtradas(); track p.id) {
            <tr class="hover:bg-gray-50" [class.opacity-40]="!p.activo">
              <td class="px-4 py-3 font-mono text-gray-500">{{ p.codigo || '—' }}</td>
              <td class="px-4 py-3 font-medium text-gray-800">{{ p.nombre }}</td>
              <td class="px-4 py-3 text-gray-600">{{ p.categoria }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-medium" [class]="badge(p.prevision)">
                  {{ p.prevision }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-800">{{ p.valorBono | clp }}</td>
              <td class="px-4 py-3 text-right text-gray-500">{{ p.valorCopago | clp }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button (click)="abrirEditar(p)" class="text-xs text-brand-600 hover:underline mr-3">Editar</button>
                <button (click)="confirmarEliminar(p)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargando()) { <app-spinner label="Cargando prestaciones…" /> }
              @else { No hay prestaciones para este filtro. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- ===== Modal Crear/Editar ===== -->
    @if (draft(); as d) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrar()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-4">
            {{ editandoId() ? 'Editar prestación' : 'Nueva prestación' }}
          </h2>

          <div class="grid grid-cols-2 gap-4">
            <label class="text-sm col-span-2">
              <span class="text-gray-600">Nombre de la prestación</span>
              <input [(ngModel)]="d.nombre" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Código</span>
              <input [(ngModel)]="d.codigo" placeholder="404003"
                     class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Previsión</span>
              <select [(ngModel)]="d.prevision" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2
                      focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
                @for (p of previsiones; track p) { <option [value]="p">{{ p }}</option> }
              </select>
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Categoría</span>
              <select [(ngModel)]="d.categoria" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2
                      focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
                @for (c of categorias; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Estado</span>
              <select [ngModel]="d.activo" (ngModelChange)="d.activo = $event === 'true' || $event === true"
                      class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2
                      focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
                <option [ngValue]="true">Activo</option>
                <option [ngValue]="false">Inactivo</option>
              </select>
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Valor total bono</span>
              <input appMoneda type="text" inputmode="numeric" [(ngModel)]="d.valorBono" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
            </label>
            <label class="text-sm">
              <span class="text-gray-600">Valor copago</span>
              <input appMoneda type="text" inputmode="numeric" [(ngModel)]="d.valorCopago" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
            </label>
          </div>

          @if (errorForm()) { <p class="text-sm text-red-500 mt-3">{{ errorForm() }}</p> }

          <div class="flex justify-end gap-3 mt-6">
            <button (click)="cerrar()" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
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
export class Prestaciones {
  readonly svc = inject(PrestacionService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly previsiones = PREVISIONES;
  readonly categorias = CATEGORIAS;
  readonly chips: ('TODAS' | Prevision)[] = ['TODAS', 'FONASA', 'ISAPRE', 'PARTICULAR'];

  readonly draft = signal<Prestacion | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);
  readonly guardando = signal(false);

  abrirNueva() {
    this.errorForm.set(null);
    this.editandoId.set(null);
    this.draft.set(vacia());
  }

  abrirEditar(p: Prestacion) {
    this.errorForm.set(null);
    this.editandoId.set(p.id);
    this.draft.set({ ...p });
  }

  cerrar() {
    this.draft.set(null);
  }

  async guardar() {
    const d = this.draft();
    if (!d) return;
    if (!d.nombre.trim()) { this.errorForm.set('El nombre es obligatorio.'); return; }
    if (d.valorBono < 0 || d.valorCopago < 0) { this.errorForm.set('Los valores no pueden ser negativos.'); return; }

    this.guardando.set(true);
    try {
      if (this.editandoId()) {
        await this.svc.actualizar({ ...d, valorBono: +d.valorBono, valorCopago: +d.valorCopago });
      } else {
        const id = d.codigo.trim() || `p-${crypto.randomUUID().slice(0, 8)}`;
        await this.svc.crear({ ...d, id, valorBono: +d.valorBono, valorCopago: +d.valorCopago });
      }
      this.cerrar();
      this.toast.exito(this.editandoId() ? 'Prestación actualizada' : 'Prestación creada');
    } catch (e) {
      this.errorForm.set('No se pudo guardar: ' + (e as Error).message);
    } finally {
      this.guardando.set(false);
    }
  }

  async confirmarEliminar(p: Prestacion) {
    const ok = await this.confirm.ask({
      titulo: 'Eliminar prestación',
      mensaje: `¿Seguro que quieres eliminar "${p.nombre}"? Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (ok) { await this.svc.eliminar(p.id); this.toast.exito('Prestación eliminada'); }
  }

  badge(prev: string): string {
    return prev === 'FONASA'
      ? 'bg-brand-100 text-brand-700'
      : prev === 'ISAPRE'
        ? 'bg-sky-100 text-sky-700'
        : 'bg-amber-100 text-amber-700';
  }
}
