import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const owner = await requireOwner();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("system_settings")
    .select("*")
    .eq("property_id", owner.propertyId)
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Quản trị hệ thống</h1>
        <p className="text-slate-500 text-sm">
          Cấu hình thông tin khách sạn, VAT, phí dịch vụ, hoá đơn…
        </p>
      </div>

      <SettingsForm initial={data ?? defaultSettings()} />
    </div>
  );
}

function defaultSettings() {
  return {
    hotel_name: "Hưng Phước Hotel",
    hotel_address: "",
    hotel_phone: "",
    hotel_email: "",
    tax_code: "",
    vat_enabled: true,
    vat_rate: 10,
    service_charge_enabled: false,
    service_charge_rate: 5,
    default_checkin_time: "14:00",
    default_checkout_time: "12:00",
    overnight_hour_start: 22,
    overnight_hour_end: 9,
    currency: "VND",
    invoice_prefix: "HP",
    logo_url: "",
    extra_fees_json: [],
  };
}
