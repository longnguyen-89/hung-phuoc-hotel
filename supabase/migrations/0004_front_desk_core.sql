-- =====================================================================
-- Hưng Phước Hotel — Front Desk core schema
-- =====================================================================
-- Phase 1 for rebuilding the product around KiotViet-style hotel logic:
-- - Split room state into occupancy + housekeeping + business status.
-- - Add reservation/reservation room/stay guest models for single + group stays.
-- - Add folio/folio lines so money is no longer trapped directly on bookings.
-- - Add products, minibar standards, inventory movement, and checkout inspection.
-- - Mirror legacy bookings/payments into the new model while existing UI remains live.
-- =====================================================================

-- ============ ENUMS ============
CREATE TYPE room_occupancy_status AS ENUM (
  'vacant',
  'reserved',
  'occupied',
  'blocked',
  'out_of_order'
);

CREATE TYPE room_housekeeping_status AS ENUM (
  'clean',
  'dirty',
  'cleaning',
  'inspection_pending',
  'inspected',
  'maintenance'
);

CREATE TYPE reservation_status AS ENUM (
  'pending_confirmation',
  'reserved',
  'checked_in',
  'partial_checked_out',
  'checked_out',
  'cancelled',
  'no_show'
);

CREATE TYPE reservation_room_status AS ENUM (
  'reserved',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show'
);

CREATE TYPE stay_type AS ENUM (
  'hourly',
  'daily',
  'overnight',
  'session',
  'monthly'
);

CREATE TYPE product_kind AS ENUM (
  'stock',
  'service',
  'surcharge'
);

CREATE TYPE inventory_movement_type AS ENUM (
  'initial',
  'import',
  'consume',
  'adjustment',
  'damage',
  'waste',
  'return'
);

CREATE TYPE folio_status AS ENUM (
  'open',
  'partially_paid',
  'paid',
  'void',
  'refunded'
);

CREATE TYPE folio_line_type AS ENUM (
  'room_charge',
  'service',
  'minibar',
  'surcharge',
  'discount',
  'service_charge',
  'vat',
  'damage',
  'adjustment'
);

CREATE TYPE inspection_status AS ENUM (
  'requested',
  'in_progress',
  'completed',
  'confirmed',
  'cancelled'
);

-- ============ ROOM STATE SPLIT ============
ALTER TABLE rooms
  ADD COLUMN occupancy_status room_occupancy_status NOT NULL DEFAULT 'vacant',
  ADD COLUMN housekeeping_status room_housekeeping_status NOT NULL DEFAULT 'clean';

UPDATE rooms
SET
  occupancy_status = CASE
    WHEN status::text = 'occupied' THEN 'occupied'::room_occupancy_status
    WHEN status::text = 'maintenance' THEN 'out_of_order'::room_occupancy_status
    ELSE 'vacant'::room_occupancy_status
  END,
  housekeeping_status = CASE
    WHEN status::text = 'dirty' THEN 'dirty'::room_housekeeping_status
    WHEN status::text = 'cleaning' THEN 'cleaning'::room_housekeeping_status
    WHEN status::text = 'maintenance' THEN 'maintenance'::room_housekeeping_status
    ELSE 'clean'::room_housekeeping_status
  END;

CREATE INDEX idx_rooms_front_desk_state
  ON rooms (property_id, occupancy_status, housekeeping_status);

-- ============ PRODUCTS + MINIBAR ============
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  kind product_kind NOT NULL DEFAULT 'stock',
  category text,
  unit text NOT NULL DEFAULT 'cái',
  default_price numeric(12, 0) NOT NULL DEFAULT 0,
  cost_price numeric(12, 0) NOT NULL DEFAULT 0,
  track_inventory boolean NOT NULL DEFAULT false,
  stock_quantity numeric(12, 2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, sku)
);

CREATE INDEX idx_products_property_active ON products (property_id, is_active);

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE room_type_minibar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  default_quantity numeric(12, 2) NOT NULL DEFAULT 0,
  sale_price numeric(12, 0) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_type_id, product_id)
);

