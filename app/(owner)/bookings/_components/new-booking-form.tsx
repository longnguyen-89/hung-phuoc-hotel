"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { computeBookingPrice } from "@/lib/business/compute-booking-price";
import { fmtVnd } from "@/lib/utils/format";
import type { RoomOption } from "../page";

type Settings = {
  vat_enabled: boolean | null;
  vat_rate: number | null;
  service_charge_enabled: boolean | null;
  service_charge_rate: number | null;
};

export function NewBookingForm({
  rooms,
  settings,
}: {
  rooms: RoomOption[];
  settings: Settings;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Tạo booking mới
      </button>
    );
  }

  return (
    <BookingModal rooms={rooms} settings={settings} onClose={() => setOpen(false)} />
  );
}

function BookingModal({
  rooms,
  settings,
  onClose,
}: {
  rooms: RoomOption[];
  settings: Settings;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    room_id: rooms[0]?.id ?? "",
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    guest_id_number: "",
    adults: 1,
    children: 0,
    booking_type: "daily" as "daily" | "hourly",
    checkin_at: defaultLocal(0, 14),
    checkout_at: defaultLocal(1, 12),
    unit_price_override: "",
    discount_amount: 0,
    deposit_amount: 0,
    deposit_method: "cash" as "cash" | "bank" | "card" | "momo" | "zalopay" | "vnpay" | "other",
    source: "direct",
    notes: "",
  });

  const selectedRoom = rooms.find((r) => r.id === form.room_id);

  const effectivePrices = useMemo(() => {
    if (!selectedRoom) return { day: 0, hour: 0 };
    const typeDay = selectedRoom.room_types?.price_per_day ?? 0;
    const typeHour = selectedRoom.room_types?.price_per_hour ?? 0;
    return {
      day: selectedRoom.price_per_day ?? typeDay,
      hour: selectedRoom.price_per_hour ?? typeHour,
    };
  }, [selectedRoom]);

  const unitPrice = useMemo(() => {
    if (form.unit_price_override) return Number(form.unit_price_override) || 0;
    return form.booking_type === "daily" ? effectivePrices.day : effectivePrices.hour;
  }, [form.unit_price_override, form.booking_type, effectivePrices]);

  const vatRate = settings.vat_enabled ? Number(settings.vat_rate ?? 0) : 0;
  const scRate = settings.service_charge_enabled ? Number(settings.service_charge_rate ?? 0) : 0;

  const preview = useMemo(() => {
    try {
      return computeBookingPrice({
        booking_type: form.booking_type,
        checkin_at: new Date(form.checkin_at).toISOString(),
        checkout_at: new Date(form.checkout_at).toISOString(),
        unit_price: unitPrice,
        discount_amount: Number(form.discount_amount) || 0,
        vat_rate: vatRate,
        service_charge_rate: scRate,
      });
    } catch {
      return null;
    }
  }, [form.booking_type, form.checkin_at, form.checkout_at, unitPrice, form.discount_amount, vatRate, scRate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.room_id) {
      alert("Chọn phòng");
      return;
    }
    if (new Date(form.checkout_at) <= new Date(form.checkin_at)) {
      alert("Check-out phải sau check-in");
      return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      room_id: form.room_id,
      guest_name: form.guest_name,
      guest_phone: form.guest_phone || null,
      guest_email: form.guest_email || null,
      guest_id_number: form.guest_id_number || null,
      adults: Number(form.adults) || 1,
      children: Number(form.children) || 0,
      booking_type: form.booking_type,
      checkin_at: new Date(form.checkin_at).toISOString(),
      checkout_at: new Date(form.checkout_at).toISOString(),
      discount_amount: Number(form.discount_amount) || 0,
      source: form.source,
      notes: form.notes || null,
    };
    if (form.unit_price_override) {
      payload.unit_price = Number(form.unit_price_override);
    }

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setLoading(false);
      const err = await res.json().catch(() => ({ error: "Unknown" }));
      alert("Lỗi: " + (typeof err.error === "string" ? err.error : JSON.stringify(err)));
      return;
    }
    const created = await res.json();

    // Ghi nhận tiền cọc (nếu có) qua API payments
    if (Number(form.deposit_amount) > 0) {
      await fetch(`/api/bookings/${created.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.deposit_amount),
          method: form.deposit_method,
          type: "deposit",
          note: "Cọc lúc tạo booking",
        }),
      });
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-6"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Tạo booking mới</h2>
          <button type="button" onClick={onClose} className="btn-ghost h-8 px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4">
          <section className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-700">Thông tin đặt phòng</h3>

            <div>
              <Label>Phòng *</Label>
              <select
                className="input"
                value={form.room_id}
                onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                required
              >
                <option value="">— chọn —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.floor != null ? ` · Lầu ${r.floor}` : ""}
                    {r.room_types?.name ? ` · ${r.room_types.name}` : ""}
                  </option>
                ))}
              </select>
              {selectedRoom && (
                <div className="text-xs text-slate-500 mt-1">
                  Giá ngày: {fmtVnd(effectivePrices.day)} · Giá giờ: {fmtVnd(effectivePrices.hour)}
                </div>
              )}
            </div>

            <div>
              <Label>Hình thức *</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={tabCn(form.booking_type === "daily")}
                  onClick={() => setForm({ ...form, booking_type: "daily" })}
                >
                  Theo ngày
                </button>
                <button
                  type="button"
                  className={tabCn(form.booking_type === "hourly")}
                  onClick={() => setForm({ ...form, booking_type: "hourly" })}
                >
                  Theo giờ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check-in *</Label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.checkin_at}
                  onChange={(e) => setForm({ ...form, checkin_at: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Check-out *</Label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.checkout_at}
                  onChange={(e) => setForm({ ...form, checkout_at: e.target.value })}
                  required
                />
              </div>
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

            <div>
              <Label>Nguồn đặt</Label>
              <select
                className="input"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="direct">Khách trực tiếp</option>
                <option value="phone">Điện thoại</option>
                <option value="walk_in">Walk-in</option>
                <option value="agoda">Agoda</option>
                <option value="booking.com">Booking.com</option>
                <option value="airbnb">Airbnb</option>
                <option value="facebook">Facebook</option>
                <option value="zalo">Zalo</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div>
              <Label>Ghi chú</Label>
              <textarea
                className="input min-h-[60px]"
                placeholder="Yêu cầu đặc biệt, khách VIP…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-700">Thông tin khách</h3>

            <div>
              <Label>Tên khách *</Label>
              <input
                className="input"
                value={form.guest_name}
                onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SĐT</Label>
                <input
                  className="input"
                  value={form.guest_phone}
                  onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>CCCD/Passport</Label>
                <input
                  className="input"
                  value={form.guest_id_number}
                  onChange={(e) => setForm({ ...form, guest_id_number: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <input
                type="email"
                className="input"
                value={form.guest_email}
                onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
              />
            </div>

            <h3 className="font-semibold text-sm text-slate-700 pt-2">Giá & thanh toán</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Đơn giá ({form.booking_type === "daily" ? "theo ngày" : "theo giờ"})
                </Label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  placeholder={String(
                    form.booking_type === "daily" ? effectivePrices.day : effectivePrices.hour
                  )}
                  value={form.unit_price_override}
                  onChange={(e) => setForm({ ...form, unit_price_override: e.target.value })}
                />
                <div className="text-xs text-slate-400 mt-0.5">
                  Để trống = dùng giá mặc định
                </div>
              </div>
              <div>
                <Label>Giảm giá (đ)</Label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.discount_amount}
                  onChange={(e) =>
                    setForm({ ...form, discount_amount: Number(e.target.value) })
                  }
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
                <Label>Phương thức cọc</Label>
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

            <PricePreview preview={preview} vatRate={vatRate} scRate={scRate} />
          </section>
        </div>

        <div className="border-t p-4 flex gap-2 justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Đang lưu…" : "Tạo booking"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PricePreview({
  preview,
  vatRate,
  scRate,
}: {
  preview: ReturnType<typeof computeBookingPrice> | null;
  vatRate: number;
  scRate: number;
}) {
  if (!preview) {
    return (
      <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-500">
        Nhập đầy đủ thời gian & phòng để xem tạm tính.
      </div>
    );
  }
  return (
    <div className="rounded-md bg-brand-50 border border-brand-200 p-3 text-sm space-y-1">
      <Row
        label={preview.nights ? `${preview.nights} đêm` : `${preview.hours} giờ`}
        value={fmtVnd(preview.room_charge)}
      />
      {preview.discount_amount > 0 && (
        <Row label="Giảm giá" value={`- ${fmtVnd(preview.discount_amount)}`} />
      )}
      {scRate > 0 && (
        <Row label={`Phí dịch vụ (${scRate}%)`} value={fmtVnd(preview.service_charge)} />
      )}
      {vatRate > 0 && (
        <Row label={`VAT (${vatRate}%)`} value={fmtVnd(preview.vat_amount)} />
      )}
      <div className="border-t border-brand-300 pt-1 mt-1 flex justify-between font-bold text-brand-800">
        <span>Tổng thanh toán</span>
        <span>{fmtVnd(preview.total_amount)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-slate-600 block mb-1">{children}</label>;
}

function tabCn(active: boolean): string {
  return active
    ? "flex-1 h-9 rounded-md bg-brand-600 text-white text-sm font-medium"
    : "flex-1 h-9 rounded-md border border-slate-300 bg-white text-slate-700 text-sm hover:bg-slate-50";
}

function defaultLocal(offsetDays: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(0, 0, 0);
  d.setHours(hour);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
