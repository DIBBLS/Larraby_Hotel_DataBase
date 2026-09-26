// Extends NextAuth's built-in types with the fields our session/jwt callbacks add

import { StaffRole } from '@prisma/client'
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: StaffRole
      name?: string | null
      email?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    staffId: string
    role: StaffRole
  }
}
