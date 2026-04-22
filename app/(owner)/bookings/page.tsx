import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { fmtDateTime, fmtVnd } from "@/lib/utils/format";
import { NewBookingForm } from "./_components/new-booking-form";
import { BookingRowActions } from "./_components/booking-row-actions";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const [bookingsRes, roomsRes, settingsRes] = await Promise.all([
    sb
      .from("bookings")
      .select(
        "*, rooms!inner(id, name, room_number, floor, property_id, price_per_day, price_per_hour, price_overnight, room_types(id, code, name, price_per_day, price_per_hour, price_overnight))"
      )
      .eq("rooms.property_id", owner.propertyId)
      .order("checkin_at", { ascending: false })
      .limit(200),
    sb
      .from("rooms")
      .select(
        "id, name, room_number, floor, business_status, price_per_day, price_per_hour, price_overnight, room_types(id, code, name, price_per_day, price_per_hour, price_overnight)"
      )
      .eq("property_id", owner.propertyId)
      .neq("business_status", "inactive")
      .order("floor", { ascending: false })
      .order("room_number"),
    sb
      .from("system_settings")
      .select("vat_enabled, vat_rate, service_charge_enabled, service_charge_rate")
      .eq("property_id", owner.propertyId)
      .maybeSingle(),
  ]);

  const bookings = bookingsRes.data ?? [];
  const rooms = roomsRes.data ?? [];
  const settings = settingsRes.data ?? {
    vat_enabled: false,
    vat_rate: 0,
    service_charge_enabled: false,
    service_charge_rate: 0,
  };

  const summary = {
    total: bookings.length,
    upcoming: bookings.filter((b) => b.status === "upcoming").length,
    inhouse: bookings.filter((b) => b.status === "checked_in").length,
    done: bookings.filter((b) => b.status === "checked_out").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Đặt phòng</h1>
          <p className="text-slate-500 text-sm">
            {summary.total} booking · {summary.upcoming} sắp tới · {summary.inhouse} đang ở ·{" "}
            {summary.done} đã trả
          </p>
        </div>
        <NewBookingForm rooms={rooms as unknown as RoomOption[]} settings={settings} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Mã</th>
                <th className="p-3">Phòng</th>
                <th className="p-3">Khách</th>
                <th className="p-3">Check-in</th>
                <th className="p-3">Check-out</th>
                <th className="p-3">Loại</th>
                <th className="p-3 text-right">Tổng</th>
                <th className="p-3 text-right">Còn lại</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400">
                    Chưa có booking nào. Bấm "Tạo booking mới" để bắt đầu.
                  </td>
                </tr>
              )}
              {bookings.map((b: BookingRow) => (
                <tr key={b.id} className="border-t hover:bg-slate-50/60">
                  <td className="p-3 font-mono text-xs text-slate-700">
                    <Link href={`/bookings/${b.id}`} className="hover:underline text-brand-700">
                      {b.code ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3 font-medium">
                    <div>{b.rooms?.name ?? "—"}</div>
                    {b.rooms?.floor != null && (
                      <div className="text-xs text-slate-500">Lầu {b.rooms.floor}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div>{b.guest_name}</div>
                    <div className="text-xs text-slate-500">{b.guest_phone}</div>
                  </td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">
                    {fmtDateTime(b.checkin_at)}
                  </td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">
                    {fmtDateTime(b.checkout_at)}
                  </td>
                  <td className="p-3">
                    {b.booking_type === "hourly" ? (
                      <span className="badge bg-amber-100 text-amber-800">
                        Giờ · {b.hours ?? 0}h
                      </span>
                    ) : (
                      <span className="badge bg-sky-100 text-sky-800">
                        Ngày · {b.nights ?? 0}đ
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                    {fmtVnd(b.total_amount)}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <span
                      className={
                        (b.balance_due ?? 0) > 0
                          ? "text-red-600 font-semibold"
                          : "text-green-700"
                      }
                    >
                      {fmtVnd(b.balance_due)}
                    </span>
                  </td>
                  <td className="p-3">
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="p-3 text-right">
                    <BookingRowActions booking={b} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export type RoomOption = {
  id: string;
  name: string;
  room_number: string | null;
  floor: number | null;
  business_status: string;
  price_per_day: number | null;
  price_per_hour: number | null;
  price_overnight: number | null;
  room_types: {
    id: string;
    code: string;
    name: string;
    price_per_day: number;
    price_per_hour: number;
    price_overnight: number;
  } | null;
};

type BookingRow = {
  id: string;
  code: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  checkin_at: string;
  checkout_at: string;
  booking_type: "daily" | "hourly";
  nights: number | null;
  hours: number | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance_due: number | null;
  status: "upcoming" | "checked_in" | "checked_out" | "cancelled";
  rooms: {
    id: string;
    name: string;
    room_number: string | null;
    floor: number | null;
  } | null;
};
