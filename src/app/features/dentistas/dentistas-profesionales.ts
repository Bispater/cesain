import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DentistaService } from '../../core/services/dentista.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { Dentista } from '../../core/models/dentista.model';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';
import { Icon } from '../../shared/icon/icon';

/** Draft: el % se maneja como entero (25) y se convierte a 0.25 al guardar. */
function vacio(): Dentista {
  return { id: '', nombre: '', rut: '', especialidad: '', sedes: [], porcentajeClinica: 25, email: '', telefono: '', activo: true };
}

@Component({
  selector: 'app-dentistas-profesionales',
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
        <h1 class="text-2xl font-bold text-gray-800">Dentistas</h1>
        <p class="text-sm text-gray-500">Profesionales odontológicos, sus sedes y el % de arriendo por defecto. Independientes del resto.</p>
      </div>
      <button (click)="abrirNuevo()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">+ Nuevo dentista</button>
    </header>

    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Dentista</th>
            <th class="px-4 py-3 font-semibold">Especialidad</th>
            <th class="px-4 py-3 font-semibold">Sedes</th>
            <th class="px-4 py-3 font-semibold text-right">% Arriendo</th>
            <th class="px-4 py-3 font-semibold">Contacto</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (p of ordenados(); track p.id) {
            <tr class="hover:bg-gray-50" [class.opacity-40]="!p.activo">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ p.nombre }}</p>
                @if (p.rut) { <p class="text-xs text-gray-400">{{ p.rut }}</p> }
              </td>
              <td class="px-4 py-3 text-gray-600">{{ p.especialidad || 'Odontología' }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  @for (s of p.sedes; track s) { <span class="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600">{{ s }}</span> }
                  @empty { <span class="text-gray-300">—</span> }
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
                <button (click)="eliminar(p)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargandoCatalogo()) { <app-spinner label="Cargando…" /> } @else { No hay dentistas. Crea el primero. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (draft(); as d) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrar()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-4">{{ editandoId() ? 'Editar' : 'Nuevo' }} dentista</h2>
          <div class="grid grid-cols-2 gap-4">
            <label class="text-sm col-span-2"><span class="text-gray-600">Nombre</span>
              <input [(ngModel)]="d.nombre" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">RUT</span>
              <input [(ngModel)]="d.rut" placeholder="12.345.678-9" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Especialidad</span>
              <input [(ngModel)]="d.especialidad" placeholder="Odontología, Ortodoncia…" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <div class="text-sm col-span-2">
              <span class="text-gray-600">Sedes donde atiende <span class="text-gray-400">(opcional)</span></span>
              <div class="mt-1.5 flex flex-wrap gap-2">
                @for (s of cat.sedes(); track s.id) {
                  <label class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 cursor-pointer select-none transition-colors"
                         [class]="d.sedes.includes(s.nombre) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                    <input type="checkbox" class="accent-brand-600" [checked]="d.sedes.includes(s.nombre)" (change)="toggleSede(d, s.nombre)" />
                    {{ s.nombre }}
                  </label>
                }
              </div>
              <p class="text-xs text-gray-400 mt-1">Si no marcas ninguna, podrá liquidar en cualquiera de las sedes generales.</p>
            </div>
            <label class="text-sm"><span class="text-gray-600">% Arriendo (clínica)</span>
              <input type="number" min="0" max="100" [(ngModel)]="d.porcentajeClinica" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-right outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Estado</span>
              <select [ngModel]="d.activo" (ngModelChange)="d.activo = $event === 'true' || $event === true"
                      class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                <option [ngValue]="true">Activo</option><option [ngValue]="false">Inactivo</option>
              </select></label>
            <label class="text-sm"><span class="text-gray-600">Email</span>
              <input [(ngModel)]="d.email" type="email" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
            <label class="text-sm"><span class="text-gray-600">Teléfono</span>
              <input [(ngModel)]="d.telefono" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" /></label>
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
export class DentistasProfesionales {
  readonly svc = inject(DentistaService);
  readonly cat = inject(CatalogosService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly ordenados = computed(() => [...this.svc.dentistas()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  readonly draft = signal<Dentista | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);

  abrirNuevo() { this.errorForm.set(null); this.editandoId.set(null); this.draft.set(vacio()); }
  abrirEditar(p: Dentista) {
    this.errorForm.set(null);
    this.editandoId.set(p.id);
    this.draft.set({ ...p, sedes: [...p.sedes], porcentajeClinica: Math.round(p.porcentajeClinica * 100) });
  }
  cerrar() { this.draft.set(null); }

  toggleSede(d: Dentista, nombre: string) {
    d.sedes = d.sedes.includes(nombre) ? d.sedes.filter((s) => s !== nombre) : [...d.sedes, nombre];
  }

  async guardar() {
    const d = this.draft();
    if (!d) return;
    if (!d.nombre.trim()) { this.errorForm.set('El nombre es obligatorio.'); return; }
    const pct = Math.min(100, Math.max(0, +d.porcentajeClinica || 0)) / 100;
    if (this.editandoId()) {
      await this.svc.actualizarDentista({ ...d, porcentajeClinica: pct });
    } else {
      await this.svc.crearDentista({ ...d, id: `dent-${crypto.randomUUID().slice(0, 8)}`, porcentajeClinica: pct });
    }
    this.cerrar();
    this.toast.exito('Dentista guardado');
  }

  async eliminar(p: Dentista) {
    const ok = await this.confirm.ask({ titulo: 'Eliminar dentista', mensaje: `¿Eliminar a "${p.nombre}"? Sus liquidaciones existentes se conservan.`, confirmar: 'Eliminar', tono: 'peligro' });
    if (ok) { await this.svc.eliminarDentista(p.id); this.toast.exito('Dentista eliminado'); }
  }
}
