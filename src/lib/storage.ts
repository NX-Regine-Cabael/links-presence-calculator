import fs from 'fs'
import path from 'path'
import type { Records, Prefs } from '@/types/domain'

const DATA_DIR = path.join(process.cwd(), 'data')
const RECORDS_PATH = path.join(DATA_DIR, 'records.json')
const PREFS_PATH = path.join(DATA_DIR, 'prefs.json')

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

export function readRecords(): Records | null {
  try {
    return JSON.parse(fs.readFileSync(RECORDS_PATH, 'utf-8')) as Records
  } catch {
    return null
  }
}

export function writeRecords(records: Records): void {
  ensureDataDir()
  fs.writeFileSync(RECORDS_PATH, JSON.stringify(records, null, 2), 'utf-8')
}

export function readPrefs(): Prefs {
  try {
    return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf-8')) as Prefs
  } catch {
    return { maxAgilePercent: 50 }
  }
}

export function writePrefs(prefs: Prefs): void {
  ensureDataDir()
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), 'utf-8')
}

export function getExcludedDates(): string[] {
  return readPrefs().excludedDates ?? []
}

export function setExcludedDates(dates: string[]): void {
  writePrefs({ ...readPrefs(), excludedDates: dates })
}

export function deleteRecords(): void {
  try {
    fs.unlinkSync(RECORDS_PATH)
  } catch {
    // file already absent — no-op
  }
}
