import { computed, inject, Injectable, signal } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore';
import { firebaseApp } from '../firebase';
import { environment } from '../../../environments/environment';
import {
  LiquidacionApsorad,
  PrestacionApsorad,
  recalcularApsorad,
  RegistroApsorad,
  ServicioApsorad,
} from '../models/apsorad.model';
import { APSORAD_PRESTACIONES_SEED } from '../data/apsorad.seed';
import { AuthService } from './auth.service';

const COL_PREST = 'apsorad_prestaciones';
const COL_LIQ = 'apsorad_liquidaciones';

@Injectable({ providedIn: 'root' })
export class ApsoradService {
  private readonly usarFb = environment.usarFirebase;
  private readonly auth = inject(AuthService);
  private get db() { return getFirestore(firebaseApp()); }

  // ───────── Catálogo ─────────
  private readonly _prestaciones = signal<PrestacionApsorad[]>([]);
  readonly prestaciones = this._prestaciones.asReadonly();
  readonly cargandoCatalogo = signal(true);

  // ───────── Liquidaciones ─────────
  private readonly _liquidaciones = signal<LiquidacionApsorad[]>([]);
  readonly cargando = signal(true);
  /** Sin duplicados por id (defensivo ante recreaciones en memoria). */
  private readonly unicas = computed(() => {
    const vistos = new Set<string>();
    return this._liquidaciones().filter((l) => (vistos.has(l.id) ? false : vistos.add(l.id)));
  });
  readonly activas = computed(() => this.unicas().filter((l) => !l.eliminada));
  readonly eliminadas = computed(() =>
    this.unicas().filter((l) => l.eliminada)
      .sort((a, b) => (b.eliminadaEn ?? '').localeCompare(a.eliminadaEn ?? '')),
  );

  constructor() {
    this.cargar();
  }

  private async cargar() {
    try {
      this._prestaciones.set(await this.leer(COL_PREST, APSORAD_PRESTACIONES_SEED));
    } catch { this._prestaciones.set([...APSORAD_PRESTACIONES_SEED]); }
    finally { this.cargandoCatalogo.set(false); }

    try {
      this._liquidaciones.set(await this.leer<LiquidacionApsorad>(COL_LIQ, []));
    } catch { this._liquidaciones.set([]); }
    finally { this.cargando.set(false); }
  }

