import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { ProfesionalService } from '../../core/services/profesional.service';
import { Liquidacion, nombrePeriodo } from '../../core/models/liquidacion.model';
import { Profesional } from '../../core/models/profesional.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Icon } from '../../shared/icon/icon';
import { ProfesionalForm } from '../../shared/profesional-form/profesional-form';

@Component({
  selector: 'app-liquidaciones',
  imports: [ClpPipe, RouterLink, Icon, ProfesionalForm],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Liquidaciones</h1>
        <p class="text-sm text-gray-500">
          Filtra por profesional y por período REAL (no por el nombre del archivo).
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button (click)="mostrarPapelera.set(true)"
                class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium px-3 py-2 hover:bg-gray-50">
          <app-icon name="trash" [size]="16" />
          Papelera @if (svc.eliminadas().length) { ({{ svc.eliminadas().length }}) }
        </button>
        <button (click)="abrirNueva()"
                class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">
          + Nueva liquidación
        </button>
      </div>
    </header>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <input [value]="busqueda()" (input)="busqueda.set($any($event.target).value)"
             placeholder="Buscar profesional o especialidad..."
             class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm w-72
                    focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none" />

      <select [value]="filtroProfesional()"
              (change)="filtroProfesional.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODOS">Todos los profesionales</option>
        @for (p of svc.profesionales(); track p) { <option [value]="p">{{ p }}</option> }
      </select>

      <select [value]="filtroPeriodo()"
              (change)="filtroPeriodo.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODOS">Todos los períodos</option>
        @for (per of svc.periodos(); track per) {
          <option [value]="per">{{ nombrePeriodo(per) }}</option>
        }
      </select>

      <select [value]="filtroSede()"
              (change)="filtroSede.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
        <option value="TODAS">Todas las sedes</option>
        @for (s of sedesDisponibles(); track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>

      <span class="text-sm text-gray-400 ml-auto">{{ filas().length }} resultado(s)</span>
    </div>

    <!-- Tabla -->
    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Profesional</th>
            <th class="px-4 py-3 font-semibold">Especialidad</th>
            <th class="px-4 py-3 font-semibold">Sede</th>
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
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{{ l.sede }}</span>
              </td>
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
                  <button (click)="eliminar(l, $event)" title="Eliminar"
                          class="h-7 w-7 grid place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/>
                      <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                  <span class="text-gray-400 w-4 text-center">{{ abierto() === l.id ? '▲' : '▼' }}</span>
                </div>
              </td>
            </tr>

            @if (abierto() === l.id) {
              <tr class="bg-gray-50/60">
                <td colspan="9" class="px-6 py-4">
                  <p class="text-xs text-gray-400 mb-2">
                    Sede: {{ l.sede }} · Origen: {{ l.archivoOrigen }} · {{ (l.porcentajeClinica * 100) }}% retención clínica
                    · Vista de detalle (solo lectura)
                  </p>
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
            <tr><td colspan="9" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargando()) {
                <span class="inline-flex items-center gap-2">
                  <span class="h-4 w-4 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin"></span>
                  Cargando liquidaciones…
                </span>
              } @else {
                No hay liquidaciones para los filtros aplicados.
              }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    <!-- ===== Modal Papelera ===== -->
    @if (mostrarPapelera()) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarPapelera.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto"
             (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-1">Papelera de liquidaciones</h2>
          <p class="text-xs text-gray-500 mb-4">Liquidaciones eliminadas. Puedes restaurarlas o borrarlas para siempre.</p>

          @for (l of svc.eliminadas(); track l.id) {
            <div class="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-gray-100">
              <div>
                <p class="text-sm font-medium text-gray-800">{{ l.profesional }} · {{ nombrePeriodo(l.periodo) }} · {{ l.sede }}</p>
                <p class="text-xs text-gray-400">
                  {{ l.especialidad }} · {{ l.totalBruto | clp }} ·
                  eliminada {{ fechaCL(l.eliminadaEn) }} por {{ l.eliminadaPor }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="restaurar(l)"
                        class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5">
                  Restaurar
                </button>
                <button (click)="eliminarDefinitivo(l)"
                        class="rounded-lg border border-red-200 text-red-600 text-xs px-3 py-1.5 hover:bg-red-50">
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          } @empty {
            <p class="py-8 text-center text-gray-400">La papelera está vacía.</p>
          }

          <div class="flex justify-end mt-5">
            <button (click)="mostrarPapelera.set(false)"
                    class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cerrar</button>
          </div>
        </div>
      </div>
    }

    <!-- ===== Modal Nueva liquidación ===== -->
    @if (mostrarNueva()) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="cerrarNueva()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-1">Nueva liquidación</h2>
          <p class="text-xs text-gray-500 mb-4">Busca el profesional, elige la sede y el mes; luego completas la planilla.</p>

          <!-- Buscador con autocompletado -->
          <div class="block text-sm mb-3 relative">
            <span class="text-gray-600">Profesional</span>
            <input [value]="busquedaProf()"
                   (input)="buscarProf($any($event.target).value)"
                   (focus)="comboAbierto.set(true)"
                   (blur)="comboAbierto.set(false)"
                   placeholder="Escribe para buscar…"
                   class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
            @if (comboAbierto()) {
              <div class="absolute left-0 right-0 top-full mt-1 z-20 max-h-60 overflow-y-auto
                          rounded-xl border border-gray-200 bg-white shadow-lg">
                @for (p of profsFiltrados(); track p.id) {
                  <button type="button" (mousedown)="elegirProf(p)"
                          class="w-full text-left px-3 py-2 hover:bg-brand-50">
                    <span class="font-medium text-gray-800">{{ p.nombre }}</span>
                    <span class="text-xs text-gray-400"> · {{ p.especialidad }} ({{ p.sedes.join(', ') }})</span>
                  </button>
                } @empty {
                  <p class="px-3 py-2 text-sm text-gray-400">Sin coincidencias.</p>
                }
                <button type="button" (mousedown)="abrirCrearProf()"
                        class="w-full text-left px-3 py-2 border-t border-gray-100 text-brand-600 text-sm font-semibold hover:bg-brand-50">
                  + Crear profesional@if (busquedaProf().trim()) { «{{ busquedaProf().trim() }}» }
                </button>
              </div>
            }
          </div>

          <!-- Sede (las del profesional elegido) -->
          @if (profElegido(); as p) {
            <label class="block text-sm mb-3">
              <span class="text-gray-600">Sede</span>
              <select [value]="sedeSel()" (change)="sedeSel.set($any($event.target).value)"
                      class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
                <option value="">— Selecciona —</option>
                @for (s of sedesElegibles(); track s) { <option [value]="s">{{ s }}</option> }
              </select>
              @if (p.sedes.length > 1) {
                <p class="text-xs text-gray-400 mt-1">
                  {{ p.nombre }} atiende en {{ p.sedes.length }} sedes; cada sede lleva su liquidación por separado.
                </p>
              }
            </label>
          }

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

    <!-- Crear profesional al vuelo (mismo formulario de la página Profesionales) -->
    @if (crearProf()) {
      <app-profesional-form [nombreInicial]="busquedaProf()"
                            (guardado)="onProfCreado($event)"
                            (cerrado)="crearProf.set(false)" />
    }
  `,
})
export class Liquidaciones {
  readonly svc = inject(LiquidacionService);
  readonly profSvc = inject(ProfesionalService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly nombrePeriodo = nombrePeriodo;
  readonly mostrarPapelera = signal(false);

  readonly busqueda = signal('');
  readonly abierto = signal<string | null>(null);

  /** Filtros propios de esta página (independientes de las demás). */
  readonly filtroProfesional = signal('TODOS');
  readonly filtroPeriodo = signal('TODOS');
  readonly filtroSede = signal('TODAS');

  readonly sedesDisponibles = computed(() =>
    [...new Set(this.svc.activas().map((l) => l.sede))].sort(),
  );

  // Modal nueva liquidación
  readonly mostrarNueva = signal(false);
  readonly mesSel = signal('2026-06');
  readonly errorNueva = signal<string | null>(null);

  // Buscador de profesional (combobox) + sede
  readonly busquedaProf = signal('');
  readonly comboAbierto = signal(false);
  readonly profElegido = signal<Profesional | null>(null);
  readonly sedeSel = signal('');
  readonly crearProf = signal(false);

  readonly profsFiltrados = computed(() => {
    const q = this.busquedaProf().toLowerCase().trim();
    return this.profSvc.items()
      .filter((p) => p.activo)
      .filter((p) =>
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.especialidad.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  /** Sedes que se pueden elegir: las del profesional (o todas si no tiene). */
  readonly sedesElegibles = computed(() => {
    const p = this.profElegido();
    if (!p) return [];
    return p.sedes.length ? p.sedes : this.profSvc.sedes();
  });

  readonly filas = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const sede = this.filtroSede();
    return this.svc.filtrar(this.filtroProfesional(), this.filtroPeriodo())
      .filter((l) => sede === 'TODAS' || l.sede === sede)
      .filter(
        (l) =>
          !q ||
          l.profesional.toLowerCase().includes(q) ||
          l.especialidad.toLowerCase().includes(q) ||
          l.sede.toLowerCase().includes(q),
      );
  });

  toggle(id: string) {
    this.abierto.update((cur) => (cur === id ? null : id));
  }

  abrirNueva() {
    this.errorNueva.set(null);
    this.busquedaProf.set('');
    this.profElegido.set(null);
    this.sedeSel.set('');
    this.comboAbierto.set(false);
    this.mostrarNueva.set(true);
  }
  cerrarNueva() {
    this.mostrarNueva.set(false);
  }

  buscarProf(texto: string) {
    this.busquedaProf.set(texto);
    this.profElegido.set(null);
    this.sedeSel.set('');
    this.comboAbierto.set(true);
  }

  elegirProf(p: Profesional) {
    this.profElegido.set(p);
    this.busquedaProf.set(p.nombre);
    this.comboAbierto.set(false);
    // Si atiende en una sola sede, queda seleccionada de inmediato.
    this.sedeSel.set(p.sedes.length === 1 ? p.sedes[0] : '');
  }

  abrirCrearProf() {
    this.comboAbierto.set(false);
    this.crearProf.set(true);
  }

  onProfCreado(p: Profesional) {
    this.crearProf.set(false);
    this.elegirProf(p);
  }

  crearNueva() {
    const prof = this.profElegido();
    if (!prof) { this.errorNueva.set('Selecciona un profesional.'); return; }
    if (!this.sedeSel()) { this.errorNueva.set('Selecciona la sede.'); return; }
    if (!this.mesSel()) { this.errorNueva.set('Selecciona un mes.'); return; }
    const liq = this.svc.crearLiquidacion(prof, this.mesSel(), this.sedeSel());
    this.cerrarNueva();
    this.router.navigate(['/planilla', liq.id]);
  }

  async eliminar(l: Liquidacion, ev: Event) {
    ev.stopPropagation();
    const ok = await this.confirm.ask({
      titulo: 'Eliminar liquidación',
      mensaje: `¿Enviar a la papelera la liquidación de ${l.profesional} (${nombrePeriodo(l.periodo)})? Podrás recuperarla después.`,
      confirmar: 'Eliminar',
      tono: 'peligro',
    });
    if (!ok) return;
    await this.svc.eliminarLiquidacion(l.id);
    this.toast.exito('Enviada a la papelera');
  }

  async restaurar(l: Liquidacion) {
    await this.svc.restaurarLiquidacion(l.id);
    this.toast.exito('Liquidación restaurada');
  }

  async eliminarDefinitivo(l: Liquidacion) {
    const ok = await this.confirm.ask({
      titulo: 'Eliminar definitivamente',
      mensaje: `Esto NO se puede deshacer. ¿Eliminar para siempre la liquidación de ${l.profesional} (${nombrePeriodo(l.periodo)})?`,
      confirmar: 'Eliminar para siempre',
      tono: 'peligro',
    });
    if (!ok) return;
    await this.svc.eliminarDefinitivo(l.id);
    this.toast.exito('Eliminada definitivamente');
  }

  fechaCL(iso?: string): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Santiago',
    }).format(new Date(iso));
  }

  badgePrevision(p: string): string {
    return p === 'FONASA'
      ? 'bg-brand-100 text-brand-700'
      : p === 'ISAPRE'
        ? 'bg-sky-100 text-sky-700'
        : 'bg-amber-100 text-amber-700';
  }
}
