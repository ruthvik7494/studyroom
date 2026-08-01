'use client';
import { useState } from 'react';

export interface Testimonial {
  id: string;
  name: string;
  avatarUrl: string | null;
  rating: number;
  body: string;
  centreName: string;
  centreSlug: string;
}

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  if (items.length === 0) return null;

  const t = items[index]!;
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);
  const initial = (t.name || 'S').charAt(0).toUpperCase();

  return (
    <div className="relative rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      {items.length > 1 && (
        <div className="absolute right-6 top-6 flex gap-2">
          <button type="button" onClick={prev} aria-label="Previous testimonial" className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80">←</button>
          <button type="button" onClick={next} aria-label="Next testimonial" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">→</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {t.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{initial}</span>
        )}
        <div>
          <p className="font-display font-bold">{t.name}</p>
          <p className="text-sm text-muted-foreground">Student</p>
        </div>
      </div>

      <p className="mt-6 font-display text-lg font-bold text-brand-gold2 sm:text-xl" aria-label={`${t.rating} out of 5 stars`}>
        {'★'.repeat(t.rating)}<span className="text-muted-foreground/30">{'★'.repeat(5 - t.rating)}</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-foreground/80">&ldquo;{t.body}&rdquo;</p>

      <a href={`/centres/${t.centreSlug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground" aria-hidden>★</span>
        {t.centreName}
      </a>
    </div>
  );
}
