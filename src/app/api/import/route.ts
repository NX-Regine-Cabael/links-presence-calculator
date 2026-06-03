import { NextResponse } from 'next/server'
import { classifyDays } from '@/lib/classifier'
import { readRecords, writeRecords } from '@/lib/storage'
import type { ExcelRow, Records, WorkDay, DayClassification } from '@/types/domain'

interface ImportBody {
  rows: ExcelRow[]
  overrides: Record<string, DayClassification>
  filenames: string[]
}

export async function POST(req: Request) {
  const { rows, overrides, filenames } = (await req.json()) as ImportBody

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nessuna riga trovata nei file.' }, { status: 422 })
  }

  const userIds = new Set(rows.map(r => r.userId))
  const names = new Set(rows.map(r => r.name))
  if (userIds.size > 1 || names.size > 1) {
    return NextResponse.json(
      {
        error:
          'Impossibile elaborare i file selezionati. Sono presenti dati appartenenti a utenti differenti.',
      },
      { status: 422 }
    )
  }

  const existing = readRecords()
  const incomingUserId = Array.from(userIds)[0]
  if (existing && existing.employee.userId !== incomingUserId) {
    return NextResponse.json(
      {
        error:
          'Impossibile elaborare i file selezionati. Sono presenti dati appartenenti a utenti differenti.',
      },
      { status: 422 }
    )
  }

  const overrideMap = new Map(
    Object.entries(overrides).map(([k, v]) => [k, v as DayClassification])
  )
  const newDays = classifyDays(rows, overrideMap)
  const monthsInImport = new Set(newDays.map(d => d.date.slice(0, 7)))

  const prevDays: WorkDay[] = existing?.days ?? []
  const mergedDays = [
    ...prevDays.filter(d => !monthsInImport.has(d.date.slice(0, 7))),
    ...newDays,
  ].sort((a, b) => a.date.localeCompare(b.date))

  const now = new Date().toISOString()
  const newImports = filenames.map(filename => ({
    importedAt: now,
    filename,
    month: Array.from(monthsInImport).sort().join(', '),
  }))

  const records: Records = {
    employee: { userId: incomingUserId, name: Array.from(names)[0] },
    imports: [...(existing?.imports ?? []), ...newImports],
    days: mergedDays,
  }

  writeRecords(records)
  return NextResponse.json({ ok: true, imported: newDays.length })
}
