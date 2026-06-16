import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { ApsoradService } from '../../core/services/apsorad.service';
import { AuthService } from '../../core/services/auth.service';
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
          @for (per of periodosCombinados(); track per) {
            <option [value]="per">{{ nombrePeriodo(per) }}</option>
          }
        </select>
      </div>
    </header>

    <!-- ===== BENTO CESAIN ===== -->
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
        <p class="text-sm text-gray-500">Pacientes atendidos</p>
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
    </section>

    <!-- ===== APSORAD ===== -->
    <section class="mt-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <p class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-brand-500"></span>
            APSORAD · Ecografías y Rayos
          </p>
          <p class="text-xs text-gray-400">Servicio externo · a APSORAD se le paga el % del valor Fonasa</p>
        </div>
        <span class="text-xs text-gray-400">{{ apsoradResumen().n }} liquidaciones · {{ apsoradResumen().cantidad }} exámenes</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-xl bg-gray-50 p-4">
          <p class="text-xs text-gray-500">Cobrado total</p>
          <p class="text-2xl font-extrabold text-gray-800 mt-1">{{ apsoradResumen().cobrado | clp }}</p>
        </div>
        <div class="rounded-xl bg-brand-50 p-4">
          <p class="text-xs text-brand-600">Pago a APSORAD</p>
          <p class="text-2xl font-extrabold text-brand-700 mt-1">{{ apsoradResumen().apsorad | clp }}</p>
        </div>
        <div class="rounded-xl bg-green-50 p-4">
          <p class="text-xs text-green-600">Margen CESAIN</p>
          <p class="text-2xl font-extrabold text-green-700 mt-1">{{ apsoradResumen().cesain | clp }}</p>
        </div>
      </div>

      @if (apsoradPorServicio().length) {
        <div class="mt-5 space-y-3">
          <div class="flex items-center gap-4 text-[11px] text-gray-400">
            <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-brand-500"></span> APSORAD</span>
            <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-green-500"></span> CESAIN</span>
          </div>
          @for (s of apsoradPorServicio(); track s.servicio) {
            <div>
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-medium text-gray-700">{{ s.label }} <span class="text-gray-400">· {{ s.cantidad }} exám.</span></span>
                <span class="font-semibold text-gray-800 tabular-nums">{{ s.cobrado | clp }}</span>
              </div>
              <div class="h-2.5 rounded-full bg-gray-100 overflow-hidden flex" [style.width.%]="s.ancho">
                <div class="h-full bg-brand-500" [style.width.%]="s.pctApsorad"></div>
                <div class="h-full bg-green-500" [style.width.%]="100 - s.pctApsorad"></div>
              </div>
            </div>
          }
        </div>
      } @else {
        <p class="text-sm text-gray-400 mt-4">
          @if (apsorad.cargando()) { <app-spinner label="Cargando…" /> } @else { Sin liquidaciones APSORAD para el filtro actual. }
        </p>
      }

      <div class="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-xs text-gray-500">Ingreso operativo CESAIN <span class="text-gray-400">(arriendo clínica + margen APSORAD)</span></p>
        <p class="text-xl font-extrabold text-gray-800">{{ ingresoOperativo() | clp }}</p>
      </div>
    </section>

    <!-- ===== GRÁFICOS ===== -->
    <section class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Ingresos por especialidad -->
      <div class="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-semibold text-gray-700">Ingresos por especialidad</p>
          <span class="text-xs text-gray-400">monto bruto</span>
        </div>
        <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
          @for (e of ingresosPorEspecialidad(); track e.especialidad) {
            <div class="group">
              <div class="flex items-center justify-between gap-3 text-xs mb-1">
                <span class="text-gray-700 truncate">
                  <span class="font-medium">{{ e.especialidad }}</span>
                  <span class="text-gray-400">· {{ e.pacientes }} pac.</span>
                </span>
                <span class="font-semibold text-gray-800 tabular-nums shrink-0">{{ e.valor | clp }}</span>
              </div>
              <div class="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400
                            group-hover:from-brand-700 group-hover:to-brand-500 transition-all"
                     [style.width.%]="e.porcentaje"></div>
              </div>
            </div>
          } @empty {
            <p class="text-sm text-gray-400 text-center py-6">Sin datos para el filtro actual.</p>
          }
        </div>
      </div>

      <!-- Ingresos por sede -->
      <div class="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-semibold text-gray-700">Ingresos por sede</p>
          <span class="text-xs text-gray-400">monto bruto</span>
        </div>
        <div class="space-y-4">
          @for (s of ingresosPorSede(); track s.sede) {
            <div class="group">
              <div class="flex items-center justify-between gap-3 text-xs mb-1">
                <span class="text-gray-700 truncate">
                  <span class="font-medium">{{ s.sede }}</span>
                  <span class="text-gray-400">· {{ s.pacientes }} pac.</span>
                </span>
                <span class="font-semibold text-gray-800 tabular-nums shrink-0">{{ s.valor | clp }}</span>
              </div>
              <div class="h-3 rounded-full bg-gray-100 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all"
                     [style.width.%]="s.porcentaje"></div>
              </div>
            </div>
          } @empty {
            <p class="text-sm text-gray-400 text-center py-6">Sin datos para el filtro actual.</p>
          }
        </div>
      </div>
    </section>

    <!-- ===== ACCESO RÁPIDO ===== -->
    <section class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p class="text-sm font-semibold text-gray-700">Acceso rápido</p>
        <a [routerLink]="vista() === 'apsorad' ? '/apsorad' : '/liquidaciones'"
           class="text-xs text-brand-600 hover:underline">Ver tabla completa →</a>
      </div>

      <!-- Filtros del acceso rápido -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        @if (auth.puedeApsorad()) {
          <div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
            <button (click)="vista.set('cesain')"
                    class="px-3 py-1.5 rounded-md font-medium transition-colors"
                    [class]="vista() === 'cesain' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
              Profesionales
            </button>
            <button (click)="vista.set('apsorad')"
                    class="px-3 py-1.5 rounded-md font-medium transition-colors"
                    [class]="vista() === 'apsorad' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
              APSORAD
            </button>
          </div>
        }

        <div class="relative flex-1 min-w-[180px] max-w-xs">
          <input [value]="busqueda()" (input)="busqueda.set($any($event.target).value)"
                 [placeholder]="vista() === 'apsorad' ? 'Buscar servicio o sede…' : 'Buscar profesional, especialidad o sede…'"
                 class="w-full rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm text-gray-700
                        focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
          @if (busqueda()) {
            <button (click)="busqueda.set('')" aria-label="Limpiar"
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
          }
        </div>

        <select [value]="orden()" (change)="orden.set($any($event.target).value)"
                class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700
                       focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
          <option value="monto">Mayor monto</option>
          <option value="nombre">Nombre (A-Z)</option>
        </select>
      </div>

      @if (vista() === 'apsorad' && auth.puedeApsorad()) {
        <!-- Cards APSORAD -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (l of cardsApsorad(); track l.id) {
            <a [routerLink]="['/apsorad', l.id]"
               class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100
                      hover:shadow-md hover:border-brand-200 transition-all block">
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-semibold text-gray-800 leading-tight">{{ l.servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos' }}</p>
                  <p class="text-xs text-gray-500">{{ l.sede }}</p>
                </div>
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                  {{ nombrePeriodo(l.periodo) }}
                </span>
              </div>
              <p class="text-2xl font-extrabold text-green-700 mt-3">{{ l.totalCesain | clp }}</p>
              <p class="text-xs text-gray-400">margen CESAIN</p>
              <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-gray-50 px-2 py-1.5">
                  <span class="text-gray-400">Cobrado</span>
                  <p class="font-semibold text-gray-700">{{ l.totalCobrado | clp }}</p>
                </div>
                <div class="rounded-lg bg-brand-50 px-2 py-1.5">
                  <span class="text-brand-600">APSORAD</span>
                  <p class="font-semibold text-brand-700">{{ l.totalApsorad | clp }}</p>
                </div>
              </div>
            </a>
          } @empty {
            <p class="text-sm text-gray-400">No hay liquidaciones APSORAD para este filtro.</p>
          }
        </div>
      } @else {
        <!-- Cards profesionales (CESAIN) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (l of cardsCesain(); track l.id) {
            <a [routerLink]="['/planilla', l.id]"
               class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100
                      hover:shadow-md hover:border-brand-200 transition-all block">
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-semibold text-gray-800 leading-tight">{{ l.profesional }}</p>
                  <p class="text-xs text-gray-500">{{ l.especialidad ? l.especialidad + ' · ' : '' }}{{ l.sede }}</p>
                </div>
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
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
      }
    </section>
  `,
})
export class Dashboard {
  readonly svc = inject(LiquidacionService);
  readonly apsorad = inject(ApsoradService);
  readonly auth = inject(AuthService);
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

  /** Períodos disponibles en CESAIN o APSORAD (unión, descendente). */
  readonly periodosCombinados = computed(() => {
    const set = new Set<string>([
      ...this.svc.periodos(),
      ...this.apsorad.activas().map((l) => l.periodo),
    ]);
    return [...set].sort().reverse();
  });

  /** Ingresos por sede (CESAIN). */
  readonly ingresosPorSede = computed(() => {
    const mapa = new Map<string, { valor: number; pacientes: number }>();
    for (const l of this.filtradas()) {
      const a = mapa.get(l.sede) ?? { valor: 0, pacientes: 0 };
      a.valor += l.totalBruto;
      a.pacientes += l.totalPacientes;
      mapa.set(l.sede, a);
    }
    const filas = [...mapa.entries()].map(([sede, v]) => ({ sede, ...v }));
    const max = Math.max(1, ...filas.map((f) => f.valor));
    return filas
      .sort((a, b) => b.valor - a.valor)
      .map((f) => ({ ...f, porcentaje: Math.round((f.valor / max) * 100) }));
  });

  // ───────── APSORAD ─────────
  /** Liquidaciones APSORAD del período filtrado (sin filtro por profesional). */
  readonly apsoradActivas = computed(() => {
    const per = this.filtroPeriodo();
    return this.apsorad.activas().filter((l) => per === 'TODOS' || l.periodo === per);
  });

  readonly apsoradResumen = computed(() => {
    const d = this.apsoradActivas();
    return {
      cobrado: d.reduce((s, l) => s + l.totalCobrado, 0),
      apsorad: d.reduce((s, l) => s + l.totalApsorad, 0),
      cesain: d.reduce((s, l) => s + l.totalCesain, 0),
      cantidad: d.reduce((s, l) => s + l.totalCantidad, 0),
      n: d.length,
    };
  });

  readonly apsoradPorServicio = computed(() => {
    const mapa = new Map<string, { cobrado: number; apsorad: number; cesain: number; cantidad: number }>();
    for (const l of this.apsoradActivas()) {
      const a = mapa.get(l.servicio) ?? { cobrado: 0, apsorad: 0, cesain: 0, cantidad: 0 };
      a.cobrado += l.totalCobrado;
      a.apsorad += l.totalApsorad;
      a.cesain += l.totalCesain;
      a.cantidad += l.totalCantidad;
      mapa.set(l.servicio, a);
    }
    const max = Math.max(1, ...[...mapa.values()].map((v) => v.cobrado));
    return [...mapa.entries()]
      .map(([servicio, v]) => ({
        servicio,
        label: servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos',
        ...v,
        ancho: Math.round((v.cobrado / max) * 100),
        pctApsorad: v.cobrado > 0 ? Math.round((v.apsorad / v.cobrado) * 100) : 0,
      }))
      .sort((a, b) => b.cobrado - a.cobrado);
  });

  /** Ingreso que realmente le queda a CESAIN: arriendo de profesionales + margen APSORAD. */
  readonly ingresoOperativo = computed(
    () => this.resumen().totalClinica + this.apsoradResumen().cesain,
  );

  // ───────── Acceso rápido (filtros locales) ─────────
  readonly busqueda = signal('');
  readonly orden = signal<'monto' | 'nombre'>('monto');
  readonly vista = signal<'cesain' | 'apsorad'>('cesain');

  readonly cardsCesain = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    let arr = this.filtradas();
    if (q) {
      arr = arr.filter((l) =>
        `${l.profesional} ${l.especialidad} ${l.sede}`.toLowerCase().includes(q),
      );
    }
    return [...arr].sort(
      this.orden() === 'monto'
        ? (a, b) => b.totalProfesional - a.totalProfesional
        : (a, b) => a.profesional.localeCompare(b.profesional),
    );
  });

  readonly cardsApsorad = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    let arr = this.apsoradActivas();
    if (q) {
      arr = arr.filter((l) =>
        `${l.servicio === 'ECOGRAFIA' ? 'ecografias' : 'rayos'} ${l.sede}`.toLowerCase().includes(q),
      );
    }
    return [...arr].sort(
      this.orden() === 'monto'
        ? (a, b) => b.totalCesain - a.totalCesain
        : (a, b) => a.sede.localeCompare(b.sede),
    );
  });

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
