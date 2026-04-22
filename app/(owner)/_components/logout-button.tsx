"use client";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => logout())}
      disabled={pending}
      className="mt-2 flex items-center gap-1.5 text-xs text-brand-100 hover:text-white disabled:opacity-50"
    >
      <LogOut className="w-3 h-3" />
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  );
}
