/** Registro de auditoría: cada vez que se guarda una liquidación. */
export interface RegistroHistorial {
  id: string;
  /** Fecha/hora del cambio en ISO (se formatea a hora chilena al mostrar). */
  fecha: string;
  /** Email del usuario que hizo el cambio. */
  usuario: string;
  liquidacionId: string;
  profesional: string;
  periodo: string;
  accion: string;

  // Totales DESPUÉS del cambio
  totalBruto: number;
  totalProfesional: number;
  totalClinica: number;
  nPrestaciones: number;

  // Totales ANTES del cambio
  totalBrutoAntes: number;
  totalProfesionalAntes: number;
  totalClinicaAntes: number;

  /** Detalle legible de los cambios (prestación, día, antes→después). */
  cambios: string[];
}
