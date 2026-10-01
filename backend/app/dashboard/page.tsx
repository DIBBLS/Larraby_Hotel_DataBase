import {
  getTodayStats,
  getTodaysBookings,
  getRoomGrid,
  getSourceBreakdown,
  getReturningGuests,
} from '@/lib/dashboard'

function naira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`
}

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

const SOURCE_LABEL: Record<string, string> = {
  WALK_IN: 'Walk-in',
  WEBSITE: 'Online',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Phone',
  AGENT: 'Agent',
}

const SOURCE_PILL_CLASS: Record<string, string> = {
  WALK_IN: 'lh-pill-walkin',
  WEBSITE: 'lh-pill-online',
  WHATSAPP: 'lh-pill-whatsapp',
  PHONE: 'lh-pill-phone',
  AGENT: 'lh-pill-agent',
}

const STATUS_PILL_CLASS: Record<string, string> = {
  PENDING: 'lh-pill-warn',
  CONFIRMED: 'lh-pill-good',
  CHECKED_IN: 'lh-pill-good',
  CHECKED_OUT: 'lh-pill-bad',
  CANCELLED: 'lh-pill-bad',
  NO_SHOW: 'lh-pill-bad',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'In',
  CHECKED_OUT: 'Out',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
}

const ROOM_CELL_CLASS: Record<string, string> = {
  AVAILABLE: 'lh-room-cell-available',
  OCCUPIED: 'lh-room-cell-occupied',
  RESERVED: 'lh-room-cell-reserved',
  MAINTENANCE: 'lh-room-cell-maintenance',
}

const SOURCE_BAR_COLOR: Record<string, string> = {
  WALK_IN: 'var(--good)',
  WEBSITE: 'var(--online)',
  WHATSAPP: 'var(--whatsapp)',
  PHONE: 'var(--muted)',
  AGENT: 'var(--muted)',
}

export default async function DashboardPage() {
  const [stats, bookings, rooms, sources, returningGuests] = await Promise.all([
    getTodayStats(),
    getTodaysBookings(),
    getRoomGrid(),
    getSourceBreakdown(),
    getReturningGuests(),
  ])

  return (
    <main className="lh-content">
      <div>
        <h1 className="lh-page-title">Good morning, front desk</h1>
        <p className="lh-page-sub">Here&rsquo;s what&rsquo;s happening today at Larabby Hotel.</p>
      </div>

      <div className="lh-stats">
        <div className="lh-stat-card">
          <div className="lh-stat-label">Available rooms</div>
          <div className="lh-stat-value">{stats.rooms.available}</div>
          <div className="lh-stat-note muted">of {stats.rooms.total} total</div>
        </div>
        <div className="lh-stat-card">
          <div className="lh-stat-label">Check-ins today</div>
          <div className="lh-stat-value">{stats.today.checkIns}</div>
          <div className="lh-stat-note muted">{stats.today.pendingOnlineBookings} pending online</div>
        </div>
        <div className="lh-stat-card">
          <div className="lh-stat-label">Check-outs today</div>
          <div className="lh-stat-value">{stats.today.checkOuts}</div>
          <div className="lh-stat-note muted">due today</div>
        </div>
        <div className="lh-stat-card">
          <div className="lh-stat-label">Revenue today</div>
          <div className="lh-stat-value">{naira(stats.today.revenue)}</div>
          <div className="lh-stat-note muted">collected so far</div>
        </div>
      </div>

      <div className="lh-row2">
        <section className="lh-panel">
          <div className="lh-panel-head">
            <h2 className="lh-panel-title">Today&rsquo;s bookings</h2>
          </div>
          {bookings.length === 0 ? (
            <p className="lh-empty">Nothing due to check in or out today.</p>
          ) : (
            bookings.map((b) => (
              <div className="lh-booking-row" key={b.id}>
                <div className="lh-booking-avatar">{initialsFor(b.guestName)}</div>
                <div className="lh-booking-info">
                  <div className="lh-booking-name">{b.guestName}</div>
                  <div className="lh-booking-meta">
                    Room {b.roomNumber} · {b.isCheckInToday ? 'Check-in' : 'Check-out'} today
                  </div>
                </div>
                <span className={`lh-pill ${SOURCE_PILL_CLASS[b.source] ?? 'lh-pill-phone'}`}>
                  {SOURCE_LABEL[b.source] ?? b.source}
                </span>
                <span className={`lh-pill ${STATUS_PILL_CLASS[b.status] ?? 'lh-pill-phone'}`}>
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="lh-panel">
          <div className="lh-panel-head">
            <h2 className="lh-panel-title">Room status</h2>
          </div>
          <div className="lh-legend">
            <div className="lh-legend-item"><span className="lh-legend-dot" style={{ background: 'var(--good)' }} />Available</div>
            <div className="lh-legend-item"><span className="lh-legend-dot" style={{ background: 'var(--bad)' }} />Occupied</div>
            <div className="lh-legend-item"><span className="lh-legend-dot" style={{ background: 'var(--warn)' }} />Reserved</div>
            <div className="lh-legend-item"><span className="lh-legend-dot" style={{ background: 'var(--muted)' }} />Maintenance</div>
          </div>
          <div className="lh-room-grid">
            {rooms.map((r) => (
              <div key={r.id} className={`lh-room-cell ${ROOM_CELL_CLASS[r.status] ?? ''}`}>
                <div className="lh-room-num">{r.roomNumber}</div>
                <div className="lh-room-type">{r.type}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="lh-row3">
        <section className="lh-panel">
          <div className="lh-panel-head">
            <h2 className="lh-panel-title">Booking source breakdown</h2>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>This month</span>
          </div>
          {sources.length === 0 ? (
            <p className="lh-empty">No bookings yet this month.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {sources.map((s) => (
                <div className="lh-source-row" key={s.source}>
                  <span className="lh-source-label">{SOURCE_LABEL[s.source] ?? s.source}</span>
                  <div className="lh-source-bar-bg">
                    <div
                      className="lh-source-bar-fill"
                      style={{ width: `${s.pct}%`, background: SOURCE_BAR_COLOR[s.source] ?? 'var(--muted)' }}
                    />
                  </div>
                  <span className="lh-source-pct">{s.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lh-panel">
          <div className="lh-panel-head">
            <h2 className="lh-panel-title">Returning guests</h2>
          </div>
          {returningGuests.length === 0 ? (
            <p className="lh-empty">No repeat guests yet.</p>
          ) : (
            returningGuests.map((g) => (
              <div className="lh-returning-row" key={g.id}>
                <div className="lh-returning-avatar">{initialsFor(g.name)}</div>
                <div className="lh-booking-info">
                  <div className="lh-returning-name">{g.name}</div>
                  <div className="lh-returning-meta">
                    Last stay: {g.lastStay.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span className="lh-returning-stays">{g.stays} stays</span>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
