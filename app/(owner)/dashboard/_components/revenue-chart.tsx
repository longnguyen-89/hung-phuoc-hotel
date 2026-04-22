"use client";
import { fmtVnd } from "@/lib/utils/format";

type DailyPoint = { date: string; revenue: number; occupancy: number };

export function RevenueChart({ data }: { data: DailyPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const W = 560;
  const H = 180;
  const pad = { top: 10, right: 8, bottom: 28, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const barW = innerW / data.length - 6;
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const avg = total / (data.length || 1);

  return (
    <div>
      <div className="flex gap-6 text-xs text-slate-500 mb-1">
        <div>
          Tổng: <span className="text-slate-800 font-semibold">{fmtVnd(total)}</span>
        </div>
        <div>
          TB/ngày: <span className="text-slate-800 font-semibold">{fmtVnd(avg)}</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((d, i) => {
          const h = (d.revenue / max) * innerH;
          const x = pad.left + i * (innerW / data.length) + 3;
          const y = pad.top + innerH - h;
          const label = d.date.slice(5);
          return (
            <g key={d.date}>
              <title>
                {d.date} — {fmtVnd(d.revenue)}
              </title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2}
                className="fill-brand-500"
              />
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-slate-500"
                fontSize={10}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
