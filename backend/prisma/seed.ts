// prisma/seed.ts
// Run: npx ts-node prisma/seed.ts
// Seeds the database with room types and sample rooms

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Larabby Hotel database...')

  // ── Room Types ──────────────────────────────────────────────
  const standard = await prisma.roomType.upsert({
    where: { name: 'Standard' },
    update: {},
    create: {
      name: 'Standard',
      description: 'Comfortable room with a queen bed, ideal for solo travelers or couples.',
      pricePerNight: 35000,
      maxGuests: 2,
      amenities: ['AC', 'WiFi', 'TV', 'Hot water'],
    },
  })

  const deluxe = await prisma.roomType.upsert({
    where: { name: 'Deluxe' },
    update: {},
    create: {
      name: 'Deluxe',
      description: 'Spacious room with a king bed and private balcony.',
      pricePerNight: 55000,
      maxGuests: 2,
      amenities: ['AC', 'WiFi', 'TV', 'Balcony', 'Minibar'],
    },
  })

  const suite = await prisma.roomType.upsert({
    where: { name: 'Executive Suite' },
    update: {},
    create: {
      name: 'Executive Suite',
      description: 'Two-room suite with lounge area and kitchenette.',
      pricePerNight: 90000,
      maxGuests: 3,
      amenities: ['AC', 'WiFi', 'TV', 'Kitchenette', 'Lounge', 'Bathtub'],
    },
  })

  const family = await prisma.roomType.upsert({
    where: { name: 'Family' },
    update: {},
    create: {
      name: 'Family',
      description: 'Two beds, ideal for families with children.',
      pricePerNight: 70000,
      maxGuests: 4,
      amenities: ['AC', 'WiFi', 'TV', 'Two beds', 'Kids welcome'],
    },
  })

  console.log('✓ Room types created')

  // ── Rooms ────────────────────────────────────────────────────
  const roomsData = [
    // Floor 1 — Standard
    { roomNumber: '101', floor: 1, roomTypeId: standard.id },
    { roomNumber: '102', floor: 1, roomTypeId: standard.id },
    { roomNumber: '103', floor: 1, roomTypeId: standard.id },
    { roomNumber: '104', floor: 1, roomTypeId: family.id },
    // Floor 2 — Deluxe
    { roomNumber: '201', floor: 2, roomTypeId: deluxe.id },
    { roomNumber: '202', floor: 2, roomTypeId: deluxe.id },
    { roomNumber: '203', floor: 2, roomTypeId: deluxe.id },
    { roomNumber: '204', floor: 2, roomTypeId: family.id },
    // Floor 3 — Suites
    { roomNumber: '301', floor: 3, roomTypeId: suite.id },
    { roomNumber: '302', floor: 3, roomTypeId: suite.id },
  ]

  for (const room of roomsData) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {},
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
