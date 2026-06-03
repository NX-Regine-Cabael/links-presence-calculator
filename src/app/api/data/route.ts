import { NextResponse } from 'next/server'
import { readRecords, deleteRecords } from '@/lib/storage'

export async function GET() {
  return NextResponse.json(readRecords())
}

export async function DELETE() {
  deleteRecords()
  return NextResponse.json({ ok: true })
}
