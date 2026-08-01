/** Tall "reading corner" illustration — bookshelf, chair, plant — for the
 * "Why Choose" section. Same reasoning as the hero illustration: a hand-built
 * SVG avoids hotlinking an unlicensed photo and never depends on unpredictable
 * owner-uploaded content. */
export function ReadingCornerIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 520" className={className} role="img" aria-label="Illustration of a cozy reading corner with a bookshelf and chair">
      <defs>
        <linearGradient id="corner-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaf3ee" />
          <stop offset="100%" stopColor="#dcebe2" />
        </linearGradient>
      </defs>
      <rect width="400" height="520" fill="url(#corner-bg)" />

      {/* window */}
      <rect x="230" y="40" width="130" height="160" rx="6" fill="#fff" opacity="0.6" />
      <line x1="295" y1="40" x2="295" y2="200" stroke="#2D6A4F" strokeWidth="3" opacity="0.3" />
      <line x1="230" y1="120" x2="360" y2="120" stroke="#2D6A4F" strokeWidth="3" opacity="0.3" />

      {/* bookshelf */}
      <rect x="30" y="60" width="150" height="300" rx="6" fill="#8a6b3a" opacity="0.85" />
      {[80, 140, 200, 260, 320].map((y) => (
        <rect key={y} x="30" y={y} width="150" height="8" fill="#6f552c" />
      ))}
      {[
        { x: 42, w: 18, c: '#2D6A4F' }, { x: 64, w: 14, c: '#D4A017' }, { x: 82, w: 20, c: '#3d8a63' }, { x: 106, w: 16, c: '#c9a227' }, { x: 126, w: 22, c: '#2D6A4F' }, { x: 152, w: 14, c: '#D4A017' },
      ].map((b, i) => (
        <rect key={`r1-${i}`} x={b.x} y={92} width={b.w} height={44} fill={b.c} opacity="0.8" rx="1" />
      ))}
      {[
        { x: 46, w: 20, c: '#D4A017' }, { x: 70, w: 16, c: '#2D6A4F' }, { x: 90, w: 22, c: '#c9a227' }, { x: 116, w: 18, c: '#3d8a63' }, { x: 138, w: 24, c: '#2D6A4F' },
      ].map((b, i) => (
        <rect key={`r2-${i}`} x={b.x} y={152} width={b.w} height={44} fill={b.c} opacity="0.8" rx="1" />
      ))}
      {[
        { x: 44, w: 18, c: '#3d8a63' }, { x: 66, w: 22, c: '#c9a227' }, { x: 92, w: 16, c: '#2D6A4F' }, { x: 112, w: 20, c: '#D4A017' }, { x: 136, w: 26, c: '#3d8a63' },
      ].map((b, i) => (
        <rect key={`r3-${i}`} x={b.x} y={212} width={b.w} height={44} fill={b.c} opacity="0.8" rx="1" />
      ))}

      {/* armchair */}
      <g transform="translate(210,300)">
        <rect x="0" y="60" width="130" height="80" rx="14" fill="#2D6A4F" />
        <rect x="-14" y="30" width="30" height="100" rx="12" fill="#2D6A4F" opacity="0.85" />
        <rect x="114" y="30" width="30" height="100" rx="12" fill="#2D6A4F" opacity="0.85" />
        <rect x="-6" y="-30" width="142" height="90" rx="16" fill="#3d8a63" />
        <rect x="10" y="140" width="14" height="30" fill="#6f552c" />
        <rect x="106" y="140" width="14" height="30" fill="#6f552c" />
      </g>

      {/* side table + book */}
      <g transform="translate(120,380)">
        <rect x="0" y="40" width="70" height="8" rx="3" fill="#8a6b3a" />
        <rect x="6" y="48" width="8" height="50" fill="#6f552c" />
        <rect x="56" y="48" width="8" height="50" fill="#6f552c" />
        <rect x="10" y="20" width="50" height="18" rx="2" fill="#fff" stroke="#D4A017" strokeWidth="2" />
        <rect x="14" y="14" width="42" height="10" rx="2" fill="#D4A017" opacity="0.8" />
      </g>

      {/* plant */}
      <g transform="translate(340,420)">
        <rect x="-16" y="20" width="32" height="34" rx="4" fill="#8a6b3a" />
        <path d="M0 20c-20-12-24-38-10-52c6 16 10 28 10 52Z" fill="#2D6A4F" />
        <path d="M0 20c20-8 28-32 18-46c-10 14-16 26-18 46Z" fill="#3d8a63" />
      </g>

      {/* floor */}
      <rect x="0" y="470" width="400" height="50" fill="#2D6A4F" opacity="0.08" />
    </svg>
  );
}
