// app/api/reports/route.ts
// GET /api/reports?months=6 — revenue, occupancy, and source trends

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff } from '@/lib/require-staff'
import { getRevenueByMonth, getOccupancyByMonth, getRevenueByRoomType } from '@/lib/reports'
import { getSourceBreakdown } from '@/lib/dashboard'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const monthsParam = parseInt(searchParams.get('months') ?? '6')
    const months = Number.isInteger(monthsParam) ? Math.min(24, Math.max(1, monthsParam)) : 6

    const since = new Date()
    since.setMonth(since.getMonth() - (months - 1))
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const [revenueByMonth, occupancyByMonth, revenueByRoomType, sourceBreakdown] = await Promise.all([
      getRevenueByMonth(months),
      getOccupancyByMonth(months),
      getRevenueByRoomType(months),
      getSourceBreakdown(since),
    ])

    return NextResponse.json({ revenueByMonth, occupancyByMonth, revenueByRoomType, sourceBreakdown })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
