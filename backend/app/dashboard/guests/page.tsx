'use client'

import { useCallback, useEffect, useState } from 'react'

type GuestRow = {
  id: string
  name: string
  phone: string
  email: string | null
  stays: number
  lastStay: string | null
}

export default function GuestsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [returningOnly, setReturningOnly] = useState(false)
  const [guests, setGuests] = useState<GuestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (returningOnly) params.set('returningOnly', 'true')
      const res = await fetch(`/api/guests?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not load guests')
        return
      }
      setGuests(data.guests)
    } catch {
      setError('Could not reach the server')
    } finally {
      setLoading(false)
    }
  }, [search, returningOnly])

  useEffect(() => {
    load()
  }, [load])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  return (
    <main className="lh-content">
      <div>
        <h1 className="lh-page-title">Guests</h1>
        <p className="lh-page-sub">{guests.length} guest{guests.length === 1 ? '' : 's'}{returningOnly ? ' with 2+ stays' : ''}.</p>
      </div>

      <section className="lh-panel">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 18 }}>
          <div className="lh-field-sm" style={{ minWidth: 220 }}>
            <label htmlFor="search">Name, phone, or email</label>
            <input id="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search…" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--body)', paddingBottom: 11 }}>
            <input
              type="checkbox"
              checked={returningOnly}
              onChange={(e) => setReturningOnly(e.target.checked)}
            />
            Returning guests only (2+ stays)
          </label>
          <button type="submit" className="lh-btn-primary">Search</button>
        </form>

        {error && <div className="lh-error-banner">{error}</div>}

        {loading ? (
          <p className="lh-empty">Loading…</p>
        ) : guests.length === 0 ? (
          <p className="lh-empty">No guests match.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="lh-table lh-table-compact">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Stays</th>
                  <th>Last stay</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{g.phone}{g.email ? ` · ${g.email}` : ''}</div>
                    </td>
                    <td>{g.stays}</td>
                    <td>{g.lastStay ? new Date(g.lastStay).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>
                      <a href={`/dashboard/guests/${g.id}`} className="lh-btn-sm lh-btn-sm-primary" style={{ display: 'inline-block' }}>
                        View
                      </a>
                    </td>
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
