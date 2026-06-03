import * as XLSX from 'xlsx'
import { parseExcelBuffers } from '@/lib/excel-parser'

function makeBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return buf as ArrayBuffer
}

const baseRow = {
  'ID Utente': 'U001',
  'Nominativo': 'Mario Rossi',
  'Data': '02/01/2026',
  'Inizio': '09:00',
  'Fine': '18:00',
  'Sede': 'UFFICIO',
  'Tipologia': 'STANDARD',
  'Durata': '8',
  'Progetto': 'PROJ-1',        // should be ignored
  'Issue Jira': 'JIRA-123',    // should be ignored
}

describe('parseExcelBuffers', () => {
  test('extracts only the 8 required columns', () => {
    const buf = makeBuffer([baseRow])
    const { rows } = parseExcelBuffers([buf])
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.userId).toBe('U001')
    expect(row.name).toBe('Mario Rossi')
    expect(row.date).toBe('2026-01-02')
    expect(row.sede).toBe('UFFICIO')
    expect(row.tipologia).toBe('STANDARD')
    expect((row as Record<string, unknown>)['Progetto']).toBeUndefined()
    expect((row as Record<string, unknown>)['Issue Jira']).toBeUndefined()
  })

  test('parses DD/MM/YYYY date format to YYYY-MM-DD', () => {
    const buf = makeBuffer([{ ...baseRow, 'Data': '15/03/2026' }])
    const { rows } = parseExcelBuffers([buf])
    expect(rows[0].date).toBe('2026-03-15')
  })

  test('detects unknown tipologia with occurrences and dates', () => {
    const buf = makeBuffer([
      { ...baseRow, 'Tipologia': 'SMART WORKING ESTERO', 'Data': '05/01/2026' },
      { ...baseRow, 'Tipologia': 'SMART WORKING ESTERO', 'Data': '06/01/2026' },
    ])
    const { unknownTipologie } = parseExcelBuffers([buf])
    expect(unknownTipologie).toHaveLength(1)
    expect(unknownTipologie[0].value).toBe('SMART WORKING ESTERO')
    expect(unknownTipologie[0].occurrences).toBe(2)
    expect(unknownTipologie[0].dates).toEqual(['2026-01-05', '2026-01-06'])
  })

  test('known tipologie produce no unknowns', () => {
    const rows = ['PERMESSO', 'STANDARD', 'TRASFERTA'].map(t => ({ ...baseRow, 'Tipologia': t }))
    const { unknownTipologie } = parseExcelBuffers([makeBuffer(rows)])
    expect(unknownTipologie).toHaveLength(0)
  })

  test('merges rows from multiple buffers', () => {
    const buf1 = makeBuffer([{ ...baseRow, 'Data': '02/01/2026' }])
    const buf2 = makeBuffer([{ ...baseRow, 'Data': '05/01/2026' }])
    const { rows } = parseExcelBuffers([buf1, buf2])
    expect(rows).toHaveLength(2)
  })

  test('trims and normalises tipologia for unknown detection', () => {
    const buf = makeBuffer([{ ...baseRow, 'Tipologia': '  standard  ' }])
    const { unknownTipologie } = parseExcelBuffers([buf])
    expect(unknownTipologie).toHaveLength(0)
  })
})
