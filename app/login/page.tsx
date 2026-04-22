import Link from "next/link";
import { isSignupAllowed } from "@/lib/auth";
import { LoginForm } from "./_components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const canSignup = await isSignupAllowed();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏨</div>
          <h1 className="text-2xl font-bold text-brand-700">Hưng Phước Hotel</h1>
          <p className="text-slate-500 text-sm mt-1">
            Đăng nhập vào hệ thống quản lý
          </p>
        </div>

        <LoginForm />

        {canSignup && (
          <div className="mt-6 text-center text-sm text-slate-500 border-t pt-4">
            Khách sạn chưa có chủ sở hữu?{" "}
            <Link
              href="/signup"
              className="text-brand-600 hover:underline font-semibold"
            >
              Đăng ký lần đầu
            </Link>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link
            href="/cleaner/login"
            className="text-xs text-slate-400 hover:text-brand-600"
          >
            Nhân viên dọn phòng → đăng nhập tại đây
          </Link>
        </div>
      </div>
    </div>
  );
}
