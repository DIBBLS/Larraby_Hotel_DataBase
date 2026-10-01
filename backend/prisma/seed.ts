// prisma/seed.ts
// Run: npx ts-node prisma/seed.ts
// Seeds the database with room types and sample rooms.
//
// Room names/prices match what's actually on the live site (index.html at
// the repo root) — Larabby's real marketed rooms, not placeholder data.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Larabby Hotel database...')

  // ── Room Types ──────────────────────────────────────────────
  // update: {} would silently no-op on an existing row, so a price/
  // description fix here would never reach an already-seeded database.
  // Every field that create sets is also set on update.
  const deluxe = await prisma.roomType.upsert({
    where: { name: 'Deluxe' },
    update: {
      description: "Larabby's most popular room — a comfortable bed, TV, and air conditioning.",
      pricePerNight: 25000,
      maxGuests: 2,
      amenities: ['TV', 'AC', 'Fan', 'Mirror'],
    },
    create: {
      name: 'Deluxe',
      description: "Larabby's most popular room — a comfortable bed, TV, and air conditioning.",
      pricePerNight: 25000,
      maxGuests: 2,
      amenities: ['TV', 'AC', 'Fan', 'Mirror'],
    },
  })

  const superDeluxe = await prisma.roomType.upsert({
    where: { name: 'Super Deluxe' },
    update: {
      description: 'A larger room with extra seating, for guests who want a bit more space.',
      pricePerNight: 30000,
      maxGuests: 3,
      amenities: ['TV', 'AC', 'Fan', 'Mirror'],
    },
    create: {
      name: 'Super Deluxe',
      description: 'A larger room with extra seating, for guests who want a bit more space.',
      pricePerNight: 30000,
      maxGuests: 3,
      amenities: ['TV', 'AC', 'Fan', 'Mirror'],
    },
  })

  const familySuite = await prisma.roomType.upsert({
    where: { name: 'Family Suite' },
    update: {
      description: 'Two beds and two bathrooms — built for families and small groups.',
      pricePerNight: 40000,
      maxGuests: 4,
      amenities: ['TV', 'AC'],
    },
    create: {
      name: 'Family Suite',
      description: 'Two beds and two bathrooms — built for families and small groups.',
      pricePerNight: 40000,
      maxGuests: 4,
      amenities: ['TV', 'AC'],
    },
  })

  // The old placeholder catalog (Standard, original "Family", Executive
  // Suite) doesn't reflect any real Larabby room — drop it now that every
  // room below has been reassigned off it. Safe: no Room can still
  // reference these by the time this runs (see room upserts below).
  await prisma.roomType.deleteMany({
    where: { name: { in: ['Standard', 'Family', 'Executive Suite'] } },
  })

  console.log('✓ Room types created (Deluxe, Super Deluxe, Family Suite)')

  // ── Rooms ────────────────────────────────────────────────────
  // 6 Deluxe / 2 Super Deluxe / 2 Family Suite — weighted toward Deluxe to
  // match the live site's room gallery (4 of its 6 photo cards are Deluxe).
  const roomsData = [
    // Floor 1
    { roomNumber: '101', floor: 1, roomTypeId: deluxe.id },
    { roomNumber: '102', floor: 1, roomTypeId: deluxe.id },
    { roomNumber: '103', floor: 1, roomTypeId: deluxe.id },
    { roomNumber: '104', floor: 1, roomTypeId: superDeluxe.id },
    // Floor 2
    { roomNumber: '201', floor: 2, roomTypeId: deluxe.id },
    { roomNumber: '202', floor: 2, roomTypeId: deluxe.id },
    { roomNumber: '203', floor: 2, roomTypeId: deluxe.id },
    { roomNumber: '204', floor: 2, roomTypeId: superDeluxe.id },
    // Floor 3 — suites
    { roomNumber: '301', floor: 3, roomTypeId: familySuite.id },
    { roomNumber: '302', floor: 3, roomTypeId: familySuite.id },
  ]

  for (const room of roomsData) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: { floor: room.floor, roomTypeId: room.roomTypeId },
      create: room,
    })
  }

  console.log('✓ Rooms created (101–104, 201–204, 301–302)')

  // ── Staff ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('larabby2024', 10)

  await prisma.staff.upsert({
    where: { email: 'admin@larabbyhotel.com' },
    update: {},
    create: {
      firstName: 'Hotel',
      lastName: 'Admin',
      email: 'admin@larabbyhotel.com',
      role: 'SUPER_ADMIN',
      passwordHash,
    },
  })

  await prisma.staff.upsert({
    where: { email: 'frontdesk@larabbyhotel.com' },
    update: {},
    create: {
      firstName: 'Front',
      lastName: 'Desk',
      email: 'frontdesk@larabbyhotel.com',
      role: 'FRONT_DESK',
      passwordHash,
    },
  })

  console.log('✓ Staff accounts created')
  console.log('\nDone! Default password: larabby2024 (change after first login)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
