import { Prevision } from './liquidacion.model';

/**
 * Prestación del catálogo de precios (lo que en el Excel está en la hoja
 * "VALORES ECOGRAFÍAS FONASA" y similares): código, nombre, valor del bono
 * y copago, agrupado por previsión y categoría.
 */
export interface Prestacion {
  id: string;
  /** Código FONASA / interno (ej. "404003"). Opcional para particulares. */
  codigo: string;
  nombre: string;
  prevision: Prevision;
  /** Agrupador: "Ecografía", "Consulta", "Tratamiento", "Examen"... */
  categoria: string;
  /** Valor total del bono (lo que paga el sistema + copago). */
  valorBono: number;
  /** Copago: parte que paga el paciente. */
  valorCopago: number;
  activo: boolean;
}

export const CATEGORIAS = [
  'Ecografía',
  'Consulta',
  'Tratamiento',
  'Examen',
  'Procedimiento',
  'Certificado',
] as const;
