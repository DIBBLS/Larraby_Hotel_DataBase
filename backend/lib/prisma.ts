// lib/prisma.ts
// Prisma client singleton — prevents exhausting DB connections
// in Next.js dev mode (hot reload creates a new client per edit otherwise)

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
