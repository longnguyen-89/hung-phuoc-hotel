import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignupAllowed } from "@/lib/auth";
import { SignupForm } from "./_components/signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const canSignup = await isSignupAllowed();
  if (!canSignup) redirect("/login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏨</div>
          <h1 className="text-2xl font-bold text-brand-700">
            Đăng ký chủ khách sạn
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tạo tài khoản đầu tiên cho Hưng Phước Hotel
          </p>
        </div>

        <SignupForm />

        <div className="mt-6 text-center text-sm text-slate-500 border-t pt-4">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-brand-600 hover:underline font-semibold">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
