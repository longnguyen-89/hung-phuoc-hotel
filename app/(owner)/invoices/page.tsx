import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtVnd, fmtDateTime } from "@/lib/utils/format";
import { Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("invoices")
    .select(
      "*, bookings!inner(code, guest_name, rooms!inner(name, property_id))"
    )
    .eq("bookings.rooms.property_id", owner.propertyId)
    .order("issued_at", { ascending: false })
    .limit(200);

  const invoices = (data ?? []) as Invoice[];
  const total = invoices.reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Hoá đơn</h1>
          <p className="text-slate-500 text-sm">
            {invoices.length} hoá đơn · Tổng {fmtVnd(total)}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Số hoá đơn</th>
              <th className="p-3">Ngày</th>
              <th className="p-3">Booking</th>
              <th className="p-3">Khách</th>
              <th className="p-3">Phòng</th>
              <th className="p-3 text-right">Tổng</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400">
                  Chưa có hoá đơn nào. Tạo hoá đơn từ trang chi tiết booking.
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-3 font-mono font-semibold text-brand-700">
                  {inv.invoice_number}
                </td>
                <td className="p-3 text-slate-600 whitespace-nowrap">
                  {fmtDateTime(inv.issued_at)}
                </td>
                <td className="p-3 font-mono text-xs">
                  <Link
                    href={`/bookings/${inv.booking_id}`}
                    className="text-brand-600 hover:underline"
                  >
                    {inv.bookings?.code}
                  </Link>
                </td>
                <td className="p-3">{inv.bookings?.guest_name}</td>
                <td className="p-3">{inv.bookings?.rooms?.name}</td>
                <td className="p-3 text-right font-semibold">
                  {fmtVnd(inv.total_amount)}
                </td>
                <td className="p-3 text-right">
                  <Link
                    href={`/invoices/preview?booking_id=${inv.booking_id}`}
                    target="_blank"
                    className="btn-secondary text-xs h-7"
                  >
                    <Printer className="w-3 h-3" />
                    In
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Invoice = {
  id: string;
  invoice_number: string;
  booking_id: string;
  total_amount: number;
  issued_at: string;
  bookings: {
    code: string | null;
    guest_name: string | null;
    rooms: { name: string } | null;
  } | null;
};
