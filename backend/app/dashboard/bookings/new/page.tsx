'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type AvailableRoom = {
  id: string
  roomNumber: string
  floor: number
  type: string
  pricePerNight: number
  maxGuests: number
  amenities: string[]
}

type BookingResult = {
  bookingRef: string
  guest: string
  room: string
  checkIn: string
  checkOut: string
  total: number
  status: string
  source: string
}

function naira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`
}

function nightsBetween(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

export default function NewBookingPage() {
  const router = useRouter()

  // Step 1: search
  const today = new Date().toISOString().slice(0, 10)
  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState('')
  const [guestCount, setGuestCount] = useState(1)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<AvailableRoom[] | null>(null)

  // Step 2: pick room + guest details
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState<'WALK_IN' | 'PHONE' | 'AGENT'>('WALK_IN')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Step 3: success
  const [result, setResult] = useState<BookingResult | null>(null)

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])
  const estimatedTotal = useMemo(() => {
    if (!selectedRoom || nights <= 0) return 0
    const subtotal = selectedRoom.pricePerNight * nights
    return Math.round(subtotal * (1 - discountPercent / 100))
  }, [selectedRoom, nights, discountPercent])

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    setSearchError(null)
    setRooms(null)
    setSelectedRoom(null)

    if (!checkOut) {
      setSearchError('Pick a check-out date')
      return
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setSearchError('Check-out must be after check-in')
      return
    }

    setSearching(true)
    try {
      const params = new URLSearchParams({ checkIn, checkOut, guests: String(guestCount) })
      const res = await fetch(`/api/availability?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error ?? 'Could not check availability')
        return
      }
      setRooms(data.rooms)
    } catch {
      setSearchError('Could not reach the server')
    } finally {
      setSearching(false)
    }
  }

  async function handleCreateBooking(e: FormEvent) {
    e.preventDefault()
    if (!selectedRoom) return
    setSubmitError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email: email || undefined,
          roomId: selectedRoom.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestCount,
          source,
          discountPercent,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error ?? 'Could not create the booking')
        if (res.status === 409) {
          // Someone else took the room — drop back to search results.
          setSelectedRoom(null)
          setRooms((prev) => (prev ? prev.filter((r) => r.id !== selectedRoom.id) : prev))
        }
        return
      }

      setResult(data.booking)
    } catch {
      setSubmitError('Could not reach the server')
    } finally {
      setSubmitting(false)
    }
  }

  function startAnother() {
    setResult(null)
    setRooms(null)
    setSelectedRoom(null)
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setDiscountPercent(0)
  }

  if (result) {
    return (
      <main className="lh-content">
        <h1 className="lh-page-title">Booking created</h1>
        <div className="lh-success-card">
          <div style={{ fontSize: 13, color: 'var(--good)' }}>Booking reference</div>
          <div className="lh-success-ref">{result.bookingRef}</div>
          <div className="lh-success-row"><span>Guest</span><strong>{result.guest}</strong></div>
          <div className="lh-success-row"><span>Room</span><strong>{result.room}</strong></div>
          <div className="lh-success-row"><span>Check-in</span><strong>{new Date(result.checkIn).toLocaleDateString('en-GB')}</strong></div>
          <div className="lh-success-row"><span>Check-out</span><strong>{new Date(result.checkOut).toLocaleDateString('en-GB')}</strong></div>
          <div className="lh-success-row"><span>Total</span><strong>{naira(result.total)}</strong></div>
          <div className="lh-success-row"><span>Status</span><strong>{result.status}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="lh-btn-primary" onClick={startAnother}>Create another booking</button>
          <button type="button" className="lh-btn-secondary" onClick={() => router.push('/dashboard')}>Back to dashboard</button>
        </div>
      </main>
    )
  }

  return (
    <main className="lh-content">
      <div>
        <h1 className="lh-page-title">New booking</h1>
        <p className="lh-page-sub">Search availability, then create a confirmed booking for a guest at the desk.</p>
      </div>

      <section className="lh-panel">
        <div className="lh-panel-head">
          <h2 className="lh-panel-title">1. Check availability</h2>
        </div>
        {searchError && <div className="lh-error-banner">{searchError}</div>}
        <form onSubmit={handleSearch}>
          <div className="lh-form-grid">
            <div className="lh-field-sm">
              <label htmlFor="checkIn">Check-in</label>
              <input id="checkIn" type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="lh-field-sm">
              <label htmlFor="checkOut">Check-out</label>
              <input id="checkOut" type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="lh-field-sm">
              <label htmlFor="guestCount">Guests</label>
              <input
                id="guestCount"
                type="number"
                min={1}
                required
                value={guestCount}
                onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="lh-btn-primary" disabled={searching}>
              {searching ? 'Searching…' : 'Search rooms'}
            </button>
          </div>
        </form>

        {rooms && (
          rooms.length === 0 ? (
            <p className="lh-empty">No rooms available for those dates and guest count.</p>
          ) : (
            <div className="lh-room-pick-grid">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`lh-room-pick-card${selectedRoom?.id === r.id ? ' selected' : ''}`}
                  onClick={() => setSelectedRoom(r)}
                >
                  <div className="lh-room-pick-num">{r.roomNumber}</div>
                  <div className="lh-room-pick-type">{r.type} · Floor {r.floor}</div>
                  <div className="lh-room-pick-price">{naira(r.pricePerNight)}<span style={{ color: 'var(--muted)', fontWeight: 400 }}>/night</span></div>
                  <div className="lh-room-pick-meta">Up to {r.maxGuests} guests</div>
                </button>
              ))}
            </div>
          )
        )}
      </section>

      {selectedRoom && (
        <section className="lh-panel">
          <div className="lh-panel-head">
            <h2 className="lh-panel-title">2. Guest details</h2>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Room {selectedRoom.roomNumber} · {nights} night{nights === 1 ? '' : 's'} · {naira(estimatedTotal)}
            </span>
          </div>
          {submitError && <div className="lh-error-banner">{submitError}</div>}
          <form onSubmit={handleCreateBooking}>
            <div className="lh-form-grid">
              <div className="lh-field-sm">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="lh-field-sm">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="lh-field-sm">
                <label htmlFor="phone">Phone</label>
                <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" />
              </div>
              <div className="lh-field-sm">
                <label htmlFor="email">Email (optional)</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="lh-field-sm">
                <label htmlFor="source">How did they book?</label>
                <select id="source" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="PHONE">Phone call</option>
                  <option value="AGENT">Travel agent</option>
                </select>
              </div>
              <div className="lh-field-sm">
                <label htmlFor="discount">Discount %</label>
                <input
                  id="discount"
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>
            </div>
            <div className="lh-field-sm" style={{ marginTop: 14 }}>
              <label htmlFor="notes">Notes (optional)</label>
              <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Early check-in requested, etc." />
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button type="submit" className="lh-btn-primary" disabled={submitting}>
                {submitting ? 'Creating…' : `Confirm booking — ${naira(estimatedTotal)}`}
              </button>
              <button type="button" className="lh-btn-secondary" onClick={() => setSelectedRoom(null)}>
                Back to room list
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
