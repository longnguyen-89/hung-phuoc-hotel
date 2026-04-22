"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, LogIn } from "lucide-react";

export function CheckInModal({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    guest_id_number: "",
    adults: 1,
    children: 0,
    deposit_amount: 0,
    deposit_method: "cash" as "cash" | "bank" | "card" | "momo" | "zalopay" | "vnpay" | "other",
    notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload: Record<string, unknown> = {
      adults: Number(form.adults) || 1,
      children: Number(form.children) || 0,
    };
    if (form.guest_id_number) payload.guest_id_number = form.guest_id_number;
    if (form.notes) payload.notes = form.notes;
    if (form.deposit_amount > 0) {
      payload.deposit_amount = Number(form.deposit_amount);
      payload.deposit_method = form.deposit_method;
    }

    const res = await fetch(`/api/bookings/${bookingId}/check-in`, {
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
            <LogIn className="w-5 h-5 text-brand-600" />
            Check-in khách
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost h-8 px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <Label>CCCD / Passport</Label>
            <input
              className="input"
              placeholder="VD: 079000000000"
              value={form.guest_id_number}
              onChange={(e) => setForm({ ...form, guest_id_number: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Người lớn</Label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.adults}
                onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Trẻ em</Label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.children}
                onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tiền cọc (đ)</Label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.deposit_amount}
                onChange={(e) =>
                  setForm({ ...form, deposit_amount: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Phương thức</Label>
              <select
                className="input"
                value={form.deposit_method}
                onChange={(e) =>
                  setForm({
                    ...form,
                    deposit_method: e.target.value as typeof form.deposit_method,
                  })
                }
                disabled={!form.deposit_amount}
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
            <textarea
              className="input min-h-[60px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Tình trạng phòng, vật dụng đặc biệt…"
            />
          </div>
        </div>

        <div className="border-t p-4 flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Đang xử lý…" : "Xác nhận check-in"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-slate-600 block mb-1">{children}</label>;
}
