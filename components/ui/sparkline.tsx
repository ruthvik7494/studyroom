/** Pure-SVG sparkline (polyline) — no charting library dependency. Renders
 * a smooth-looking trend line with a soft fill underneath, matching the
 * reference's revenue/growth trend cards. */
export function Sparkline({ points, color = '#2d6c4f', height = 48 }: { points: number[]; color?: string; height?: number }) {
  if (points.length < 2) return <div style={{ height }} />;
  const width = 200;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((p, i) => [i * step, height - ((p - min) / range) * (height - 6) - 3] as const);
  const line = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const fill = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
      <polygon points={fill} fill={color} opacity={0.12} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
