import { Component, computed, input } from '@angular/core';
import { ClpPipe } from '../pipes/clp.pipe';

export interface DonutSegmento {
  label: string;
  valor: number;
  /** Color CSS (hex / rgb), no clase Tailwind. */
  color: string;
}

/**
 * Gráfico circular (donut) con leyenda: cada segmento muestra su monto en
 * pesos chilenos y su porcentaje del total. Construido con conic-gradient,
 * sin librerías externas.
 */
@Component({
  selector: 'app-donut',
  imports: [ClpPipe],
  template: `
    <div class="flex items-center gap-5">
      <div class="relative shrink-0" [style.width.px]="tamano()" [style.height.px]="tamano()">
        <div class="h-full w-full rounded-full" [style.background]="gradiente()"></div>
        <div class="absolute rounded-full bg-white grid place-items-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
             [style.inset.px]="grosor()">
          <div class="text-center px-1">
            <p class="text-[10px] uppercase tracking-wide text-gray-400 leading-none">{{ etiquetaCentro() }}</p>
            <p class="text-sm font-extrabold text-gray-800 leading-tight mt-0.5">{{ total() | clp }}</p>
          </div>
        </div>
      </div>
      <ul class="flex-1 min-w-0 space-y-2">
        @for (s of conPorcentaje(); track s.label) {
          <li class="flex items-center gap-2 text-xs">
            <span class="h-3 w-3 rounded-sm shrink-0" [style.background]="s.color"></span>
            <span class="text-gray-700 font-medium truncate flex-1">{{ s.label }}</span>
            <span class="tabular-nums text-gray-400 w-9 text-right">{{ s.pct }}%</span>
            <span class="tabular-nums font-semibold text-gray-800 w-24 text-right">{{ s.valor | clp }}</span>
          </li>
        } @empty {
          <li class="text-sm text-gray-400">Sin datos para el filtro actual.</li>
        }
      </ul>
    </div>
  `,
})
export class Donut {
  readonly segmentos = input<DonutSegmento[]>([]);
  readonly tamano = input(150);
  readonly grosor = input(26);
  readonly etiquetaCentro = input('Total');

  readonly total = computed(() => this.segmentos().reduce((s, x) => s + x.valor, 0));

  readonly conPorcentaje = computed(() => {
    const t = this.total();
    return this.segmentos()
      .filter((s) => s.valor > 0)
      .map((s) => ({ ...s, pct: t > 0 ? Math.round((s.valor / t) * 100) : 0 }));
  });

  readonly gradiente = computed(() => {
    const t = this.total();
    if (t <= 0) return '#e5e7eb';
    let acc = 0;
    const partes: string[] = [];
    for (const s of this.segmentos()) {
      if (s.valor <= 0) continue;
      const ini = (acc / t) * 360;
      acc += s.valor;
      const fin = (acc / t) * 360;
      partes.push(`${s.color} ${ini}deg ${fin}deg`);
    }
    return `conic-gradient(${partes.join(', ')})`;
  });
}
