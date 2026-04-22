import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtVnd, fmtDate } from "@/lib/utils/format";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

function parseRange(searchParams: { from?: string; to?: string }) {
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 29 * 86400_000);
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date(today);
  defaultTo.setHours(23, 59, 59, 999);

  const from = searchParams.from ? new Date(searchParams.from + "T00:00:00") : defaultFrom;
  const to = searchParams.to ? new Date(searchParams.to + "T23:59:59") : defaultTo;
  return { from, to };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const { from, to } = parseRange(sp);
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400_000));

  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const [bookingsRes, paymentsRes, roomsRes] = await Promise.all([
    sb
      .from("bookings")
      .select(
        "*, rooms!inner(id, name, room_number, floor, property_id, room_types(name, code))"
      )
      .eq("rooms.property_id", owner.propertyId)
      .neq("status", "cancelled")
      .gte("checkin_at", from.toISOString())
      .lte("checkin_at", to.toISOString()),
    sb
      .from("payments")
      .select(
        "*, bookings!inner(code, rooms!inner(name, property_id))"
      )
      .eq("bookings.rooms.property_id", owner.propertyId)
      .gte("received_at", from.toISOString())
      .lte("received_at", to.toISOString()),
    sb
      .from("rooms")
      .select("id, name, room_number")
      .eq("property_id", owner.propertyId)
      .neq("business_status", "selling_service"),
  ]);

  const bookings = bookingsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const rooms = roomsRes.data ?? [];
  const totalRooms = rooms.length;

  // KPIs
  const netRevenue = payments.reduce(
    (s, p) => (p.type === "refund" ? s - Number(p.amount) : s + Number(p.amount)),
    0
  );
  const checkedOut = bookings.filter((b) => b.status === "checked_out");
  const roomNights = checkedOut.reduce((s, b) => s + Number(b.nights ?? 0), 0);
  const roomCharge = checkedOut.reduce((s, b) => s + Number(b.room_charge ?? 0), 0);
  const adr = roomNights > 0 ? roomCharge / roomNights : 0;
  const availableNights = totalRooms * days;
  const occupancy = availableNights > 0 ? (roomNights / availableNights) * 100 : 0;
  const revpar = availableNights > 0 ? roomCharge / availableNights : 0;

  // Top rooms by revenue
  const byRoom = new Map<string, { name: string; nights: number; revenue: number; count: number }>();
  for (const b of checkedOut) {
    const key = b.rooms?.name ?? "—";
    const cur = byRoom.get(key) ?? { name: key, nights: 0, revenue: 0, count: 0 };
    cur.nights += Number(b.nights ?? 0);
    cur.revenue += Number(b.room_charge ?? 0);
    cur.count += 1;
    byRoom.set(key, cur);
  }
  const topRooms = Array.from(byRoom.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Revenue by method
  const byMethod = new Map<string, number>();
  for (const p of payments) {
    if (p.type === "refund") continue;
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount));
  }
  const methodRows = Array.from(byMethod.entries())
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Revenue by booking source
  const bySource = new Map<string, { count: number; revenue: number }>();
  for (const b of bookings) {
    const key = b.source ?? "direct";
    const cur = bySource.get(key) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(b.total_amount ?? 0);
    bySource.set(key, cur);
  }
  const sourceRows = Array.from(bySource.entries())
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // CSV export URLs
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const csvBookings = `/api/reports/bookings.csv?from=${fromStr}&to=${toStr}`;
  const csvPayments = `/api/reports/payments.csv?from=${fromStr}&to=${toStr}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Báo cáo kinh doanh</h1>
          <p className="text-slate-500 text-sm">
            {fmtDate(from.toISOString())} — {fmtDate(to.toISOString())} ({days} ngày)
          </p>
        </div>
        <div className="flex gap-2">
          <a href={csvBookings} className="btn-secondary text-sm">
            <Download className="w-4 h-4" />
            CSV bookings
          </a>
          <a href={csvPayments} className="btn-secondary text-sm">
            <Download className="w-4 h-4" />
            CSV payments
          </a>
        </div>
      </div>

      {/* Date filter */}
      <form className="card p-4 flex gap-3 items-end flex-wrap" method="GET">
        <div>
          <label className="text-xs text-slate-600 block mb-1">Từ ngày</label>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            className="input"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 block mb-1">Đến ngày</label>
          <input type="date" name="to" defaultValue={toStr} className="input" />
        </div>
        <button className="btn-primary">Cập nhật</button>
        <div className="flex gap-2 ml-auto text-sm">
          <Link href={quickLink(7)} className="text-brand-600 hover:underline">
            7 ngày
          </Link>
          <Link href={quickLink(30)} className="text-brand-600 hover:underline">
            30 ngày
          </Link>
          <Link href={quickLink(90)} className="text-brand-600 hover:underline">
            90 ngày
          </Link>
        </div>
      </form>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Doanh thu thuần" value={fmtVnd(netRevenue)} tone="brand" />
        <KpiCard
          label="Phòng-đêm bán"
          value={roomNights.toString()}
          sub={`/ ${availableNights} khả dụng`}
        />
        <KpiCard label="Lấp đầy" value={`${occupancy.toFixed(1)}%`} />
        <KpiCard label="ADR" value={fmtVnd(adr)} />
        <KpiCard label="RevPAR" value={fmtVnd(revpar)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top rooms */}
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Top phòng theo doanh thu</h2>
          {topRooms.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr>
                  <th className="py-2">Phòng</th>
                  <th className="text-right">Số booking</th>
                  <th className="text-right">Đêm</th>
                  <th className="text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {topRooms.map((r) => (
                  <tr key={r.name} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="text-right">{r.count}</td>
                    <td className="text-right">{r.nights}</td>
                    <td className="text-right font-semibold">{fmtVnd(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Payment methods */}
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Thu theo phương thức</h2>
          {methodRows.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có thanh toán.</p>
          ) : (
            <div className="space-y-2">
              {methodRows.map((m) => {
                const pct =
                  netRevenue > 0 ? Math.round((m.amount / netRevenue) * 100) : 0;
                return (
                  <div key={m.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{methodLabel(m.method)}</span>
                      <span className="font-medium">
                        {fmtVnd(m.amount)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Booking source */}
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Theo nguồn đặt</h2>
        {sourceRows.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2">Nguồn</th>
                <th className="text-right">Số booking</th>
                <th className="text-right">Tổng giá trị</th>
              </tr>
            </thead>
            <tbody>
              {sourceRows.map((r) => (
                <tr key={r.source} className="border-b last:border-0">
                  <td className="py-2 capitalize">{r.source}</td>
                  <td className="text-right">{r.count}</td>
                  <td className="text-right font-medium">{fmtVnd(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "brand";
}) {
  const toneClass = tone === "brand" ? "border-brand-200 bg-brand-50" : "";
  return (
    <div className={`card p-4 ${toneClass}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1 text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function methodLabel(m: string): string {
  const map: Record<string, string> = {
    cash: "Tiền mặt",
    bank: "Chuyển khoản",
    card: "Thẻ",
    momo: "Momo",
    zalopay: "ZaloPay",
    vnpay: "VNPay",
    other: "Khác",
  };
  return map[m] ?? m;
}

function quickLink(days: number): string {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to.getTime() - (days - 1) * 86400_000);
  from.setHours(0, 0, 0, 0);
  return `/reports?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
}
