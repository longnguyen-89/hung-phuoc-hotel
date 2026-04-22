export type UserRole = "owner" | "manager" | "cleaner";
export type RoomStatus = "available" | "occupied" | "cleaning" | "dirty" | "maintenance";
export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "cancelled";
export type BookingStatus = "upcoming" | "checked_in" | "checked_out" | "cancelled";
export type TaskType = "turnover" | "deep_clean" | "maintenance_clean";
export type TaskPriority = "low" | "normal" | "high" | "critical";
export type DirtyLevel = "light" | "normal" | "heavy";
export type PayrollStatus = "open" | "finalized" | "paid";

export type AppUser = {
  id: string;
  phone: string | null;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Property = {
  id: string;
  owner_id: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  timezone: string;
};

export type StaffProfile = {
  id: string;
  user_id: string;
  property_id: string;
  hourly_rate: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  bank_account: string | null;
  bank_name: string | null;
};

export type Room = {
  id: string;
  property_id: string;
  name: string;
  qr_token: string;
  default_clean_minutes: number;
  status: RoomStatus;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  room_id: string;
  guest_name: string | null;
  guest_phone: string | null;
  checkin_at: string;
  checkout_at: string;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  source: string;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
};

export type CleaningTask = {
  id: string;
  room_id: string;
  booking_id: string | null;
  assigned_to: string | null;
  due_before: string;
  priority: TaskPriority;
  type: TaskType;
  started_at: string | null;
  completed_at: string | null;
  status: TaskStatus;
  checklist_json: Record<string, boolean>;
  dirty_level: DirtyLevel | null;
  cleaner_note: string | null;
  qr_scanned_at: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_valid: boolean | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  photos_json: Array<{ url: string; category: string }>;
  created_at: string;
  updated_at: string;
};

export type WageEntry = {
  id: string;
  task_id: string;
  cleaner_id: string;
  payroll_id: string | null;
  base_hours: number;
  base_rate: number;
  base_amount: number;
  bonus_amount: number;
  bonus_reason: string | null;
  penalty_amount: number;
  penalty_reason: string | null;
  total_amount: number;
  computed_at: string;
};
