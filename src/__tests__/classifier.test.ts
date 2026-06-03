import { classifyDays } from '@/lib/classifier'
import type { ExcelRow } from '@/types/domain'

function row(overrides: Partial<ExcelRow>): ExcelRow {
  return {
    userId: 'U001',
    name: 'Mario Rossi',
    date: '2026-01-02',
    inizio: '09:00',
    fine: '18:00',
    sede: 'UFFICIO',
    tipologia: 'STANDARD',
    durata: '8',
    ...overrides,
  }
}

describe('classifyDays', () => {
  test('LAVORO AGILE sede → agile', () => {
    const days = classifyDays([row({ sede: 'LAVORO AGILE' })])
    expect(days[0].classification).toBe('agile')
  })

  test('sede LAVORO AGILE is case-insensitive and trimmed', () => {
    const days = classifyDays([row({ sede: '  lavoro agile  ' })])
    expect(days[0].classification).toBe('agile')
  })

  test('STANDARD tipologia with office sede → lavorativa', () => {
    const days = classifyDays([row({ sede: 'UFFICIO', tipologia: 'STANDARD' })])
    expect(days[0].classification).toBe('lavorativa')
  })

  test('TRASFERTA tipologia → lavorativa', () => {
    const days = classifyDays([row({ tipologia: 'TRASFERTA', sede: 'CLIENTE' })])
    expect(days[0].classification).toBe('lavorativa')
  })

  test('only PERMESSO rows → esclusa', () => {
    const days = classifyDays([row({ tipologia: 'PERMESSO' })])
    expect(days[0].classification).toBe('esclusa')
  })

  test('only MALATTIA rows → esclusa', () => {
    const days = classifyDays([row({ tipologia: 'MALATTIA' })])
    expect(days[0].classification).toBe('esclusa')
  })

  test('only FERIE rows → esclusa', () => {
    const days = classifyDays([row({ tipologia: 'FERIE' })])
    expect(days[0].classification).toBe('esclusa')
  })

  test('only STRAORDINARIO rows → esclusa', () => {
    const days = classifyDays([row({ tipologia: 'STRAORDINARIO', sede: 'UFFICIO' })])
    expect(days[0].classification).toBe('esclusa')
  })

  test('only INDENNITA TRASFERTA rows → esclusa', () => {
    const days = classifyDays([row({ tipologia: 'INDENNITA TRASFERTA', sede: '' })])
    expect(days[0].classification).toBe('esclusa')
  })

  test('PERMESSO + STANDARD on same day → lavorativa (PERMESSO excluded first)', () => {
    const days = classifyDays([
      row({ tipologia: 'PERMESSO', sede: 'UFFICIO' }),
      row({ tipologia: 'STANDARD', sede: 'UFFICIO' }),
    ])
    expect(days[0].classification).toBe('lavorativa')
  })

  test('MALATTIA + STANDARD on same day → lavorativa', () => {
    const days = classifyDays([
      row({ tipologia: 'MALATTIA', sede: '' }),
      row({ tipologia: 'STANDARD', sede: 'UFFICIO' }),
    ])
    expect(days[0].classification).toBe('lavorativa')
  })

  test('PERMESSO + LAVORO AGILE on same day → agile', () => {
    const days = classifyDays([
      row({ tipologia: 'PERMESSO' }),
      row({ sede: 'LAVORO AGILE', tipologia: 'STANDARD' }),
    ])
    expect(days[0].classification).toBe('agile')
  })

  test('rows on different dates produce separate WorkDays', () => {
    const days = classifyDays([
      row({ date: '2026-01-02', sede: 'UFFICIO' }),
      row({ date: '2026-01-05', sede: 'LAVORO AGILE' }),
    ])
    expect(days).toHaveLength(2)
    expect(days.find(d => d.date === '2026-01-02')?.classification).toBe('lavorativa')
    expect(days.find(d => d.date === '2026-01-05')?.classification).toBe('agile')
  })

  test('same date from multiple rows is deduplicated', () => {
    const days = classifyDays([row(), row(), row()])
    expect(days).toHaveLength(1)
  })

  test('unknown tipologia with override "agile" → agile', () => {
    const days = classifyDays(
      [row({ tipologia: 'SMART WORKING ESTERO', sede: '' })],
      new Map([['SMART WORKING ESTERO', 'agile']])
    )
    expect(days[0].classification).toBe('agile')
  })

  test('unknown tipologia with override "lavorativa" → lavorativa', () => {
    const days = classifyDays(
      [row({ tipologia: 'SMART WORKING ESTERO', sede: 'CLIENTE' })],
      new Map([['SMART WORKING ESTERO', 'lavorativa']])
    )
    expect(days[0].classification).toBe('lavorativa')
  })

  test('unknown tipologia with override "esclusa" → esclusa', () => {
    const days = classifyDays(
      [row({ tipologia: 'SMART WORKING ESTERO' })],
      new Map([['SMART WORKING ESTERO', 'esclusa']])
    )
    expect(days[0].classification).toBe('esclusa')
  })

  test('result is sorted by date ascending', () => {
    const days = classifyDays([
      row({ date: '2026-03-01' }),
      row({ date: '2026-01-01' }),
      row({ date: '2026-02-01' }),
    ])
    expect(days.map(d => d.date)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })
})
