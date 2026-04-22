# Implementation Plan — Mini CRM Homestay Cleaning

**Vai trò:** Tech Lead
**Mục tiêu:** Chia sản phẩm thành 3 Phase giao được (shippable), mỗi Phase có phạm vi rõ ràng, danh sách file cần tạo, và tiêu chí nghiệm thu (acceptance criteria). Cuối tài liệu có Timeline tổng và Technical Checklist.

**Tech stack đã chốt (theo PRD §3):**
- **Frontend + BFF:** Next.js 15 (App Router, Turbopack, Route Handlers) + TypeScript
- **UI:** TailwindCSS v3 + shadcn-style components
- **Database + Auth + Storage + Realtime:** Supabase (self-host bằng Docker qua Supabase CLI cho dev)
- **Business logic critical:** Postgres triggers + Edge Functions (Deno)
- **Validation:** Zod
- **Dates:** date-fns + `vi` locale

---

## Phase 1 — Backend & Database (Foundation)

**Mục tiêu:** Xây dựng schema, business rules chạy ở tầng DB, và tầng API để Phase 2/3 chỉ việc gọi.

**Deliverables:**
- Postgres schema đầy đủ 10 bảng + enums + indexes
- Trigger BR-01 (auto tạo cleaning task khi booking check-out)
- Business logic helpers BR-02 / BR-03 / BR-05 dạng TypeScript module
- Route Handlers CRUD core cho rooms, bookings, tasks
- Edge Functions cho cron BR-06 (cảnh báo sót phòng), BR-07 (chốt lương tháng)
- Seed dữ liệu demo

### Files

| Path | Mục đích |
|---|---|
| `supabase/config.toml` | Cấu hình Supabase CLI (port, auth, storage) |
| `supabase/migrations/0001_init.sql` | Tất cả bảng + enum + index + trigger BR-01 |
| `supabase/seed.sql` | Dữ liệu demo: 1 property, 1 owner, 2 cleaner, 4 rooms, 5 bookings |
| `supabase/functions/cron-room-alerts/index.ts` | Edge Function BR-06 — quét booking đã check-out nhưng chưa có task |
| `supabase/functions/cron-payroll-close/index.ts` | Edge Function BR-07 — chốt bảng lương cuối tháng |
| `lib/supabase/server.ts` | Supabase client cho Server Components / Route Handlers |
| `lib/supabase/browser.ts` | Supabase client cho Client Components |
| `lib/supabase/service.ts` | Supabase admin client (service_role) dùng trong cron / API nhạy cảm |
| `lib/types.ts` | Type `Database` generate từ Supabase + DTO nghiệp vụ |
| `lib/constants.ts` | `DEMO_PROPERTY_ID`, `DEMO_OWNER_ID`, geofence radius mặc định |
| `lib/business/auto-assign.ts` | BR-02 — round-robin gán cleaner theo workload |
| `lib/business/validate-checkin.ts` | BR-03 — validate QR payload + haversine GPS |
| `lib/business/compute-wage.ts` | BR-05 — tính lương: base × multiplier + bonus − penalty |
| `lib/utils/geo.ts` | Haversine distance |
| `lib/utils/format.ts` | Format VND, date `vi` |
| `lib/utils/cn.ts` | `clsx` + `tailwind-merge` helper |
| `app/api/rooms/route.ts` | GET/POST rooms |
| `app/api/rooms/[id]/route.ts` | GET/PATCH/DELETE 1 room |
| `app/api/bookings/route.ts` | GET/POST bookings |
| `app/api/bookings/[id]/route.ts` | GET/PATCH 1 booking |
| `app/api/bookings/[id]/checkout/route.ts` | POST check-out (trigger BR-01 tự chạy) |
| `app/api/tasks/route.ts` | GET tasks (filter theo status/date/cleaner) |
| `app/api/tasks/[id]/route.ts` | GET/PATCH task |
| `app/api/tasks/[id]/auto-assign/route.ts` | POST — gọi BR-02 |
| `app/api/tasks/[id]/approve/route.ts` | POST — owner duyệt, gọi BR-05 |
| `app/api/tasks/[id]/simulate-complete/route.ts` | (DEV) giả lập cleaner hoàn thành để test E2E khi chưa có Phase 3 |
| `app/api/payroll/route.ts` | GET bảng lương theo tháng + cleaner |
| `package.json` | Scripts: `dev`, `db:start`, `db:stop`, `db:reset`, `db:studio` |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

