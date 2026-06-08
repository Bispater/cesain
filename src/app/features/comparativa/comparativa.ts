import { Component, computed, inject, signal } from '@angular/core';
import { LiquidacionService } from '../../core/services/liquidacion.service';
import { nombrePeriodo } from '../../core/models/liquidacion.model';
import { ClpPipe } from '../../shared/pipes/clp.pipe';

interface FilaComparativa {
  profesional: string;
  especialidad: string;
  brutoA: number;
  brutoB: number;
  pacientesA: number;
  pacientesB: number;
  varBruto: number | null;   // % variación A vs B
  varPacientes: number | null;
}

@Component({
  selector: 'app-comparativa',
  imports: [ClpPipe],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Comparativa de períodos</h1>
      <p class="text-sm text-gray-500">
        Compara ingresos y pacientes entre dos períodos (ej. Mayo 2026 vs Mayo 2025).
      </p>
    </header>

    <!-- Selectores -->
    <div class="flex flex-wrap items-end gap-4 mb-6">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Período actual</label>
        <select [value]="periodoA()" (change)="periodoA.set($any($event.target).value)"
                class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                       focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
          @for (p of svc.periodos(); track p) { <option [value]="p">{{ nombrePeriodo(p) }}</option> }
        </select>
      </div>
      <span class="pb-2 text-gray-400">vs</span>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Período de comparación</label>
        <select [value]="periodoB()" (change)="periodoB.set($any($event.target).value)"
                class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                       focus:border-brand-400 focus:ring-2 focus:ring-brand-200 outline-none">
          @for (p of svc.periodos(); track p) { <option [value]="p">{{ nombrePeriodo(p) }}</option> }
        </select>
      </div>
    </div>

    <!-- Tarjetas de totales -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">Ingreso bruto {{ nombrePeriodo(periodoA()) }}</p>
        <p class="text-2xl font-extrabold text-gray-800 mt-1">{{ totales().brutoA | clp }}</p>
      </div>
      <div class="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
        <p class="text-sm text-gray-500">Ingreso bruto {{ nombrePeriodo(periodoB()) }}</p>
        <p class="text-2xl font-extrabold text-gray-800 mt-1">{{ totales().brutoB | clp }}</p>
      </div>
      <div class="rounded-2xl p-5 shadow-sm border"
           [class]="totales().varBruto !== null && totales().varBruto! >= 0
             ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'">
        <p class="text-sm text-gray-500">Variación total</p>
        <p class="text-2xl font-extrabold mt-1"
           [class]="totales().varBruto !== null && totales().varBruto! >= 0 ? 'text-green-600' : 'text-red-600'">
          {{ fmtVar(totales().varBruto) }}
        </p>
      </div>
    </div>

    <!-- Tabla por profesional -->
    <div class="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-brand-50 text-brand-800 text-left">
          <tr>
            <th class="px-4 py-3 font-semibold">Profesional</th>
            <th class="px-4 py-3 font-semibold text-right">{{ nombrePeriodo(periodoA()) }}</th>
            <th class="px-4 py-3 font-semibold text-right">{{ nombrePeriodo(periodoB()) }}</th>
            <th class="px-4 py-3 font-semibold text-right">Δ Ingreso</th>
            <th class="px-4 py-3 font-semibold text-right">Pac. (A / B)</th>
            <th class="px-4 py-3 font-semibold text-right">Δ Pacientes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          @for (f of filas(); track f.profesional) {
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-800">{{ f.profesional }}</p>
                <p class="text-xs text-gray-400">{{ f.especialidad }}</p>
              </td>
              <td class="px-4 py-3 text-right text-gray-700">{{ f.brutoA | clp }}</td>
              <td class="px-4 py-3 text-right text-gray-500">{{ f.brutoB | clp }}</td>
              <td class="px-4 py-3 text-right font-semibold" [class]="colorVar(f.varBruto)">
                {{ fmtVar(f.varBruto) }}
              </td>
              <td class="px-4 py-3 text-right text-gray-600">{{ f.pacientesA }} / {{ f.pacientesB }}</td>
              <td class="px-4 py-3 text-right font-medium" [class]="colorVar(f.varPacientes)">
                {{ fmtVar(f.varPacientes) }}
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="px-4 py-10 text-center text-gray-400">
              No hay datos en estos períodos.
            </td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class Comparativa {
  readonly svc = inject(LiquidacionService);
  readonly nombrePeriodo = nombrePeriodo;

  private periodosDisponibles = this.svc.periodos();
  readonly periodoA = signal(this.periodosDisponibles[0] ?? '');
  readonly periodoB = signal(this.periodosDisponibles[1] ?? this.periodosDisponibles[0] ?? '');

  readonly filas = computed<FilaComparativa[]>(() => {
    const a = agrupar(this.svc.porPeriodo(this.periodoA()));
    const b = agrupar(this.svc.porPeriodo(this.periodoB()));
    const nombres = [...new Set([...a.keys(), ...b.keys()])].sort();

    return nombres.map((prof) => {
      const da = a.get(prof);
      const db = b.get(prof);
      const brutoA = da?.bruto ?? 0;
      const brutoB = db?.bruto ?? 0;
      const pacientesA = da?.pacientes ?? 0;
      const pacientesB = db?.pacientes ?? 0;
      return {
        profesional: prof,
        especialidad: da?.especialidad ?? db?.especialidad ?? '',
        brutoA, brutoB, pacientesA, pacientesB,
        varBruto: variacion(brutoA, brutoB),
        varPacientes: variacion(pacientesA, pacientesB),
      };
    });
  });

  readonly totales = computed(() => {
    const f = this.filas();
    const brutoA = f.reduce((s, x) => s + x.brutoA, 0);
    const brutoB = f.reduce((s, x) => s + x.brutoB, 0);
    return { brutoA, brutoB, varBruto: variacion(brutoA, brutoB) };
  });

  fmtVar(v: number | null): string {
    if (v === null) return '—';
    const s = v >= 0 ? '+' : '';
    return `${s}${v.toFixed(1)}%`;
  }

  colorVar(v: number | null): string {
    if (v === null) return 'text-gray-400';
    return v >= 0 ? 'text-green-600' : 'text-red-600';
  }
}

// ---- helpers ----
function agrupar(liqs: { profesional: string; especialidad: string; totalBruto: number; totalPacientes: number }[]) {
  const mapa = new Map<string, { especialidad: string; bruto: number; pacientes: number }>();
  for (const l of liqs) {
    const acc = mapa.get(l.profesional) ?? { especialidad: l.especialidad, bruto: 0, pacientes: 0 };
    acc.bruto += l.totalBruto;
    acc.pacientes += l.totalPacientes;
    mapa.set(l.profesional, acc);
  }
  return mapa;
}

function variacion(a: number, b: number): number | null {
  if (b === 0) return a === 0 ? 0 : null; // sin base de comparación
  return ((a - b) / b) * 100;
}
