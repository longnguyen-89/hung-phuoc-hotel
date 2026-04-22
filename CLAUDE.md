# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Next.js dev (Turbopack) at http://localhost:3000
npm run build         # Production build
npm run db:start      # Boot self-hosted Supabase (Postgres :54322, REST :54321, Studio :54323)
npm run db:reset      # Wipe DB, re-run migrations + seed (destroys all data)
npm run db:stop       # Stop containers, keep volume
npm run db:studio     # Open Supabase Studio
npm run db:types      # Regenerate lib/supabase/types.ts from live DB schema
```

No test runner, linter, or type-check script is configured. Run `npx tsc --noEmit` for a type check.

**Prerequisites:** Docker Desktop must be running before `db:start`. First boot pulls ~2-5 min of images. The DB container is named `supabase_db_mini-crm-homestay` (use this for `docker exec ... psql`).

## Product overview

This is **Hưng Phước Hotel** — a self-hosted hotel management system for a 41-room hotel in District 5, HCMC. The codebase was originally derived from a homestay cleaning CRM; the cleaning workflow is preserved as the Cleaner PWA, everything else is hotel-focused.

Brand color: **lime green** (`brand-*` Tailwind palette, base `#84cc16`). Never use pink/indigo in new code.

## Architecture

### Two UI surfaces in one Next.js app

Two clients live under `app/` split by route groups:

- **Owner Dashboard** — desktop, lime sidebar, routes under `app/(owner)/`: `dashboard`, `rooms-map`, `room-types`, `rooms`, `bookings`, `reports`, `invoices`, `tasks`, `staff`, `payroll`, `settings`. Layout is `app/(owner)/layout.tsx`.
- **Cleaner PWA** — mobile-first, routes under `app/cleaner/`. Split into `cleaner/login/` (public) and `cleaner/(app)/` (requires cookie). The nested `(app)` route group exists specifically to isolate the auth check — an earlier version that put the check in the top `cleaner/layout.tsx` caused redirect loops on the login page.

### Auth model (deliberately asymmetric for MVP)

- **Owner routes have NO auth.** `DEMO_OWNER_ID` and `DEMO_PROPERTY_ID` are hardcoded in `lib/constants.ts` and every owner server component / API route filters by these. Do not introduce owner-side auth guards without coordinating — many queries assume single-tenant.
- **Cleaner routes use cookie-only auth.** Login sets httpOnly cookie `cleaner_uid` (see `CLEANER_COOKIE` in `lib/cleaner-session.ts`). Server code gets the session via `await getCleanerSession()`, which validates `is_active=true` and `role='cleaner'`. No OTP/password — phone match is enough. MVP only.

### Supabase access

- Always use `supabaseAdmin()` from `lib/supabase/server.ts` in server components and route handlers. It uses the service-role key because **RLS is effectively disabled in the MVP**. The browser client in `lib/supabase/client.ts` exists but is barely used — prefer going through Next.js route handlers instead of direct-from-browser Supabase calls.
- Self-hosted Supabase, not Cloud. Config lives in `supabase/config.toml`. Secrets in `.env.local` (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). The local anon/service keys in `.env.local.example` are the standard demo keys and safe to commit.

### Domain model (hotel)

The hotel schema lives in `supabase/migrations/0003_hotel.sql` (layered on top of the original cleaning schema in `0001_init.sql`):

