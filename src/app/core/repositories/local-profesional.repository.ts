import { Injectable } from '@angular/core';
import { Profesional } from '../models/profesional.model';
import { PROFESIONALES_SEED } from '../data/profesionales.seed';
import { ProfesionalRepository } from './profesional.repository';

const STORAGE_KEY = 'cesain_profesionales';

/** Persistencia de profesionales en localStorage (fallback sin backend). */
@Injectable()
export class LocalProfesionalRepository implements ProfesionalRepository {
  async listar(): Promise<Profesional[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.persistir(PROFESIONALES_SEED);
      return [...PROFESIONALES_SEED];
    }
    try {
      return JSON.parse(raw) as Profesional[];
    } catch {
      return [...PROFESIONALES_SEED];
    }
  }

  async crear(p: Profesional): Promise<void> {
    this.persistir([...(await this.listar()), p]);
  }
  async actualizar(p: Profesional): Promise<void> {
    this.persistir((await this.listar()).map((x) => (x.id === p.id ? p : x)));
  }
  async eliminar(id: string): Promise<void> {
    this.persistir((await this.listar()).filter((x) => x.id !== id));
  }

  private persistir(items: Profesional[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
