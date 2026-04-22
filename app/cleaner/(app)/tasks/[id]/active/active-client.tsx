"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

type Photo = { url: string; category: string };

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "bed", label: "Giường + khăn trải" },
  { key: "toilet", label: "WC + bồn cầu" },
  { key: "trash", label: "Thu rác" },
  { key: "amenity", label: "Nước / amenity" },
];

export function ActiveClient({
  taskId,
  roomName,
  startedAt,
}: {
  taskId: string;
  roomName: string;
  startedAt: string;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(startedAt).getTime());
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dirtyLevel, setDirtyLevel] = useState<"light" | "normal" | "heavy">("normal");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - new Date(startedAt).getTime()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("task_id", taskId);
      fd.append("category", category);
      const res = await fetch("/api/cleaner/upload", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Upload thất bại");
        return;
      }
      setPhotos((p) => [...p, { url: body.url, category: body.category }]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    const missing = CHECKLIST_ITEMS.filter((i) => !checklist[i.key]);
    if (missing.length > 0) {
      setError(`Chưa tick: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    if (photos.length === 0) {
      setError("Cần ít nhất 1 ảnh");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklist,
          photos,
          dirty_level: dirtyLevel,
          note: note.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Nộp thất bại");
        return;
      }
      router.push(`/cleaner/tasks/${taskId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Đang dọn</div>
          <div className="text-lg font-bold text-slate-900">{roomName}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Thời gian</div>
          <div className="text-2xl font-mono font-bold text-brand-600 tabular-nums">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-medium text-slate-800 text-sm">Checklist</div>
        {CHECKLIST_ITEMS.map((item) => (
          <label key={item.key} className="flex items-center gap-3 py-2 border-t first:border-t-0">
            <input
              type="checkbox"
              className="w-5 h-5 accent-brand-600"
              checked={!!checklist[item.key]}
              onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))}
            />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-medium text-slate-800 text-sm">Ảnh bằng chứng ({photos.length})</div>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.category} className="w-full h-full object-cover rounded border" />
              <button
                onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label className="aspect-square border-2 border-dashed border-brand-300 rounded flex flex-col items-center justify-center text-brand-600 cursor-pointer hover:bg-brand-50">
            <Camera className="w-6 h-6" />
            <span className="text-xs mt-1">Chụp</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhoto(e, `photo-${photos.length + 1}`)}
              disabled={uploading}
            />
          </label>
        </div>
        {uploading && <div className="text-xs text-slate-500">Đang tải ảnh lên...</div>}
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-medium text-slate-800 text-sm">Mức độ bẩn</div>
        <div className="flex gap-2">
          {(["light", "normal", "heavy"] as const).map((lv) => (
            <button
              key={lv}
              onClick={() => setDirtyLevel(lv)}
              className={`flex-1 py-2 rounded text-sm border ${
                dirtyLevel === lv
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              {lv === "light" ? "Nhẹ" : lv === "normal" ? "Thường" : "Bẩn nặng"}
            </button>
          ))}
        </div>
        <textarea
          className="input min-h-[72px] py-2"
          placeholder="Ghi chú (tuỳ chọn)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <div className="card p-3 bg-red-50 border-red-200 text-sm text-red-700">{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="btn bg-brand-600 text-white hover:bg-brand-700 h-11 px-4 w-full text-base"
      >
        {submitting ? "Đang nộp..." : "Hoàn tất & nộp"}
      </button>
    </div>
  );
}
