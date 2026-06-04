import type { WorkDay, MonthStats, YearStats, Projection } from '@/types/domain'
import { getRemainingWorkingDays } from '@/lib/holidays'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function computeYearStats(days: WorkDay[], year: number): YearStats {
  const yearStr = String(year)
  const yearDays = days.filter(d => d.date.startsWith(yearStr))

  const agile = yearDays.filter(d => d.classification === 'agile').length
  const lavorativa = yearDays.filter(d => d.classification === 'lavorativa').length
  const total = agile + lavorativa
  const percent = total === 0 ? 0 : round1((agile / total) * 100)

  const monthMap = new Map<string, { agile: number; lavorativa: number }>()
  for (const d of yearDays) {
    if (d.classification === 'esclusa') continue
    const month = d.date.slice(0, 7)
    if (!monthMap.has(month)) monthMap.set(month, { agile: 0, lavorativa: 0 })
    const m = monthMap.get(month)!
    if (d.classification === 'agile') m.agile++
    else m.lavorativa++
  }

  const months: MonthStats[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { agile, lavorativa }]) => {
      const total = agile + lavorativa
      return { month, agile, lavorativa, total, percent: total === 0 ? 0 : round1((agile / total) * 100) }
    })

  return { year, agile, lavorativa, total, percent, months }
}

export function computeProjection(
  stats: YearStats,
  maxAgilePercent: number,
  today: Date = new Date(),
  excludedDates?: string[]
): Projection | null {
  if (stats.percent <= maxAgilePercent) return null

  const remainingWorkDays = getRemainingWorkingDays(today, stats.year, excludedDates)
  if (remainingWorkDays === 0) return null

  const totalExpected = stats.total + remainingWorkDays
  const agileAllowed = Math.floor((maxAgilePercent / 100) * totalExpected)
  const agileStillAllowed = Math.max(0, agileAllowed - stats.agile)
  const officeNeeded = remainingWorkDays - agileStillAllowed
  const weeksRemaining = remainingWorkDays / 5
  const officeWeeksNeeded = round1(officeNeeded / weeksRemaining)

  return {
    remainingWorkDays,
    officeWeeksNeeded,
    weeksRemaining: Math.ceil(weeksRemaining),
  }
}
