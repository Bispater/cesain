import { computed, inject, Injectable, signal } from '@angular/core';
import { Prevision } from '../models/liquidacion.model';
import { Prestacion } from '../models/prestacion.model';
import { PRESTACION_REPOSITORY } from '../repositories/prestacion.repository';

@Injectable({ providedIn: 'root' })
export class PrestacionService {
  private repo = inject(PRESTACION_REPOSITORY);

  private readonly _items = signal<Prestacion[]>([]);
  readonly items = this._items.asReadonly();
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  // Filtros
  readonly filtroPrevision = signal<'TODAS' | Prevision>('TODAS');
  readonly filtroCategoria = signal<string>('TODAS');
  readonly busqueda = signal('');

  readonly categorias = computed(() =>
    [...new Set(this._items().map((p) => p.categoria))].sort(),
  );

  readonly filtradas = computed(() => {
    const prev = this.filtroPrevision();
    const cat = this.filtroCategoria();
    const q = this.busqueda().toLowerCase().trim();
    return this._items()
      .filter((p) => prev === 'TODAS' || p.prevision === prev)
      .filter((p) => cat === 'TODAS' || p.categoria === cat)
      .filter(
        (p) =>
          !q ||
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  constructor() {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this._items.set(await this.repo.listar());
    } catch (e) {
      this.error.set('No se pudo cargar el catálogo: ' + (e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(p: Prestacion) {
    await this.repo.crear(p);
    this._items.update((arr) => [...arr, p]);
  }

  async actualizar(p: Prestacion) {
    await this.repo.actualizar(p);
    this._items.update((arr) => arr.map((x) => (x.id === p.id ? p : x)));
  }

  async eliminar(id: string) {
    await this.repo.eliminar(id);
    this._items.update((arr) => arr.filter((x) => x.id !== id));
  }

  setFiltroPrevision(v: 'TODAS' | Prevision) { this.filtroPrevision.set(v); }
  setFiltroCategoria(v: string) { this.filtroCategoria.set(v); }
  setBusqueda(v: string) { this.busqueda.set(v); }
}
