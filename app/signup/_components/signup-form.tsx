"use client";
import { useState, useTransition } from "react";
import { signup } from "../../login/actions";
import { UserPlus } from "lucide-react";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Họ và tên
        </label>
        <input
          name="full_name"
          type="text"
          required
          autoComplete="name"
          className="input"
          placeholder="Chị Lan"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="owner@hungphuoc-hotel.vn"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Mật khẩu (tối thiểu 8 ký tự)
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full justify-center"
      >
        <UserPlus className="w-4 h-4" />
        {pending ? "Đang tạo tài khoản…" : "Đăng ký chủ khách sạn"}
      </button>
    </form>
  );
}
