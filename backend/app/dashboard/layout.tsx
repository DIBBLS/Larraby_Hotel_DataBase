import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Sidebar } from './_components/Sidebar'
import { Topbar } from './_components/Topbar'

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

  return (
    <div className="lh-shell">
      <Sidebar />
      <div className="lh-main-col">
        <Topbar />
        {children}
      </div>
    </div>
  )
}
