// app/api/availability/route.ts
// GET /api/availability?checkIn=2024-09-12&checkOut=2024-09-14&guests=2&roomTypeId=xxx
// Public — called from staff dashboard pages (same-origin) and the hotel
// website's booking widget (cross-origin, see lib/cors.ts).

import { NextRequest, NextResponse } from 'next/server'
import { getAvailableRooms } from '@/lib/availability'
import { resolveAllowedOrigin, corsHeaders } from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  const origin = resolveAllowedOrigin(req.headers.get('origin'))
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function GET(req: NextRequest) {
  const origin = resolveAllowedOrigin(req.headers.get('origin'))
  const res = await handleGET(req)
  for (const [key, value] of Object.entries(corsHeaders(origin))) res.headers.set(key, value)
  return res
}

async function handleGET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const guests = searchParams.get('guests')
    const roomTypeId = searchParams.get('roomTypeId')

    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'checkIn and checkOut are required' },
        { status: 400 }
      )
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'Check-out must be after check-in' },
        { status: 400 }
      )
    }

    let guestCount: number | undefined
    if (guests) {
      guestCount = parseInt(guests)
      if (!Number.isInteger(guestCount) || guestCount < 1) {
        return NextResponse.json({ error: 'guests must be a positive whole number' }, { status: 400 })
      }
    }

    const rooms = await getAvailableRooms({
      checkInDate,
      checkOutDate,
      roomTypeId: roomTypeId ?? undefined,
      guestCount,
    })

    return NextResponse.json({
      available: rooms.length > 0,
      count: rooms.length,
      rooms: rooms.map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        floor: r.floor,
        type: r.roomType.name,
        pricePerNight: r.roomType.pricePerNight,
        maxGuests: r.roomType.maxGuests,
        amenities: r.roomType.amenities,
      })),
    })
  } catch (error) {
    console.error('Availability error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
