// lib/guests.ts
// Shared queries behind the guests pages.

import { prisma } from './prisma'

export async function listGuests({ search, returningOnly }: { search?: string; returningOnly?: boolean }) {
  const guests = await prisma.guest.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { bookings: true } },
      bookings: { orderBy: { checkInDate: 'desc' }, take: 1, select: { checkInDate: true } },
    },
  })

  let result = guests.map((g) => ({
    id: g.id,
    name: `${g.firstName} ${g.lastName}`,
    phone: g.phone,
    email: g.email,
    stays: g._count.bookings,
    lastStay: g.bookings[0]?.checkInDate.toISOString() ?? null,
  }))

  if (returningOnly) {
    result = result.filter((g) => g.stays >= 2)
  }

  result.sort((a, b) => {
    if (!a.lastStay) return 1
    if (!b.lastStay) return -1
    return new Date(b.lastStay).getTime() - new Date(a.lastStay).getTime()
  })

  return result
}

export async function getGuestDetail(id: string) {
  return prisma.guest.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { checkInDate: 'desc' },
        include: {
          room: { select: { roomNumber: true, roomType: { select: { name: true } } } },
        },
      },
    },
  })
}
