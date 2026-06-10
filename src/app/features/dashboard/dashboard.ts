import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-dashboard',
  imports: [ClpPipe, RouterLink, Spinner],
  template: `
    <!-- Encabezado + filtros -->
    <header class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Dashboard de Liquidaciones</h1>
        <p class="text-sm text-gray-500">
          Resumen consolidado del centro médico · período real de los datos
        </p>
        @if (svc.cargando()) { <div class="mt-2"><app-spinner label="Cargando datos…" /></div> }
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <select [value]="filtroProfesional()"
                (change)="filtroProfesional.set($any($event.target).value)"
                class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700
                       focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
          <option value="TODOS">Todos los profesionales</option>
          @for (p of svc.profesionales(); track p) {
            <option [value]="p">{{ p }}</option>
          }
        </select>

        <select [value]="filtroPeriodo()"
                (change)="filtroPeriodo.set($any($event.target).value)"
                class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700
                       focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
          <option value="TODOS">Todos los períodos</option>
          @for (per of svc.periodos(); track per) {
            <option [value]="per">{{ nombrePeriodo(per) }}</option>
          }
        </select>

        <a routerLink="/importar"
           class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold
                  px-4 py-2 shadow-md transition-colors">+ Importar Excel</a>
      </div>
    </header>

    <!-- ===== BENTO GRID ===== -->
    <section class="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[minmax(0,auto)]">

      <!-- Total facturado (card grande) -->
      <div class="md:col-span-2 md:row-span-2 rounded-2xl p-6 text-white
                  bg-gradient-to-br from-brand-600 to-brand-800 shadow-lg flex flex-col">
        <p class="text-brand-200 text-sm">Total facturado (bruto)</p>
        <p class="text-4xl font-extrabold mt-1">{{ resumen().totalBruto | clp }}</p>

        <div class="grid grid-cols-2 gap-3 mt-6">
          <div class="rounded-xl bg-white/10 p-4">
            <p class="text-xs text-brand-200">Pagan los profesionales</p>
            <p class="text-xl font-bold mt-1">{{ resumen().totalProfesional | clp }}</p>
          </div>
          <div class="rounded-xl bg-amber-200 p-4 text-amber-900">
            <p class="text-xs font-medium">Retiene la clínica (arriendo)</p>
            <p class="text-xl font-bold mt-1">{{ resumen().totalClinica | clp }}</p>
          </div>
        </div>

        <div class="mt-auto pt-6">
          <div class="flex justify-between text-xs text-brand-200 mb-1">
            <span>Distribución del ingreso</span>
            <span>{{ porcClinica() }}% clínica</span>
          </div>
          <div class="h-3 rounded-full bg-white/15 overflow-hidden flex">
            <div class="h-full bg-white" [style.width.%]="100 - porcClinica()"></div>
            <div class="h-full bg-amber-300" [style.width.%]="porcClinica()"></div>
          </div>
        </div>
      </div>

      <!-- Pacientes -->
      <div class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">Pacientes / prestaciones</p>
        <p class="text-3xl font-extrabold text-gray-800 mt-1">
          {{ resumen().totalPacientes }}
        </p>
        <p class="text-xs text-gray-400 mt-2">en el período filtrado</p>
      </div>

      <!-- Profesionales -->
      <div class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">Profesionales activos</p>
        <p class="text-3xl font-extrabold text-gray-800 mt-1">
          {{ resumen().nProfesionales }}
        </p>
        <p class="text-xs text-gray-400 mt-2">{{ resumen().nLiquidaciones }} liquidaciones</p>
      </div>

      <!-- Distribución por previsión -->
      <div class="md:col-span-2 rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <p class="text-sm font-semibold text-gray-700 mb-3">Ingresos por previsión</p>
        <div class="space-y-2.5">
          @for (p of ingresosPorPrevision(); track p.prevision) {
            <div>
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span class="font-medium text-gray-700">{{ p.prevision }}</span>
                <span>{{ p.valor | clp }}</span>
              </div>
              <div class="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full"
                     [class]="colorPrevision(p.prevision)"
                     [style.width.%]="anchoPrevision(p.valor)"></div>
              </div>
            </div>
          } @empty {
            <p class="text-sm text-gray-400">Sin datos para el filtro actual.</p>
          }
        </div>
      </div>

      <!-- Gráfico de barras: ingresos por especialidad (card ancho) -->
      <div class="md:col-span-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-5">
          <p class="text-sm font-semibold text-gray-700">Ingresos por especialidad</p>
          <span class="text-xs text-gray-400">monto bruto facturado</span>
        </div>

        <div class="flex items-end gap-6 h-56">
          @for (e of ingresosPorEspecialidad(); track e.especialidad) {
            <div class="flex-1 flex flex-col items-center justify-end h-full group">
              <span class="text-xs font-semibold text-gray-700 mb-2">{{ e.valor | clp }}</span>
              <div class="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400
                          group-hover:from-brand-700 group-hover:to-brand-500 transition-all"
                   [style.height.%]="e.porcentaje"></div>
              <span class="text-[11px] text-gray-500 mt-2 text-center leading-tight">
                {{ e.especialidad }}
              </span>
              <span class="text-[10px] text-gray-400">{{ e.pacientes }} pac.</span>
            </div>
          } @empty {
            <p class="text-sm text-gray-400 self-center mx-auto">Sin datos para el filtro actual.</p>
          }
        </div>
      </div>

      <!-- Accesos rápidos por profesional -->
      <div class="md:col-span-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-semibold text-gray-700">Acceso rápido por profesional</p>
          <a routerLink="/liquidaciones" class="text-xs text-brand-600 hover:underline">
            Ver tabla completa →
          </a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (l of filtradas(); track l.id) {
            <a [routerLink]="['/planilla', l.id]"
               class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100
                      hover:shadow-md hover:border-brand-200 transition-all block">
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-semibold text-gray-800 leading-tight">{{ l.profesional }}</p>
                  <p class="text-xs text-gray-500">{{ l.especialidad ? l.especialidad + ' · ' : '' }}{{ l.sede }}</p>
                </div>
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-full
                             bg-brand-50 text-brand-700">
                  {{ nombrePeriodo(l.periodo) }}
                </span>
              </div>

              <p class="text-2xl font-extrabold text-gray-800 mt-3">{{ l.totalProfesional | clp }}</p>
              <p class="text-xs text-gray-400">recibe el profesional</p>

              <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-gray-50 px-2 py-1.5">
                  <span class="text-gray-400">Bruto</span>
                  <p class="font-semibold text-gray-700">{{ l.totalBruto | clp }}</p>
                </div>
                <div class="rounded-lg bg-amber-50 px-2 py-1.5">
                  <span class="text-amber-600">Clínica {{ (l.porcentajeClinica * 100) }}%</span>
                  <p class="font-semibold text-amber-700">{{ l.totalClinica | clp }}</p>
                </div>
              </div>

              @if (l.archivoOrigen.toLowerCase().includes('junio') && l.periodo !== '2026-06') {
                <p class="mt-3 text-[11px] text-red-500 flex items-center gap-1">
                  ⚠ Archivo "{{ l.archivoOrigen }}" pero datos de {{ nombrePeriodo(l.periodo) }}
                </p>
              }
            </a>
          } @empty {
            <p class="text-sm text-gray-400">No hay liquidaciones para este filtro.</p>
          }
        </div>
      </div>
    </section>
  `,
})
export class Dashboard {
  readonly svc = inject(LiquidacionService);
  readonly nombrePeriodo = nombrePeriodo;

