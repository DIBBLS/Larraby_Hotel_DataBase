// app/api/guests/route.ts
// GET /api/guests — every guest, with stay count and last stay date

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'
import { listGuests } from '@/lib/guests'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? undefined
    const returningOnly = searchParams.get('returningOnly') === 'true'

    const guests = await listGuests({ search, returningOnly })
    return NextResponse.json({ guests })
  } catch (error) {
    console.error('List guests error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
