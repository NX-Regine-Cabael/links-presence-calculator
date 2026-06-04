import {
  newRow,
  rowIsComplete,
  nextWorkingDayAfter,
  datesToRows,
  expandToWorkingDays,
} from '@/lib/excluded-dates'

// ---------------------------------------------------------------------------
// nextWorkingDayAfter
// ---------------------------------------------------------------------------
describe('nextWorkingDayAfter', () => {
  test('Monday → Tuesday', () => {
    expect(nextWorkingDayAfter('2026-06-08')).toBe('2026-06-09')
  })

  test('Friday → next Monday (skips weekend)', () => {
    expect(nextWorkingDayAfter('2026-06-05')).toBe('2026-06-08')
  })

  test('Friday before Easter weekend → Tuesday (skips Sat, Easter Sun, Pasquetta Mon)', () => {
    // Easter 2026 = Apr 5 (Sun), Pasquetta = Apr 6 (Mon)
    expect(nextWorkingDayAfter('2026-04-03')).toBe('2026-04-07')
  })
})

// ---------------------------------------------------------------------------
// datesToRows
// ---------------------------------------------------------------------------
describe('datesToRows', () => {
  test('empty array → one empty single row', () => {
    const rows = datesToRows([])
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe('single')
    expect(rows[0].start).toBe('')
  })

  test('single date → single row', () => {
    const rows = datesToRows(['2026-06-08'])
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe('single')
    expect(rows[0].start).toBe('2026-06-08')
    expect(rows[0].end).toBe('')
  })

  test('two consecutive working days → one range row', () => {
    // Mon + Tue
    const rows = datesToRows(['2026-06-08', '2026-06-09'])
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe('range')
    expect(rows[0].start).toBe('2026-06-08')
    expect(rows[0].end).toBe('2026-06-09')
  })

  test('Mon + Wed (Tue missing) → two single rows', () => {
    const rows = datesToRows(['2026-06-08', '2026-06-10'])
    expect(rows).toHaveLength(2)
    expect(rows.every(r => r.mode === 'single')).toBe(true)
    expect(rows[0].start).toBe('2026-06-08')
    expect(rows[1].start).toBe('2026-06-10')
  })

  test('Mon–Fri → one range', () => {
    const dates = ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12']
    const rows = datesToRows(dates)
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe('range')
    expect(rows[0].start).toBe('2026-06-08')
    expect(rows[0].end).toBe('2026-06-12')
  })

  test('Fri + Mon (across weekend) → one range (consecutive working days)', () => {
    const rows = datesToRows(['2026-06-05', '2026-06-08'])
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe('range')
    expect(rows[0].start).toBe('2026-06-05')
    expect(rows[0].end).toBe('2026-06-08')
  })

  test('unsorted input is sorted before grouping', () => {
    const rows = datesToRows(['2026-06-09', '2026-06-08'])
    expect(rows).toHaveLength(1)
    expect(rows[0].start).toBe('2026-06-08')
    expect(rows[0].end).toBe('2026-06-09')
  })

  test('Saturday in input is silently dropped', () => {
    // Jun 6 = Saturday, Jun 8 = Monday
    const rows = datesToRows(['2026-06-06', '2026-06-08'])
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe('single')
    expect(rows[0].start).toBe('2026-06-08')
  })

  test('Sunday in input is silently dropped', () => {
    const rows = datesToRows(['2026-06-07', '2026-06-08'])
    expect(rows).toHaveLength(1)
    expect(rows[0].start).toBe('2026-06-08')
  })

  test('Italian holiday in input is silently dropped', () => {
    // Jun 2 = Festa della Repubblica; Jun 3 = Wednesday
    const rows = datesToRows(['2026-06-02', '2026-06-03'])
    expect(rows).toHaveLength(1)
    expect(rows[0].mode).toBe('single')
    expect(rows[0].start).toBe('2026-06-03')
  })

  test('two separate ranges and a single produce three rows', () => {
    const dates = [
      '2026-06-08', '2026-06-09', // range Mon-Tue
      '2026-06-11', '2026-06-12', // range Thu-Fri
      '2026-06-17',               // single Wed
    ]
    const rows = datesToRows(dates)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ mode: 'range', start: '2026-06-08', end: '2026-06-09' })
    expect(rows[1]).toMatchObject({ mode: 'range', start: '2026-06-11', end: '2026-06-12' })
    expect(rows[2]).toMatchObject({ mode: 'single', start: '2026-06-17' })
  })
})

