import { format, addDays, startOfDay, differenceInMinutes } from "date-fns";
import { vi } from "date-fns/locale";

type RoomLite = {
  id: string;
  name: string;
  room_number?: string | null;
  floor?: number | null;
};
type BookingLite = {
  id: string;
  room_id: string;
  guest_name: string | null;
  checkin_at: string;
  checkout_at: string;
  status: "upcoming" | "checked_in" | "checked_out" | "cancelled";
};

type Props = {
  rooms: RoomLite[];
  bookings: BookingLite[];
};

const DAYS = 7;
const ROW_H = 44;
const HEADER_H = 28;
const CELL_W = 120;

export function GanttView({ rooms, bookings }: Props) {
  const today = startOfDay(new Date());
  const end = addDays(today, DAYS);
  const totalMinutes = DAYS * 24 * 60;
  const totalWidth = DAYS * CELL_W;

  const dayCells = Array.from({ length: DAYS }, (_, i) => addDays(today, i));

  return (
    <div className="overflow-x-auto">
      <div
        className="relative"
        style={{
          width: 160 + totalWidth,
          minHeight: HEADER_H + rooms.length * ROW_H,
        }}
      >
        {/* Header days */}
        <div
          className="absolute top-0 flex border-b text-xs text-slate-500"
          style={{ left: 160, height: HEADER_H }}
        >
          {dayCells.map((d) => (
            <div
              key={d.toISOString()}
              className="border-l px-2 flex items-center font-medium"
              style={{ width: CELL_W }}
            >
              {format(d, "EEE dd/MM", { locale: vi })}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rooms.map((r, idx) => {
          const roomBookings = bookings.filter((b) => b.room_id === r.id);
          const top = HEADER_H + idx * ROW_H;
          return (
            <div
              key={r.id}
              className="absolute left-0 right-0 border-b"
              style={{ top, height: ROW_H }}
            >
              {/* Label */}
              <div
                className="absolute left-0 top-0 w-[160px] h-full flex items-center px-3 font-medium text-sm bg-slate-50 border-r"
                style={{ height: ROW_H }}
              >
                {r.name}
              </div>

              {/* Day grid */}
              <div className="absolute left-[160px] top-0 flex" style={{ height: ROW_H }}>
                {dayCells.map((d) => (
                  <div
                    key={d.toISOString()}
                    className="border-l h-full"
                    style={{ width: CELL_W }}
                  />
                ))}
              </div>

              {/* Booking blocks */}
              {roomBookings.map((b) => {
                const bStart = new Date(b.checkin_at);
                const bEnd = new Date(b.checkout_at);
                if (bEnd < today || bStart > end) return null;

                const clampedStart = bStart < today ? today : bStart;
                const clampedEnd = bEnd > end ? end : bEnd;

                const offsetMin = differenceInMinutes(clampedStart, today);
                const widthMin = differenceInMinutes(clampedEnd, clampedStart);
                const left = 160 + (offsetMin / totalMinutes) * totalWidth;
                const width = Math.max(24, (widthMin / totalMinutes) * totalWidth);

                const color =
                  b.status === "checked_out"
                    ? "bg-slate-400"
                    : b.status === "checked_in"
                    ? "bg-blue-500"
                    : b.status === "cancelled"
                    ? "bg-red-300"
                    : "bg-emerald-500";

                return (
                  <div
                    key={b.id}
                    className={`absolute ${color} text-white text-xs px-2 py-1 rounded shadow-sm truncate`}
                    style={{
                      left,
                      width,
                      top: 6,
                      height: ROW_H - 12,
                      lineHeight: `${ROW_H - 16}px`,
                    }}
                    title={`${b.guest_name} (${b.status})`}
                  >
                    {b.guest_name}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Now line */}
        <div
          className="absolute w-0.5 bg-red-500 top-0 pointer-events-none"
          style={{
            left:
              160 +
              (differenceInMinutes(new Date(), today) / totalMinutes) * totalWidth,
            height: HEADER_H + rooms.length * ROW_H,
          }}
        />
      </div>

      <div className="mt-3 flex gap-3 text-xs text-slate-600">
        <LegendDot color="bg-emerald-500" label="Sắp tới" />
        <LegendDot color="bg-blue-500" label="Đang ở" />
        <LegendDot color="bg-slate-400" label="Đã check-out" />
        <div className="flex items-center gap-1">
          <div className="w-0.5 h-4 bg-red-500" />
          <span>Hiện tại</span>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}
