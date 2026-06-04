import { NextResponse } from 'next/server'
import { getExcludedDates, setExcludedDates } from '@/lib/storage'

export function GET() {
  return NextResponse.json(getExcludedDates())
}

const MAX_EXCLUDED_DATES = 2000

// Accepts only syntactically AND semantically valid YYYY-MM-DD dates
// (e.g. rejects "2026-13-45" and "2026-02-31", which pass a plain regex).
function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!Array.isArray(body) || body.length > MAX_EXCLUDED_DATES || !body.every(isValidIsoDate)) {
    return NextResponse.json(
      { error: `Expected an array of at most ${MAX_EXCLUDED_DATES} valid YYYY-MM-DD strings` },
      { status: 400 },
    )
  }
  setExcludedDates(body)
  return NextResponse.json({ ok: true })
}
