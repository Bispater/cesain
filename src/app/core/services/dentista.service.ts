import { computed, inject, Injectable, signal } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore';
import { firebaseApp } from '../firebase';
import { environment } from '../../../environments/environment';
import {
  Convenio,
  Dentista,
  LiquidacionDentista,
  PrestacionDentista,
  recalcularDentista,
  RegistroDentista,
} from '../models/dentista.model';
import { CONVENIOS_SEED } from '../data/dentista.seed';
import { AuthService } from './auth.service';

const COL_DENT = 'dentista_dentistas';
const COL_PREST = 'dentista_prestaciones';
const COL_CONV = 'dentista_convenios';
const COL_LIQ = 'dentista_liquidaciones';
const COL_HIST = 'dentista_historial';

@Injectable({ providedIn: 'root' })
export class DentistaService {
  private readonly usarFb = environment.usarFirebase;
  private readonly auth = inject(AuthService);
  private get db() { return getFirestore(firebaseApp()); }

  // ───────── Catálogos ─────────
  private readonly _dentistas = signal<Dentista[]>([]);
  readonly dentistas = this._dentistas.asReadonly();
  private readonly _prestaciones = signal<PrestacionDentista[]>([]);
  readonly prestaciones = this._prestaciones.asReadonly();
  private readonly _convenios = signal<Convenio[]>([]);
  readonly convenios = this._convenios.asReadonly();
  readonly cargandoCatalogo = signal(true);

