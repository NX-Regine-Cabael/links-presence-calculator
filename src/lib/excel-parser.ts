import * as XLSX from 'xlsx'
import type { ExcelRow, UnknownTipologia } from '@/types/domain'

const KNOWN_TIPOLOGIE = new Set([
  'PERMESSO',
  'STANDARD',
  'TRASFERTA',
  'MALATTIA',
  'FERIE',
  'STRAORDINARIO',
  'INDENNITA TRASFERTA',
])

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

// xlsx mis-parses DD/MM/YYYY dates in HTML-format XLS files as MM/DD/YYYY,
// placing any day ≤ 12 in the wrong month. For these files we bypass xlsx
// and extract cell text directly from the HTML.

function isHtmlBuffer(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, 64)
  const prefix = new TextDecoder('utf-8', { fatal: false }).decode(bytes).toLowerCase().replace(/\s/g, '')
  return prefix.includes('<html')
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function parseHtmlXlsBuffer(buffer: ArrayBuffer): Record<string, unknown>[] {
  const html = new TextDecoder('utf-8', { fatal: false }).decode(buffer)

  const allRows: string[][] = []
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch: RegExpExecArray | null

  while ((trMatch = trRe.exec(html)) !== null) {
    const cells: string[] = []
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let tdMatch: RegExpExecArray | null

    while ((tdMatch = tdRe.exec(trMatch[1])) !== null) {
      const text = unescapeHtml(tdMatch[1].replace(/<[^>]+>/g, '')).trim()
      cells.push(text)
    }

    if (cells.length > 0) allRows.push(cells)
  }

  if (allRows.length < 2) return []

  const headers = allRows[0]
  return allRows.slice(1).map(cells => {
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
    return obj
  })
}

export interface ParseResult {
  rows: ExcelRow[]
  unknownTipologie: UnknownTipologia[]
}

export function parseExcelBuffers(buffers: ArrayBuffer[]): ParseResult {
  const allRows: ExcelRow[] = []

  for (const buffer of buffers) {
    let rawRows: Record<string, unknown>[]

    if (isHtmlBuffer(buffer)) {
      rawRows = parseHtmlXlsBuffer(buffer)
    } else {
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    }

    for (const rawRow of rawRows) {
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
