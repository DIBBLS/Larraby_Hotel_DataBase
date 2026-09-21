// lib/require-staff.ts
// Guard for API routes that only signed-in hotel staff may call.
// Usage:
//   const auth = await requireStaff()
//   if ('error' in auth) return auth.error
//   // auth.staffId, auth.role are now available

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { StaffRole } from '@prisma/client'

type StaffAuth = { staffId: string; role: StaffRole }
type StaffAuthResult = StaffAuth | { error: NextResponse }

export async function requireStaff(allowedRoles?: StaffRole[]): Promise<StaffAuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: 'Not authorized for this action' }, { status: 403 }) }
  }

  return { staffId: session.user.id, role: session.user.role }
}