// ---------------------------------------------------------------------------
// expandToWorkingDays
// ---------------------------------------------------------------------------
describe('expandToWorkingDays', () => {
  test('single working day → [that date]', () => {
    const row = newRow({ mode: 'single', start: '2026-06-08' })
    expect(expandToWorkingDays([row])).toEqual(['2026-06-08'])
  })

  test('single on Saturday → []', () => {
    const row = newRow({ mode: 'single', start: '2026-06-06' })
    expect(expandToWorkingDays([row])).toEqual([])
  })

  test('single on Italian holiday → []', () => {
    // Jun 2 = Festa della Repubblica
    const row = newRow({ mode: 'single', start: '2026-06-02' })
    expect(expandToWorkingDays([row])).toEqual([])
  })

  test('single with empty start → []', () => {
    const row = newRow({ mode: 'single', start: '' })
    expect(expandToWorkingDays([row])).toEqual([])
  })

  test('range Mon–Wed → [Mon, Tue, Wed]', () => {
    const row = newRow({ mode: 'range', start: '2026-06-08', end: '2026-06-10' })
    expect(expandToWorkingDays([row])).toEqual(['2026-06-08', '2026-06-09', '2026-06-10'])
  })

  test('range Thu–Mon skips weekend', () => {
    const row = newRow({ mode: 'range', start: '2026-06-11', end: '2026-06-15' })
    expect(expandToWorkingDays([row])).toEqual(['2026-06-11', '2026-06-12', '2026-06-15'])
  })

  test('range with end < start → []', () => {
    const row = newRow({ mode: 'range', start: '2026-06-10', end: '2026-06-08' })
    expect(expandToWorkingDays([row])).toEqual([])
  })

  test('range with empty end → []', () => {
    const row = newRow({ mode: 'range', start: '2026-06-08', end: '' })
    expect(expandToWorkingDays([row])).toEqual([])
  })

  test('duplicate dates across rows are deduplicated', () => {
    const r1 = newRow({ mode: 'single', start: '2026-06-08' })
    const r2 = newRow({ mode: 'single', start: '2026-06-08' })
    expect(expandToWorkingDays([r1, r2])).toEqual(['2026-06-08'])
  })

  test('result is sorted ascending', () => {
    const r1 = newRow({ mode: 'single', start: '2026-06-10' })
    const r2 = newRow({ mode: 'single', start: '2026-06-08' })
    expect(expandToWorkingDays([r1, r2])).toEqual(['2026-06-08', '2026-06-10'])
  })

  test('range across Easter skips holiday', () => {
    // Apr 3 (Fri) → Apr 8 (Wed): Apr 5 Sun (Easter) and Apr 6 Mon (Pasquetta) skipped
    const row = newRow({ mode: 'range', start: '2026-04-03', end: '2026-04-08' })
    expect(expandToWorkingDays([row])).toEqual(['2026-04-03', '2026-04-07', '2026-04-08'])
  })
})

// ---------------------------------------------------------------------------
// rowIsComplete
// ---------------------------------------------------------------------------
describe('rowIsComplete', () => {
  test('single with start filled → true', () => {
    expect(rowIsComplete(newRow({ mode: 'single', start: '2026-06-08' }))).toBe(true)
  })

  test('single with empty start → false', () => {
    expect(rowIsComplete(newRow({ mode: 'single', start: '' }))).toBe(false)
  })

  test('range with both filled → true', () => {
    expect(rowIsComplete(newRow({ mode: 'range', start: '2026-06-08', end: '2026-06-10' }))).toBe(true)
  })

  test('range with missing end → false', () => {
    expect(rowIsComplete(newRow({ mode: 'range', start: '2026-06-08', end: '' }))).toBe(false)
  })

  test('range with missing start → false', () => {
    expect(rowIsComplete(newRow({ mode: 'range', start: '', end: '2026-06-10' }))).toBe(false)
  })
})
