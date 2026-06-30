import { Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DentistaService } from '../../core/services/dentista.service';
import {
  ItemDentista, PrestacionDentista, RegistroDentista, valorDentista,
} from '../../core/models/dentista.model';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { Semana, diaSemana, enMes, semanasDeMes } from '../../core/util/semanas';
import { PuedeSalir } from '../../core/guards/unsaved.guard';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { MonedaInput } from '../../shared/directives/moneda-input';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Icon } from '../../shared/icon/icon';

interface FilaD {
  id: string;
  nombre: string;
  codigo?: string;
  arancel: number;
  convenioId: string;
  descuento: number; // entero %
  porcentaje: number; // entero % clínica
  celdas: Record<string, number>;
}

@Component({
  selector: 'app-dentistas-planilla',
  imports: [ClpPipe, MonedaInput, FormsModule, RouterLink, SlicePipe, Icon],
  template: `
    @if (base(); as l) {
      <header class="mb-4">
        <a routerLink="/dentistas"
           class="group inline-flex items-center gap-1.5 mb-2 rounded-lg border border-gray-200 bg-white
                  px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:text-brand-700 hover:border-brand-200 transition-colors">
          <app-icon name="back" [size]="15" class="transition-transform group-hover:-translate-x-0.5" />
          Volver a DENTAL
        </a>
        <h1 class="text-2xl font-bold text-gray-800 leading-tight">{{ l.dentista }}</h1>
        <div class="flex items-center gap-2 mt-1 text-sm text-gray-500">
          @if (l.especialidad) { <span>{{ l.especialidad }}</span><span class="text-gray-300">·</span> }
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium">{{ l.sede }}</span>
          <span class="text-gray-300">·</span><span>{{ nombrePeriodo(l.periodo) }}</span>
        </div>
      </header>

      <div class="rounded-2xl bg-white border border-gray-200 shadow-sm p-3 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-gray-500">% Clínica (def.)</span>
          <input type="number" min="0" max="100" [value]="porcentaje()" (input)="setPorcentaje($any($event.target).value)"
                 class="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-brand-200 outline-none" />
        </label>
        <div class="ml-auto flex items-center gap-2">
          <a [routerLink]="['/dentistas/comprobante', l.id]" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm px-3 py-2 hover:bg-gray-50">⎙ PDF</a>
          <button (click)="abrirHistorial()" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm px-3 py-2 hover:bg-gray-50">🕘 Historial</button>
          <button (click)="abrirPicker()" class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium px-3 py-2 hover:bg-brand-700">+ Agregar prestación</button>
        </div>
      </div>

      <!-- Navegador de semanas -->
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <span class="text-sm font-semibold text-gray-700">Semana</span>
        <div class="inline-flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1">
          @for (s of semanas(); track $index; let idx = $index) {
            <button (click)="semanaSel.set(idx)" class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
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
              <th class="px-3 py-2.5 text-left sticky left-0 bg-brand-600 z-10 min-w-[14rem]">Prestación</th>
              <th class="px-2 py-2.5 text-right">Arancel</th>
              <th class="px-2 py-2.5 text-left">Convenio</th>
              <th class="px-2 py-2.5 text-center w-20">Desc. %</th>
              <th class="px-2 py-2.5 text-right">Valor</th>
              <th class="px-2 py-2.5 text-center w-16">% Clín.</th>
              @for (c of columnasSemana(); track $index) {
                <th class="w-12 px-1 py-2 text-center" [class.text-brand-300]="!esMes(c)">
                  <div class="text-[10px] font-normal lowercase opacity-80">{{ diaSemana(c) }}</div>
                  <div>{{ c | slice:8:10 }}</div>
                </th>
              }
              <th class="px-2 py-2.5 text-center bg-brand-700">Total mes</th>
              <th class="px-2 py-2.5 text-right">Total $ mes</th>
              <th class="px-2 py-2.5 text-right">Arriendo mes</th>
              <th class="px-2 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody class="[&_tr:nth-child(even)]:bg-gray-50/50">
            @for (f of calculo().filas; track $index; let i = $index) {
              <tr class="hover:bg-brand-50/40 align-middle">
                <td class="px-1.5 py-1 sticky left-0 bg-white z-10">
                  <input [value]="f.nombre" (input)="setNombre(i, $any($event.target).value)"
                         [class.bg-green-100]="celdaModificada(i+'|nombre')" [class.bg-transparent]="!celdaModificada(i+'|nombre')"
                         class="w-52 px-2 py-1.5 text-gray-800 rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                <td class="px-1 py-1">
                  <input appMoneda type="text" inputmode="numeric" [ngModel]="f.arancel" (ngModelChange)="setArancel(i,$event)"
                         [class.bg-green-100]="celdaModificada(i+'|arancel')" [class.bg-transparent]="!celdaModificada(i+'|arancel')"
                         class="w-24 px-1 py-1.5 text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                <td class="px-1 py-1">
                  <select [value]="f.convenioId" (change)="setConvenio(i, $any($event.target).value)"
                          [class.bg-green-100]="celdaModificada(i+'|conv')" [class.bg-transparent]="!celdaModificada(i+'|conv')"
                          class="text-xs px-1 py-1.5 rounded-md outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-brand-200 max-w-[8rem]">
                    <option value="">Sin convenio</option>
                    @for (c of svc.conveniosActivos(); track c.id) { <option [value]="c.id">{{ c.nombre }} ({{ c.descuento }}%)</option> }
                  </select>
                </td>
                <td class="px-1 py-1 text-center">
                  <input type="number" min="0" max="100" [value]="f.descuento" (input)="setDescuento(i,$any($event.target).value)"
                         [class.bg-green-100]="celdaModificada(i+'|desc')" [class.bg-transparent]="!celdaModificada(i+'|desc')"
                         class="w-14 px-1 py-1.5 text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
                <td class="px-2 py-2 text-right tabular-nums font-medium text-gray-800 bg-gray-50">{{ f.valor | clp }}</td>
                <td class="px-1 py-1 text-center">
                  <input type="number" min="0" max="100" [value]="f.porcentaje" (input)="setPorc(i,$any($event.target).value)"
                         [class.bg-green-100]="celdaModificada(i+'|porc')" [class.bg-transparent]="!celdaModificada(i+'|porc')"
                         class="w-12 px-1 py-1.5 text-right tabular-nums rounded-md outline-none focus:bg-white focus:ring-2 focus:ring-brand-200" />
                </td>
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
                <td class="px-2 py-2 text-right tabular-nums">{{ f.bruto | clp }}</td>
                <td class="px-2 py-2 text-right tabular-nums text-amber-700">{{ f.clinica | clp }}</td>
                <td class="px-2 py-2 text-center">
                  <button (click)="eliminarFila(i)" title="Quitar prestación"
                          class="h-8 w-8 grid place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors mx-auto">
                    <app-icon name="trash" [size]="16" />
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="30" class="px-4 py-8 text-center text-gray-400">Sin prestaciones. Usa “+ Agregar prestación”.</td></tr>
            }
            <tr class="bg-brand-100 font-bold text-[12px] text-brand-900">
              <td class="!border-brand-200 px-3 py-2.5 sticky left-0 bg-brand-100 z-10">TOTAL</td>
              <td class="!border-brand-200"></td><td class="!border-brand-200"></td><td class="!border-brand-200"></td><td class="!border-brand-200"></td><td class="!border-brand-200"></td>
              @for (c of columnasSemana(); track $index) {
                <td class="!border-brand-200 px-1 py-2.5 text-center tabular-nums">{{ calculo().totalColSemana[c] || '' }}</td>
              }
              <td class="!border-brand-200 px-2 py-2.5 text-center tabular-nums">{{ calculo().totalCantidad }}</td>
              <td class="!border-brand-200 px-2 py-2.5 text-right tabular-nums">{{ calculo().totalBruto | clp }}</td>
              <td class="!border-brand-200 px-2 py-2.5 text-right tabular-nums">{{ calculo().totalClinica | clp }}</td>
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
        <div class="rounded-2xl bg-brand-600 p-5 shadow-sm text-white">
          <p class="text-xs font-semibold uppercase tracking-wide text-brand-200 whitespace-nowrap">Total mes (bruto)</p>
          <p class="text-2xl font-extrabold mt-1 tabular-nums">{{ calculo().totalBruto | clp }}</p>
        </div>
        <div class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">Total dentista (mes)</p>
          <p class="text-2xl font-extrabold mt-1 tabular-nums text-brand-700">{{ calculo().totalDentista | clp }}</p>
        </div>
        <div class="rounded-2xl bg-amber-50 p-5 shadow-sm border border-amber-100">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-600 whitespace-nowrap">Total arriendo (mes)</p>
          <p class="text-2xl font-extrabold mt-1 tabular-nums text-amber-700">{{ calculo().totalClinica | clp }}</p>
        </div>
      </div>

      @if (mostrarHistorial()) {
        <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarHistorial.set(false)">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-gray-800 mb-1">Historial de cambios</h2>
            <p class="text-xs text-gray-500 mb-4">{{ l.dentista }} · {{ l.sede }} · {{ nombrePeriodo(l.periodo) }}</p>
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
                      <span>Bruto: <b class="text-gray-700">{{ h.totalBruto | clp }}</b></span>
                      <span>Dentista: <b class="text-brand-700">{{ h.totalDentista | clp }}</b></span>
                      <span>Arriendo: <b class="text-amber-700">{{ h.totalClinica | clp }}</b></span>
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
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[88vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-gray-800 mb-1">Agregar prestación</h2>
            <p class="text-xs text-gray-500 mb-3">Del catálogo de {{ l.dentista }} (se autocompleta el arancel) o crea una nueva.</p>
            <input [value]="pickerBusqueda()" (input)="pickerBusqueda.set($any($event.target).value)" placeholder="Buscar por nombre o código…"
                   class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-brand-200" />
            <div class="border border-gray-100 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto mb-5">
              @for (p of catalogo(); track p.id) {
                <button (click)="agregarDesde(p)" class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-brand-50">
                  <span class="min-w-0">
                    <span class="text-sm font-medium text-gray-800">{{ p.nombre }}</span>
                    @if (p.codigo) { <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 ml-1">{{ p.codigo }}</span> }
                  </span>
                  <span class="text-sm font-semibold text-brand-700 shrink-0">{{ p.arancel | clp }}</span>
                </button>
              } @empty { <p class="px-3 py-4 text-sm text-gray-400 text-center">Sin prestaciones en el catálogo de este dentista.</p> }
            </div>

            <div class="rounded-xl bg-gray-50 p-4">
              <p class="text-sm font-semibold text-gray-700 mb-3">Crear nueva prestación</p>
              <div class="grid grid-cols-2 gap-3">
                <input [value]="nuevoNombre()" (input)="nuevoNombre.set($any($event.target).value)" placeholder="Nombre"
                       class="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200" />
                <label class="text-xs text-gray-500">Código (opcional)
                  <input [value]="nuevoCodigo()" (input)="nuevoCodigo.set($any($event.target).value)"
                         class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-brand-200" />
                </label>
                <label class="text-xs text-gray-500">Arancel
                  <input appMoneda type="text" inputmode="numeric" [ngModel]="nuevoArancel()" (ngModelChange)="nuevoArancel.set($event)"
                         class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-brand-200" />
                </label>
              </div>
              <label class="flex items-center gap-2 mt-3 text-xs text-gray-600">
                <input type="checkbox" [checked]="guardarEnCatalogo()" (change)="guardarEnCatalogo.set($any($event.target).checked)" />
                Guardar también en el catálogo (asociada a este dentista)
              </label>
              <button (click)="agregarManual()" [disabled]="!nuevoNombre().trim()"
                      class="mt-3 w-full rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2 disabled:opacity-50">
                Agregar a la planilla
              </button>
            </div>
            <button (click)="mostrarPicker.set(false)" class="mt-4 text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          </div>
        </div>
      }
    } @else if (svc.cargando()) {
      <div class="p-10 text-center text-gray-400">Cargando…</div>
    } @else {
      <div class="p-10 text-center text-gray-500">Liquidación no encontrada. <a routerLink="/dentistas" class="text-brand-600 underline">Volver</a></div>
    }
  `,
})
export class DentistasPlanilla implements PuedeSalir {
  readonly svc = inject(DentistaService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  readonly nombrePeriodo = nombrePeriodo;
  readonly diaSemana = diaSemana;

  readonly id = input<string>('');
  readonly base = computed(() => this.svc.buscarPorId(this.id()));
  readonly filas = signal<FilaD[]>([]);
  readonly porcentaje = signal(25);
  readonly guardando = signal(false);
  private initId: string | null = null;

  readonly celdasModificadas = signal<Set<string>>(new Set());
  readonly semanasModificadas = signal<Set<number>>(new Set());
  readonly hayCambios = computed(() => this.semanasModificadas().size > 0 || this.celdasModificadas().size > 0);

  readonly mostrarHistorial = signal(false);
  readonly historialItems = signal<RegistroDentista[]>([]);
  readonly cargandoHistorial = signal(false);

  readonly semanas = computed<Semana[]>(() => { const l = this.base(); return l ? semanasDeMes(l.periodo) : []; });
  readonly semanaSel = signal(0);
  readonly columnasSemana = computed(() => this.semanas()[this.semanaSel()]?.dias ?? []);

  // Picker
  readonly mostrarPicker = signal(false);
  readonly pickerBusqueda = signal('');
  readonly nuevoNombre = signal('');
  readonly nuevoCodigo = signal('');
  readonly nuevoArancel = signal(0);
  readonly guardarEnCatalogo = signal(true);

  readonly catalogo = computed(() => {
    const l = this.base();
    if (!l) return [];
    const q = this.pickerBusqueda().toLowerCase().trim();
    return this.svc.prestacionesDe(l.dentistaId)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q));
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
          codigo: it.codigo,
          arancel: it.arancel,
          convenioId: it.convenioId ?? '',
          descuento: it.descuento ?? 0,
          porcentaje: Math.round((it.porcentaje ?? l.porcentaje) * 100),
          celdas: it.celdas ? { ...it.celdas } : {},
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
  semanaTieneData(s: Semana): boolean { return this.filas().some((f) => s.dias.some((d) => (f.celdas[d] || 0) > 0)); }
  esMes(iso: string): boolean { return enMes(iso, this.base()?.periodo ?? ''); }

  readonly calculo = computed(() => {
    const cols = this.columnasSemana();
    const filas = this.filas().map((f) => {
      const cantidadMes = Object.values(f.celdas).reduce((s, n) => s + (n || 0), 0);
      const valor = valorDentista(f.arancel, f.descuento);
      const bruto = cantidadMes * valor;
      const clinica = Math.round(bruto * (f.porcentaje / 100));
      return { ...f, cantidadMes, valor, bruto, clinica };
    });
    const totalColSemana: Record<string, number> = {};
    for (const c of cols) totalColSemana[c] = this.filas().reduce((s, f) => s + (f.celdas[c] || 0), 0);
    const totalBruto = filas.reduce((s, f) => s + f.bruto, 0);
    const totalClinica = filas.reduce((s, f) => s + f.clinica, 0);
    return {
      filas, totalColSemana,
      totalCantidad: filas.reduce((s, f) => s + f.cantidadMes, 0),
      totalBruto, totalClinica, totalDentista: totalBruto - totalClinica,
    };
  });

  private bump() { this.filas.set([...this.filas()]); }
  setPorcentaje(v: string) {
    const p = Math.min(100, Math.max(0, +v || 0));
    this.porcentaje.set(p);
    this.filas.update((fs) => fs.map((f) => ({ ...f, porcentaje: p })));
    this.marcar('global');
  }
  setNombre(i: number, v: string) { this.filas()[i].nombre = v; this.marcar(i + '|nombre'); this.bump(); }
  setArancel(i: number, v: string | number) { this.filas()[i].arancel = Math.max(0, +v || 0); this.marcar(i + '|arancel'); this.bump(); }
  setDescuento(i: number, v: string) { this.filas()[i].descuento = Math.min(100, Math.max(0, +v || 0)); this.marcar(i + '|desc'); this.bump(); }
  setPorc(i: number, v: string) { this.filas()[i].porcentaje = Math.min(100, Math.max(0, +v || 0)); this.marcar(i + '|porc'); this.bump(); }
  setCelda(i: number, c: string, v: string) { this.filas()[i].celdas[c] = Math.max(0, Math.floor(+v || 0)); this.marcar(i + '|' + c); this.bump(); }

  /** Elegir convenio: rellena el descuento con el % del convenio. */
  setConvenio(i: number, id: string) {
    this.filas()[i].convenioId = id;
    const c = id ? this.svc.buscarConvenio(id) : undefined;
    if (c) this.filas()[i].descuento = c.descuento;
    this.marcar(i + '|conv');
    this.bump();
  }

  abrirPicker() {
    this.pickerBusqueda.set(''); this.nuevoNombre.set(''); this.nuevoCodigo.set(''); this.nuevoArancel.set(0);
    this.guardarEnCatalogo.set(true); this.mostrarPicker.set(true);
  }
  agregarDesde(p: PrestacionDentista) {
    this.filas.update((fs) => [...fs, {
      id: `${p.id}_${fs.length}`, nombre: p.nombre, codigo: p.codigo,
      arancel: p.arancel, convenioId: '', descuento: 0, porcentaje: this.porcentaje(), celdas: {},
    }]);
    this.marcar('add');
    this.mostrarPicker.set(false);
  }
  async agregarManual() {
    const l = this.base();
    const nombre = this.nuevoNombre().trim();
    if (!l || !nombre) return;
    const codigo = this.nuevoCodigo().trim() || undefined;
    const arancel = Math.max(0, this.nuevoArancel());
    this.filas.update((fs) => [...fs, {
      id: `manual_${Object.keys(fs).length}_${nombre.replace(/\s+/g, '')}`,
      nombre, codigo, arancel, convenioId: '', descuento: 0, porcentaje: this.porcentaje(), celdas: {},
    }]);
    if (this.guardarEnCatalogo()) {
      await this.svc.crearPrestacion({
        id: `pd-${crypto.randomUUID().slice(0, 8)}`, codigo, nombre, arancel,
        dentistaIds: [l.dentistaId], activo: true,
      });
    }
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
    const items: ItemDentista[] = this.filas().map((f) => {
      const celdas: Record<string, number> = {};
      for (const [fecha, c] of Object.entries(f.celdas)) if (c > 0) celdas[fecha] = c;
      const it: ItemDentista = {
        id: f.id, nombre: f.nombre, arancel: f.arancel,
        convenioId: f.convenioId, descuento: f.descuento, porcentaje: f.porcentaje / 100, celdas,
      };
      if (f.codigo) it.codigo = f.codigo;
      return it;
    });
    const cambios = resumirCambiosDentista(l.items, items);
    this.guardando.set(true);
    try {
      await this.svc.guardarLiquidacion({ ...l, porcentaje: this.porcentaje() / 100, items });
      this.celdasModificadas.set(new Set());
      this.semanasModificadas.set(new Set());
      const guardada = this.svc.buscarPorId(l.id);
      if (guardada) void this.svc.registrarHistorial(guardada, cambios);
      this.toast.exito('Liquidación dentista guardada');
    } catch {
      this.toast.error('No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }

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
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
    }).format(new Date(iso));
  }

  puedeSalir(): boolean | Promise<boolean> {
    if (!this.hayCambios()) return true;
    return this.confirm.ask({
      titulo: 'Cambios sin guardar',
      mensaje: 'Tienes cambios en esta planilla que no se han guardado. ¿Salir de todas formas?',
      confirmar: 'Salir sin guardar', cancelar: 'Seguir editando', tono: 'peligro',
    });
  }
  @HostListener('window:beforeunload', ['$event'])
  avisarCierre(e: BeforeUnloadEvent) { if (this.hayCambios()) { e.preventDefault(); e.returnValue = ''; } }
}

/** Resumen de cambios para el historial (cantidad mensual por prestación). */
function resumirCambiosDentista(antes: ItemDentista[], despues: ItemDentista[]): string[] {
  const tot = (it: ItemDentista) => Object.values(it.celdas ?? {}).reduce((s, n) => s + (n || 0), 0);
  const mapA = new Map(antes.map((i) => [i.nombre, tot(i)]));
  const mapD = new Map(despues.map((i) => [i.nombre, tot(i)]));
  const claves = [...new Set([...mapA.keys(), ...mapD.keys()])].sort();
  const lineas: string[] = [];
  for (const k of claves) {
    const a = mapA.get(k) ?? 0;
    const d = mapD.get(k) ?? 0;
    if (a === d) continue;
    if (!mapA.has(k)) lineas.push(`+ "${k}": ${d}`);
    else if (!mapD.has(k)) lineas.push(`− Se quitó "${k}"`);
    else lineas.push(`"${k}": ${a} → ${d}`);
  }
  if (!lineas.length) lineas.push('Se volvió a guardar (sin cambios en cantidades).');
  return lineas;
}
