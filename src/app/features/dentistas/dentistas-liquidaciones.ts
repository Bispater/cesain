import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DentistaService } from '../../core/services/dentista.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import {
  Dentista, LiquidacionDentista, cantidadDentista, valorDentista,
} from '../../core/models/dentista.model';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';
import { Icon } from '../../shared/icon/icon';

@Component({
  selector: 'app-dentistas-liquidaciones',
  imports: [ClpPipe, RouterLink, Spinner, Icon],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">DENTAL</h1>
        <p class="text-sm text-gray-500">Liquidaciones odontológicas. Cada prestación con su arancel, convenio y descuento.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a routerLink="/dentistas/prestaciones" class="rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium px-3 py-2 hover:bg-gray-50">Prestaciones</a>
        <a routerLink="/dentistas/convenios" class="rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium px-3 py-2 hover:bg-gray-50">Convenios</a>
        <a routerLink="/dentistas/profesionales" class="rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium px-3 py-2 hover:bg-gray-50">Dentistas</a>
        <button (click)="mostrarPapelera.set(true)"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium px-3 py-2 hover:bg-gray-50">
          <app-icon name="trash" [size]="16" /> Papelera @if (svc.eliminadas().length) { ({{ svc.eliminadas().length }}) }
        </button>
        <button (click)="abrirNueva()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">+ Nueva liquidación</button>
      </div>
    </header>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <input [value]="busqueda()" (input)="busqueda.set($any($event.target).value)"
             placeholder="Buscar dentista o sede..."
             class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm w-72 focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />
      <select [value]="filtroDentista()" (change)="filtroDentista.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODOS">Todos los dentistas</option>
        @for (d of dentistasConLiq(); track d) { <option [value]="d">{{ d }}</option> }
      </select>
      <select [value]="filtroPeriodo()" (change)="filtroPeriodo.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODOS">Todos los períodos</option>
        @for (p of periodos(); track p) { <option [value]="p">{{ nombrePeriodo(p) }}</option> }
      </select>
      <select [value]="filtroSede()" (change)="filtroSede.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODAS">Todas las sedes</option>
        @for (s of sedes(); track s) { <option [value]="s">{{ s }}</option> }
      </select>
      <span class="text-sm text-gray-400 ml-auto">{{ filas().length }} resultado(s)</span>
    </div>

    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[820px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Dentista</th>
            <th class="px-4 py-3 font-semibold">Sede</th>
            <th class="px-4 py-3 font-semibold">Período</th>
            <th class="px-4 py-3 font-semibold text-right">Atenciones</th>
            <th class="px-4 py-3 font-semibold text-right">Bruto</th>
            <th class="px-4 py-3 font-semibold text-right">Clínica</th>
            <th class="px-4 py-3 font-semibold text-right">Dentista</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (l of filas(); track l.id) {
            <tr class="hover:bg-gray-50 cursor-pointer" (click)="toggle(l.id)">
              <td class="px-4 py-3 font-medium text-gray-800">{{ l.dentista }}</td>
              <td class="px-4 py-3"><span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ l.sede }}</span></td>
              <td class="px-4 py-3"><span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ nombrePeriodo(l.periodo) }}</span></td>
              <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ l.totalCantidad }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-medium text-gray-800">{{ l.totalBruto | clp }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-amber-600">− {{ l.totalClinica | clp }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-bold text-brand-700">{{ l.totalDentista | clp }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <a [routerLink]="['/dentistas/planilla', l.id]" (click)="$event.stopPropagation()"
                     class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5">Planilla</a>
                  <a [routerLink]="['/dentistas/comprobante', l.id]" (click)="$event.stopPropagation()"
                     class="rounded-lg border border-gray-200 text-gray-600 text-xs px-2.5 py-1.5 hover:bg-gray-50">PDF</a>
                  <button (click)="eliminar(l, $event)" title="Eliminar"
                          class="h-7 w-7 grid place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <app-icon name="trash" [size]="16" />
                  </button>
                  <span class="text-gray-400 w-4 text-center">{{ abierto() === l.id ? '▲' : '▼' }}</span>
                </div>
              </td>
            </tr>
            @if (abierto() === l.id) {
              <tr class="bg-gray-50/60">
                <td colspan="8" class="px-6 py-4">
                  <p class="text-xs text-gray-400 mb-2">Sede: {{ l.sede }} · {{ l.especialidad || 'Odontología' }} · Vista de detalle (solo lectura)</p>
                  <table class="w-full text-xs">
                    <thead class="text-gray-500 text-left">
                      <tr>
                        <th class="py-1.5">Prestación</th><th class="py-1.5">Convenio</th>
                        <th class="py-1.5 text-right">Arancel</th><th class="py-1.5 text-right">Desc.</th>
                        <th class="py-1.5 text-right">Valor</th><th class="py-1.5 text-right">Cant.</th><th class="py-1.5 text-right">Total $</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      @for (f of filasDetalle(l); track $index) {
                        <tr>
                          <td class="py-1.5 text-gray-700">{{ f.nombre }}</td>
                          <td class="py-1.5 text-gray-500">{{ f.convenio }}</td>
                          <td class="py-1.5 text-right tabular-nums text-gray-500">{{ f.arancel | clp }}</td>
                          <td class="py-1.5 text-right tabular-nums">{{ f.descuento }}%</td>
                          <td class="py-1.5 text-right tabular-nums">{{ f.valor | clp }}</td>
                          <td class="py-1.5 text-right tabular-nums">{{ f.cantidad }}</td>
                          <td class="py-1.5 text-right tabular-nums font-medium">{{ f.total | clp }}</td>
                        </tr>
                      } @empty { <tr><td colspan="7" class="py-2 text-gray-400">Sin prestaciones cargadas.</td></tr> }
                    </tbody>
                  </table>
                </td>
              </tr>
            }
          } @empty {
            <tr><td colspan="8" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargando()) { <app-spinner label="Cargando…" /> } @else { No hay liquidaciones para los filtros aplicados. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Papelera -->
    @if (mostrarPapelera()) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarPapelera.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-1">Papelera de liquidaciones</h2>
          <p class="text-xs text-gray-500 mb-4">Liquidaciones eliminadas. Puedes restaurarlas o borrarlas para siempre.</p>
          @for (l of svc.eliminadas(); track l.id) {
            <div class="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-gray-100">
              <div>
                <p class="text-sm font-medium text-gray-800">{{ l.dentista }} · {{ nombrePeriodo(l.periodo) }} · {{ l.sede }}</p>
                <p class="text-xs text-gray-400">{{ l.totalBruto | clp }} · eliminada {{ fechaCL(l.eliminadaEn) }} por {{ l.eliminadaPor }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="restaurar(l)" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5">Restaurar</button>
                <button (click)="eliminarDefinitivo(l)" class="rounded-lg border border-red-200 text-red-600 text-xs px-3 py-1.5 hover:bg-red-50">Eliminar definitivamente</button>
              </div>
            </div>
          } @empty { <p class="py-8 text-center text-gray-400">La papelera está vacía.</p> }
          <div class="flex justify-end mt-5">
            <button (click)="mostrarPapelera.set(false)" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cerrar</button>
          </div>
        </div>
      </div>
    }

    <!-- Nueva liquidación -->
    @if (mostrarNueva()) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarNueva.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-1">Nueva liquidación dentista</h2>
          <p class="text-xs text-gray-500 mb-4">Elige el dentista, la sede y el mes; luego completas la planilla.</p>

          @if (!svc.dentistasActivos().length) {
            <p class="text-sm text-gray-500 mb-4">
              Aún no hay dentistas. <a routerLink="/dentistas/profesionales" class="text-brand-600 underline">Crea uno primero</a>.
            </p>
          } @else {
            <label class="block text-sm mb-3">
              <span class="text-gray-600">Dentista</span>
              <select [value]="dentSel()" (change)="elegirDentista($any($event.target).value)"
                      class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                <option value="">— Selecciona —</option>
                @for (d of svc.dentistasActivos(); track d.id) { <option [value]="d.id">{{ d.nombre }}@if (d.especialidad) { · {{ d.especialidad }} }</option> }
              </select>
            </label>
            <label class="block text-sm mb-3">
              <span class="text-gray-600">Sede</span>
              <select [value]="sedeSel()" (change)="sedeSel.set($any($event.target).value)"
                      class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                <option value="">— Selecciona —</option>
                @for (s of sedesElegibles(); track s) { <option [value]="s">{{ s }}</option> }
              </select>
            </label>
            <label class="block text-sm mb-1">
              <span class="text-gray-600">Mes</span>
              <input type="month" [value]="mesSel()" (change)="mesSel.set($any($event.target).value)"
                     class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
            </label>
          }

          @if (errorNueva()) { <p class="text-sm text-red-500 mt-2">{{ errorNueva() }}</p> }
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="mostrarNueva.set(false)" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button (click)="crear()" [disabled]="!svc.dentistasActivos().length"
                    class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-sm font-semibold disabled:opacity-50">Crear y abrir</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DentistasLiquidaciones {
  readonly svc = inject(DentistaService);
  readonly cat = inject(CatalogosService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly nombrePeriodo = nombrePeriodo;

  readonly abierto = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly filtroDentista = signal('TODOS');
  readonly filtroPeriodo = signal('TODOS');
  readonly filtroSede = signal('TODAS');

  readonly dentistasConLiq = computed(() => [...new Set(this.svc.activas().map((l) => l.dentista))].sort());
  readonly periodos = computed(() => [...new Set(this.svc.activas().map((l) => l.periodo))].sort().reverse());
  readonly sedes = computed(() => [...new Set(this.svc.activas().map((l) => l.sede))].sort());

  readonly filas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const dent = this.filtroDentista();
    const per = this.filtroPeriodo();
    const sede = this.filtroSede();
    return this.svc.activas()
      .filter((l) => dent === 'TODOS' || l.dentista === dent)
      .filter((l) => per === 'TODOS' || l.periodo === per)
      .filter((l) => sede === 'TODAS' || l.sede === sede)
      .filter((l) => !q || l.dentista.toLowerCase().includes(q) || l.sede.toLowerCase().includes(q))
      .sort((a, b) => b.periodo.localeCompare(a.periodo) || a.dentista.localeCompare(b.dentista));
  });

  toggle(id: string) { this.abierto.update((c) => (c === id ? null : id)); }

  filasDetalle(l: LiquidacionDentista) {
    return l.items
      .map((it) => {
        const cant = cantidadDentista(it);
        const valor = valorDentista(it.arancel, it.descuento);
        return {
          nombre: it.nombre,
          convenio: it.convenioId ? (this.svc.buscarConvenio(it.convenioId)?.nombre ?? '—') : 'Sin convenio',
          arancel: it.arancel, descuento: it.descuento, valor, cantidad: cant, total: cant * valor,
        };
      })
      .filter((f) => f.cantidad > 0);
  }

  // ── Nueva ──
  readonly mostrarNueva = signal(false);
  readonly dentSel = signal('');
  readonly sedeSel = signal('');
  readonly mesSel = signal('2026-06');
  readonly errorNueva = signal<string | null>(null);

  readonly sedesElegibles = computed(() => {
    const d = this.svc.dentistasActivos().find((x) => x.id === this.dentSel());
    if (d?.sedes?.length) return d.sedes;
    return this.cat.sedes().map((s) => s.nombre);
  });

  abrirNueva() { this.errorNueva.set(null); this.dentSel.set(''); this.sedeSel.set(''); this.mostrarNueva.set(true); }
  elegirDentista(id: string) {
    this.dentSel.set(id);
    const d = this.svc.dentistasActivos().find((x) => x.id === id);
    this.sedeSel.set(d?.sedes?.length === 1 ? d.sedes[0] : '');
  }
  crear() {
    const d = this.svc.dentistasActivos().find((x) => x.id === this.dentSel());
    if (!d) { this.errorNueva.set('Selecciona un dentista.'); return; }
    if (!this.sedeSel()) { this.errorNueva.set('Selecciona la sede.'); return; }
    if (!this.mesSel()) { this.errorNueva.set('Selecciona un mes.'); return; }
    const l = this.svc.crearLiquidacion(d, this.sedeSel(), this.mesSel());
    this.mostrarNueva.set(false);
    this.router.navigate(['/dentistas/planilla', l.id]);
  }

  // ── Papelera ──
  readonly mostrarPapelera = signal(false);
  async eliminar(l: LiquidacionDentista, ev: Event) {
    ev.stopPropagation();
    const ok = await this.confirm.ask({
      titulo: 'Eliminar liquidación',
      mensaje: `¿Enviar a la papelera la liquidación de ${l.dentista} (${nombrePeriodo(l.periodo)} · ${l.sede})? Podrás recuperarla después.`,
      confirmar: 'Eliminar', tono: 'peligro',
    });
    if (!ok) return;
    await this.svc.eliminarLiquidacion(l.id);
    this.toast.exito('Enviada a la papelera');
  }
  async restaurar(l: LiquidacionDentista) { await this.svc.restaurarLiquidacion(l.id); this.toast.exito('Liquidación restaurada'); }
  async eliminarDefinitivo(l: LiquidacionDentista) {
    const ok = await this.confirm.ask({
      titulo: 'Eliminar definitivamente',
      mensaje: `Esto NO se puede deshacer. ¿Eliminar para siempre la liquidación de ${l.dentista} (${nombrePeriodo(l.periodo)})?`,
      confirmar: 'Eliminar para siempre', tono: 'peligro',
    });
    if (!ok) return;
    await this.svc.eliminarDefinitivo(l.id);
    this.toast.exito('Eliminada definitivamente');
  }

  fechaCL(iso?: string): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
    }).format(new Date(iso));
  }
}
