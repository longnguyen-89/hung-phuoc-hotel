"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2 } from "lucide-react";

type ExtraFee = { name: string; type: "fixed" | "percent"; amount: number };

type Settings = {
  hotel_name: string;
  hotel_address: string | null;
  hotel_phone: string | null;
  hotel_email: string | null;
  tax_code: string | null;
  vat_enabled: boolean;
  vat_rate: number | string;
  service_charge_enabled: boolean;
  service_charge_rate: number | string;
  default_checkin_time: string | null;
  default_checkout_time: string | null;
  overnight_hour_start: number | null;
  overnight_hour_end: number | null;
  currency: string | null;
  invoice_prefix: string | null;
  logo_url: string | null;
  extra_fees_json: ExtraFee[] | null;
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState<Settings>({
    ...initial,
    extra_fees_json: initial.extra_fees_json ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        vat_rate: Number(form.vat_rate),
        service_charge_rate: Number(form.service_charge_rate),
        overnight_hour_start: form.overnight_hour_start ?? null,
        overnight_hour_end: form.overnight_hour_end ?? null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Lỗi không xác định" }));
      setMsg({
        type: "err",
        text: typeof err.error === "string" ? err.error : JSON.stringify(err),
      });
      return;
    }
    setMsg({ type: "ok", text: "Đã lưu cấu hình" });
    router.refresh();
  }

  function addFee() {
    const fees = form.extra_fees_json ?? [];
    setForm({
      ...form,
      extra_fees_json: [...fees, { name: "", type: "fixed", amount: 0 }],
    });
  }
  function updateFee(idx: number, patch: Partial<ExtraFee>) {
    const fees = [...(form.extra_fees_json ?? [])];
    fees[idx] = { ...fees[idx], ...patch };
    setForm({ ...form, extra_fees_json: fees });
  }
  function removeFee(idx: number) {
    const fees = [...(form.extra_fees_json ?? [])];
    fees.splice(idx, 1);
    setForm({ ...form, extra_fees_json: fees });
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Thông tin khách sạn</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Tên khách sạn *">
            <input
              className="input"
              required
              value={form.hotel_name ?? ""}
              onChange={(e) => setForm({ ...form, hotel_name: e.target.value })}
            />
          </Field>
          <Field label="Mã số thuế (MST)">
            <input
              className="input"
              value={form.tax_code ?? ""}
              onChange={(e) => setForm({ ...form, tax_code: e.target.value })}
            />
          </Field>
          <Field label="Địa chỉ" span>
            <input
              className="input"
              value={form.hotel_address ?? ""}
              onChange={(e) => setForm({ ...form, hotel_address: e.target.value })}
            />
          </Field>
          <Field label="Điện thoại">
            <input
              className="input"
              value={form.hotel_phone ?? ""}
              onChange={(e) => setForm({ ...form, hotel_phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="input"
              value={form.hotel_email ?? ""}
              onChange={(e) => setForm({ ...form, hotel_email: e.target.value })}
            />
          </Field>
          <Field label="Logo URL" span>
            <input
              className="input"
              placeholder="https://..."
              value={form.logo_url ?? ""}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Thuế & phí</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={form.vat_enabled}
                onChange={(e) => setForm({ ...form, vat_enabled: e.target.checked })}
              />
              Áp dụng VAT
            </label>
            <Field label="Mức VAT (%)">
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.vat_rate}
                onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
                disabled={!form.vat_enabled}
              />
            </Field>
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={form.service_charge_enabled}
                onChange={(e) =>
                  setForm({ ...form, service_charge_enabled: e.target.checked })
                }
              />
              Phụ phí phục vụ
            </label>
            <Field label="Mức phụ phí (%)">
              <input
                type="number"
                step="0.1"
                className="input"
                value={form.service_charge_rate}
                onChange={(e) =>
                  setForm({ ...form, service_charge_rate: e.target.value })
                }
                disabled={!form.service_charge_enabled}
              />
            </Field>
          </div>
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Phí cố định khác</h3>
            <button type="button" className="btn-secondary text-xs" onClick={addFee}>
              <Plus className="w-3 h-3" />
              Thêm phí
            </button>
          </div>
          {(form.extra_fees_json ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có phí nào.</p>
          ) : (
            <div className="space-y-2">
              {(form.extra_fees_json ?? []).map((f, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_140px_auto] gap-2">
                  <input
                    className="input"
                    placeholder="Tên phí (VD: Phí gửi xe)"
                    value={f.name}
                    onChange={(e) => updateFee(i, { name: e.target.value })}
                  />
                  <select
                    className="input"
                    value={f.type}
                    onChange={(e) =>
                      updateFee(i, { type: e.target.value as "fixed" | "percent" })
                    }
                  >
                    <option value="fixed">Cố định (đ)</option>
                    <option value="percent">Phần trăm (%)</option>
                  </select>
                  <input
                    type="number"
                    className="input"
                    value={f.amount}
                    onChange={(e) =>
                      updateFee(i, { amount: Number(e.target.value) })
                    }
                  />
                  <button
                    type="button"
                    className="btn-ghost text-red-600 h-9 px-2"
                    onClick={() => removeFee(i)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Các phí này sẽ hiển thị như tuỳ chọn khi làm hoá đơn.
          </p>
        </div>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Giờ & hoá đơn</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Giờ check-in mặc định">
            <input
              type="time"
              className="input"
              value={form.default_checkin_time ?? ""}
              onChange={(e) =>
                setForm({ ...form, default_checkin_time: e.target.value })
              }
            />
          </Field>
          <Field label="Giờ check-out mặc định">
            <input
              type="time"
              className="input"
              value={form.default_checkout_time ?? ""}
              onChange={(e) =>
                setForm({ ...form, default_checkout_time: e.target.value })
              }
            />
          </Field>
          <Field label="Giờ bắt đầu ca đêm (0-23)">
            <input
              type="number"
              min={0}
              max={23}
              className="input"
              value={form.overnight_hour_start ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  overnight_hour_start: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
          <Field label="Giờ kết thúc ca đêm (0-23)">
            <input
              type="number"
              min={0}
              max={23}
              className="input"
              value={form.overnight_hour_end ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  overnight_hour_end: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
          <Field label="Đơn vị tiền">
            <input
              className="input"
              value={form.currency ?? "VND"}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </Field>
          <Field label="Tiền tố số hoá đơn">
            <input
              className="input"
              value={form.invoice_prefix ?? ""}
              onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
              placeholder="HP"
            />
          </Field>
        </div>
      </section>

      <div className="flex items-center gap-4 sticky bottom-4">
        <button type="submit" className="btn-primary" disabled={loading}>
          <Save className="w-4 h-4" />
          {loading ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
        {msg && (
          <div
            className={
              msg.type === "ok"
                ? "text-sm text-green-700"
                : "text-sm text-red-700"
            }
          >
            {msg.text}
          </div>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  span,
}: {
  label: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div className={span ? "md:col-span-2" : ""}>
      <label className="text-xs text-slate-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}
