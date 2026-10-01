// app/api/rooms/[id]/route.ts
// PATCH /api/rooms/:id — put a room into maintenance, or clear it

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireStaff } from '@/lib/require-staff'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const body = await req.json()
    const { action, reason } = body
    // action: SET_MAINTENANCE | CLEAR_MAINTENANCE

    const room = await prisma.room.findUnique({ where: { id: params.id } })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (action === 'SET_MAINTENANCE') {
      if (room.status === 'OCCUPIED' || room.status === 'RESERVED') {
        return NextResponse.json(
          { error: `Cannot set a ${room.status.toLowerCase()} room to maintenance — resolve its booking first` },
          { status: 400 }
        )
      }
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return NextResponse.json({ error: 'A reason is required' }, { status: 400 })
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.maintenanceLog.create({
          data: { roomId: room.id, reason: reason.trim(), startDate: new Date() },
        })
        return tx.room.update({ where: { id: room.id }, data: { status: 'MAINTENANCE' } })
      })

      return NextResponse.json({ success: true, room: updated })
    }

    if (action === 'CLEAR_MAINTENANCE') {
      if (room.status !== 'MAINTENANCE') {
        return NextResponse.json({ error: 'Room is not under maintenance' }, { status: 400 })
      }

      const updated = await prisma.$transaction(async (tx) => {
        const openLog = await tx.maintenanceLog.findFirst({
          where: { roomId: room.id, endDate: null },
          orderBy: { startDate: 'desc' },
        })
        if (openLog) {
          const now = new Date()
          await tx.maintenanceLog.update({
            where: { id: openLog.id },
            data: { endDate: now, resolvedAt: now },
          })
        }
        return tx.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } })
      })

      return NextResponse.json({ success: true, room: updated })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('Room update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