  readonly dentistasActivos = computed(() =>
    this._dentistas().filter((d) => d.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );
  readonly conveniosActivos = computed(() =>
    this._convenios().filter((c) => c.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  /** Prestaciones que puede usar un dentista (las asociadas a él o las globales). */
  prestacionesDe(dentistaId: string): PrestacionDentista[] {
    return this._prestaciones()
      .filter((p) => p.activo)
      .filter((p) => !p.dentistaIds?.length || p.dentistaIds.includes(dentistaId))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // ───────── Liquidaciones ─────────
  private readonly _liquidaciones = signal<LiquidacionDentista[]>([]);
  readonly cargando = signal(true);
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
      const [dent, prest, conv] = await Promise.all([
        this.leer<Dentista>(COL_DENT, []),
        this.leer<PrestacionDentista>(COL_PREST, []),
        this.leer<Convenio>(COL_CONV, CONVENIOS_SEED),
      ]);
      this._dentistas.set(dent);
      this._prestaciones.set(prest);
      this._convenios.set(conv);
    } catch {
      this._convenios.set([...CONVENIOS_SEED]);
    } finally {
      this.cargandoCatalogo.set(false);
    }

    try {
      this._liquidaciones.set(await this.leer<LiquidacionDentista>(COL_LIQ, []));
    } catch { this._liquidaciones.set([]); }
    finally { this.cargando.set(false); }
  }

  // ───────── CRUD Dentistas ─────────
  async crearDentista(d: Dentista) {
    this._dentistas.update((a) => [...a, d]);
    await this.guardarDoc(COL_DENT, d.id, d, this._dentistas());
  }
  async actualizarDentista(d: Dentista) {
    this._dentistas.update((a) => a.map((x) => (x.id === d.id ? d : x)));
    await this.guardarDoc(COL_DENT, d.id, d, this._dentistas());
  }
  async eliminarDentista(id: string) {
    this._dentistas.update((a) => a.filter((x) => x.id !== id));
    await this.borrarDoc(COL_DENT, id, this._dentistas());
  }

  // ───────── CRUD Prestaciones ─────────
  async crearPrestacion(p: PrestacionDentista) {
    this._prestaciones.update((a) => [...a, p]);
    await this.guardarDoc(COL_PREST, p.id, p, this._prestaciones());
  }
  async actualizarPrestacion(p: PrestacionDentista) {
    this._prestaciones.update((a) => a.map((x) => (x.id === p.id ? p : x)));
    await this.guardarDoc(COL_PREST, p.id, p, this._prestaciones());
  }
  async eliminarPrestacion(id: string) {
    this._prestaciones.update((a) => a.filter((x) => x.id !== id));
    await this.borrarDoc(COL_PREST, id, this._prestaciones());
  }

  // ───────── CRUD Convenios ─────────
  async crearConvenio(c: Convenio) {
    this._convenios.update((a) => [...a, c]);
    await this.guardarDoc(COL_CONV, c.id, c, this._convenios());
  }
  async actualizarConvenio(c: Convenio) {
    this._convenios.update((a) => a.map((x) => (x.id === c.id ? c : x)));
    await this.guardarDoc(COL_CONV, c.id, c, this._convenios());
  }
  async eliminarConvenio(id: string) {
    this._convenios.update((a) => a.filter((x) => x.id !== id));
    await this.borrarDoc(COL_CONV, id, this._convenios());
  }

  buscarConvenio(id: string): Convenio | undefined {
    return this._convenios().find((c) => c.id === id);
  }

  // ───────── Liquidaciones ─────────
  buscarPorId(id: string) {
    return this._liquidaciones().find((l) => l.id === id);
  }

  /** Crea (o reactiva/recupera) la liquidación de un dentista + sede + mes. */
  crearLiquidacion(dentista: Dentista, sede: string, periodo: string): LiquidacionDentista {
    const id = `${dentista.id}_${periodo}_${slug(sede)}`;
    const existente = this._liquidaciones().find((l) => l.id === id);
    if (existente) {
      if (existente.eliminada) {
        const react = { ...existente, eliminada: false } as LiquidacionDentista;
        delete react.eliminadaEn; delete react.eliminadaPor;
        this._liquidaciones.update((arr) => arr.map((x) => (x.id === id ? react : x)));
        void this.guardarDoc(COL_LIQ, id, react, this._liquidaciones());
        return react;
      }
      return existente;
    }
    const nueva: LiquidacionDentista = recalcularDentista({
      id,
      dentistaId: dentista.id,
      dentista: dentista.nombre,
      especialidad: dentista.especialidad,
      sede,
      periodo,
      porcentaje: dentista.porcentajeClinica ?? 0.25,
      items: [],
      totalCantidad: 0, totalBruto: 0, totalClinica: 0, totalDentista: 0,
    });
    this._liquidaciones.update((arr) => [nueva, ...arr]);
    void this.guardarDoc(COL_LIQ, id, nueva, this._liquidaciones());
    return nueva;
  }

  async guardarLiquidacion(l: LiquidacionDentista) {
    const r = recalcularDentista(l);
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
    const r = { ...l, eliminada: false } as LiquidacionDentista;
    delete r.eliminadaEn; delete r.eliminadaPor;
    this._liquidaciones.update((arr) => arr.map((x) => (x.id === id ? r : x)));
    await this.guardarDoc(COL_LIQ, id, r, this._liquidaciones());
  }
  async eliminarDefinitivo(id: string) {
    this._liquidaciones.update((arr) => arr.filter((x) => x.id !== id));
    await this.borrarDoc(COL_LIQ, id, this._liquidaciones());
  }

  // ───────── Historial / auditoría ─────────
  async registrarHistorial(l: LiquidacionDentista, cambios: string[], ts = Date.now()) {
    try {
      const id = `${l.id}_${ts}`;
      const reg: RegistroDentista = {
        id, fecha: new Date(ts).toISOString(), usuario: this.auth.usuario()?.email ?? '—',
        liquidacionId: l.id, dentista: l.dentista, sede: l.sede, periodo: l.periodo,
        totalBruto: l.totalBruto, totalClinica: l.totalClinica, totalDentista: l.totalDentista, cambios,
      };
      if (this.usarFb) await setDoc(doc(this.db, COL_HIST, id), reg);
    } catch { /* el historial no bloquea el guardado */ }
  }

  async listarHistorial(liquidacionId: string): Promise<RegistroDentista[]> {
    if (!this.usarFb) return [];
    const q = query(collection(this.db, COL_HIST), where('liquidacionId', '==', liquidacionId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RegistroDentista).sort((a, b) => b.fecha.localeCompare(a.fecha));
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
