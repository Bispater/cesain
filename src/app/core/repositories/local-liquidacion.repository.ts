import { Injectable } from '@angular/core';
import { Liquidacion } from '../models/liquidacion.model';
import { LiquidacionRepository } from './liquidacion.repository';

const STORAGE_KEY = 'cesain_liquidaciones';

/** Persistencia de liquidaciones en localStorage (fallback sin backend). */
@Injectable()
export class LocalLiquidacionRepository implements LiquidacionRepository {
  async listar(): Promise<Liquidacion[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Liquidacion[];
    } catch {
      return [];
    }
  }

  async guardar(l: Liquidacion): Promise<void> {
    const items = await this.listar();
    const i = items.findIndex((x) => x.id === l.id);
    if (i >= 0) items[i] = l;
    else items.unshift(l);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  async guardarTodo(ls: Liquidacion[]): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ls));
  }

  async eliminar(id: string): Promise<void> {
    const items = (await this.listar()).filter((x) => x.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
