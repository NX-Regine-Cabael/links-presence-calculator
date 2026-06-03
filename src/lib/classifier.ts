import type { ExcelRow, WorkDay, DayClassification, AmbiguousDay } from '@/types/domain'

export type TipologiaOverride = Map<string, DayClassification>
export type DayOverride = Map<string, DayClassification>

const LAVORO_AGILE = 'LAVORO AGILE'
const LAVORATIVE_TIPOLOGIE = new Set(['STANDARD', 'TRASFERTA'])
const EXCLUDED_TIPOLOGIE = new Set([
  'PERMESSO',
  'MALATTIA',
  'FERIE',
  'STRAORDINARIO',
  'INDENNITA TRASFERTA',
])

export interface ClassifyResult {
  days: WorkDay[]
  ambiguousDays: AmbiguousDay[]
}

function norm(s: string): string {
  return s.toUpperCase().trim()
}

function isAgileRow(r: ExcelRow): boolean {
  return norm(r.sede) === LAVORO_AGILE
}

function isOfficeRow(r: ExcelRow): boolean {
  return (
    r.sede.trim() !== '' &&
    norm(r.sede) !== LAVORO_AGILE &&
    (LAVORATIVE_TIPOLOGIE.has(norm(r.tipologia)) || norm(r.sede).includes('PRESSO CLIENTE'))
  )
}

function resolveRows(rows: ExcelRow[], tipologiaOverrides: TipologiaOverride): ExcelRow[] {
  // RF-003: remove excluded tipologie
  const filtered = rows.filter(r => !EXCLUDED_TIPOLOGIE.has(norm(r.tipologia)))

  const resolved: ExcelRow[] = []
  for (const r of filtered) {
    const t = norm(r.tipologia)
    const override = tipologiaOverrides.get(t)
    if (override === 'esclusa') continue
    if (override === 'agile') {
      resolved.push({ ...r, sede: LAVORO_AGILE })
    } else if (override === 'lavorativa') {
      resolved.push({ ...r, tipologia: 'STANDARD' })
    } else {
      resolved.push(r)
    }
  }
  return resolved
}

function classifyResolved(resolved: ExcelRow[]): DayClassification | 'ambiguous' {
  if (resolved.length === 0) return 'esclusa'

  const hasAgile = resolved.some(isAgileRow)
  const hasOffice = resolved.some(isOfficeRow)

  // RF-008: both agile and in-person rows — cannot auto-classify
  if (hasAgile && hasOffice) return 'ambiguous'

  // RF-004: agile
  if (hasAgile) return 'agile'

  // RF-005: lavorativa
  if (hasOffice) return 'lavorativa'

  // RF-006: esclusa
  return 'esclusa'
}

export function classifyDays(
  rows: ExcelRow[],
  tipologiaOverrides: TipologiaOverride = new Map(),
  dayOverrides: DayOverride = new Map(),
): ClassifyResult {
  const grouped = new Map<string, ExcelRow[]>()
  for (const row of rows) {
    const key = `${row.userId}|${row.date}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  const days: WorkDay[] = []
  const ambiguousDays: AmbiguousDay[] = []

  for (const [key, dayRows] of grouped) {
    const date = key.split('|')[1]

    // Day-level override takes precedence over auto-classification
    if (dayOverrides.has(date)) {
      days.push({ date, classification: dayOverrides.get(date)! })
      continue
    }

    const resolved = resolveRows(dayRows, tipologiaOverrides)
    const result = classifyResolved(resolved)

    if (result === 'ambiguous') {
      ambiguousDays.push({
        date,
        agileCount: resolved.filter(isAgileRow).length,
        officeSeats: [...new Set(resolved.filter(isOfficeRow).map(r => r.sede.trim()))],
      })
    } else {
      days.push({ date, classification: result })
    }
  }

  return {
    days: days.sort((a, b) => a.date.localeCompare(b.date)),
    ambiguousDays: ambiguousDays.sort((a, b) => a.date.localeCompare(b.date)),
  }
}
