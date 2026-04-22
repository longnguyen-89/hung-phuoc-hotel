# PRD: Mini CRM Homestay Cleaning Management
**Phiên bản:** 1.0 | **Tác giả:** Product Team

---

## 0. Tổng quan & Mục tiêu

**Problem Statement:** Chủ homestay quy mô nhỏ (2–20 phòng) mất trung bình 15–30% doanh thu/tháng do (a) sót phòng chưa dọn khi khách mới check-in và (b) chi trả lương dọn phòng sai lệch do ghi nhận giờ công thủ công.

**Goals (SMART):**
- G1: Giảm tỷ lệ "sót phòng" về **0%** (đo bằng số complaint guest/tháng).
- G2: Giảm **80% thời gian** chủ nhà dành cho việc tính lương cuối tháng.
- G3: Onboard homestay mới vận hành được trong **< 30 phút**.

**Personas:**
- **Owner (Chủ nhà):** 30–55 tuổi, quản lý 2–10 phòng, dùng smartphone tốt, quen Zalo.
- **Cleaner (Nhân viên dọn):** 25–55 tuổi, part-time, kỹ năng công nghệ thấp, cần UI cực đơn giản.
- **Manager (Quản lý):** Chỉ ở homestay lớn, có quyền giống Owner trừ Payroll.

---

## 1. User Flow

### 1.1 Flow chính — "Từ Booking đến Thanh toán Lương"

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: NHẬP LỊCH ĐẶT PHÒNG (Owner)                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Owner đăng nhập → Dashboard                                  │
│ 2. Click "Thêm Booking" → Chọn Phòng, nhập:                     │
│    - Tên khách, SĐT                                             │
│    - Check-in datetime, Check-out datetime                      │
│    - Ghi chú đặc biệt (vd: "có thú cưng", "khách VIP")          │
│ 3. System lưu Booking → Trigger Business Rule BR-01             │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: AUTO-GENERATE TASK (System)                            │
├─────────────────────────────────────────────────────────────────┤
│ 4. BR-01: System tạo CleaningTask với:                          │
│    - room_id, booking_id, due_before = next_checkin_time        │
│    - status = "pending", priority tính theo due_before          │
│ 5. BR-02: Auto-assign cleaner (nếu bật auto) HOẶC               │
│    hiện trong "Unassigned Queue" cho Owner                      │
│ 6. Send notification (Zalo OA / Push / SMS) tới cleaner         │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: THỰC HIỆN DỌN DẸP (Cleaner)                            │
├─────────────────────────────────────────────────────────────────┤
│ 7. Cleaner nhận thông báo → mở app → xem danh sách task hôm nay │
│ 8. Đến phòng → quét QR tại cửa                                  │
│ 9. System validate: GPS trong radius 50m? QR đúng room?         │
│    → Bắt đầu đếm giờ (started_at = NOW)                         │
│ 10. Cleaner dọn phòng…                                          │
│ 11. Click "Hoàn thành" → bắt buộc:                              │
│     - Upload 3–5 ảnh (bedroom/bathroom/floor)                   │
│     - Checklist: giường✓ toilet✓ rác✓ đồ amenity✓               │
│     - Ghi chú (optional): "ga trải giường bẩn nặng, cần phạt"   │
│ 12. System: completed_at = NOW, duration = completed-started    │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 4: XÁC NHẬN & TÍNH PHÍ (Owner + System)                   │
├─────────────────────────────────────────────────────────────────┤
│ 13. Task chuyển status → "pending_review"                       │
│ 14. Owner xem ảnh, duyệt → "approved" HOẶC yêu cầu làm lại      │
│ 15. BR-03: System tính WageEntry:                               │
│     wage = duration_hours × hourly_rate                         │
│          + bonus (weekend/holiday/dirty)                        │
│          - penalty (late, thiếu ảnh, quá hạn)                   │
│ 16. Ghi vào Payroll của kỳ lương hiện tại                       │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 5: BẢNG LƯƠNG (Owner)                                     │
├─────────────────────────────────────────────────────────────────┤
│ 17. Cuối kỳ (tuần/tháng): System đóng kỳ lương, tạo Payroll.pdf │
│ 18. Owner review → Export PDF → Chuyển khoản                    │
│ 19. Đánh dấu "paid" → khoá kỳ lương                             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Flow phụ quan trọng

