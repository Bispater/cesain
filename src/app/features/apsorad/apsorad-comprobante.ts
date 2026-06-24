import { Component, computed, inject, input } from '@angular/core';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApsoradService } from '../../core/services/apsorad.service';
import { LiquidacionApsorad, cantidadItem, cobradoApsorad } from '../../core/models/apsorad.model';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';

interface FilaInforme {
  nombre: string;
  prevision: string;
  cobradoUnit: number;
  porFecha: Record<string, number>;
  totalCantidad: number;
  totalMonto: number;
  apsorad: number;
  cesain: number;
}

/**
 * Comprobante imprimible (PDF) de una liquidación APSORAD.
 * Espejo de `comprobante.ts` (liquidaciones generales): fuera del Shell,
 * con estilos @media print y window.print() para "Guardar como PDF".
 */
@Component({
  selector: 'app-apsorad-comprobante',
  imports: [ClpPipe, RouterLink, UpperCasePipe, SlicePipe],
  styles: [`
    @media print {
      .no-print { display: none !important; }
      .hoja { box-shadow: none !important; margin: 0 !important; }
      @page { size: landscape; margin: 12mm; }
    }
  `],
  template: `
    @if (liq(); as l) {
      <!-- Barra de acciones (no se imprime) -->
      <div class="no-print bg-brand-800 text-white px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
        <a routerLink="/apsorad" class="text-brand-200 hover:text-white text-sm">← Volver</a>
        <span class="text-sm font-medium">Comprobante APSORAD</span>
        <button (click)="imprimir()"
                class="ml-auto rounded-lg bg-accent text-brand-900 text-sm font-semibold px-4 py-2
                       hover:brightness-95">⎙ Imprimir / Guardar PDF</button>
      </div>

      <!-- Hoja -->
      <div class="hoja bg-white max-w-5xl mx-auto my-6 p-10 shadow-lg text-[13px] text-gray-800">
        <!-- Encabezado -->
        <div class="flex items-start justify-between border-b-2 border-brand-700 pb-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="h-12 w-12 rounded-lg bg-accent grid place-items-center">
              <span class="text-2xl font-extrabold text-brand-800">C</span>
            </div>
            <div>
              <p class="text-xl font-extrabold text-brand-800 leading-none">CESAIN</p>
              <p class="text-xs text-gray-500">Centro de Salud Integral</p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold text-gray-700">
              LIQUIDACIÓN APSORAD · {{ l.servicio === 'ECOGRAFIA' ? 'ECOGRAFÍAS' : 'RAYOS' }}
            </p>
            <p class="text-xs text-gray-500">{{ l.sede }} · {{ nombrePeriodo(l.periodo) | uppercase }}</p>
            <p class="text-xs text-gray-400">Pago a APSORAD: {{ l.porcentaje * 100 }}% del valor Fonasa</p>
          </div>
        </div>

        <!-- Matriz prestación × día -->
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-brand-100 text-brand-900 text-[11px]">
              <th class="border border-gray-400 px-2 py-1 text-left">PRESTACIÓN</th>
              <th class="border border-gray-400 px-2 py-1 text-center">PREV.</th>
              @for (f of fechas(); track f) {
                <th class="border border-gray-400 px-1 py-1 text-center">{{ f | slice:8:10 }}-{{ f | slice:5:7 }}</th>
              }
              <th class="border border-gray-400 px-2 py-1 text-center">CANT.</th>
              <th class="border border-gray-400 px-2 py-1 text-right">PERCIBIDO $</th>
              <th class="border border-gray-400 px-2 py-1 text-right">APSORAD</th>
              <th class="border border-gray-400 px-2 py-1 text-right">CESAIN</th>
            </tr>
          </thead>
          <tbody>
            @for (row of filas(); track $index) {
              <tr>
                <td class="border border-gray-300 px-2 py-1 font-medium">{{ row.nombre }}</td>
                <td class="border border-gray-300 px-2 py-1 text-center text-gray-600">{{ row.prevision }}</td>
                @for (f of fechas(); track f) {
                  <td class="border border-gray-300 px-1 py-1 text-center text-gray-600">
                    {{ row.porFecha[f] || '' }}
                  </td>
                }
                <td class="border border-gray-300 px-2 py-1 text-center font-semibold">{{ row.totalCantidad }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right">{{ row.totalMonto | clp }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right text-brand-700">{{ row.apsorad | clp }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right text-green-700">{{ row.cesain | clp }}</td>
              </tr>
            } @empty {
              <tr><td class="border border-gray-300 px-2 py-3 text-center text-gray-400" [attr.colspan]="fechas().length + 5">Sin prestaciones cargadas.</td></tr>
            }
            <tr class="bg-brand-100 text-brand-900 font-bold">
              <td class="border border-gray-400 px-2 py-1">TOTAL</td>
              <td class="border border-gray-400"></td>
              <td class="border border-gray-400" [attr.colspan]="fechas().length"></td>
              <td class="border border-gray-400 px-2 py-1 text-center">{{ l.totalCantidad }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ l.totalCobrado | clp }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ l.totalApsorad | clp }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ l.totalCesain | clp }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totales finales -->
        <div class="grid grid-cols-3 gap-6 mt-8 max-w-2xl">
          <div class="flex flex-col border border-gray-300 px-3 py-2">
            <span class="text-[11px] text-gray-500">TOTAL PERCIBIDO</span>
            <span class="font-bold">{{ l.totalCobrado | clp }}</span>
          </div>
          <div class="flex flex-col border border-gray-300 px-3 py-2">
            <span class="text-[11px] text-gray-500">PAGO APSORAD</span>
            <span class="font-bold text-brand-700">{{ l.totalApsorad | clp }}</span>
          </div>
          <div class="flex flex-col border border-gray-300 px-3 py-2">
            <span class="text-[11px] text-gray-500">MARGEN CESAIN</span>
            <span class="font-bold text-green-700">{{ l.totalCesain | clp }}</span>
          </div>
        </div>

        <!-- Firmas -->
        <div class="grid grid-cols-2 gap-16 mt-20 text-center text-xs">
          <div class="border-t border-gray-500 pt-2 font-semibold">APSORAD</div>
          <div class="border-t border-gray-500 pt-2 font-semibold">YOLANDA AROS</div>
        </div>
        <p class="text-[10px] text-gray-400 mt-8">
          Generado desde CESAIN · APSORAD · {{ l.servicio }} · {{ l.sede }} · período {{ l.periodo }}
        </p>
      </div>
    } @else {
      <div class="p-10 text-center text-gray-500">
        Liquidación no encontrada. <a routerLink="/apsorad" class="text-brand-600 underline">Volver</a>
      </div>
    }
  `,
})
export class ApsoradComprobante {
  private svc = inject(ApsoradService);
  readonly nombrePeriodo = nombrePeriodo;

  /** `id` llega por la URL gracias a withComponentInputBinding(). */
  readonly id = input<string>('');

  readonly liq = computed(() => this.svc.buscarPorId(this.id()));

  readonly fechas = computed(() => {
    const l = this.liq();
    if (!l) return [];
    const set = new Set<string>();
    for (const it of l.items) for (const f of Object.keys(it.celdas ?? {})) set.add(f);
    return [...set].sort();
  });

  readonly filas = computed<FilaInforme[]>(() => {
    const l = this.liq();
    if (!l) return [];
    return l.items
      .map((it) => {
        const cant = cantidadItem(it);
        const cobradoUnit = cobradoApsorad(it);
        const totalMonto = cant * cobradoUnit;
        const apsorad = Math.round(cant * it.valorFonasa * (it.porcentaje ?? l.porcentaje));
        return {
          nombre: it.nombre,
          prevision: it.prevision,
          cobradoUnit,
          porFecha: it.celdas ?? {},
          totalCantidad: cant,
          totalMonto,
          apsorad,
          cesain: totalMonto - apsorad,
        };
      })
      .filter((f) => f.totalCantidad > 0);
  });

  imprimir() {
    window.print();
  }
}
