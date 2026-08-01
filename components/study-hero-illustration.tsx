/** Simple illustrated scene of students at desks, in brand tones — used for
 * the homepage hero. Deliberately not a photo: a real photo would mean either
 * hotlinking someone else's image without clear usage rights, or relying on
 * an owner's uploaded cover photo, which can be anything (a literal walrus
 * photo showed up in testing) — this way the hero always looks intentional. */
export function StudyHeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 500" className={className} role="img" aria-label="Illustration of students studying at desks">
      <defs>
        <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eaf3ee" />
          <stop offset="100%" stopColor="#f7f1e3" />
        </linearGradient>
      </defs>
      <rect width="600" height="500" fill="url(#hero-bg)" />

      {/* soft depth blobs */}
      <circle cx="500" cy="80" r="120" fill="#2D6A4F" opacity="0.06" />
      <circle cx="60" cy="420" r="140" fill="#D4A017" opacity="0.07" />

      {/* bookshelf backdrop, right */}
      <g opacity="0.5">
        <rect x="470" y="60" width="110" height="380" rx="6" fill="#c9a227" opacity="0.15" />
        {[100, 150, 200, 250, 300, 350].map((y, i) => (
          <rect key={y} x="480" y={y} width={70 + (i % 3) * 10} height="34" rx="3" fill="#2D6A4F" opacity={0.15 + (i % 3) * 0.05} />
        ))}
      </g>

      {/* Desk 1 */}
      <g>
        <rect x="60" y="300" width="170" height="14" rx="4" fill="#8a6b3a" />
        <rect x="70" y="314" width="10" height="70" fill="#6f552c" />
        <rect x="210" y="314" width="10" height="70" fill="#6f552c" />
        {/* laptop */}
        <rect x="100" y="266" width="70" height="46" rx="4" fill="#2D6A4F" />
        <rect x="106" y="272" width="58" height="32" rx="2" fill="#eaf3ee" />
        {/* person */}
        <circle cx="135" cy="230" r="24" fill="#e8b98a" />
        <path d="M95 300c0-30 18-52 40-52s40 22 40 52" fill="#2D6A4F" />
      </g>

      {/* Desk 2 (center) */}
      <g>
        <rect x="255" y="320" width="170" height="14" rx="4" fill="#8a6b3a" />
        <rect x="265" y="334" width="10" height="70" fill="#6f552c" />
        <rect x="405" y="334" width="10" height="70" fill="#6f552c" />
        {/* open book */}
        <path d="M295 300 L335 292 L335 316 L295 324 Z" fill="#fff" stroke="#D4A017" strokeWidth="2" />
        <path d="M335 292 L375 300 L375 324 L335 316 Z" fill="#fff" stroke="#D4A017" strokeWidth="2" />
        {/* lamp */}
        <line x1="400" y1="320" x2="400" y2="260" stroke="#6f552c" strokeWidth="4" />
        <path d="M382 260h36l-8 24h-20Z" fill="#D4A017" />
        {/* person */}
        <circle cx="340" cy="250" r="26" fill="#c98a5b" />
        <path d="M296 320c0-32 20-56 44-56s44 24 44 56" fill="#D4A017" opacity="0.9" />
      </g>

      {/* Desk 3 */}
      <g>
        <rect x="60" y="150" width="140" height="12" rx="4" fill="#8a6b3a" opacity="0.6" />
        <circle cx="130" cy="110" r="18" fill="#e8b98a" opacity="0.7" />
        <path d="M100 150c0-22 13-38 30-38s30 16 30 38" fill="#2D6A4F" opacity="0.55" />
      </g>

      {/* plant */}
      <g transform="translate(440,360)">
        <rect x="-14" y="20" width="28" height="30" rx="4" fill="#8a6b3a" />
        <path d="M0 20c-18-10-22-34-10-46c6 14 10 24 10 46Z" fill="#2D6A4F" />
        <path d="M0 20c18-6 26-28 18-42c-10 12-16 24-18 42Z" fill="#3d8a63" />
      </g>

      {/* floor line */}
      <rect x="0" y="404" width="600" height="2" fill="#2D6A4F" opacity="0.12" />
    </svg>
  );
}
