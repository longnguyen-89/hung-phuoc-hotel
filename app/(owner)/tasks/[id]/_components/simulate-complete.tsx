"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export function SimulateCompleteButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function simulate() {
    if (
      !confirm(
        "Mô phỏng cleaner hoàn thành task (DEV ONLY)? Sẽ tạo ảnh giả + checklist đủ."
      )
    )
      return;
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/simulate-complete`, {
      method: "POST",
    });
    setLoading(false);
    if (!res.ok) {
      alert("Lỗi: " + (await res.text()));
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={simulate}
      disabled={loading}
      className="btn-secondary"
      title="Phase 3 sẽ có Cleaner PWA thật thay cho nút này"
    >
      <Sparkles className="w-4 h-4" />
      {loading ? "Đang mô phỏng…" : "Mô phỏng cleaner hoàn thành"}
    </button>
  );
}
