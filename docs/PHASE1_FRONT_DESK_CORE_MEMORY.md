# Ghi nho tien trinh - Giai doan 1 Front Desk Core

Ngay cap nhat: 2026-04-24

## Boi canh

Nguoi dung dong y huong xay dung lai phan mem quan ly Hung Phuoc Hotel theo logic gan voi KiotViet Hotel: so do phong trung tam, tach trang thai phong, dat phong/nhan phong/tra phong ro hon, ho so thanh toan rieng, minibar va quy trinh kiem phong khi tra phong.

Trinh duyet trong app dang o `https://hotel.kiotviet.vn/khachsanhungphuoc/#/DashBoard`, nhung cong cu inspect DOM/screenshot cua browser plugin bi loi `failed to start codex app-server`. Huong thiet ke hien tai dua tren bo cuc/logic da quan sat duoc o URL, tai lieu cong khai KiotViet, va cau truc san co cua repo.

## Da lam trong giai doan 1

- Them migration `supabase/migrations/20260425142000_front_desk_core.sql`.
- Dong bo ten migration local theo lich su Supabase Cloud:
  - `0001_init.sql` -> `20260422060115_init.sql`
  - `0002_storage.sql` -> `20260422060127_storage.sql`
  - `0003_hotel.sql` -> `20260422060206_hotel.sql`
  - Them 2 placeholder `20260422060308_remote_baseline.sql` va `20260422060325_remote_baseline.sql` vi Cloud da ghi nhan 2 version nay truoc do.
- Tach trang thai phong moi thanh `occupancy_status` va `housekeeping_status`, giu lai `rooms.status` cu de UI hien tai khong vo.
- Them cac enum va bang loi:
  - `reservations`
  - `reservation_rooms`
  - `stay_guests`
  - `folios`
  - `folio_lines`
  - `folio_payments`
  - `products`
  - `room_type_minibar_items`
  - `inventory_movements`
  - `room_inspections`
- Them trigger tao ma:
  - `reservations.code` dang `RS000001`
  - `folios.folio_number` dang `FO000001`
- Them trigger tinh lai folio tu dong khi thay doi dong tien/phat sinh:
  - `fn_recalc_folio_totals`
  - `trg_folio_lines_recalc`
  - `trg_folio_payments_recalc`
- Them co che mirror tu legacy `bookings`/`payments` sang model moi:
  - `fn_sync_legacy_booking_to_reservation`
  - `trg_bookings_sync_front_desk_core`
  - `trg_payments_sync_front_desk_core`
  - Neu `bookings.total_amount` cu khac tong cac dong tien phong/giam gia/phi/VAT, migration tu tao dong `legacy:total_adjustment` de folio moi khop cong no cu.
- Them view doc nhanh cho man hinh le tan:
  - `v_front_desk_rooms`
- Cap nhat `supabase/seed.sql` voi san pham mau cho minibar/dich vu/phu thu va cau hinh minibar mac dinh theo hang phong.
- Them migration `supabase/migrations/20260426031500_seed_front_desk_products.sql` de dua san pham/minibar mau len Supabase Cloud, vi `supabase db push` khong chay `seed.sql`.
- Cap nhat `lib/types.ts` voi cac union type tuong ung schema moi.

## Trang thai day len moi truong

- GitHub da co remote `https://github.com/longnguyen-89/hung-phuoc-hotel.git`.
- Branch `main` va `codex/phase1-front-desk-core` da push len GitHub.
- Vercel production da deploy tai `https://hung-phuoc-hotel.vercel.app`.
- Supabase project da link voi ref `aicxuokqwqxwhvwwkjpj`.
- Migration schema `20260425142000_front_desk_core.sql` da duoc apply len Supabase Cloud ngay 2026-04-26.
- Migration seed `20260426031500_seed_front_desk_products.sql` da duoc apply len Supabase Cloud ngay 2026-04-26.

## Chua doi trong giai doan 1

- Chua thay UI owner hien tai. Cac man hinh cu van chay tren `bookings`, `payments`, `rooms.status`.
- Chua them route `/front-desk`.
- Chua thay booking API sang ghi truc tiep `reservations`/`folios`; hien tai migration mirror giup model moi bat kip du lieu cu.
- Chua chay `npm run db:reset` vi lenh nay pha huy du lieu local.

## Huong tiep theo

Giai doan 2 nen dung man hinh `/front-desk` dua tren `v_front_desk_rooms`:

1. So do phong theo tang/hang phong voi mau trang thai moi.
2. Drawer thao tac phong: dat phong, nhan phong, tra phong, them dich vu/minibar, chuyen phong.
3. Luong tra phong: yeu cau kiem phong, ghi minibar/hong hoc, cap nhat folio, thu tien con lai.
4. Sau khi UI on dinh moi chuyen booking API sang model moi lam source of truth.

## Luu y ky thuat

- Repo hien co dang co mau thuan tai lieu: `AGENTS.md` noi owner route khong auth, nhung code hien tai co Supabase owner auth qua `middleware.ts`, `lib/auth.ts`, `/login`, `/signup`. Khi lam UI/API moi can doc code thuc te truoc khi dua ra quyet dinh auth.
- Khong xoa cac trigger cu BR-01/booking/payment rollup khi chua co thay the tuong duong.
- Neu can reset DB de test migration, bao truoc cho nguoi dung vi `npm run db:reset` se wipe du lieu.
