import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Profesional } from '../../core/models/profesional.model';
import { CatalogosService } from '../../core/services/catalogos.service';
import { ProfesionalService } from '../../core/services/profesional.service';
import { ToastService } from '../toast/toast.service';

/** Draft del formulario: el % se maneja como entero (25) y se convierte a 0.25 al guardar. */
function vacio(nombre = ''): Profesional {
  return { id: '', nombre, rut: '', especialidad: '', tipoProfesional: 'MEDICO', sedes: [], porcentajeClinica: 25, email: '', telefono: '', activo: true };
}

/**
 * Modal de creación/edición de un profesional. Reutilizable: lo usan la página
 * Profesionales y el modal "Nueva liquidación" (crear al vuelo si no existe).
 */
@Component({
  selector: 'app-profesional-form',
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrado.emit()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" (click)="$event.stopPropagation()">
        <h2 class="text-lg font-bold text-gray-800 mb-4">
          {{ profesional() ? 'Editar profesional' : 'Nuevo profesional' }}
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
            <select [(ngModel)]="d.especialidad" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
              <option value="">— Selecciona —</option>
              @for (e of cat.especialidades(); track e.id) { <option [value]="e.nombre">{{ e.nombre }}</option> }
              @if (d.especialidad && !especialidadEnCatalogo()) {
                <option [value]="d.especialidad">{{ d.especialidad }} (actual)</option>
              }
            </select>
          </label>
          <div class="text-sm col-span-2">
            <span class="text-gray-600">Sedes donde atiende</span>
            <div class="mt-1.5 flex flex-wrap gap-2">
              @for (s of cat.sedes(); track s.id) {
                <label class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 cursor-pointer select-none transition-colors"
                       [class]="d.sedes.includes(s.nombre)
                         ? 'border-brand-400 bg-brand-50 text-brand-700'
                         : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                  <input type="checkbox" class="accent-brand-600"
                         [checked]="d.sedes.includes(s.nombre)"
                         (change)="toggleSede(s.nombre)" />
                  {{ s.nombre }}
                </label>
              }
            </div>
            <p class="text-xs text-gray-400 mt-1">Puede atender en más de una sede; las liquidaciones se llevan por separado en cada una.</p>
          </div>
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
          <button (click)="cerrado.emit()" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
          <button (click)="guardar()" [disabled]="guardando()"
                  class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">
            {{ guardando() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ProfesionalForm implements OnInit {
  readonly svc = inject(ProfesionalService);
  readonly cat = inject(CatalogosService);
  private toast = inject(ToastService);

  /** Profesional a editar; null = crear uno nuevo. */
  readonly profesional = input<Profesional | null>(null);
  /** Nombre con que se precarga el formulario al crear (ej: lo tipeado en un buscador). */
  readonly nombreInicial = input('');

  readonly guardado = output<Profesional>();
  readonly cerrado = output<void>();

  d: Profesional = vacio();
  readonly errorForm = signal<string | null>(null);
  readonly guardando = signal(false);

  ngOnInit() {
    const p = this.profesional();
    this.d = p
      ? { ...p, sedes: [...p.sedes], porcentajeClinica: Math.round(p.porcentajeClinica * 100) }
      : vacio(this.nombreInicial().trim());
  }

  especialidadEnCatalogo(): boolean {
    return this.cat.especialidades().some((e) => e.nombre === this.d.especialidad);
  }

  toggleSede(nombre: string) {
    this.d.sedes = this.d.sedes.includes(nombre)
      ? this.d.sedes.filter((s) => s !== nombre)
      : [...this.d.sedes, nombre];
  }

  async guardar() {
    const d = this.d;
    if (!d.nombre.trim()) { this.errorForm.set('El nombre es obligatorio.'); return; }
    if (!d.sedes.length) { this.errorForm.set('Selecciona al menos una sede.'); return; }
    const pct = Math.min(100, Math.max(0, +d.porcentajeClinica || 0)) / 100;

    this.guardando.set(true);
    try {
      let guardado: Profesional;
      if (this.profesional()) {
        guardado = { ...d, porcentajeClinica: pct };
        await this.svc.actualizar(guardado);
      } else {
        // Sufijo aleatorio: recrear a alguien con el mismo nombre da un ID nuevo
        // (no hereda las liquidaciones del profesional eliminado).
        const id = `${slug(d.nombre) || 'prof'}-${crypto.randomUUID().slice(0, 6)}`;
        guardado = { ...d, id, porcentajeClinica: pct };
        await this.svc.crear(guardado);
      }
      this.toast.exito(this.profesional() ? 'Profesional actualizado' : 'Profesional creado');
      this.guardado.emit(guardado);
    } catch (e) {
      this.errorForm.set('No se pudo guardar: ' + (e as Error).message);
    } finally {
      this.guardando.set(false);
    }
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
