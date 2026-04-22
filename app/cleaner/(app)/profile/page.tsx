import { redirect } from "next/navigation";
import { getCleanerSession } from "@/lib/cleaner-session";
import { fmtVnd } from "@/lib/utils/format";
import { LogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCleanerSession();
  if (!session) redirect("/cleaner/login");

  const { user, profile } = session;

  return (
    <div className="p-4 space-y-4">
      <div className="card p-4 space-y-2">
        <div className="text-lg font-bold">{user.full_name}</div>
        <div className="text-sm text-slate-600">SĐT: {user.phone ?? "—"}</div>
      </div>

      <div className="card p-4 space-y-2">
        <div className="text-sm font-medium text-slate-700">Mức lương</div>
        <div className="text-sm text-slate-600">
          Cơ bản: <span className="font-medium">{fmtVnd(Number(profile.hourly_rate))}/giờ</span>
        </div>
        <div className="text-sm text-slate-600">
          Hệ số T7/CN: x{Number(profile.weekend_multiplier).toFixed(2)}
        </div>
        <div className="text-sm text-slate-600">
          Hệ số ngày lễ: x{Number(profile.holiday_multiplier).toFixed(2)}
        </div>
      </div>

      {profile.bank_name && (
        <div className="card p-4 space-y-1">
          <div className="text-sm font-medium text-slate-700">Tài khoản nhận lương</div>
          <div className="text-sm text-slate-600">
            {profile.bank_name} · {profile.bank_account ?? "—"}
          </div>
        </div>
      )}

      <LogoutButton />
    </div>
  );
}
