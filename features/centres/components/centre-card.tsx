'use client';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn, formatINR } from '@/lib/utils';
import type { CentreListItem } from '../types';
import { SaveHeart } from './save-heart';
import { EASE_OUT, DURATION, indexDelay } from '@/lib/motion';

export const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  open: { dot: 'bg-status-free', label: 'Seats free' },
  filling: { dot: 'bg-status-filling', label: 'Filling up' },
  full: { dot: 'bg-status-full', label: 'Full now' },
  unknown: { dot: 'bg-muted-foreground', label: '' },
};

interface CentreCardProps {
  centre: CentreListItem;
  showSave?: boolean;
  isSaved?: boolean;
  /** Position within its list — used only to stagger the first-appearance
   * fade-up slightly per card. Optional; defaults to no stagger. */
  index?: number;
}

export function CentreCard({ centre, showSave, isSaved, index = 0 }: CentreCardProps) {
  const status = STATUS_STYLE[centre.occupancy?.status ?? 'unknown']!;
  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT, delay: indexDelay(index) }}
    >
      <Card className="overflow-hidden transition-shadow duration-300 hover:-translate-y-1 hover:shadow-md">
        <Link href={`/centres/${centre.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-accent text-5xl">
            {centre.cover_url ? (
              <Image
                src={centre.cover_url}
                alt={`${centre.name} study space`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            ) : (
              <span aria-hidden>{centre.emoji}</span>
            )}

            {/* Top-left: white dot-pill badges, stacked if more than one applies */}
            {(centre.is_verified || centre.women_safe_verified) && (
              <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
                {centre.is_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-free" aria-hidden />
                    Verified
                  </span>
                )}
                {centre.women_safe_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-plum" aria-hidden />
                    Women-safe
                  </span>
                )}
              </div>
            )}

            {/* Live seat status — small pill bottom-left, keeps the top-left badge row uncluttered */}
            {centre.occupancy && (
              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                {centre.occupancy.seatsFree} free
              </span>
            )}

            {showSave && <SaveHeart centreId={centre.id} initialSaved={!!isSaved} />}
          </div>

          <div className="p-4">
            <h3 className="font-display text-[15px] font-bold">{centre.name}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{centre.area}</p>

            <div className="mt-2.5 flex items-center justify-between">
              <p className="text-sm text-foreground/80">
                <span className="text-brand-gold2">★</span> {centre.rating.toFixed(1)}
                <span className="text-muted-foreground"> ({centre.reviews_count})</span>
              </p>
              <p className="font-display text-sm font-bold text-brand-green">
                {centre.fromMonthly ? formatINR(centre.fromMonthly) : '—'}
                <span className="text-[11px] font-medium text-muted-foreground">/mo</span>
              </p>
            </div>
          </div>
        </Link>
      </Card>
    </motion.div>
  );
}
