import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtDateTime, fmtVnd } from "@/lib/utils/format";
import {
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import {
  AlertTriangle,
  BedDouble,
  ClipboardList,
  Wallet,
  TrendingUp,
  Calendar,
  DollarSign,
  Percent,
} from "lucide-react";
import { GanttView } from "./_components/gantt-view";
import { RevenueChart } from "./_components/revenue-chart";
import { OccupancyChart } from "./_components/occupancy-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();

  const today = new Date();
  const startToday = new Date(today);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(today);
  endToday.setHours(23, 59, 59, 999);

  const start30d = new Date(today.getTime() - 30 * 86400_000);
  const start30dMidnight = new Date(start30d);
  start30dMidnight.setHours(0, 0, 0, 0);

  const [roomsRes, tasksRes, bookings30dRes, bookings7dRes, paymentsRes, wagesRes] =
    await Promise.all([
      sb
        .from("rooms")
        .select(
          "*, room_types(name, code)"
        )
        .eq("property_id", owner.propertyId)
        .neq("business_status", "selling_service")
        .order("floor", { ascending: false })
        .order("room_number"),
      sb
        .from("cleaning_tasks")
        .select(
          "*, rooms!inner(name, property_id), assignee:app_users!cleaning_tasks_assigned_to_fkey(full_name)"
        )
        .eq("rooms.property_id", owner.propertyId)
        .in("status", ["pending", "assigned", "in_progress", "pending_review"])
        .order("due_before"),
      sb
        .from("bookings")
        .select("*, rooms!inner(property_id)")
        .eq("rooms.property_id", owner.propertyId)
        .neq("status", "cancelled")
        .gte("checkin_at", start30dMidnight.toISOString()),
      sb
        .from("bookings")
        .select("*, rooms!inner(name, property_id, floor)")
        .eq("rooms.property_id", owner.propertyId)
        .gte("checkout_at", new Date(Date.now() - 3 * 86400_000).toISOString())
        .lte("checkin_at", new Date(Date.now() + 7 * 86400_000).toISOString()),
      sb
        .from("payments")
        .select("amount, type, method, received_at, booking_id, bookings!inner(rooms!inner(property_id))")
        .eq("bookings.rooms.property_id", owner.propertyId)
        .gte("received_at", start30dMidnight.toISOString()),
      sb
        .from("wage_entries")
        .select("total_amount, computed_at")
        .gte("computed_at", start30dMidnight.toISOString()),
    ]);

  const rooms = roomsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const bookings30d = bookings30dRes.data ?? [];
  const bookings7d = bookings7dRes.data ?? [];
  const payments30d = paymentsRes.data ?? [];
  const wages = wagesRes.data ?? [];

  const criticalTasks = tasks.filter((t) => t.priority === "critical");
  const pendingReview = tasks.filter((t) => t.status === "pending_review");

  const totalRooms = rooms.length;
  const occupiedToday = rooms.filter((r) => r.status === "occupied").length;
  const availableToday = rooms.filter((r) => r.status === "available").length;
  const dirtyToday = rooms.filter((r) => r.status === "dirty" || r.status === "cleaning").length;

  const occupancyRate = totalRooms > 0 ? (occupiedToday / totalRooms) * 100 : 0;

  // 30-day KPIs
  const checkedOut30d = bookings30d.filter((b) => b.status === "checked_out");
  const inHouse30d = bookings30d.filter((b) => b.status === "checked_in");
  const revenue30d =
    payments30d.reduce((s, p) => {
      if (p.type === "refund") return s - Number(p.amount);
      return s + Number(p.amount);
    }, 0);

  const roomNights30d = checkedOut30d.reduce((s, b) => s + (b.nights ?? 0), 0);
  const roomCharge30d = checkedOut30d.reduce((s, b) => s + Number(b.room_charge ?? 0), 0);
  const adr = roomNights30d > 0 ? roomCharge30d / roomNights30d : 0;
  const availableRoomNights = totalRooms * 30;
  const revpar = availableRoomNights > 0 ? roomCharge30d / availableRoomNights : 0;

  // Daily revenue for chart (last 14 days)
  const last14Days = buildLast14Days();
  const daily = last14Days.map((d) => {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const sum = payments30d
      .filter((p) => {
        const t = new Date(p.received_at).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      })
      .reduce((s, p) => s + (p.type === "refund" ? -Number(p.amount) : Number(p.amount)), 0);

    const occupied = bookings30d.filter((b) => {
      if (b.status === "cancelled") return false;
      const ci = new Date(b.checkin_at).getTime();
      const co = new Date(b.checkout_at).getTime();
      return ci < dayEnd.getTime() && co > dayStart.getTime();
    }).length;
    const occPct = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0;

    return {
      date: d.toISOString().slice(0, 10),
      revenue: sum,
      occupancy: Math.round(occPct),
    };
  });

  const upcomingCheckIns = bookings7d
    .filter((b) => b.status === "upcoming" && new Date(b.checkin_at) >= startToday)
    .slice(0, 5);
  const pendingCheckOuts = bookings7d
    .filter(
      (b) =>
        b.status === "checked_in" &&
        new Date(b.checkout_at) <= new Date(endToday.getTime() + 86400_000)
    )
    .slice(0, 5);

  const wageThisMonth = wages.reduce((s, w) => s + Number(w.total_amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan khách sạn</h1>
        <p className="text-slate-500 text-sm">
          Cập nhật lúc {fmtDateTime(new Date().toISOString())}
        </p>
      </div>

      {criticalTasks.length > 0 && (
        <div className="pulse-red rounded-lg border border-red-300 p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-700 shrink-0" />
          <div>
            <div className="font-semibold text-red-900">
              ⚠️ {criticalTasks.length} phòng deadline gấp (&lt; 2h)
            </div>
            <ul className="mt-1 text-sm text-red-800">
              {criticalTasks.map((t: any) => (
                <li key={t.id}>
                  • {t.rooms.name} — {fmtDateTime(t.due_before)}
                  {!t.assigned_to && " — CHƯA ASSIGN"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Hotel KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Percent className="w-5 h-5 text-brand-600" />}
          label="Lấp đầy hôm nay"
          value={`${occupancyRate.toFixed(0)}%`}
          sub={`${occupiedToday}/${totalRooms} phòng có khách`}
          tone="brand"
        />
        <KpiCard
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          label="Doanh thu 30 ngày"
          value={fmtVnd(revenue30d)}
          sub={`${checkedOut30d.length} booking đã trả`}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-sky-600" />}
          label="ADR"
          value={fmtVnd(adr)}
          sub={`${roomNights30d} đêm bán`}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          label="RevPAR"
          value={fmtVnd(revpar)}
          sub="DT / phòng-ngày khả dụng"
        />
      </div>

      {/* Ops KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<BedDouble className="w-5 h-5" />}
          label="Phòng sẵn sàng"
          value={`${availableToday}`}
          sub={`${dirtyToday} đang dọn / bẩn`}
        />
        <KpiCard
          icon={<Calendar className="w-5 h-5" />}
          label="Khách đang ở"
          value={inHouse30d.length.toString()}
          sub={`${upcomingCheckIns.length} check-in hôm nay+`}
        />
        <KpiCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="Task mở"
          value={tasks.length.toString()}
          sub={`${pendingReview.length} chờ duyệt`}
          tone={criticalTasks.length > 0 ? "red" : undefined}
        />
        <KpiCard
          icon={<Wallet className="w-5 h-5" />}
          label="Lương 30 ngày"
          value={fmtVnd(wageThisMonth)}
          sub={`${wages.length} task`}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Doanh thu 14 ngày</h2>
          <RevenueChart data={daily} />
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Tỷ lệ lấp đầy 14 ngày (%)</h2>
          <OccupancyChart data={daily} />
        </div>
      </div>

      {/* Timeline Gantt */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Lịch phòng × ngày (7 ngày)</h2>
          <Link href="/rooms-map" className="text-sm text-brand-600 hover:underline">
            Sơ đồ phòng →
          </Link>
        </div>
        <GanttView rooms={rooms} bookings={bookings7d} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Upcoming check-ins */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Sắp check-in</h2>
            <Link href="/bookings" className="text-sm text-brand-600 hover:underline">
              Tất cả →
            </Link>
          </div>
          {upcomingCheckIns.length === 0 ? (
            <p className="text-slate-500 text-sm">Không có check-in sắp tới.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingCheckIns.map((b: any) => (
                <li
                  key={b.id}
                  className="flex justify-between items-start text-sm border-b last:border-0 pb-2"
                >
                  <div>
                    <div className="font-medium">{b.guest_name}</div>
                    <div className="text-xs text-slate-500">
                      {b.rooms.name} · {fmtDateTime(b.checkin_at)}
                    </div>
                  </div>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    {b.code ?? "—"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending check-outs */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Sắp check-out</h2>
            <Link href="/bookings" className="text-sm text-brand-600 hover:underline">
              Tất cả →
            </Link>
          </div>
          {pendingCheckOuts.length === 0 ? (
            <p className="text-slate-500 text-sm">Không có check-out sắp tới.</p>
          ) : (
            <ul className="space-y-2">
              {pendingCheckOuts.map((b: any) => (
                <li
                  key={b.id}
                  className="flex justify-between items-start text-sm border-b last:border-0 pb-2"
                >
                  <div>
                    <div className="font-medium">{b.guest_name}</div>
                    <div className="text-xs text-slate-500">
                      {b.rooms.name} · {fmtDateTime(b.checkout_at)}
                    </div>
                  </div>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    {fmtVnd(b.balance_due)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tasks cần xử lý */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Task dọn phòng đang mở</h2>
          <Link href="/tasks" className="text-sm text-brand-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="text-slate-500 text-sm">Không có task nào. 🎉</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr>
                <th className="py-2">Phòng</th>
                <th>Trạng thái</th>
                <th>Ưu tiên</th>
                <th>Deadline</th>
                <th>Người dọn</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 8).map((t: any) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{t.rooms.name}</td>
                  <td>
                    <TaskStatusBadge status={t.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="text-slate-600">{fmtDateTime(t.due_before)}</td>
                  <td className="text-slate-600">
                    {t.assignee?.full_name ?? (
                      <span className="text-red-600">Chưa gán</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="text-brand-600 hover:underline text-xs"
                    >
                      Chi tiết
                    </Link>
                  </td>
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
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "red" | "brand";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50"
      : tone === "brand"
      ? "border-brand-200 bg-brand-50"
      : "";
  return (
    <div className={`card p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1 text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function buildLast14Days(): Date[] {
  const out: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86400_000);
    out.push(d);
  }
  return out;
}