- **F-A Sót phòng cảnh báo:** Cronjob mỗi 15 phút → quét task có `due_before < NOW + X giờ` và `status = pending` → push alert ĐỎ cho Owner.
- **F-B Cleaner không đến:** Nếu task `assigned_at` > 2h và `started_at = NULL` → alert Owner để reassign.
- **F-C Khách check-out sớm:** Owner click "Check-out Now" → ghi đè `actual_checkout_at` → tái tính `due_before` cho task.

### 1.3 Quản lý nhân viên dọn (Staff Management)

**Mục tiêu:** Owner tự quản lý đội ngũ cleaner mà không cần can thiệp DB. Đây là điều kiện cần cho các feature BR-02 (auto-assign) và BR-05 (tính lương) chạy đúng — sai `hourly_rate` hoặc quên tắt `is_active` khi cleaner nghỉ sẽ dẫn tới sai lương / assign nhầm người.

**Actor:** Owner (hoặc Manager trong tương lai).

**Use cases:**

| Mã | Use case | Mô tả |
|---|---|---|
| UC-S1 | Thêm nhân viên | Nhập tên + SĐT + đơn giá/giờ + (tuỳ chọn) STK ngân hàng. Hệ thống tạo đồng thời 1 row `users` (role=cleaner) và 1 row `staff_profiles` trong 1 transaction. SĐT phải unique. |
| UC-S2 | Sửa rate | Owner đổi `hourly_rate`, `weekend_multiplier`, `holiday_multiplier`. Chỉ áp dụng cho task được duyệt **từ lúc sửa trở đi** — task cũ đã có `wage_entries` thì không đổi. |
| UC-S3 | Sửa thông tin ngân hàng | Cập nhật `bank_name`, `bank_account` để in vào payroll PDF. |
| UC-S4 | Tắt/bật nhân viên | Toggle `is_active` ở `users`. Khi `false`: cleaner không hiện trong danh sách auto-assign (BR-02), không login được vào Cleaner PWA, nhưng lương lịch sử vẫn giữ nguyên (không xoá `wage_entries`). |
| UC-S5 | Xem workload & lương tháng | Dashboard nhỏ cho từng cleaner: số task tháng này, tổng giờ, tổng tiền đã được duyệt. |

**Business rules liên quan:**

- **BR-02 phải lọc `is_active = true`** khi chọn cleaner để auto-assign.
- **Không xoá cứng cleaner** có `wage_entries` lịch sử (constraint ON DELETE RESTRICT). Thay bằng `is_active = false`.
- **Sửa `hourly_rate` không retroactive:** `wage_entries` đã tính rồi giữ nguyên `base_rate` lúc approve, không đổi. Đây là nguyên tắc kế toán — không "viết lại lịch sử" lương.
- **SĐT là định danh đăng nhập** Cleaner PWA → phải unique toàn bảng `users`. Khi Owner nhập SĐT trùng → trả lỗi rõ ràng.

**UI tối thiểu:**
- Trang `/staff` có nút "+ Thêm nhân viên" (form modal/inline), bảng liệt kê cleaner với cột: Tên, SĐT, Rate/giờ, Hệ số, STK, Trạng thái (badge Active/Nghỉ), actions (Sửa, Tắt/Bật).
- Click dòng cleaner → mở trang chi tiết `/staff/[id]` với tab "Task lịch sử" + "Lương tháng này".

---

## 2. Database Schema

**Convention:** PostgreSQL, snake_case, mọi bảng có `id (uuid)`, `created_at`, `updated_at`, `deleted_at (nullable, soft delete)`.

### 2.1 `properties` — Cơ sở homestay
```sql
id              uuid PK
owner_id        uuid FK → users.id
name            text
address         text
latitude        decimal(10,7)    -- cho geo-fence
longitude       decimal(10,7)
geofence_radius_m  int DEFAULT 50
timezone        text DEFAULT 'Asia/Ho_Chi_Minh'
```

