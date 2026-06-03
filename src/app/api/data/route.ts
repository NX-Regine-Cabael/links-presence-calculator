import { NextResponse } from 'next/server'
import { readRecords } from '@/lib/storage'

export async function GET() {
  return NextResponse.json(readRecords())
}
