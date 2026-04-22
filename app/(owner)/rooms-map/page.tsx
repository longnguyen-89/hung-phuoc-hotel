import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtVnd, fmtDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const statusBg: Record<string, string> = {
  available: "bg-emerald-100 border-emerald-300 hover:bg-emerald-200",
  occupied: "bg-blue-100 border-blue-300 hover:bg-blue-200",
  cleaning: "bg-yellow-100 border-yellow-300 hover:bg-yellow-200",
  dirty: "bg-red-100 border-red-300 hover:bg-red-200",
  maintenance: "bg-slate-100 border-slate-300 hover:bg-slate-200",
};
const statusText: Record<string, string> = {
  available: "text-emerald-800",
  occupied: "text-blue-800",
  cleaning: "text-yellow-800",
  dirty: "text-red-800",
  maintenance: "text-slate-700",
};
const statusLabels: Record<string, string> = {
  available: "Trống",
  occupied: "Có khách",
  cleaning: "Đang dọn",
  dirty: "Cần dọn",
  maintenance: "Bảo trì",
};

export default async function RoomsMapPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const [roomsRes, bookingsRes] = await Promise.all([
    sb
      .from("rooms")
      .select(
        "*, room_types(name, code, price_per_day, price_per_hour)"
      )
      .eq("property_id", owner.propertyId)
      .order("floor", { ascending: false })
      .order("room_number"),
    sb
      .from("bookings")
      .select("id, room_id, guest_name, code, checkin_at, checkout_at, status, balance_due")
      .in("status", ["upcoming", "checked_in"])
      .order("checkin_at"),
  ]);

  const rooms = roomsRes.data ?? [];
  const bookings = bookingsRes.data ?? [];

  const byFloor = groupByFloor(rooms);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sơ đồ phòng</h1>
        <p className="text-slate-500 text-sm">
          {rooms.length} phòng · {rooms.filter((r) => r.status === "occupied").length} có khách ·{" "}
          {rooms.filter((r) => r.status === "available").length} trống
        </p>
      </div>

      <div className="card p-3 flex flex-wrap gap-3 text-xs">
        {Object.keys(statusLabels).map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-4 h-4 rounded border ${statusBg[s]}`} />
            <span className="text-slate-700">{statusLabels[s]}</span>
          </div>
        ))}
      </div>

      {byFloor.map(({ floor, rooms: floorRooms }) => (
        <section key={String(floor)} className="card p-4">
          <h2 className="font-semibold mb-3">
            {floor === 1 ? "Lầu 1 — Bán dịch vụ" : `Lầu ${floor}`}{" "}
            <span className="text-slate-400 text-sm font-normal">
              ({floorRooms.length} phòng)
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {floorRooms.map((r) => {
              const activeBooking = bookings.find((b) => b.room_id === r.id);
              const bgClass = statusBg[r.status] ?? "bg-slate-100 border-slate-300";
              const tx = statusText[r.status] ?? "text-slate-700";
              return (
                <div
                  key={r.id}
                  className={`border-2 rounded-lg p-3 text-sm ${bgClass} transition`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-bold text-lg text-slate-800">
                      {r.room_number ?? r.name}
                    </div>
                    <span className={`text-xs font-medium ${tx}`}>
                      {statusLabels[r.status]}
                    </span>
                  </div>
                  {r.room_types?.name && (
                    <div className="text-xs text-slate-600 truncate">
                      {r.room_types.name}
                    </div>
                  )}
                  {r.business_status !== "selling_service" && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {fmtVnd(r.price_per_day ?? r.room_types?.price_per_day ?? 0)}/ngày
                    </div>
                  )}
                  {activeBooking && (
                    <Link
                      href={`/bookings/${activeBooking.id}`}
                      className="mt-2 pt-2 border-t border-slate-400/30 block text-xs hover:underline"
                    >
                      <div className="font-semibold text-slate-800 truncate">
                        {activeBooking.guest_name}
                      </div>
                      <div className="text-slate-600">
                        → {fmtDateTime(activeBooking.checkout_at)}
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

type RoomWithType = {
  id: string;
  name: string;
  room_number: string | null;
  floor: number | null;
  status: string;
  business_status: string;
  price_per_day: number | null;
  price_per_hour: number | null;
  room_types: {
    name: string;
    code: string;
    price_per_day: number;
    price_per_hour: number;
  } | null;
};

function groupByFloor(rooms: RoomWithType[]) {
  const groups = new Map<number, RoomWithType[]>();
  for (const r of rooms) {
    const f = r.floor ?? 0;
    const arr = groups.get(f) ?? [];
    arr.push(r);
    groups.set(f, arr);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([floor, rooms]) => ({ floor, rooms }));
}
