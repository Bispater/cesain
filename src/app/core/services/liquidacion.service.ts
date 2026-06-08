import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Incidencia,
  ItemLiquidacion,
  Liquidacion,
  Prevision,
  ResumenValidacion,
} from '../models/liquidacion.model';
import { RAW_EXCEL_TABS, RawExcelTab } from '../data/raw-excel.mock';
import { LIQUIDACION_REPOSITORY } from '../repositories/liquidacion.repository';

export type EstadoCarga =
  | 'idle'
  | 'subiendo'
  | 'validando'
  | 'normalizando'
  | 'completado'
  | 'error';

export interface PasoCarga {
  estado: EstadoCarga;
  mensaje: string;
}

const MESES_ABREV: Record<string, string> = {
  ene: '01', jan: '01', feb: '02', mar: '03', abr: '04', apr: '04',
  may: '05', jun: '06', jul: '07', ago: '08', aug: '08', sep: '09',
  oct: '10', nov: '11', dic: '12', dec: '12',
};

const MESES_NOMBRE: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05',
  junio: '06', julio: '07', agosto: '08', septiembre: '09',
  octubre: '10', noviembre: '11', diciembre: '12',
};

interface Normalizado {
  liquidaciones: Liquidacion[];
  validacion: ResumenValidacion;
}

@Injectable({ providedIn: 'root' })
export class LiquidacionService {
  private readonly repo = inject(LIQUIDACION_REPOSITORY);

  // Normalización inicial del Excel "sucio" (semilla si la DB está vacía).
  private readonly _inicial = this.normalizar([...RAW_EXCEL_TABS]);

  /** Estado canónico EDITABLE, cargado desde la base de datos (Firestore). */
  private readonly _liquidaciones = signal<Liquidacion[]>([]);
  private readonly _validacion = signal<ResumenValidacion>(this._inicial.validacion);

  readonly liquidaciones = this._liquidaciones.asReadonly();
  readonly validacion = this._validacion.asReadonly();
  readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  /** Carga desde la DB; si está vacía, siembra con la normalización del Excel. */
  private async cargar() {
    try {
      const desdeDb = await this.repo.listar();
      if (desdeDb.length) {
        this._liquidaciones.set(desdeDb);
      } else {
        this._liquidaciones.set(this._inicial.liquidaciones);
        await this.repo.guardarTodo(this._inicial.liquidaciones);
      }
    } catch {
      // Sin conexión: usa la normalización local para no quedar en blanco.
      this._liquidaciones.set(this._inicial.liquidaciones);
    } finally {
      this.cargando.set(false);
    }
  }

  /** Filtros de la UI. */
  readonly filtroProfesional = signal<string>('TODOS');
  readonly filtroPeriodo = signal<string>('TODOS');

  /** Estado del flujo simulado de "Subir y Procesar archivo". */
  readonly estadoCarga = signal<EstadoCarga>('idle');
  readonly logCarga = signal<PasoCarga[]>([]);

  // ─────────────────────── Selectores derivados ───────────────────────
  readonly profesionales = computed(() =>
    [...new Set(this.liquidaciones().map((l) => l.profesional))].sort(),
  );

  readonly periodos = computed(() =>
    [...new Set(this.liquidaciones().map((l) => l.periodo))].sort().reverse(),
  );

  readonly liquidacionesFiltradas = computed(() => {
    const prof = this.filtroProfesional();
    const per = this.filtroPeriodo();
    return this.liquidaciones().filter(
      (l) =>
        (prof === 'TODOS' || l.profesional === prof) &&
        (per === 'TODOS' || l.periodo === per),
    );
  });

  readonly resumen = computed(() => {
    const data = this.liquidacionesFiltradas();
    return {
      totalBruto: sum(data, (l) => l.totalBruto),
      totalClinica: sum(data, (l) => l.totalClinica),
      totalProfesional: sum(data, (l) => l.totalProfesional),
      totalPacientes: sum(data, (l) => l.totalPacientes),
      nProfesionales: new Set(data.map((l) => l.profesional)).size,
      nLiquidaciones: data.length,
    };
  });

