// lib/reports.ts
// Shared queries behind the Reports page — monthly trends computed in JS
// over plain Prisma reads, which is plenty at this hotel's scale (no
// need for raw SQL date_trunc aggregation for a 10-room property).

import { prisma } from './prisma'

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}
function lastNMonthKeys(n: number) {
  const keys: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
  }
  return keys
}
function startOfRange(months: number) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
}

export async function getRevenueByMonth(months: number) {
  const keys = lastNMonthKeys(months)
  const start = startOfRange(months)

  const payments = await prisma.payment.findMany({
    where: { status: 'CONFIRMED', paidAt: { gte: start } },
    select: { amount: true, paidAt: true },
  })

  const totals = new Map(keys.map((k) => [k, 0]))
  for (const p of payments) {
    if (!p.paidAt) continue
    const k = monthKey(p.paidAt)
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + Number(p.amount))
  }

  return keys.map((k) => ({ month: monthLabel(k), total: totals.get(k) ?? 0 }))
}

export async function getOccupancyByMonth(months: number) {
  const keys = lastNMonthKeys(months)
  const start = startOfRange(months)
  const totalRooms = await prisma.room.count()

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
      checkOutDate: { gt: start },
    },
    select: { checkInDate: true, checkOutDate: true },
  })

  return keys.map((k) => {
    const [y, m] = k.split('-').map(Number)
    const monthStart = new Date(y, m - 1, 1)
    const monthEnd = new Date(y, m, 1)
    const daysInMonth = (monthEnd.getTime() - monthStart.getTime()) / 86400000

    let nightsSold = 0
    for (const b of bookings) {
      const overlapStart = b.checkInDate > monthStart ? b.checkInDate : monthStart
      const overlapEnd = b.checkOutDate < monthEnd ? b.checkOutDate : monthEnd
      nightsSold += Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / 86400000)
    }

    const nightsAvailable = totalRooms * daysInMonth
    const rate = nightsAvailable > 0 ? Math.round((nightsSold / nightsAvailable) * 100) : 0
    return { month: monthLabel(k), rate }
  })
}

export async function getRevenueByRoomType(months: number) {
  const start = startOfRange(months)

  const payments = await prisma.payment.findMany({
    where: { status: 'CONFIRMED', paidAt: { gte: start } },
    select: {
      amount: true,
      booking: { select: { room: { select: { roomType: { select: { name: true } } } } } },
    },
  })

  const totals = new Map<string, number>()
  for (const p of payments) {
    const type = p.booking.room.roomType.name
    totals.set(type, (totals.get(type) ?? 0) + Number(p.amount))
  }

  const grandTotal = [...totals.values()].reduce((a, b) => a + b, 0)

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, amount]) => ({
      type,
      amount,
      pct: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    }))
}
