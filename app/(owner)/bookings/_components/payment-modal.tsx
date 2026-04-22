"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CreditCard } from "lucide-react";
import { fmtVnd } from "@/lib/utils/format";

export function PaymentModal({
  bookingId,
  balanceDue,
  onClose,
}: {
  bookingId: string;
  balanceDue: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: Math.max(0, balanceDue),
    method: "cash" as "cash" | "bank" | "card" | "momo" | "zalopay" | "vnpay" | "other",
    type: "balance" as "deposit" | "balance" | "refund" | "extra",
    note: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.amount <= 0) {
      alert("Số tiền phải lớn hơn 0");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(form.amount),
        method: form.method,
        type: form.type,
        note: form.note || null,
      }),
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
      <form onSubmit={submit} className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-600" />
            Ghi nhận thanh toán
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost h-8 px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {balanceDue > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
              Còn lại chưa thanh toán: <strong>{fmtVnd(balanceDue)}</strong>
            </div>
          )}

          <div>
            <Label>Loại</Label>
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as typeof form.type })
              }
            >
              <option value="balance">Thanh toán</option>
              <option value="deposit">Tiền cọc</option>
              <option value="extra">Phát sinh</option>
              <option value="refund">Hoàn tiền</option>
            </select>
          </div>

          <div>
            <Label>Số tiền (đ)</Label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label>Phương thức</Label>
            <select
              className="input"
              value={form.method}
              onChange={(e) =>
                setForm({ ...form, method: e.target.value as typeof form.method })
              }
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

          <div>
            <Label>Ghi chú</Label>
            <input
              className="input"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>

        <div className="border-t p-4 flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Đang lưu…" : "Ghi nhận"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-slate-600 block mb-1">{children}</label>;
}
