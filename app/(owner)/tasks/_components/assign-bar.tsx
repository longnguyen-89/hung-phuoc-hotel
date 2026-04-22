"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

type Cleaner = { id: string; name: string };

export function AssignBar({
  taskId,
  cleaners,
}: {
  taskId: string;
  cleaners: Cleaner[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function assign(body: Record<string, unknown>) {
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      alert("Lỗi: " + (await res.text()));
      return;
    }
    setPickerOpen(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1 items-center">
      <button
        onClick={() => assign({ auto: true })}
        disabled={loading}
        className="btn-primary h-7 text-xs px-2"
        title="Auto-assign theo workload"
      >
        <Zap className="w-3 h-3" />
        Auto
      </button>
      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        disabled={loading}
        className="btn-secondary h-7 text-xs px-2"
      >
        Chọn…
      </button>
      {pickerOpen && (
        <select
          className="input h-7 text-xs"
          onChange={(e) => e.target.value && assign({ cleaner_id: e.target.value })}
          defaultValue=""
        >
          <option value="" disabled>
            Chọn cleaner
          </option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
