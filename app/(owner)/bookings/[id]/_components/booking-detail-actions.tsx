"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, XCircle, CreditCard } from "lucide-react";
import { CheckInModal } from "../../_components/check-in-modal";
import { CheckOutModal } from "../../_components/check-out-modal";
import { PaymentModal } from "../../_components/payment-modal";

type Booking = {
  id: string;
  status: "upcoming" | "checked_in" | "checked_out" | "cancelled";
  total_amount: number | null;
  paid_amount: number | null;
  balance_due: number | null;
};

export function BookingDetailActions({ booking }: { booking: Booking }) {
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
  const canAddPayment = booking.status !== "cancelled" && booking.status !== "checked_in";

  return (
    <>
      <div className="flex items-center gap-2">
        {canCheckIn && (
          <button onClick={() => setModal("checkin")} className="btn-primary" disabled={busy}>
            <LogIn className="w-4 h-4" />
            Check-in
          </button>
        )}
        {canCheckOut && (
          <button
            onClick={() => setModal("checkout")}
            className="btn inline-flex items-center gap-2 h-9 px-4 bg-slate-800 text-white hover:bg-slate-900"
            disabled={busy}
          >
            <LogOut className="w-4 h-4" />
            Check-out
          </button>
        )}
        {canAddPayment && (
          <button onClick={() => setModal("payment")} className="btn-secondary">
            <CreditCard className="w-4 h-4" />
            Thanh toán
          </button>
        )}
        {canCancel && (
          <button
            onClick={cancel}
            disabled={busy}
            className="btn inline-flex items-center gap-2 h-9 px-3 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4" />
            Huỷ
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