### 2.2 `rooms` — Phòng
```sql
id              uuid PK
property_id     uuid FK → properties.id
name            text               -- "Phòng 101", "Deluxe Ocean"
qr_token        text UNIQUE        -- token in QR dán tại cửa
default_clean_minutes  int DEFAULT 45   -- ước lượng chuẩn
status          enum('available','occupied','cleaning','dirty','maintenance')
```

### 2.3 `users` — Tất cả users (Owner/Manager/Cleaner)
```sql
id              uuid PK
phone           text UNIQUE        -- login bằng SĐT + OTP
full_name       text
role            enum('owner','manager','cleaner')
avatar_url      text
is_active       boolean DEFAULT true
```

### 2.4 `staff_profiles` — Chi tiết nhân viên dọn (1-1 với users khi role=cleaner)
```sql
id              uuid PK
user_id         uuid FK → users.id UNIQUE
property_id     uuid FK → properties.id
hourly_rate     decimal(10,0)       -- VNĐ/giờ, vd: 50000
weekend_multiplier   decimal(3,2) DEFAULT 1.20
holiday_multiplier   decimal(3,2) DEFAULT 1.50
bank_account    text
bank_name       text
```

### 2.5 `bookings` — Đặt phòng
```sql
id              uuid PK
room_id         uuid FK → rooms.id
guest_name      text
guest_phone     text
checkin_at      timestamptz
checkout_at     timestamptz
actual_checkin_at   timestamptz NULL
actual_checkout_at  timestamptz NULL
source          enum('direct','airbnb','booking_com','agoda','other')
notes           text
status          enum('upcoming','checked_in','checked_out','cancelled')
```

### 2.6 `cleaning_tasks` — Task dọn (trái tim hệ thống)
```sql
id              uuid PK
room_id         uuid FK → rooms.id
booking_id      uuid FK → bookings.id NULL  -- NULL nếu deep clean định kỳ
assigned_to     uuid FK → users.id NULL
due_before      timestamptz                 -- phải xong trước thời điểm này
priority        enum('low','normal','high','critical')
type            enum('turnover','deep_clean','maintenance_clean')

started_at      timestamptz NULL
completed_at    timestamptz NULL
duration_minutes  int GENERATED ALWAYS AS
                  (EXTRACT(EPOCH FROM completed_at - started_at)/60) STORED

status          enum('pending','assigned','in_progress',
                     'pending_review','approved','rejected','cancelled')

checklist_json  jsonb    -- {"bed":true,"toilet":true,"trash":true,"amenity":true}
dirty_level     enum('light','normal','heavy') NULL  -- cleaner tự đánh giá
cleaner_note    text NULL

-- Audit check-in bằng QR + GPS
qr_scanned_at   timestamptz NULL
gps_lat         decimal(10,7) NULL
gps_lng         decimal(10,7) NULL
gps_valid       boolean NULL     -- true nếu trong geofence

reviewed_by     uuid FK → users.id NULL
reviewed_at     timestamptz NULL
rejection_reason  text NULL
```

### 2.7 `task_photos`
```sql
id              uuid PK
task_id         uuid FK → cleaning_tasks.id
photo_url       text
category        enum('bedroom','bathroom','floor','other')
uploaded_at     timestamptz
```

### 2.8 `wage_entries` — Mỗi task approved tạo 1 entry
```sql
id              uuid PK
task_id         uuid FK → cleaning_tasks.id UNIQUE
cleaner_id      uuid FK → users.id
payroll_id      uuid FK → payrolls.id NULL

base_hours      decimal(5,2)
base_rate       decimal(10,0)
base_amount     decimal(12,0)

bonus_amount    decimal(12,0) DEFAULT 0
bonus_reason    text

penalty_amount  decimal(12,0) DEFAULT 0
penalty_reason  text

total_amount    decimal(12,0)
computed_at     timestamptz
```

### 2.9 `payrolls` — Kỳ lương (tuần/tháng)
```sql
id              uuid PK
property_id     uuid FK → properties.id
cleaner_id      uuid FK → users.id
period_start    date
period_end      date
total_amount    decimal(12,0)
status          enum('open','finalized','paid')
pdf_url         text NULL
paid_at         timestamptz NULL
```

