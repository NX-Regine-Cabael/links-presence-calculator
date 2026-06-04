import { getItalianHolidays, isWorkingDay, getRemainingWorkingDays } from '@/lib/holidays'

describe('getItalianHolidays', () => {
  test('includes fixed holidays for 2026', () => {
    const h = getItalianHolidays(2026)
    expect(h.has('2026-01-01')).toBe(true)  // Capodanno
    expect(h.has('2026-01-06')).toBe(true)  // Epifania
    expect(h.has('2026-04-25')).toBe(true)  // Liberazione
    expect(h.has('2026-05-01')).toBe(true)  // Lavoro
    expect(h.has('2026-06-02')).toBe(true)  // Repubblica
    expect(h.has('2026-08-15')).toBe(true)  // Ferragosto
    expect(h.has('2026-11-01')).toBe(true)  // Ognissanti
    expect(h.has('2026-12-08')).toBe(true)  // Immacolata
    expect(h.has('2026-12-25')).toBe(true)  // Natale
    expect(h.has('2026-12-26')).toBe(true)  // Santo Stefano
  })

  test('calculates Easter 2026 as April 5 and Pasquetta as April 6', () => {
    const h = getItalianHolidays(2026)
    expect(h.has('2026-04-05')).toBe(true)  // Pasqua
    expect(h.has('2026-04-06')).toBe(true)  // Pasquetta
  })

  test('calculates Easter 2025 as April 20 and Pasquetta as April 21', () => {
    const h = getItalianHolidays(2025)
    expect(h.has('2025-04-20')).toBe(true)
    expect(h.has('2025-04-21')).toBe(true)
  })

  test('calculates Easter 2024 as March 31 and Pasquetta as April 1', () => {
    const h = getItalianHolidays(2024)
    expect(h.has('2024-03-31')).toBe(true)
    expect(h.has('2024-04-01')).toBe(true)
  })
})

describe('isWorkingDay', () => {
  const holidays2026 = getItalianHolidays(2026)

  test('Monday is a working day', () => {
    expect(isWorkingDay('2026-01-05', holidays2026)).toBe(true)  // Monday
  })

  test('Saturday is not a working day', () => {
    expect(isWorkingDay('2026-01-03', holidays2026)).toBe(false)
  })

  test('Sunday is not a working day', () => {
    expect(isWorkingDay('2026-01-04', holidays2026)).toBe(false)
  })

  test('Capodanno Thursday is not a working day', () => {
    expect(isWorkingDay('2026-01-01', holidays2026)).toBe(false)
  })
})

describe('getRemainingWorkingDays', () => {
  test('Dec 30 2026 → 1 remaining working day (Dec 31 = Thursday)', () => {
    const today = new Date('2026-12-30T12:00:00')
    expect(getRemainingWorkingDays(today, 2026)).toBe(1)
  })

  test('Dec 31 2026 → 0 remaining working days', () => {
    const today = new Date('2026-12-31T12:00:00')
    expect(getRemainingWorkingDays(today, 2026)).toBe(0)
  })

  test('excludedDates: one excluded working day reduces count by 1', () => {
    // Dec 29 (Tue): remaining = Dec 30 (Wed) + Dec 31 (Thu) = 2
    const today = new Date('2026-12-29T12:00:00')
    expect(getRemainingWorkingDays(today, 2026)).toBe(2)
    expect(getRemainingWorkingDays(today, 2026, ['2026-12-30'])).toBe(1)
  })

  test('excludedDates: both remaining days excluded → 0', () => {
    const today = new Date('2026-12-29T12:00:00')
    expect(getRemainingWorkingDays(today, 2026, ['2026-12-30', '2026-12-31'])).toBe(0)
  })

  test('excludedDates: excluding a weekend has no effect (already not counted)', () => {
    const today = new Date('2026-12-29T12:00:00')
    expect(getRemainingWorkingDays(today, 2026, ['2026-12-27'])).toBe(2) // Sun
  })

  test('excludedDates: empty array has no effect', () => {
    const today = new Date('2026-12-30T12:00:00')
    expect(getRemainingWorkingDays(today, 2026, [])).toBe(1)
  })

  test('excludedDates: date from a different year has no effect', () => {
    const today = new Date('2026-12-30T12:00:00')
    expect(getRemainingWorkingDays(today, 2026, ['2025-12-31'])).toBe(1)
  })

  test('excludedDates: undefined behaves the same as no exclusions', () => {
    const today = new Date('2026-12-30T12:00:00')
    expect(getRemainingWorkingDays(today, 2026, undefined)).toBe(1)
  })
})
