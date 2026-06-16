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

/** Prestación del catálogo APSORAD: valor Fonasa, Copago y Particular. */
export interface PrestacionApsorad {
  id: string;
  codigo: string;
  nombre: string;
  servicio: ServicioApsorad;
  valorFonasa: number;
  valorCopago: number;
  valorParticular: number;
  activo: boolean;
}

/** Una línea de la liquidación APSORAD (prestación+previsión, con detalle por día). */
export interface ItemApsorad {
  id: string;
  nombre: string;
  prevision: PrevisionApsorad;
  /** Valor Fonasa: base del pago a APSORAD (siempre). */
  valorFonasa: number;
  /** Copago (informativo). */
  valorCopago?: number;
  /** Valor Particular. */
  valorParticular: number;
  /** % del valor Fonasa que recibe APSORAD para esta prestación (decimal, ej. 0.40). */
  porcentaje?: number;
  /** Cantidades por día: fecha ISO -> cantidad. */
  celdas?: Record<string, number>;
  /** Cantidad total (legado / fallback si no hay celdas). */
  cantidad?: number;
  /** @deprecated usar cobradoApsorad() */
  valorCobrado?: number;
}

/** Valor que cobra CESAIN según la previsión (Fonasa o Particular). */
export function cobradoApsorad(it: ItemApsorad): number {
  return it.prevision === 'FONASA' ? it.valorFonasa : it.valorParticular;
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

/** Registro de auditoría de una liquidación APSORAD. */
export interface RegistroApsorad {
  id: string;
  fecha: string;
  usuario: string;
  liquidacionId: string;
  servicio: ServicioApsorad;
  sede: string;
  periodo: string;
  totalCobrado: number;
  totalApsorad: number;
  totalCesain: number;
  cambios: string[];
}

/** Cantidad total de un ítem (suma de celdas, o el campo cantidad legado). */
export function cantidadItem(it: ItemApsorad): number {
  if (it.celdas) return Object.values(it.celdas).reduce((s, n) => s + (n || 0), 0);
  return it.cantidad ?? 0;
}

/** Recalcula los totales de una liquidación APSORAD. */
export function recalcularApsorad(l: LiquidacionApsorad): LiquidacionApsorad {
  let totalCantidad = 0;
  let totalCobrado = 0;
  let totalApsorad = 0;
  for (const it of l.items) {
    const cant = cantidadItem(it);
    const pct = it.porcentaje ?? l.porcentaje;
    totalCantidad += cant;
    totalCobrado += cant * cobradoApsorad(it);
    totalApsorad += Math.round(cant * it.valorFonasa * pct);
  }
  return { ...l, totalCantidad, totalCobrado, totalApsorad, totalCesain: totalCobrado - totalApsorad };
}
