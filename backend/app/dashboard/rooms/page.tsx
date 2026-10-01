'use client'

import { useCallback, useEffect, useState } from 'react'

type Room = {
  id: string
  roomNumber: string
  floor: number
  type: string
  status: string
  notes: string | null
  openMaintenance: { id: string; reason: string; startDate: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  MAINTENANCE: 'Maintenance',
}
const STATUS_PILL_CLASS: Record<string, string> = {
  AVAILABLE: 'lh-pill-good',
  OCCUPIED: 'lh-pill-bad',
  RESERVED: 'lh-pill-warn',
  MAINTENANCE: 'lh-pill-phone',
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)

  // Which room's "set maintenance" reason box is open, and its draft text
  const [maintenanceDraftFor, setMaintenanceDraftFor] = useState<string | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not load rooms')
        return
      }
      setRooms(data.rooms)
    } catch {
      setError('Could not reach the server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submitMaintenance(roomId: string) {
    if (!reasonDraft.trim()) return
    setActionError(null)
    setActionInFlight(roomId)
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SET_MAINTENANCE', reason: reasonDraft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? 'Could not set maintenance')
        return
      }
      setMaintenanceDraftFor(null)
      setReasonDraft('')
      await load()
    } catch {
      setActionError('Could not reach the server')
    } finally {
      setActionInFlight(null)
    }
  }

  async function clearMaintenance(roomId: string) {
    setActionError(null)
    setActionInFlight(roomId)
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_MAINTENANCE' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? 'Could not clear maintenance')
        return
      }
      await load()
    } catch {
      setActionError('Could not reach the server')
    } finally {
      setActionInFlight(null)
    }
  }

  return (
    <main className="lh-content">
      <div>
        <h1 className="lh-page-title">Rooms</h1>
        <p className="lh-page-sub">{rooms.length} room{rooms.length === 1 ? '' : 's'} total.</p>
      </div>

      <section className="lh-panel">
        {actionError && <div className="lh-error-banner">{actionError}</div>}
        {error && <div className="lh-error-banner">{error}</div>}

        {loading ? (
          <p className="lh-empty">Loading…</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="lh-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Type</th>
                  <th>Floor</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => {
                  const canSetMaintenance = r.status === 'AVAILABLE'
                  const isDraftOpen = maintenanceDraftFor === r.id
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.roomNumber}</td>
                      <td>{r.type}</td>
                      <td>{r.floor}</td>
                      <td><span className={`lh-pill ${STATUS_PILL_CLASS[r.status] ?? ''}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                      <td style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 220 }}>
                        {r.status === 'MAINTENANCE' && r.openMaintenance
                          ? `${r.openMaintenance.reason} — since ${new Date(r.openMaintenance.startDate).toLocaleDateString('en-GB')}`
                          : r.status === 'OCCUPIED' || r.status === 'RESERVED'
                            ? 'Has an active booking'
                            : '—'}
                      </td>
                      <td>
                        {r.status === 'MAINTENANCE' ? (
                          <button
                            type="button"
                            className="lh-btn-sm lh-btn-sm-primary"
                            disabled={actionInFlight === r.id}
                            onClick={() => clearMaintenance(r.id)}
                          >
                            {actionInFlight === r.id ? '…' : 'Clear maintenance'}
                          </button>
                        ) : isDraftOpen ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 220 }}>
                            <input
                              autoFocus
                              value={reasonDraft}
                              onChange={(e) => setReasonDraft(e.target.value)}
                              placeholder="Reason…"
                              style={{
                                fontSize: 12.5, padding: '6px 8px', borderRadius: 7,
                                border: '1.5px solid var(--border)', flex: 1, minWidth: 0,
                              }}
                            />
                            <button
                              type="button"
                              className="lh-btn-sm lh-btn-sm-danger"
                              disabled={actionInFlight === r.id || !reasonDraft.trim()}
                              onClick={() => submitMaintenance(r.id)}
                            >
                              {actionInFlight === r.id ? '…' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              className="lh-btn-sm"
                              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)' }}
                              onClick={() => { setMaintenanceDraftFor(null); setReasonDraft('') }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : canSetMaintenance ? (
                          <button
                            type="button"
                            className="lh-btn-sm lh-btn-sm-danger"
                            onClick={() => { setMaintenanceDraftFor(r.id); setReasonDraft('') }}
                          >
                            Set maintenance
                          </button>
                        ) : (
                          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
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
