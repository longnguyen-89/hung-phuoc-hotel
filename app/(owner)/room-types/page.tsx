import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtVnd } from "@/lib/utils/format";
import { NewRoomTypeButton } from "./_components/new-room-type-button";
import { RoomTypeRowActions } from "./_components/room-type-row-actions";

export const dynamic = "force-dynamic";

export default async function RoomTypesPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data: types } = await sb
    .from("room_types")
    .select("*, rooms(count)")
    .eq("property_id", owner.propertyId)
    .order("sort_order");

  const list = types ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Hạng phòng</h1>
          <p className="text-slate-500 text-sm">
            {list.length} hạng phòng · quản lý giá ngày/giờ/qua đêm
          </p>
        </div>
        <NewRoomTypeButton />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Mã</th>
              <th className="p-3">Tên hạng phòng</th>
              <th className="p-3 text-center">SL phòng</th>
              <th className="p-3 text-right">Giá giờ</th>
              <th className="p-3 text-right">Giá cả ngày</th>
              <th className="p-3 text-right">Qua đêm</th>
              <th className="p-3 text-center">Sức chứa</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3 font-mono text-xs">{t.code}</td>
                <td className="p-3 font-medium">{t.name}</td>
                <td className="p-3 text-center">
                  {(t.rooms as any)?.[0]?.count ?? 0}
                </td>
                <td className="p-3 text-right">{fmtVnd(t.price_per_hour)}</td>
                <td className="p-3 text-right font-medium">{fmtVnd(t.price_per_day)}</td>
                <td className="p-3 text-right text-slate-500">{fmtVnd(t.price_overnight)}</td>
                <td className="p-3 text-center text-slate-600">
                  {t.capacity}/{t.max_capacity}
                </td>
                <td className="p-3">
                  <span
                    className={
                      "badge " +
                      (t.business_status === "active"
                        ? "bg-green-100 text-green-700"
                        : t.business_status === "selling_service"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200 text-slate-600")
                    }
                  >
                    {t.business_status === "active"
                      ? "Đang kinh doanh"
                      : t.business_status === "selling_service"
                      ? "Bán dịch vụ"
                      : "Ngừng"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <RoomTypeRowActions type={t} />
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  Chưa có hạng phòng nào. Thêm hạng phòng đầu tiên để bắt đầu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
