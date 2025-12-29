
export interface BillingRow {
  'Nome do aluno': string;
  'Nome do responsavel financeiro': string;
  'Serie': string;
  'Data de vencimento': any;
  'Valor da cobrança com bolsas': number | string;
  'Valor mínimo da cobrança': number | string;
  diff_abs: number;
  diff_percent: number;
  unitId?: string;
  [key: string]: any;
}

export interface DuplicateInfo {
  name: string;
  count: number;
}

export interface Resolution {
  note: string;
  resolvedAt: string;
}

export interface StudentResolutions {
  date?: Resolution;
  value?: Resolution;
}

export interface Unit {
  id: string;
  name: string;
  lastUpdated?: string;
  data?: BillingRow[];
  resolutions?: { [studentSlug: string]: StudentResolutions };
}

export interface SummaryStats {
  totalRows: number;
  duplicateCount: number;
  duplicates: DuplicateInfo[];
  avgDiff: number;
  avgPercent: number;
  totalBilled: number;
  totalMin: number;
}

export interface AIInsight {
  summary: string;
  anomalies: string[];
  recommendations: string[];
  financialTrend: string;
}

export enum AnalysisStatus {
  CONNECTING = 'CONNECTING',
  UNIT_SELECTION = 'UNIT_SELECTION',
  LOADING_UNIT = 'LOADING_UNIT',
  READY = 'READY',
  NO_DATA = 'NO_DATA',
  ERROR = 'ERROR'
}