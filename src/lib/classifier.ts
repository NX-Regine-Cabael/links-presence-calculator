import type { ExcelRow, WorkDay, DayClassification } from '@/types/domain'

export type TipologiaOverride = Map<string, DayClassification>

const LAVORO_AGILE = 'LAVORO AGILE'
const PERMESSO = 'PERMESSO'
const LAVORATIVE_TIPOLOGIE = new Set(['STANDARD', 'TRASFERTA'])

function norm(s: string): string {
  return s.toUpperCase().trim()
}

function classifyDay(rows: ExcelRow[], overrides: TipologiaOverride): DayClassification {
  // RF-003: remove PERMESSO rows
  const filtered = rows.filter(r => norm(r.tipologia) !== PERMESSO)
  if (filtered.length === 0) return 'esclusa'

  // Apply overrides: replace tipologia/sede for classification
  const resolved: ExcelRow[] = []
  for (const r of filtered) {
    const t = norm(r.tipologia)
    const override = overrides.get(t)
    if (override === 'esclusa') continue
    if (override === 'agile') {
      resolved.push({ ...r, sede: LAVORO_AGILE })
    } else if (override === 'lavorativa') {
      resolved.push({ ...r, tipologia: 'STANDARD' })
    } else {
      resolved.push(r)
    }
  }

  if (resolved.length === 0) return 'esclusa'

  // RF-004: agile
  if (resolved.some(r => norm(r.sede) === LAVORO_AGILE)) return 'agile'

  // RF-005: lavorativa
  if (
    resolved.some(
      r =>
        r.sede.trim() !== '' &&
        norm(r.sede) !== LAVORO_AGILE &&
        LAVORATIVE_TIPOLOGIE.has(norm(r.tipologia))
    )
  )
    return 'lavorativa'

  // RF-006: esclusa
  return 'esclusa'
}

export function classifyDays(rows: ExcelRow[], overrides: TipologiaOverride = new Map()): WorkDay[] {
  const grouped = new Map<string, ExcelRow[]>()
  for (const row of rows) {
    const key = `${row.userId}|${row.date}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  const days: WorkDay[] = []
  for (const [key, dayRows] of grouped) {
    const date = key.split('|')[1]
    days.push({ date, classification: classifyDay(dayRows, overrides) })
  }

  return days.sort((a, b) => a.date.localeCompare(b.date))
}
