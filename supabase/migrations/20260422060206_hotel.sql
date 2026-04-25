-- =====================================================================
-- Hưng Phước Hotel — Hotel management schema upgrade
-- =====================================================================
-- Thêm: room_types, mở rộng rooms/bookings, payments, system_settings,
--        invoices, hourly pricing, room-level pricing override
-- =====================================================================

-- ============ ENUMS MỚI ============
CREATE TYPE booking_type AS ENUM ('daily', 'hourly');
CREATE TYPE payment_method AS ENUM ('cash', 'bank', 'card', 'momo', 'zalopay', 'vnpay', 'other');
CREATE TYPE payment_type AS ENUM ('deposit', 'balance', 'refund', 'extra');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
CREATE TYPE room_business_status AS ENUM ('active', 'inactive', 'selling_service');

-- ============ ROOM TYPES (HẠNG PHÒNG) ============
CREATE TABLE room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code text NOT NULL,                          -- HP000001, HP000005...
  name text NOT NULL,                          -- PHÒNG STANDARD
  price_per_day numeric(12, 0) NOT NULL DEFAULT 0,
  price_per_hour numeric(12, 0) NOT NULL DEFAULT 0,
  price_overnight numeric(12, 0) NOT NULL DEFAULT 0,
  capacity int NOT NULL DEFAULT 2,
  max_capacity int NOT NULL DEFAULT 3,
  description text,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,  -- ["wifi","tv","dieu-hoa"]
  photo_url text,
  business_status room_business_status NOT NULL DEFAULT 'active',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, code)
);

CREATE INDEX idx_room_types_property ON room_types (property_id);

CREATE TRIGGER trg_room_types_updated BEFORE UPDATE ON room_types
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============ MỞ RỘNG ROOMS ============
-- Ghi chú: giá ở room override giá của room_type (NULL nghĩa là dùng giá type)
ALTER TABLE rooms
  ADD COLUMN room_type_id uuid REFERENCES room_types(id) ON DELETE SET NULL,
  ADD COLUMN room_number text,
  ADD COLUMN floor int,
  ADD COLUMN price_per_day numeric(12, 0),     -- nullable: NULL = dùng của room_type
  ADD COLUMN price_per_hour numeric(12, 0),
  ADD COLUMN price_overnight numeric(12, 0),
  ADD COLUMN business_status room_business_status NOT NULL DEFAULT 'active',
  ADD COLUMN note text;

CREATE INDEX idx_rooms_type ON rooms (room_type_id);
CREATE INDEX idx_rooms_floor ON rooms (property_id, floor);
CREATE UNIQUE INDEX idx_rooms_property_number ON rooms (property_id, room_number) WHERE room_number IS NOT NULL;

