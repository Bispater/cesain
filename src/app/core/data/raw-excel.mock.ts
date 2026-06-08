import { TipoProfesional } from '../models/liquidacion.model';

/**
 * Representación CRUDA del Excel, tal como llega: encabezados por día como
 * texto ("06-may", "27-05-2026"), celdas vacías o "NaN", previsiones escritas
 * a mano y el nombre del archivo que NO coincide con el período real de los
 * datos. El servicio de ingesta se encarga de limpiar todo esto.
 */

export interface RawFila {
  prestacion: string;
  /** Previsión tal cual venía (puede venir sucia o vacía). */
  prevision: string;
  /** Valor unitario; puede llegar como "NaN" o vacío. */
  valor: number | string | null;
  /** Copago unitario para exámenes; "NaN" cuando no aplica. */
  copago?: number | string | null;
  /** Conteo de pacientes por columna-día (la celda puede ser "NaN"/null). */
  dias: Record<string, number | string | null>;
}

export interface RawExcelTab {
  /** Nombre de la pestaña original. */
  pestana: string;
  /** Profesional tal cual ("DRA. CASANOVA", con prefijos sucios). */
  profesionalRaw: string;
  especialidad: string;
  tipo: TipoProfesional;
  sede: string;
  /** % clínica como venía: "22%", "25%"... */
  porcentaje: string;
  /** Nombre del archivo subido (¡ojo, dice Junio pero los datos son de Mayo!). */
  archivoNombre: string;
  /** Período REAL detectado en las fechas de las celdas. */
  periodoReal: string;
  filas: RawFila[];
}

