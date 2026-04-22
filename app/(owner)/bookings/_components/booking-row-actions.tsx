"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, XCircle, Eye, CreditCard, MoreHorizontal } from "lucide-react";
import { CheckInModal } from "./check-in-modal";
import { CheckOutModal } from "./check-out-modal";
import { PaymentModal } from "./payment-modal";

type Booking = {
  id: string;
  code: string | null;
  status: "upcoming" | "checked_in" | "checked_out" | "cancelled";
  total_amount: number | null;
  paid_amount: number | null;
  balance_due: number | null;
};

export function BookingRowActions({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "checkin" | "checkout" | "payment">(null);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!confirm("Huỷ booking này? Thao tác không thể hoàn tác.")) return;
    setBusy(true);
    const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Lỗi không xác định" }));
      alert("Lỗi: " + (err.error ?? "unknown"));
      return;
    }
    router.refresh();
  }

  const canCheckIn = booking.status === "upcoming";
  const canCheckOut = booking.status === "checked_in";
  const canCancel = booking.status === "upcoming" || booking.status === "checked_in";
  const canAddPayment = booking.status !== "cancelled";

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/bookings/${booking.id}`}
          className="btn-ghost h-7 px-2 text-xs"
          title="Chi tiết"
        >
          <Eye className="w-3.5 h-3.5" />
        </Link>
        {canCheckIn && (
          <button
            onClick={() => setModal("checkin")}
            className="h-7 px-2 text-xs rounded-md bg-brand-600 text-white hover:bg-brand-700 inline-flex items-center gap-1"
            disabled={busy}
          >
            <LogIn className="w-3.5 h-3.5" />
            Check-in
          </button>
        )}
        {canCheckOut && (
          <button
            onClick={() => setModal("checkout")}
            className="h-7 px-2 text-xs rounded-md bg-slate-800 text-white hover:bg-slate-900 inline-flex items-center gap-1"
            disabled={busy}
          >
            <LogOut className="w-3.5 h-3.5" />
            Check-out
          </button>
        )}
        {canAddPayment && (booking.balance_due ?? 0) > 0 && booking.status !== "checked_in" && (
          <button
            onClick={() => setModal("payment")}
            className="h-7 px-2 text-xs rounded-md border border-slate-300 hover:bg-slate-50 inline-flex items-center gap-1"
            title="Thêm thanh toán"
          >
            <CreditCard className="w-3.5 h-3.5" />
          </button>
        )}
        {canCancel && (
          <button
            onClick={cancel}
            disabled={busy}
            className="h-7 px-2 text-xs rounded-md text-red-600 hover:bg-red-50 inline-flex items-center"
            title="Huỷ"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {modal === "checkin" && (
        <CheckInModal bookingId={booking.id} onClose={() => setModal(null)} />
      )}
      {modal === "checkout" && (
        <CheckOutModal
          bookingId={booking.id}
          totalAmount={booking.total_amount ?? 0}
          balanceDue={booking.balance_due ?? 0}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "payment" && (
        <PaymentModal
          bookingId={booking.id}
          balanceDue={booking.balance_due ?? 0}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
