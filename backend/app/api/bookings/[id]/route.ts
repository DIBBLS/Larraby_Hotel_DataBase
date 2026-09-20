// app/api/bookings/[id]/route.ts
// GET    /api/bookings/:id         — get booking detail
// PATCH  /api/bookings/:id         — check-in, check-out, cancel, update

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

// ── GET — single booking detail ──────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        guest: true,
        room: { include: { roomType: true } },
        payments: true,
        handledBy: { select: { firstName: true, lastName: true, role: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({ booking })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH — update booking status ────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { action, handledById, notes } = body

    // action: CHECK_IN | CHECK_OUT | CANCEL | NO_SHOW

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { room: true },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    let updatedBooking

    switch (action) {

      case 'CHECK_IN': {
        if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
          return NextResponse.json({ error: `Cannot check in a booking with status: ${booking.status}` }, { status: 400 })
        }

        updatedBooking = await prisma.$transaction(async (tx) => {
          const b = await tx.booking.update({
            where: { id: params.id },
            data: {
              status: 'CHECKED_IN',
              actualCheckIn: new Date(),
              handledById,
            },
          })

          // Mark room as OCCUPIED
          await tx.room.update({
            where: { id: booking.roomId },
            data: { status: 'OCCUPIED' },
          })

          return b
        })
        break
      }

      case 'CHECK_OUT': {
        if (booking.status !== 'CHECKED_IN') {
          return NextResponse.json({ error: 'Guest is not currently checked in' }, { status: 400 })
        }

        updatedBooking = await prisma.$transaction(async (tx) => {
          const b = await tx.booking.update({
            where: { id: params.id },
            data: {
              status: 'CHECKED_OUT',
              actualCheckOut: new Date(),
              handledById,
              notes: notes ?? booking.notes,
            },
          })

          // Mark room as AVAILABLE again
          await tx.room.update({
            where: { id: booking.roomId },
            data: { status: 'AVAILABLE' },
          })

          return b
        })
        break
      }

      case 'CANCEL': {
        if (['CHECKED_IN', 'CHECKED_OUT'].includes(booking.status)) {
          return NextResponse.json({ error: 'Cannot cancel a booking that is checked in or complete' }, { status: 400 })
        }

        updatedBooking = await prisma.$transaction(async (tx) => {
          const b = await tx.booking.update({
            where: { id: params.id },
            data: { status: 'CANCELLED', notes },
          })

          // Free the room if it was reserved
          if (booking.room.status === 'RESERVED') {
            await tx.room.update({
              where: { id: booking.roomId },
              data: { status: 'AVAILABLE' },
            })
          }

          return b
        })
        break
      }

      case 'NO_SHOW': {
        if (booking.status !== 'CONFIRMED') {
          return NextResponse.json({ error: 'Only confirmed bookings can be marked as no-show' }, { status: 400 })
        }

        updatedBooking = await prisma.$transaction(async (tx) => {
          const b = await tx.booking.update({
            where: { id: params.id },
            data: { status: 'NO_SHOW' },
          })

          await tx.room.update({
            where: { id: booking.roomId },
            data: { status: 'AVAILABLE' },
          })

          return b
        })
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, booking: updatedBooking })
  } catch (error) {
    console.error('Booking update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
