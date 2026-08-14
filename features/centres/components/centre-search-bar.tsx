import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CentrePaginatedSearch } from '../schema';

const SPACE_TYPES = [
  ['', 'All'],
  ['study_hall', 'Study Hall'],
  ['reading_room', 'Reading Room'],
  ['coworking', 'Coworking'],
  ['both', 'Study + Coworking'],
] as const;

export function CentreSearchBar({ filters }: { filters: CentrePaginatedSearch }) {
  const hasActiveFilters = Boolean(filters.q || filters.spaceType || filters.womenSafe || filters.area || filters.sort !== 'rating');

  return (
    <form action="/centres" method="get" className="mb-5 rounded-xl border bg-card p-4">
      {filters.area && <input type="hidden" name="area" value={filters.area} />}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted-foreground">Search by name or address</label>
          <Input id="q" name="q" defaultValue={filters.q ?? ''} placeholder="Search study spaces, areas…" />
        </div>

        <div className="w-48">
          <label htmlFor="spaceType" className="mb-1 block text-xs font-medium text-muted-foreground">Study type</label>
          <select id="spaceType" name="spaceType" defaultValue={filters.spaceType ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {SPACE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="w-48">
          <label htmlFor="sort" className="mb-1 block text-xs font-medium text-muted-foreground">Sort by</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="rating">Top rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <Button type="submit">Search</Button>

        {hasActiveFilters && (
          <Link
            href="/centres"
            className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            ✕ Remove Filters
          </Link>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Popular filters:</span>
        <a
          href={`/centres?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.area ? { area: filters.area } : {}), womenSafe: 'true', sort: filters.sort }).toString()}`}
          className="rounded-full border px-3 py-1 text-xs font-semibold text-brand-plum hover:bg-brand-plum/5"
        >
          🛡 Women safe
        </a>
        <a
          href={`/centres?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.area ? { area: filters.area } : {}), spaceType: 'study_hall', sort: filters.sort }).toString()}`}
          className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-secondary"
        >
          Study Hall
        </a>
        <a
          href={`/centres?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.area ? { area: filters.area } : {}), spaceType: 'coworking', sort: filters.sort }).toString()}`}
          className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-secondary"
        >
          Coworking
        </a>
      </div>
    </form>
  );
}
