"use client";

type DailyPoint = { date: string; revenue: number; occupancy: number };

export function OccupancyChart({ data }: { data: DailyPoint[] }) {
  const W = 560;
  const H = 180;
  const pad = { top: 14, right: 8, bottom: 28, left: 28 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(1, data.length - 1)) * innerW;
    const y = pad.top + innerH - (d.occupancy / 100) * innerH;
    return { x, y, ...d };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area =
    path +
    ` L${points[points.length - 1]?.x.toFixed(1) ?? pad.left} ${pad.top + innerH} L${
      points[0]?.x.toFixed(1) ?? pad.left
    } ${pad.top + innerH} Z`;

  const avg =
    data.reduce((s, d) => s + d.occupancy, 0) / (data.length || 1);

  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">
        Trung bình 14 ngày:{" "}
        <span className="text-slate-800 font-semibold">{avg.toFixed(1)}%</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* y gridlines */}
        {[0, 25, 50, 75, 100].map((g) => {
          const y = pad.top + innerH - (g / 100) * innerH;
          return (
            <g key={g}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y}
                y2={y}
                className="stroke-slate-200"
                strokeDasharray="2 3"
              />
              <text
                x={pad.left - 4}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-400"
                fontSize={9}
              >
                {g}
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <>
            <path d={area} className="fill-brand-500/20" />
            <path d={path} className="stroke-brand-600 fill-none" strokeWidth={2} />
          </>
        )}

        {points.map((p) => (
          <g key={p.date}>
            <title>
              {p.date} — {p.occupancy}%
            </title>
            <circle cx={p.x} cy={p.y} r={2.5} className="fill-brand-700" />
          </g>
        ))}

        {/* x labels every other */}
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={p.date}
              x={p.x}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize={10}
            >
              {p.date.slice(5)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
