import { InjectionToken } from '@angular/core';
import { Profesional } from '../models/profesional.model';

export interface ProfesionalRepository {
  listar(): Promise<Profesional[]>;
  crear(p: Profesional): Promise<void>;
  actualizar(p: Profesional): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export const PROFESIONAL_REPOSITORY = new InjectionToken<ProfesionalRepository>(
  'ProfesionalRepository',
);
