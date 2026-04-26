import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  CalendarClock,
  CircleDollarSign,
  Hotel,
  Sparkles,
} from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fmtDateTime, fmtVnd } from "@/lib/utils/format";
import { NewBookingForm } from "../bookings/_components/new-booking-form";
import type { RoomOption } from "../bookings/page";

export const dynamic = "force-dynamic";

type FrontDeskRoom = {
  room_id: string;
  property_id: string;
  room_name: string;
  room_number: string | null;
  floor: number | null;
  legacy_status: string | null;
  occupancy_status: "vacant" | "reserved" | "occupied" | "blocked" | "out_of_order" | null;
  housekeeping_status:
    | "clean"
    | "dirty"
    | "cleaning"
    | "inspected"
    | "inspection_pending"
    | "maintenance"
    | null;
  business_status: "active" | "inactive" | "selling_service" | null;
  room_type_id: string | null;
  room_type_code: string | null;
  room_type_name: string | null;
  effective_price_per_day: number | string | null;
  effective_price_per_hour: number | string | null;
  effective_price_overnight: number | string | null;
  current_reservation_id: string | null;
  current_reservation_room_id: string | null;
  current_reservation_code: string | null;
  current_guest_name: string | null;
  current_checkout_at: string | null;
  current_balance_due: number | string | null;
  next_reservation_id: string | null;
  next_reservation_room_id: string | null;
  next_reservation_code: string | null;
  next_guest_name: string | null;
  next_checkin_at: string | null;
};

type Settings = {
  vat_enabled: boolean | null;
  vat_rate: number | null;
  service_charge_enabled: boolean | null;
  service_charge_rate: number | null;
};

const occupancyMeta = {
  vacant: {
    label: "Trống",
    dot: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-emerald-200 bg-emerald-50/60",
  },
  reserved: {
    label: "Đã giữ",
    dot: "bg-sky-500",
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    card: "border-sky-200 bg-sky-50/70",
  },
  occupied: {
    label: "Đang ở",
    dot: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    card: "border-blue-200 bg-blue-50/70",
  },
  blocked: {
    label: "Khóa bán",
    dot: "bg-slate-500",
    chip: "border-slate-200 bg-slate-100 text-slate-700",
    card: "border-slate-200 bg-slate-50",
  },
  out_of_order: {
    label: "Bảo trì",
    dot: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    card: "border-rose-200 bg-rose-50/70",
  },
} as const;