  prestacionesPorServicio(s: ServicioApsorad) {
    return this._prestaciones().filter((p) => p.servicio === s).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // ───────── CRUD catálogo ─────────
  async crearPrestacion(p: PrestacionApsorad) {
    this._prestaciones.update((a) => [...a, p]);
    await this.guardarDoc(COL_PREST, p.id, p, this._prestaciones());
  }
  async actualizarPrestacion(p: PrestacionApsorad) {
    this._prestaciones.update((a) => a.map((x) => (x.id === p.id ? p : x)));
    await this.guardarDoc(COL_PREST, p.id, p, this._prestaciones());
  }
  async eliminarPrestacion(id: string) {
    this._prestaciones.update((a) => a.filter((x) => x.id !== id));
    await this.borrarDoc(COL_PREST, id, this._prestaciones());
  }

  // ───────── Liquidaciones ─────────
  buscarPorId(id: string) {
    return this._liquidaciones().find((l) => l.id === id);
  }

  crearLiquidacion(servicio: ServicioApsorad, sede: string, periodo: string): LiquidacionApsorad {
    const id = `${servicio}_${periodo}_${slug(sede)}`;
    const existente = this._liquidaciones().find((l) => l.id === id);
    if (existente) {
      if (existente.eliminada) {
        const react = { ...existente, eliminada: false } as LiquidacionApsorad;
        delete react.eliminadaEn; delete react.eliminadaPor;
        this._liquidaciones.update((arr) => arr.map((x) => (x.id === id ? react : x)));
        void this.guardarDoc(COL_LIQ, id, react, this._liquidaciones());
        return react;
      }
      return existente;
    }
    const nueva: LiquidacionApsorad = recalcularApsorad({
      id, servicio, sede, periodo, porcentaje: 0.4, items: [],
      totalCantidad: 0, totalCobrado: 0, totalApsorad: 0, totalCesain: 0,
    });
    this._liquidaciones.update((arr) => [nueva, ...arr]);
    void this.guardarDoc(COL_LIQ, id, nueva, this._liquidaciones());
    return nueva;
  }

  async guardarLiquidacion(l: LiquidacionApsorad) {
    const r = recalcularApsorad(l);
    this._liquidaciones.update((arr) => arr.map((x) => (x.id === r.id ? r : x)));
    await this.guardarDoc(COL_LIQ, r.id, r, this._liquidaciones());
  }

  async eliminarLiquidacion(id: string) {
    const l = this.buscarPorId(id);
    if (!l) return;
    const e = { ...l, eliminada: true, eliminadaEn: new Date().toISOString(), eliminadaPor: this.auth.usuario()?.email ?? '—' };
    this._liquidaciones.update((arr) => arr.map((x) => (x.id === id ? e : x)));
    await this.guardarDoc(COL_LIQ, id, e, this._liquidaciones());
  }
  async restaurarLiquidacion(id: string) {
    const l = this.buscarPorId(id);
    if (!l) return;
    const r = { ...l, eliminada: false } as LiquidacionApsorad;
    delete r.eliminadaEn; delete r.eliminadaPor;
    this._liquidaciones.update((arr) => arr.map((x) => (x.id === id ? r : x)));
    await this.guardarDoc(COL_LIQ, id, r, this._liquidaciones());
  }
  async eliminarDefinitivo(id: string) {
    this._liquidaciones.update((arr) => arr.filter((x) => x.id !== id));
    await this.borrarDoc(COL_LIQ, id, this._liquidaciones());
  }

  // ───────── Historial / auditoría ─────────
  async registrarHistorial(l: LiquidacionApsorad, cambios: string[], ts = Date.now()) {
    try {
      const id = `${l.id}_${ts}`;
      const reg: RegistroApsorad = {
        id, fecha: new Date(ts).toISOString(), usuario: this.auth.usuario()?.email ?? '—',
        liquidacionId: l.id, servicio: l.servicio, sede: l.sede, periodo: l.periodo,
        totalCobrado: l.totalCobrado, totalApsorad: l.totalApsorad, totalCesain: l.totalCesain, cambios,
      };
      if (this.usarFb) await setDoc(doc(this.db, 'apsorad_historial', id), reg);
    } catch { /* el historial no bloquea el guardado */ }
  }

  async listarHistorial(liquidacionId: string): Promise<RegistroApsorad[]> {
    if (!this.usarFb) return [];
    const q = query(collection(this.db, 'apsorad_historial'), where('liquidacionId', '==', liquidacionId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RegistroApsorad).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  // ───────── Persistencia genérica ─────────
  private async leer<T>(col: string, def: T[]): Promise<T[]> {
    if (this.usarFb) {
      const snap = await getDocs(collection(this.db, col));
      if (snap.empty) {
        if (def.length) await Promise.all(def.map((d) => setDoc(doc(this.db, col, (d as { id: string }).id), d as object)));
        return [...def];
      }
      return snap.docs.map((d) => d.data() as T);
    }
    const raw = localStorage.getItem('cesain_' + col);
    if (!raw) { localStorage.setItem('cesain_' + col, JSON.stringify(def)); return [...def]; }
    try { return JSON.parse(raw); } catch { return [...def]; }
  }
  private async guardarDoc(col: string, id: string, item: object, todos: object[]) {
    if (this.usarFb) await setDoc(doc(this.db, col, id), item);
    else localStorage.setItem('cesain_' + col, JSON.stringify(todos));
  }
  private async borrarDoc(col: string, id: string, todos: object[]) {
    if (this.usarFb) await deleteDoc(doc(this.db, col, id));
    else localStorage.setItem('cesain_' + col, JSON.stringify(todos));
  }
}

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
