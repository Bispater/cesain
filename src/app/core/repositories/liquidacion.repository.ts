import { InjectionToken } from '@angular/core';
import { Liquidacion } from '../models/liquidacion.model';

/** Contrato de persistencia para las liquidaciones de cada profesional. */
export interface LiquidacionRepository {
  listar(): Promise<Liquidacion[]>;
  guardar(l: Liquidacion): Promise<void>;
  guardarTodo(ls: Liquidacion[]): Promise<void>;
}

export const LIQUIDACION_REPOSITORY = new InjectionToken<LiquidacionRepository>(
  'LiquidacionRepository',
);