- **`room_types`** — hạng phòng with `code` (HP000001…HP000010), `price_per_day`, `price_per_hour`, `price_overnight`, capacity, `amenities` jsonb, `business_status`.
- **`rooms`** extended with `room_type_id`, `room_number`, `floor`, nullable price-override columns, `business_status` (`active`/`inactive`/`selling_service`). View `v_room_effective_price` returns `COALESCE(rooms.price_per_day, room_types.price_per_day, 0)`.
- **`bookings`** extended heavily: `code` (auto `DP000001`), `booking_type` enum `daily`/`hourly`, `adults`/`children`, `guest_id_number`/`guest_email`, pricing snapshot (`unit_price`, `nights`, `hours`, `room_charge`, `discount_amount`, `service_charge`, `vat_rate`, `vat_amount`, `total_amount`), and payment rollup (`deposit_amount`, `paid_amount`, `balance_due`, `payment_status`). The rollup columns are **maintained by DB triggers, not application code** — see below.
- **`payments`** — one row per money movement; enum `method` (cash/bank/card/momo/zalopay/vnpay/other), enum `type` (deposit/balance/refund/extra). Writes automatically recalc the parent booking's rollup.
- **`invoices`** — snapshot of issued invoices with `invoice_number`, `lines_json`, `customer_json`, `total_amount`/`vat_amount`/`subtotal` (not `total`/`vat`). Generated on demand via `POST /api/invoices`; idempotent per booking.
- **`system_settings`** — one row per property. VAT toggle/rate, service charge toggle/rate, `extra_fees_json`, default check-in/out times, overnight window, currency, invoice prefix (default `HP`), hotel contact info, logo URL.

### Critical triggers (do not remove without replacement)

| Trigger | Function | Effect |
|---|---|---|
| `trg_booking_code` (BEFORE INSERT) | `fn_generate_booking_code` | Auto-fill `bookings.code` = `DP` + 6-digit sequence |
| `trg_payments_recalc` (AFTER I/U/D on payments) | `fn_recalc_booking_payment` | Keeps booking's `paid_amount`, `balance_due`, `payment_status` in sync |
| `trg_booking_total_recalc` (BEFORE UPDATE OF total_amount) | `fn_recalc_on_booking_total` | When owner edits `total_amount`, re-derive the same three columns |
| `trg_auto_cleaning_task` (AFTER UPDATE on bookings) | `fn_auto_create_cleaning_task` | **BR-01**: when `status → 'checked_out'`, auto-insert cleaning task and set `rooms.status='dirty'` |

`trg_booking_total_recalc` uses `UPDATE OF total_amount` intentionally to avoid infinite recursion with `fn_recalc_booking_payment` (which also writes to the booking row). If you touch one, re-check the loop.

### Business rules

Business rules are identified as BR-01 … BR-07 throughout code and docs. Keep this naming when adding code.

- **BR-01 (auto-create cleaning task on checkout)** is the `fn_auto_create_cleaning_task` Postgres trigger in `supabase/migrations/0001_init.sql`. It fires on the booking `status → 'checked_out'` transition written by `POST /api/bookings/[id]/checkout`. Changing BR-01 means editing SQL.
- **BR-02 (auto-assign)** — `lib/business/auto-assign.ts`. Round-robin by today's minutes worked. Filters `is_active=true` and `role='cleaner'`.
- **BR-03 (QR + geofence check-in)** — `lib/business/validate-checkin.ts`, consumed by `app/api/tasks/[id]/check-in/route.ts`. Null lat/lng on property ⇒ geofence check is skipped (treated as "not configured").
- **BR-05 (wage computation)** — `lib/business/compute-wage.ts`. Weekend/holiday multipliers come from `staff_profiles`; bonuses (heavy dirt, night shift) and penalties (late delivery) are hardcoded at the top of the file.

### Non-retroactive wage rate

When owner edits a cleaner's `hourly_rate` or multipliers, **only tasks approved from that point onward** use the new rate. Historical `wage_entries` preserve the `base_rate` snapshot captured at approval time. Preserve this principle if refactoring payroll.

### Pricing logic — single source of truth

`lib/business/compute-booking-price.ts` computes booking totals. Used both server-side in `POST /api/bookings` and client-side in the new-booking form for live preview.

```
room_charge = booking_type==='daily' ? nights * unit_price : round(hours * unit_price)
after_discount = max(0, room_charge − discount)
service_charge = round(after_discount × service_charge_rate%)
taxable = after_discount + service_charge
vat_amount = round(taxable × vat_rate%)
total = taxable + vat_amount
```

