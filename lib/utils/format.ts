import { format, formatDistanceToNow, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export function fmtVnd(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0đ";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "dd/MM HH:mm", { locale: vi });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "dd/MM/yyyy", { locale: vi });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "HH:mm", { locale: vi });
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: vi });
}

export function fmtDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h}h${m}p`;
}
