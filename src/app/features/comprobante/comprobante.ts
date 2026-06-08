import { Component, computed, inject, input } from '@angular/core';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';

interface FilaPivot {
  etiqueta: string;
  valorUnitario: number;
  porFecha: Record<string, number>;
  totalCantidad: number;
  totalMonto: number;
  montoClinica: number;
}

@Component({
  selector: 'app-comprobante',
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
        <a routerLink="/liquidaciones" class="text-brand-200 hover:text-white text-sm">← Volver</a>
        <span class="text-sm font-medium">Comprobante de liquidación</span>
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
            <p class="font-bold text-gray-700">LIQUIDACIÓN {{ nombrePeriodo(l.periodo) | uppercase }}</p>
            <p class="text-xs text-gray-500">{{ l.especialidad }} · {{ l.sede }}</p>
            <p class="text-xs text-gray-400">Retención clínica: {{ l.porcentajeClinica * 100 }}%</p>
          </div>
        </div>

        <!-- Matriz prestación × día -->
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-brand-100 text-brand-900 text-[11px]">
              <th class="border border-gray-400 px-2 py-1 text-left">PRESTACIÓN</th>
              @for (f of fechas(); track f) {
                <th class="border border-gray-400 px-1 py-1 text-center">{{ f | slice:8:10 }}-{{ f | slice:5:7 }}</th>
              }
              <th class="border border-gray-400 px-2 py-1 text-center">TOTAL</th>
              <th class="border border-gray-400 px-2 py-1 text-right">TOTAL $</th>
              <th class="border border-gray-400 px-2 py-1 text-right">{{ l.porcentajeClinica * 100 }}%</th>
            </tr>
          </thead>
          <tbody>
            @for (row of pivot(); track row.etiqueta) {
              <tr>
                <td class="border border-gray-300 px-2 py-1 font-medium">{{ row.etiqueta }}</td>
                @for (f of fechas(); track f) {
                  <td class="border border-gray-300 px-1 py-1 text-center text-gray-600">
                    {{ row.porFecha[f] || '' }}
                  </td>
                }
                <td class="border border-gray-300 px-2 py-1 text-center font-semibold">{{ row.totalCantidad }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right">{{ row.totalMonto | clp }}</td>
                <td class="border border-gray-300 px-2 py-1 text-right text-amber-700">{{ row.montoClinica | clp }}</td>
              </tr>
            }
            <tr class="bg-brand-100 text-brand-900 font-bold">
              <td class="border border-gray-400 px-2 py-1">TOTAL</td>
              <td class="border border-gray-400" [attr.colspan]="fechas().length"></td>
              <td class="border border-gray-400 px-2 py-1 text-center">{{ l.totalPacientes }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ l.totalBruto | clp }}</td>
              <td class="border border-gray-400 px-2 py-1 text-right">{{ l.totalClinica | clp }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Totales finales -->
        <div class="grid grid-cols-2 gap-8 mt-8 max-w-md">
          <div class="flex justify-between border border-gray-300 px-3 py-2">
            <span class="font-semibold">TOTAL DOCTOR</span>
            <span class="font-bold">{{ l.totalProfesional | clp }}</span>
          </div>
          <div class="flex justify-between border border-gray-300 px-3 py-2">
            <span class="font-semibold">TOTAL ARRIENDO</span>
            <span class="font-bold text-amber-700">{{ l.totalClinica | clp }}</span>
          </div>
        </div>

        <!-- Firmas -->
        <div class="grid grid-cols-2 gap-16 mt-20 text-center text-xs">
          <div class="border-t border-gray-500 pt-2 font-semibold">{{ l.profesional | uppercase }}</div>
          <div class="border-t border-gray-500 pt-2 font-semibold">YOLANDA AROS</div>
        </div>
        <p class="text-[10px] text-gray-400 mt-8">
          Generado desde CESAIN · origen: {{ l.archivoOrigen }} · período real {{ l.periodo }}
        </p>
      </div>
    } @else {
      <div class="p-10 text-center text-gray-500">
        Liquidación no encontrada. <a routerLink="/liquidaciones" class="text-brand-600 underline">Volver</a>
      </div>
    }
  `,
})
export class Comprobante {
  private svc = inject(LiquidacionService);
  readonly nombrePeriodo = nombrePeriodo;

  /** `id` llega por la URL gracias a withComponentInputBinding(). */
  readonly id = input<string>('');

  readonly liq = computed(() => this.svc.buscarPorId(this.id()));

  readonly fechas = computed(() => {
    const l = this.liq();
    if (!l) return [];
    return [...new Set(l.items.map((i) => i.fecha))].sort();
  });

  readonly pivot = computed<FilaPivot[]>(() => {
    const l = this.liq();
    if (!l) return [];
    const mapa = new Map<string, FilaPivot>();
    for (const it of l.items) {
      const key = `${it.servicio}|${it.prevision}|${it.valorUnitario}`;
      const row =
        mapa.get(key) ??
        {
          etiqueta: `${it.servicio} (${it.prevision}) · $${it.valorUnitario.toLocaleString('es-CL')}`,
          valorUnitario: it.valorUnitario,
          porFecha: {},
          totalCantidad: 0,
          totalMonto: 0,
          montoClinica: 0,
        };
      row.porFecha[it.fecha] = (row.porFecha[it.fecha] ?? 0) + it.cantidad;
      row.totalCantidad += it.cantidad;
      row.totalMonto += it.montoBruto;
      row.montoClinica = Math.round(row.totalMonto * l.porcentajeClinica);
      mapa.set(key, row);
    }
    return [...mapa.values()];
  });

  imprimir() {
    window.print();
  }
}
