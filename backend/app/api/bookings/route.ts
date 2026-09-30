// app/api/bookings/route.ts
// POST /api/bookings — creates a new booking
// Used by: front desk dashboard (walk-in) and website booking form (online)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isRoomAvailable, calculateBookingTotal } from '@/lib/availability'
import { generateBookingRef } from '@/lib/booking-ref'
import { requireStaff } from '@/lib/require-staff'
import { BookingSource } from '@prisma/client'

// Guests booking themselves through the website hit this with no session.
// Every other source (walk-in, a call taken at the desk, an agent booking,
// a WhatsApp chat staff key in) is staff entering a booking on someone's
// behalf, so it requires a signed-in session — and handledById always
// comes from that session, never from the request body.
const SELF_SERVE_SOURCES: BookingSource[] = ['WEBSITE']

const PHONE_RE = /^\+?\d{7,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      // Guest info
      firstName,
      lastName,
      phone,
      email,
      idType,
      idNumber,

      // Booking info
      roomId,
      checkInDate: checkInStr,
      checkOutDate: checkOutStr,
      guestCount,
      source,         // WALK_IN | WEBSITE | WHATSAPP | PHONE | AGENT
      notes,
      discountPercent,
    }: {
      firstName: string
      lastName: string
      phone: string
      email?: string
      idType?: string
      idNumber?: string
      roomId: string
      checkInDate: string
      checkOutDate: string
      guestCount: number
      source: BookingSource
      notes?: string
      discountPercent?: number
    } = body

    // ── Validate required fields ──────────────────────────────
    if (!firstName || !lastName || !phone || !roomId || !checkInStr || !checkOutStr || !guestCount || !source) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Validate field formats ─────────────────────────────────
    const cleanedPhone = phone.replace(/[\s-]/g, '')
    if (!PHONE_RE.test(cleanedPhone)) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 })
    }
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return NextResponse.json({ error: 'guestCount must be a positive whole number' }, { status: 400 })
    }

    const checkInDate = new Date(checkInStr)
    const checkOutDate = new Date(checkOutStr)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ error: 'Check-out must be after check-in' }, { status: 400 })
    }

    // ── Staff-entered sources require a signed-in staff session ─
    // Self-serve guests can never set their own discount — only staff can.
    let handledById: string | undefined
    let safeDiscountPercent = 0
    if (SELF_SERVE_SOURCES.includes(source)) {
      safeDiscountPercent = 0
    } else {
      const auth = await requireStaff()
      if ('error' in auth) return auth.error
      handledById = auth.staffId

      safeDiscountPercent = discountPercent ?? 0
      if (safeDiscountPercent < 0 || safeDiscountPercent > 100) {
        return NextResponse.json({ error: 'discountPercent must be between 0 and 100' }, { status: 400 })
      }
    }

    // ── Double-booking check ───────────────────────────────────
    // Wrapped in a transaction so two simultaneous requests can't both pass
    const booking = await prisma.$transaction(async (tx) => {

      // Re-check availability inside the transaction
      const available = await isRoomAvailable(roomId, checkInDate, checkOutDate)
      if (!available) {
        throw new Error('ROOM_NOT_AVAILABLE')
      }

      // ── Get or create guest ──────────────────────────────────
      let guest = await tx.guest.findUnique({ where: { phone } })

      if (!guest) {
        guest = await tx.guest.create({
          data: {
            firstName,
            lastName,
            phone,
            email,
            idType: idType as any,
            idNumber,
          },
        })
      } else {
        // Update guest details if they've changed
        guest = await tx.guest.update({
          where: { id: guest.id },
          data: {
            firstName,
            lastName,
            ...(email && { email }),
            ...(idType && { idType: idType as any }),
            ...(idNumber && { idNumber }),
          },
        })
      }

      // ── Calculate total ──────────────────────────────────────
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { roomType: true },
      })

      if (!room) throw new Error('ROOM_NOT_FOUND')

      const { total, discount } = calculateBookingTotal(
        Number(room.roomType.pricePerNight),
        checkInDate,
        checkOutDate,
        safeDiscountPercent
      )

      // ── Create booking ───────────────────────────────────────
      const bookingRef = await generateBookingRef()

      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          guestId: guest.id,
          roomId,
          guestCount,
          checkInDate,
          checkOutDate,
          totalAmount: total,
          amountPaid: 0,
          discountAmount: discount,
          status: source === 'WALK_IN' ? 'CONFIRMED' : 'PENDING',
          source,
          notes,
          handledById,
        },
        include: {
          guest: true,
          room: { include: { roomType: true } },
        },
      })

      // ── Mark room as RESERVED ────────────────────────────────
      await tx.room.update({
        where: { id: roomId },
        data: { status: 'RESERVED' },
      })

      return newBooking
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingRef: booking.bookingRef,
        guest: `${booking.guest.firstName} ${booking.guest.lastName}`,
        room: `${booking.room.roomNumber} — ${booking.room.roomType.name}`,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        total: booking.totalAmount,
        status: booking.status,
        source: booking.source,
      },
    }, { status: 201 })

  } catch (error: any) {
    if (error.message === 'ROOM_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'This room is no longer available for the selected dates' }, { status: 409 })
    }
    if (error.message === 'ROOM_NOT_FOUND') {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    console.error('Booking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/bookings — list bookings (for dashboard)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireStaff()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status')
    const date = searchParams.get('date')       // filter by check-in date
    const search = searchParams.get('search')   // guest name or booking ref
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')

    const bookings = await prisma.booking.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(date && {
          checkInDate: {
            gte: new Date(date),
            lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
          },
        }),
        ...(search && {
          OR: [
            { bookingRef: { contains: search, mode: 'insensitive' } },
            { guest: { firstName: { contains: search, mode: 'insensitive' } } },
            { guest: { lastName: { contains: search, mode: 'insensitive' } } },
            { guest: { phone: { contains: search } } },
          ],
        }),
      },
      include: {
        guest: { select: { firstName: true, lastName: true, phone: true } },
        room: { include: { roomType: { select: { name: true } } } },
        payments: { select: { amount: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.booking.count()

    return NextResponse.json({ bookings, total, page, limit })
  } catch (error) {
    console.error('List bookings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