export const RAW_EXCEL_TABS: RawExcelTab[] = [
  // ───────────────────────────── 1) MÉDICO ─────────────────────────────
  {
    pestana: 'DRA. CASANOVA',
    profesionalRaw: 'DRA. CASANOVA',
    especialidad: 'Medicina General',
    tipo: 'MEDICO',
    sede: 'Valparaíso',
    porcentaje: '22%',
    archivoNombre: 'LIQUIDACION JUNIO 2026.xlsx', // <- mal nombrado a propósito
    periodoReal: '2026-05',
    filas: [
      {
        prestacion: 'Bono Fonasa',
        prevision: 'FONASA',
        valor: 19220,
        copago: 0,
        dias: { '06-may': 18, '07-may': 19, '08-may': 'NaN', '09-may': 7, '13-may': 17, '14-may': 14, '15-may': 14, '16-may': 8, '20-may': 22, '22-may': 17, '23-may': 9, '27-05-2026': 24 },
      },
      {
        prestacion: 'Certificado Médico',
        prevision: 'PARTICULAR',
        valor: 18000,
        copago: 18000,
        dias: { '07-may': 1, '08-may': 1, '09-may': 1, '22-may': 2 },
      },
      {
        prestacion: 'Consulta Particular',
        prevision: 'PARTICULAR',
        valor: 30000,
        copago: 30000,
        dias: { '06-may': 1, '07-may': 2, '08-may': 2, '13-may': 3, '14-may': 1, '16-may': 2, '20-may': 1, '22-may': 1, '23-may': 2, '27-05-2026': 1 },
      },
      {
        // fila basura típica del Excel: sin valor, todo NaN -> se descarta
        prestacion: 'Rev Examen',
        prevision: '',
        valor: 'NaN',
        copago: 'NaN',
        dias: {},
      },
    ],
  },

  // ─────────────────────────── 2) KINESIÓLOGO ───────────────────────────
  {
    pestana: 'KINE Sebastian Salinas',
    profesionalRaw: 'KINE. Sebastian Salinas',
    especialidad: 'Kinesiología',
    tipo: 'KINESIOLOGO',
    sede: 'Quintero',
    porcentaje: '25%',
    archivoNombre: 'LIQUIDACION JUNIO 2026.xlsx',
    periodoReal: '2026-05',
    filas: [
      {
        prestacion: 'Consulta Particular',
        prevision: 'PARTICULAR',
        valor: 35000,
        copago: 35000,
        dias: { '08-may': 10, '15-may': 7, '22-may': 6 },
      },
      {
        prestacion: 'Adulto Mayor 65 años',
        prevision: 'PARTICULAR',
        valor: 30000,
        copago: 30000,
        dias: { '08-may': 2, '15-may': 5, '22-may': 4 },
      },
      {
        prestacion: 'Rev. Exámenes',
        prevision: 'PARTICULAR',
        valor: 20000,
        copago: 20000,
        dias: { '15-may': 1 },
      },
      {
        prestacion: 'Control Misma Patología',
        prevision: 'PARTICULAR',
        valor: 20000,
        copago: 20000,
        dias: { '08-may': 3 },
      },
      {
        prestacion: 'Tratamiento Kinésico',
        prevision: 'FONASA',
        valor: 'NaN', // sin atenciones este mes -> se descarta
        copago: 'NaN',
        dias: {},
      },
    ],
  },

  // ──────────────────── 3) TECNÓLOGO MÉDICO (EXÁMENES) ───────────────────
  {
    pestana: 'ECOGRAFIAS DIARIAS VIVIAN',
    profesionalRaw: 'TM VIVIAN',
    especialidad: 'Ecografía / Imagenología',
    tipo: 'TECNOLOGO_MEDICO',
    sede: 'Quintero',
    porcentaje: '25%',
    archivoNombre: 'LIQUIDACION JUNIO 2026.xlsx',
    periodoReal: '2026-05',
    filas: [
      {
        prestacion: 'Eco Abdominal',
        prevision: 'FONASA',
        valor: 43340,   // bono total Fonasa por examen
        copago: 29790,  // copago paciente
        dias: { '18-05-2026': 1, '20-05-2026': 4 },
      },
      {
        prestacion: 'Eco Abdominal',
        prevision: 'PARTICULAR',
        valor: 48000,
        copago: 42000,
        dias: { '20-05-2026': 2 },
      },
      {
        prestacion: 'Eco Pélvica Masculina',
        prevision: 'FONASA',
        valor: 24100,
        copago: 16570,
        dias: { '20-05-2026': 1 },
      },
      {
        prestacion: 'Eco Partes Blandas',
        prevision: 'FONASA',
        valor: 30210,
        copago: 20770,
        dias: { '18-05-2026': 4, '20-05-2026': 1 },
      },
      {
        prestacion: 'Eco Partes Blandas',
        prevision: 'PARTICULAR',
        valor: 35000,
        copago: 35000,
        dias: { '18-05-2026': 2 },
      },
      {
        prestacion: 'Eco Renal',
        prevision: 'FONASA',
        valor: 'NaN', // sin exámenes -> se descarta
        copago: 'NaN',
        dias: {},
      },
    ],
  },

  // ───── Profesionales extra (para enriquecer dashboard y gráfico) ─────
  {
    pestana: 'DR. JUAN LOPEZ',
    profesionalRaw: 'DR. JUAN LÓPEZ',
    especialidad: 'Medicina General',
    tipo: 'MEDICO',
    sede: 'Valparaíso',
    porcentaje: '22%',
    archivoNombre: 'LIQUIDACION MAYO 2026.xlsx',
    periodoReal: '2026-05',
    filas: [
      {
        prestacion: 'Bono Fonasa',
        prevision: 'FONASA',
        valor: 19220,
        copago: 0,
        dias: { '06-may': 12, '13-may': 15, '20-may': 18, '27-05-2026': 10 },
      },
      {
        prestacion: 'Consulta ISAPRE',
        prevision: 'ISAPRE',
        valor: 28000,
        copago: 12000,
        dias: { '06-may': 3, '20-may': 4 },
      },
    ],
  },
  {
    pestana: 'DR. MARQUEZ',
    profesionalRaw: 'DR. RAFAEL MÁRQUEZ',
    especialidad: 'Medicina General',
    tipo: 'MEDICO',
    sede: 'Quintero',
    porcentaje: '25%',
    archivoNombre: 'LIQUIDACION MARZO 2026.xlsx', // datos abril
    periodoReal: '2026-04',
    filas: [
      {
        prestacion: 'Fonasa Actual',
        prevision: 'FONASA',
        valor: 15130,
        copago: 0,
        dias: { '07-apr': 6, '12-apr': 6, '18-apr': 6, '21-apr': 5, '28-04-2026': 8 },
      },
      {
        prestacion: 'Eco Obstétrica Particular',
        prevision: 'PARTICULAR',
        valor: 30000,
        copago: 30000,
        dias: { '07-apr': 2, '21-apr': 1 },
      },
    ],
  },

  // ───── Histórico Mayo 2025 (para comparativa interanual) ─────
  {
    pestana: 'DRA. CASANOVA 2025',
    profesionalRaw: 'DRA. CASANOVA',
    especialidad: 'Medicina General',
    tipo: 'MEDICO',
    sede: 'Valparaíso',
    porcentaje: '22%',
    archivoNombre: 'LIQUIDACION MAYO 2025.xlsx',
    periodoReal: '2025-05',
    filas: [
      {
        prestacion: 'Bono Fonasa',
        prevision: 'FONASA',
        valor: 18100,
        copago: 0,
        dias: { '06-may': 14, '13-may': 12, '20-may': 16, '27-05-2025': 18 },
      },
      {
        prestacion: 'Consulta Particular',
        prevision: 'PARTICULAR',
        valor: 28000,
        copago: 28000,
        dias: { '06-may': 1, '13-may': 2, '20-may': 1 },
      },
    ],
  },
  {
    pestana: 'KINE Sebastian Salinas 2025',
    profesionalRaw: 'KINE. Sebastian Salinas',
    especialidad: 'Kinesiología',
    tipo: 'KINESIOLOGO',
    sede: 'Quintero',
    porcentaje: '25%',
    archivoNombre: 'LIQUIDACION MAYO 2025.xlsx',
    periodoReal: '2025-05',
    filas: [
      {
        prestacion: 'Consulta Particular',
        prevision: 'PARTICULAR',
        valor: 32000,
        copago: 32000,
        dias: { '08-may': 8, '15-may': 6, '22-may': 5 },
      },
      {
        prestacion: 'Adulto Mayor 65 años',
        prevision: 'PARTICULAR',
        valor: 27000,
        copago: 27000,
        dias: { '08-may': 3, '22-may': 2 },
      },
    ],
  },
  {
    pestana: 'ECOGRAFIAS DIARIAS VIVIAN 2025',
    profesionalRaw: 'TM VIVIAN',
    especialidad: 'Ecografía / Imagenología',
    tipo: 'TECNOLOGO_MEDICO',
    sede: 'Quintero',
    porcentaje: '25%',
    archivoNombre: 'LIQUIDACION MAYO 2025.xlsx',
    periodoReal: '2025-05',
    filas: [
      {
        prestacion: 'Eco Abdominal',
        prevision: 'FONASA',
        valor: 41200,
        copago: 28300,
        dias: { '19-05-2025': 2, '26-05-2025': 3 },
      },
      {
        prestacion: 'Eco Partes Blandas',
        prevision: 'PARTICULAR',
        valor: 33000,
        copago: 33000,
        dias: { '19-05-2025': 1 },
      },
    ],
  },
];
