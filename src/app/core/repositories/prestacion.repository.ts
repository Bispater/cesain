import { InjectionToken } from '@angular/core';
import { Prestacion } from '../models/prestacion.model';

/**
 * Contrato de persistencia para el catálogo de prestaciones.
 * La UI/servicio dependen solo de esta interfaz: cambiar de almacenamiento
 * local a Firebase (Firestore) es cambiar UN proveedor en app.config.ts.
 */
export interface PrestacionRepository {
  listar(): Promise<Prestacion[]>;
  crear(p: Prestacion): Promise<void>;
  actualizar(p: Prestacion): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export const PRESTACION_REPOSITORY = new InjectionToken<PrestacionRepository>(
  'PrestacionRepository',
);
