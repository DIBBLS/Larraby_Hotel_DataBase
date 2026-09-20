// app/api/availability/route.ts
// GET /api/availability?checkIn=2024-09-12&checkOut=2024-09-14&guests=2&roomTypeId=xxx

import { NextRequest, NextResponse } from 'next/server'
import { getAvailableRooms } from '@/lib/availability'

export async function GET(req: NextRequest) {
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

    const rooms = await getAvailableRooms({
      checkInDate,
      checkOutDate,
      roomTypeId: roomTypeId ?? undefined,
      guestCount: guests ? parseInt(guests) : undefined,
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
