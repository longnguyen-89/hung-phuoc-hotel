"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function NewStaffForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    hourly_rate: 50000,
    weekend_multiplier: 1.2,
    holiday_multiplier: 1.5,
    bank_name: "",
    bank_account: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setForm({
      full_name: "",
      phone: "",
      hourly_rate: 50000,
      weekend_multiplier: 1.2,
      holiday_multiplier: 1.5,
      bank_name: "",
      bank_account: "",
    });
    setError(null);
    setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        bank_name: form.bank_name.trim() || null,
        bank_account: form.bank_account.trim() || null,
      };
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Lỗi");
        return;
      }
      reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Thêm nhân viên
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3 w-full max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Họ tên *">
          <input
            className="input"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
            autoFocus
          />
        </Field>
        <Field label="SĐT *">
          <input
            className="input"
            inputMode="numeric"
            placeholder="09xxxxxxxx"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.trim() })}
            required
          />
        </Field>
        <Field label="Đơn giá / giờ (VNĐ) *">
          <input
            type="number"
            className="input"
            value={form.hourly_rate}
            min={10000}
            max={500000}
            step={1000}
            onChange={(e) => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Hệ số cuối tuần">
            <input
              type="number"
              className="input"
              value={form.weekend_multiplier}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) =>
                setForm({ ...form, weekend_multiplier: parseFloat(e.target.value) || 1 })
              }
            />
          </Field>
          <Field label="Hệ số ngày lễ">
            <input
              type="number"
              className="input"
              value={form.holiday_multiplier}
              min={1}
              max={5}
              step={0.1}
              onChange={(e) =>
                setForm({ ...form, holiday_multiplier: parseFloat(e.target.value) || 1 })
              }
            />
          </Field>
        </div>
        <Field label="Ngân hàng">
          <input
            className="input"
            placeholder="Vietcombank"
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          />
        </Field>
        <Field label="Số tài khoản">
          <input
            className="input"
            value={form.bank_account}
            onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
          />
        </Field>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}

      <div className="flex gap-2 pt-2">
        <button className="btn-primary" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu"}
        </button>
        <button type="button" className="btn-ghost" onClick={reset}>
          Huỷ
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}
