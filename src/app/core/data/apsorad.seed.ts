import { PrestacionApsorad } from '../models/apsorad.model';

/** Catálogo inicial APSORAD (ecografías con valores reales; rayos de ejemplo). */
export const APSORAD_PRESTACIONES_SEED: PrestacionApsorad[] = [
  eco('404003', 'ECO ABDOMINAL', 44110, 49000),
  eco('404006', 'ECO PÉLVICA FEMENINA', 23470, 31000),
  eco('404009', 'ECO PÉLVICA MASCULINA', 24530, 31000),
  eco('404010', 'ECO RENAL', 30580, 36000),
  eco('404012', 'ECO MAMARIA', 30740, 39000),
  eco('404014', 'ECO TESTICULAR', 30340, 36000),
  eco('404015', 'ECO TIROIDEA', 30740, 36000),
  eco('404016', 'ECO PARTES BLANDAS', 30740, 36000),
  eco('404002', 'ECO OBSTÉTRICA', 13170, 30000),
  eco('404005', 'ECO TRANSVAGINAL', 23230, 30000),
  rayos('rx-torax', 'RX TÓRAX', 0, 0),
  rayos('rx-columna', 'RX COLUMNA', 0, 0),
  rayos('rx-abdomen', 'RX ABDOMEN SIMPLE', 0, 0),
];

function eco(codigo: string, nombre: string, fonasa: number, particular: number): PrestacionApsorad {
  return { id: codigo, codigo, nombre, servicio: 'ECOGRAFIA', valorFonasa: fonasa, valorParticular: particular, activo: true };
}
function rayos(id: string, nombre: string, fonasa: number, particular: number): PrestacionApsorad {
  return { id, codigo: '', nombre, servicio: 'RAYOS', valorFonasa: fonasa, valorParticular: particular, activo: true };
}
