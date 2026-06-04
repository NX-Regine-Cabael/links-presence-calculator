function easterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getItalianHolidays(year: number): Set<string> {
  const easter = easterDate(year)
  const fixed = [
    `${year}-01-01`,
    `${year}-01-06`,
    `${year}-04-25`,
    `${year}-05-01`,
    `${year}-06-02`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-12-08`,
    `${year}-12-25`,
    `${year}-12-26`,
  ]
  return new Set([...fixed, toISO(easter), toISO(addDays(easter, 1))])
}

export function isWorkingDay(dateStr: string, holidays: Set<string>): boolean {
  // Use noon to avoid DST edge cases
  const parts = dateStr.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
  const dow = d.getDay()
  return dow !== 0 && dow !== 6 && !holidays.has(dateStr)
}

export function getRemainingWorkingDays(fromDate: Date, year: number, excludedDates?: string[]): number {
  const holidays = getItalianHolidays(year)
  const excluded = new Set(excludedDates ?? [])
  const endOfYear = new Date(year, 11, 31, 12, 0, 0)
  let count = 0
  const current = new Date(fromDate)
  current.setDate(current.getDate() + 1)
  current.setHours(12, 0, 0, 0)
  while (current <= endOfYear) {
    const iso = toISO(current)
    if (isWorkingDay(iso, holidays) && !excluded.has(iso)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}
