// Tính giá booking cho Hưng Phước Hotel.
// Gồm: daily/hourly, VAT, service charge, discount.
//
// Input: giá phòng hiệu lực + config settings + thời gian checkin/out
// Output: nights, hours, room_charge, vat_amount, service_charge, total

export type BookingPriceInput = {
  booking_type: "daily" | "hourly";
  checkin_at: string; // ISO
  checkout_at: string; // ISO
  unit_price: number; // giá/ngày hoặc giá/giờ
  discount_amount?: number;
  vat_rate?: number; // %
  service_charge_rate?: number; // %
};

export type BookingPriceResult = {
  nights: number;
  hours: number;
  room_charge: number;
  discount_amount: number;
  service_charge: number;
  vat_amount: number;
  total_amount: number;
};

export function computeBookingPrice(input: BookingPriceInput): BookingPriceResult {
  const inDate = new Date(input.checkin_at);
  const outDate = new Date(input.checkout_at);
  const msDiff = Math.max(0, outDate.getTime() - inDate.getTime());

  let nights = 0;
  let hours = 0;
  let roomCharge = 0;

  if (input.booking_type === "daily") {
    nights = Math.max(1, Math.ceil(msDiff / (24 * 60 * 60 * 1000)));
    roomCharge = nights * input.unit_price;
  } else {
    hours = Math.max(1, Math.ceil(msDiff / (60 * 60 * 1000) * 100) / 100);
    roomCharge = Math.round(hours * input.unit_price);
  }

  const discount = Math.max(0, input.discount_amount ?? 0);
  const afterDiscount = Math.max(0, roomCharge - discount);
  const serviceChargeRate = input.service_charge_rate ?? 0;
  const serviceCharge = Math.round((afterDiscount * serviceChargeRate) / 100);
  const taxable = afterDiscount + serviceCharge;
  const vatRate = input.vat_rate ?? 0;
  const vatAmount = Math.round((taxable * vatRate) / 100);
  const total = taxable + vatAmount;

  return {
    nights,
    hours,
    room_charge: roomCharge,
    discount_amount: discount,
    service_charge: serviceCharge,
    vat_amount: vatAmount,
    total_amount: total,
  };
}