const housekeepingMeta = {
  clean: { label: "Sạch", chip: "border-emerald-200 bg-white text-emerald-700" },
  inspected: { label: "Đã kiểm", chip: "border-teal-200 bg-teal-50 text-teal-700" },
  dirty: { label: "Dơ", chip: "border-amber-200 bg-amber-50 text-amber-700" },
  cleaning: { label: "Đang dọn", chip: "border-orange-200 bg-orange-50 text-orange-700" },
  inspection_pending: { label: "Chờ kiểm", chip: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  maintenance: { label: "Bảo trì", chip: "border-rose-200 bg-rose-50 text-rose-700" },
} as const;

const statusPriority = ["occupied", "reserved", "out_of_order", "blocked", "vacant"] as const;

export default async function FrontDeskPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();

  const [{ data: rooms, error: roomsError }, { data: bookingRooms }, { data: settings }] =
    await Promise.all([
      sb
        .from("v_front_desk_rooms")
        .select("*")
        .eq("property_id", owner.propertyId)
        .order("floor", { ascending: false })
        .order("room_number", { ascending: true }),
      sb
        .from("rooms")
        .select(
          "id, name, room_number, floor, business_status, price_per_day, price_per_hour, price_overnight, room_types(id, code, name, price_per_day, price_per_hour, price_overnight)"
        )
        .eq("property_id", owner.propertyId)
        .neq("business_status", "inactive")
        .order("floor", { ascending: false })
        .order("room_number", { ascending: true }),
      sb
        .from("system_settings")
        .select("vat_enabled, vat_rate, service_charge_enabled, service_charge_rate")
        .eq("property_id", owner.propertyId)
        .maybeSingle(),
    ]);

  if (roomsError) {
    return (
      <div className="card border-rose-200 bg-rose-50 text-rose-700">
        Không tải được dữ liệu lễ tân: {roomsError.message}
      </div>
    );
  }

  const frontDeskRooms = (rooms ?? []) as FrontDeskRoom[];
  const rentableRooms = frontDeskRooms.filter((room) => room.business_status !== "selling_service");
  const serviceRooms = frontDeskRooms.filter((room) => room.business_status === "selling_service");
  const occupiedRooms = rentableRooms.filter((room) => room.occupancy_status === "occupied");
  const reservedRooms = rentableRooms.filter((room) => room.occupancy_status === "reserved" || room.next_reservation_id);
  const readyRooms = rentableRooms.filter(
    (room) =>
      room.occupancy_status === "vacant" &&
      (room.housekeeping_status === "clean" || room.housekeeping_status === "inspected")
  );
  const actionRooms = rentableRooms.filter((room) => needsAttention(room));
  const balanceDue = occupiedRooms.reduce((sum, room) => sum + moneyNumber(room.current_balance_due), 0);
  const floors = groupByFloor(rentableRooms);
  const serviceFloor = serviceRooms.length > 0 ? groupByFloor(serviceRooms) : [];
  const nextArrivals = rentableRooms.filter((room) => room.next_reservation_id).slice(0, 6);
  const departures = occupiedRooms
    .filter((room) => room.current_checkout_at)
    .sort((a, b) => String(a.current_checkout_at).localeCompare(String(b.current_checkout_at)))
    .slice(0, 6);

  const formSettings: Settings = {
    vat_enabled: settings?.vat_enabled ?? false,
    vat_rate: settings?.vat_rate ?? 0,
    service_charge_enabled: settings?.service_charge_enabled ?? false,
    service_charge_rate: settings?.service_charge_rate ?? 0,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-medium text-brand-700">Front desk</div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Lễ tân</h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi bán phòng, khách đang ở, phòng cần dọn và booking sắp đến trên cùng một màn hình.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NewBookingForm
            rooms={(bookingRooms ?? []) as unknown as RoomOption[]}
            settings={formSettings}
          />
          <Link href="/bookings" className="btn-secondary">
            <CalendarClock className="h-4 w-4" />
            Booking
          </Link>
          <Link href="/rooms-map" className="btn-secondary">
            <BedDouble className="h-4 w-4" />
            Sơ đồ cũ
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Hotel} label="Đang ở" value={`${occupiedRooms.length}/${rentableRooms.length}`} hint="Phòng có khách" />
        <MetricCard icon={CalendarClock} label="Đã giữ / sắp đến" value={reservedRooms.length} hint="Có booking kế tiếp" />
        <MetricCard icon={Sparkles} label="Sẵn sàng bán" value={readyRooms.length} hint="Trống và sạch" />
        <MetricCard icon={AlertTriangle} label="Cần xử lý" value={actionRooms.length} hint="Dơ, đang dọn hoặc bảo trì" tone="warn" />
        <MetricCard icon={CircleDollarSign} label="Công nợ đang ở" value={fmtVnd(balanceDue)} hint="Tổng còn phải thu" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            {statusPriority.map((status) => (
              <LegendItem key={status} dot={occupancyMeta[status].dot} label={occupancyMeta[status].label} />
            ))}
            <LegendItem dot="bg-amber-500" label="Cần dọn / kiểm" />
          </div>

          {floors.map(([floor, floorRooms]) => (
            <section key={floor} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{floorLabel(floor)}</h2>
                  <p className="text-xs text-slate-500">
                    {floorRooms.length} phòng · {floorRooms.filter((room) => room.occupancy_status === "occupied").length} đang ở ·{" "}
                    {floorRooms.filter((room) => needsAttention(room)).length} cần xử lý
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  Sẵn sàng:{" "}
                  <span className="font-semibold text-emerald-700">
                    {
                      floorRooms.filter(
                        (room) =>
                          room.occupancy_status === "vacant" &&
                          (room.housekeeping_status === "clean" || room.housekeeping_status === "inspected")
                      ).length
                    }
                  </span>
                </div>
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {floorRooms.map((room) => (
                  <RoomCard key={room.room_id} room={room} />
                ))}
              </div>
            </section>
          ))}

          {serviceFloor.map(([floor, floorRooms]) => (
            <section key={`service-${floor}`} className="rounded-lg border border-slate-200 bg-slate-50">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-slate-900">{floorLabel(floor)} · Bán dịch vụ</h2>
                <p className="text-xs text-slate-500">Các mã phòng dùng để ghi nhận dịch vụ, không tính vào công suất phòng.</p>
              </div>
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {floorRooms.map((room) => (
                  <RoomCard key={room.room_id} room={room} muted />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <SidePanel title="Trả phòng gần nhất" empty="Chưa có phòng đang ở có giờ trả.">
            {departures.map((room) => (
              <TimelineRow
                key={`departure-${room.room_id}`}
                title={`Phòng ${displayRoomNumber(room)}`}
                subtitle={room.current_guest_name ?? "Khách đang ở"}
                time={fmtDateTime(room.current_checkout_at)}
                tone={moneyNumber(room.current_balance_due) > 0 ? "warn" : "default"}
              />
            ))}
          </SidePanel>

          <SidePanel title="Booking sắp đến" empty="Chưa có booking kế tiếp.">
            {nextArrivals.map((room) => (
              <TimelineRow
                key={`arrival-${room.room_id}`}
                title={`Phòng ${displayRoomNumber(room)}`}
                subtitle={room.next_guest_name ?? room.next_reservation_code ?? "Khách sắp đến"}
                time={fmtDateTime(room.next_checkin_at)}
              />
            ))}
          </SidePanel>

          <div className="rounded-lg border border-lime-200 bg-lime-50 p-4">
            <h2 className="text-sm font-semibold text-lime-900">Gợi ý vận hành</h2>
            <p className="mt-2 text-sm leading-6 text-lime-900/80">
              Màn hình này là nền cho thao tác kéo thả đổi phòng, nhận phòng nhanh, trả phòng nhanh và ghi minibar ở các bước sau.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RoomCard({ room, muted = false }: { room: FrontDeskRoom; muted?: boolean }) {
  const occupancy = occupancyMeta[room.occupancy_status ?? "vacant"];
  const housekeeping = housekeepingMeta[room.housekeeping_status ?? "clean"];
  const attention = needsAttention(room);

  return (
    <article className={`min-h-[230px] rounded-lg border p-3 shadow-sm ${muted ? "border-slate-200 bg-white" : occupancy.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Phòng</div>
          <div className="text-2xl font-semibold leading-tight text-slate-950">{displayRoomNumber(room)}</div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${occupancy.chip}`}>{occupancy.label}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${housekeeping.chip}`}>{housekeeping.label}</span>
        {attention ? (
          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-xs font-medium text-amber-700">
            Cần xử lý
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <InfoLine label="Hạng" value={room.room_type_name ?? room.room_type_code ?? "Chưa gán"} />
        {room.current_reservation_id ? (
          <>
            <InfoLine label="Khách" value={room.current_guest_name ?? "Khách đang ở"} strong />
            <InfoLine label="Trả" value={fmtDateTime(room.current_checkout_at)} />
            <InfoLine
              label="Còn thu"
              value={fmtVnd(room.current_balance_due)}
              valueClass={moneyNumber(room.current_balance_due) > 0 ? "text-rose-700" : "text-emerald-700"}
            />
          </>
        ) : room.next_reservation_id ? (
          <>
            <InfoLine label="Sắp đến" value={room.next_guest_name ?? room.next_reservation_code ?? "Booking kế tiếp"} strong />
            <InfoLine label="Nhận" value={fmtDateTime(room.next_checkin_at)} />
          </>
        ) : (
          <>
            <InfoLine label="Ngày" value={fmtVnd(room.effective_price_per_day)} />
            <InfoLine label="Giờ" value={fmtVnd(room.effective_price_per_hour)} />
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/70 pt-3 text-xs text-slate-500">
        <span>{room.current_reservation_code ?? room.next_reservation_code ?? "Chưa có booking"}</span>
        <Link href="/bookings" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800">
          Xem
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Hotel;
  label: string;
  value: string | number;
  hint: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
        </div>
        <div className={`rounded-md p-2 ${tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-lime-50 text-brand-700"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function SidePanel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-2 p-3">{hasChildren ? children : <div className="text-sm text-slate-500">{empty}</div>}</div>
    </section>
  );
}

function TimelineRow({
  title,
  subtitle,
  time,
  tone = "default",
}: {
  title: string;
  subtitle: string;
  time: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className={`shrink-0 text-xs font-medium ${tone === "warn" ? "text-rose-700" : "text-slate-600"}`}>{time}</div>
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  strong = false,
  valueClass = "text-slate-700",
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-sm ${strong ? "font-semibold" : "font-medium"} ${valueClass}`}>{value}</span>
    </div>
  );
}

function LegendItem({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function groupByFloor(rooms: FrontDeskRoom[]) {
  const grouped = new Map<string, FrontDeskRoom[]>();

  rooms.forEach((room) => {
    const key = room.floor == null ? "Khác" : String(room.floor);
    grouped.set(key, [...(grouped.get(key) ?? []), room]);
  });

  return Array.from(grouped.entries()).sort(([a], [b]) => floorSortValue(b) - floorSortValue(a));
}

function floorSortValue(floor: string) {
  const parsed = Number(floor);
  return Number.isFinite(parsed) ? parsed : -1;
}

function floorLabel(floor: string) {
  if (floor === "1") return "Lầu 1";
  if (floor === "Khác") return "Khu khác";
  return `Lầu ${floor}`;
}

function displayRoomNumber(room: FrontDeskRoom) {
  return room.room_number ?? room.room_name;
}

function needsAttention(room: FrontDeskRoom) {
  return (
    room.occupancy_status === "blocked" ||
    room.occupancy_status === "out_of_order" ||
    room.housekeeping_status === "dirty" ||
    room.housekeeping_status === "cleaning" ||
    room.housekeeping_status === "inspection_pending" ||
    room.housekeeping_status === "maintenance"
  );
}

function moneyNumber(value: number | string | null | undefined) {
  if (value == null) return 0;
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}