  readonly ingresosPorEspecialidad = computed(() => {
    const mapa = new Map<string, { valor: number; pacientes: number }>();
    for (const l of this.liquidacionesFiltradas()) {
      const acc = mapa.get(l.especialidad) ?? { valor: 0, pacientes: 0 };
      acc.valor += l.totalBruto;
      acc.pacientes += l.totalPacientes;
      mapa.set(l.especialidad, acc);
    }
    const filas = [...mapa.entries()].map(([especialidad, v]) => ({ especialidad, ...v }));
    const max = Math.max(1, ...filas.map((f) => f.valor));
    return filas
      .sort((a, b) => b.valor - a.valor)
      .map((f) => ({ ...f, porcentaje: Math.round((f.valor / max) * 100) }));
  });

  readonly ingresosPorPrevision = computed(() => {
    const mapa = new Map<Prevision, number>();
    for (const l of this.liquidacionesFiltradas()) {
      for (const it of l.items) {
        mapa.set(it.prevision, (mapa.get(it.prevision) ?? 0) + it.montoBruto);
      }
    }
    return [...mapa.entries()].map(([prevision, valor]) => ({ prevision, valor }));
  });

  // ───────────────────────── Lookups ─────────────────────────
  buscarPorId(id: string): Liquidacion | undefined {
    return this.liquidaciones().find((l) => l.id === id);
  }

  /** Liquidaciones de un período, agrupadas por profesional (para comparar). */
  porPeriodo(periodo: string): Liquidacion[] {
    return this.liquidaciones().filter((l) => l.periodo === periodo);
  }

  // ───────────────────────── Acciones ─────────────────────────
  setFiltroProfesional(v: string) { this.filtroProfesional.set(v); }
  setFiltroPeriodo(v: string) { this.filtroPeriodo.set(v); }

  async procesarArchivo(nombreArchivo: string): Promise<void> {
    this.logCarga.set([]);
    const pasos: PasoCarga[] = [
      { estado: 'subiendo', mensaje: `Subiendo "${nombreArchivo}"...` },
      { estado: 'validando', mensaje: 'Validando pestañas y detectando celdas "NaN"...' },
      { estado: 'normalizando', mensaje: 'Parseando fechas reales y unificando estructura...' },
    ];
    for (const paso of pasos) {
      this.estadoCarga.set(paso.estado);
      this.logCarga.update((l) => [...l, paso]);
      await delay(900);
    }

    // "Ingresa" la pestaña nueva: se normaliza, se antepone y se persiste.
    const { liquidaciones: nuevas, validacion } = this.normalizar([NUEVO_TAB_SIMULADO]);
    const nueva = nuevas[0];
    this._liquidaciones.update((arr) => [nueva, ...arr.filter((l) => l.id !== nueva.id)]);
    void this.repo.guardar(nueva);
    this._validacion.update((v) => ({
      totalCeldas: v.totalCeldas + validacion.totalCeldas,
      celdasDescartadas: v.celdasDescartadas + validacion.celdasDescartadas,
      filasDescartadas: v.filasDescartadas + validacion.filasDescartadas,
      filasOk: v.filasOk + validacion.filasOk,
      incidencias: [...validacion.incidencias, ...v.incidencias],
    }));

    this.estadoCarga.set('completado');
    this.logCarga.update((l) => [
      ...l,
      {
        estado: 'completado',
        mensaje: `✓ ${nueva.profesional} importado · ${nueva.items.length} prestaciones · período real ${nueva.periodo}`,
      },
    ]);
  }

  reiniciarCarga() {
    this.estadoCarga.set('idle');
    this.logCarga.set([]);
  }

  /**
   * Crea una liquidación vacía para un profesional y un período (mes).
   * Si ya existe esa combinación, devuelve la existente. Persiste en la DB.
   */
  crearLiquidacion(prof: {
    id: string;
    nombre: string;
    especialidad: string;
    tipoProfesional: Liquidacion['tipoProfesional'];
    sede: string;
    porcentajeClinica: number;
  }, periodo: string): Liquidacion {
    const id = `${prof.id}_${periodo}`;
    const existente = this.buscarPorId(id);
    if (existente) return existente;

    const nueva: Liquidacion = {
      id,
      profesional: prof.nombre,
      especialidad: prof.especialidad,
      tipoProfesional: prof.tipoProfesional,
      sede: prof.sede,
      periodo,
      archivoOrigen: 'Ingreso manual',
      porcentajeClinica: prof.porcentajeClinica,
      items: [],
      totalBruto: 0,
      totalClinica: 0,
      totalProfesional: 0,
      totalPacientes: 0,
    };
    this._liquidaciones.update((arr) => [nueva, ...arr]);
    void this.repo.guardar(nueva);
    return nueva;
  }

