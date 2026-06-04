import {
  BACKUP_VERSION,
  buildBackup,
  validateBackup,
  summarizeBackup,
} from '@/lib/backup'
import type { Records, Prefs } from '@/types/domain'

const records: Records = {
  employee: { userId: 'U1', name: 'Mario Rossi' },
  imports: [{ importedAt: '2026-01-10T08:00:00.000Z', filename: 'gen.xlsx', month: '2026-01' }],
  days: [
    { date: '2026-01-02', classification: 'agile' },
    { date: '2026-01-05', classification: 'lavorativa' },
  ],
}
const prefs: Prefs = { maxAgilePercent: 50, excludedDates: ['2026-08-10'] }

function validFile() {
  return buildBackup(records, prefs)
}

describe('buildBackup', () => {
  test('wraps records and prefs with the current version', () => {
    const b = buildBackup(records, prefs)
    expect(b).toEqual({ version: BACKUP_VERSION, records, prefs })
  })
})

describe('validateBackup', () => {
  test('accepts a well-formed full backup', () => {
    const r = validateBackup(validFile())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.backup.records?.employee.name).toBe('Mario Rossi')
      expect(r.backup.prefs.excludedDates).toEqual(['2026-08-10'])
    }
  })

  test('accepts a backup with null records (prefs-only)', () => {
    const r = validateBackup({ version: BACKUP_VERSION, records: null, prefs: { maxAgilePercent: 40 } })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.backup.records).toBeNull()
  })

  test('strips unknown extra fields, keeping only the schema shape', () => {
    const r = validateBackup({
      version: BACKUP_VERSION,
      records: { ...records, employee: { ...records.employee, secret: 'x' } },
      prefs,
      extraneous: 'ignored',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.backup.records?.employee).toEqual({ userId: 'U1', name: 'Mario Rossi' })
      expect(r.backup).not.toHaveProperty('extraneous')
    }
  })

  test('rejects a non-object', () => {
    expect(validateBackup('nope').ok).toBe(false)
    expect(validateBackup(null).ok).toBe(false)
    expect(validateBackup([1, 2]).ok).toBe(false)
  })

  test('rejects an unsupported version', () => {
    const r = validateBackup({ ...validFile(), version: 999 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/[Vv]ersione/)
  })

  test('rejects out-of-range maxAgilePercent', () => {
    expect(validateBackup({ version: BACKUP_VERSION, records: null, prefs: { maxAgilePercent: 150 } }).ok).toBe(false)
    expect(validateBackup({ version: BACKUP_VERSION, records: null, prefs: { maxAgilePercent: -1 } }).ok).toBe(false)
  })

  test('rejects an invalid day classification', () => {
    const bad = { ...records, days: [{ date: '2026-01-02', classification: 'vacanza' }] }
    expect(validateBackup({ version: BACKUP_VERSION, records: bad, prefs }).ok).toBe(false)
  })

  test('rejects an impossible day date', () => {
    const bad = { ...records, days: [{ date: '2026-02-31', classification: 'agile' }] }
    expect(validateBackup({ version: BACKUP_VERSION, records: bad, prefs }).ok).toBe(false)
  })

  test('rejects an impossible excluded date', () => {
    const r = validateBackup({ version: BACKUP_VERSION, records: null, prefs: { maxAgilePercent: 50, excludedDates: ['2026-13-01'] } })
    expect(r.ok).toBe(false)
  })

  test('accepts a comma-joined multi-month import label (real-world export)', () => {
    const multi = {
      ...records,
      imports: [{ importedAt: '2026-06-03T14:54:49.131Z', filename: 'f.xls', month: '2024-01, 2024-02, 2024-03' }],
    }
    expect(validateBackup({ version: BACKUP_VERSION, records: multi, prefs }).ok).toBe(true)
  })

  test('rejects a non-string import month', () => {
    const bad = { ...records, imports: [{ importedAt: 'x', filename: 'f', month: 12 }] }
    expect(validateBackup({ version: BACKUP_VERSION, records: bad, prefs }).ok).toBe(false)
  })

  test('rejects a missing prefs section', () => {
    expect(validateBackup({ version: BACKUP_VERSION, records: null }).ok).toBe(false)
  })
})

describe('summarizeBackup', () => {
  test('summarizes a full backup', () => {
    expect(summarizeBackup(validFile())).toEqual({
      employeeName: 'Mario Rossi',
      employeeId: 'U1',
      dayCount: 2,
      excludedCount: 1,
      maxAgilePercent: 50,
    })
  })

  test('handles a prefs-only backup', () => {
    const s = summarizeBackup(buildBackup(null, { maxAgilePercent: 30 }))
    expect(s).toEqual({
      employeeName: null,
      employeeId: null,
      dayCount: 0,
      excludedCount: 0,
      maxAgilePercent: 30,
    })
  })
})
