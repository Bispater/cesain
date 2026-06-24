import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApsoradService } from '../../core/services/apsorad.service';
import { PrestacionApsorad, ServicioApsorad, SERVICIOS_APSORAD } from '../../core/models/apsorad.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { MonedaInput } from '../../shared/directives/moneda-input';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';
import { Icon } from '../../shared/icon/icon';

function vacio(): PrestacionApsorad {
  return { id: '', codigo: '', nombre: '', servicio: 'ECOGRAFIA', valorFonasa: 0, valorCopago: 0, valorParticular: 0, activo: true };
}

@Component({
  selector: 'app-apsorad-catalogo',
  imports: [FormsModule, ClpPipe, MonedaInput, RouterLink, Spinner, Icon],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <a routerLink="/apsorad"
           class="group inline-flex items-center gap-1.5 mb-2 rounded-lg border border-gray-200 bg-white
                  px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm
                  hover:text-brand-700 hover:border-brand-200 transition-colors">
          <app-icon name="back" [size]="15" class="transition-transform group-hover:-translate-x-0.5" />
          Volver a APSORAD
        </a>
        <h1 class="text-2xl font-bold text-gray-800">Prestaciones APSORAD</h1>
        <p class="text-sm text-gray-500">Ecografías y Rayos, cada una con su valor Fonasa y Particular.</p>
      </div>
      <button (click)="abrirNueva()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">+ Nueva prestación</button>
    </header>

    <div class="flex gap-1 bg-white rounded-lg border border-gray-200 p-1 mb-5 w-fit">
      @for (f of filtros; track f.valor) {
        <button (click)="filtro.set(f.valor)" class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                [class]="filtro() === f.valor ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'">{{ f.label }}</button>
      }
    </div>

    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Código</th>
            <th class="px-4 py-3 font-semibold">Prestación</th>
            <th class="px-4 py-3 font-semibold">Servicio</th>
            <th class="px-4 py-3 font-semibold text-right">Valor Fonasa</th>
            <th class="px-4 py-3 font-semibold text-right">Copago</th>
            <th class="px-4 py-3 font-semibold text-right">Valor Particular</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (p of filtradas(); track p.id) {
            <tr class="hover:bg-gray-50" [class.opacity-40]="!p.activo">
              <td class="px-4 py-3 font-mono text-gray-500">{{ p.codigo || '—' }}</td>
              <td class="px-4 py-3 font-medium text-gray-800">{{ p.nombre }}</td>
              <td class="px-4 py-3"><span class="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">{{ p.servicio === 'ECOGRAFIA' ? 'Ecografía' : 'Rayos' }}</span></td>
              <td class="px-4 py-3 text-right tabular-nums">{{ p.valorFonasa | clp }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-gray-500">{{ p.valorCopago | clp }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ p.valorParticular | clp }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button (click)="abrirEditar(p)" class="text-xs text-brand-600 hover:underline mr-3">Editar</button>
                <button (click)="eliminar(p)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargandoCatalogo()) { <app-spinner /> } @else { Sin prestaciones. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (draft(); as d) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrar()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-4">{{ editandoId() ? 'Editar' : 'Nueva' }} prestación APSORAD</h2>
          <div class="grid grid-cols-2 gap-4">
            <label class="text-sm col-span-2"><span class="text-gray-600">Nombre</span>
              <input [(ngModel)]="d.nombre" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Código</span>
              <input [(ngModel)]="d.codigo" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Servicio</span>
              <select [(ngModel)]="d.servicio" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                @for (s of servicios; track s.valor) { <option [value]="s.valor">{{ s.label }}</option> }
              </select></label>
            <label class="text-sm"><span class="text-gray-600">Valor Fonasa</span>
              <input appMoneda type="text" inputmode="numeric" [(ngModel)]="d.valorFonasa" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Copago</span>
              <input appMoneda type="text" inputmode="numeric" [(ngModel)]="d.valorCopago" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Valor Particular</span>
              <input appMoneda type="text" inputmode="numeric" [(ngModel)]="d.valorParticular" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Estado</span>
              <select [ngModel]="d.activo" (ngModelChange)="d.activo = $event === 'true' || $event === true"
                      class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                <option [ngValue]="true">Activo</option><option [ngValue]="false">Inactivo</option>
              </select></label>
          </div>
          @if (errorForm()) { <p class="text-sm text-red-500 mt-3">{{ errorForm() }}</p> }
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="cerrar()" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button (click)="guardar()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-sm font-semibold">Guardar</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ApsoradCatalogo {
  readonly svc = inject(ApsoradService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly servicios = SERVICIOS_APSORAD;
  readonly filtros: { valor: 'TODOS' | ServicioApsorad; label: string }[] = [
    { valor: 'TODOS', label: 'Todas' },
    { valor: 'ECOGRAFIA', label: 'Ecografías' },
    { valor: 'RAYOS', label: 'Rayos' },
  ];
  readonly filtro = signal<'TODOS' | ServicioApsorad>('TODOS');
  readonly filtradas = computed(() => {
    const f = this.filtro();
    return this.svc.prestaciones()
      .filter((p) => f === 'TODOS' || p.servicio === f)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly draft = signal<PrestacionApsorad | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);

  abrirNueva() { this.errorForm.set(null); this.editandoId.set(null); this.draft.set(vacio()); }
  abrirEditar(p: PrestacionApsorad) { this.errorForm.set(null); this.editandoId.set(p.id); this.draft.set({ ...p }); }
  cerrar() { this.draft.set(null); }

  async guardar() {
    const d = this.draft();
    if (!d) return;
    if (!d.nombre.trim()) { this.errorForm.set('El nombre es obligatorio.'); return; }
    const item: PrestacionApsorad = { ...d, valorFonasa: +d.valorFonasa, valorCopago: +d.valorCopago, valorParticular: +d.valorParticular };
    if (this.editandoId()) await this.svc.actualizarPrestacion(item);
    else await this.svc.crearPrestacion({ ...item, id: d.codigo.trim() || `ap-${crypto.randomUUID().slice(0, 8)}` });
    this.cerrar();
    this.toast.exito('Prestación guardada');
  }

  async eliminar(p: PrestacionApsorad) {
    const ok = await this.confirm.ask({ titulo: 'Eliminar prestación', mensaje: `¿Eliminar "${p.nombre}"?`, confirmar: 'Eliminar', tono: 'peligro' });
    if (ok) { await this.svc.eliminarPrestacion(p.id); this.toast.exito('Eliminada'); }
  }
}
