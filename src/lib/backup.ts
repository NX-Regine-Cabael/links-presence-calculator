import type {
  Records,
  Prefs,
  WorkDay,
  ImportRecord,
  DayClassification,
} from '@/types/domain'

// Current schema version of the exported backup file. Bump when the shape changes
// in a backward-incompatible way so old files are rejected with a clear message.
export const BACKUP_VERSION = 1

export interface BackupFile {
  version: number
  records: Records | null
  prefs: Prefs
}

export interface BackupSummary {
  employeeName: string | null
  employeeId: string | null
  dayCount: number
  excludedCount: number
  maxAgilePercent: number
}

export type BackupValidation =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: string }

const CLASSIFICATIONS: readonly DayClassification[] = ['agile', 'lavorativa', 'esclusa']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Defensive upper bounds so a malformed or hostile file can't blow up memory.
const MAX_DAYS = 100_000
const MAX_IMPORTS = 10_000
const MAX_EXCLUDED = 2000

class BackupError extends Error {}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Accepts only syntactically AND semantically valid YYYY-MM-DD dates
// (rejects e.g. 2026-13-01 and 2026-02-31, which pass a plain regex).
function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

function validatePrefs(p: unknown): Prefs {
  if (!isObject(p)) throw new BackupError('Sezione "prefs" mancante o non valida.')
  if (
    typeof p.maxAgilePercent !== 'number' ||
    Number.isNaN(p.maxAgilePercent) ||
    p.maxAgilePercent < 0 ||
    p.maxAgilePercent > 100
  ) {
    throw new BackupError('prefs.maxAgilePercent deve essere un numero tra 0 e 100.')
  }

  if (p.excludedDates === undefined) {
    return { maxAgilePercent: p.maxAgilePercent }
  }
  if (!Array.isArray(p.excludedDates) || p.excludedDates.length > MAX_EXCLUDED) {
    throw new BackupError('prefs.excludedDates non valido.')
  }
  const excludedDates = p.excludedDates.map((d, i) => {
    if (!isValidIsoDate(d)) throw new BackupError(`prefs.excludedDates[${i}] non è una data valida.`)
    return d
  })
  return { maxAgilePercent: p.maxAgilePercent, excludedDates }
}

function validateRecords(r: unknown): Records | null {
  if (r === null || r === undefined) return null
  if (!isObject(r)) throw new BackupError('Sezione "records" non valida.')

  if (!isObject(r.employee) || typeof r.employee.userId !== 'string' || typeof r.employee.name !== 'string') {
    throw new BackupError('records.employee non valido.')
  }

  if (!Array.isArray(r.imports) || r.imports.length > MAX_IMPORTS) {
    throw new BackupError('records.imports non valido.')
  }
  const imports: ImportRecord[] = r.imports.map((im, i) => {
    // `month` is a free-form label (a single YYYY-MM or a comma-joined list of
    // months for multi-month imports), so we only require it to be a string.
    if (
      !isObject(im) ||
      typeof im.importedAt !== 'string' ||
      typeof im.filename !== 'string' ||
      typeof im.month !== 'string'
    ) {
      throw new BackupError(`records.imports[${i}] non valido.`)
    }
    return { importedAt: im.importedAt, filename: im.filename, month: im.month }
  })

  if (!Array.isArray(r.days) || r.days.length > MAX_DAYS) {
    throw new BackupError('records.days non valido.')
  }
  const days: WorkDay[] = r.days.map((d, i) => {
    if (!isObject(d) || !isValidIsoDate(d.date) || !CLASSIFICATIONS.includes(d.classification as DayClassification)) {
      throw new BackupError(`records.days[${i}] non valido.`)
    }
    return { date: d.date, classification: d.classification as DayClassification }
  })

  return {
    employee: { userId: r.employee.userId, name: r.employee.name },
    imports,
    days,
  }
}

export function buildBackup(records: Records | null, prefs: Prefs): BackupFile {
  return { version: BACKUP_VERSION, records, prefs }
}

// Validates arbitrary parsed JSON against the backup schema. Returns a normalized
// BackupFile (only known fields kept) on success, or a human-readable error.
export function validateBackup(data: unknown): BackupValidation {
  try {
    if (!isObject(data)) throw new BackupError('Il file non è un backup valido.')
    if (data.version !== BACKUP_VERSION) {
      throw new BackupError(`Versione del backup non supportata (attesa ${BACKUP_VERSION}).`)
    }
    const prefs = validatePrefs(data.prefs)
    const records = validateRecords(data.records)
    return { ok: true, backup: { version: BACKUP_VERSION, records, prefs } }
  } catch (e) {
    return { ok: false, error: e instanceof BackupError ? e.message : 'Backup non valido.' }
  }
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  return {
    employeeName: backup.records?.employee.name ?? null,
    employeeId: backup.records?.employee.userId ?? null,
    dayCount: backup.records?.days.length ?? 0,
    excludedCount: backup.prefs.excludedDates?.length ?? 0,
    maxAgilePercent: backup.prefs.maxAgilePercent,
  }
}
