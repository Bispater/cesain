/**
 * Módulo APSORAD: cliente externo que realiza Ecografías y Rayos.
 * Regla de pago: a APSORAD se le paga SIEMPRE el % (40%) del valor FONASA,
 * aunque CESAIN cobre el valor particular. CESAIN se queda con el resto.
 */
export type ServicioApsorad = 'ECOGRAFIA' | 'RAYOS';
export type PrevisionApsorad = 'FONASA' | 'PARTICULAR';

export const SERVICIOS_APSORAD: { valor: ServicioApsorad; label: string }[] = [
  { valor: 'ECOGRAFIA', label: 'Ecografías' },
  { valor: 'RAYOS', label: 'Rayos' },
];

/** Prestación del catálogo APSORAD: tiene valor Fonasa y valor Particular. */
export interface PrestacionApsorad {
  id: string;
  codigo: string;
  nombre: string;
  servicio: ServicioApsorad;
  valorFonasa: number;
  valorParticular: number;
  activo: boolean;
}

/** Una línea de la liquidación APSORAD (cantidad del mes de una prestación+previsión). */
export interface ItemApsorad {
  id: string;
  nombre: string;
  prevision: PrevisionApsorad;
  /** Valor Fonasa: base del pago a APSORAD (siempre). */
  valorFonasa: number;
  /** Valor que cobra CESAIN (Fonasa o Particular según la previsión). */
  valorCobrado: number;
  cantidad: number;
}

export interface LiquidacionApsorad {
  id: string;
  servicio: ServicioApsorad;
  sede: string;
  periodo: string; // YYYY-MM
  /** % del valor Fonasa que recibe APSORAD (0.40). */
  porcentaje: number;
  items: ItemApsorad[];

  // Computados
  totalCantidad: number;
  totalCobrado: number; // lo que cobró CESAIN
  totalApsorad: number; // lo que se le paga a APSORAD (40% del Fonasa)
  totalCesain: number; // totalCobrado - totalApsorad

  eliminada?: boolean;
  eliminadaEn?: string;
  eliminadaPor?: string;
}

/** Recalcula los totales de una liquidación APSORAD. */
export function recalcularApsorad(l: LiquidacionApsorad): LiquidacionApsorad {
  let totalCantidad = 0;
  let totalCobrado = 0;
  let totalApsorad = 0;
  for (const it of l.items) {
    totalCantidad += it.cantidad;
    totalCobrado += it.cantidad * it.valorCobrado;
    totalApsorad += Math.round(it.cantidad * it.valorFonasa * l.porcentaje);
  }
  return { ...l, totalCantidad, totalCobrado, totalApsorad, totalCesain: totalCobrado - totalApsorad };
}