### 2.10 `notifications` — Log & queue
```sql
id              uuid PK
user_id         uuid FK → users.id
channel         enum('zalo','sms','push','email')
type            text              -- 'task_assigned','sot_phong_alert'...
payload_json    jsonb
sent_at         timestamptz NULL
status          enum('queued','sent','failed')
```

### 2.11 Index quan trọng
```sql
CREATE INDEX ON cleaning_tasks (status, due_before);   -- cronjob sót phòng
CREATE INDEX ON cleaning_tasks (assigned_to, status);  -- dashboard cleaner
CREATE INDEX ON bookings (room_id, checkout_at);       -- trigger auto-task
CREATE INDEX ON wage_entries (cleaner_id, payroll_id);
```

---

## 3. Tech Stack (MVP tối giản, 4–6 tuần)

| Lớp | Đề xuất | Lý do |
|---|---|---|
| **Frontend** | **Next.js 15 (App Router) + TailwindCSS + shadcn/ui** | SSR cho dashboard Owner, PWA cho Cleaner (cài vào home screen như app), không cần build native |
| **Backend** | **Next.js Route Handlers + tRPC** (hoặc REST nếu team chưa quen) | Monorepo đơn giản, type-safe end-to-end |
| **Database + Auth + Storage** | **Supabase** (Postgres + Auth + Storage + Realtime) | Thay thế được cả PostgreSQL managed + S3 + Auth. Realtime subscription cho dashboard live. Free tier đủ cho 5–10 homestay đầu |
| **File/Ảnh** | **Supabase Storage** | Resize ảnh qua Transform API |
| **Notification** | **Zalo ZNS** (chính) + **Firebase Cloud Messaging** (push PWA) + SMS fallback qua **Twilio/eSMS.vn** | Zalo là kênh chính ở VN |
| **Background Jobs** | **Supabase Edge Functions + pg_cron** | Cronjob "sót phòng" chạy mỗi 15 phút |
| **PDF** | **react-pdf** (server-side render) | Xuất bảng lương |
| **Maps/Geo** | **Haversine formula** tự tính (không cần Google Maps API) | Chỉ cần check khoảng cách 2 toạ độ |
| **QR** | **qrcode** (gen) + **html5-qrcode** (scan trên browser) | Không cần native |
| **Deploy** | **Vercel** (frontend) + **Supabase Cloud** | Zero-ops |
| **Monitoring** | **Sentry** + **Supabase Logs** | Bắt lỗi production |

**Chi phí ước tính (5 homestay, 50 phòng):** ~$25–40/tháng (Supabase Pro + Vercel Hobby + Zalo ZNS pay-per-use).

**Alternative đơn giản hơn cho Solo Builder:** Python **Streamlit** + **SQLite** + **Telegram Bot** — xong trong 1 tuần, nhưng UX kém, không scale được. Chỉ khuyến nghị nếu là side project thử nghiệm.

---

## 4. Business Logic

### BR-01: Auto-create Cleaning Task khi có Check-out

**Trigger:** INSERT vào `bookings` HOẶC UPDATE `bookings.actual_checkout_at` từ NULL sang giá trị.

**Pseudo-code:**
```python
def on_booking_checkout(booking):
    room = get_room(booking.room_id)

    # Tìm booking kế tiếp của phòng này để set deadline
    next_booking = query("""
        SELECT * FROM bookings
        WHERE room_id = :room_id
          AND checkin_at > :checkout
          AND status = 'upcoming'
        ORDER BY checkin_at ASC LIMIT 1
    """, room_id=room.id, checkout=booking.checkout_at)

    # Deadline = check-in kế tiếp, hoặc mặc định +4h nếu không có
    if next_booking:
        due_before = next_booking.checkin_at
    else:
        due_before = booking.checkout_at + timedelta(hours=4)

    # Priority theo khoảng cách thời gian
    gap_hours = (due_before - now()) / 3600
    if gap_hours < 2:   priority = 'critical'
    elif gap_hours < 4: priority = 'high'
    elif gap_hours < 8: priority = 'normal'
    else:               priority = 'low'

    task = create_cleaning_task(
        room_id=room.id,
        booking_id=booking.id,
        due_before=due_before,
        priority=priority,
        type='turnover',
        status='pending'
    )

    # Cập nhật status phòng
    update_room_status(room.id, 'dirty')

    # Auto-assign nếu bật
    if property.settings.auto_assign_enabled:
        auto_assign_cleaner(task)

    return task
```

