import { NextResponse } from 'next/server'
import { readRecords, readPrefs, restoreBackup } from '@/lib/storage'
import { buildBackup, validateBackup } from '@/lib/backup'

// GET → full backup of the current persisted state (records + prefs).
export function GET() {
  return NextResponse.json(buildBackup(readRecords(), readPrefs()))
}

// POST → restore: validate the uploaded backup and replace the persisted state.
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON non valido.' }, { status: 400 })
  }

  const result = validateBackup(body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  restoreBackup(result.backup.records, result.backup.prefs)
  return NextResponse.json({ ok: true })
}
