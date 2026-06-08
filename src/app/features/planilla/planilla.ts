import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LiquidacionService, nuevoItemId } from '../../core/services/liquidacion.service';
import { PrestacionService } from '../../core/services/prestacion.service';
import { ItemLiquidacion, Liquidacion, Prevision, nombrePeriodo } from '../../core/models/liquidacion.model';
import { CATEGORIAS, Prestacion } from '../../core/models/prestacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { Icon } from '../../shared/icon/icon';

interface FilaPlanilla {
  servicio: string;
  prevision: Prevision;
  valorUnitario: number;
  copagoUnit: number;
  celdas: Record<string, number>; // fecha ISO -> cantidad
}

interface Semana {
  dias: string[];
  inicio: string;
  fin: string;
  label: string;
}

const PREVISIONES: Prevision[] = ['FONASA', 'ISAPRE', 'PARTICULAR'];
const DOW = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

@Component({
  selector: 'app-planilla',
  imports: [ClpPipe, RouterLink, SlicePipe, Icon],
  template: `
    @if (base(); as l) {
      <!-- Encabezado: título -->
      <header class="mb-4">
        <a routerLink="/liquidaciones"
           class="group inline-flex items-center gap-1.5 mb-2 rounded-lg border border-gray-200 bg-white
                  px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm
                  hover:text-brand-700 hover:border-brand-200 transition-colors">
          <app-icon name="back" [size]="15"
                    class="transition-transform group-hover:-translate-x-0.5" />
          Volver a Liquidaciones
        </a>
        <h1 class="text-2xl font-bold text-gray-800 leading-tight">{{ l.profesional }}</h1>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span>{{ l.especialidad }}</span>
          <span class="text-gray-300">·</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">
            {{ l.sede }}
          </span>
        </div>
      </header>

      <!-- Barra de herramientas agrupada -->
      <div class="rounded-2xl bg-white border border-gray-200 shadow-sm p-3 mb-4
                  flex flex-wrap items-center gap-x-5 gap-y-3">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-gray-500">Mes</span>
          <select [value]="l.id" (change)="cambiarMes($any($event.target).value)"
                  class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700
                         focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
            @for (m of mesesDoctor(); track m.id) {
              <option [value]="m.id">{{ nombrePeriodo(m.periodo) }}</option>
            }
          </select>
        </label>

        <div class="h-6 w-px bg-gray-200 hidden sm:block"></div>

        <label class="flex items-center gap-2 text-sm">
          <span class="text-gray-500">% Clínica</span>
          <input type="number" min="0" max="100" [value]="porcentaje()"
                 (input)="setPorcentaje($any($event.target).value)"
                 class="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right font-medium
                        focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
        </label>

        <div class="ml-auto flex items-center gap-2">
          <a [routerLink]="['/comprobante', l.id]"
             class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm px-3 py-2 hover:bg-gray-50">
            ⎙ PDF
          </a>
          <button (click)="abrirPicker()"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium px-3 py-2 hover:bg-brand-700">
            <span class="text-base leading-none">+</span> Agregar prestación
          </button>
        </div>
      </div>

      <!-- Navegador de semanas (segmentado) -->
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <span class="text-sm font-semibold text-gray-700">Semana</span>
        <div class="inline-flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1">
          @for (s of semanas(); track $index; let idx = $index) {
            <button (click)="semanaSel.set(idx)"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    [class]="semanaSel() === idx
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'">
              Sem {{ idx + 1 }}
              <span class="opacity-60 hidden sm:inline">· {{ s.label }}</span>
              @if (semanaTieneData(s)) {
                <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
              }
            </button>
          }
        </div>
        <span class="text-xs text-gray-400 ml-auto hidden md:block">
          Editas la semana visible · totales del <b>mes completo</b>
        </span>
      </div>

      <!-- ===== PLANILLA SEMANAL ===== -->
      <div class="overflow-x-auto pb-1">
       <div class="inline-block align-top rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table class="text-sm border-collapse [&_td]:border [&_td]:border-gray-200 [&_th]:border [&_th]:border-brand-500">
          <thead>
            <tr class="bg-brand-600 text-white text-[11px] font-semibold uppercase tracking-wide">
              <th class="px-3 py-2.5 text-left sticky left-0 bg-brand-600 z-10 min-w-[14rem]">Prestación</th>
              <th class="px-3 py-2.5 text-left">Previsión</th>
              <th class="px-3 py-2.5 text-right">Valor</th>
              @for (c of columnasSemana(); track c) {
                <th class="px-2 py-2 text-center whitespace-nowrap"
                    [class.text-brand-300]="!enMes(c)">
                  <div class="leading-tight">
                    <div class="text-[10px] font-normal lowercase opacity-80">{{ diaSemana(c) }}</div>
                    <div>{{ c | slice:8:10 }}</div>
                  </div>
                </th>
              }
              <th class="px-3 py-2.5 text-center bg-brand-700">Total mes</th>
              <th class="px-3 py-2.5 text-right">Total $ mes</th>
              <th class="px-3 py-2.5 text-right">{{ porcentaje() }}% mes</th>
              <th class="px-2 py-2.5 text-center w-14">Acción</th>
            </tr>
          </thead>
          <tbody class="[&_tr:nth-child(even)]:bg-gray-50/50">
            @for (f of calculo().filasCalc; track $index; let i = $index) {
              <tr class="hover:bg-brand-50/40 align-middle">
                <td class="px-1.5 py-1 sticky left-0 bg-white z-10">
                  <input [value]="f.servicio" (input)="setCampo(i, 'servicio', $any($event.target).value)"
                         class="w-56 px-2 py-1.5 bg-transparent text-gray-800 rounded-md outline-none
                                focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                <td class="px-1.5 py-1">
                  <select [value]="f.prevision" (change)="setCampo(i, 'prevision', $any($event.target).value)"
                          class="text-xs px-2 py-1.5 bg-transparent rounded-md outline-none cursor-pointer
                                 focus:bg-white focus:ring-2 focus:ring-brand-200">
                    @for (p of previsiones; track p) { <option [value]="p">{{ p }}</option> }
                  </select>
                </td>
                <td class="px-1.5 py-1">
                  <input type="number" [value]="f.valorUnitario"
                         (input)="setNumCampo(i, 'valorUnitario', $any($event.target).value)"
                         class="w-24 px-2 py-1.5 bg-transparent text-right tabular-nums rounded-md outline-none
                                focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                @for (c of columnasSemana(); track c) {
                  <td class="px-1 py-1 text-center" [class.bg-gray-100]="!enMes(c)">
                    @if (enMes(c)) {
                      <input type="number" [value]="f.celdas[c] || ''"
                             (input)="setCelda(i, c, $any($event.target).value)"
                             class="w-12 px-1 py-1.5 bg-transparent text-center tabular-nums rounded-md outline-none
                                    focus:bg-white focus:ring-2 focus:ring-brand-200" />
                    }
                  </td>
                }
                <td class="px-3 py-2 text-center font-semibold tabular-nums bg-brand-50">{{ f.cantidadMes }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ f.montoMes | clp }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-amber-700">{{ f.clinicaMes | clp }}</td>
                <td class="px-2 py-2 text-center">
                  <button (click)="eliminarFila(i)" title="Eliminar prestación"
                          class="h-8 w-8 grid place-items-center rounded-lg text-gray-400
                                 hover:bg-red-50 hover:text-red-600 transition-colors mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/>
                      <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="20" class="px-4 py-8 text-center text-gray-400">
                Sin prestaciones. Usa “+ Agregar prestación”.
              </td></tr>
            }

            <!-- Totales -->
            <tr class="bg-brand-100 font-bold text-[12px] text-brand-900">
              <td class="!border-brand-200 px-3 py-2.5 sticky left-0 bg-brand-100 z-10">TOTAL</td>
              <td class="!border-brand-200"></td>
              <td class="!border-brand-200 text-right pr-3 text-[10px] font-medium text-brand-500">semana →</td>
              @for (c of columnasSemana(); track c) {
                <td class="!border-brand-200 px-2 py-2.5 text-center tabular-nums">{{ calculo().totalColSemana[c] || '' }}</td>
              }
              <td class="!border-brand-200 px-3 py-2.5 text-center tabular-nums bg-brand-200">{{ calculo().totalCantidadMes }}</td>
              <td class="!border-brand-200 px-3 py-2.5 text-right tabular-nums">{{ calculo().totalBrutoMes | clp }}</td>
              <td class="!border-brand-200 px-3 py-2.5 text-right tabular-nums">{{ calculo().totalClinicaMes | clp }}</td>
              <td class="!border-brand-200"></td>
            </tr>
          </tbody>
        </table>
       </div>
      </div>

      <!-- Guardar (debajo, a la derecha de la tabla) -->
      <div class="flex flex-wrap items-center justify-end gap-3 mt-3">
        @if (guardado()) {
          <span class="text-sm text-green-700 mr-auto">✓ Guardado en la nube.</span>
        }
        <button (click)="guardar()" [disabled]="guardando()"
                class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm disabled:opacity-60">
          {{ guardando() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>

      <!-- Totales finales (mes) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 max-w-xl">
        <div class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex justify-between items-center">
          <span class="font-semibold text-gray-700">TOTAL DOCTOR <span class="text-xs text-gray-400">(mes)</span></span>
          <span class="text-xl font-extrabold text-brand-700">{{ calculo().totalProfesionalMes | clp }}</span>
        </div>
        <div class="rounded-2xl bg-amber-50 p-5 shadow-sm border border-amber-100 flex justify-between items-center">
          <span class="font-semibold text-amber-700">TOTAL ARRIENDO <span class="text-xs text-amber-500">(mes)</span></span>
          <span class="text-xl font-extrabold text-amber-700">{{ calculo().totalClinicaMes | clp }}</span>
        </div>
      </div>

      <!-- ===== Selector de prestación (catálogo) ===== -->
      @if (mostrarPicker()) {
        <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrarPicker()">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto"
               (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-gray-800 mb-1">Agregar prestación</h2>
            <p class="text-xs text-gray-500 mb-4">Elige del catálogo (se autocompleta el valor) o crea una nueva.</p>

            <input [value]="pickerBusqueda()" (input)="pickerBusqueda.set($any($event.target).value)"
                   placeholder="Buscar en el catálogo…"
                   class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3
                          focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />

            <div class="border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto mb-5">
              @for (p of catalogo(); track p.id) {
                <button (click)="agregarFilaDesde(p)"
                        class="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-brand-50">
                  <span>
                    <span class="text-sm font-medium text-gray-800">{{ p.nombre }}</span>
                    <span class="text-[11px] text-gray-400 ml-2">{{ p.prevision }} · {{ p.categoria }}</span>
                  </span>
                  <span class="text-sm font-semibold text-brand-700">{{ p.valorBono | clp }}</span>
                </button>
              } @empty {
                <p class="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados en el catálogo.</p>
              }
            </div>

            <div class="rounded-xl bg-gray-50 p-4">
              <p class="text-sm font-semibold text-gray-700 mb-3">Crear nueva prestación</p>
              <div class="grid grid-cols-2 gap-3">
                <input [value]="nuevoNombre()" (input)="nuevoNombre.set($any($event.target).value)"
                       placeholder="Nombre" class="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm
                       focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
                <select [value]="nuevaPrevision()" (change)="nuevaPrevision.set($any($event.target).value)"
                        class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200">
                  @for (p of previsiones; track p) { <option [value]="p">{{ p }}</option> }
                </select>
                <select [value]="nuevaCategoria()" (change)="nuevaCategoria.set($any($event.target).value)"
                        class="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200">
                  @for (c of categorias; track c) { <option [value]="c">{{ c }}</option> }
                </select>
                <label class="text-xs text-gray-500">Valor bono
                  <input type="number" [value]="nuevoValor()" (input)="nuevoValor.set(+$any($event.target).value)"
                         class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-brand-200" />
                </label>
                <label class="text-xs text-gray-500">Copago
                  <input type="number" [value]="nuevoCopago()" (input)="nuevoCopago.set(+$any($event.target).value)"
                         class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-brand-200" />
                </label>
              </div>
              <label class="flex items-center gap-2 mt-3 text-xs text-gray-600">
                <input type="checkbox" [checked]="guardarEnCatalogo()"
                       (change)="guardarEnCatalogo.set($any($event.target).checked)" />
                Guardar también en el catálogo (base de datos)
              </label>
              <button (click)="agregarManual()" [disabled]="!nuevoNombre().trim()"
                      class="mt-3 w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 disabled:opacity-50">
                Agregar a la planilla
              </button>
            </div>

            <button (click)="cerrarPicker()" class="mt-4 text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
        </div>
      }
    } @else if (cargando()) {
      <div class="p-10 text-center text-gray-400">Cargando liquidación…</div>
    } @else {
      <div class="p-10 text-center text-gray-500">
        Liquidación no encontrada. <a routerLink="/liquidaciones" class="text-brand-600 underline">Volver</a>
      </div>
    }
  `,
})
export class Planilla {
  private svc = inject(LiquidacionService);
  private prestacionSvc = inject(PrestacionService);
  private confirm = inject(ConfirmService);
  private router = inject(Router);
  readonly nombrePeriodo = nombrePeriodo;
  readonly previsiones = PREVISIONES;
  readonly categorias = CATEGORIAS;

