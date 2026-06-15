import { Injectable, signal } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { environment } from '../../../environments/environment';

export interface ItemCatalogo {
  id: string;
  nombre: string;
}

const TIPOS_DEFAULT: ItemCatalogo[] = [
  { id: 'MEDICO', nombre: 'Médico' },
  { id: 'KINESIOLOGO', nombre: 'Kinesiólogo' },
  { id: 'TECNOLOGO_MEDICO', nombre: 'Tecnólogo Médico' },
];
const SEDES_DEFAULT: ItemCatalogo[] = [
  { id: 'valparaiso', nombre: 'Valparaíso' },
  { id: 'quintero', nombre: 'Quintero' },
];
const ESPECIALIDADES_DEFAULT: ItemCatalogo[] = [
  { id: 'medicina-general', nombre: 'Medicina General' },
  { id: 'pediatria', nombre: 'Pediatría' },
  { id: 'ginecologia', nombre: 'Ginecología' },
  { id: 'traumatologia', nombre: 'Traumatología' },
  { id: 'otorrinolaringologia', nombre: 'Otorrinolaringología' },
  { id: 'nutricion', nombre: 'Nutrición' },
  { id: 'psicologia', nombre: 'Psicología' },
  { id: 'fonoaudiologia', nombre: 'Fonoaudiología' },
  { id: 'kinesiologia', nombre: 'Kinesiología' },
  { id: 'matrona', nombre: 'Matrona' },
  { id: 'enfermeria-obstetricia', nombre: 'Enfermería / Obstetricia' },
  { id: 'podologia', nombre: 'Podología' },
  { id: 'especialista-varices', nombre: 'Especialista en Varices' },
  { id: 'tecnologia-medica', nombre: 'Tecnología Médica' },
  { id: 'odontologia', nombre: 'Odontología' },
];

/** Administra los catálogos editables: Tipos, Sedes y Especialidades. */
@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private readonly usarFb = environment.usarFirebase;

  readonly tipos = signal<ItemCatalogo[]>([]);
  readonly sedes = signal<ItemCatalogo[]>([]);
  readonly especialidades = signal<ItemCatalogo[]>([]);
  readonly cargando = signal(true);

  constructor() {
    this.cargar();
  }

  /** Etiqueta de un tipo por su id (para mostrar). */
  labelTipo(id: string): string {
    return this.tipos().find((t) => t.id === id)?.nombre ?? id;
  }

  private async cargar() {
    this.tipos.set(await this.leer('tipos', TIPOS_DEFAULT));
    this.sedes.set(await this.leer('sedes', SEDES_DEFAULT));
    this.especialidades.set(await this.leer('especialidades', ESPECIALIDADES_DEFAULT));
    this.cargando.set(false);
  }

  // ───────── Tipos ─────────
  async agregarTipo(nombre: string) {
    const item = this.nuevoItem(nombre, this.tipos());
    if (!item) return;
    this.tipos.update((a) => [...a, item].sort((x, y) => x.nombre.localeCompare(y.nombre)));
    await this.persistir('tipos', item, this.tipos());
  }
  async eliminarTipo(id: string) {
    this.tipos.update((a) => a.filter((x) => x.id !== id));
    await this.eliminar('tipos', id, this.tipos());
  }

  // ───────── Sedes ─────────
  async agregarSede(nombre: string) {
    const item = this.nuevoItem(nombre, this.sedes());
    if (!item) return;
    this.sedes.update((a) => [...a, item].sort((x, y) => x.nombre.localeCompare(y.nombre)));
    await this.persistir('sedes', item, this.sedes());
  }
  async eliminarSede(id: string) {
    this.sedes.update((a) => a.filter((x) => x.id !== id));
    await this.eliminar('sedes', id, this.sedes());
  }

  // ───────── Especialidades ─────────
  async agregarEspecialidad(nombre: string) {
    const item = this.nuevoItem(nombre, this.especialidades());
    if (!item) return;
    this.especialidades.update((a) => [...a, item].sort((x, y) => x.nombre.localeCompare(y.nombre)));
    await this.persistir('especialidades', item, this.especialidades());
  }
  async eliminarEspecialidad(id: string) {
    this.especialidades.update((a) => a.filter((x) => x.id !== id));
    await this.eliminar('especialidades', id, this.especialidades());
  }

  // ───────── Internos ─────────
  private nuevoItem(nombre: string, existentes: ItemCatalogo[]): ItemCatalogo | null {
    const n = nombre.trim();
    if (!n) return null;
    if (existentes.some((x) => x.nombre.toLowerCase() === n.toLowerCase())) return null;
    const id = `${slug(n)}-${existentes.length + 1}`;
    return { id, nombre: n };
  }

  private async leer(col: string, def: ItemCatalogo[]): Promise<ItemCatalogo[]> {
    if (this.usarFb) {
      try {
        const snap = await getDocs(collection(firestore(), col));
        if (snap.empty) {
          await Promise.all(def.map((i) => setDoc(doc(firestore(), col, i.id), i)));
          return [...def];
        }
        return snap.docs.map((d) => d.data() as ItemCatalogo).sort((a, b) => a.nombre.localeCompare(b.nombre));
      } catch {
        return [...def];
      }
    }
    const raw = localStorage.getItem('cesain_' + col);
    if (!raw) {
      localStorage.setItem('cesain_' + col, JSON.stringify(def));
      return [...def];
    }
    try { return JSON.parse(raw); } catch { return [...def]; }
  }

  private async persistir(col: string, item: ItemCatalogo, todos: ItemCatalogo[]) {
    if (this.usarFb) await setDoc(doc(firestore(), col, item.id), item);
    else localStorage.setItem('cesain_' + col, JSON.stringify(todos));
  }

  private async eliminar(col: string, id: string, todos: ItemCatalogo[]) {
    if (this.usarFb) await deleteDoc(doc(firestore(), col, id));
    else localStorage.setItem('cesain_' + col, JSON.stringify(todos));
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
