import { notFound } from 'next/navigation'
import { getGuestDetail } from '@/lib/guests'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-show',
}
const STATUS_PILL_CLASS: Record<string, string> = {
  PENDING: 'lh-pill-warn',
  CONFIRMED: 'lh-pill-good',
  CHECKED_IN: 'lh-pill-good',
  CHECKED_OUT: 'lh-pill-phone',
  CANCELLED: 'lh-pill-bad',
  NO_SHOW: 'lh-pill-bad',
}

function naira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`
}

export default async function GuestDetailPage({ params }: { params: { id: string } }) {
  const guest = await getGuestDetail(params.id)
  if (!guest) notFound()

  return (
    <main className="lh-content">
      <a href="/dashboard/guests" className="lh-back-link">&larr; Back to guests</a>

      <section className="lh-panel">
        <h1 className="lh-page-title" style={{ fontSize: 22, marginBottom: 14 }}>
          {guest.firstName} {guest.lastName}
        </h1>
        <div className="lh-form-grid" style={{ fontSize: 13.5 }}>
          <div><strong>Phone</strong><div style={{ color: 'var(--muted)' }}>{guest.phone}</div></div>
          <div><strong>Email</strong><div style={{ color: 'var(--muted)' }}>{guest.email ?? '—'}</div></div>
          <div><strong>Nationality</strong><div style={{ color: 'var(--muted)' }}>{guest.nationality ?? '—'}</div></div>
          <div><strong>ID</strong><div style={{ color: 'var(--muted)' }}>{guest.idType ? `${guest.idType} · ${guest.idNumber ?? ''}` : '—'}</div></div>
        </div>
        {guest.notes && (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--body)' }}>
            <strong>Notes:</strong> {guest.notes}
          </div>
        )}
      </section>

      <section className="lh-panel">
        <div className="lh-panel-head">
          <h2 className="lh-panel-title">Stay history</h2>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{guest.bookings.length} booking{guest.bookings.length === 1 ? '' : 's'}</span>
        </div>
        {guest.bookings.length === 0 ? (
          <p className="lh-empty">No bookings yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="lh-table lh-table-compact">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Room</th>
                  <th>Dates</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {guest.bookings.map((b) => {
                  const balance = Number(b.totalAmount) - Number(b.amountPaid)
                  return (
                    <tr key={b.id}>
                      <td>{b.bookingRef}</td>
                      <td>{b.room.roomNumber} <span style={{ color: 'var(--muted)' }}>· {b.room.roomType.name}</span></td>
                      <td>
                        {b.checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' – '}
                        {b.checkOutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>{naira(Number(b.totalAmount))}</td>
                      <td style={{ color: balance > 0 ? 'var(--bad)' : 'var(--good)', fontWeight: 600 }}>
                        {balance > 0 ? naira(balance) : 'Paid'}
                      </td>
                      <td><span className={`lh-pill ${STATUS_PILL_CLASS[b.status] ?? ''}`}>{STATUS_LABEL[b.status] ?? b.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