  /** `id` llega por la URL (component input binding) y reacciona al cambiar de mes. */
  readonly id = input<string>('');
  readonly cargando = this.svc.cargando;
  readonly base = computed(() => this.svc.buscarPorId(this.id()));

  readonly filas = signal<FilaPlanilla[]>([]);
  readonly porcentaje = signal<number>(0);
  readonly guardado = signal(false);
  readonly guardando = signal(false);
  private inicializadoId: string | null = null;

  // Semanas del mes
  readonly semanas = computed<Semana[]>(() => {
    const l = this.base();
    return l ? semanasDeMes(l.periodo) : [];
  });
  readonly semanaSel = signal(0);
  readonly columnasSemana = computed(() => this.semanas()[this.semanaSel()]?.dias ?? []);

  // Meses disponibles para este profesional (para el selector de mes)
  readonly mesesDoctor = computed(() => {
    const l = this.base();
    if (!l) return [];
    return this.svc
      .liquidaciones()
      .filter((x) => x.profesional === l.profesional)
      .map((x) => ({ id: x.id, periodo: x.periodo }))
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
  });

  // Picker de catálogo
  readonly mostrarPicker = signal(false);
  readonly pickerBusqueda = signal('');
  readonly nuevoNombre = signal('');
  readonly nuevaPrevision = signal<Prevision>('PARTICULAR');
  readonly nuevaCategoria = signal<string>('Consulta');
  readonly nuevoValor = signal(0);
  readonly nuevoCopago = signal(0);
  readonly guardarEnCatalogo = signal(true);

