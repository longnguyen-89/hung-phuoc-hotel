"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, LogOut } from "lucide-react";
import { fmtVnd } from "@/lib/utils/format";

export function CheckOutModal({
  bookingId,
  totalAmount,
  balanceDue,
  onClose,
}: {
  bookingId: string;
  totalAmount: number;
  balanceDue: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    final_amount: totalAmount,
    payment_amount: Math.max(0, balanceDue),
    payment_method: "cash" as "cash" | "bank" | "card" | "momo" | "zalopay" | "vnpay" | "other",
    note: "",
  });

  const adjustTotal = form.final_amount !== totalAmount;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: Record<string, unknown> = {};
    if (adjustTotal) payload.final_amount = Number(form.final_amount) || 0;
    if (form.payment_amount > 0) {
      payload.payment_amount = Number(form.payment_amount);
      payload.payment_method = form.payment_method;
      if (form.note) payload.note = form.note;
    }
    const res = await fetch(`/api/bookings/${bookingId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Lỗi không xác định" }));
      alert("Lỗi: " + (typeof err.error === "string" ? err.error : JSON.stringify(err)));
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LogOut className="w-5 h-5 text-slate-800" />
            Check-out & thanh toán
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost h-8 px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-md bg-slate-50 border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Tổng đơn</span>
              <span className="font-semibold">{fmtVnd(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cần thu</span>
              <span
                className={
                  balanceDue > 0 ? "text-red-600 font-bold" : "text-green-700 font-bold"
                }
              >
                {fmtVnd(balanceDue)}
              </span>
            </div>
          </div>

          <div>
            <Label>Tổng tiền cuối cùng (có thể điều chỉnh)</Label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.final_amount}
              onChange={(e) => setForm({ ...form, final_amount: Number(e.target.value) })}
            />
            {adjustTotal && (
              <div className="text-xs text-amber-700 mt-0.5">
                Đã điều chỉnh từ {fmtVnd(totalAmount)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Số tiền thu (đ)</Label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.payment_amount}
                onChange={(e) =>
                  setForm({ ...form, payment_amount: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Phương thức</Label>
              <select
                className="input"
                value={form.payment_method}
                onChange={(e) =>
                  setForm({
                    ...form,
                    payment_method: e.target.value as typeof form.payment_method,
                  })
                }
                disabled={!form.payment_amount}
              >
                <option value="cash">Tiền mặt</option>
                <option value="bank">Chuyển khoản</option>
                <option value="card">Thẻ</option>
                <option value="momo">Momo</option>
                <option value="zalopay">ZaloPay</option>
                <option value="vnpay">VNPay</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Ghi chú</Label>
            <input
              className="input"
              placeholder="Thu thêm phí phát sinh, hư hỏng…"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <p className="text-xs text-slate-500">
            Sau khi check-out, task dọn phòng sẽ được tạo tự động (BR-01).
          </p>
        </div>

        <div className="border-t p-4 flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Đang xử lý…" : "Xác nhận check-out"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-slate-600 block mb-1">{children}</label>;
}
