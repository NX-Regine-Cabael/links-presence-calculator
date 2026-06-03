import * as XLSX from 'xlsx'
import type { ExcelRow, UnknownTipologia } from '@/types/domain'

const KNOWN_TIPOLOGIE = new Set(['PERMESSO', 'STANDARD', 'TRASFERTA'])

const COLUMN_MAP: Record<string, keyof ExcelRow> = {
  'ID Utente': 'userId',
  Nominativo: 'name',
  Data: 'date',
  Inizio: 'inizio',
  Fine: 'fine',
  Sede: 'sede',
  Tipologia: 'tipologia',
  Durata: 'durata',
}

function parseDate(value: unknown): string {
  if (typeof value === 'number') {
    const info = XLSX.SSF.parse_date_code(value)
    const m = String(info.m).padStart(2, '0')
    const d = String(info.d).padStart(2, '0')
    return `${info.y}-${m}-${d}`
  }
  const s = String(value ?? '').trim()
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  return s
}

export interface ParseResult {
  rows: ExcelRow[]
  unknownTipologie: UnknownTipologia[]
}

export function parseExcelBuffers(buffers: ArrayBuffer[]): ParseResult {
  const allRows: ExcelRow[] = []

  for (const buffer of buffers) {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    for (const rawRow of raw) {
      const row = {} as ExcelRow
      for (const [col, field] of Object.entries(COLUMN_MAP)) {
        const val = rawRow[col]
        if (field === 'date') {
          row.date = parseDate(val)
        } else {
          ;(row as unknown as Record<string, string>)[field] = String(val ?? '').trim()
        }
      }
      allRows.push(row)
    }
  }

  // Detect unknown tipologie
  const unknownMap = new Map<string, { occurrences: number; dates: Set<string> }>()
  for (const row of allRows) {
    const t = row.tipologia.toUpperCase().trim()
    if (!KNOWN_TIPOLOGIE.has(t)) {
      if (!unknownMap.has(t)) unknownMap.set(t, { occurrences: 0, dates: new Set() })
      const entry = unknownMap.get(t)!
      entry.occurrences++
      entry.dates.add(row.date)
    }
  }

  const unknownTipologie: UnknownTipologia[] = Array.from(unknownMap.entries()).map(
    ([value, { occurrences, dates }]) => ({
      value,
      occurrences,
      dates: Array.from(dates).sort(),
    })
  )

  return { rows: allRows, unknownTipologie }
}
