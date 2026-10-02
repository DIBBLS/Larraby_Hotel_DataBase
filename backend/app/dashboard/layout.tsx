import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Shell } from './_components/Shell'

// Every dashboard page is per-staff-member, authenticated data — never
// prerender or cache it. Without this, Next.js attempts a static build
// of /dashboard first (hitting the live database during every deploy)
// before falling back to dynamic once it sees the auth check.
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  return <Shell>{children}</Shell>
}
