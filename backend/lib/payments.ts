// lib/payments.ts
// Shared query behind the cross-booking payments ledger page.

import { prisma } from './prisma'

export async function listPayments({ search, date }: { search?: string; date?: string }) {
  const payments = await prisma.payment.findMany({
    where: {
      ...(date && {
        paidAt: {
          gte: new Date(date),
          lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
        },
      }),
      ...(search && {
        booking: {
          OR: [
            { bookingRef: { contains: search, mode: 'insensitive' } },
            { guest: { firstName: { contains: search, mode: 'insensitive' } } },
            { guest: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        },
      }),
    },
    include: {
      booking: {
        select: {
          bookingRef: true,
          guest: { select: { firstName: true, lastName: true } },
          room: { select: { roomNumber: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const staffIds = [...new Set(payments.map((p) => p.recordedBy).filter((id): id is string => !!id))]
  const staff = staffIds.length
    ? await prisma.staff.findMany({ where: { id: { in: staffIds } }, select: { id: true, firstName: true, lastName: true } })
    : []
  const staffNameById = new Map(staff.map((s) => [s.id, `${s.firstName} ${s.lastName}`]))

  return payments.map((p) => ({
    id: p.id,
    amount: p.amount.toString(),
    method: p.method,
    status: p.status,
    paidAt: p.paidAt?.toISOString() ?? null,
    reference: p.reference,
    bookingRef: p.booking.bookingRef,
    guestName: `${p.booking.guest.firstName} ${p.booking.guest.lastName}`,
    roomNumber: p.booking.room.roomNumber,
    recordedByName: p.recordedBy ? staffNameById.get(p.recordedBy) ?? null : null,
  }))
}
