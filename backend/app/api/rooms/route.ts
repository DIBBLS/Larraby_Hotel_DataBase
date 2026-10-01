// app/api/rooms/route.ts
// GET /api/rooms — every room, for staff room management (not the public
// booking-search use case — that's GET /api/availability)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/require-staff'

export async function GET() {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const rooms = await prisma.room.findMany({
      include: {
        roomType: { select: { name: true } },
        maintenanceLogs: {
          where: { endDate: null },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    })

    return NextResponse.json({
      rooms: rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        type: r.roomType.name,
        status: r.status,
        notes: r.notes,
        openMaintenance: r.maintenanceLogs[0]
          ? { id: r.maintenanceLogs[0].id, reason: r.maintenanceLogs[0].reason, startDate: r.maintenanceLogs[0].startDate }
          : null,
      })),
    })
  } catch (error) {
    console.error('List rooms error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