  /** Filtros propios de esta página (independientes de las demás). */
  readonly filtroProfesional = signal('TODOS');
  readonly filtroPeriodo = signal('TODOS');

  readonly filtradas = computed(() =>
    this.svc.filtrar(this.filtroProfesional(), this.filtroPeriodo()),
  );
  readonly resumen = computed(() => this.svc.resumenDe(this.filtradas()));
  readonly ingresosPorEspecialidad = computed(() =>
    this.svc.ingresosPorEspecialidadDe(this.filtradas()),
  );
  readonly ingresosPorPrevision = computed(() =>
    this.svc.ingresosPorPrevisionDe(this.filtradas()),
  );

  /** % promedio de clínica sobre el total filtrado (para la barra grande). */
  readonly porcClinica = computed(() => {
    const r = this.resumen();
    return r.totalBruto > 0 ? Math.round((r.totalClinica / r.totalBruto) * 100) : 0;
  });

  private readonly maxPrevision = computed(() =>
    Math.max(1, ...this.ingresosPorPrevision().map((p) => p.valor)),
  );

  anchoPrevision(valor: number): number {
    return Math.round((valor / this.maxPrevision()) * 100);
  }

  colorPrevision(prevision: string): string {
    return prevision === 'FONASA'
      ? 'bg-brand-500'
      : prevision === 'ISAPRE'
        ? 'bg-sky-500'
        : 'bg-amber-400';
  }
}