### Acceptance Criteria Phase 1

- [ ] `npx supabase start` → Postgres/Studio/PostgREST up trong Docker
- [ ] `npx supabase db reset` chạy migration + seed không lỗi
- [ ] INSERT/UPDATE booking với `status = 'checked_out'` → tự động có record trong `cleaning_task` (BR-01 verified qua SQL)
- [ ] Gọi `POST /api/tasks/:id/auto-assign` → task được gán cleaner có workload thấp nhất
- [ ] Gọi `POST /api/tasks/:id/approve` → tạo record `wage_entry` với số tiền đúng công thức BR-05
- [ ] Edge Function cron-room-alerts chạy local được (`supabase functions serve`)
- [ ] Tất cả endpoint trả JSON đúng schema, lỗi trả 400/404/500 có message rõ ràng

---

## Phase 2 — Owner Dashboard (Web)

**Mục tiêu:** Giao diện web cho chủ homestay quản lý toàn bộ vận hành hằng ngày.

**Deliverables:**
- Layout sidebar + header + route group `(owner)`
- 6 trang chính: Dashboard, Phòng, Booking, Task, Nhân viên, Bảng lương
- Gantt view 7 ngày cho booking/room
- Critical alert banner (pulse-red animation) khi có phòng sót
- Bypass auth trong MVP (dùng `DEMO_OWNER_ID`)

### Files

| Path | Mục đích |
|---|---|
| `app/layout.tsx` | Root layout (font, meta, TailwindCSS) |
| `app/globals.css` | Tailwind directives + `@layer components` (.btn, .card, .input, .badge, `pulse-red`) |
| `app/(owner)/layout.tsx` | Sidebar nav (pink theme) + main content wrapper |
| `app/(owner)/dashboard/page.tsx` | Stats cards, critical alerts, Gantt 7 ngày, open tasks, room grid |
| `app/(owner)/dashboard/_components/stats-cards.tsx` | 4 card KPI (rooms cần dọn, tasks hôm nay, doanh thu tuần, cleaner active) |
| `app/(owner)/dashboard/_components/gantt-view.tsx` | Gantt 7 ngày × rooms, block booking theo màu status, "now" vertical line |
| `app/(owner)/dashboard/_components/critical-alerts.tsx` | Banner đỏ nhấp nháy khi có phòng sót |
| `app/(owner)/rooms/page.tsx` | Danh sách phòng + status badge + giá |
| `app/(owner)/rooms/[id]/page.tsx` | Chi tiết 1 phòng + history bookings/tasks |
| `app/(owner)/rooms/_components/room-form.tsx` | Form tạo/sửa phòng (client) |
| `app/(owner)/bookings/page.tsx` | Danh sách booking + filter + nút "Check-out" |
| `app/(owner)/bookings/new/page.tsx` | Form tạo booking mới |
| `app/(owner)/bookings/[id]/page.tsx` | Chi tiết booking |
| `app/(owner)/tasks/page.tsx` | Danh sách task + filter status + nút "Auto" (auto-assign) |
| `app/(owner)/tasks/[id]/page.tsx` | Chi tiết task: ảnh, checklist, nút "Duyệt & tính lương", "Mô phỏng hoàn thành" (DEV) |
| `app/(owner)/staff/page.tsx` | Danh sách cleaner + workload hôm nay + tổng giờ tháng |
| `app/(owner)/staff/[id]/page.tsx` | Chi tiết cleaner + lịch sử task + lương |
| `app/(owner)/payroll/page.tsx` | Bảng lương theo tháng (picker), breakdown từng cleaner |
| `components/shared/status-badge.tsx` | Badge màu theo enum status |
| `components/shared/date-picker.tsx` | Date picker wrap `react-day-picker` |
| `components/shared/empty-state.tsx` | Empty state reusable |
| `components/shared/confirm-dialog.tsx` | Dialog xác nhận hành động |

### Acceptance Criteria Phase 2

