'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  newBooking: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M12 14v5" />
      <path d="M9.5 16.5h5" />
    </svg>
  ),
  bookings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
      <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
    </svg>
  ),
  rooms: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V5a2 2 0 012-2h5l7 3v15" />
      <path d="M14 21V6" />
      <circle cx="11" cy="13" r="0.8" fill="currentColor" />
    </svg>
  ),
  guests: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  ),
  returning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  payments: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" /><path d="M11 20V4" /><path d="M18 20v-7" />
    </svg>
  ),
}

type NavItem = { href?: string; label: string; icon: ReactNode }

// href is omitted for screens that aren't built yet — those render as
// disabled rows instead of linking to a page that would 404.
const NAV_MAIN: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: ICONS.dashboard },
  { href: '/dashboard/bookings/new', label: 'New booking', icon: ICONS.newBooking },
  { label: 'All bookings', icon: ICONS.bookings },
  { label: 'Rooms', icon: ICONS.rooms },
]
const NAV_GUESTS: NavItem[] = [
  { label: 'Guests', icon: ICONS.guests },
  { label: 'Returning', icon: ICONS.returning },
]
const NAV_FINANCE: NavItem[] = [
  { label: 'Payments', icon: ICONS.payments },
  { label: 'Reports', icon: ICONS.reports },
]

function NavLink({ href, label, icon, active }: { href?: string; label: string; icon: ReactNode; active: boolean }) {
  if (!href) {
    return (
      <div className="lh-nav-link lh-nav-link-disabled">
        <span className="lh-nav-icon" aria-hidden="true">{icon}</span>
        <span className="lh-nav-label">{label}</span>
        <span className="lh-nav-soon">Soon</span>
      </div>
    )
  }

  return (
    <a href={href} className={`lh-nav-link${active ? ' active' : ''}`}>
      <span className="lh-nav-icon" aria-hidden="true">{icon}</span>
      <span className="lh-nav-label">{label}</span>
    </a>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="lh-sidebar">
      <div className="lh-sidebar-brand">
        <div className="lh-sidebar-mark">
          <span>L</span>
        </div>
        <div>
          <div className="lh-sidebar-name">Larabby Hotel</div>
          <div className="lh-sidebar-sub">Front desk</div>
        </div>
      </div>

      <nav className="lh-nav">
        {NAV_MAIN.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="lh-nav-section">Guests</div>
        {NAV_GUESTS.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="lh-nav-section">Finance</div>
        {NAV_FINANCE.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>
    </aside>
  )
}
