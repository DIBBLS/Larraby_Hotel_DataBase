'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// Owns the mobile nav-drawer open/closed state so Sidebar and Topbar (which
// triggers it) can share it without a server-side layout needing useState.
export function Shell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="lh-shell">
      <Sidebar open={navOpen} />
      {navOpen && (
        <button
          type="button"
          className="lh-nav-backdrop"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      )}
      <div className="lh-main-col">
        <Topbar onMenuClick={() => setNavOpen((o) => !o)} />
        {children}
      </div>
    </div>
  )
}
