import { Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApsoradService } from '../../core/services/apsorad.service';
import { ItemApsorad, PrestacionApsorad, PrevisionApsorad, RegistroApsorad } from '../../core/models/apsorad.model';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { Semana, diaSemana, enMes, semanasDeMes } from '../../core/util/semanas';
import { PuedeSalir } from '../../core/guards/unsaved.guard';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';

interface FilaA {
  id: string;
  nombre: string;
  prevision: PrevisionApsorad;
  valorFonasa: number;
  valorCobrado: number;
  porcentaje: number; // entero (40)
  celdas: Record<string, number>;
}

@Component({
  selector: 'app-apsorad-planilla',
  imports: [ClpPipe, RouterLink, SlicePipe],
  template: `
    @if (base(); as l) {
      <header class="mb-4">
        <a routerLink="/apsorad" class="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline mb-1">← APSORAD</a>
        <h1 class="text-2xl font-bold text-gray-800">{{ l.servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos' }} · {{ l.sede }}</h1>
        <p class="text-sm text-gray-500">{{ nombrePeriodo(l.periodo) }} · pago a APSORAD = % del valor Fonasa</p>
      </header>

      <div class="rounded-2xl bg-white border border-gray-200 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-gray-500">% APSORAD (def.)</span>
          <input type="number" min="0" max="100" [value]="porcentaje()" (input)="setPorcentaje($any($event.target).value)"
                 class="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-brand-200 outline-none" />
        </label>
        <div class="ml-auto flex items-center gap-2">
          <button (click)="abrirHistorial()" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm px-3 py-2 hover:bg-gray-50">🕘 Historial</button>
          <button (click)="abrirPicker()" class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium px-3 py-2 hover:bg-brand-700">+ Agregar prestación</button>
        </div>
      </div>

      <!-- Navegador de semanas -->
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <span class="text-sm font-semibold text-gray-700">Semana</span>
        <div class="inline-flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1">
          @for (s of semanas(); track $index; let idx = $index) {
            <button (click)="semanaSel.set(idx)"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    [class]="semanaSel() === idx ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'">
              Sem {{ idx + 1 }} <span class="opacity-60 hidden sm:inline">· {{ s.label }}</span>
              @if (semanasModificadas().has(idx)) { <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> }
              @else if (semanaTieneData(s)) { <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span> }
            </button>
          }
        </div>
        <span class="text-xs text-gray-400 ml-auto hidden md:block">Editas la semana visible · totales del <b>mes</b></span>
      </div>

      <div class="overflow-x-auto pb-1">
       <div class="min-w-full inline-block align-top rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table class="w-full min-w-[1200px] text-sm border-collapse [&_td]:border [&_td]:border-gray-200 [&_th]:border [&_th]:border-brand-500">
          <thead>
            <tr class="bg-brand-600 text-white text-[11px] font-semibold uppercase tracking-wide">
              <th class="px-3 py-2.5 text-left sticky left-0 bg-brand-600 z-10 min-w-[15rem]">Prestación</th>
              <th class="px-2 py-2.5 text-left">Previsión</th>
              <th class="px-2 py-2.5 text-right">V. Fonasa</th>
              <th class="px-2 py-2.5 text-right">V. Cobrado</th>
              <th class="px-2 py-2.5 text-center w-16">%</th>
              @for (c of columnasSemana(); track $index) {
                <th class="w-12 px-1 py-2 text-center" [class.text-brand-300]="!esMes(c)">
                  <div class="text-[10px] font-normal lowercase opacity-80">{{ diaSemana(c) }}</div>
                  <div>{{ c | slice:8:10 }}</div>
                </th>
              }
              <th class="px-2 py-2.5 text-center bg-brand-700">Cant.</th>
              <th class="px-2 py-2.5 text-right">Total $</th>
              <th class="px-2 py-2.5 text-right bg-brand-700">APSORAD</th>
              <th class="px-2 py-2.5 text-right">CESAIN</th>
              <th class="px-2 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody class="[&_tr:nth-child(even)]:bg-gray-50/50">
            @for (f of calculo().filas; track $index; let i = $index) {
              <tr class="hover:bg-brand-50/40 align-middle">
                <td class="px-3 py-2 text-gray-800 sticky left-0 bg-white z-10">{{ f.nombre }}</td>
                <td class="px-1 py-1">
                  <select [value]="f.prevision" (change)="setPrevision(i, $any($event.target).value)"
                          class="text-xs px-1 py-1.5 bg-transparent rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200">
                    <option value="FONASA">FONASA</option><option value="PARTICULAR">PARTICULAR</option>
                  </select>
                </td>
                <td class="px-1 py-1"><input type="number" min="0" [value]="f.valorFonasa" (input)="setNum(i,'valorFonasa',$any($event.target).value)"
                  [class.bg-green-100]="celdaModificada(i+'|valorFonasa')" [class.bg-transparent]="!celdaModificada(i+'|valorFonasa')"
                  class="w-20 px-1 py-1.5 text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" /></td>
                <td class="px-1 py-1"><input type="number" min="0" [value]="f.valorCobrado" (input)="setNum(i,'valorCobrado',$any($event.target).value)"
                  [class.bg-green-100]="celdaModificada(i+'|valorCobrado')" [class.bg-transparent]="!celdaModificada(i+'|valorCobrado')"
                  class="w-20 px-1 py-1.5 text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" /></td>
                <td class="px-1 py-1 text-center"><input type="number" min="0" max="100" [value]="f.porcentaje" (input)="setPorc(i,$any($event.target).value)"
                  [class.bg-green-100]="celdaModificada(i+'|porc')" [class.bg-transparent]="!celdaModificada(i+'|porc')"
                  class="w-12 px-1 py-1.5 text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" /></td>
                @for (c of columnasSemana(); track $index) {
                  <td class="px-0.5 py-0.5 text-center" [class.bg-gray-200]="!esMes(c)">
                    @if (esMes(c)) {
                      <input type="number" min="0" [value]="f.celdas[c] || ''" (input)="setCelda(i,c,$any($event.target).value)"
                        [class.bg-green-100]="celdaModificada(i+'|'+c)" [class.bg-transparent]="!celdaModificada(i+'|'+c)"
                        class="w-11 px-1 py-1.5 text-center tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                    }
                  </td>
                }
                <td class="px-2 py-2 text-center font-semibold tabular-nums bg-brand-50">{{ f.cantidadMes }}</td>
                <td class="px-2 py-2 text-right tabular-nums">{{ f.total | clp }}</td>
                <td class="px-2 py-2 text-right tabular-nums bg-brand-50 font-medium text-brand-700">{{ f.apsorad | clp }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-green-700">{{ f.cesain | clp }}</td>
                <td class="px-2 py-2 text-center"><button (click)="eliminarFila(i)" class="text-gray-400 hover:text-red-600" title="Quitar">✕</button></td>
              </tr>
            } @empty {
              <tr><td colspan="30" class="px-4 py-8 text-center text-gray-400">Sin prestaciones. Usa “+ Agregar prestación”.</td></tr>
            }
            <tr class="bg-brand-100 font-bold text-[12px] text-brand-900">
              <td class="!border-brand-200 px-3 py-2.5 sticky left-0 bg-brand-100 z-10">TOTAL</td>
              <td class="!border-brand-200"></td><td class="!border-brand-200"></td><td class="!border-brand-200"></td><td class="!border-brand-200"></td>
              @for (c of columnasSemana(); track $index) {
                <td class="!border-brand-200 px-1 py-2.5 text-center tabular-nums">{{ calculo().totalColSemana[c] || '' }}</td>
              }
              <td class="!border-brand-200 px-2 py-2.5 text-center tabular-nums">{{ calculo().totalCantidad }}</td>
              <td class="!border-brand-200 px-2 py-2.5 text-right tabular-nums">{{ calculo().totalCobrado | clp }}</td>
              <td class="!border-brand-200 px-2 py-2.5 text-right tabular-nums">{{ calculo().totalApsorad | clp }}</td>
              <td class="!border-brand-200 px-2 py-2.5 text-right tabular-nums">{{ calculo().totalCesain | clp }}</td>
              <td class="!border-brand-200"></td>
            </tr>
          </tbody>
        </table>
       </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-3 mt-3">
        @if (hayCambios()) { <span class="text-sm text-amber-600 mr-auto">● Tienes cambios sin guardar</span> }
        <button (click)="guardar()" [disabled]="guardando()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm disabled:opacity-60">
          {{ guardando() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 max-w-3xl">
        <div class="rounded-2xl bg-brand-600 p-5 text-white flex justify-between items-center"><span class="font-semibold">TOTAL COBRADO</span><span class="text-xl font-extrabold">{{ calculo().totalCobrado | clp }}</span></div>
        <div class="rounded-2xl bg-white border border-gray-100 p-5 flex justify-between items-center"><span class="font-semibold text-brand-700">PAGO APSORAD</span><span class="text-xl font-extrabold text-brand-700">{{ calculo().totalApsorad | clp }}</span></div>
        <div class="rounded-2xl bg-green-50 border border-green-100 p-5 flex justify-between items-center"><span class="font-semibold text-green-700">QUEDA CESAIN</span><span class="text-xl font-extrabold text-green-700">{{ calculo().totalCesain | clp }}</span></div>
      </div>

      @if (mostrarHistorial()) {
        <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarHistorial.set(false)">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-gray-800 mb-1">Historial de cambios</h2>
            <p class="text-xs text-gray-500 mb-4">{{ l.servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos' }} · {{ l.sede }} · {{ nombrePeriodo(l.periodo) }}</p>
            @if (cargandoHistorial()) {
              <p class="py-8 text-center text-gray-400">Cargando…</p>
            } @else {
              <ol class="relative border-l border-gray-200 ml-2">
                @for (h of historialItems(); track h.id) {
                  <li class="mb-5 ml-4">
                    <span class="absolute -left-1.5 h-3 w-3 rounded-full bg-brand-500 border-2 border-white"></span>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-sm font-semibold text-gray-800">{{ fechaCL(h.fecha) }}</span>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ h.usuario }}</span>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span>Cobrado: <b class="text-gray-700">{{ h.totalCobrado | clp }}</b></span>
                      <span>APSORAD: <b class="text-brand-700">{{ h.totalApsorad | clp }}</b></span>
                      <span>CESAIN: <b class="text-green-700">{{ h.totalCesain | clp }}</b></span>
                    </div>
                    @if (h.cambios?.length) {
                      <ul class="mt-2 max-h-40 overflow-y-auto rounded-lg bg-gray-50 border border-gray-100 p-2.5 text-xs text-gray-600 space-y-1">
                        @for (c of h.cambios; track $index) { <li class="flex gap-1.5"><span class="text-brand-400 shrink-0">•</span><span>{{ c }}</span></li> }
                      </ul>
                    }
                  </li>
                } @empty { <li class="ml-4 text-sm text-gray-400 py-4">Aún no hay registros. Guarda para empezar a auditar.</li> }
              </ol>
            }
            <button (click)="mostrarHistorial.set(false)" class="mt-4 text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
        </div>
      }

      @if (mostrarPicker()) {
        <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarPicker.set(false)">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-gray-800 mb-1">Agregar prestación</h2>
            <p class="text-xs text-gray-500 mb-3">Del catálogo APSORAD ({{ l.servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos' }}).</p>
            <label class="flex items-center gap-2 text-sm mb-3"><span class="text-gray-600">Previsión:</span>
              <select [value]="pickerPrevision()" (change)="pickerPrevision.set($any($event.target).value)" class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-200">
                <option value="FONASA">FONASA</option><option value="PARTICULAR">PARTICULAR</option>
              </select>
            </label>
            <div class="border border-gray-100 rounded-xl divide-y divide-gray-100">
              @for (p of catalogo(); track p.id) {
                <button (click)="agregarDesde(p)" class="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-brand-50">
                  <span class="text-sm font-medium text-gray-800">{{ p.nombre }}</span>
                  <span class="text-xs text-gray-500">F {{ p.valorFonasa | clp }} · P {{ p.valorParticular | clp }}</span>
                </button>
              } @empty { <p class="px-3 py-4 text-sm text-gray-400 text-center">Sin prestaciones de este servicio en el catálogo.</p> }
            </div>
            <button (click)="mostrarPicker.set(false)" class="mt-4 text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
        </div>
      }
    } @else if (svc.cargando()) {
      <div class="p-10 text-center text-gray-400">Cargando…</div>
    } @else {
      <div class="p-10 text-center text-gray-500">Liquidación no encontrada. <a routerLink="/apsorad" class="text-brand-600 underline">Volver</a></div>
    }
  `,
})
export class ApsoradPlanilla implements PuedeSalir {
  readonly svc = inject(ApsoradService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly nombrePeriodo = nombrePeriodo;
  readonly diaSemana = diaSemana;

  readonly id = input<string>('');
  readonly base = computed(() => this.svc.buscarPorId(this.id()));
  readonly filas = signal<FilaA[]>([]);
  readonly porcentaje = signal(40);
  readonly guardando = signal(false);
  private initId: string | null = null;

  /** Marcas de cambios sin guardar (verde + aviso al salir). */
  readonly celdasModificadas = signal<Set<string>>(new Set());
  readonly semanasModificadas = signal<Set<number>>(new Set());
  readonly hayCambios = computed(() => this.semanasModificadas().size > 0 || this.celdasModificadas().size > 0);

  // Historial
  readonly mostrarHistorial = signal(false);
  readonly historialItems = signal<RegistroApsorad[]>([]);
  readonly cargandoHistorial = signal(false);

  readonly semanas = computed<Semana[]>(() => { const l = this.base(); return l ? semanasDeMes(l.periodo) : []; });
  readonly semanaSel = signal(0);
  readonly columnasSemana = computed(() => this.semanas()[this.semanaSel()]?.dias ?? []);

  readonly mostrarPicker = signal(false);
  readonly pickerPrevision = signal<PrevisionApsorad>('FONASA');
  readonly catalogo = computed(() => {
    const l = this.base();
    return l ? this.svc.prestacionesPorServicio(l.servicio).filter((p) => p.activo) : [];
  });

  constructor() {
    effect(() => {
      const l = this.base();
      if (l && this.initId !== l.id) {
        this.initId = l.id;
        this.porcentaje.set(Math.round(l.porcentaje * 100));
        this.filas.set(l.items.map((it) => ({
          id: it.id,
          nombre: it.nombre,
          prevision: it.prevision,
          valorFonasa: it.valorFonasa,
          valorCobrado: it.valorCobrado,
          porcentaje: Math.round((it.porcentaje ?? l.porcentaje) * 100),
          celdas: it.celdas ? { ...it.celdas } : it.cantidad ? { [`${l.periodo}-01`]: it.cantidad } : {},
        })));
        const fechas = new Set(l.items.flatMap((i) => Object.keys(i.celdas ?? {})));
        const sem = semanasDeMes(l.periodo);
        const idx = sem.findIndex((s) => s.dias.some((d) => fechas.has(d)));
        this.semanaSel.set(idx < 0 ? 0 : idx);
        this.celdasModificadas.set(new Set());
        this.semanasModificadas.set(new Set());
      }
    });
  }

  celdaModificada(clave: string): boolean { return this.celdasModificadas().has(clave); }
  private marcar(clave: string) {
    this.celdasModificadas.update((s) => new Set(s).add(clave));
    this.semanasModificadas.update((s) => new Set(s).add(this.semanaSel()));
  }
  semanaTieneData(s: Semana): boolean {
    return this.filas().some((f) => s.dias.some((d) => (f.celdas[d] || 0) > 0));
  }

  esMes(iso: string): boolean { return enMes(iso, this.base()?.periodo ?? ''); }

  readonly calculo = computed(() => {
    const cols = this.columnasSemana();
    const filas = this.filas().map((f) => {
      const cantidadMes = Object.values(f.celdas).reduce((s, n) => s + (n || 0), 0);
      const total = cantidadMes * f.valorCobrado;
      const apsorad = Math.round(cantidadMes * f.valorFonasa * (f.porcentaje / 100));
      return { ...f, cantidadMes, total, apsorad, cesain: total - apsorad };
    });
    const totalColSemana: Record<string, number> = {};
    for (const c of cols) totalColSemana[c] = this.filas().reduce((s, f) => s + (f.celdas[c] || 0), 0);
    return {
      filas,
      totalColSemana,
      totalCantidad: filas.reduce((s, f) => s + f.cantidadMes, 0),
      totalCobrado: filas.reduce((s, f) => s + f.total, 0),
      totalApsorad: filas.reduce((s, f) => s + f.apsorad, 0),
      totalCesain: filas.reduce((s, f) => s + f.cesain, 0),
    };
  });

  private bump() { this.filas.set([...this.filas()]); }
  setPorcentaje(v: string) {
    const p = Math.min(100, Math.max(0, +v || 0));
    this.porcentaje.set(p);
    this.filas.update((fs) => fs.map((f) => ({ ...f, porcentaje: p })));
    this.marcar('global');
  }
  setPorc(i: number, v: string) { this.filas()[i].porcentaje = Math.min(100, Math.max(0, +v || 0)); this.marcar(i + '|porc'); this.bump(); }
  setNum(i: number, campo: 'valorFonasa' | 'valorCobrado', v: string) { this.filas()[i][campo] = Math.max(0, +v || 0); this.marcar(i + '|' + campo); this.bump(); }
  setCelda(i: number, c: string, v: string) { this.filas()[i].celdas[c] = Math.max(0, Math.floor(+v || 0)); this.marcar(i + '|' + c); this.bump(); }
  setPrevision(i: number, v: PrevisionApsorad) { this.filas()[i].prevision = v; this.marcar(i + '|prev'); this.bump(); }

  abrirPicker() { this.pickerPrevision.set('FONASA'); this.mostrarPicker.set(true); }
  agregarDesde(p: PrestacionApsorad) {
    const prev = this.pickerPrevision();
    this.filas.update((fs) => [...fs, {
      id: `${p.id}_${fs.length}`, nombre: p.nombre, prevision: prev,
      valorFonasa: p.valorFonasa, valorCobrado: prev === 'FONASA' ? p.valorFonasa : p.valorParticular,
      porcentaje: this.porcentaje(), celdas: {},
    }]);
    this.marcar('add');
    this.mostrarPicker.set(false);
  }
  async eliminarFila(i: number) {
    const ok = await this.confirm.ask({ titulo: 'Quitar prestación', mensaje: `¿Quitar "${this.filas()[i]?.nombre}"?`, confirmar: 'Quitar', tono: 'peligro' });
    if (ok) { this.filas.update((fs) => fs.filter((_, idx) => idx !== i)); this.marcar('del'); }
  }

  async guardar() {
    const l = this.base();
    if (!l) return;
    const items: ItemApsorad[] = this.filas().map((f) => {
      const celdas: Record<string, number> = {};
      for (const [fecha, c] of Object.entries(f.celdas)) if (c > 0) celdas[fecha] = c;
      return {
        id: f.id, nombre: f.nombre, prevision: f.prevision,
        valorFonasa: f.valorFonasa, valorCobrado: f.valorCobrado,
        porcentaje: f.porcentaje / 100, celdas,
      };
    });
    const cambios = resumirCambiosApsorad(l.items, items);
    this.guardando.set(true);
    try {
      await this.svc.guardarLiquidacion({ ...l, porcentaje: this.porcentaje() / 100, items });
      this.celdasModificadas.set(new Set());
      this.semanasModificadas.set(new Set());
      const guardada = this.svc.buscarPorId(l.id);
      if (guardada) void this.svc.registrarHistorial(guardada, cambios);
      this.toast.exito('Liquidación APSORAD guardada');
    } catch {
      this.toast.error('No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }

  // ───────── Historial ─────────
  async abrirHistorial() {
    const l = this.base();
    if (!l) return;
    this.mostrarHistorial.set(true);
    this.cargandoHistorial.set(true);
    this.historialItems.set(await this.svc.listarHistorial(l.id));
    this.cargandoHistorial.set(false);
  }
  fechaCL(iso: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Santiago',
    }).format(new Date(iso));
  }

  // ───────── Aviso de cambios sin guardar ─────────
  puedeSalir(): boolean | Promise<boolean> {
    if (!this.hayCambios()) return true;
    return this.confirm.ask({
      titulo: 'Cambios sin guardar',
      mensaje: 'Tienes cambios en esta liquidación APSORAD que no se han guardado. ¿Salir de todas formas?',
      confirmar: 'Salir sin guardar', cancelar: 'Seguir editando', tono: 'peligro',
    });
  }
  @HostListener('window:beforeunload', ['$event'])
  avisarCierre(e: BeforeUnloadEvent) {
    if (this.hayCambios()) { e.preventDefault(); e.returnValue = ''; }
  }
}

/** Resumen de cambios para el historial (cantidad mensual por prestación). */
function resumirCambiosApsorad(antes: ItemApsorad[], despues: ItemApsorad[]): string[] {
  const tot = (it: ItemApsorad) => Object.values(it.celdas ?? {}).reduce((s, n) => s + (n || 0), 0);
  const mapA = new Map(antes.map((i) => [`${i.nombre}|${i.prevision}`, tot(i)]));
  const mapD = new Map(despues.map((i) => [`${i.nombre}|${i.prevision}`, tot(i)]));
  const claves = [...new Set([...mapA.keys(), ...mapD.keys()])].sort();
  const lineas: string[] = [];
  for (const k of claves) {
    const a = mapA.get(k) ?? 0;
    const d = mapD.get(k) ?? 0;
    const [nombre, prev] = k.split('|');
    if (a === d) continue;
    if (!mapA.has(k)) lineas.push(`+ "${nombre}" [${prev}]: ${d}`);
    else if (!mapD.has(k)) lineas.push(`− Se quitó "${nombre}" [${prev}]`);
    else lineas.push(`"${nombre}" [${prev}]: ${a} → ${d}`);
  }
  if (!lineas.length) lineas.push('Se volvió a guardar (sin cambios en cantidades).');
  return lineas;
}
