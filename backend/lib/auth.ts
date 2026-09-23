// lib/auth.ts
// NextAuth configuration — staff sign-in via email + password (bcrypt against Staff.passwordHash)

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Staff login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const staff = await prisma.staff.findUnique({
          where: { email: credentials.email },
        })

        if (!staff || !staff.isActive) return null

        const valid = await bcrypt.compare(credentials.password, staff.passwordHash)
        if (!valid) return null

        return {
          id: staff.id,
          name: `${staff.firstName} ${staff.lastName}`,
          email: staff.email,
          role: staff.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.staffId = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.staffId as string
        session.user.role = token.role as any
      }
      return session
    },
  },
}
