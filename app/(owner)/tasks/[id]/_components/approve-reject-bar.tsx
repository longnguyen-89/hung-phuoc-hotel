"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";

export function ApproveRejectBar({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/approve`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      alert("Lỗi: " + (await res.text()));
      return;
    }
    router.refresh();
  }

  async function reject() {
    const reason = prompt("Lý do từ chối?");
    if (!reason) return;
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setLoading(false);
    if (!res.ok) {
      alert("Lỗi: " + (await res.text()));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={reject}
        disabled={loading}
        className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
      >
        <X className="w-4 h-4" />
        Từ chối
      </button>
      <button
        onClick={approve}
        disabled={loading}
        className="btn-primary bg-green-600 hover:bg-green-700"
      >
        <Check className="w-4 h-4" />
        Duyệt & tính lương
      </button>
    </div>
  );
}
