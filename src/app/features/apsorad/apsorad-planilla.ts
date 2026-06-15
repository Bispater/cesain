import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApsoradService } from '../../core/services/apsorad.service';
import {
  ItemApsorad,
  LiquidacionApsorad,
  PrestacionApsorad,
  PrevisionApsorad,
} from '../../core/models/apsorad.model';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-apsorad-planilla',
  imports: [ClpPipe, RouterLink],
  template: `
    @if (base(); as l) {
      <header class="mb-4">
        <a routerLink="/apsorad" class="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline mb-1">← APSORAD</a>
        <h1 class="text-2xl font-bold text-gray-800">
          {{ l.servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos' }} · {{ l.sede }}
        </h1>
        <p class="text-sm text-gray-500">{{ nombrePeriodo(l.periodo) }} · pago a APSORAD = {{ porcentaje() }}% del valor Fonasa</p>
      </header>

      <div class="rounded-2xl bg-white border border-gray-200 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-gray-500">% APSORAD (del Fonasa)</span>
          <input type="number" min="0" max="100" [value]="porcentaje()" (input)="setPorcentaje($any($event.target).value)"
                 class="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-brand-200 outline-none" />
        </label>
        <div class="ml-auto flex items-center gap-2">
          <button (click)="abrirPicker()" class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium px-3 py-2 hover:bg-brand-700">
            + Agregar prestación
          </button>
        </div>
      </div>

      <div class="overflow-x-auto pb-1">
       <div class="min-w-full inline-block align-top rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table class="w-full min-w-[920px] text-sm border-collapse [&_td]:border [&_td]:border-gray-200 [&_th]:border [&_th]:border-brand-500">
          <thead>
            <tr class="bg-brand-600 text-white text-[11px] font-semibold uppercase tracking-wide">
              <th class="px-3 py-2.5 text-left min-w-[16rem]">Prestación</th>
              <th class="px-3 py-2.5 text-left">Previsión</th>
              <th class="px-3 py-2.5 text-right">Valor Fonasa</th>
              <th class="px-3 py-2.5 text-right">Valor cobrado</th>
              <th class="px-3 py-2.5 text-center">Cant.</th>
              <th class="px-3 py-2.5 text-right">Total $</th>
              <th class="px-3 py-2.5 text-right bg-brand-700">APSORAD</th>
              <th class="px-3 py-2.5 text-right">CESAIN</th>
              <th class="px-2 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody class="[&_tr:nth-child(even)]:bg-gray-50/50">
            @for (f of calculo().filas; track $index; let i = $index) {
              <tr class="hover:bg-brand-50/40 align-middle">
                <td class="px-3 py-2 text-gray-800">{{ f.nombre }}</td>
                <td class="px-2 py-1">
                  <select [value]="f.prevision" (change)="setPrevision(i, $any($event.target).value)"
                          class="text-xs px-2 py-1.5 bg-transparent rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200">
                    <option value="FONASA">FONASA</option>
                    <option value="PARTICULAR">PARTICULAR</option>
                  </select>
                </td>
                <td class="px-2 py-1">
                  <input type="number" min="0" [value]="f.valorFonasa" (input)="setNum(i,'valorFonasa',$any($event.target).value)"
                         class="w-24 px-2 py-1.5 bg-transparent text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                <td class="px-2 py-1">
                  <input type="number" min="0" [value]="f.valorCobrado" (input)="setNum(i,'valorCobrado',$any($event.target).value)"
                         class="w-24 px-2 py-1.5 bg-transparent text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                <td class="px-2 py-1 text-center">
                  <input type="number" min="0" [value]="f.cantidad || ''" (input)="setNum(i,'cantidad',$any($event.target).value)"
                         class="w-16 px-1 py-1.5 bg-transparent text-center tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{{ f.total | clp }}</td>
                <td class="px-3 py-2 text-right tabular-nums bg-brand-50 font-medium text-brand-700">{{ f.apsorad | clp }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-green-700">{{ f.cesain | clp }}</td>
                <td class="px-2 py-2 text-center">
                  <button (click)="eliminarFila(i)" class="text-gray-400 hover:text-red-600" title="Quitar">✕</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="9" class="px-4 py-8 text-center text-gray-400">Sin prestaciones. Usa “+ Agregar prestación”.</td></tr>
            }
            <tr class="bg-brand-100 font-bold text-[12px] text-brand-900">
              <td class="!border-brand-200 px-3 py-2.5">TOTAL</td>
              <td class="!border-brand-200"></td><td class="!border-brand-200"></td><td class="!border-brand-200"></td>
              <td class="!border-brand-200 px-3 py-2.5 text-center tabular-nums">{{ calculo().totalCantidad }}</td>
              <td class="!border-brand-200 px-3 py-2.5 text-right tabular-nums">{{ calculo().totalCobrado | clp }}</td>
              <td class="!border-brand-200 px-3 py-2.5 text-right tabular-nums">{{ calculo().totalApsorad | clp }}</td>
              <td class="!border-brand-200 px-3 py-2.5 text-right tabular-nums">{{ calculo().totalCesain | clp }}</td>
              <td class="!border-brand-200"></td>
            </tr>
          </tbody>
        </table>
       </div>
      </div>

      <div class="flex justify-end mt-3">
        <button (click)="guardar()" [disabled]="guardando()"
                class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 shadow-sm disabled:opacity-60">
          {{ guardando() ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 max-w-3xl">
        <div class="rounded-2xl bg-brand-600 p-5 text-white flex justify-between items-center">
          <span class="font-semibold">TOTAL COBRADO</span><span class="text-xl font-extrabold">{{ calculo().totalCobrado | clp }}</span>
        </div>
        <div class="rounded-2xl bg-white border border-gray-100 p-5 flex justify-between items-center">
          <span class="font-semibold text-brand-700">PAGO APSORAD</span><span class="text-xl font-extrabold text-brand-700">{{ calculo().totalApsorad | clp }}</span>
        </div>
        <div class="rounded-2xl bg-green-50 border border-green-100 p-5 flex justify-between items-center">
          <span class="font-semibold text-green-700">QUEDA CESAIN</span><span class="text-xl font-extrabold text-green-700">{{ calculo().totalCesain | clp }}</span>
        </div>
      </div>

      @if (mostrarPicker()) {
        <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarPicker.set(false)">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-gray-800 mb-1">Agregar prestación</h2>
            <p class="text-xs text-gray-500 mb-3">Del catálogo APSORAD ({{ l.servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos' }}).</p>
            <label class="flex items-center gap-2 text-sm mb-3">
              <span class="text-gray-600">Previsión:</span>
              <select [value]="pickerPrevision()" (change)="pickerPrevision.set($any($event.target).value)"
                      class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-200">
                <option value="FONASA">FONASA</option><option value="PARTICULAR">PARTICULAR</option>
              </select>
            </label>
            <div class="border border-gray-100 rounded-xl divide-y divide-gray-100">
              @for (p of catalogo(); track p.id) {
                <button (click)="agregarDesde(p)" class="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-brand-50">
                  <span class="text-sm font-medium text-gray-800">{{ p.nombre }}</span>
                  <span class="text-xs text-gray-500">F {{ p.valorFonasa | clp }} · P {{ p.valorParticular | clp }}</span>
                </button>
              } @empty { <p class="px-3 py-4 text-sm text-gray-400 text-center">Sin prestaciones en el catálogo de este servicio.</p> }
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
export class ApsoradPlanilla {
  readonly svc = inject(ApsoradService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly nombrePeriodo = nombrePeriodo;

  readonly id = input<string>('');
  readonly base = computed(() => this.svc.buscarPorId(this.id()));
  readonly filas = signal<ItemApsorad[]>([]);
  readonly porcentaje = signal(40);
  readonly guardando = signal(false);
  private initId: string | null = null;

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
        this.filas.set(l.items.map((i) => ({ ...i })));
      }
    });
  }

  readonly calculo = computed(() => {
    const pct = this.porcentaje() / 100;
    const filas = this.filas().map((f) => {
      const total = f.cantidad * f.valorCobrado;
      const apsorad = Math.round(f.cantidad * f.valorFonasa * pct);
      return { ...f, total, apsorad, cesain: total - apsorad };
    });
    return {
      filas,
      totalCantidad: filas.reduce((s, f) => s + f.cantidad, 0),
      totalCobrado: filas.reduce((s, f) => s + f.total, 0),
      totalApsorad: filas.reduce((s, f) => s + f.apsorad, 0),
      totalCesain: filas.reduce((s, f) => s + f.cesain, 0),
    };
  });

  private bump() { this.filas.set([...this.filas()]); }
  setPorcentaje(v: string) { this.porcentaje.set(Math.min(100, Math.max(0, +v || 0))); }
  setNum(i: number, campo: 'valorFonasa' | 'valorCobrado' | 'cantidad', v: string) {
    this.filas()[i][campo] = Math.max(0, +v || 0);
    this.bump();
  }
  setPrevision(i: number, v: PrevisionApsorad) { this.filas()[i].prevision = v; this.bump(); }

  abrirPicker() { this.pickerPrevision.set('FONASA'); this.mostrarPicker.set(true); }
  agregarDesde(p: PrestacionApsorad) {
    const prev = this.pickerPrevision();
    this.filas.update((fs) => [
      ...fs,
      {
        id: `${p.id}_${fs.length}`,
        nombre: p.nombre,
        prevision: prev,
        valorFonasa: p.valorFonasa,
        valorCobrado: prev === 'FONASA' ? p.valorFonasa : p.valorParticular,
        cantidad: 0,
      },
    ]);
    this.mostrarPicker.set(false);
  }
  async eliminarFila(i: number) {
    const ok = await this.confirm.ask({ titulo: 'Quitar prestación', mensaje: `¿Quitar "${this.filas()[i]?.nombre}"?`, confirmar: 'Quitar', tono: 'peligro' });
    if (ok) this.filas.update((fs) => fs.filter((_, idx) => idx !== i));
  }

  async guardar() {
    const l = this.base();
    if (!l) return;
    this.guardando.set(true);
    try {
      await this.svc.guardarLiquidacion({ ...l, porcentaje: this.porcentaje() / 100, items: this.filas() });
      this.toast.exito('Liquidación APSORAD guardada');
    } catch {
      this.toast.error('No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
}
