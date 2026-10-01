// app/api/payments/route.ts
// GET /api/payments — cross-booking payments ledger

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'
import { listPayments } from '@/lib/payments'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? undefined
    const date = searchParams.get('date') ?? undefined

    const payments = await listPayments({ search, date })
    return NextResponse.json({ payments })
  } catch (error) {
    console.error('List payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
