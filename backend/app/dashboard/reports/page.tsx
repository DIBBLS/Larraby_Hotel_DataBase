'use client'

import { useCallback, useEffect, useState } from 'react'

type MonthValue = { month: string; total?: number; rate?: number }
type RoomTypeRevenue = { type: string; amount: number; pct: number }
type SourceBreakdown = { source: string; count: number; pct: number }

type ReportsData = {
  revenueByMonth: MonthValue[]
  occupancyByMonth: MonthValue[]
  revenueByRoomType: RoomTypeRevenue[]
  sourceBreakdown: SourceBreakdown[]
}

const SOURCE_LABEL: Record<string, string> = {
  WALK_IN: 'Walk-in',
  WEBSITE: 'Online',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Phone',
  AGENT: 'Agent',
}
const SOURCE_COLOR: Record<string, string> = {
  WALK_IN: 'var(--good)',
  WEBSITE: 'var(--online)',
  WHATSAPP: 'var(--whatsapp)',
  PHONE: 'var(--muted)',
  AGENT: 'var(--muted)',
}
const ROOM_TYPE_COLOR: Record<string, string> = {
  Standard: 'var(--online)',
  Deluxe: 'var(--gold)',
  Family: 'var(--good)',
  'Executive Suite': 'var(--warn)',
}
const FALLBACK_COLORS = ['var(--online)', 'var(--gold)', 'var(--good)', 'var(--warn)', 'var(--whatsapp)']

function naira(amount: number) {
  return `₦${amount.toLocaleString('en-NG')}`
}

export default function ReportsPage() {
  const [months, setMonths] = useState(6)
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?months=${months}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Could not load reports')
        return
      }
      setData(json)
    } catch {
      setError('Could not reach the server')
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => {
    load()
  }, [load])

  return (
    <main className="lh-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 className="lh-page-title">Reports</h1>
          <p className="lh-page-sub">Trends over the selected period.</p>
        </div>
        <div className="lh-field-sm" style={{ width: 170 }}>
          <label htmlFor="months">Period</label>
          <select id="months" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        </div>
      </div>

      {error && <div className="lh-error-banner">{error}</div>}

      {loading || !data ? (
        <p className="lh-empty">Loading…</p>
      ) : (
        <>
          <div className="lh-row2">
            <section className="lh-panel">
              <div className="lh-panel-head">
                <h2 className="lh-panel-title">Revenue by month</h2>
              </div>
              <div className="lh-chart-bars">
                {data.revenueByMonth.map((m) => {
                  const max = Math.max(...data.revenueByMonth.map((x) => x.total ?? 0), 1)
                  const heightPct = Math.max(2, ((m.total ?? 0) / max) * 100)
                  return (
                    <div className="lh-chart-col" key={m.month}>
                      <span className="lh-chart-value">{m.total ? naira(m.total) : '—'}</span>
                      <div className="lh-chart-bar" style={{ height: `${heightPct}%` }} />
                      <span className="lh-chart-month">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="lh-panel">
              <div className="lh-panel-head">
                <h2 className="lh-panel-title">Occupancy by month</h2>
              </div>
              <div className="lh-chart-bars">
                {data.occupancyByMonth.map((m) => {
                  const heightPct = Math.max(2, m.rate ?? 0)
                  return (
                    <div className="lh-chart-col" key={m.month}>
                      <span className="lh-chart-value">{m.rate}%</span>
                      <div className="lh-chart-bar occupancy" style={{ height: `${heightPct}%` }} />
                      <span className="lh-chart-month">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="lh-row3">
            <section className="lh-panel">
              <div className="lh-panel-head">
                <h2 className="lh-panel-title">Revenue by room type</h2>
              </div>
              {data.revenueByRoomType.length === 0 ? (
                <p className="lh-empty">No revenue in this period.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {data.revenueByRoomType.map((r, i) => (
                    <div className="lh-source-row" key={r.type}>
                      <span className="lh-source-label" style={{ width: 110 }}>{r.type}</span>
                      <div className="lh-source-bar-bg">
                        <div
                          className="lh-source-bar-fill"
                          style={{ width: `${r.pct}%`, background: ROOM_TYPE_COLOR[r.type] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
                        />
                      </div>
                      <span className="lh-source-pct" style={{ width: 90 }}>{naira(r.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="lh-panel">
              <div className="lh-panel-head">
                <h2 className="lh-panel-title">Booking source breakdown</h2>
              </div>
              {data.sourceBreakdown.length === 0 ? (
                <p className="lh-empty">No bookings in this period.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {data.sourceBreakdown.map((s) => (
                    <div className="lh-source-row" key={s.source}>
                      <span className="lh-source-label">{SOURCE_LABEL[s.source] ?? s.source}</span>
                      <div className="lh-source-bar-bg">
                        <div className="lh-source-bar-fill" style={{ width: `${s.pct}%`, background: SOURCE_COLOR[s.source] ?? 'var(--muted)' }} />
                      </div>
                      <span className="lh-source-pct">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  )
}
