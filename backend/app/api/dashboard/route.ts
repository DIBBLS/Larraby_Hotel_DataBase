// app/api/dashboard/route.ts
// GET /api/dashboard — today's summary for the front desk

import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'
import { getTodayStats } from '@/lib/dashboard'

export async function GET() {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const stats = await getTodayStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
