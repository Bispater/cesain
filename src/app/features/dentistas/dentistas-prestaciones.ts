import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DentistaService } from '../../core/services/dentista.service';
import { PrestacionDentista } from '../../core/models/dentista.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { MonedaInput } from '../../shared/directives/moneda-input';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';
import { Icon } from '../../shared/icon/icon';

function vacio(): PrestacionDentista {
  return { id: '', codigo: '', nombre: '', arancel: 0, dentistaIds: [], activo: true };
}

@Component({
  selector: 'app-dentistas-prestaciones',
  imports: [FormsModule, ClpPipe, MonedaInput, RouterLink, Spinner, Icon],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <a routerLink="/dentistas"
           class="group inline-flex items-center gap-1.5 mb-2 rounded-lg border border-gray-200 bg-white
                  px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:text-brand-700 hover:border-brand-200 transition-colors">
          <app-icon name="back" [size]="15" class="transition-transform group-hover:-translate-x-0.5" />
          Volver a DENTAL
        </a>
        <h1 class="text-2xl font-bold text-gray-800">Prestaciones dentista</h1>
        <p class="text-sm text-gray-500">Cada una con su arancel. El código es opcional. Asócialas a uno o más dentistas.</p>
      </div>
      <button (click)="abrirNueva()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">+ Nueva prestación</button>
    </header>

    <div class="flex flex-wrap items-center gap-3 mb-5">
      <input [value]="busqueda()" (input)="busqueda.set($any($event.target).value)"
             placeholder="Buscar por nombre o código..."
             class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm w-72 focus:ring-2 focus:ring-brand-200 outline-none" />
      <select [value]="filtroDentista()" (change)="filtroDentista.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODOS">Todos los dentistas</option>
        @for (d of svc.dentistas(); track d.id) { <option [value]="d.id">{{ d.nombre }}</option> }
      </select>
      <span class="text-sm text-gray-400 ml-auto">{{ filtradas().length }} prestación(es)</span>
    </div>

    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Código</th>
            <th class="px-4 py-3 font-semibold">Prestación</th>
            <th class="px-4 py-3 font-semibold text-right">Arancel</th>
            <th class="px-4 py-3 font-semibold">Dentistas</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (p of filtradas(); track p.id) {
            <tr class="hover:bg-gray-50" [class.opacity-40]="!p.activo">
              <td class="px-4 py-3 font-mono text-gray-500">{{ p.codigo || '—' }}</td>
              <td class="px-4 py-3 font-medium text-gray-800">{{ p.nombre }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ p.arancel | clp }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  @if (!p.dentistaIds.length) { <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Todos</span> }
                  @for (id of p.dentistaIds; track id) { <span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ nombreDentista(id) }}</span> }
                </div>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button (click)="abrirEditar(p)" class="text-xs text-brand-600 hover:underline mr-3">Editar</button>
                <button (click)="eliminar(p)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargandoCatalogo()) { <app-spinner /> } @else { Sin prestaciones. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (draft(); as d) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrar()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-4">{{ editandoId() ? 'Editar' : 'Nueva' }} prestación</h2>
          <div class="grid grid-cols-2 gap-4">
            <label class="text-sm col-span-2"><span class="text-gray-600">Nombre</span>
              <input [(ngModel)]="d.nombre" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Código <span class="text-gray-400">(opcional)</span></span>
              <input [(ngModel)]="d.codigo" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Arancel</span>
              <input appMoneda type="text" inputmode="numeric" [(ngModel)]="d.arancel" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <div class="text-sm col-span-2">
              <span class="text-gray-600">Dentistas que la usan</span>
              <div class="mt-1.5 flex flex-wrap gap-2">
                @for (dent of svc.dentistas(); track dent.id) {
                  <label class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 cursor-pointer select-none transition-colors"
                         [class]="d.dentistaIds.includes(dent.id) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                    <input type="checkbox" class="accent-brand-600" [checked]="d.dentistaIds.includes(dent.id)" (change)="toggleDentista(d, dent.id)" />
                    {{ dent.nombre }}
                  </label>
                } @empty { <span class="text-xs text-gray-400">No hay dentistas creados aún.</span> }
              </div>
              <p class="text-xs text-gray-400 mt-1">Si no marcas ninguno, queda disponible para todos los dentistas.</p>
            </div>
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
export class DentistasPrestaciones {
  readonly svc = inject(DentistaService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly busqueda = signal('');
  readonly filtroDentista = signal('TODOS');
  readonly filtradas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const dent = this.filtroDentista();
    return this.svc.prestaciones()
      .filter((p) => dent === 'TODOS' || !p.dentistaIds.length || p.dentistaIds.includes(dent))
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  nombreDentista(id: string): string { return this.svc.dentistas().find((d) => d.id === id)?.nombre ?? id; }

  readonly draft = signal<PrestacionDentista | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);

  abrirNueva() { this.errorForm.set(null); this.editandoId.set(null); this.draft.set(vacio()); }
  abrirEditar(p: PrestacionDentista) { this.errorForm.set(null); this.editandoId.set(p.id); this.draft.set({ ...p, codigo: p.codigo ?? '', dentistaIds: [...p.dentistaIds] }); }
  cerrar() { this.draft.set(null); }

  toggleDentista(d: PrestacionDentista, id: string) {
    d.dentistaIds = d.dentistaIds.includes(id) ? d.dentistaIds.filter((x) => x !== id) : [...d.dentistaIds, id];
  }

  async guardar() {
    const d = this.draft();
    if (!d) return;
    if (!d.nombre.trim()) { this.errorForm.set('El nombre es obligatorio.'); return; }
    const codigo = (d.codigo ?? '').trim();
    const item: PrestacionDentista = { ...d, codigo: codigo || undefined, arancel: +d.arancel };
    if (this.editandoId()) await this.svc.actualizarPrestacion(item);
    else await this.svc.crearPrestacion({ ...item, id: `pd-${crypto.randomUUID().slice(0, 8)}` });
    this.cerrar();
    this.toast.exito('Prestación guardada');
  }

  async eliminar(p: PrestacionDentista) {
    const ok = await this.confirm.ask({ titulo: 'Eliminar prestación', mensaje: `¿Eliminar "${p.nombre}"?`, confirmar: 'Eliminar', tono: 'peligro' });
    if (ok) { await this.svc.eliminarPrestacion(p.id); this.toast.exito('Eliminada'); }
  }
}
