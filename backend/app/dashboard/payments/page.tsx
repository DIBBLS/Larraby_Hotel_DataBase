'use client'

import { useCallback, useEffect, useState } from 'react'

type PaymentRow = {
  id: string
  amount: string
  method: string
  status: string
  paidAt: string | null
  reference: string | null
  bookingRef: string
  guestName: string
  roomNumber: string
  recordedByName: string | null
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  CARD: 'Card',
  PAYSTACK: 'Paystack',
  POS: 'POS',
}

function naira(amount: string | number) {
  return `₦${Number(amount).toLocaleString('en-NG')}`
}

export default function PaymentsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/payments?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not load payments')
        return
      }
      setPayments(data.payments)
    } catch {
      setError('Could not reach the server')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const total = payments.filter((p) => p.status === 'CONFIRMED').reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <main className="lh-content">
      <div>
        <h1 className="lh-page-title">Payments</h1>
        <p className="lh-page-sub">{payments.length} payment{payments.length === 1 ? '' : 's'} · {naira(total)} total.</p>
      </div>

      <section className="lh-panel">
        <form onSubmit={handleSearchSubmit} className="lh-form-grid" style={{ marginBottom: 18, maxWidth: 420 }}>
          <div className="lh-field-sm">
            <label htmlFor="search">Guest or booking reference</label>
            <input id="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search…" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="lh-btn-primary">Search</button>
          </div>
        </form>

        {error && <div className="lh-error-banner">{error}</div>}

        {loading ? (
          <p className="lh-empty">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="lh-empty">No payments recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="lh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Guest</th>
                  <th>Booking</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>{p.guestName}</td>
                    <td>{p.bookingRef} <span style={{ color: 'var(--muted)' }}>· Room {p.roomNumber}</span></td>
                    <td>{METHOD_LABEL[p.method] ?? p.method}{p.reference ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.reference}</div> : null}</td>
                    <td style={{ fontWeight: 600 }}>{naira(p.amount)}</td>
                    <td style={{ color: 'var(--muted)' }}>{p.recordedByName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
