/**
 * Modelos normalizados del dominio "Liquidaciones Médicas".
 *
 * El Excel original tiene ~30 pestañas heterogéneas (una por profesional),
 * con encabezados inconsistentes, celdas "NaN", fechas como texto ("06-may",
 * "27-05-2026") y archivos mal nombrados (el archivo dice "Junio" pero los
 * datos son de Mayo). Estas interfaces son el "contrato limpio" al que el
 * servicio de ingesta normaliza todo.
 */

/** Sistema previsional con el que se cobra una prestación. */
export type Prevision = 'FONASA' | 'ISAPRE' | 'PARTICULAR';

/** Tipo de profesional, define la lógica de negocio del cálculo. */
export type TipoProfesional = 'MEDICO' | 'KINESIOLOGO' | 'TECNOLOGO_MEDICO';

/**
 * Una línea atómica de prestación ya normalizada.
 * Reemplaza el cruce "tipo de prestación x día" del Excel por filas planas.
 */
export interface ItemLiquidacion {
  id: string;
  /** Fecha REAL de la prestación en ISO (YYYY-MM-DD), ya parseada del texto. */
  fecha: string;
  /** Prestación: "Bono Fonasa", "Eco Abdominal", "Consulta Particular", etc. */
  servicio: string;
  prevision: Prevision;
  /** N° de pacientes/prestaciones de ese tipo ese día. */
  cantidad: number;
  /** Valor unitario de la prestación. */
  valorUnitario: number;
  /** Monto bruto facturado = cantidad * valorUnitario (incluye bono + copago). */
  montoBruto: number;
  /** Copago: parte que paga el paciente de su bolsillo (relevante en exámenes). */
  copago: number;
}

/**
 * Liquidación consolidada de un profesional para un período.
 * Los campos `total*` se calculan en el servicio y se exponen ya resueltos.
 */
export interface Liquidacion {
  id: string;
  /** Nombre del profesional (sincronizado desde el catálogo de profesionales). */
  profesional: string;
  /** ID del profesional en el catálogo (asociación que mantiene el nombre en sync). */
  profesionalId?: string;
  especialidad: string;
  tipoProfesional: TipoProfesional;
  /** Sede / sucursal (Valparaíso, Quintero...). */
  sede: string;
  /** Período REAL de los datos en formato 'YYYY-MM' (no el nombre del archivo). */
  periodo: string;
  /** Nombre del archivo/pestaña original, para auditar el "Junio vs Mayo". */
  archivoOrigen: string;
  /** % que retiene la clínica por arriendo de espacio (0.25, 0.22...). */
  porcentajeClinica: number;
  items: ItemLiquidacion[];

  // ---- Valores computados (resueltos por el servicio) ----
  /** Total bruto facturado por el profesional. */
  totalBruto: number;
  /** Lo que retiene la clínica (arriendo) = totalBruto * porcentajeClinica. */
  totalClinica: number;
  /** Lo que recibe el profesional = totalBruto - totalClinica. */
  totalProfesional: number;
  /** Total de pacientes/prestaciones del período. */
  totalPacientes: number;
}

/** Tipos de incidencia detectados al normalizar el Excel "sucio". */
export type TipoIncidencia =
  | 'fila_descartada'   // prestación sin valor / NaN
  | 'celda_nan'         // celda de conteo con "NaN"/"#####"
  | 'fecha_fallback'    // fecha en texto que no se pudo parsear
  | 'archivo_periodo'   // el nombre del archivo no coincide con el período real
  | 'nombre_normalizado'; // "DR. JUAN LÓPEZ" -> "Juan López"

export interface Incidencia {
  tipo: TipoIncidencia;
  severidad: 'info' | 'advertencia' | 'error';
  pestana: string;
  profesional: string;
  detalle: string;
}

export interface ResumenValidacion {
  totalCeldas: number;
  celdasDescartadas: number;
  filasDescartadas: number;
  filasOk: number;
  incidencias: Incidencia[];
}

/** Etiqueta legible del período (YYYY-MM -> "Mayo 2026"). */
export function nombrePeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${meses[Number(mes) - 1] ?? mes} ${anio}`;
}
