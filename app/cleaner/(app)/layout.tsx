import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Wallet, User } from "lucide-react";
import { getCleanerSession } from "@/lib/cleaner-session";

const tabs = [
  { href: "/cleaner/tasks", label: "Task", icon: ClipboardList },
  { href: "/cleaner/earnings", label: "Lương", icon: Wallet },
  { href: "/cleaner/profile", label: "Tài khoản", icon: User },
];

export default async function CleanerAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCleanerSession();
  if (!session) redirect("/cleaner/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-600 text-white px-4 py-3 sticky top-0 z-10 shadow">
        <div className="text-sm opacity-90">Xin chào</div>
        <div className="text-lg font-bold">{session.user.full_name}</div>
      </header>
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 grid grid-cols-3 z-10">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center gap-0.5 py-2.5 text-slate-600 hover:text-brand-600"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
