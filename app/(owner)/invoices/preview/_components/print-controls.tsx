"use client";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, Save } from "lucide-react";
import { useState } from "react";

export function PrintControls({
  bookingId,
  code,
}: {
  bookingId: string;
  code: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveInvoice() {
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Lỗi" }));
      alert("Lỗi: " + (typeof err.error === "string" ? err.error : JSON.stringify(err)));
      return;
    }
    setSaved(true);
  }

  return (
    <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="max-w-3xl mx-auto flex justify-between items-center p-3">
        <button onClick={() => router.back()} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>
        <div className="text-sm text-slate-600">
          Hoá đơn <span className="font-mono font-semibold">{code}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveInvoice}
            disabled={saving || saved}
            className="btn-secondary"
          >
            <Save className="w-4 h-4" />
            {saved ? "Đã lưu" : saving ? "Đang lưu…" : "Lưu hoá đơn"}
          </button>
          <button onClick={() => window.print()} className="btn-primary">
            <Printer className="w-4 h-4" />
            In / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
