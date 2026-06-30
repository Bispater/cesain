import { Convenio } from '../models/dentista.model';

/** Convenios iniciales si la colección está vacía (editables en el CRUD). */
export const CONVENIOS_SEED: Convenio[] = [
  { id: 'cesain', nombre: 'CESAIN', descuento: 20, activo: true },
  { id: 'cftpucv', nombre: 'CFTPUCV', descuento: 15, activo: true },
];