- [ ] Tất cả 6 trang trả HTTP 200, không lỗi hydration
- [ ] Dashboard hiển thị đúng số liệu từ seed (4 rooms, 5 bookings, N tasks)
- [ ] Click "Check-out" ở Booking → task mới hiện lên ở Tasks trong vòng 1s (không cần F5)
- [ ] Click "Auto" trên task `awaiting_assign` → task chuyển sang `scheduled` + gán cleaner
- [ ] Click "Mô phỏng hoàn thành" → task chuyển `awaiting_review` với 3 ảnh demo
- [ ] Click "Duyệt & tính lương" → task `approved`, phòng `available`, có record bảng lương
- [ ] Gantt hiển thị đúng 7 ngày, booking blocks đúng vị trí, "now" line đúng thời gian hiện tại
- [ ] Mobile responsive tối thiểu trên 360px (sidebar collapse hoặc ẩn)

---

## Phase 3 — Cleaner PWA (Mobile)

**Mục tiêu:** Ứng dụng mobile-first cho nhân viên dọn phòng. Hoạt động như PWA (installable, offline-capable cho task list).

**Deliverables:**
- Manifest + service worker cơ bản (cache shell)
- OTP SMS auth cho cleaner
- QR scan + GPS check-in (BR-03)
- Chụp ảnh bắt buộc + checklist + timer tự động
- Trang earnings (xem lương mình)
- Push notification khi có task mới

### Files

| Path | Mục đích |
|---|---|
| `public/manifest.json` | PWA manifest (name, icons, theme_color) |
| `public/icons/*.png` | PWA icons 192/512 |
| `app/sw.ts` | Service worker: cache shell, offline task list |
| `app/(cleaner)/layout.tsx` | Layout mobile-first, bottom tab nav |
| `app/(cleaner)/login/page.tsx` | Nhập SĐT → nhận OTP |
| `app/(cleaner)/verify/page.tsx` | Nhập OTP → Supabase Auth session |
| `app/(cleaner)/tasks/page.tsx` | Danh sách task assigned cho cleaner đang đăng nhập |
| `app/(cleaner)/tasks/[id]/page.tsx` | Chi tiết task, nút "Bắt đầu" |
| `app/(cleaner)/tasks/[id]/scan/page.tsx` | Camera QR scanner (html5-qrcode) + lấy GPS |
| `app/(cleaner)/tasks/[id]/active/page.tsx` | Task đang thực hiện: timer đếm, checklist, nút chụp ảnh, nút "Hoàn tất" |
| `app/(cleaner)/tasks/[id]/upload/page.tsx` | Upload ảnh (Supabase Storage), preview, xoá/chụp lại |
| `app/(cleaner)/earnings/page.tsx` | Tổng giờ + tiền tháng này + lịch sử từng task |
| `app/(cleaner)/profile/page.tsx` | Tên, SĐT, rate, nút logout |
| `app/api/auth/otp/send/route.ts` | Gửi OTP (tích hợp Twilio/eSMS) |
| `app/api/auth/otp/verify/route.ts` | Verify OTP + tạo Supabase session |
| `app/api/tasks/[id]/check-in/route.ts` | Validate QR+GPS (BR-03) → task `in_progress` |
| `app/api/tasks/[id]/complete/route.ts` | Submit photos + checklist → task `awaiting_review` |
| `app/api/storage/task-photo/route.ts` | Signed URL upload cho ảnh task |
| `app/api/push/subscribe/route.ts` | Lưu push subscription vào DB |
| `app/api/push/send/route.ts` | (Edge) gửi push khi task mới được assign |
| `components/cleaner/bottom-nav.tsx` | Tab bar Task / Earnings / Profile |
| `components/cleaner/qr-scanner.tsx` | Wrapper `html5-qrcode` |
| `components/cleaner/photo-uploader.tsx` | Capture + resize + upload |
| `components/cleaner/task-timer.tsx` | Timer start khi check-in, hiển thị realtime |
| `supabase/migrations/0002_push_subscriptions.sql` | Bảng `push_subscription` |

### Acceptance Criteria Phase 3

