"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CleanerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cleaner/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Đăng nhập thất bại");
        return;
      }
      router.push("/cleaner/tasks");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🧹</div>
          <h1 className="text-2xl font-bold text-brand-700">Cleaner App</h1>
          <p className="text-sm text-slate-500 mt-1">Hưng Phước Hotel</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="09xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || phone.length < 8}
            className="btn bg-brand-600 text-white hover:bg-brand-700 h-10 px-4 w-full"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-100">
            <div className="font-medium mb-1">Tài khoản demo:</div>
            <div>Cô Mai — 0900000002</div>
            <div>Cô Hồng — 0900000003</div>
          </div>
        </form>
      </div>
    </div>
  );
}
