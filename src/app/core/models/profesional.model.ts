import { TipoProfesional } from './liquidacion.model';

/** Profesional del centro médico (médico, kinesiólogo, tecnólogo, etc.). */
export interface Profesional {
  id: string;
  nombre: string;
  rut: string;
  especialidad: string;
  tipoProfesional: TipoProfesional;
  /** Sedes donde atiende. Un profesional puede trabajar en más de una. */
  sedes: string[];
  /** Campo legado de documentos antiguos (una sola sede); usar `sedes`. */
  sede?: string;
  /** % que retiene la clínica por arriendo de espacio (0.25 = 25%). */
  porcentajeClinica: number;
  email: string;
  telefono: string;
  activo: boolean;
}

/** Migra documentos antiguos que traían `sede` (string) al arreglo `sedes`. */
export function normalizarProfesional(p: Profesional): Profesional {
  const sedes = p.sedes?.length ? p.sedes : p.sede ? [p.sede] : [];
  const { sede: _legado, ...resto } = p;
  return { ...resto, sedes };
}

export const TIPOS_PROFESIONAL: { valor: TipoProfesional; label: string }[] = [
  { valor: 'MEDICO', label: 'Médico' },
  { valor: 'KINESIOLOGO', label: 'Kinesiólogo' },
  { valor: 'TECNOLOGO_MEDICO', label: 'Tecnólogo Médico' },
];

export const SEDES = ['Valparaíso', 'Quintero'] as const;

export function labelTipo(t: TipoProfesional): string {
  return TIPOS_PROFESIONAL.find((x) => x.valor === t)?.label ?? t;
}