-- ============ MỞ RỘNG BOOKINGS (doanh thu + thanh toán) ============
ALTER TABLE bookings
  ADD COLUMN code text UNIQUE,                               -- mã đặt phòng DP00001
  ADD COLUMN booking_type booking_type NOT NULL DEFAULT 'daily',
  ADD COLUMN adults int NOT NULL DEFAULT 1,
  ADD COLUMN children int NOT NULL DEFAULT 0,
  ADD COLUMN guest_id_number text,                           -- CCCD/CMND
  ADD COLUMN guest_email text,
  ADD COLUMN nights int NOT NULL DEFAULT 0,
  ADD COLUMN hours numeric(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN unit_price numeric(12, 0) NOT NULL DEFAULT 0,   -- giá ngày/giờ áp dụng
  ADD COLUMN room_charge numeric(12, 0) NOT NULL DEFAULT 0,  -- = nights*unit hoặc hours*unit
  ADD COLUMN service_charge numeric(12, 0) NOT NULL DEFAULT 0,
  ADD COLUMN discount_amount numeric(12, 0) NOT NULL DEFAULT 0,
  ADD COLUMN vat_rate numeric(5, 2) NOT NULL DEFAULT 0,      -- % VAT áp dụng (snapshot lúc tạo)
  ADD COLUMN vat_amount numeric(12, 0) NOT NULL DEFAULT 0,
  ADD COLUMN total_amount numeric(12, 0) NOT NULL DEFAULT 0, -- tổng cuối
  ADD COLUMN deposit_amount numeric(12, 0) NOT NULL DEFAULT 0,
  ADD COLUMN paid_amount numeric(12, 0) NOT NULL DEFAULT 0,
  ADD COLUMN balance_due numeric(12, 0) NOT NULL DEFAULT 0,
  ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'unpaid';

CREATE INDEX idx_bookings_status_checkin ON bookings (status, checkin_at);
CREATE INDEX idx_bookings_code ON bookings (code);

-- Sequence cho mã booking
CREATE SEQUENCE IF NOT EXISTS seq_booking_code START 1;

CREATE OR REPLACE FUNCTION fn_generate_booking_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'DP' || LPAD(nextval('seq_booking_code')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_code BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_generate_booking_code();

-- ============ PAYMENTS ============
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount numeric(12, 0) NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  type payment_type NOT NULL DEFAULT 'balance',
  note text,
  received_by uuid REFERENCES app_users(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_received_at ON payments (received_at);

-- Tự cập nhật paid_amount/balance_due/payment_status khi payment thay đổi
CREATE OR REPLACE FUNCTION fn_recalc_booking_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_id uuid;
  v_paid numeric(12, 0);
  v_total numeric(12, 0);
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT COALESCE(SUM(
    CASE WHEN type = 'refund' THEN -amount ELSE amount END
  ), 0)
  INTO v_paid
  FROM payments
  WHERE booking_id = v_booking_id;

  SELECT total_amount INTO v_total FROM bookings WHERE id = v_booking_id;

  UPDATE bookings
  SET paid_amount = v_paid,
      balance_due = GREATEST(0, COALESCE(v_total, 0) - v_paid),
      payment_status = CASE
        WHEN v_paid <= 0 THEN 'unpaid'::payment_status
        WHEN v_paid < COALESCE(v_total, 0) THEN 'partial'::payment_status
        WHEN v_paid >= COALESCE(v_total, 0) AND COALESCE(v_total, 0) > 0 THEN 'paid'::payment_status
        ELSE payment_status
      END
  WHERE id = v_booking_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION fn_recalc_booking_payment();

-- Tự recalc khi total_amount của booking đổi
CREATE OR REPLACE FUNCTION fn_recalc_on_booking_total()
RETURNS TRIGGER AS $$
DECLARE
  v_paid numeric(12, 0);
BEGIN
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    SELECT COALESCE(SUM(CASE WHEN type = 'refund' THEN -amount ELSE amount END), 0)
    INTO v_paid
    FROM payments WHERE booking_id = NEW.id;

    NEW.paid_amount := v_paid;
    NEW.balance_due := GREATEST(0, NEW.total_amount - v_paid);
    NEW.payment_status := CASE
      WHEN v_paid <= 0 THEN 'unpaid'::payment_status
      WHEN v_paid < NEW.total_amount THEN 'partial'::payment_status
      WHEN v_paid >= NEW.total_amount AND NEW.total_amount > 0 THEN 'paid'::payment_status
      ELSE NEW.payment_status
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_total_recalc BEFORE UPDATE OF total_amount ON bookings
FOR EACH ROW EXECUTE FUNCTION fn_recalc_on_booking_total();

-- ============ INVOICES ============
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid REFERENCES app_users(id),
  subtotal numeric(12, 0) NOT NULL,
  service_charge numeric(12, 0) NOT NULL DEFAULT 0,
  discount_amount numeric(12, 0) NOT NULL DEFAULT 0,
  vat_rate numeric(5, 2) NOT NULL DEFAULT 0,
  vat_amount numeric(12, 0) NOT NULL DEFAULT 0,
  total_amount numeric(12, 0) NOT NULL,
  lines_json jsonb NOT NULL DEFAULT '[]'::jsonb,    -- snapshot items
  customer_json jsonb NOT NULL DEFAULT '{}'::jsonb, -- snapshot khách
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_booking ON invoices (booking_id);
CREATE SEQUENCE IF NOT EXISTS seq_invoice_number START 1;

-- ============ SYSTEM SETTINGS ============
CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  hotel_name text NOT NULL DEFAULT 'Hưng Phước Hotel',
  hotel_address text,
  hotel_phone text,
  hotel_email text,
  tax_code text,
  vat_enabled boolean NOT NULL DEFAULT false,
  vat_rate numeric(5, 2) NOT NULL DEFAULT 10.00,
  service_charge_enabled boolean NOT NULL DEFAULT false,
  service_charge_rate numeric(5, 2) NOT NULL DEFAULT 5.00,
  extra_fees_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- standard check-in/out time, policy nghỉ đêm
  default_checkin_time time NOT NULL DEFAULT '14:00',
  default_checkout_time time NOT NULL DEFAULT '12:00',
  overnight_hour_start int NOT NULL DEFAULT 22,
  overnight_hour_end int NOT NULL DEFAULT 6,
  currency text NOT NULL DEFAULT 'VND',
  invoice_prefix text NOT NULL DEFAULT 'HD',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_system_settings_updated BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============ VIEWS cho analytics ============
CREATE OR REPLACE VIEW v_room_effective_price AS
SELECT
  r.id AS room_id,
  r.property_id,
  r.name AS room_name,
  r.room_number,
  r.floor,
  r.room_type_id,
  rt.name AS room_type_name,
  rt.code AS room_type_code,
  COALESCE(r.price_per_day, rt.price_per_day, 0) AS effective_price_per_day,
  COALESCE(r.price_per_hour, rt.price_per_hour, 0) AS effective_price_per_hour,
  COALESCE(r.price_overnight, rt.price_overnight, 0) AS effective_price_overnight,
  r.status,
  r.business_status
FROM rooms r
LEFT JOIN room_types rt ON rt.id = r.room_type_id;

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT
  DATE(p.received_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS revenue_date,
  b.room_id,
  r.property_id,
  SUM(CASE WHEN p.type = 'refund' THEN -p.amount ELSE p.amount END) AS revenue
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN rooms r ON r.id = b.room_id
GROUP BY 1, 2, 3;
