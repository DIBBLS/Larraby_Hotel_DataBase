'use client'

import { signOut, useSession } from 'next-auth/react'

function initialsFor(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function Topbar() {
  const { data: session } = useSession()

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <header className="lh-topbar">
      <div className="lh-topbar-date">{today}</div>
      <div className="lh-topbar-right">
        <button type="button" className="lh-icon-btn" aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--body)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="lh-notif-dot" />
        </button>
        <div className="lh-avatar" title={session?.user?.name ?? undefined}>
          {initialsFor(session?.user?.name)}
        </div>
        <button type="button" className="lh-signout" onClick={() => signOut({ callbackUrl: '/login' })}>
          Sign out
        </button>
      </div>
    </header>
  )
}
