import { haversineMeters } from "@/lib/utils/geo";

export type CheckInInput = {
  qrToken: string;
  roomQrToken: string;
  gps: { lat: number; lng: number } | null;
  property: { latitude: number | null; longitude: number | null; geofence_radius_m: number };
};

export type CheckInResult =
  | { ok: true; distanceM: number | null }
  | { ok: false; code: "wrong_qr" | "no_gps" | "out_of_range" | "property_no_coord"; message: string; distanceM?: number };

// BR-03: QR của phòng phải đúng + GPS phải trong bán kính geofence của property
export function validateCheckIn(input: CheckInInput): CheckInResult {
  if (input.qrToken !== input.roomQrToken) {
    return { ok: false, code: "wrong_qr", message: "Mã QR không khớp với phòng này" };
  }

  if (!input.gps) {
    return { ok: false, code: "no_gps", message: "Chưa lấy được vị trí GPS" };
  }

  const { latitude, longitude, geofence_radius_m } = input.property;
  if (latitude == null || longitude == null) {
    // Property chưa cấu hình tọa độ → cho qua, nhưng log cảnh báo
    return { ok: true, distanceM: null };
  }

  const distanceM = haversineMeters(input.gps.lat, input.gps.lng, Number(latitude), Number(longitude));
  if (distanceM > geofence_radius_m) {
    return {
      ok: false,
      code: "out_of_range",
      message: `Bạn đang cách homestay ${Math.round(distanceM)}m (cho phép ${geofence_radius_m}m)`,
      distanceM,
    };
  }

  return { ok: true, distanceM };
}
