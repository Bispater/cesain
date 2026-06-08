import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LiquidacionService } from '../../core/services/liquidacion.service';

@Component({
  selector: 'app-importar',
  imports: [RouterLink],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Importar Excel</h1>
      <p class="text-sm text-gray-500">
        Sube el libro de liquidaciones; el sistema valida, limpia los "NaN" y normaliza las 30 pestañas.
      </p>
    </header>

    <div class="max-w-2xl mx-auto">
      @if (svc.estadoCarga() === 'idle') {
        <!-- Dropzone -->
        <label class="block rounded-2xl border-2 border-dashed border-brand-200 bg-white
                      p-12 text-center cursor-pointer hover:border-brand-400 transition-colors">
          <div class="h-16 w-16 rounded-2xl bg-brand-50 grid place-items-center mx-auto mb-4">
            <span class="text-3xl text-brand-500">⇪</span>
          </div>
          <p class="font-semibold text-gray-700">Arrastra tu archivo .xlsx o haz clic</p>
          <p class="text-xs text-gray-400 mt-1">Liquidaciones del centro médico (máx. 30 pestañas)</p>
          <input type="file" accept=".xlsx,.xls" class="hidden"
                 (change)="onArchivo($event)" />
          <span class="inline-block mt-5 rounded-lg bg-brand-600 text-white text-sm font-semibold px-5 py-2.5">
            Subir y Procesar Archivo
          </span>
        </label>

        <button (click)="procesarDemo()"
                class="mt-4 w-full text-sm text-brand-600 hover:underline">
          ▷ O ejecutar una importación de demostración
        </button>
      } @else {
        <!-- Progreso -->
        <div class="rounded-2xl bg-white shadow-sm border border-gray-100 p-8">
          <div class="flex items-center gap-3 mb-6">
            @if (svc.estadoCarga() !== 'completado') {
              <span class="h-5 w-5 rounded-full border-2 border-brand-300 border-t-brand-600 animate-spin"></span>
              <p class="font-semibold text-gray-700">Procesando archivo...</p>
            } @else {
              <span class="h-6 w-6 rounded-full bg-green-500 text-white grid place-items-center text-sm">✓</span>
              <p class="font-semibold text-gray-700">Importación completada</p>
            }
          </div>

          <ol class="space-y-3">
            @for (paso of svc.logCarga(); track paso.mensaje) {
              <li class="flex items-start gap-3 text-sm">
                <span class="mt-0.5 h-4 w-4 rounded-full grid place-items-center text-[10px]"
                      [class]="paso.estado === 'completado'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-brand-100 text-brand-600'">●</span>
                <span [class]="paso.estado === 'completado' ? 'text-green-700 font-medium' : 'text-gray-600'">
                  {{ paso.mensaje }}
                </span>
              </li>
            }
          </ol>

          @if (svc.estadoCarga() === 'completado') {
            <div class="flex gap-3 mt-8">
              <a routerLink="/" class="rounded-lg bg-brand-600 hover:bg-brand-700 text-white
                                       text-sm font-semibold px-5 py-2.5">Ver dashboard</a>
              <button (click)="svc.reiniciarCarga()"
                      class="rounded-lg border border-gray-200 text-gray-600 text-sm px-5 py-2.5
                             hover:bg-gray-50">Importar otro</button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class Importar {
  readonly svc = inject(LiquidacionService);

  onArchivo(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    this.svc.procesarArchivo(file?.name ?? 'archivo.xlsx');
  }

  procesarDemo() {
    this.svc.procesarArchivo('LIQUIDACION JUNIO 2026.xlsx');
  }
}
