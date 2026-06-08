import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { ProfesionalService } from '../../core/services/profesional.service';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';

@Component({
  selector: 'app-liquidaciones',
  imports: [ClpPipe, RouterLink],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Liquidaciones</h1>
        <p class="text-sm text-gray-500">
          Filtra por profesional y por período REAL (no por el nombre del archivo).
        </p>
      </div>
      <button (click)="abrirNueva()"
              class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">
        + Nueva liquidación
      </button>
    </header>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <input [value]="busqueda()" (input)="busqueda.set($any($event.target).value)"
             placeholder="Buscar profesional o especialidad..."
             class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm w-72
                    focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />

      <select [value]="svc.filtroProfesional()"
              (change)="svc.setFiltroProfesional($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODOS">Todos los profesionales</option>
        @for (p of svc.profesionales(); track p) { <option [value]="p">{{ p }}</option> }
      </select>

      <select [value]="svc.filtroPeriodo()"
              (change)="svc.setFiltroPeriodo($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODOS">Todos los períodos</option>
        @for (per of svc.periodos(); track per) {
          <option [value]="per">{{ nombrePeriodo(per) }}</option>
        }
      </select>

      <span class="text-sm text-gray-400 ml-auto">{{ filas().length }} resultado(s)</span>
    </div>

    <!-- Tabla -->
    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-brand-50 text-brand-800 text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Profesional</th>
            <th class="px-4 py-3 font-semibold">Especialidad</th>
            <th class="px-4 py-3 font-semibold">Período</th>
            <th class="px-4 py-3 font-semibold text-right">Pacientes</th>
            <th class="px-4 py-3 font-semibold text-right">Bruto</th>
            <th class="px-4 py-3 font-semibold text-right">Clínica</th>
            <th class="px-4 py-3 font-semibold text-right">Profesional</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (l of filas(); track l.id) {
            <tr class="hover:bg-gray-50 cursor-pointer" (click)="toggle(l.id)">
              <td class="px-4 py-3 font-medium text-gray-800">{{ l.profesional }}</td>
              <td class="px-4 py-3 text-gray-600">{{ l.especialidad }}</td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                  {{ nombrePeriodo(l.periodo) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right text-gray-700">{{ l.totalPacientes }}</td>
              <td class="px-4 py-3 text-right font-medium text-gray-800">{{ l.totalBruto | clp }}</td>
              <td class="px-4 py-3 text-right text-amber-600">− {{ l.totalClinica | clp }}</td>
              <td class="px-4 py-3 text-right font-bold text-brand-700">{{ l.totalProfesional | clp }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <a [routerLink]="['/planilla', l.id]" (click)="$event.stopPropagation()"
                     class="inline-flex items-center gap-1 rounded-lg bg-brand-600 hover:bg-brand-700
                            text-white text-xs font-semibold px-3 py-1.5">
                    Planilla
                  </a>
                  <a [routerLink]="['/comprobante', l.id]" (click)="$event.stopPropagation()"
                     class="rounded-lg border border-gray-200 text-gray-600 text-xs px-2.5 py-1.5 hover:bg-gray-50">
                    PDF
                  </a>
                  <span class="text-gray-400 w-4 text-center">{{ abierto() === l.id ? '▲' : '▼' }}</span>
                </div>
              </td>
            </tr>

            @if (abierto() === l.id) {
              <tr class="bg-gray-50/60">
                <td colspan="8" class="px-6 py-4">
                  <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p class="text-xs text-gray-400">
                      Origen: {{ l.archivoOrigen }} · {{ (l.porcentajeClinica * 100) }}% retención clínica
                    </p>
                    <div class="flex items-center gap-2">
                      <a [routerLink]="['/planilla', l.id]" (click)="$event.stopPropagation()"
                         class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5">
                        ▦ Abrir planilla (editar como Excel)
                      </a>
                      <a [routerLink]="['/comprobante', l.id]" (click)="$event.stopPropagation()"
                         class="rounded-lg border border-gray-200 text-gray-600 text-xs px-3 py-1.5 hover:bg-gray-50">
                        ⎙ PDF
                      </a>
                    </div>
                  </div>
                  <p class="text-[11px] text-gray-400 mb-2">Vista de detalle (solo lectura):</p>
                  <table class="w-full text-xs">
                    <thead class="text-gray-500 text-left">
                      <tr>
                        <th class="py-1.5">Fecha</th>
                        <th class="py-1.5">Prestación</th>
                        <th class="py-1.5">Previsión</th>
                        <th class="py-1.5 text-right">Cant.</th>
                        <th class="py-1.5 text-right">Valor unit.</th>
                        <th class="py-1.5 text-right">Copago</th>
                        <th class="py-1.5 text-right">Monto bruto</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      @for (it of l.items; track it.id) {
                        <tr>
                          <td class="py-1.5 text-gray-600">{{ it.fecha }}</td>
                          <td class="py-1.5 text-gray-700">{{ it.servicio }}</td>
                          <td class="py-1.5">
                            <span class="px-1.5 py-0.5 rounded text-[10px]"
                                  [class]="badgePrevision(it.prevision)">{{ it.prevision }}</span>
                          </td>
                          <td class="py-1.5 text-right">{{ it.cantidad }}</td>
                          <td class="py-1.5 text-right">{{ it.valorUnitario | clp }}</td>
                          <td class="py-1.5 text-right text-gray-500">{{ it.copago | clp }}</td>
                          <td class="py-1.5 text-right font-medium">{{ it.montoBruto | clp }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </td>
              </tr>
            }
          } @empty {
            <tr><td colspan="8" class="px-4 py-10 text-center text-gray-400">
              No hay liquidaciones para los filtros aplicados.
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- ===== Modal Nueva liquidación ===== -->
    @if (mostrarNueva()) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrarNueva()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-1">Nueva liquidación</h2>
          <p class="text-xs text-gray-500 mb-4">Elige el profesional y el mes; luego completas la planilla.</p>

          <label class="block text-sm mb-3">
            <span class="text-gray-600">Profesional</span>
            <select [value]="profSel()" (change)="profSel.set($any($event.target).value)"
                    class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
              <option value="">— Selecciona —</option>
              @for (p of profSvc.items(); track p.id) {
                <option [value]="p.id">{{ p.nombre }} · {{ p.especialidad }} ({{ p.sede }})</option>
              }
            </select>
          </label>

          <label class="block text-sm mb-1">
            <span class="text-gray-600">Mes</span>
            <input type="month" [value]="mesSel()" (change)="mesSel.set($any($event.target).value)"
                   class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
          </label>

          @if (errorNueva()) { <p class="text-sm text-red-500 mt-2">{{ errorNueva() }}</p> }

          <div class="flex justify-end gap-3 mt-6">
            <button (click)="cerrarNueva()" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button (click)="crearNueva()"
                    class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-sm font-semibold">
              Crear y abrir planilla
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Liquidaciones {
  readonly svc = inject(LiquidacionService);
  readonly profSvc = inject(ProfesionalService);
  private router = inject(Router);
  readonly nombrePeriodo = nombrePeriodo;

  readonly busqueda = signal('');
  readonly abierto = signal<string | null>(null);

  // Modal nueva liquidación
  readonly mostrarNueva = signal(false);
  readonly profSel = signal('');
  readonly mesSel = signal('2026-06');
  readonly errorNueva = signal<string | null>(null);

  readonly filas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    return this.svc.liquidacionesFiltradas().filter(
      (l) =>
        !q ||
        l.profesional.toLowerCase().includes(q) ||
        l.especialidad.toLowerCase().includes(q),
    );
  });

  toggle(id: string) {
    this.abierto.update((cur) => (cur === id ? null : id));
  }

  abrirNueva() {
    this.errorNueva.set(null);
    this.profSel.set('');
    this.mostrarNueva.set(true);
  }
  cerrarNueva() {
    this.mostrarNueva.set(false);
  }
  crearNueva() {
    const prof = this.profSvc.items().find((p) => p.id === this.profSel());
    if (!prof) { this.errorNueva.set('Selecciona un profesional.'); return; }
    if (!this.mesSel()) { this.errorNueva.set('Selecciona un mes.'); return; }
    const liq = this.svc.crearLiquidacion(prof, this.mesSel());
    this.cerrarNueva();
    this.router.navigate(['/planilla', liq.id]);
  }

  badgePrevision(p: string): string {
    return p === 'FONASA'
      ? 'bg-brand-100 text-brand-700'
      : p === 'ISAPRE'
        ? 'bg-sky-100 text-sky-700'
        : 'bg-amber-100 text-amber-700';
  }
}
