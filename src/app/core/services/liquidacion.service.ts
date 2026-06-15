import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Incidencia,
  ItemLiquidacion,
  Liquidacion,
  Prevision,
  ResumenValidacion,
} from '../models/liquidacion.model';
import { RAW_EXCEL_TABS, RawExcelTab } from '../data/raw-excel.mock';
import { Profesional } from '../models/profesional.model';
import { LIQUIDACION_REPOSITORY } from '../repositories/liquidacion.repository';
import { AuthService } from './auth.service';
import { HistorialService } from './historial.service';

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
  private readonly auth = inject(AuthService);
  private readonly historial = inject(HistorialService);

  // Normalización inicial del Excel "sucio" (semilla si la DB está vacía).
  private readonly _inicial = this.normalizar([...RAW_EXCEL_TABS]);

  /** Estado canónico EDITABLE, cargado desde la base de datos (Firestore). */
  private readonly _liquidaciones = signal<Liquidacion[]>([]);
  private readonly _validacion = signal<ResumenValidacion>(this._inicial.validacion);

  readonly liquidaciones = this._liquidaciones.asReadonly();
  readonly validacion = this._validacion.asReadonly();
  readonly cargando = signal(true);

  /** Activas (no en papelera) y eliminadas (papelera). */
  readonly activas = computed(() => this._liquidaciones().filter((l) => !l.eliminada));
  readonly eliminadas = computed(() =>
    this._liquidaciones()
      .filter((l) => l.eliminada)
      .sort((a, b) => (b.eliminadaEn ?? '').localeCompare(a.eliminadaEn ?? '')),
  );

  constructor() {
    this.cargar();
  }

  /** Carga las liquidaciones desde la DB (sin sembrar datos de ejemplo). */
  private async cargar() {
    try {
      this._liquidaciones.set(await this.repo.listar());
    } catch {
      this._liquidaciones.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  /** Estado del flujo simulado de "Subir y Procesar archivo". */
  readonly estadoCarga = signal<EstadoCarga>('idle');
  readonly logCarga = signal<PasoCarga[]>([]);

  // ─────────────────────── Selectores derivados (solo activas) ───────────────────────
  readonly profesionales = computed(() =>
    [...new Set(this.activas().map((l) => l.profesional))].sort(),
  );

  readonly periodos = computed(() =>
    [...new Set(this.activas().map((l) => l.periodo))].sort().reverse(),
  );

  /** Activas filtradas por profesional y período ('TODOS' = sin filtro). */
  filtrar(prof: string, per: string): Liquidacion[] {
    return this.activas().filter(
      (l) =>
        (prof === 'TODOS' || l.profesional === prof) &&
        (per === 'TODOS' || l.periodo === per),
    );
  }

  resumenDe(data: Liquidacion[]) {
    return {
      totalBruto: sum(data, (l) => l.totalBruto),
      totalClinica: sum(data, (l) => l.totalClinica),
      totalProfesional: sum(data, (l) => l.totalProfesional),
      totalPacientes: sum(data, (l) => l.totalPacientes),
      nProfesionales: new Set(data.map((l) => l.profesional)).size,
      nLiquidaciones: data.length,
    };
  }

  ingresosPorEspecialidadDe(data: Liquidacion[]) {
    const mapa = new Map<string, { valor: number; pacientes: number }>();
    for (const l of data) {
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
  }

  ingresosPorPrevisionDe(data: Liquidacion[]) {
    const mapa = new Map<Prevision, number>();
    for (const l of data) {
      for (const it of l.items) {
        mapa.set(it.prevision, (mapa.get(it.prevision) ?? 0) + it.montoBruto);
      }
    }
    return [...mapa.entries()].map(([prevision, valor]) => ({ prevision, valor }));
  }

  // ───────────────────────── Lookups ─────────────────────────
  buscarPorId(id: string): Liquidacion | undefined {
    return this.liquidaciones().find((l) => l.id === id);
  }

  /** Liquidaciones de un período, agrupadas por profesional (para comparar). */
  porPeriodo(periodo: string): Liquidacion[] {
    return this.activas().filter((l) => l.periodo === periodo);
  }

  // ───────────────────── Papelera (borrado lógico) ─────────────────────
  /** Envía una liquidación a la papelera (recuperable). */
  async eliminarLiquidacion(id: string): Promise<void> {
    const l = this.buscarPorId(id);
    if (!l) return;
    const eliminada: Liquidacion = {
      ...l,
      eliminada: true,
      eliminadaEn: new Date().toISOString(),
      eliminadaPor: this.auth.usuario()?.email ?? '—',
    };
    this._liquidaciones.update((arr) => arr.map((x) => (x.id === id ? eliminada : x)));
    await this.repo.guardar(eliminada);
    void this.historial.registrarAccion(eliminada, 'Enviada a la papelera');
  }

  /** Restaura una liquidación desde la papelera. */
  async restaurarLiquidacion(id: string): Promise<void> {
    const l = this.buscarPorId(id);
    if (!l) return;
    const restaurada: Liquidacion = { ...l, eliminada: false };
    delete restaurada.eliminadaEn; // omitidos (evita undefined en Firestore)
    delete restaurada.eliminadaPor;
    this._liquidaciones.update((arr) => arr.map((x) => (x.id === id ? restaurada : x)));
    await this.repo.guardar(restaurada);
    void this.historial.registrarAccion(restaurada, 'Restaurada desde la papelera');
  }

  /** Elimina definitivamente (no recuperable). */
  async eliminarDefinitivo(id: string): Promise<void> {
    const l = this.buscarPorId(id);
    if (l) void this.historial.registrarAccion(l, 'Eliminada definitivamente');
    this._liquidaciones.update((arr) => arr.filter((x) => x.id !== id));
    await this.repo.eliminar(id);
  }

  // ───────────────────────── Acciones ─────────────────────────
  /**
   * Crea una liquidación vacía para un profesional, un período (mes) y una sede.
   * La combinación profesional+período+sede es única: el mismo profesional puede
   * tener liquidaciones separadas en Quintero y Puchuncaví el mismo mes.
   * Si ya existe esa combinación (activa), devuelve la existente. Persiste en la DB.
   */
  crearLiquidacion(prof: {
    id: string;
    nombre: string;
    especialidad: string;
    tipoProfesional: Liquidacion['tipoProfesional'];
    porcentajeClinica: number;
  }, periodo: string, sede: string): Liquidacion {
    const existente = this.activas().find(
      (l) => l.profesionalId === prof.id && l.periodo === periodo && l.sede === sede,
    );
    if (existente) return existente;

    // Id único; el sufijo numérico evita chocar con una liquidación en papelera.
    let id = `${prof.id}_${periodo}_${slug(sede)}`;
    for (let n = 2; this.buscarPorId(id); n++) id = `${prof.id}_${periodo}_${slug(sede)}_${n}`;

    const nueva: Liquidacion = {
      id,
      profesional: prof.nombre,
      profesionalId: prof.id,
      especialidad: prof.especialidad,
      tipoProfesional: prof.tipoProfesional,
      sede,
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

  /**
   * Asocia cada liquidación a un profesional del catálogo (por ID, o por nombre
   * si aún no tiene) y sincroniza el nombre mostrado con el del catálogo.
   * Persiste solo las que cambian. Idempotente (no hace nada si ya están ok).
   */
  sincronizarProfesionales(profs: Profesional[]): void {
    if (!profs.length || !this._liquidaciones().length) return;
    let cambio = false;
    const actualizadas = this._liquidaciones().map((l) => {
      if (l.eliminada) return l; // lo que está en papelera no se re-asocia
      let prof = l.profesionalId ? profs.find((p) => p.id === l.profesionalId) : undefined;
      if (!prof) prof = emparejarProfesional(l.profesional, profs);
      // Especialidad del catálogo (si el profesional la tiene definida).
      const esp = prof?.especialidad?.trim() ? prof.especialidad : l.especialidad;
      if (
        prof &&
        (l.profesionalId !== prof.id || l.profesional !== prof.nombre || l.especialidad !== esp)
      ) {
        cambio = true;
        const nueva = { ...l, profesionalId: prof.id, profesional: prof.nombre, especialidad: esp };
        void this.repo.guardar(nueva);
        return nueva;
      }
      return l;
    });
    if (cambio) this._liquidaciones.set(actualizadas);
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

/** Tokens normalizados de un nombre (sin tildes, sin títulos, sin iniciales). */
function tokens(nombre: string): string[] {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !['dr', 'dra', 'klgo', 'klga', 'kine', 'tm', 'tec', 'md'].includes(t));
}

/** Empareja un nombre de liquidación con el profesional de mayor coincidencia. */
function emparejarProfesional(nombre: string, profs: Profesional[]): Profesional | undefined {
  const a = new Set(tokens(nombre));
  let mejor: Profesional | undefined;
  let mejorScore = 0;
  for (const p of profs) {
    const b = tokens(p.nombre);
    const score = b.filter((t) => a.has(t)).length;
    if (score > mejorScore) { mejorScore = score; mejor = p; }
  }
  return mejorScore > 0 ? mejor : undefined;
}

/** Recalcula montos de cada ítem y los totales de la liquidación. */
export function recalcularTotales(liq: Liquidacion): Liquidacion {
  const items = liq.items.map((it) => ({
    ...it,
    montoBruto: it.valorUnitario * it.cantidad,
  }));
  const totalBruto = sum(items, (i) => i.montoBruto);
  // El arriendo se calcula por prestación (cada una puede tener su %).
  const totalClinica = items.reduce(
    (acc, i) => acc + Math.round(i.montoBruto * (i.porcentajeClinica ?? liq.porcentajeClinica)),
    0,
  );
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