### BR-02: Auto-assign Cleaner

**Chiến lược: Round-robin có trọng số theo workload trong ngày.**

```python
def auto_assign_cleaner(task):
    # Danh sách cleaner active của property
    cleaners = query("""
        SELECT u.*, COALESCE(SUM(ct.duration_minutes), 0) AS today_minutes
        FROM users u
        JOIN staff_profiles sp ON sp.user_id = u.id
        LEFT JOIN cleaning_tasks ct ON ct.assigned_to = u.id
              AND DATE(ct.started_at) = CURRENT_DATE
        WHERE sp.property_id = :property_id
          AND u.role = 'cleaner'
          AND u.is_active = true
        GROUP BY u.id
        ORDER BY today_minutes ASC   -- ai ít việc nhất assign trước
        LIMIT 1
    """, property_id=task.property_id)

    if cleaners:
        task.assigned_to = cleaners[0].id
        task.status = 'assigned'
        task.save()
        send_notification(
            user_id=cleaners[0].id,
            channel='zalo',
            type='task_assigned',
            payload={'room': task.room.name, 'due': task.due_before}
        )
```

### BR-03: Validate Check-in Dọn phòng (QR + GPS)

```python
def start_cleaning(task_id, qr_token, gps_lat, gps_lng, user):
    task = get_task(task_id)

    # Rule 1: user phải là người được assign
    if task.assigned_to != user.id:
        raise Forbidden("Task này không phải của bạn")

    # Rule 2: QR phải khớp room
    if task.room.qr_token != qr_token:
        raise BadRequest("QR không đúng phòng")

    # Rule 3: GPS trong geofence
    distance = haversine(
        gps_lat, gps_lng,
        task.room.property.latitude, task.room.property.longitude
    )
    if distance > task.room.property.geofence_radius_m:
        raise Forbidden(f"Bạn đang cách homestay {int(distance)}m, cần đến gần hơn")

    task.started_at = now()
    task.qr_scanned_at = now()
    task.gps_lat = gps_lat
    task.gps_lng = gps_lng
    task.gps_valid = True
    task.status = 'in_progress'
    task.save()

    update_room_status(task.room_id, 'cleaning')
```

### BR-04: Complete Task (bắt buộc ảnh + checklist)

```python
def complete_cleaning(task_id, photos, checklist, dirty_level, note):
    task = get_task(task_id)

    # Guard rails
    if task.status != 'in_progress':
        raise BadRequest("Task chưa bắt đầu hoặc đã xong")
    if len([p for p in photos if p.category in ('bedroom','bathroom','floor')]) < 3:
        raise BadRequest("Cần tối thiểu 3 ảnh: giường, toilet, sàn")
    if not all(checklist.values()):
        raise BadRequest("Phải tick đủ checklist")

    task.completed_at = now()
    task.checklist_json = checklist
    task.dirty_level = dirty_level
    task.cleaner_note = note
    task.status = 'pending_review'
    task.save()

    save_photos(task.id, photos)
    notify_owner(task.property.owner_id, 'task_pending_review', task)
```

### BR-05: Tính Wage Entry (khi Owner approve)

