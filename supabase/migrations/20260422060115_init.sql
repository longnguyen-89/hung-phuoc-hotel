-- Mini CRM Homestay — Initial schema
-- Enums, tables, indexes, triggers

-- ============ EXTENSIONS ============
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ ENUMS ============
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cleaner');
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'cleaning', 'dirty', 'maintenance');
CREATE TYPE task_status AS ENUM ('pending', 'assigned', 'in_progress', 'pending_review', 'approved', 'rejected', 'cancelled');
CREATE TYPE booking_status AS ENUM ('upcoming', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE task_type AS ENUM ('turnover', 'deep_clean', 'maintenance_clean');
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE dirty_level AS ENUM ('light', 'normal', 'heavy');
CREATE TYPE payroll_status AS ENUM ('open', 'finalized', 'paid');

-- ============ USERS ============
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'cleaner',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ PROPERTIES ============
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES app_users(id),
  name text NOT NULL,
  address text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  geofence_radius_m int NOT NULL DEFAULT 50,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ STAFF PROFILES ============
CREATE TABLE staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  hourly_rate numeric(10, 0) NOT NULL DEFAULT 50000,
  weekend_multiplier numeric(3, 2) NOT NULL DEFAULT 1.20,
  holiday_multiplier numeric(3, 2) NOT NULL DEFAULT 1.50,
  bank_account text,
  bank_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ROOMS ============
CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  qr_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  default_clean_minutes int NOT NULL DEFAULT 45,
  status room_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ BOOKINGS ============
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_name text,
  guest_phone text,
  checkin_at timestamptz NOT NULL,
  checkout_at timestamptz NOT NULL,
  actual_checkin_at timestamptz,
  actual_checkout_at timestamptz,
  source text NOT NULL DEFAULT 'direct',
  notes text,
  status booking_status NOT NULL DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ PAYROLLS ============
CREATE TABLE payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES app_users(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount numeric(12, 0) NOT NULL DEFAULT 0,
  status payroll_status NOT NULL DEFAULT 'open',
  pdf_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ CLEANING TASKS ============
CREATE TABLE cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES app_users(id),
  due_before timestamptz NOT NULL,
  priority task_priority NOT NULL DEFAULT 'normal',
  type task_type NOT NULL DEFAULT 'turnover',
  started_at timestamptz,
  completed_at timestamptz,
  status task_status NOT NULL DEFAULT 'pending',
  checklist_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  dirty_level dirty_level,
  cleaner_note text,
  qr_scanned_at timestamptz,
  gps_lat numeric(10, 7),
  gps_lng numeric(10, 7),
  gps_valid boolean,
  reviewed_by uuid REFERENCES app_users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  photos_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ WAGE ENTRIES ============
CREATE TABLE wage_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid UNIQUE NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES app_users(id),
  payroll_id uuid REFERENCES payrolls(id),
  base_hours numeric(5, 2) NOT NULL,
  base_rate numeric(10, 0) NOT NULL,
  base_amount numeric(12, 0) NOT NULL,
  bonus_amount numeric(12, 0) NOT NULL DEFAULT 0,
  bonus_reason text,
  penalty_amount numeric(12, 0) NOT NULL DEFAULT 0,
  penalty_reason text,
  total_amount numeric(12, 0) NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- ============ NOTIFICATIONS ============
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_tasks_status_due ON cleaning_tasks (status, due_before);
CREATE INDEX idx_tasks_assigned ON cleaning_tasks (assigned_to, status);
CREATE INDEX idx_tasks_room ON cleaning_tasks (room_id);
CREATE INDEX idx_bookings_room_checkout ON bookings (room_id, checkout_at);
CREATE INDEX idx_bookings_room_checkin ON bookings (room_id, checkin_at);
CREATE INDEX idx_wage_cleaner_payroll ON wage_entries (cleaner_id, payroll_id);
CREATE INDEX idx_rooms_property ON rooms (property_id);
CREATE INDEX idx_staff_property ON staff_profiles (property_id);

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_rooms_updated BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON cleaning_tasks
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_payrolls_updated BEFORE UPDATE ON payrolls
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============ BR-01: Auto-create task on checkout ============
-- Trigger khi booking có status = checked_out (lúc INSERT hoặc UPDATE)
CREATE OR REPLACE FUNCTION fn_auto_create_cleaning_task()
RETURNS TRIGGER AS $$
DECLARE
  v_checkout timestamptz;
  v_next_checkin timestamptz;
  v_due timestamptz;
  v_gap_hours numeric;
  v_priority task_priority;
  v_should_create boolean := false;
BEGIN
  -- Điều kiện tạo task: chỉ khi booking đang ở trạng thái checked_out
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'checked_out' THEN
      v_should_create := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'checked_out' AND (OLD.status IS DISTINCT FROM 'checked_out') THEN
      v_should_create := true;
    END IF;
  END IF;

  IF NOT v_should_create THEN
    RETURN NEW;
  END IF;

  -- Tránh tạo trùng nếu đã có task cho booking này
  IF EXISTS (SELECT 1 FROM cleaning_tasks WHERE booking_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Xác định thời điểm check-out thực tế
  v_checkout := COALESCE(NEW.actual_checkout_at, NEW.checkout_at);

  -- Tìm booking kế tiếp để lấy due_before
  SELECT checkin_at INTO v_next_checkin
  FROM bookings
  WHERE room_id = NEW.room_id
    AND checkin_at > v_checkout
    AND status != 'cancelled'
    AND id != NEW.id
  ORDER BY checkin_at ASC
  LIMIT 1;

  v_due := COALESCE(v_next_checkin, v_checkout + INTERVAL '4 hours');
  v_gap_hours := EXTRACT(EPOCH FROM (v_due - now())) / 3600.0;

  v_priority := CASE
    WHEN v_gap_hours < 2 THEN 'critical'::task_priority
    WHEN v_gap_hours < 4 THEN 'high'::task_priority
    WHEN v_gap_hours < 8 THEN 'normal'::task_priority
    ELSE 'low'::task_priority
  END;

  INSERT INTO cleaning_tasks (room_id, booking_id, due_before, priority, type, status)
  VALUES (NEW.room_id, NEW.id, v_due, v_priority, 'turnover', 'pending');

  -- Cập nhật trạng thái phòng
  UPDATE rooms SET status = 'dirty' WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_auto_task
AFTER INSERT OR UPDATE OF actual_checkout_at, status ON bookings
FOR EACH ROW
EXECUTE FUNCTION fn_auto_create_cleaning_task();
