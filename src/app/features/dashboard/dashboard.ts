import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { ApsoradService } from '../../core/services/apsorad.service';
import { DentistaService } from '../../core/services/dentista.service';
import { AuthService } from '../../core/services/auth.service';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { Donut, DonutSegmento } from '../../shared/charts/donut';
import { Spinner } from '../../shared/spinner/spinner';

/** Paleta para los segmentos de sede (se repite si hay muchas). */
const PALETA_SEDE = ['#0ea5e9', '#673ab7', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

@Component({
  selector: 'app-dashboard',
  imports: [ClpPipe, Donut, RouterLink, Spinner],
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

      <!-- Distribución por previsión (gráfico circular) -->
      <div class="md:col-span-2 rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <p class="text-sm font-semibold text-gray-700 mb-3">Ingresos por previsión</p>
        <app-donut [segmentos]="segmentosPrevision()" etiquetaCentro="Bruto" />
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
          <p class="text-xs text-gray-500">Percibido total</p>
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
        <div class="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <!-- Gráfico circular: cómo se reparte lo percibido -->
          <app-donut [segmentos]="segmentosApsorad()" etiquetaCentro="Percibido" />

          <!-- Desglose por servicio (Ecografías / Rayos) -->
          <div class="space-y-3">
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

    <!-- ===== DENTISTAS ===== -->
    <section class="mt-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <p class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-brand-500"></span>
            DENTAL · Odontología
          </p>
          <p class="text-xs text-gray-400">Liquidaciones odontológicas (arancel · convenio · descuento)</p>
        </div>
        <a routerLink="/dentistas" class="text-xs text-brand-600 hover:underline">Ver módulo →</a>
      </div>

      <!-- Resumen del catálogo (siempre disponible) -->
      <div class="flex flex-wrap gap-2 mb-4">
        <span class="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 font-medium">{{ dentista.dentistasActivos().length }} dentistas</span>
        <span class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{{ dentista.prestaciones().length }} prestaciones</span>
        <span class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{{ dentista.conveniosActivos().length }} convenios</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-xl bg-gray-50 p-4">
          <p class="text-xs text-gray-500">Bruto total</p>
          <p class="text-2xl font-extrabold text-gray-800 mt-1">{{ dentistaResumen().bruto | clp }}</p>
        </div>
        <div class="rounded-xl bg-amber-50 p-4">
          <p class="text-xs text-amber-600">Arriendo clínica</p>
          <p class="text-2xl font-extrabold text-amber-700 mt-1">{{ dentistaResumen().clinica | clp }}</p>
        </div>
        <div class="rounded-xl bg-brand-50 p-4">
          <p class="text-xs text-brand-600">Reciben dentistas</p>
          <p class="text-2xl font-extrabold text-brand-700 mt-1">{{ dentistaResumen().dentista | clp }}</p>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        @if (dentista.cargando()) { <app-spinner label="Cargando…" /> }
        @else { {{ dentistaResumen().n }} liquidaciones · {{ dentistaResumen().cantidad }} atenciones }
      </p>
    </section>

    <!-- ===== GRÁFICOS ===== -->
    <section class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Ingresos por especialidad (gráfico de columnas) -->
      <div class="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-semibold text-gray-700">Ingresos por especialidad</p>
          <span class="text-xs text-gray-400">monto bruto</span>
        </div>
        @if (ingresosPorEspecialidad().length) {
          <div class="flex items-stretch gap-2 h-64 overflow-x-auto pb-1">
            @for (e of ingresosPorEspecialidad(); track e.especialidad) {
              <div class="flex flex-col items-center gap-1 flex-1 min-w-[52px] h-full group">
                <span class="text-[10px] font-bold text-gray-700 tabular-nums whitespace-nowrap">{{ montoCompacto(e.valor) }}</span>
                <div class="flex-1 w-full flex items-end min-h-0">
                  <div class="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400
                              group-hover:from-brand-700 group-hover:to-brand-500 transition-all"
                       [style.height.%]="e.porcentaje" [style.min-height.px]="6"
                       [title]="e.especialidad + ': ' + (e.valor | clp)"></div>
                </div>
                <span class="text-[10px] text-gray-500 text-center leading-tight w-full line-clamp-2" [title]="e.especialidad">{{ e.especialidad }}</span>
                <span class="text-[9px] text-gray-400">{{ e.pacientes }} pac.</span>
              </div>
            }
          </div>
        } @else {
          <p class="text-sm text-gray-400 text-center py-6">Sin datos para el filtro actual.</p>
        }
      </div>

      <!-- Ingresos por sede (gráfico circular) -->
      <div class="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-semibold text-gray-700">Ingresos por sede</p>
          <span class="text-xs text-gray-400">monto bruto</span>
        </div>
        <app-donut [segmentos]="segmentosSede()" etiquetaCentro="Bruto" />
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
                  <span class="text-gray-400">Percibido</span>
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

              <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div class="rounded-lg bg-gray-50 px-3 py-2">
                  <span class="text-gray-400">Total</span>
                  <p class="text-base font-semibold text-gray-700">{{ l.totalBruto | clp }}</p>
                </div>
                <div class="rounded-lg bg-amber-50 px-3 py-2">
                  <span class="text-amber-600">Clínica {{ (l.porcentajeClinica * 100) }}%</span>
                  <p class="text-base font-semibold text-amber-700">{{ l.totalClinica | clp }}</p>
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
  readonly dentista = inject(DentistaService);
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

  /** Períodos disponibles en CESAIN, APSORAD o Dentistas (unión, descendente). */
  readonly periodosCombinados = computed(() => {
    const set = new Set<string>([
      ...this.svc.periodos(),
      ...this.apsorad.activas().map((l) => l.periodo),
      ...this.dentista.activas().map((l) => l.periodo),
    ]);
    return [...set].sort().reverse();
  });

  // ───────── Dentistas ─────────
  /** Liquidaciones dentista del período filtrado. */
  readonly dentistaActivas = computed(() => {
    const per = this.filtroPeriodo();
    return this.dentista.activas().filter((l) => per === 'TODOS' || l.periodo === per);
  });
  readonly dentistaResumen = computed(() => {
    const d = this.dentistaActivas();
    return {
      bruto: d.reduce((s, l) => s + l.totalBruto, 0),
      clinica: d.reduce((s, l) => s + l.totalClinica, 0),
      dentista: d.reduce((s, l) => s + l.totalDentista, 0),
      cantidad: d.reduce((s, l) => s + l.totalCantidad, 0),
      n: d.length,
    };
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

  // ───────── Segmentos para gráficos circulares (donut) ─────────
  readonly segmentosPrevision = computed<DonutSegmento[]>(() =>
    this.ingresosPorPrevision().map((p) => ({
      label: p.prevision,
      valor: p.valor,
      color: p.prevision === 'FONASA' ? '#673ab7' : p.prevision === 'ISAPRE' ? '#0ea5e9' : '#f59e0b',
    })),
  );

  readonly segmentosSede = computed<DonutSegmento[]>(() =>
    this.ingresosPorSede().map((s, i) => ({
      label: s.sede,
      valor: s.valor,
      color: PALETA_SEDE[i % PALETA_SEDE.length],
    })),
  );

  readonly segmentosApsorad = computed<DonutSegmento[]>(() => {
    const r = this.apsoradResumen();
    return [
      { label: 'Pago APSORAD', valor: r.apsorad, color: '#673ab7' },
      { label: 'Margen CESAIN', valor: r.cesain, color: '#10b981' },
    ];
  });

  /** Monto abreviado para las etiquetas de columnas: 25.626.350 -> "$25,6M". */
  montoCompacto(n: number): string {
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
    if (n >= 1_000) return '$' + Math.round(n / 1_000) + 'K';
    return '$' + n;
  }

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

}
