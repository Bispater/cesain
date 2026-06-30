/**
 * Módulo DENTISTAS: liquidaciones odontológicas, independientes de las
 * liquidaciones médicas generales y de APSORAD (colecciones propias).
 *
 * Diferencias clave respecto a una liquidación médica:
 *  - La prestación tiene ARANCEL (precio base) y un DESCUENTO (%), que puede
 *    venir de un CONVENIO o ser manual. El VALOR cobrado = arancel − descuento.
 *  - El resto (cantidades por día, % clínica de arriendo, totales) es igual.
 */

/** Profesional dentista. Catálogo propio (no se mezcla con `Profesional`). */
export interface Dentista {
  id: string;
  nombre: string;
  rut: string;
  especialidad: string;
  /** Sedes donde atiende. */
  sedes: string[];
  /** % que retiene la clínica por arriendo (decimal, 0.25 = 25%). Default de sus planillas. */
  porcentajeClinica: number;
  email: string;
  telefono: string;
  activo: boolean;
}

/** Prestación del catálogo dentista. El código es OPCIONAL. */
export interface PrestacionDentista {
  id: string;
  /** Código interno/FONASA. Opcional (algunas no tienen). */
  codigo?: string;
  nombre: string;
  /** Arancel base (precio sin descuento). Editable también en la planilla. */
  arancel: number;
  /** Dentistas que ofrecen esta prestación (asociación N:N). Vacío = todos. */
  dentistaIds: string[];
  activo: boolean;
}

/** Convenio con su descuento asociado (CESAIN 20%, CFTPUCV 15%, …). */
export interface Convenio {
  id: string;
  nombre: string;
  /** Descuento en porcentaje entero (20 = 20%). */
  descuento: number;
  activo: boolean;
}

/** Una línea de la liquidación dentista (prestación, con detalle por día). */
export interface ItemDentista {
  id: string;
  nombre: string;
  codigo?: string;
  /** Arancel base de la prestación. */
  arancel: number;
  /** Convenio aplicado ('' = sin convenio). Informativo + autollena el descuento. */
  convenioId: string;
  /** Descuento en % (entero). Puede venir del convenio o ser manual. */
  descuento: number;
  /** % clínica (arriendo) de esta línea (decimal, ej. 0.25). */
  porcentaje: number;
  /** Cantidades por día: fecha ISO -> cantidad. */
  celdas: Record<string, number>;
}

export interface LiquidacionDentista {
  id: string;
  dentistaId: string;
  /** Nombre del dentista (sincronizado del catálogo, para mostrar). */
  dentista: string;
  especialidad: string;
  sede: string;
  periodo: string; // YYYY-MM
  /** % clínica por defecto de la planilla (decimal). */
  porcentaje: number;
  items: ItemDentista[];

  // Computados
  totalCantidad: number;
  /** Total bruto cobrado (suma de valor·cantidad). */
  totalBruto: number;
  /** Lo que retiene la clínica (arriendo). */
  totalClinica: number;
  /** Lo que recibe el dentista = bruto − clínica. */
  totalDentista: number;

  eliminada?: boolean;
  eliminadaEn?: string;
  eliminadaPor?: string;
}

/** Registro de auditoría de una liquidación dentista. */
export interface RegistroDentista {
  id: string;
  fecha: string;
  usuario: string;
  liquidacionId: string;
  dentista: string;
  sede: string;
  periodo: string;
  totalBruto: number;
  totalClinica: number;
  totalDentista: number;
  cambios: string[];
}

/** Valor unitario cobrado de una línea: arancel menos el descuento (%). */
export function valorDentista(arancel: number, descuento: number): number {
  return Math.round(arancel * (1 - (descuento || 0) / 100));
}

/** Cantidad total de un ítem (suma de las celdas por día). */
export function cantidadDentista(it: ItemDentista): number {
  return Object.values(it.celdas ?? {}).reduce((s, n) => s + (n || 0), 0);
}

/** Recalcula los totales de una liquidación dentista. */
export function recalcularDentista(l: LiquidacionDentista): LiquidacionDentista {
  let totalCantidad = 0;
  let totalBruto = 0;
  let totalClinica = 0;
  for (const it of l.items) {
    const cant = cantidadDentista(it);
    const valor = valorDentista(it.arancel, it.descuento);
    const bruto = cant * valor;
    totalCantidad += cant;
    totalBruto += bruto;
    totalClinica += Math.round(bruto * (it.porcentaje ?? l.porcentaje));
  }
  return { ...l, totalCantidad, totalBruto, totalClinica, totalDentista: totalBruto - totalClinica };
}