```python
def compute_wage(task):
    cleaner = get_staff_profile(task.assigned_to)
    hours = task.duration_minutes / 60

    # Base
    base_rate = cleaner.hourly_rate
    multiplier = 1.0
    if is_weekend(task.started_at):
        multiplier = cleaner.weekend_multiplier
    if is_holiday(task.started_at):
        multiplier = cleaner.holiday_multiplier

    base_amount = round(hours * base_rate * multiplier)

    # Bonus
    bonus = 0
    bonus_reasons = []
    if task.dirty_level == 'heavy':
        bonus += 20000
        bonus_reasons.append("Phòng bẩn nặng")
    if 22 <= task.started_at.hour or task.started_at.hour < 6:
        bonus += 15000
        bonus_reasons.append("Làm đêm")

    # Penalty
    penalty = 0
    penalty_reasons = []
    if task.completed_at > task.due_before:
        late_hours = (task.completed_at - task.due_before).total_seconds() / 3600
        penalty += round(late_hours * 30000)  # 30k/giờ trễ
        penalty_reasons.append(f"Trễ {late_hours:.1f}h")

    total = base_amount + bonus - penalty

    return create_wage_entry(
        task_id=task.id,
        cleaner_id=task.assigned_to,
        base_hours=hours,
        base_rate=base_rate,
        base_amount=base_amount,
        bonus_amount=bonus,
        bonus_reason="; ".join(bonus_reasons),
        penalty_amount=penalty,
        penalty_reason="; ".join(penalty_reasons),
        total_amount=total
    )
```

### BR-06: Cảnh báo Sót phòng (cronjob 15 phút)

```sql
-- pg_cron: chạy mỗi 15 phút
SELECT ct.id, r.name, ct.due_before
FROM cleaning_tasks ct
JOIN rooms r ON r.id = ct.room_id
WHERE ct.status IN ('pending','assigned','in_progress')
  AND ct.due_before < NOW() + INTERVAL '2 hours';

-- Với mỗi row → push Zalo ALERT ĐỎ cho owner
-- Nếu due_before < NOW() + 30 min → gọi điện tự động (Stringee/Twilio)
```

### BR-07: Đóng kỳ lương

- Mặc định: **chủ nhật cuối tuần 23:59** → tự động chuyển `payrolls.status` từ `open` → `finalized`, render PDF.
- Owner có thể điều chỉnh tần suất: weekly / biweekly / monthly.
- Sau khi `finalized`, các `wage_entries` không được phép sửa — muốn sửa phải tạo adjustment entry mới.

---

## 5. Acceptance Criteria (tiêu chí nghiệm thu MVP)

- [ ] Owner tạo booking có check-out trong quá khứ → task tự sinh trong < 5 giây.
- [ ] Cleaner đứng cách homestay 100m → KHÔNG thể bấm "Bắt đầu dọn".
- [ ] Task có `due_before` trong 30 phút tới mà vẫn `pending` → Owner nhận Zalo alert.
- [ ] Task hoàn thành chỉ 2 ảnh → bị chặn, yêu cầu thêm ảnh.
- [ ] Cuối tuần, cleaner có 5 task approved → PDF payroll liệt kê đúng 5 dòng với tổng tiền khớp tổng `wage_entries.total_amount`.
- [ ] Xoá booking → task liên quan chuyển status `cancelled`, không xoá cứng (để giữ audit).
- [ ] Owner thêm cleaner mới bằng SĐT đã tồn tại → bị chặn với message "SĐT đã đăng ký".
- [ ] Owner tắt (`is_active=false`) cleaner đang có task `assigned` → task giữ nguyên người cũ, nhưng lần auto-assign tiếp theo không chọn cleaner đó.
- [ ] Owner sửa `hourly_rate` từ 50k→60k, cleaner có 1 task cũ đã approved (rate 50k) và 1 task mới approved sau sửa → `wage_entries` cũ giữ `base_rate=50000`, entry mới có `base_rate=60000`.

---

## 6. Out of Scope (MVP v1.0)

- Tích hợp Airbnb/Booking.com iCal sync → v1.1
- Chat trong app giữa Owner và Cleaner → dùng Zalo tạm
- Đặt lịch deep-clean định kỳ (mỗi 30 ngày) → v1.1
- Multi-tenant với nhiều Owner chia sẻ cleaner → v2.0
- App native iOS/Android → PWA đã đủ cho MVP

---

**Ghi chú cho AI Coder:**
Ưu tiên hoàn thành theo thứ tự: (1) Auth + CRUD rooms/bookings, (2) Auto-create task + assign, (3) Cleaner PWA với QR+GPS, (4) Wage + Payroll + PDF, (5) Notification + cronjob sót phòng. **Không** viết test unit cho MVP v1.0 ngoại trừ business logic BR-01, BR-03, BR-05 (đây là phần tính tiền, sai là mất tiền thật).
