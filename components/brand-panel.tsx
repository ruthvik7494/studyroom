import Image from 'next/image';

const FEATURES = [
  { icon: '🪑', bg: 'bg-primary/10', label: 'Live Seat Availability', body: 'Real-time seat status before you book.' },
  { icon: '⭐', bg: 'bg-brand-gold2/10', label: 'Verified Reviews', body: 'Honest reviews from real students.' },
  { icon: '⚡', bg: 'bg-brand-plum/10', label: 'Instant Booking', body: 'Book your seat instantly and get confirmed.' },
  { icon: '🛡', bg: 'bg-blue-500/10', label: 'Women-Safe Spaces', body: 'Verified safe spaces for women.' },
];

export interface BrandPanelStats { students: number; centres: number; avgRating: string | null }

/**
 * Branded panel for the right side of the login page — a real provided photo
 * as the background, with the headline/feature grid/stats overlaid. Stats
 * are passed in from the page (which has DB access) rather than fetched
 * here, so this stays a simple, reusable presentational component.
 */
export function BrandPanel({ className = '', stats }: { className?: string; stats?: BrandPanelStats }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src="/images/login-desk.png" alt="A calm, well-lit home study desk" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />

      <div className="relative flex h-full flex-col justify-end p-10">
        <h2 className="max-w-md font-display text-3xl font-bold leading-tight text-foreground">
          Find your perfect<br />study space in <span className="text-primary">Warangal</span>
        </h2>
        <p className="mt-3 max-w-sm text-sm text-foreground/70">
          Compare study halls, reading rooms and coworking desks — with real-time seats, verified reviews and transparent pricing.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="rounded-xl bg-background/90 p-3 shadow-sm backdrop-blur">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${f.bg}`} aria-hidden>{f.icon}</span>
              <p className="mt-2 text-sm font-bold text-foreground">{f.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        {stats && (
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-background/90 px-4 py-3 text-sm shadow-sm backdrop-blur">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden>👥</span><strong>{stats.students}+</strong> Happy Students</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden>✓</span><strong>{stats.centres}+</strong> Verified Centres</span>
            {stats.avgRating && <span className="inline-flex items-center gap-1.5"><span aria-hidden>👍</span><strong>{stats.avgRating}/5</strong> Average Rating</span>}
          </div>
        )}
      </div>
    </div>
  );
}
