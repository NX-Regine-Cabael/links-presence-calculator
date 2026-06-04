import { NextResponse } from 'next/server'
import { readPrefs, writePrefs } from '@/lib/storage'
import type { Prefs } from '@/types/domain'

export async function GET() {
  return NextResponse.json(readPrefs())
}

export async function POST(req: Request) {
  const body = (await req.json()) as Prefs
  if (
    typeof body.maxAgilePercent !== 'number' ||
    body.maxAgilePercent < 0 ||
    body.maxAgilePercent > 100
  ) {
    return NextResponse.json({ error: 'maxAgilePercent must be 0–100' }, { status: 400 })
  }
  writePrefs(body)
  return NextResponse.json(body)
}
