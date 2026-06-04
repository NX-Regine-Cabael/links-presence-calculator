import { NextResponse } from 'next/server'
import { getExcludedDates, setExcludedDates } from '@/lib/storage'

export function GET() {
  return NextResponse.json(getExcludedDates())
}

export async function POST(req: Request) {
  const body = await req.json()
  const isoDate = /^\d{4}-\d{2}-\d{2}$/
  if (!Array.isArray(body) || body.some(d => typeof d !== 'string' || !isoDate.test(d))) {
    return NextResponse.json({ error: 'Expected array of YYYY-MM-DD strings' }, { status: 400 })
  }
  setExcludedDates(body)
  return NextResponse.json({ ok: true })
}
