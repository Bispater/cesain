import { Injectable } from '@angular/core';
import { Prestacion } from '../models/prestacion.model';
import { PRESTACIONES_SEED } from '../data/prestaciones.seed';
import { PrestacionRepository } from './prestacion.repository';

const STORAGE_KEY = 'cesain_prestaciones';

/** Persistencia en localStorage del navegador (funciona sin backend). */
@Injectable()
export class LocalPrestacionRepository implements PrestacionRepository {
  async listar(): Promise<Prestacion[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.persistir(PRESTACIONES_SEED);
      return [...PRESTACIONES_SEED];
    }
    try {
      return JSON.parse(raw) as Prestacion[];
    } catch {
      return [...PRESTACIONES_SEED];
    }
  }

  async crear(p: Prestacion): Promise<void> {
    const items = await this.listar();
    this.persistir([...items, p]);
  }

  async actualizar(p: Prestacion): Promise<void> {
    const items = await this.listar();
    this.persistir(items.map((x) => (x.id === p.id ? p : x)));
  }

  async eliminar(id: string): Promise<void> {
    const items = await this.listar();
    this.persistir(items.filter((x) => x.id !== id));
  }

  private persistir(items: Prestacion[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