  readonly catalogo = computed(() => {
    const q = this.pickerBusqueda().toLowerCase().trim();
    return this.prestacionSvc
      .items()
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  constructor() {
    // Inicializa la grilla cuando la liquidación está disponible (carga async de la DB)
    // y cada vez que se cambia de mes (cambia el id/base).
    effect(() => {
      const l = this.base();
      if (l && this.inicializadoId !== l.id) {
        this.inicializadoId = l.id;
        this.initGrid(l);
      }
    });
  }

  private initGrid(l: Liquidacion) {
    this.porcentaje.set(Math.round(l.porcentajeClinica * 100));

    const mapa = new Map<string, FilaPlanilla>();
    for (const it of l.items) {
      const key = `${it.servicio}|${it.prevision}|${it.valorUnitario}`;
      const fila =
        mapa.get(key) ??
        {
          servicio: it.servicio,
          prevision: it.prevision,
          valorUnitario: it.valorUnitario,
          copagoUnit: it.cantidad ? Math.round(it.copago / it.cantidad) : 0,
          celdas: {},
        };
      fila.celdas[it.fecha] = (fila.celdas[it.fecha] ?? 0) + it.cantidad;
      mapa.set(key, fila);
    }
    this.filas.set([...mapa.values()]);

    // Selecciona la primera semana con datos.
    const fechas = new Set(l.items.map((i) => i.fecha));
    const semanas = semanasDeMes(l.periodo);
    const idx = semanas.findIndex((s) => s.dias.some((d) => fechas.has(d)));
    this.semanaSel.set(idx < 0 ? 0 : idx);
  }

  // ───────── Cálculo (totales del MES; columnas de la semana visible) ─────────
  readonly calculo = computed(() => {
    const cols = this.columnasSemana();
    const pct = this.porcentaje() / 100;
    const filasCalc = this.filas().map((f) => {
      const cantidadMes = Object.values(f.celdas).reduce((s, n) => s + (n || 0), 0);
      const montoMes = cantidadMes * f.valorUnitario;
      const clinicaMes = Math.round(montoMes * pct);
      return { ...f, cantidadMes, montoMes, clinicaMes };
    });
    const totalColSemana: Record<string, number> = {};
    for (const c of cols) {
      totalColSemana[c] = this.filas().reduce((s, f) => s + (f.celdas[c] || 0), 0);
    }
    const totalBrutoMes = filasCalc.reduce((s, f) => s + f.montoMes, 0);
    const totalClinicaMes = filasCalc.reduce((s, f) => s + f.clinicaMes, 0);
    return {
      filasCalc,
      totalColSemana,
      totalCantidadMes: filasCalc.reduce((s, f) => s + f.cantidadMes, 0),
      totalBrutoMes,
      totalClinicaMes,
      totalProfesionalMes: totalBrutoMes - totalClinicaMes,
    };
  });

  // ───────── Edición ─────────
  private bump() { this.filas.set([...this.filas()]); }

  setCelda(i: number, col: string, val: string) {
    this.filas()[i].celdas[col] = Math.max(0, Math.floor(+val || 0));
    this.bump();
  }
  setNumCampo(i: number, campo: 'valorUnitario', val: string) {
    this.filas()[i][campo] = Math.max(0, +val || 0);
    this.bump();
  }
  setCampo(i: number, campo: 'servicio' | 'prevision', val: string) {
    (this.filas()[i] as any)[campo] = val;
    this.bump();
  }
  setPorcentaje(val: string) {
    this.porcentaje.set(Math.min(100, Math.max(0, +val || 0)));
  }

  cambiarMes(id: string) {
    if (id !== this.id()) this.router.navigate(['/planilla', id]);
  }

  // ───────── Picker ─────────
  abrirPicker() { this.pickerBusqueda.set(''); this.mostrarPicker.set(true); }
  cerrarPicker() { this.mostrarPicker.set(false); }

  agregarFilaDesde(p: Prestacion) {
    this.filas.update((fs) => [
      ...fs,
      { servicio: p.nombre, prevision: p.prevision, valorUnitario: p.valorBono, copagoUnit: p.valorCopago, celdas: {} },
    ]);
    this.cerrarPicker();
  }

  async agregarManual() {
    const nombre = this.nuevoNombre().trim();
    if (!nombre) return;
    const prevision = this.nuevaPrevision();
    const valor = Math.max(0, this.nuevoValor());
    const copago = Math.max(0, this.nuevoCopago());

    this.filas.update((fs) => [
      ...fs,
      { servicio: nombre, prevision, valorUnitario: valor, copagoUnit: copago, celdas: {} },
    ]);

    if (this.guardarEnCatalogo()) {
      await this.prestacionSvc.crear({
        id: `p-${crypto.randomUUID().slice(0, 8)}`,
        codigo: '', nombre, prevision, categoria: this.nuevaCategoria(),
        valorBono: valor, valorCopago: copago, activo: true,
      });
    }
    this.nuevoNombre.set(''); this.nuevoValor.set(0); this.nuevoCopago.set(0);
    this.cerrarPicker();
  }

  async eliminarFila(i: number) {
    const nombre = this.filas()[i]?.servicio || 'esta prestación';
    const ok = await this.confirm.ask({
      titulo: 'Eliminar prestación',
      mensaje: `¿Quitar "${nombre}" de la planilla?`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (ok) this.filas.update((fs) => fs.filter((_, idx) => idx !== i));
  }

  // ───────── Persistencia ─────────
  async guardar() {
    const l = this.base();
    if (!l) return;
    const items: ItemLiquidacion[] = [];
    for (const f of this.filas()) {
      for (const [fecha, cant] of Object.entries(f.celdas)) {
        if (!cant || cant <= 0) continue;
        items.push({
          id: nuevoItemId(l.id),
          fecha,
          servicio: f.servicio,
          prevision: f.prevision,
          cantidad: cant,
          valorUnitario: f.valorUnitario,
          montoBruto: f.valorUnitario * cant,
          copago: f.copagoUnit * cant,
        });
      }
    }
    this.guardando.set(true);
    try {
      await this.svc.guardarLiquidacion({ ...l, porcentajeClinica: this.porcentaje() / 100, items });
      this.guardado.set(true);
      setTimeout(() => this.guardado.set(false), 2500);
    } finally {
      this.guardando.set(false);
    }
  }

  // ───────── Helpers de fecha ─────────
  enMes(iso: string): boolean {
    return iso.slice(0, 7) === (this.base()?.periodo ?? '');
  }
  diaSemana(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
    return DOW[dow];
  }
  semanaTieneData(s: Semana): boolean {
    return this.filas().some((f) => s.dias.some((d) => (f.celdas[d] || 0) > 0));
  }
}

// ───────────────────────── Helpers de semanas ─────────────────────────
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function semanasDeMes(periodo: string): Semana[] {
  const [y, m] = periodo.split('-').map(Number);
  const ultimo = new Date(y, m, 0);
  const cursor = new Date(y, m - 1, 1);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // retrocede al lunes
  const semanas: Semana[] = [];
  while (cursor <= ultimo) {
    const dias: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      dias.push(isoLocal(d));
    }
    semanas.push({
      dias,
      inicio: dias[0],
      fin: dias[6],
      label: `${dias[0].slice(8, 10)}/${dias[0].slice(5, 7)}–${dias[6].slice(8, 10)}/${dias[6].slice(5, 7)}`,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return semanas;
}