- [ ] Lighthouse PWA score ≥ 90, installable trên iOS Safari + Android Chrome
- [ ] OTP login hoạt động trên SĐT thật (có thể mock provider trong dev)
- [ ] QR scan từ camera → lấy được GPS trong 5s
- [ ] BR-03 chặn check-in khi GPS > geofence (default 100m) với message rõ ràng
- [ ] Ảnh chụp upload thành công lên Supabase Storage, hiển thị preview ngay
- [ ] Timer đếm chính xác từ lúc check-in đến submit
- [ ] Push notification nhận được trong ≤ 10s sau khi owner auto-assign (Android/Chrome)
- [ ] Trang earnings hiển thị đúng số liệu đồng bộ với Owner Dashboard

---

## Timeline

| Phase | Nội dung | Thời gian ước tính | Người làm |
|---|---|---|---|
| Phase 1 | Backend + DB + API | **3–4 ngày** | 1 Fullstack |
| Phase 2 | Owner Dashboard | **4–5 ngày** | 1 Frontend + 1 Fullstack |
| Phase 3 | Cleaner PWA | **5–6 ngày** | 1 Frontend mobile |
| QA & polish | Test E2E, fix, onboarding | **2 ngày** | Cả team |
| **Tổng** | | **~2.5 tuần** (1 team 2 người) | |

Có thể chạy song song Phase 2 và Phase 3 sau khi Phase 1 stable (ngày 4 trở đi).

---

## Technical Checklist xuyên suốt

### Code quality
- [ ] TypeScript strict mode, không dùng `any` trừ khi có comment `// @ts-expect-error` giải thích
- [ ] Tất cả input API validate bằng Zod
- [ ] Error boundary ở mỗi route group
- [ ] Server Component mặc định, chỉ `"use client"` khi cần

### Database
- [ ] Mọi bảng có `id`, `created_at`, `updated_at`
- [ ] Foreign key ràng buộc đầy đủ, `ON DELETE` chọn đúng (CASCADE hoặc RESTRICT)
- [ ] Index trên các cột query nóng (`property_id`, `status`, `scheduled_for`)
- [ ] RLS policies bật cho `anon` / `authenticated` trước khi release (MVP tạm tắt để dev nhanh)

### DX
- [ ] `npm run dev` + `npm run db:start` là 2 câu lệnh duy nhất để chạy app
- [ ] `npm run db:reset` reset được schema + seed trong < 10s
- [ ] README có "Luồng demo" bấm 6 bước ra kết quả

### Security (cần trước khi production)
- [ ] Bật RLS, viết policy từng bảng theo role
- [ ] Bỏ `DEMO_OWNER_ID` hardcode, dùng Supabase session
- [ ] Rotate service_role key, không commit `.env*`
- [ ] Rate limit OTP endpoint (3 req/phút/SĐT)

### Observability
- [ ] Log cấu trúc JSON cho mọi Route Handler (method, path, status, duration)
- [ ] Sentry (hoặc tương đương) cho frontend + edge
- [ ] Alert nếu cron BR-06 không chạy

### Testing
- [ ] Unit test cho `compute-wage.ts`, `auto-assign.ts`, `validate-checkin.ts` (các hàm pure)
- [ ] E2E 1 luồng chính: tạo booking → check-out → auto task → assign → simulate complete → approve → payroll update
- [ ] Manual test matrix: 4 status × 3 thiết bị (desktop/iOS/Android)

---

## Risk & Mitigation

| Rủi ro | Ảnh hưởng | Biện pháp |
|---|---|---|
| Supabase Docker image chậm/lỗi pull | Block dev onboard | Cache image trong CI; docs fallback dùng cloud Supabase |
| GPS không chính xác trong nhà (BR-03) | Cleaner không check-in được | Cho phép override bằng QR-only sau 2 lần fail, log cảnh báo |
| OTP SMS cost | Chi phí vận hành | Dùng Zalo ZNS (rẻ hơn) hoặc fallback magic link email |
| Trigger BR-01 miss khi batch update | Sót phòng | Cron BR-06 là safety net, chạy mỗi 15 phút |
| Realtime subscription quá nhiều client | Perf DB | Giới hạn subscribe theo `property_id`, dùng broadcast thay vì postgres_changes khi scale |
