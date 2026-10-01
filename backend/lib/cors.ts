// lib/cors.ts
// CORS for the two endpoints the public hotel website calls cross-origin:
// GET /api/availability and POST /api/bookings (source: WEBSITE only — every
// other route stays same-origin-only, called only from this app's own
// dashboard pages). Allowed origins come from WEBSITE_ORIGIN (comma-separated)
// so the real domain can be configured per environment without a code change.

function allowedOrigins(): string[] {
  return (process.env.WEBSITE_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

export function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null
  return allowedOrigins().includes(requestOrigin) ? requestOrigin : null
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}
