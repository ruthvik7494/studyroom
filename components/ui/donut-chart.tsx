interface Segment { label: string; value: number; color: string }

/** Pure-SVG donut chart (stroke-dasharray technique) — no charting library
 * dependency, so nothing new to install. Shows the total in the center. */
export function DonutChart({ segments, size = 120 }: { segments: Segment[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth={14} />
        {total > 0 && segments.map((seg) => {
          if (seg.value === 0) return null;
          const fraction = seg.value / total;
          const dash = fraction * circumference;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={seg.color} strokeWidth={14}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-extrabold">{total}</span>
        <span className="text-[10px] text-muted-foreground">Total</span>
      </div>
    </div>
  );
}

export function DonutLegend({ segments }: { segments: Segment[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {segments.map((seg) => (
        <li key={seg.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} aria-hidden />
          <span className="text-muted-foreground">{seg.value} {seg.label}</span>
        </li>
      ))}
    </ul>
  );
}
