// app/api/auth/[...nextauth]/route.ts
// Staff sign-in/sign-out — handled entirely by NextAuth.
// Sign in:  POST /api/auth/callback/credentials  { email, password }  (after GET /api/auth/csrf)
// Sign out: POST /api/auth/signout
// Session:  GET  /api/auth/session

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
