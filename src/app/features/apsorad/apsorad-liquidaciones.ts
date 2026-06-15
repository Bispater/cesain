import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApsoradService } from '../../core/services/apsorad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { LiquidacionApsorad, ServicioApsorad, SERVICIOS_APSORAD } from '../../core/models/apsorad.model';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';
import { ConfirmService } from '../../shared/confirm/confirm.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-apsorad-liquidaciones',
  imports: [ClpPipe, RouterLink, Spinner],
  template: `
    <header class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">APSORAD</h1>
        <p class="text-sm text-gray-500">Liquidaciones de Ecografías y Rayos. Pago a APSORAD = % del valor Fonasa.</p>
      </div>
      <div class="flex items-center gap-2">
        <a routerLink="/apsorad/catalogo" class="rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium px-3 py-2 hover:bg-gray-50">Catálogo</a>
        <button (click)="abrirNueva()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 shadow-md">+ Nueva liquidación</button>
      </div>
    </header>

    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-x-auto">
      <table class="w-full min-w-[760px] text-sm">
        <thead class="bg-brand-600 text-white text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Servicio</th>
            <th class="px-4 py-3 font-semibold">Sede</th>
            <th class="px-4 py-3 font-semibold">Período</th>
            <th class="px-4 py-3 font-semibold text-right">Cobrado</th>
            <th class="px-4 py-3 font-semibold text-right">APSORAD</th>
            <th class="px-4 py-3 font-semibold text-right">CESAIN</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (l of svc.activas(); track l.id) {
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-800">{{ l.servicio === 'ECOGRAFIA' ? 'Ecografías' : 'Rayos' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ l.sede }}</td>
              <td class="px-4 py-3"><span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{{ nombrePeriodo(l.periodo) }}</span></td>
              <td class="px-4 py-3 text-right tabular-nums">{{ l.totalCobrado | clp }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-brand-700 font-medium">{{ l.totalApsorad | clp }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-green-700 font-bold">{{ l.totalCesain | clp }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <a [routerLink]="['/apsorad', l.id]" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 mr-2">Abrir</a>
                <button (click)="eliminar(l)" class="text-xs text-red-500 hover:underline">Eliminar</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="px-4 py-10 text-center text-gray-400">
              @if (svc.cargando()) { <app-spinner label="Cargando…" /> } @else { Sin liquidaciones. Crea una nueva. }
            </td></tr>
          }
        </tbody>
      </table>
    </div>

    @if (mostrarNueva()) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" (click)="mostrarNueva.set(false)">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Nueva liquidación APSORAD</h2>
          <label class="block text-sm mb-3">
            <span class="text-gray-600">Servicio</span>
            <select [value]="servicioSel()" (change)="servicioSel.set($any($event.target).value)"
                    class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
              @for (s of servicios; track s.valor) { <option [value]="s.valor">{{ s.label }}</option> }
            </select>
          </label>
          <label class="block text-sm mb-3">
            <span class="text-gray-600">Sede</span>
            <select [value]="sedeSel()" (change)="sedeSel.set($any($event.target).value)"
                    class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200">
              <option value="">— Selecciona —</option>
              @for (s of cat.sedes(); track s.id) { <option [value]="s.nombre">{{ s.nombre }}</option> }
            </select>
          </label>
          <label class="block text-sm mb-1">
            <span class="text-gray-600">Mes</span>
            <input type="month" [value]="mesSel()" (change)="mesSel.set($any($event.target).value)"
                   class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200" />
          </label>
          @if (errorNueva()) { <p class="text-sm text-red-500 mt-2">{{ errorNueva() }}</p> }
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="mostrarNueva.set(false)" class="rounded-lg border border-gray-200 text-gray-600 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button (click)="crear()" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 text-sm font-semibold">Crear y abrir</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ApsoradLiquidaciones {
  readonly svc = inject(ApsoradService);
  readonly cat = inject(CatalogosService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly nombrePeriodo = nombrePeriodo;
  readonly servicios = SERVICIOS_APSORAD;

  readonly mostrarNueva = signal(false);
  readonly servicioSel = signal<ServicioApsorad>('ECOGRAFIA');
  readonly sedeSel = signal('');
  readonly mesSel = signal('2026-06');
  readonly errorNueva = signal<string | null>(null);

  abrirNueva() { this.errorNueva.set(null); this.sedeSel.set(''); this.mostrarNueva.set(true); }
  crear() {
    if (!this.sedeSel()) { this.errorNueva.set('Selecciona una sede.'); return; }
    if (!this.mesSel()) { this.errorNueva.set('Selecciona un mes.'); return; }
    const l = this.svc.crearLiquidacion(this.servicioSel(), this.sedeSel(), this.mesSel());
    this.mostrarNueva.set(false);
    this.router.navigate(['/apsorad', l.id]);
  }
  async eliminar(l: LiquidacionApsorad) {
    const ok = await this.confirm.ask({ titulo: 'Eliminar liquidación', mensaje: `¿Eliminar ${l.servicio} ${l.sede} ${nombrePeriodo(l.periodo)}?`, confirmar: 'Eliminar', tono: 'peligro' });
    if (ok) { await this.svc.eliminarLiquidacion(l.id); this.toast.exito('Eliminada'); }
  }
}
