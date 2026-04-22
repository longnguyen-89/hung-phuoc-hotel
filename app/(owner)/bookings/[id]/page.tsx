import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { fmtDateTime, fmtVnd, fmtDate } from "@/lib/utils/format";
import { BookingDetailActions } from "./_components/booking-detail-actions";

export const dynamic = "force-dynamic";

const methodLabels: Record<string, string> = {
  cash: "Tiền mặt",
  bank: "Chuyển khoản",
  card: "Thẻ",
  momo: "Momo",
  zalopay: "ZaloPay",
  vnpay: "VNPay",
  other: "Khác",
};
const typeLabels: Record<string, string> = {
  deposit: "Tiền cọc",
  balance: "Thanh toán",
  refund: "Hoàn tiền",
  extra: "Phát sinh",
};

export default async function BookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = supabaseAdmin();

  const [bookingRes, paymentsRes] = await Promise.all([
    sb
      .from("bookings")
      .select(
        "*, rooms(id, name, room_number, floor, room_types(name, code))"
      )
      .eq("id", id)
      .maybeSingle(),
    sb
      .from("payments")
      .select("*")
      .eq("booking_id", id)
      .order("received_at", { ascending: false }),
  ]);

  const b = bookingRes.data;
  if (!b) return notFound();
  const payments = paymentsRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bookings" className="btn-ghost h-8 px-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="font-mono">{b.code ?? "—"}</span>
              <BookingStatusBadge status={b.status} />
            </h1>
            <p className="text-slate-500 text-sm">
              Tạo lúc {fmtDateTime(b.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/invoices/preview?booking_id=${b.id}`}
            className="btn-secondary"
            target="_blank"
          >
            <Printer className="w-4 h-4" />
            In hoá đơn
          </Link>
          <BookingDetailActions booking={b} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <section className="card p-4 md:col-span-2 space-y-4">
          <h2 className="font-semibold">Thông tin phòng & thời gian</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="Phòng" value={
              <>
                {b.rooms?.name}
                {b.rooms?.floor != null && ` · Lầu ${b.rooms.floor}`}
              </>
            } />
            <InfoRow label="Loại phòng" value={b.rooms?.room_types?.name ?? "—"} />
            <InfoRow label="Hình thức" value={b.booking_type === "hourly" ? "Theo giờ" : "Theo ngày"} />
            <InfoRow
              label="Thời lượng"
              value={
                b.booking_type === "hourly"
                  ? `${b.hours ?? 0} giờ`
                  : `${b.nights ?? 0} đêm`
              }
            />
            <InfoRow label="Check-in dự kiến" value={fmtDateTime(b.checkin_at)} />
            <InfoRow label="Check-out dự kiến" value={fmtDateTime(b.checkout_at)} />
            <InfoRow label="Check-in thực" value={fmtDateTime(b.actual_checkin_at)} />
            <InfoRow label="Check-out thực" value={fmtDateTime(b.actual_checkout_at)} />
            <InfoRow label="Số khách" value={`${b.adults ?? 1} lớn · ${b.children ?? 0} trẻ em`} />
            <InfoRow label="Nguồn" value={b.source ?? "—"} />
          </div>

          {b.notes && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
              <div className="text-xs text-amber-800 font-medium mb-1">Ghi chú</div>
              <div className="text-slate-700 whitespace-pre-line">{b.notes}</div>
            </div>
          )}
        </section>

        <section className="card p-4 space-y-2">
          <h2 className="font-semibold">Khách hàng</h2>
          <div className="text-sm space-y-1">
            <div className="font-medium text-slate-800">{b.guest_name}</div>
            {b.guest_phone && <div className="text-slate-600">SĐT: {b.guest_phone}</div>}
            {b.guest_email && <div className="text-slate-600">Email: {b.guest_email}</div>}
            {b.guest_id_number && (
              <div className="text-slate-600">CCCD: {b.guest_id_number}</div>
            )}
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <section className="card p-4 space-y-2 md:col-span-2">
          <h2 className="font-semibold">Chi tiết giá</h2>
          <div className="text-sm space-y-1">
            <PriceRow
              label={`Đơn giá (${b.booking_type === "hourly" ? "giờ" : "ngày"})`}
              value={fmtVnd(b.unit_price)}
            />
            <PriceRow
              label={
                b.booking_type === "hourly"
                  ? `${b.hours ?? 0} giờ × ${fmtVnd(b.unit_price)}`
                  : `${b.nights ?? 0} đêm × ${fmtVnd(b.unit_price)}`
              }
              value={fmtVnd(b.room_charge)}
            />
            {(b.discount_amount ?? 0) > 0 && (
              <PriceRow label="Giảm giá" value={`- ${fmtVnd(b.discount_amount)}`} />
            )}
            {(b.service_charge ?? 0) > 0 && (
              <PriceRow label="Phí dịch vụ" value={fmtVnd(b.service_charge)} />
            )}
            {(b.vat_amount ?? 0) > 0 && (
              <PriceRow label={`VAT (${b.vat_rate ?? 0}%)`} value={fmtVnd(b.vat_amount)} />
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-slate-800">
              <span>Tổng đơn</span>
              <span>{fmtVnd(b.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Đã thanh toán</span>
              <span className="text-green-700">{fmtVnd(b.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Còn lại</span>
              <span
                className={
                  (b.balance_due ?? 0) > 0
                    ? "text-red-600 font-semibold"
                    : "text-green-700 font-semibold"
                }
              >
                {fmtVnd(b.balance_due)}
              </span>
            </div>
          </div>
        </section>

        <section className="card p-4 space-y-2">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Lịch sử thanh toán ({payments.length})
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có giao dịch nào.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="border rounded-md p-2 bg-slate-50 flex justify-between items-start gap-2"
                >
                  <div>
                    <div className="font-medium">{fmtVnd(p.amount)}</div>
                    <div className="text-xs text-slate-500">
                      {typeLabels[p.type] ?? p.type} · {methodLabels[p.method] ?? p.method}
                    </div>
                    {p.note && (
                      <div className="text-xs text-slate-500 italic mt-0.5">
                        {p.note}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">
                    {fmtDate(p.received_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-800 font-medium">{value || "—"}</div>
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}
