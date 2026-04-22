# Hưng Phước Hotel — Hệ thống quản lý khách sạn

Phần mềm quản lý khách sạn tự-host cho **Hưng Phước Hotel** (41 phòng, Quận 5, TP.HCM). Gồm **Owner Dashboard** (desktop) để quản lý phòng/booking/doanh thu/nhân viên và **Cleaner PWA** (mobile) để nhân viên dọn phòng check-in bằng QR + GPS.

Màu chủ đạo: **xanh lá mạ** (`#84cc16` — Tailwind `brand`).

---

## Mục lục

- [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
- [Yêu cầu & cài đặt](#yêu-cầu--cài-đặt)
- [Tài khoản demo](#tài-khoản-demo)
- [Tính năng](#tính-năng)
- [Nghiệp vụ (Business rules)](#nghiệp-vụ-business-rules)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cấu trúc phòng Hưng Phước](#cấu-trúc-phòng-hưng-phước)
- [Script hữu ích](#script-hữu-ích)
- [Roadmap sau MVP](#roadmap-sau-mvp)

---

## Kiến trúc tổng quan

| Layer | Stack |
|---|---|
| Frontend | Next.js 15 App Router (Turbopack) + React 19 + TailwindCSS 3 |
| Backend | Next.js Route Handlers (`app/api/**/route.ts`) + Zod validation |
| DB + Auth + Storage | Supabase self-hosted (Postgres 15 + PostgREST + Storage) qua Docker |
| Scan QR | `html5-qrcode` (camera điện thoại trên PWA) |
| Charts & Gantt | SVG tự vẽ, không phụ thuộc lib ngoài |
| Invoice/PDF | HTML print-ready + browser `window.print()` (không cần lib PDF) |

**2 UI surface chung 1 app Next.js**, phân tách qua route group:

- `app/(owner)/…` — Dashboard cho chủ khách sạn (desktop)
- `app/cleaner/…` — PWA cho nhân viên dọn (mobile), có manifest + icon để add-to-home-screen

---

## Yêu cầu & cài đặt

**Cần sẵn:**
- **Docker Desktop** đang chạy
- **Node.js** 20+
- **npm** hoặc **pnpm**

**Chạy lần đầu:**

```bash
npm install
cp .env.local.example .env.local
npm run db:start    # Boot Supabase qua Docker (2-5 phút lần đầu)
npm run db:reset    # Chạy migrations + seed
npm run dev
```

Các URL:
- **Owner Dashboard:** http://localhost:3000
- **Cleaner PWA:** http://localhost:3000/cleaner/login
- **Supabase Studio:** http://127.0.0.1:54323

---

## Tài khoản demo

Seed tạo sẵn "Hưng Phước Hotel" với **41 phòng** (5 lầu), 10 hạng phòng, system settings (VAT 10%), 5 booking mẫu & 3 user.

| Vai trò | Tên | SĐT | Đơn giá/giờ |
|---|---|---|---|
| Owner | Chị Lan | 0900000001 | — |
| Cleaner | Cô Mai | 0900000002 | 55.000đ |
| Cleaner | Cô Hồng | 0900000003 | 50.000đ |

> **Owner** chưa có màn login (hardcode `DEMO_OWNER_ID` trong `lib/constants.ts`).
> **Cleaner** dùng phone-only login (cookie `cleaner_uid`).

---

## Tính năng

### Owner Dashboard

| Trang | Mô tả |
|---|---|
| `/dashboard` | KPI **Occupancy / ADR / RevPAR / Revenue 30d**, biểu đồ doanh thu & lấp đầy 14 ngày, Gantt lịch phòng, sắp check-in/out |
| `/rooms-map` | Sơ đồ trực quan 41 phòng theo lầu, màu theo trạng thái (available/occupied/dirty/cleaning), click xem booking đang ở |
| `/room-types` | CRUD 10 hạng phòng (code `HP000001`…), set giá ngày/giờ/qua-đêm, số khách, amenities |
| `/rooms` | CRUD từng phòng: số phòng, lầu, hạng phòng, giá override, trạng thái kinh doanh |
| `/bookings` | List booking có mã (DP000001), loại ngày/giờ, tổng đơn, còn lại. Actions: check-in, check-out, huỷ, thanh toán |
| `/bookings/[id]` | Chi tiết booking: khách, phòng, chi tiết giá, lịch sử thanh toán, nút in hoá đơn |
| `/reports` | Báo cáo theo khoảng ngày: doanh thu, ADR/RevPAR, top phòng, theo phương thức, theo nguồn. Xuất CSV bookings & payments |
| `/invoices` | List hoá đơn đã phát hành |
| `/invoices/preview?booking_id=…` | Xem/in hoá đơn (Ctrl+P → PDF) |
| `/tasks` | Task dọn phòng với flow: Chờ gán → Auto (BR-02) → cleaner check-in (BR-03) → Duyệt (BR-05) |
| `/staff`, `/payroll` | Quản lý nhân viên + bảng lương (không retroactive rate) |
| `/settings` | VAT rate, service charge, phí cố định, thông tin khách sạn, giờ check-in/out, tiền tố hoá đơn |

### Cleaner PWA

Login qua SĐT → list task hôm nay → scan QR + GPS geofence (BR-03) → timer + checklist + ảnh → nộp → owner duyệt → thấy tiền trong `/cleaner/earnings`.

---

## Nghiệp vụ (Business rules)

| Rule | Mô tả | Vị trí code |
|---|---|---|
| **BR-01** | Booking check-out → tự sinh cleaning task | Trigger `fn_auto_create_cleaning_task` trong `supabase/migrations/0001_init.sql` |
| **BR-02** | Auto-assign cleaner theo phút công ít nhất hôm nay | `lib/business/auto-assign.ts` |
| **BR-03** | Validate check-in: QR trùng + GPS trong geofence | `lib/business/validate-checkin.ts` |
| **BR-05** | Tính lương: `base_hours × rate × multiplier + bonus − penalty` | `lib/business/compute-wage.ts` |

Triggers bổ sung ở `0003_hotel.sql`:

- **`fn_generate_booking_code`** — auto sinh mã `DP000001` khi insert booking
- **`fn_recalc_booking_payment`** — mỗi lần insert/update/delete `payments` → tự cập nhật `paid_amount`, `balance_due`, `payment_status` của booking
- **`fn_recalc_on_booking_total`** — khi owner điều chỉnh `total_amount` (VD check-out sớm) cũng recalc balance

### Công thức giá (`lib/business/compute-booking-price.ts`)

```
room_charge = (booking_type='daily' ? nights : hours) × unit_price
after_discount = room_charge − discount_amount
service_charge = after_discount × service_charge_rate%
taxable = after_discount + service_charge
vat_amount = taxable × vat_rate%
total_amount = taxable + vat_amount
```

VAT và service charge lấy từ `system_settings` lúc tạo booking (snapshot vào booking row).

### Giá hiệu lực theo phòng (override > type)

Giá ở `rooms.price_per_day` (nullable) sẽ override `room_types.price_per_day`. Xem `v_room_effective_price`.

---

## Cấu trúc thư mục

```
app/
  (owner)/                       # Route group Owner Dashboard
    dashboard/ rooms-map/ room-types/ rooms/
    bookings/ reports/ invoices/ settings/
    tasks/ staff/ payroll/
    layout.tsx                   # Sidebar bg-brand-600 + logo
  cleaner/                       # Cleaner PWA
    login/ (app)/tasks, earnings, profile
  api/                           # Next.js Route Handlers
    bookings/                    # POST/GET + [id]/check-in, checkout, cancel, payments
    rooms/ room-types/ staff/
    invoices/ settings/
    reports/bookings.csv, payments.csv
    tasks/                       # approve, assign, check-in, complete

lib/
  business/                      # BR-02/03/05 + compute-booking-price
  supabase/                      # Clients (server + browser)
  utils/                         # format, geo, cn
  cleaner-session.ts             # Cookie session
  constants.ts                   # DEMO_OWNER_ID, DEMO_PROPERTY_ID
  types.ts

supabase/
  migrations/
    0001_init.sql                # Schema gốc + trigger BR-01
    0002_storage.sql             # Bucket task-photos + RLS
    0003_hotel.sql               # ⭐ Room types + hotel bookings + payments + invoices + settings
  seed.sql                       # 41 phòng, 10 hạng phòng, 5 booking mẫu
```

---

## Cấu trúc phòng Hưng Phước

10 hạng phòng (code `HP000001`…):

| Code | Hạng | Giá/ngày |
|---|---|---|
| HP000001 | Standard | 380.000đ |
| HP000002 | Superior | 480.000đ |
| HP000003 | Deluxe | 530.000đ |
| HP000004 | Suite 1 | 680.000đ |
| HP000005 | Standard Triple | 600.000đ |
| HP000006 | Superior Triple | 680.000đ |
| HP000007 | Family | 1.280.000đ |
| HP000008 | Apartment | 980.000đ |
| HP000009 | Suite 2 | 680.000đ |
| HP000010 | Bán Dịch Vụ | 0đ |

41 phòng chia 5 lầu:

- **Lầu 5** — 8 phòng (501-508)
- **Lầu 4** — 11 phòng (401-411)
- **Lầu 3** — 11 phòng (301-311)
- **Lầu 2** — 11 phòng (201-211)
- **Lầu 1** — 5 phòng "Bán dịch vụ" (B01-B05)

---

## Script hữu ích

```bash
npm run dev           # Next.js dev (Turbopack) tại :3000
npm run build         # Production build
npm run db:start      # Boot Supabase
npm run db:reset      # Wipe DB + migrations + seed
npm run db:stop       # Stop containers, keep data
npm run db:studio     # Mở Supabase Studio
npm run db:types      # Regen types TS

npx tsc --noEmit      # Type-check (chưa có script shortcut)
```

---

## Roadmap sau MVP

- OTP SMS thật (Zalo ZNS / Twilio) thay phone-only login
- RLS policies đầy đủ + bỏ `DEMO_OWNER_ID` hardcode → multi-tenant
- Push notifications khi auto-assign
- Edge Function cron cho BR-06 (cảnh báo sót) và BR-07 (chốt bảng lương cuối tháng)
- Service worker cache task list để cleaner dùng offline
- Channel manager: push giá/availability sang Agoda/Booking.com/Airbnb
- PDF server-side (Puppeteer/pdfkit) thay print browser
- Quản lý tầng vật lý & bảo trì định kỳ
