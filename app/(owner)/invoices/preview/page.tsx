import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtVnd, fmtDateTime } from "@/lib/utils/format";
import { PrintControls } from "./_components/print-controls";

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

export default async function InvoicePreview({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.booking_id) return notFound();

  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const [bookingRes, paymentsRes, settingsRes] = await Promise.all([
    sb
      .from("bookings")
      .select(
        "*, rooms(id, name, room_number, floor, room_types(name, code))"
      )
      .eq("id", sp.booking_id)
      .maybeSingle(),
    sb
      .from("payments")
      .select("*")
      .eq("booking_id", sp.booking_id)
      .order("received_at"),
    sb
      .from("system_settings")
      .select("*")
      .eq("property_id", owner.propertyId)
      .maybeSingle(),
  ]);

  const b = bookingRes.data;
  if (!b) return notFound();
  const payments = paymentsRes.data ?? [];
  const settings = settingsRes.data;

  const issueDate = b.actual_checkout_at ?? new Date().toISOString();

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <PrintControls bookingId={b.id} code={b.code ?? ""} />

      <div className="max-w-3xl mx-auto bg-white p-10 shadow-lg my-6 print:my-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4 mb-6">
          <div>
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Logo"
                className="h-16 object-contain mb-2"
              />
            )}
            <h1 className="text-2xl font-bold text-brand-700">
              {settings?.hotel_name ?? "Hưng Phước Hotel"}
            </h1>
            {settings?.hotel_address && (
              <div className="text-sm text-slate-600">{settings.hotel_address}</div>
            )}
            <div className="text-sm text-slate-600">
              {settings?.hotel_phone && <>ĐT: {settings.hotel_phone} · </>}
              {settings?.hotel_email && <>Email: {settings.hotel_email}</>}
            </div>
            {settings?.tax_code && (
              <div className="text-sm text-slate-600">MST: {settings.tax_code}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Hoá đơn / Invoice
            </div>
            <div className="text-3xl font-bold text-slate-800 font-mono">
              {b.code ?? "—"}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Ngày: {fmtDateTime(issueDate)}
            </div>
          </div>
        </div>

        {/* Guest / stay info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Khách hàng
            </div>
            <div className="text-base font-semibold">{b.guest_name}</div>
            {b.guest_phone && (
              <div className="text-sm text-slate-600">SĐT: {b.guest_phone}</div>
            )}
            {b.guest_email && (
              <div className="text-sm text-slate-600">Email: {b.guest_email}</div>
            )}
            {b.guest_id_number && (
              <div className="text-sm text-slate-600">CCCD: {b.guest_id_number}</div>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Thông tin lưu trú
            </div>
            <Row label="Phòng">
              {b.rooms?.name}
              {b.rooms?.room_types?.name ? ` · ${b.rooms.room_types.name}` : ""}
            </Row>
            <Row label="Check-in">{fmtDateTime(b.actual_checkin_at ?? b.checkin_at)}</Row>
            <Row label="Check-out">
              {fmtDateTime(b.actual_checkout_at ?? b.checkout_at)}
            </Row>
            <Row label="Số khách">
              {b.adults} lớn · {b.children} trẻ em
            </Row>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-4">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="text-left p-2 font-semibold">Khoản mục</th>
              <th className="text-right p-2 font-semibold">Đơn giá</th>
              <th className="text-right p-2 font-semibold">SL</th>
              <th className="text-right p-2 font-semibold">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2">
                Tiền phòng ({b.booking_type === "hourly" ? "theo giờ" : "theo ngày"})
              </td>
              <td className="text-right p-2">{fmtVnd(b.unit_price)}</td>
              <td className="text-right p-2">
                {b.booking_type === "hourly" ? `${b.hours} giờ` : `${b.nights} đêm`}
              </td>
              <td className="text-right p-2">{fmtVnd(b.room_charge)}</td>
            </tr>
            {(b.discount_amount ?? 0) > 0 && (
              <tr className="border-b">
                <td colSpan={3} className="p-2 text-slate-600">
                  Giảm giá
                </td>
                <td className="text-right p-2 text-red-600">
                  - {fmtVnd(b.discount_amount)}
                </td>
              </tr>
            )}
            {(b.service_charge ?? 0) > 0 && (
              <tr className="border-b">
                <td colSpan={3} className="p-2 text-slate-600">
                  Phí dịch vụ
                </td>
                <td className="text-right p-2">{fmtVnd(b.service_charge)}</td>
              </tr>
            )}
            {(b.vat_amount ?? 0) > 0 && (
              <tr className="border-b">
                <td colSpan={3} className="p-2 text-slate-600">
                  VAT ({b.vat_rate}%)
                </td>
                <td className="text-right p-2">{fmtVnd(b.vat_amount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-brand-50">
              <td colSpan={3} className="p-2 font-bold text-right">
                Tổng cộng
              </td>
              <td className="p-2 text-right font-bold text-lg text-brand-700">
                {fmtVnd(b.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payments */}
        {payments.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              Lịch sử thanh toán
            </div>
            <table className="w-full text-sm">
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-1">{fmtDateTime(p.received_at)}</td>
                    <td className="py-1">{methodLabels[p.method] ?? p.method}</td>
                    <td className="py-1 text-slate-500 italic">{p.note ?? ""}</td>
                    <td className="py-1 text-right">{fmtVnd(p.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={3} className="py-1 text-right">
                    Đã thanh toán
                  </td>
                  <td className="py-1 text-right text-green-700">
                    {fmtVnd(b.paid_amount)}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={3} className="py-1 text-right">
                    Còn lại
                  </td>
                  <td
                    className={`py-1 text-right ${
                      (b.balance_due ?? 0) > 0 ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {fmtVnd(b.balance_due)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold mb-12">Khách hàng</div>
            <div className="border-t pt-1 text-slate-500">(Ký & ghi rõ họ tên)</div>
          </div>
          <div>
            <div className="font-semibold mb-12">Đại diện khách sạn</div>
            <div className="border-t pt-1 text-slate-500">(Ký & ghi rõ họ tên)</div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          Cảm ơn quý khách — {settings?.hotel_name ?? "Hưng Phước Hotel"} rất hân hạnh được phục vụ.
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm flex gap-2">
      <div className="text-slate-500 w-24 shrink-0">{label}</div>
      <div className="text-slate-800">{children}</div>
    </div>
  );
}