  // ───────────────────── Edición (planilla tipo Excel) ─────────────────────
  /** Reemplaza una liquidación, recalcula sus totales y persiste en la DB. */
  guardarLiquidacion(liq: Liquidacion): Promise<void> {
    const recalculada = recalcularTotales(liq);
    this._liquidaciones.update((arr) =>
      arr.map((l) => (l.id === recalculada.id ? recalculada : l)),
    );
    return this.repo.guardar(recalculada);
  }

  // ───────────────────── Motor de normalización ─────────────────────
  private normalizar(tabs: RawExcelTab[]): Normalizado {
    const incidencias: Incidencia[] = [];
    let totalCeldas = 0;
    let celdasDescartadas = 0;
    let filasDescartadas = 0;
    let filasOk = 0;

    const liquidaciones = tabs.map((tab, idx) => {
      const profesional = limpiarNombre(tab.profesionalRaw);
      const porcentajeClinica = parsePorcentaje(tab.porcentaje);
      const items: ItemLiquidacion[] = [];
      const liqId = slug(tab.pestana);

      // Nombre normalizado (limpieza de prefijos sucios).
      if (tab.profesionalRaw.trim() !== profesional) {
        incidencias.push({
          tipo: 'nombre_normalizado', severidad: 'info', pestana: tab.pestana, profesional,
          detalle: `"${tab.profesionalRaw}" → "${profesional}"`,
        });
      }

      // Archivo vs período real.
      const mesArchivo = mesDesdeNombreArchivo(tab.archivoNombre);
      const mesReal = tab.periodoReal.split('-')[1];
      if (mesArchivo && mesArchivo !== mesReal) {
        incidencias.push({
          tipo: 'archivo_periodo', severidad: 'advertencia', pestana: tab.pestana, profesional,
          detalle: `Archivo "${tab.archivoNombre}" pero los datos son del período ${tab.periodoReal}`,
        });
      }

      let k = 0;
      for (const fila of tab.filas) {
        const valor = limpiarNumero(fila.valor);
        if (valor === null) {
          filasDescartadas++;
          incidencias.push({
            tipo: 'fila_descartada', severidad: 'info', pestana: tab.pestana, profesional,
            detalle: `Prestación "${fila.prestacion}" descartada (sin valor / NaN)`,
          });
          continue;
        }
        filasOk++;

        for (const [fechaTxt, cantRaw] of Object.entries(fila.dias)) {
          totalCeldas++;
          const cantidad = limpiarNumero(cantRaw);
          if (!cantidad || cantidad <= 0) {
            celdasDescartadas++;
            if (esTextoSucio(cantRaw)) {
              incidencias.push({
                tipo: 'celda_nan', severidad: 'advertencia', pestana: tab.pestana, profesional,
                detalle: `Celda "${cantRaw}" en ${fila.prestacion} / ${fechaTxt} ignorada`,
              });
            }
            continue;
          }

          const { iso, fallback } = parseFecha(fechaTxt, tab.periodoReal);
          if (fallback) {
            incidencias.push({
              tipo: 'fecha_fallback', severidad: 'advertencia', pestana: tab.pestana, profesional,
              detalle: `Fecha "${fechaTxt}" no reconocida en ${fila.prestacion}; se asignó ${iso}`,
            });
          }

          const copagoUnit = limpiarNumero(fila.copago) ?? 0;
          items.push({
            id: `${liqId}__${k++}`,
            fecha: iso,
            servicio: fila.prestacion.trim(),
            prevision: normalizarPrevision(fila.prevision, fila.prestacion),
            cantidad,
            valorUnitario: valor,
            montoBruto: valor * cantidad,
            copago: copagoUnit * cantidad,
          });
        }
      }

      const totalBruto = sum(items, (i) => i.montoBruto);
      const totalClinica = Math.round(totalBruto * porcentajeClinica);
      const totalPacientes = sum(items, (i) => i.cantidad);

      return {
        id: liqId || `liq_${idx}`,
        profesional,
        especialidad: tab.especialidad,
        tipoProfesional: tab.tipo,
        sede: tab.sede,
        periodo: tab.periodoReal,
        archivoOrigen: tab.archivoNombre,
        porcentajeClinica,
        items,
        totalBruto,
        totalClinica,
        totalProfesional: totalBruto - totalClinica,
        totalPacientes,
      } satisfies Liquidacion;
    });

    return {
      liquidaciones,
      validacion: { totalCeldas, celdasDescartadas, filasDescartadas, filasOk, incidencias },
    };
  }
}

