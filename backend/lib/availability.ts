// lib/availability.ts
// Core availability logic — used by both walk-in desk and online booking
// All booking creation MUST go through checkAvailability() first

import { prisma } from './prisma'
import { RoomStatus } from '@prisma/client'

interface AvailabilityQuery {
  checkInDate: Date
  checkOutDate: Date
  roomTypeId?: string      // Optional: filter by room type
  guestCount?: number      // Optional: filter by capacity
  excludeBookingId?: string // For amendments: ignore the current booking
}

// Returns available rooms for a date range
// This is the single source of truth for availability
export async function getAvailableRooms(query: AvailabilityQuery) {
  const { checkInDate, checkOutDate, roomTypeId, guestCount, excludeBookingId } = query

  if (checkOutDate <= checkInDate) {
    throw new Error('Check-out date must be after check-in date')
  }

  // Find rooms that have a conflicting booking in this date range
  // A conflict exists when:
  //   existing.checkIn < newCheckOut  AND  existing.checkOut > newCheckIn
  const conflictingRoomIds = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'RESERVED'] },
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
    },
    select: { roomId: true },
  })

  const blockedIds = conflictingRoomIds.map((b) => b.roomId)

  // Also block rooms currently under maintenance in the date range
  const maintenanceBlocked = await prisma.maintenanceLog.findMany({
    where: {
      startDate: { lt: checkOutDate },
      OR: [
        { endDate: null },           // ongoing maintenance
        { endDate: { gt: checkInDate } },
      ],
    },
    select: { roomId: true },
  })

  const maintenanceIds = maintenanceBlocked.map((m) => m.roomId)
  const allBlockedIds = [...new Set([...blockedIds, ...maintenanceIds])]

  // Query available rooms
  const availableRooms = await prisma.room.findMany({
    where: {
      id: { notIn: allBlockedIds },
      status: { not: RoomStatus.MAINTENANCE },
      ...(roomTypeId && { roomTypeId }),
      ...(guestCount && {
        roomType: { maxGuests: { gte: guestCount } },
      }),
    },
    include: {
      roomType: true,
    },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  })

  return availableRooms
}

// Check if a SPECIFIC room is available (used when assigning a room)
export async function isRoomAvailable(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const conflict = await prisma.booking.findFirst({
    where: {
      roomId,
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
      ...(excludeBookingId && { id: { not: excludeBookingId } }),
    },
  })

  const maintenance = await prisma.maintenanceLog.findFirst({
    where: {
      roomId,
      startDate: { lt: checkOutDate },
      OR: [{ endDate: null }, { endDate: { gt: checkInDate } }],
    },
  })

  return !conflict && !maintenance
}

// Calculate total cost for a booking
export function calculateBookingTotal(
  pricePerNight: number,
  checkInDate: Date,
  checkOutDate: Date,
  discountPercent = 0
): { nights: number; subtotal: number; discount: number; total: number } {
  const msPerDay = 1000 * 60 * 60 * 24
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay)
  const subtotal = pricePerNight * nights
  const discount = subtotal * (discountPercent / 100)
  const total = subtotal - discount

  return { nights, subtotal, discount, total }
}
