# Larabby Hotel — Backend

Hotel management system covering walk-in and online bookings.
Stack: **Next.js 14 · PostgreSQL · Prisma**

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma          # All models: Room, RoomType, Booking, Guest, Staff, Payment, MaintenanceLog
│   ├── migrations/            # Applied automatically on deploy (vercel-build)
│   └── seed.ts                # Sample room types, rooms, and staff accounts (also runs on deploy)
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── auth.ts                # NextAuth config — staff credentials login
│   ├── require-staff.ts       # Session guard used by every staff-only API route
│   ├── availability.ts        # Anti-double-booking logic
│   ├── booking-ref.ts         # LBY-2024-0001 reference generator
│   └── dashboard.ts           # Query logic behind the dashboard (shared by the API route and the page)
├── design/
│   └── dashboard-mockup.html  # Early static reference mockup — superseded by app/dashboard/, kept for history
└── app/
    ├── api/
    │   ├── auth/[...nextauth]/route.ts   # Staff sign-in/out
    │   ├── availability/route.ts         # GET  — check available rooms for dates (public)
    │   ├── bookings/route.ts             # GET list · POST create booking
    │   ├── bookings/[id]/
    │   │   ├── route.ts                  # GET detail · PATCH check-in/out/cancel
    │   │   └── payments/route.ts         # GET payments · POST record payment
    │   ├── rooms/route.ts                # GET every room + status
    │   ├── rooms/[id]/route.ts           # PATCH set/clear maintenance
    │   └── dashboard/route.ts            # GET — today's occupancy and revenue summary
    ├── login/page.tsx                    # Staff sign-in screen
    └── dashboard/                        # The actual front desk app (auth-guarded)
        ├── page.tsx                      # Today's stats, room grid, source breakdown, returning guests
        ├── bookings/page.tsx             # All bookings — search/filter + check-in/out/cancel
        ├── bookings/new/page.tsx         # Walk-in / phone / agent booking creation
        └── rooms/page.tsx                # Room list — set/clear maintenance
```

The hotel's public landing page lives at the **repo root** (`index.html`, `larraby.css`) — this backend is a separate Next.js app in `backend/` and deploys as its own Vercel project.

---

## Setup

### Deploying with Supabase + Vercel (recommended — no terminal needed)

1. **Create the Supabase project.** [supabase.com](https://supabase.com) → New Project. Wait for it to finish provisioning.
2. **Get both connection strings.** Project Settings → Database → Connection string:
   - **Transaction pooler** (port `6543`) → this is `DATABASE_URL`. Make sure `?pgbouncer=true` is on the end.
   - **Direct connection** (port `5432`) → this is `DIRECT_URL`.

   (Two separate strings because Prisma's migration engine can't run through the pgbouncer pooler — the app uses the pooled one at runtime, migrations use the direct one. `prisma/schema.prisma` is already set up for this split.)
3. **Import the repo into Vercel.** New Project → this repo → set **Root Directory** to `backend`.
4. **Add environment variables** in Vercel (Project Settings → Environment Variables):
   - `DATABASE_URL` and `DIRECT_URL` from step 2
   - `NEXTAUTH_SECRET` — any random 32-byte string (e.g. from [1password.com/password-generator](https://1password.com/password-generator) or just mash the keyboard for 40 characters)
   - `NEXTAUTH_URL` — the `https://...vercel.app` URL Vercel gives this project
5. **Deploy.** The build automatically runs the schema migration, then seeds sample data, then builds the app (see `vercel-build` in `package.json`) — no command line required, and no separate seed step. Seeding uses `upsert` throughout so it's safe to run on every deploy; it won't duplicate data.

The initial migration (`prisma/migrations/<timestamp>_init/`) was generated offline from the schema and is already committed — Vercel's build just applies it against your real database on first deploy.

### Local development

```bash
cd backend
npm install
```

