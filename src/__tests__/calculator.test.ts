import { computeYearStats, computeProjection } from '@/lib/calculator'
import type { WorkDay } from '@/types/domain'

function day(date: string, classification: WorkDay['classification']): WorkDay {
  return { date, classification }
}

describe('computeYearStats', () => {
  const days: WorkDay[] = [
    day('2026-01-02', 'agile'),
    day('2026-01-05', 'lavorativa'),
    day('2026-01-06', 'esclusa'),  // should not count
    day('2026-02-02', 'agile'),
    day('2026-02-03', 'agile'),
    day('2025-12-01', 'agile'),    // different year — should not count
  ]

  const stats = computeYearStats(days, 2026)

  test('counts agile days for the requested year only', () => {
    expect(stats.agile).toBe(3)  // Jan2 + Feb2 + Feb3
  })

  test('counts lavorativa days', () => {
    expect(stats.lavorativa).toBe(1)
  })

  test('excluded days do not count toward total', () => {
    expect(stats.total).toBe(4)
  })

  test('calculates percent with one decimal', () => {
    expect(stats.percent).toBe(75.0)
  })

  test('groups months correctly', () => {
    expect(stats.months).toHaveLength(2)
    const jan = stats.months.find(m => m.month === '2026-01')!
    expect(jan.agile).toBe(1)
    expect(jan.lavorativa).toBe(1)
    expect(jan.total).toBe(2)
    expect(jan.percent).toBe(50.0)
    const feb = stats.months.find(m => m.month === '2026-02')!
    expect(feb.agile).toBe(2)
    expect(feb.percent).toBe(100.0)
  })

  test('returns empty months array when no data for year', () => {
    expect(computeYearStats(days, 2024).months).toHaveLength(0)
  })
})

describe('computeProjection', () => {
  test('returns null when percent is within limit', () => {
    const stats = computeYearStats([day('2026-01-02', 'agile'), day('2026-01-05', 'lavorativa')], 2026)
    // 50% agile, limit 50 → not over
    expect(computeProjection(stats, 50, new Date('2026-01-31T12:00:00'))).toBeNull()
  })

  test('returns null when year is over and percent exceeds limit', () => {
    const stats = computeYearStats([day('2026-01-02', 'agile')], 2026)
    // Past the end of the year
    expect(computeProjection(stats, 50, new Date('2027-01-05T12:00:00'))).toBeNull()
  })

  test('excludedDates: excluded days reduce remainingWorkDays in projection', () => {
    // 3 agile days → 100% > 50% limit; Dec 30: 1 remaining day (Dec 31)
    // Exclude Dec 31 → 0 remaining → null
    const days = [
      day('2026-01-02', 'agile'),
      day('2026-01-05', 'agile'),
      day('2026-01-06', 'agile'),
    ]
    const stats = computeYearStats(days, 2026)
    const projection = computeProjection(stats, 50, new Date('2026-12-30T12:00:00'), ['2026-12-31'])
    expect(projection).toBeNull()
  })

  test('excludedDates: partial exclusion changes remainingWorkDays', () => {
    // Dec 29 → 2 remaining (Dec 30, Dec 31); exclude Dec 30 → 1 remaining
    const days = [
      day('2026-01-02', 'agile'),
      day('2026-01-05', 'agile'),
      day('2026-01-06', 'agile'),
    ]
    const stats = computeYearStats(days, 2026)
    const projBase = computeProjection(stats, 50, new Date('2026-12-29T12:00:00'))
    const projExcl = computeProjection(stats, 50, new Date('2026-12-29T12:00:00'), ['2026-12-30'])
    expect(projBase!.remainingWorkDays).toBe(2)
    expect(projExcl!.remainingWorkDays).toBe(1)
  })

  test('returns projection when percent exceeds limit', () => {
    // 3 agile, 0 lavorativa in 2026 so far → 100% agile > 50% limit
    const days = [
      day('2026-01-02', 'agile'),
      day('2026-01-05', 'agile'),
      day('2026-01-06', 'agile'),
    ]
    const stats = computeYearStats(days, 2026)
    // Dec 30 → 1 remaining working day (Dec 31 = Thursday)
    const projection = computeProjection(stats, 50, new Date('2026-12-30T12:00:00'))
    expect(projection).not.toBeNull()
    expect(projection!.remainingWorkDays).toBe(1)
    // totalExpected = 3 + 1 = 4, agileAllowed = floor(0.5 * 4) = 2
    // agileStillAllowed = max(0, 2 - 3) = 0
    // officeNeeded = 1 - 0 = 1
    // weeksRemaining = 1/5 = 0.2
    // officeWeeksNeeded = round(1 / 0.2 * 10) / 10 = round(50) / 10 = 5.0
    expect(projection!.officeWeeksNeeded).toBe(5.0)
  })
})
