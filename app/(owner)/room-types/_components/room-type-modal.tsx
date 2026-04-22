"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Initial = {
  id: string;
  code: string;
  name: string;
  price_per_day: number;
  price_per_hour: number;
  price_overnight: number;
  capacity: number;
  max_capacity: number;
  description: string | null;
  business_status: "active" | "inactive" | "selling_service";
};

export function RoomTypeModal({
  mode,
  initial,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: Initial;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [priceDay, setPriceDay] = useState<number>(initial?.price_per_day ?? 0);
  const [priceHour, setPriceHour] = useState<number>(initial?.price_per_hour ?? 0);
  const [priceOvernight, setPriceOvernight] = useState<number>(initial?.price_overnight ?? 0);
  const [capacity, setCapacity] = useState<number>(initial?.capacity ?? 2);
  const [maxCapacity, setMaxCapacity] = useState<number>(initial?.max_capacity ?? 3);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.business_status ?? "active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        code: code.trim(),
        name: name.trim(),
        price_per_day: Number(priceDay) || 0,
        price_per_hour: Number(priceHour) || 0,
        price_overnight: Number(priceOvernight) || 0,
        capacity: Number(capacity) || 0,
        max_capacity: Number(maxCapacity) || 0,
        description: description.trim() || null,
        business_status: status,
      };
      const url = mode === "create" ? "/api/room-types" : `/api/room-types/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Lưu thất bại");
        return;
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Thêm hạng phòng" : `Sửa ${initial?.name}`}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Mã hạng phòng *</label>
              <input
                className="input mt-1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="HP000001"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Trạng thái</label>
              <select
                className="input mt-1"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="active">Đang kinh doanh</option>
                <option value="selling_service">Bán dịch vụ</option>
                <option value="inactive">Ngừng</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tên hạng phòng *</label>
            <input
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PHÒNG STANDARD"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Giá giờ (đ)</label>
              <input
                type="number"
                className="input mt-1"
                value={priceHour}
                onChange={(e) => setPriceHour(Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Giá cả ngày (đ) *</label>
              <input
                type="number"
                className="input mt-1"
                value={priceDay}
                onChange={(e) => setPriceDay(Number(e.target.value))}
                min={0}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Qua đêm (đ)</label>
              <input
                type="number"
                className="input mt-1"
                value={priceOvernight}
                onChange={(e) => setPriceOvernight(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Sức chứa tiêu chuẩn</label>
              <input
                type="number"
                className="input mt-1"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                min={0}
                max={20}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Sức chứa tối đa</label>
              <input
                type="number"
                className="input mt-1"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(Number(e.target.value))}
                min={0}
                max={20}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Mô tả</label>
            <textarea
              className="input mt-1 min-h-[72px] py-2"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú về hạng phòng, tiện nghi..."
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Huỷ
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Đang lưu..." : mode === "create" ? "Tạo mới" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
