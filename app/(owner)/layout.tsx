import Link from "next/link";
import {
  Home,
  BedDouble,
  CalendarDays,
  ClipboardList,
  Users,
  Wallet,
  Smartphone,
  LayoutGrid,
  BarChart3,
  Settings,
  Tags,
  FileText,
} from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { LogoutButton } from "./_components/logout-button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/rooms-map", label: "Sơ đồ phòng", icon: LayoutGrid },
  { href: "/room-types", label: "Hạng phòng", icon: Tags },
  { href: "/rooms", label: "Phòng", icon: BedDouble },
  { href: "/bookings", label: "Đặt phòng", icon: CalendarDays },
  { href: "/reports", label: "Báo cáo", icon: BarChart3 },
  { href: "/invoices", label: "Hóa đơn", icon: FileText },
  { href: "/tasks", label: "Task dọn", icon: ClipboardList },
  { href: "/staff", label: "Nhân viên", icon: Users },
  { href: "/payroll", label: "Bảng lương", icon: Wallet },
  { href: "/settings", label: "Cấu hình", icon: Settings },
];

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const owner = await requireOwner();

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="bg-brand-600 text-brand-50 p-4 flex flex-col gap-1">
        <div className="px-2 py-3 mb-2">
          <div className="text-lg font-bold">🏨 Hưng Phước Hotel</div>
          <div className="text-xs text-brand-100">
            Hệ thống quản lý khách sạn
          </div>
        </div>
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-brand-700 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto space-y-2">
          <Link
            href="/cleaner"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-brand-800 hover:bg-brand-900 text-brand-50"
          >
            <Smartphone className="w-4 h-4" />
            Mở Cleaner App
          </Link>
          <div className="px-3 py-2 text-xs text-brand-100 border-t border-brand-500 pt-3">
            <div className="font-semibold">{owner.fullName}</div>
            <div className="truncate opacity-80">{owner.email}</div>
            <LogoutButton />
          </div>
        </div>
      </aside>
      <main className="overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
