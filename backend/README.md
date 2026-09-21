# Larabby Hotel — Backend

Hotel management system covering walk-in and online bookings.
Stack: **Next.js 14 · PostgreSQL · Prisma**

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma          # All models: Room, RoomType, Booking, Guest, Staff, Payment
│   └── seed.ts                # Sample room types, rooms, and staff accounts
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── availability.ts        # Anti-double-booking logic
│   └── booking-ref.ts         # LBY-2024-0001 reference generator
├── design/
│   └── dashboard-mockup.html  # Static reference mockup of the front desk dashboard (not wired in)
└── app/api/
    ├── availability/route.ts  # GET  — check available rooms for dates
    ├── bookings/route.ts      # GET list · POST create booking
    ├── bookings/[id]/
    │   ├── route.ts           # GET detail · PATCH check-in/out/cancel
    │   └── payments/route.ts  # GET payments · POST record payment
    └── dashboard/route.ts     # GET — today's occupancy and revenue summary
```

The hotel's public landing page lives at the **repo root** (`index.html`, `larraby.css`) — this backend is a separate Next.js app in `backend/` and deploys as its own Vercel project.

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Set up your database

Create a PostgreSQL database (Supabase free tier works great).

```bash
# backend/.env
DATABASE_URL="postgresql://user:password@host:5432/larabby_hotel"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Run migrations

```bash
npx prisma migrate dev --name init
```

### 4. Seed initial data

```bash
npm run seed
```

This creates:
- 4 room types (Standard ₦35k, Deluxe ₦55k, Family ₦70k, Executive Suite ₦90k)
- 10 rooms across 3 floors (101–104, 201–204, 301–302)
- 2 staff accounts (admin + front desk), default password: `larabby2024`

### 5. Run the dev server

```bash
npm run dev
```

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

## Next steps (after this schema)

1. ~~**Auth** — NextAuth.js with credentials provider for staff login~~ done — see Authentication above
2. **Front desk dashboard** — React UI for creating walk-in bookings, check-in/out (see `design/dashboard-mockup.html` for the planned layout and metrics)
3. **Online booking form** — connects to the hotel website at the repo root, replacing/supplementing the WhatsApp-only flow
4. **Paystack integration** — for online payments
5. **Reports** — monthly occupancy, revenue by room type, source breakdown
6. **Real database** — provision Postgres on Supabase/Railway, set `DATABASE_URL`, run `npx prisma migrate dev --name init`, then `npm run seed`
