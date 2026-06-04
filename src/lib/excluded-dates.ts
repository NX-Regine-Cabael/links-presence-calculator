import { getItalianHolidays, isWorkingDay } from '@/lib/holidays'

export type RowMode = 'single' | 'range'

export interface DateRow {
  id: number
  mode: RowMode
  start: string
  end: string
}

let _id = 0
export function newRow(overrides: Partial<DateRow> = {}): DateRow {
  return { id: _id++, mode: 'single', start: '', end: '', ...overrides }
}

export function rowIsComplete(row: DateRow): boolean {
  return row.mode === 'single' ? row.start !== '' : row.start !== '' && row.end !== ''
}

// Returns the first working day strictly after dateStr, skipping weekends and holidays.
export function nextWorkingDayAfter(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  for (let i = 0; i < 7; i++) {
    d.setDate(d.getDate() + 1)
    const iso = d.toISOString().slice(0, 10)
    if (isWorkingDay(iso, getItalianHolidays(d.getFullYear()))) return iso
  }
  return ''
}

// Groups a flat list of YYYY-MM-DD dates into DateRow entries, merging consecutive
// working days into ranges. Non-working days (weekends, holidays) are silently dropped.
export function datesToRows(dates: string[]): DateRow[] {
  const sorted = dates
    .filter(d => isWorkingDay(d, getItalianHolidays(Number(d.slice(0, 4)))))
    .sort()
  if (sorted.length === 0) return [newRow()]

  const rows: DateRow[] = []
  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (nextWorkingDayAfter(rangeEnd) === sorted[i]) {
      rangeEnd = sorted[i]
    } else {
      rows.push(
        rangeStart === rangeEnd
          ? newRow({ mode: 'single', start: rangeStart })
          : newRow({ mode: 'range', start: rangeStart, end: rangeEnd })
      )
      rangeStart = sorted[i]
      rangeEnd = sorted[i]
    }
  }
  rows.push(
    rangeStart === rangeEnd
      ? newRow({ mode: 'single', start: rangeStart })
      : newRow({ mode: 'range', start: rangeStart, end: rangeEnd })
  )
  return rows
}

// Expands DateRow entries into a sorted, deduplicated list of YYYY-MM-DD working days.
export function expandToWorkingDays(rows: DateRow[]): string[] {
  const result = new Set<string>()
  for (const row of rows) {
    if (!row.start) continue
    if (row.mode === 'single') {
      if (isWorkingDay(row.start, getItalianHolidays(Number(row.start.slice(0, 4))))) {
        result.add(row.start)
      }
    } else {
      if (!row.end || row.end < row.start) continue
      const current = new Date(row.start + 'T12:00:00')
      const end = new Date(row.end + 'T12:00:00')
      while (current <= end) {
        const iso = current.toISOString().slice(0, 10)
        if (isWorkingDay(iso, getItalianHolidays(current.getFullYear()))) result.add(iso)
        current.setDate(current.getDate() + 1)
      }
    }
  }
  return Array.from(result).sort()
}
