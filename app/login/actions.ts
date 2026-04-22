"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isSignupAllowed } from "@/lib/auth";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Vui lòng nhập email và mật khẩu" };
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    const msg =
      error.message === "Invalid login credentials"
        ? "Email hoặc mật khẩu không đúng"
        : error.message;
    return { error: msg };
  }

  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const allowed = await isSignupAllowed();
  if (!allowed) {
    return {
      error:
        "Đăng ký đã đóng. Khách sạn này đã có chủ sở hữu. Vui lòng dùng trang đăng nhập.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password) {
    return { error: "Vui lòng nhập email và mật khẩu" };
  }
  if (password.length < 8) {
    return { error: "Mật khẩu phải có ít nhất 8 ký tự" };
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email },
    },
  });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function logout() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
