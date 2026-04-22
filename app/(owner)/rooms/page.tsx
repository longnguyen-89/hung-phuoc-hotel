import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { RoomStatusBadge } from "@/components/shared/status-badge";
import { fmtVnd } from "@/lib/utils/format";
import { RoomRowActions } from "./_components/room-row-actions";
import { NewRoomButton } from "./_components/new-room-button";
import { QrCell } from "./_components/qr-cell";

export const dynamic = "force-dynamic";

type RoomWithType = {
  id: string;
  name: string;
  room_number: string | null;
  floor: number | null;
  status: string;
  business_status: string;
  default_clean_minutes: number;
  qr_token: string;
  price_per_day: number | null;
  price_per_hour: number | null;
  price_overnight: number | null;
  room_type_id: string | null;
  room_types: {
    id: string;
    code: string;
    name: string;
    price_per_day: number;
    price_per_hour: number;
    price_overnight: number;
  } | null;
};

export default async function RoomsPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const [roomsRes, typesRes] = await Promise.all([
    sb
      .from("rooms")
      .select(
        "id, name, room_number, floor, status, business_status, default_clean_minutes, qr_token, price_per_day, price_per_hour, price_overnight, room_type_id, room_types(id, code, name, price_per_day, price_per_hour, price_overnight)"
      )
      .eq("property_id", owner.propertyId)
      .order("floor", { ascending: false })
      .order("room_number"),
    sb
      .from("room_types")
      .select("id, code, name, price_per_day, price_per_hour, price_overnight")
      .eq("property_id", owner.propertyId)
      .order("sort_order"),
  ]);

  const rooms = (roomsRes.data ?? []) as unknown as RoomWithType[];
  const types = typesRes.data ?? [];

  // Group theo tầng
  const floors: Record<string, RoomWithType[]> = {};
  for (const r of rooms) {
    const key = r.floor != null ? `Tầng ${r.floor}` : "Chưa xác định";
    (floors[key] ??= []).push(r);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Danh sách phòng</h1>
          <p className="text-slate-500 text-sm">{rooms.length} phòng · nhóm theo tầng</p>
        </div>
        <NewRoomButton roomTypes={types} />
      </div>

      {Object.entries(floors).map(([floorLabel, floorRooms]) => (
        <div key={floorLabel} className="space-y-2">
          <h2 className="font-semibold text-slate-700">
            {floorLabel} <span className="text-slate-400 text-sm">({floorRooms.length})</span>
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600 text-xs">
                <tr>
                  <th className="p-3">Số phòng</th>
                  <th className="p-3">Tên phòng</th>
                  <th className="p-3">Hạng</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Giá giờ</th>
                  <th className="p-3 text-right">Giá ngày</th>
                  <th className="p-3 text-right">Qua đêm</th>
                  <th className="p-3">QR</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {floorRooms.map((r) => {
                  const priceDay = r.price_per_day ?? r.room_types?.price_per_day ?? 0;
                  const priceHour = r.price_per_hour ?? r.room_types?.price_per_hour ?? 0;
                  const priceOvernight =
                    r.price_overnight ?? r.room_types?.price_overnight ?? 0;
                  const isOverride = r.price_per_day != null;
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-bold">{r.room_number ?? "—"}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3 text-slate-600">
                        {r.room_types?.name ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3">
                        <RoomStatusBadge status={r.status as "available"} />
                      </td>
                      <td className="p-3 text-right">{fmtVnd(priceHour)}</td>
                      <td className="p-3 text-right font-medium">
                        {fmtVnd(priceDay)}
                        {isOverride && (
                          <span className="ml-1 text-[10px] text-brand-600">(ghi đè)</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-slate-500">{fmtVnd(priceOvernight)}</td>
                      <td className="p-3">
                        <QrCell token={r.qr_token} />
                      </td>
                      <td className="p-3 text-right">
                        <RoomRowActions room={r} roomTypes={types} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