// ───────────────────────── Helpers puros ─────────────────────────
function sum<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + fn(x), 0);
}

/** Recalcula montos de cada ítem y los totales de la liquidación. */
export function recalcularTotales(liq: Liquidacion): Liquidacion {
  const items = liq.items.map((it) => ({
    ...it,
    montoBruto: it.valorUnitario * it.cantidad,
  }));
  const totalBruto = sum(items, (i) => i.montoBruto);
  const totalClinica = Math.round(totalBruto * liq.porcentajeClinica);
  return {
    ...liq,
    items,
    totalBruto,
    totalClinica,
    totalProfesional: totalBruto - totalClinica,
    totalPacientes: sum(items, (i) => i.cantidad),
  };
}

let _nuevoId = 0;
/** Genera un id único para ítems creados a mano en la planilla. */
export function nuevoItemId(liqId: string): string {
  return `${liqId}__new_${_nuevoId++}`;
}

function esTextoSucio(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const t = v.trim().toLowerCase();
  return t === 'nan' || t === '#####' || t === '-';
}

function limpiarNumero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const txt = v.trim().toLowerCase();
  if (txt === '' || txt === 'nan' || txt === '#####' || txt === '-') return null;
  const n = Number(txt.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function limpiarNombre(raw: string): string {
  return raw
    .replace(/^(dr\.?|dra\.?|kine\.?|tm\.?)\s*/i, '')
    .replace(/\s+20\d{2}$/, '') // quita sufijos de año en nombres de pestaña
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePorcentaje(p: string): number {
  const n = limpiarNumero(p);
  if (n === null) return 0;
  return n > 1 ? n / 100 : n;
}

function normalizarPrevision(raw: string, prestacion: string): Prevision {
  const t = `${raw} ${prestacion}`.toUpperCase();
  if (t.includes('ISAPRE')) return 'ISAPRE';
  if (t.includes('FONASA') || t.includes('BONO')) return 'FONASA';
  return 'PARTICULAR';
}

/** Convierte "06-may", "27-05-2026", "07-apr" a ISO; marca si usó fallback. */
function parseFecha(txt: string, periodoReal: string): { iso: string; fallback: boolean } {
  const [anioReal] = periodoReal.split('-');

  const completo = txt.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (completo) {
    const [, d, m, y] = completo;
    return { iso: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`, fallback: false };
  }

  const abrev = txt.match(/^(\d{1,2})-([a-z]{3})/i);
  if (abrev) {
    const [, d, mesTxt] = abrev;
    const mes = MESES_ABREV[mesTxt.toLowerCase()];
    if (mes) return { iso: `${anioReal}-${mes}-${d.padStart(2, '0')}`, fallback: false };
  }

  return { iso: `${periodoReal}-01`, fallback: true };
}

function mesDesdeNombreArchivo(nombre: string): string | null {
  const t = nombre.toLowerCase();
  for (const [n, num] of Object.entries(MESES_NOMBRE)) {
    if (t.includes(n)) return num;
  }
  return null;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

const NUEVO_TAB_SIMULADO: RawExcelTab = {
  pestana: 'DR. FRETZ MEOLA',
  profesionalRaw: 'DR. FRETZ MEOLA RODRIGUEZ',
  especialidad: 'Traumatología',
  tipo: 'MEDICO',
  sede: 'Quintero',
  porcentaje: '25%',
  archivoNombre: 'LIQUIDACION JUNIO 2026.xlsx',
  periodoReal: '2026-05',
  filas: [
    { prestacion: 'Consulta Particular', prevision: 'PARTICULAR', valor: 35000, copago: 35000, dias: { '08-may': 10, '15-may': 7, '22-may': 6 } },
    { prestacion: 'Infiltración', prevision: 'PARTICULAR', valor: 60000, copago: 60000, dias: { '15-may': 2, '22-may': 1 } },
    { prestacion: 'Plasma Rico en Plaquetas', prevision: 'PARTICULAR', valor: 120000, copago: 120000, dias: { '22-may': 1 } },
  ],
};