CREATE INDEX idx_minibar_items_room_type ON room_type_minibar_items (room_type_id);

CREATE TRIGGER trg_room_type_minibar_updated BEFORE UPDATE ON room_type_minibar_items
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============ RESERVATIONS ============
CREATE SEQUENCE IF NOT EXISTS seq_reservation_code START 1;

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  legacy_booking_id uuid UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
  code text UNIQUE,
  status reservation_status NOT NULL DEFAULT 'reserved',
  source text NOT NULL DEFAULT 'direct',
  primary_guest_name text,
  primary_guest_phone text,
  primary_guest_email text,
  primary_guest_id_number text,
  checkin_at timestamptz NOT NULL,
  checkout_at timestamptz NOT NULL,
  adults int NOT NULL DEFAULT 1,
  children int NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_property_status
  ON reservations (property_id, status, checkin_at);
CREATE INDEX idx_reservations_property_dates
  ON reservations (property_id, checkin_at, checkout_at);

CREATE OR REPLACE FUNCTION fn_generate_reservation_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'RS' || LPAD(nextval('seq_reservation_code')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservation_code BEFORE INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION fn_generate_reservation_code();

CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE reservation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  legacy_booking_id uuid UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
  stay_type stay_type NOT NULL DEFAULT 'daily',
  status reservation_room_status NOT NULL DEFAULT 'reserved',
  checkin_at timestamptz NOT NULL,
  checkout_at timestamptz NOT NULL,
  actual_checkin_at timestamptz,
  actual_checkout_at timestamptz,
  adults int NOT NULL DEFAULT 1,
  children int NOT NULL DEFAULT 0,
  unit_price numeric(12, 0) NOT NULL DEFAULT 0,
  nights int NOT NULL DEFAULT 0,
  hours numeric(5, 2) NOT NULL DEFAULT 0,
  pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_rooms_reservation ON reservation_rooms (reservation_id);
CREATE INDEX idx_reservation_rooms_room_dates
  ON reservation_rooms (room_id, checkin_at, checkout_at);
CREATE INDEX idx_reservation_rooms_status
  ON reservation_rooms (status, checkin_at);

CREATE TRIGGER trg_reservation_rooms_updated BEFORE UPDATE ON reservation_rooms
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE stay_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  reservation_room_id uuid REFERENCES reservation_rooms(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  id_type text,
  id_number text,
  date_of_birth date,
  nationality text,
  address text,
  document_front_url text,
  document_back_url text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stay_guests_reservation ON stay_guests (reservation_id);
CREATE INDEX idx_stay_guests_id_number ON stay_guests (id_number);

CREATE TRIGGER trg_stay_guests_updated BEFORE UPDATE ON stay_guests
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============ FOLIOS ============
CREATE SEQUENCE IF NOT EXISTS seq_folio_number START 1;

CREATE TABLE folios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  reservation_room_id uuid REFERENCES reservation_rooms(id) ON DELETE SET NULL,
  legacy_booking_id uuid UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
  folio_number text UNIQUE,
  status folio_status NOT NULL DEFAULT 'open',
  payer_name text,
  payer_phone text,
  payer_email text,
  customer_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  subtotal numeric(12, 0) NOT NULL DEFAULT 0,
  discount_amount numeric(12, 0) NOT NULL DEFAULT 0,
  service_charge numeric(12, 0) NOT NULL DEFAULT 0,
  vat_amount numeric(12, 0) NOT NULL DEFAULT 0,
  total_amount numeric(12, 0) NOT NULL DEFAULT 0,
  paid_amount numeric(12, 0) NOT NULL DEFAULT 0,
  balance_due numeric(12, 0) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_folios_property_status ON folios (property_id, status);
CREATE INDEX idx_folios_reservation ON folios (reservation_id);

CREATE OR REPLACE FUNCTION fn_generate_folio_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio_number IS NULL THEN
    NEW.folio_number := 'FO' || LPAD(nextval('seq_folio_number')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_folio_number BEFORE INSERT ON folios
  FOR EACH ROW EXECUTE FUNCTION fn_generate_folio_number();

CREATE TRIGGER trg_folios_updated BEFORE UPDATE ON folios
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE folio_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id uuid NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  reservation_room_id uuid REFERENCES reservation_rooms(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  line_type folio_line_type NOT NULL,
  source_key text,
  description text NOT NULL,
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  unit_price numeric(12, 0) NOT NULL DEFAULT 0,
  discount_amount numeric(12, 0) NOT NULL DEFAULT 0,
  vat_rate numeric(5, 2) NOT NULL DEFAULT 0,
  amount numeric(12, 0) NOT NULL DEFAULT 0,
  posted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folio_id, source_key)
);

CREATE INDEX idx_folio_lines_folio ON folio_lines (folio_id);
CREATE INDEX idx_folio_lines_product ON folio_lines (product_id);

CREATE TABLE folio_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id uuid NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  legacy_payment_id uuid UNIQUE REFERENCES payments(id) ON DELETE SET NULL,
  amount numeric(12, 0) NOT NULL,
  method payment_method NOT NULL DEFAULT 'cash',
  type payment_type NOT NULL DEFAULT 'balance',
  note text,
  received_by uuid REFERENCES app_users(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_folio_payments_folio ON folio_payments (folio_id);
CREATE INDEX idx_folio_payments_received_at ON folio_payments (received_at);

CREATE OR REPLACE FUNCTION fn_recalc_folio_totals(p_folio_id uuid)
RETURNS void AS $$
DECLARE
  v_subtotal numeric(12, 0);
  v_discount numeric(12, 0);
  v_service_charge numeric(12, 0);
  v_vat numeric(12, 0);
  v_total numeric(12, 0);
  v_paid numeric(12, 0);
BEGIN
  SELECT
    COALESCE(SUM(CASE
      WHEN line_type IN ('room_charge', 'service', 'minibar', 'surcharge', 'damage', 'adjustment')
      THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN line_type = 'discount' THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN line_type = 'service_charge' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN line_type = 'vat' THEN amount ELSE 0 END), 0),
    GREATEST(0, COALESCE(SUM(amount), 0))
  INTO v_subtotal, v_discount, v_service_charge, v_vat, v_total
  FROM folio_lines
  WHERE folio_id = p_folio_id;

  SELECT COALESCE(SUM(CASE WHEN type = 'refund' THEN -amount ELSE amount END), 0)
  INTO v_paid
  FROM folio_payments
  WHERE folio_id = p_folio_id;

  UPDATE folios
  SET subtotal = v_subtotal,
      discount_amount = v_discount,
      service_charge = v_service_charge,
      vat_amount = v_vat,
      total_amount = v_total,
      paid_amount = v_paid,
      balance_due = GREATEST(0, v_total - v_paid),
      status = CASE
        WHEN folios.status = 'void' THEN 'void'::folio_status
        WHEN v_paid < 0 THEN 'refunded'::folio_status
        WHEN v_paid <= 0 THEN 'open'::folio_status
        WHEN v_paid < v_total THEN 'partially_paid'::folio_status
        WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'::folio_status
        ELSE folios.status
      END
  WHERE id = p_folio_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_recalc_folio_after_line_change()
RETURNS TRIGGER AS $$
DECLARE
  v_folio_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_folio_id := OLD.folio_id;
  ELSE
    v_folio_id := NEW.folio_id;
  END IF;

  PERFORM fn_recalc_folio_totals(v_folio_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_folio_lines_recalc
AFTER INSERT OR UPDATE OR DELETE ON folio_lines
FOR EACH ROW EXECUTE FUNCTION fn_recalc_folio_after_line_change();

CREATE OR REPLACE FUNCTION fn_recalc_folio_after_payment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_folio_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_folio_id := OLD.folio_id;
  ELSE
    v_folio_id := NEW.folio_id;
  END IF;

  PERFORM fn_recalc_folio_totals(v_folio_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_folio_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON folio_payments
FOR EACH ROW EXECUTE FUNCTION fn_recalc_folio_after_payment_change();

-- ============ INVENTORY + CHECKOUT INSPECTION ============
CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  reservation_room_id uuid REFERENCES reservation_rooms(id) ON DELETE SET NULL,
  folio_line_id uuid REFERENCES folio_lines(id) ON DELETE SET NULL,
  movement_type inventory_movement_type NOT NULL,
  quantity numeric(12, 2) NOT NULL,
  unit_cost numeric(12, 0) NOT NULL DEFAULT 0,
  note text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product ON inventory_movements (product_id, created_at);
CREATE INDEX idx_inventory_movements_property ON inventory_movements (property_id, created_at);

CREATE TABLE room_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  reservation_room_id uuid REFERENCES reservation_rooms(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES app_users(id),
  assigned_to uuid REFERENCES app_users(id),
  status inspection_status NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  confirmed_by uuid REFERENCES app_users(id),
  confirmed_at timestamptz,
  minibar_usage_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  damage_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_inspections_status
  ON room_inspections (property_id, status, requested_at);
CREATE INDEX idx_room_inspections_room
  ON room_inspections (room_id, status);

CREATE TRIGGER trg_room_inspections_updated BEFORE UPDATE ON room_inspections
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============ LEGACY BOOKING/PAYMENT MIRROR ============
CREATE OR REPLACE FUNCTION fn_sync_legacy_booking_to_reservation(p_booking_id uuid)
RETURNS uuid AS $$
DECLARE
  v_booking record;
  v_reservation_id uuid;
  v_reservation_room_id uuid;
  v_folio_id uuid;
  v_reservation_status reservation_status;
  v_room_status reservation_room_status;
  v_stay_type stay_type;
  v_legacy_line_total numeric(12, 0);
  v_total_adjustment numeric(12, 0);
BEGIN
  SELECT b.*, r.property_id, r.name AS room_name
  INTO v_booking
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_reservation_status := CASE v_booking.status::text
    WHEN 'upcoming' THEN 'reserved'::reservation_status
    WHEN 'checked_in' THEN 'checked_in'::reservation_status
    WHEN 'checked_out' THEN 'checked_out'::reservation_status
    WHEN 'cancelled' THEN 'cancelled'::reservation_status
    ELSE 'reserved'::reservation_status
  END;

  v_room_status := CASE v_booking.status::text
    WHEN 'upcoming' THEN 'reserved'::reservation_room_status
    WHEN 'checked_in' THEN 'checked_in'::reservation_room_status
    WHEN 'checked_out' THEN 'checked_out'::reservation_room_status
    WHEN 'cancelled' THEN 'cancelled'::reservation_room_status
    ELSE 'reserved'::reservation_room_status
  END;

  v_stay_type := CASE v_booking.booking_type::text
    WHEN 'hourly' THEN 'hourly'::stay_type
    ELSE 'daily'::stay_type
  END;

  INSERT INTO reservations (
    property_id,
    legacy_booking_id,
    status,
    source,
    primary_guest_name,
    primary_guest_phone,
    primary_guest_email,
    primary_guest_id_number,
    checkin_at,
    checkout_at,
    adults,
    children,
    notes
  )
  VALUES (
    v_booking.property_id,
    v_booking.id,
    v_reservation_status,
    COALESCE(v_booking.source, 'direct'),
    v_booking.guest_name,
    v_booking.guest_phone,
    v_booking.guest_email,
    v_booking.guest_id_number,
    v_booking.checkin_at,
    v_booking.checkout_at,
    COALESCE(v_booking.adults, 1),
    COALESCE(v_booking.children, 0),
    v_booking.notes
  )
  ON CONFLICT (legacy_booking_id) DO UPDATE
  SET status = EXCLUDED.status,
      source = EXCLUDED.source,
      primary_guest_name = EXCLUDED.primary_guest_name,
      primary_guest_phone = EXCLUDED.primary_guest_phone,
      primary_guest_email = EXCLUDED.primary_guest_email,
      primary_guest_id_number = EXCLUDED.primary_guest_id_number,
      checkin_at = EXCLUDED.checkin_at,
      checkout_at = EXCLUDED.checkout_at,
      adults = EXCLUDED.adults,
      children = EXCLUDED.children,
      notes = EXCLUDED.notes
  RETURNING id INTO v_reservation_id;

  INSERT INTO reservation_rooms (
    reservation_id,
    room_id,
    legacy_booking_id,
    stay_type,
    status,
    checkin_at,
    checkout_at,
    actual_checkin_at,
    actual_checkout_at,
    adults,
    children,
    unit_price,
    nights,
    hours,
    pricing_snapshot,
    notes
  )
  VALUES (
    v_reservation_id,
    v_booking.room_id,
    v_booking.id,
    v_stay_type,
    v_room_status,
    v_booking.checkin_at,
    v_booking.checkout_at,
    v_booking.actual_checkin_at,
    v_booking.actual_checkout_at,
    COALESCE(v_booking.adults, 1),
    COALESCE(v_booking.children, 0),
    COALESCE(v_booking.unit_price, 0),
    COALESCE(v_booking.nights, 0),
    COALESCE(v_booking.hours, 0),
    jsonb_build_object(
      'booking_type', v_booking.booking_type,
      'unit_price', COALESCE(v_booking.unit_price, 0),
      'nights', COALESCE(v_booking.nights, 0),
      'hours', COALESCE(v_booking.hours, 0),
      'vat_rate', COALESCE(v_booking.vat_rate, 0)
    ),
    v_booking.notes
  )
  ON CONFLICT (legacy_booking_id) DO UPDATE
  SET reservation_id = EXCLUDED.reservation_id,
      room_id = EXCLUDED.room_id,
      stay_type = EXCLUDED.stay_type,
      status = EXCLUDED.status,
      checkin_at = EXCLUDED.checkin_at,
      checkout_at = EXCLUDED.checkout_at,
      actual_checkin_at = EXCLUDED.actual_checkin_at,
      actual_checkout_at = EXCLUDED.actual_checkout_at,
      adults = EXCLUDED.adults,
      children = EXCLUDED.children,
      unit_price = EXCLUDED.unit_price,
      nights = EXCLUDED.nights,
      hours = EXCLUDED.hours,
      pricing_snapshot = EXCLUDED.pricing_snapshot,
      notes = EXCLUDED.notes
  RETURNING id INTO v_reservation_room_id;

  INSERT INTO folios (
    property_id,
    reservation_id,
    reservation_room_id,
    legacy_booking_id,
    payer_name,
    payer_phone,
    payer_email,
    customer_json
  )
  VALUES (
    v_booking.property_id,
    v_reservation_id,
    v_reservation_room_id,
    v_booking.id,
    v_booking.guest_name,
    v_booking.guest_phone,
    v_booking.guest_email,
    jsonb_build_object(
      'name', v_booking.guest_name,
      'phone', v_booking.guest_phone,
      'email', v_booking.guest_email,
      'id_number', v_booking.guest_id_number
    )
  )
  ON CONFLICT (legacy_booking_id) DO UPDATE
  SET reservation_id = EXCLUDED.reservation_id,
      reservation_room_id = EXCLUDED.reservation_room_id,
      payer_name = EXCLUDED.payer_name,
      payer_phone = EXCLUDED.payer_phone,
      payer_email = EXCLUDED.payer_email,
      customer_json = EXCLUDED.customer_json
  RETURNING id INTO v_folio_id;

  DELETE FROM folio_lines
  WHERE folio_id = v_folio_id
    AND source_key LIKE 'legacy:%';

  IF COALESCE(v_booking.room_charge, 0) <> 0 THEN
    INSERT INTO folio_lines (
      folio_id, reservation_room_id, line_type, source_key, description,
      quantity, unit_price, vat_rate, amount
    )
    VALUES (
      v_folio_id,
      v_reservation_room_id,
      'room_charge',
      'legacy:room_charge',
      'Tiền phòng ' || COALESCE(v_booking.room_name, ''),
      CASE WHEN v_booking.booking_type::text = 'hourly'
        THEN COALESCE(v_booking.hours, 1)
        ELSE COALESCE(v_booking.nights, 1)
      END,
      COALESCE(v_booking.unit_price, 0),
      COALESCE(v_booking.vat_rate, 0),
      COALESCE(v_booking.room_charge, 0)
    );
  END IF;

  IF COALESCE(v_booking.discount_amount, 0) > 0 THEN
    INSERT INTO folio_lines (
      folio_id, reservation_room_id, line_type, source_key, description,
      quantity, unit_price, amount
    )
    VALUES (
      v_folio_id,
      v_reservation_room_id,
      'discount',
      'legacy:discount',
      'Giảm giá',
      1,
      -COALESCE(v_booking.discount_amount, 0),
      -COALESCE(v_booking.discount_amount, 0)
    );
  END IF;

  IF COALESCE(v_booking.service_charge, 0) > 0 THEN
    INSERT INTO folio_lines (
      folio_id, reservation_room_id, line_type, source_key, description,
      quantity, unit_price, amount
    )
    VALUES (
      v_folio_id,
      v_reservation_room_id,
      'service_charge',
      'legacy:service_charge',
      'Phí dịch vụ',
      1,
      COALESCE(v_booking.service_charge, 0),
      COALESCE(v_booking.service_charge, 0)
    );
  END IF;

  IF COALESCE(v_booking.vat_amount, 0) > 0 THEN
    INSERT INTO folio_lines (
      folio_id, reservation_room_id, line_type, source_key, description,
      quantity, unit_price, vat_rate, amount
    )
    VALUES (
      v_folio_id,
      v_reservation_room_id,
      'vat',
      'legacy:vat',
      'VAT',
      1,
      COALESCE(v_booking.vat_amount, 0),
      COALESCE(v_booking.vat_rate, 0),
      COALESCE(v_booking.vat_amount, 0)
    );
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_legacy_line_total
  FROM folio_lines
  WHERE folio_id = v_folio_id
    AND source_key LIKE 'legacy:%';

  v_total_adjustment := COALESCE(v_booking.total_amount, 0) - v_legacy_line_total;

  IF v_total_adjustment <> 0 THEN
    INSERT INTO folio_lines (
      folio_id, reservation_room_id, line_type, source_key, description,
      quantity, unit_price, amount
    )
    VALUES (
      v_folio_id,
      v_reservation_room_id,
      'adjustment',
      'legacy:total_adjustment',
      'Điều chỉnh tổng tiền',
      1,
      v_total_adjustment,
      v_total_adjustment
    );
  END IF;

  DELETE FROM folio_payments
  WHERE folio_id = v_folio_id
    AND legacy_payment_id IS NOT NULL
    AND legacy_payment_id NOT IN (
      SELECT id FROM payments WHERE booking_id = p_booking_id
    );

  INSERT INTO folio_payments (
    folio_id,
    legacy_payment_id,
    amount,
    method,
    type,
    note,
    received_by,
    received_at,
    created_at
  )
  SELECT
    v_folio_id,
    p.id,
    p.amount,
    p.method,
    p.type,
    p.note,
    p.received_by,
    p.received_at,
    p.created_at
  FROM payments p
  WHERE p.booking_id = p_booking_id
  ON CONFLICT (legacy_payment_id) DO UPDATE
  SET folio_id = EXCLUDED.folio_id,
      amount = EXCLUDED.amount,
      method = EXCLUDED.method,
      type = EXCLUDED.type,
      note = EXCLUDED.note,
      received_by = EXCLUDED.received_by,
      received_at = EXCLUDED.received_at;

  PERFORM fn_recalc_folio_totals(v_folio_id);

  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_sync_legacy_booking_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_sync_legacy_booking_to_reservation(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_sync_front_desk_core
AFTER INSERT OR UPDATE OF
  room_id,
  guest_name,
  guest_phone,
  guest_email,
  guest_id_number,
  checkin_at,
  checkout_at,
  actual_checkin_at,
  actual_checkout_at,
  source,
  notes,
  status,
  booking_type,
  adults,
  children,
  unit_price,
  nights,
  hours,
  room_charge,
  discount_amount,
  service_charge,
  vat_rate,
  vat_amount,
  total_amount
ON bookings
FOR EACH ROW EXECUTE FUNCTION fn_sync_legacy_booking_trigger();

CREATE OR REPLACE FUNCTION fn_sync_legacy_payment_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_folio_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT folio_id INTO v_folio_id
    FROM folio_payments
    WHERE legacy_payment_id = OLD.id;

    DELETE FROM folio_payments WHERE legacy_payment_id = OLD.id;

    IF v_folio_id IS NOT NULL THEN
      PERFORM fn_recalc_folio_totals(v_folio_id);
    END IF;

    RETURN OLD;
  END IF;

  PERFORM fn_sync_legacy_booking_to_reservation(NEW.booking_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_sync_front_desk_core
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION fn_sync_legacy_payment_trigger();

-- Backfill existing deployments where 0004 is applied after bookings/payments already exist.
SELECT fn_sync_legacy_booking_to_reservation(id) FROM bookings;

-- ============ FRONT DESK READ MODEL ============
CREATE OR REPLACE VIEW v_front_desk_rooms AS
SELECT
  r.id AS room_id,
  r.property_id,
  r.name AS room_name,
  r.room_number,
  r.floor,
  r.status AS legacy_status,
  r.occupancy_status,
  r.housekeeping_status,
  r.business_status,
  rt.id AS room_type_id,
  rt.code AS room_type_code,
  rt.name AS room_type_name,
  COALESCE(r.price_per_day, rt.price_per_day, 0) AS effective_price_per_day,
  COALESCE(r.price_per_hour, rt.price_per_hour, 0) AS effective_price_per_hour,
  COALESCE(r.price_overnight, rt.price_overnight, 0) AS effective_price_overnight,
  cur.reservation_id AS current_reservation_id,
  cur.reservation_room_id AS current_reservation_room_id,
  cur.reservation_code AS current_reservation_code,
  cur.primary_guest_name AS current_guest_name,
  cur.checkout_at AS current_checkout_at,
  cur.balance_due AS current_balance_due,
  nxt.reservation_id AS next_reservation_id,
  nxt.reservation_room_id AS next_reservation_room_id,
  nxt.reservation_code AS next_reservation_code,
  nxt.primary_guest_name AS next_guest_name,
  nxt.checkin_at AS next_checkin_at
FROM rooms r
LEFT JOIN room_types rt ON rt.id = r.room_type_id
LEFT JOIN LATERAL (
  SELECT
    res.id AS reservation_id,
    rr.id AS reservation_room_id,
    res.code AS reservation_code,
    res.primary_guest_name,
    rr.checkout_at,
    f.balance_due
  FROM reservation_rooms rr
  JOIN reservations res ON res.id = rr.reservation_id
  LEFT JOIN folios f ON f.reservation_room_id = rr.id
  WHERE rr.room_id = r.id
    AND rr.status = 'checked_in'
  ORDER BY COALESCE(rr.actual_checkin_at, rr.checkin_at) DESC
  LIMIT 1
) cur ON true
LEFT JOIN LATERAL (
  SELECT
    res.id AS reservation_id,
    rr.id AS reservation_room_id,
    res.code AS reservation_code,
    res.primary_guest_name,
    rr.checkin_at
  FROM reservation_rooms rr
  JOIN reservations res ON res.id = rr.reservation_id
  WHERE rr.room_id = r.id
    AND rr.status = 'reserved'
    AND rr.checkin_at >= now()
  ORDER BY rr.checkin_at ASC
  LIMIT 1
) nxt ON true;
