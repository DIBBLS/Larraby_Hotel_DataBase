// lib/booking-ref.ts
// Generates human-readable booking references, e.g. LBY-2026-0001

import { prisma } from './prisma'

export async function generateBookingRef(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `LBY-${year}-`

  const lastBooking = await prisma.booking.findFirst({
    where: { bookingRef: { startsWith: prefix } },
    orderBy: { bookingRef: 'desc' },
    select: { bookingRef: true },
  })

  let nextNumber = 1
  if (lastBooking) {
    const lastNumber = parseInt(lastBooking.bookingRef.slice(prefix.length), 10)
    if (!isNaN(lastNumber)) nextNumber = lastNumber + 1
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`
}
