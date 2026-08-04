'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE_OUT, DURATION } from '@/lib/motion';

export interface Testimonial {
  id: string;
  name: string;
  avatarUrl: string | null;
  rating: number;
  body: string;
  centreName: string;
  centreSlug: string;
}

const PER_PAGE = 3;
const AUTO_ADVANCE_MS = 6000;

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/**
 * Testimonial slider — a page of up to 3 cards at a time, with dot
 * navigation below and a soft crossfade+slide between pages. Auto-advances
 * every 6s when there's more than one page, pausing while the person's
 * pointer is over it so it doesn't shift mid-read.
 */
export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const pages = chunk(items, PER_PAGE);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (pages.length <= 1 || paused) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pages.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [pages.length, paused]);

  if (items.length === 0) return null;
  const current = pages[Math.min(page, pages.length - 1)] ?? [];

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {current.map((t) => (
              <div key={t.id} className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm">
                <p className="text-brand-gold2" aria-label={`${t.rating} out of 5 stars`}>
                  {'★'.repeat(t.rating)}<span className="text-muted-foreground/30">{'★'.repeat(5 - t.rating)}</span>
                </p>
                {t.body && (
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-foreground/80">
                    &ldquo;{t.body}&rdquo;
                  </p>
                )}
                <div className="mt-5 flex items-center gap-3">
                  {t.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.avatarUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                      // If a stored photo URL 404s/breaks, fall back to the
                      // generic dummy icon instead of a broken-image box.
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                    />
                  ) : null}
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(210,20%,92%)] ${t.avatarUrl ? 'hidden' : ''}`} aria-hidden>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="hsl(210,15%,55%)" strokeWidth="1.6">
                      <circle cx="12" cy="8.5" r="3.5" />
                      <path d="M4.5 20c0-3.6 3.4-6.5 7.5-6.5s7.5 2.9 7.5 6.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{t.name}</p>
                    <a href={`/centres/${t.centreSlug}`} className="block truncate text-xs text-muted-foreground hover:text-primary hover:underline">
                      {t.centreName}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {pages.length > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Show testimonials ${i + 1} of ${pages.length}`}
              aria-current={i === page}
              className={`h-2 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-primary' : 'w-2 bg-secondary hover:bg-secondary-foreground/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
