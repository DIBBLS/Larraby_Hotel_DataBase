// app/api/dashboard/route.ts
// GET /api/dashboard — today's summary for the front desk

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/require-staff'

export async function GET() {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const [
      totalRooms,
      occupiedRooms,
      reservedRooms,
      maintenanceRooms,
      checkInsToday,
      checkOutsToday,
      pendingOnline,
      revenueToday,
    ] = await Promise.all([
      // Total rooms
      prisma.room.count(),

      // Currently occupied
      prisma.room.count({ where: { status: 'OCCUPIED' } }),

      // Reserved (confirmed, arriving soon)
      prisma.room.count({ where: { status: 'RESERVED' } }),

      // Under maintenance
      prisma.room.count({ where: { status: 'MAINTENANCE' } }),

      // Check-ins due today
      prisma.booking.count({
        where: {
          checkInDate: { gte: today, lt: tomorrow },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),

      // Check-outs due today
      prisma.booking.count({
        where: {
          checkOutDate: { gte: today, lt: tomorrow },
          status: 'CHECKED_IN',
        },
      }),

      // Online bookings awaiting confirmation
      prisma.booking.count({
        where: {
          status: 'PENDING',
          source: { in: ['WEBSITE', 'WHATSAPP', 'PHONE'] },
        },
      }),

      // Revenue collected today
      prisma.payment.aggregate({
        where: {
          status: 'CONFIRMED',
          paidAt: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
    ])

    const availableRooms = totalRooms - occupiedRooms - reservedRooms - maintenanceRooms

    return NextResponse.json({
      rooms: {
        total: totalRooms,
        available: availableRooms,
        occupied: occupiedRooms,
        reserved: reservedRooms,
        maintenance: maintenanceRooms,
        occupancyRate: Math.round((occupiedRooms / totalRooms) * 100),
      },
      today: {
        checkIns: checkInsToday,
        checkOuts: checkOutsToday,
        pendingOnlineBookings: pendingOnline,
        revenue: Number(revenueToday._sum.amount ?? 0),
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
