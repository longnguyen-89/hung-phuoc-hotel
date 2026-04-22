"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Power, X } from "lucide-react";

type Staff = {
  user_id: string;
  full_name: string;
  is_active: boolean;
  hourly_rate: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  bank_name: string | null;
  bank_account: string | null;
};

export function StaffRowActions({ staff }: { staff: Staff }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    if (
      staff.is_active &&
      !confirm(`Tắt ${staff.full_name}? Sẽ không auto-assign cho người này nữa.`)
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/staff/${staff.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !staff.is_active }),
    });
    setLoading(false);
    if (!res.ok) {
      alert((await res.json()).error ?? "Lỗi");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        <button
          onClick={() => setEditing(true)}
          className="btn-ghost h-8 px-2"
          title="Sửa"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={toggleActive}
          disabled={loading}
          className={`btn-ghost h-8 px-2 ${staff.is_active ? "text-slate-600" : "text-green-600"}`}
          title={staff.is_active ? "Tắt" : "Bật"}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      {editing && <EditModal staff={staff} onClose={() => setEditing(false)} />}
    </>
  );
}

function EditModal({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: staff.full_name,
    hourly_rate: staff.hourly_rate,
    weekend_multiplier: staff.weekend_multiplier,
    holiday_multiplier: staff.holiday_multiplier,
    bank_name: staff.bank_name ?? "",
    bank_account: staff.bank_account ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/staff/${staff.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name,
        hourly_rate: Number(form.hourly_rate),
        weekend_multiplier: Number(form.weekend_multiplier),
        holiday_multiplier: Number(form.holiday_multiplier),
        bank_name: form.bank_name.trim() || null,
        bank_account: form.bank_account.trim() || null,
      }),
    });
    setLoading(false);
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Lỗi");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sửa thông tin nhân viên</h2>
          <button type="button" onClick={onClose} className="btn-ghost h-8 px-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Họ tên">
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </Field>
          <Field label="Đơn giá / giờ">
            <input
              type="number"
              className="input"
              value={form.hourly_rate}
              min={10000}
              max={500000}
              step={1000}
              onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Hệ số cuối tuần">
            <input
              type="number"
              className="input"
              value={form.weekend_multiplier}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setForm({ ...form, weekend_multiplier: Number(e.target.value) })}
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
              onChange={(e) => setForm({ ...form, holiday_multiplier: Number(e.target.value) })}
            />
          </Field>
          <Field label="Ngân hàng">
            <input
              className="input"
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

        <div className="text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">
          Lưu ý: Sửa đơn giá/hệ số chỉ áp dụng cho task được duyệt từ lúc này. Task cũ đã có bảng
          lương giữ nguyên số tiền.
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
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
