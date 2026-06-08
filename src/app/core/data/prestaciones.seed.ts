import { Prestacion } from '../models/prestacion.model';

/**
 * Catálogo inicial — hoja "VALORES ECOGRAFÍAS FONASA" del Excel + algunos
 * particulares de ejemplo. Lo usan tanto el repositorio local como el de
 * Firebase (que siembra esto la primera vez si la base está vacía).
 */
export const PRESTACIONES_SEED: Prestacion[] = [
  eco('404003', 'ECO. ABDOMINAL FONASA', 43340, 29790),
  eco('404006', 'ECO. PÉLVICA FEMENINA FONASA', 23060, 15860),
  eco('404009', 'ECO. PÉLVICA MASCULINA FONASA', 24100, 16570),
  eco('404010', 'ECO. RENAL FONASA', 30050, 20660),
  eco('404012', 'ECO. MAMARIA FONASA', 30210, 20770),
  eco('404014', 'ECO. TESTICULAR FONASA', 29810, 20500),
  eco('404015', 'ECO. TIROIDEO FONASA', 30210, 20770),
  eco('404016', 'ECO. PARTES BLANDAS FONASA', 30210, 20770),
  eco('404002', 'ECO. OBSTÉTRICA', 13170, 9050),
  eco('404005', 'ECO. TRANSVAGINAL', 23230, 15970),
  particular('p-eco-abd', 'Eco Abdominal Particular', 'Ecografía', 48000),
  particular('p-eco-pb', 'Eco Partes Blandas Particular', 'Ecografía', 35000),
  particular('p-cons', 'Consulta Particular', 'Consulta', 30000),
  particular('p-am', 'Adulto Mayor 65 años', 'Consulta', 30000),
  particular('p-cert', 'Certificado Médico', 'Certificado', 18000),
];

function eco(codigo: string, nombre: string, bono: number, copago: number): Prestacion {
  return { id: codigo, codigo, nombre, prevision: 'FONASA', categoria: 'Ecografía', valorBono: bono, valorCopago: copago, activo: true };
}
function particular(id: string, nombre: string, categoria: string, valor: number): Prestacion {
  return { id, codigo: '', nombre, prevision: 'PARTICULAR', categoria, valorBono: valor, valorCopago: valor, activo: true };
}
