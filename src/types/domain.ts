export type DayClassification = 'agile' | 'lavorativa' | 'esclusa'

export interface WorkDay {
  date: string           // ISO date YYYY-MM-DD
  classification: DayClassification
}

export interface ImportRecord {
  importedAt: string     // ISO datetime
  filename: string
  month: string          // YYYY-MM, derived from row dates
}

export interface Employee {
  userId: string
  name: string
}

export interface Records {
  employee: Employee
  imports: ImportRecord[]
  days: WorkDay[]
}

export interface Prefs {
  maxAgilePercent: number  // 0–100
  excludedDates?: string[] // YYYY-MM-DD working days excluded from remaining count
}

export interface ExcelRow {
  userId: string
  name: string
  date: string            // normalized to YYYY-MM-DD
  inizio: string
  fine: string
  sede: string
  tipologia: string
  durata: string
}

export interface MonthStats {
  month: string           // YYYY-MM
  agile: number
  lavorativa: number
  total: number
  percent: number         // 1 decimal, e.g. 62.5
}

export interface YearStats {
  year: number
  agile: number
  lavorativa: number
  total: number
  percent: number
  months: MonthStats[]
}

export interface Projection {
  remainingWorkDays: number
  officeWeeksNeeded: number   // days/week needed in office, 1 decimal
  weeksRemaining: number      // rounded up
}

export interface UnknownTipologia {
  value: string
  occurrences: number
  dates: string[]             // sorted YYYY-MM-DD
}

export interface AmbiguousDay {
  date: string                // YYYY-MM-DD
  agileCount: number          // number of LAVORO AGILE rows
  officeSeats: string[]       // distinct non-agile sede values
}
