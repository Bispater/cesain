import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DentistaService } from '../../core/services/dentista.service';
import { Convenio } from '../../core/models/dentista.model';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';
import { Icon } from '../../shared/icon/icon';

function vacio(): Convenio {
  return { id: '', nombre: '', descuento: 0, activo: true };
}

@Component({
  selector: 'app-dentistas-convenios',
  imports: [FormsModule, RouterLink, Spinner, Icon],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <a routerLink="/dentistas"
           class="group inline-flex items-center gap-1.5 mb-2 rounded-lg border border-gray-200 bg-white
                  px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:text-brand-700 hover:border-brand-200 transition-colors">
          <app-icon name="back" [size]="15" class="transition-transform group-hover:-translate-x-0.5" />
          Volver a DENTAL
        </a>
        <h1 class="text-2xl font-bold text-gray-800">Convenios</h1>
        <p class="text-sm text-gray-500">Cada convenio tiene un % de descuento que se aplica al arancel en la planilla.</p>
      </div>
      <button (click)="abrirNueva()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">+ Nuevo convenio</button>
    </header>

    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto max-w-2xl">
      <table class="w-full text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Convenio</th>
            <th class="px-4 py-3 font-semibold text-right">Descuento</th>
            <th class="px-4 py-3 font-semibold">Estado</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (c of svc.convenios(); track c.id) {
            <tr class="hover:bg-gray-50" [class.opacity-40]="!c.activo">
              <td class="px-4 py-3 font-medium text-gray-800">{{ c.nombre }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-semibold text-brand-700">{{ c.descuento }}%</td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full" [class]="c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                  {{ c.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button (click)="abrirEditar(c)" class="text-xs text-brand-600 hover:underline mr-3">Editar</button>
                <button (click)="eliminar(c)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargandoCatalogo()) { <app-spinner /> } @else { Sin convenios. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (draft(); as d) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrar()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-4">{{ editandoId() ? 'Editar' : 'Nuevo' }} convenio</h2>
          <div class="grid grid-cols-2 gap-4">
            <label class="text-sm col-span-2"><span class="text-gray-600">Nombre</span>
              <input [(ngModel)]="d.nombre" placeholder="CESAIN, CFTPUCV…" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Descuento (%)</span>
              <input type="number" min="0" max="100" [(ngModel)]="d.descuento" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-brand-200" /></label>
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
export class DentistasConvenios {
  readonly svc = inject(DentistaService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly draft = signal<Convenio | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);

  abrirNueva() { this.errorForm.set(null); this.editandoId.set(null); this.draft.set(vacio()); }
  abrirEditar(c: Convenio) { this.errorForm.set(null); this.editandoId.set(c.id); this.draft.set({ ...c }); }
  cerrar() { this.draft.set(null); }

  async guardar() {
    const d = this.draft();
    if (!d) return;
    if (!d.nombre.trim()) { this.errorForm.set('El nombre es obligatorio.'); return; }
    const item: Convenio = { ...d, nombre: d.nombre.trim(), descuento: Math.min(100, Math.max(0, +d.descuento || 0)) };
    if (this.editandoId()) await this.svc.actualizarConvenio(item);
    else await this.svc.crearConvenio({ ...item, id: `cv-${crypto.randomUUID().slice(0, 8)}` });
    this.cerrar();
    this.toast.exito('Convenio guardado');
  }

  async eliminar(c: Convenio) {
    const ok = await this.confirm.ask({ titulo: 'Eliminar convenio', mensaje: `¿Eliminar "${c.nombre}"? Las liquidaciones existentes conservan su descuento.`, confirmar: 'Eliminar', tono: 'peligro' });
    if (ok) { await this.svc.eliminarConvenio(c.id); this.toast.exito('Eliminado'); }
  }
}
