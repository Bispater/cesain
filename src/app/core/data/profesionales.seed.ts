import { Profesional } from '../models/profesional.model';

/** Profesionales iniciales (los del Excel) si la base está vacía. */
export const PROFESIONALES_SEED: Profesional[] = [
  prof('casanova', 'Casanova', 'Medicina General', 'MEDICO', 'Valparaíso', 0.22),
  prof('juan-lopez', 'Juan López', 'Medicina General', 'MEDICO', 'Valparaíso', 0.22),
  prof('rafael-marquez', 'Rafael Márquez', 'Medicina General', 'MEDICO', 'Quintero', 0.25),
  prof('fretz-meola', 'Fretz Meola Rodríguez', 'Traumatología', 'MEDICO', 'Quintero', 0.25),
  prof('sebastian-salinas', 'Sebastián Salinas', 'Kinesiología', 'KINESIOLOGO', 'Quintero', 0.25),
  prof('tm-vivian', 'Vivian', 'Ecografía / Imagenología', 'TECNOLOGO_MEDICO', 'Quintero', 0.25),
];

function prof(
  id: string,
  nombre: string,
  especialidad: string,
  tipoProfesional: Profesional['tipoProfesional'],
  sede: string,
  porcentajeClinica: number,
): Profesional {
  return { id, nombre, rut: '', especialidad, tipoProfesional, sede, porcentajeClinica, email: '', telefono: '', activo: true };
}