```bash
# backend/.env — same two connection strings as above, plus:
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

```bash
npx prisma migrate dev --name init   # creates the schema
npm run seed                          # sample rooms, room types, staff logins
npm run dev
```

Seeding creates:
- 4 room types (Standard ₦35k, Deluxe ₦55k, Family ₦70k, Executive Suite ₦90k)
- 10 rooms across 3 floors (101–104, 201–204, 301–302)
- 2 staff accounts (admin + front desk), default password: `larabby2024`

---

## Authentication

Staff sign in with email + password (checked against `Staff.passwordHash`, seeded by
`prisma/seed.ts`). Handled entirely by NextAuth — there's no custom `/api/login`.

```
GET  /api/auth/csrf                          — fetch a CSRF token first
POST /api/auth/callback/credentials          — { email, password, csrfToken }
GET  /api/auth/session                       — returns the signed-in staff member, or null
POST /api/auth/signout
```

In practice the front desk dashboard (not yet built) will use `next-auth/react`'s
`signIn('credentials', { email, password })` / `signOut()` / `useSession()` instead of
calling these endpoints directly.

**Every route below except `GET /api/availability` and website bookings requires a
signed-in staff session** — calling one without a session returns `401`. Booking creation
is the one route with mixed access: `source: "WEBSITE"` needs no session (that's a guest
booking themselves), every other source (`WALK_IN`, `PHONE`, `AGENT`, a `WHATSAPP` chat a
staff member is keying in) requires one, and `handledById` is always taken from the
session — never from the request body, so a caller can't attribute a booking to a staff
member they aren't signed in as.

## API Reference

### Check availability *(public)*
```
GET /api/availability?checkIn=2024-09-12&checkOut=2024-09-14&guests=2
```
Returns available rooms for the date range. Add `&roomTypeId=xxx` to filter by type.

### Create a booking
```
POST /api/bookings
```
```json
{
  "firstName": "Amaka",
  "lastName": "Obi",
  "phone": "08012345678",
  "roomId": "room-cuid-here",
  "checkInDate": "2024-09-12",
  "checkOutDate": "2024-09-14",
  "guestCount": 2,
  "source": "WALK_IN"
}
```

`source` options: `WALK_IN` · `WEBSITE` · `WHATSAPP` · `PHONE` · `AGENT`.
Only `WEBSITE` is callable without a staff session; the rest require one, and
`handledById` on the created booking is set from that session automatically.

Walk-in bookings are immediately `CONFIRMED`.
Online bookings start as `PENDING` until staff confirms.

### Check in a guest *(staff)*
```
PATCH /api/bookings/:id
{ "action": "CHECK_IN" }
```

### Check out a guest *(staff)*
```
PATCH /api/bookings/:id
{ "action": "CHECK_OUT" }
```

### Record a payment *(staff)*
```
POST /api/bookings/:id/payments
{ "amount": 35000, "method": "CASH" }
```
Methods: `CASH` · `BANK_TRANSFER` · `CARD` · `PAYSTACK` · `POS`.
`recordedBy` is set from the signed-in staff session, same as `handledById` above.
(When Paystack is wired up, its webhook will confirm payments through its own
signature-verified route, not this staff-session one.)

### Dashboard summary *(staff)*
```
GET /api/dashboard
```
Returns today's occupancy, check-ins/outs due, pending online bookings, and revenue.

### Rooms *(staff)*
```
GET /api/rooms
```
Every room with its current status and, if under maintenance, the open `MaintenanceLog` entry.
```
PATCH /api/rooms/:id
{ "action": "SET_MAINTENANCE", "reason": "AC repair" }
{ "action": "CLEAR_MAINTENANCE" }
```
`SET_MAINTENANCE` is rejected for a room that's currently `OCCUPIED` or `RESERVED` — resolve its booking first.

### Guests *(staff)*
```
GET /api/guests?search=amaka&returningOnly=true
```
Every guest matching the search, with stay count and last-stay date. `returningOnly` filters to guests with 2+ stays.

### Payments ledger *(staff)*
```
GET /api/payments?search=LBY-2026-0001
```
Every payment across every booking (not scoped to one booking — that's `GET /api/bookings/:id/payments`), with the guest, booking ref, room, and which staff member recorded it.

### Reports *(staff)*
```
GET /api/reports?months=6
```
Revenue by month, occupancy rate by month (nights sold ÷ nights available), revenue by room type, and booking-source breakdown — all over the trailing N months (`months`, 1–24, default 6).

---

## Key design decisions

**No double bookings** — The booking creation runs inside a Prisma transaction.
Availability is re-checked inside the transaction before writing, so two
simultaneous requests for the same room on the same dates will result in one
success and one `409 Conflict`.

**Walk-in vs online** — The `source` field on every booking distinguishes where
it came from. Walk-in bookings skip `PENDING` and go straight to `CONFIRMED`.
Online bookings (WEBSITE, WHATSAPP) start as `PENDING` so front desk can review.

**Room status** — Rooms transition: `AVAILABLE → RESERVED → OCCUPIED → AVAILABLE`.
Maintenance is tracked separately in `MaintenanceLog` and blocks availability
queries automatically.

**One guest record, multiple bookings** — Guests are matched by phone number.
Returning guests reuse their record; their details can be updated on each booking.

---

## Next steps

1. ~~**Auth**~~ — done, see Authentication above
2. ~~**Front desk dashboard** — walk-in bookings, check-in/out~~ — done, see `app/dashboard/`
3. ~~**Rooms management** — view rooms, set/clear maintenance~~ — done, see `app/dashboard/rooms/`
4. ~~**Payments UI**~~ — done: recordable from `app/dashboard/bookings/`, ledger at `app/dashboard/payments/`
5. ~~**Guests / returning guests pages**~~ — done, see `app/dashboard/guests/`
6. ~~**Reports** — monthly occupancy, revenue by room type, source breakdown over time~~ — done, see `app/dashboard/reports/`
7. **Online booking form** — connects to the hotel website at the repo root, replacing/supplementing the WhatsApp-only flow
8. **Paystack integration** — for online payments, with its own signature-verified webhook (not staff-session gated like the manual payments route)

With 1–6 done, the staff-facing side of the hotel is feature-complete for day-to-day front desk operations. What's left is entirely about the *guest-facing* side: letting guests book themselves on the website instead of everything being staff-entered, and taking real payment online.
