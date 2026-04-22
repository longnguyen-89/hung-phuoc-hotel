"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type RoomTypeOption = {
  id: string;
  code: string;
  name: string;
  price_per_day: number;
  price_per_hour: number;
  price_overnight: number;
};

export type RoomInitial = {
  id: string;
  name: string;
  room_number: string | null;
  floor: number | null;
  room_type_id: string | null;
  price_per_day: number | null;
  price_per_hour: number | null;
  price_overnight: number | null;
  default_clean_minutes: number;
  business_status: string;
};

export function RoomModal({
  mode,
  initial,
  roomTypes,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: RoomInitial;
  roomTypes: RoomTypeOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [roomNumber, setRoomNumber] = useState(initial?.room_number ?? "");
  const [floor, setFloor] = useState<string>(
    initial?.floor != null ? String(initial.floor) : ""
  );
  const [typeId, setTypeId] = useState(initial?.room_type_id ?? "");
  const [overrideDay, setOverrideDay] = useState<string>(
    initial?.price_per_day != null ? String(initial.price_per_day) : ""
  );
  const [overrideHour, setOverrideHour] = useState<string>(
    initial?.price_per_hour != null ? String(initial.price_per_hour) : ""
  );
  const [overrideOvernight, setOverrideOvernight] = useState<string>(
    initial?.price_overnight != null ? String(initial.price_overnight) : ""
  );
  const [minutes, setMinutes] = useState<number>(initial?.default_clean_minutes ?? 45);
  const [status, setStatus] = useState<string>(initial?.business_status ?? "active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = roomTypes.find((t) => t.id === typeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        room_number: roomNumber.trim() || null,
        floor: floor === "" ? null : Number(floor),
        room_type_id: typeId || null,
        default_clean_minutes: minutes,
        price_per_day: overrideDay === "" ? null : Number(overrideDay),
        price_per_hour: overrideHour === "" ? null : Number(overrideHour),
        price_overnight: overrideOvernight === "" ? null : Number(overrideOvernight),
        business_status: status,
      };
      // create mode can't accept null room_number in schema path
      if (mode === "create" && !body.room_number) delete body.room_number;

      const url = mode === "create" ? "/api/rooms" : `/api/rooms/${initial!.id}`;
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
            {mode === "create" ? "Thêm phòng" : `Sửa ${initial?.name}`}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Số phòng</label>
              <input
                className="input mt-1"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="501"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tầng</label>
              <input
                type="number"
                className="input mt-1"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                min={0}
                max={50}
                placeholder="5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phút dọn</label>
              <input
                type="number"
                className="input mt-1"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value) || 45)}
                min={10}
                max={240}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tên phòng hiển thị *</label>
            <input
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="P.501"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Hạng phòng</label>
            <select
              className="input mt-1"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              <option value="">— Không chọn —</option>
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </option>
              ))}
            </select>
            {selectedType && (
              <div className="text-xs text-slate-500 mt-1">
                Giá mặc định từ hạng: {selectedType.price_per_day.toLocaleString("vi-VN")}đ/ngày ·{" "}
                {selectedType.price_per_hour.toLocaleString("vi-VN")}đ/giờ
              </div>
            )}
          </div>

          <div className="border rounded p-3 space-y-3 bg-slate-50">
            <div className="text-sm font-medium text-slate-700">
              Giá riêng cho phòng này (bỏ trống = dùng giá hạng)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-600">Giá giờ</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={overrideHour}
                  onChange={(e) => setOverrideHour(e.target.value)}
                  min={0}
                  placeholder="để trống = theo hạng"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Giá cả ngày</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={overrideDay}
                  onChange={(e) => setOverrideDay(e.target.value)}
                  min={0}
                  placeholder="để trống = theo hạng"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Qua đêm</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={overrideOvernight}
                  onChange={(e) => setOverrideOvernight(e.target.value)}
                  min={0}
                  placeholder="để trống = theo hạng"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tình trạng kinh doanh</label>
            <select
              className="input mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">Đang kinh doanh</option>
              <option value="selling_service">Bán dịch vụ</option>
              <option value="inactive">Ngừng</option>
            </select>
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
