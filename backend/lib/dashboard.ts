// lib/dashboard.ts
// Shared queries behind the front desk dashboard — used by both the
// /api/dashboard route and the dashboard page itself (the page calls
// these directly via Prisma instead of fetching its own API).

import { prisma } from './prisma'
import { BookingSource } from '@prisma/client'

function todayRange() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  return { today, tomorrow }
}

export async function getTodayStats() {
  const { today, tomorrow } = todayRange()

  const [
    totalRooms,
    occupiedRooms,
    reservedRooms,
    maintenanceRooms,
    checkInsToday,
    checkOutsToday,
    pendingOnline,
    revenueToday,
  ] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { status: 'OCCUPIED' } }),
    prisma.room.count({ where: { status: 'RESERVED' } }),
    prisma.room.count({ where: { status: 'MAINTENANCE' } }),
    prisma.booking.count({
      where: {
        checkInDate: { gte: today, lt: tomorrow },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    }),
    prisma.booking.count({
      where: {
        checkOutDate: { gte: today, lt: tomorrow },
        status: 'CHECKED_IN',
      },
    }),
    prisma.booking.count({
      where: {
        status: 'PENDING',
        source: { in: ['WEBSITE', 'WHATSAPP', 'PHONE'] },
      },
    }),
    prisma.payment.aggregate({
      where: {
        status: 'CONFIRMED',
        paidAt: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
    }),
  ])

  const availableRooms = totalRooms - occupiedRooms - reservedRooms - maintenanceRooms

  return {
    rooms: {
      total: totalRooms,
      available: availableRooms,
      occupied: occupiedRooms,
      reserved: reservedRooms,
      maintenance: maintenanceRooms,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    },
    today: {
      checkIns: checkInsToday,
      checkOuts: checkOutsToday,
      pendingOnlineBookings: pendingOnline,
      revenue: Number(revenueToday._sum.amount ?? 0),
    },
  }
}

export async function getTodaysBookings(limit = 6) {
  const { today, tomorrow } = todayRange()

  const bookings = await prisma.booking.findMany({
    where: {
      status: { not: 'CANCELLED' },
      OR: [
        { checkInDate: { gte: today, lt: tomorrow } },
        { checkOutDate: { gte: today, lt: tomorrow } },
      ],
    },
    include: {
      guest: { select: { firstName: true, lastName: true } },
      room: { select: { roomNumber: true } },
    },
    orderBy: { checkInDate: 'asc' },
    take: limit,
  })

  return bookings.map((b) => ({
    id: b.id,
    guestName: `${b.guest.firstName} ${b.guest.lastName}`,
    roomNumber: b.room.roomNumber,
    isCheckInToday: b.checkInDate >= today && b.checkInDate < tomorrow,
    isCheckOutToday: b.checkOutDate >= today && b.checkOutDate < tomorrow,
    status: b.status,
    source: b.source,
  }))
}

export async function getRoomGrid() {
  const rooms = await prisma.room.findMany({
    include: { roomType: { select: { name: true } } },
    orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
  })

  return rooms.map((r) => ({
    id: r.id,
    roomNumber: r.roomNumber,
    type: r.roomType.name,
    status: r.status,
  }))
}

export async function getSourceBreakdown(since?: Date) {
  const start = since ?? (() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })()

  const grouped = await prisma.booking.groupBy({
    by: ['source'],
    where: { createdAt: { gte: start }, status: { not: 'CANCELLED' } },
    _count: { source: true },
  })

  const total = grouped.reduce((sum, g) => sum + g._count.source, 0)

  const bySource = new Map(grouped.map((g) => [g.source, g._count.source]))
  const order: BookingSource[] = ['WALK_IN', 'WEBSITE', 'WHATSAPP', 'PHONE', 'AGENT']

  return order
    .map((source) => ({
      source,
      count: bySource.get(source) ?? 0,
      pct: total > 0 ? Math.round(((bySource.get(source) ?? 0) / total) * 100) : 0,
    }))
    .filter((s) => s.count > 0)
}

export async function getReturningGuests(limit = 3) {
  const guests = await prisma.guest.findMany({
    include: {
      _count: { select: { bookings: true } },
      bookings: { orderBy: { checkInDate: 'desc' }, take: 1, select: { checkInDate: true } },
    },
  })

  return guests
    .filter((g) => g._count.bookings >= 2 && g.bookings[0])
    .sort((a, b) => b.bookings[0].checkInDate.getTime() - a.bookings[0].checkInDate.getTime())
    .slice(0, limit)
    .map((g) => ({
      id: g.id,
      name: `${g.firstName} ${g.lastName}`,
      stays: g._count.bookings,
      lastStay: g.bookings[0].checkInDate,
    }))
}
