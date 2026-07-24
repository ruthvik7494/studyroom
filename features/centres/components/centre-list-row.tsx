import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';
import type { CentreListItem } from '../types';

export function CentreListRow({ centre }: { centre: CentreListItem }) {
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <Link href={`/centres/${centre.slug}`} className="flex gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative flex h-28 w-36 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary to-accent text-3xl">
          {centre.cover_url ? (
            <Image src={centre.cover_url} alt={`${centre.name} study space`} fill sizes="144px" className="object-cover" />
          ) : (
            <span aria-hidden>{centre.emoji}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-center py-3 pr-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-display text-[15px] font-bold">{centre.name}</h3>
            {centre.is_verified && <Badge variant="secondary">✓ Verified</Badge>}
            {centre.women_safe_verified && <Badge variant="safe">🛡 Women-safe</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">📍 {centre.area}</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-xs text-foreground/70"><span className="text-brand-gold2">★</span> {centre.rating.toFixed(1)} · {centre.reviews_count}</p>
            <p className="font-display text-sm font-bold text-brand-green">
              {centre.fromMonthly ? formatINR(centre.fromMonthly) : '—'}
              <span className="text-[10px] font-medium text-muted-foreground">/mo</span>
            </p>
          </div>
        </div>
      </Link>
    </Card>
  );
}
