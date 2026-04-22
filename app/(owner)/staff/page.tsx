import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { fmtVnd } from "@/lib/utils/format";
import { NewStaffForm } from "./_components/new-staff-form";
import { StaffRowActions } from "./_components/staff-row-actions";

export const dynamic = "force-dynamic";

type StaffRow = {
  id: string;
  user_id: string;
  hourly_rate: number;
  weekend_multiplier: number;
  holiday_multiplier: number;
  bank_name: string | null;
  bank_account: string | null;
  app_users: {
    id: string;
    full_name: string;
    phone: string;
    is_active: boolean;
  };
};

export default async function StaffPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("staff_profiles")
    .select("*, app_users!inner(id, full_name, phone, is_active)")
    .eq("property_id", owner.propertyId);
  const staff = (data ?? []) as unknown as StaffRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Nhân viên dọn phòng</h1>
          <p className="text-slate-500 text-sm">
            {staff.length} nhân viên trong homestay
          </p>
        </div>
        <NewStaffForm />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Họ tên</th>
              <th className="p-3">SĐT</th>
              <th className="p-3">Đơn giá / giờ</th>
              <th className="p-3">Hệ số CT</th>
              <th className="p-3">Hệ số lễ</th>
              <th className="p-3">Ngân hàng</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.app_users.full_name}</td>
                <td className="p-3 text-slate-600">{s.app_users.phone}</td>
                <td className="p-3">{fmtVnd(s.hourly_rate)}</td>
                <td className="p-3 text-slate-600">
                  x{Number(s.weekend_multiplier).toFixed(2)}
                </td>
                <td className="p-3 text-slate-600">
                  x{Number(s.holiday_multiplier).toFixed(2)}
                </td>
                <td className="p-3 text-slate-600">
                  {s.bank_name ? (
                    <>
                      {s.bank_name}
                      {s.bank_account ? ` — ${s.bank_account}` : ""}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="p-3">
                  {s.app_users.is_active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      Đang làm
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Đã nghỉ
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <StaffRowActions
                    staff={{
                      user_id: s.user_id,
                      full_name: s.app_users.full_name,
                      is_active: s.app_users.is_active,
                      hourly_rate: s.hourly_rate,
                      weekend_multiplier: Number(s.weekend_multiplier),
                      holiday_multiplier: Number(s.holiday_multiplier),
                      bank_name: s.bank_name,
                      bank_account: s.bank_account,
                    }}
                  />
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Chưa có nhân viên. Bấm <strong>Thêm nhân viên</strong> để bắt đầu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
