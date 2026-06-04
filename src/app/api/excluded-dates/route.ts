import { NextResponse } from 'next/server'
import { getExcludedDates, setExcludedDates } from '@/lib/storage'

export function GET() {
  return NextResponse.json(getExcludedDates())
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!Array.isArray(body) || body.some(d => typeof d !== 'string')) {
    return NextResponse.json({ error: 'Expected array of YYYY-MM-DD strings' }, { status: 400 })
  }
  setExcludedDates(body)
  return NextResponse.json({ ok: true })
}
