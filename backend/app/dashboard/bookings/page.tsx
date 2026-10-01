'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'

type BookingRow = {
  id: string
  bookingRef: string
  checkInDate: string
  checkOutDate: string
  totalAmount: string
  amountPaid: string
  status: string
  source: string
  guest: { firstName: string; lastName: string; phone: string }
  room: { roomNumber: string; roomType: { name: string } }
}

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW']

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

function naira(amount: string | number) {
  return `₦${Number(amount).toLocaleString('en-NG')}`
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function actionsFor(status: string): { action: string; label: string; kind: 'primary' | 'danger' }[] {
  switch (status) {
    case 'PENDING':
      return [
        { action: 'CHECK_IN', label: 'Check in', kind: 'primary' },
        { action: 'CANCEL', label: 'Cancel', kind: 'danger' },
      ]
    case 'CONFIRMED':
      return [
        { action: 'CHECK_IN', label: 'Check in', kind: 'primary' },
        { action: 'NO_SHOW', label: 'No-show', kind: 'danger' },
        { action: 'CANCEL', label: 'Cancel', kind: 'danger' },
      ]
    case 'CHECKED_IN':
      return [{ action: 'CHECK_OUT', label: 'Check out', kind: 'primary' }]
    default:
      return []
  }
}

const LIMIT = 20
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'POS', 'PAYSTACK']
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  CARD: 'Card',
  POS: 'POS',
  PAYSTACK: 'Paystack',
}

export default function AllBookingsPage() {
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [paymentFormFor, setPaymentFormFor] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (status) params.set('status', status)
      if (search) params.set('search', search)

      const res = await fetch(`/api/bookings?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not load bookings')
        return
      }
      setBookings(data.bookings)
      setTotal(data.total)
    } catch {
      setError('Could not reach the server')
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

  useEffect(() => {
    load()
  }, [load])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  async function runAction(bookingId: string, action: string) {
    if (action === 'CANCEL' && !window.confirm('Cancel this booking?')) return
    if (action === 'NO_SHOW' && !window.confirm('Mark this booking as a no-show?')) return

    setActionError(null)
    setActionInFlight(`${bookingId}:${action}`)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? 'That action failed')
        return
      }
      await load()
    } catch {
      setActionError('Could not reach the server')
    } finally {
      setActionInFlight(null)
    }
  }

  function openPaymentForm(b: BookingRow, balance: number) {
    setPaymentFormFor(b.id)
    setPaymentAmount(balance.toString())
    setPaymentMethod('CASH')
    setPaymentReference('')
    setPaymentError(null)
  }

  async function submitPayment(bookingId: string) {
    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) {
      setPaymentError('Enter a valid amount')
      return
    }

    setPaymentError(null)
    setPaymentSubmitting(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          method: paymentMethod,
          reference: paymentReference || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPaymentError(data.error ?? 'Could not record the payment')
        return
      }
      setPaymentFormFor(null)
      await load()
    } catch {
      setPaymentError('Could not reach the server')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <main className="lh-content">
      <div>
        <h1 className="lh-page-title">All bookings</h1>
        <p className="lh-page-sub">{total} booking{total === 1 ? '' : 's'} total.</p>
      </div>

      <section className="lh-panel">
        <form onSubmit={handleSearchSubmit} className="lh-form-grid" style={{ marginBottom: 18 }}>
          <div className="lh-field-sm">
            <label htmlFor="search">Guest, phone, or reference</label>
            <input
              id="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search…"
            />
          </div>
          <div className="lh-field-sm">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="lh-btn-primary">Search</button>
          </div>
        </form>

        {actionError && <div className="lh-error-banner">{actionError}</div>}
        {error && <div className="lh-error-banner">{error}</div>}

        {loading ? (
          <p className="lh-empty">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="lh-empty">No bookings match.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="lh-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Dates</th>
                  <th>Balance</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const balance = Number(b.totalAmount) - Number(b.amountPaid)
                  const canPay = balance > 0 && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW'
                  return (
                    <Fragment key={b.id}>
                      <tr>
                        <td>{b.bookingRef}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.guest.firstName} {b.guest.lastName}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{b.guest.phone}</div>
                        </td>
                        <td>{b.room.roomNumber} <span style={{ color: 'var(--muted)' }}>· {b.room.roomType.name}</span></td>
                        <td>{shortDate(b.checkInDate)} – {shortDate(b.checkOutDate)}</td>
                        <td style={{ color: balance > 0 ? 'var(--bad)' : 'var(--good)', fontWeight: 600 }}>
                          {balance > 0 ? naira(balance) : 'Paid'}
                        </td>
                        <td><span className={`lh-pill ${SOURCE_PILL_CLASS[b.source] ?? 'lh-pill-phone'}`}>{SOURCE_LABEL[b.source] ?? b.source}</span></td>
                        <td><span className={`lh-pill ${STATUS_PILL_CLASS[b.status] ?? 'lh-pill-phone'}`}>{STATUS_LABEL[b.status] ?? b.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {actionsFor(b.status).map(({ action, label, kind }) => (
                              <button
                                key={action}
                                type="button"
                                className={kind === 'danger' ? 'lh-btn-sm lh-btn-sm-danger' : 'lh-btn-sm lh-btn-sm-primary'}
                                disabled={actionInFlight === `${b.id}:${action}`}
                                onClick={() => runAction(b.id, action)}
                              >
                                {actionInFlight === `${b.id}:${action}` ? '…' : label}
                              </button>
                            ))}
                            {canPay && (
                              <button
                                type="button"
                                className="lh-btn-sm lh-btn-sm-primary"
                                style={{ background: 'var(--gold-deep)' }}
                                onClick={() => openPaymentForm(b, balance)}
                              >
                                Record payment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {paymentFormFor === b.id && (
                        <tr>
                          <td colSpan={8} style={{ background: 'var(--paper)' }}>
                            {paymentError && <div className="lh-error-banner" style={{ marginBottom: 10 }}>{paymentError}</div>}
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                              <div className="lh-field-sm" style={{ width: 130 }}>
                                <label htmlFor={`amount-${b.id}`}>Amount</label>
                                <input
                                  id={`amount-${b.id}`}
                                  type="number"
                                  min={1}
                                  max={balance}
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                              </div>
                              <div className="lh-field-sm" style={{ width: 150 }}>
                                <label htmlFor={`method-${b.id}`}>Method</label>
                                <select id={`method-${b.id}`} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                  {PAYMENT_METHODS.map((m) => (
                                    <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="lh-field-sm" style={{ width: 170 }}>
                                <label htmlFor={`ref-${b.id}`}>Reference (optional)</label>
                                <input
                                  id={`ref-${b.id}`}
                                  value={paymentReference}
                                  onChange={(e) => setPaymentReference(e.target.value)}
                                  placeholder="Transfer/POS ref…"
                                />
                              </div>
                              <button
                                type="button"
                                className="lh-btn-primary"
                                disabled={paymentSubmitting}
                                onClick={() => submitPayment(b.id)}
                              >
                                {paymentSubmitting ? 'Recording…' : `Record ${naira(Number(paymentAmount) || 0)}`}
                              </button>
                              <button
                                type="button"
                                className="lh-btn-secondary"
                                onClick={() => setPaymentFormFor(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
            <button type="button" className="lh-btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
            <button type="button" className="lh-btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
