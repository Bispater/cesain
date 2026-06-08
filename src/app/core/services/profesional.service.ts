import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TipoProfesional } from '../models/liquidacion.model';
import { Profesional } from '../models/profesional.model';
import { PROFESIONAL_REPOSITORY } from '../repositories/profesional.repository';
import { LiquidacionService } from './liquidacion.service';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {
  private repo = inject(PROFESIONAL_REPOSITORY);
  private liquidacionSvc = inject(LiquidacionService);

  private readonly _items = signal<Profesional[]>([]);
  readonly items = this._items.asReadonly();
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly filtroSede = signal<string>('TODAS');
  readonly filtroTipo = signal<'TODOS' | TipoProfesional>('TODOS');
  readonly busqueda = signal('');

  readonly sedes = computed(() =>
    [...new Set(this._items().map((p) => p.sede))].sort(),
  );

  readonly filtradas = computed(() => {
    const sede = this.filtroSede();
    const tipo = this.filtroTipo();
    const q = this.busqueda().toLowerCase().trim();
    return this._items()
      .filter((p) => sede === 'TODAS' || p.sede === sede)
      .filter((p) => tipo === 'TODOS' || p.tipoProfesional === tipo)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.especialidad.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  constructor() {
    this.cargar();
    // Asocia y sincroniza los nombres de las liquidaciones con el catálogo,
    // tanto al cargar como cada vez que se edita un profesional.
    effect(() => {
      const profs = this.items();
      const liqs = this.liquidacionSvc.liquidaciones();
      if (profs.length && liqs.length) this.liquidacionSvc.sincronizarProfesionales(profs);
    });
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this._items.set(await this.repo.listar());
    } catch (e) {
      this.error.set('No se pudo cargar profesionales: ' + (e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(p: Profesional) {
    await this.repo.crear(p);
    this._items.update((arr) => [...arr, p]);
  }
  async actualizar(p: Profesional) {
    await this.repo.actualizar(p);
    this._items.update((arr) => arr.map((x) => (x.id === p.id ? p : x)));
  }
  async eliminar(id: string) {
    await this.repo.eliminar(id);
    this._items.update((arr) => arr.filter((x) => x.id !== id));
  }
}
