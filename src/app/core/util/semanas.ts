/** Utilidades de fechas/semanas para las planillas (CESAIN y APSORAD). */
export interface Semana {
  dias: string[]; // 7 fechas ISO (lunes a domingo)
  inicio: string;
  fin: string;
  label: string;
}

const DOW = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Semanas (lunes-domingo) que cubren el mes 'YYYY-MM'. */
export function semanasDeMes(periodo: string): Semana[] {
  const [y, m] = periodo.split('-').map(Number);
  const ultimo = new Date(y, m, 0);
  const cursor = new Date(y, m - 1, 1);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // retrocede al lunes
  const semanas: Semana[] = [];
  while (cursor <= ultimo) {
    const dias: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      dias.push(isoLocal(d));
    }
    semanas.push({
      dias,
      inicio: dias[0],
      fin: dias[6],
      label: `${dias[0].slice(8, 10)}/${dias[0].slice(5, 7)}–${dias[6].slice(8, 10)}/${dias[6].slice(5, 7)}`,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return semanas;
}

/** Día de la semana abreviado (lu..do) de una fecha ISO. */
export function diaSemana(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return DOW[(new Date(y, m - 1, d).getDay() + 6) % 7];
}

/** ¿La fecha ISO pertenece al período 'YYYY-MM'? */
export function enMes(iso: string, periodo: string): boolean {
  return iso.slice(0, 7) === periodo;
}