- `nights = max(1, ceil(ms/day))`; `hours = max(1, ceil(ms/hour × 100)/100)`
- Unit price precedence: form override > `rooms.price_per_*` > `room_types.price_per_*` > 0
- `vat_rate` + `service_charge_rate` are **snapshotted** onto the booking row from `system_settings` at creation time so historical bookings are unaffected when settings change.

### Booking lifecycle API

- `POST /api/bookings` — overlap check (`!= cancelled && != checked_out`), price via `computeBookingPrice`, snapshot settings, derive initial status from current time.
- `POST /api/bookings/[id]/check-in` — upcoming → `checked_in`, `rooms.status='occupied'`, optionally record deposit payment.
- `POST /api/bookings/[id]/checkout` — → `checked_out` (triggers BR-01). Supports `final_amount` override (extras/discount at checkout) and concurrent payment.
- `POST /api/bookings/[id]/cancel` — → `cancelled`; if was `checked_in`, set `rooms.status='available'`.
- `POST /api/bookings/[id]/payments` — manual payment entry. Trigger recalculates rollup.

### Invoice flow

Invoices are **HTML print-ready pages** rendered to PDF via the browser's print dialog (`window.print()`) — no server-side PDF lib.

- `app/(owner)/invoices/preview/page.tsx` is the printable invoice. Uses Tailwind `print:hidden` / `print:shadow-none`. The "Save invoice" button POSTs to `/api/invoices` to persist a row (idempotent per booking — returns existing if one exists).
- `/invoices` lists saved invoices.
- Invoice number = `{invoice_prefix}{YYYY}{seq:5}`. Prefix comes from `system_settings.invoice_prefix` (default `HP`).

### Dashboard analytics

`app/(owner)/dashboard/page.tsx` computes in-memory:

- **Occupancy today** = `rooms.status='occupied' / total rooms` (excluding `business_status='selling_service'`)
- **Revenue 30d** = sum of payments in window (refunds negate)
- **ADR** = `sum(room_charge of checked_out in window) / sum(nights of those)`
- **RevPAR** = `sum(room_charge) / (total_rooms × 30)`
- 14-day daily revenue + occupancy are bucketized in JS

Charts are pure SVG components in `app/(owner)/dashboard/_components/` — no chart library. Keep them dependency-free.

### API route conventions

- Route handlers under `app/api/**/route.ts`. Input validation via module-scope `zod` schemas. Errors return `{ error: string | object }` with Vietnamese messages and proper HTTP status (400 validation, 404 not-found, 409 conflict, 500 DB error).
- Multi-step writes (e.g., `POST /api/staff` inserts `app_users` then `staff_profiles`) roll back manually — no transactional helper. See `app/api/staff/route.ts`.
- CSV endpoints under `app/api/reports/*.csv/route.ts` prepend a UTF-8 BOM (`\uFEFF`) so Excel opens Vietnamese correctly.

### Locale & formatting

- UI copy is **Vietnamese-first**. Currency is VND via `fmtVnd` in `lib/utils/format.ts`. Dates use `date-fns` with the `vi` locale. Do not switch to English error messages.
- Timezone: server-side date math treats timestamps as UTC from Postgres; day-of-week logic in `compute-wage.ts` uses local `getDay()` — be aware when touching wage logic. `v_daily_revenue` aggregates by `Asia/Ho_Chi_Minh`.

### Seed data

`supabase/seed.sql` creates: Hưng Phước Hotel property, system_settings (VAT 10%), 10 room_types matching the photos the owner provided, 41 rooms per floor (501-508, 401-411, 301-311, 201-211, B01-B05), 5 sample bookings via a `DO` block, sample payments. If you re-seed, preserve the **room numbering and floor layout** — the owner's printed collateral references these numbers.
