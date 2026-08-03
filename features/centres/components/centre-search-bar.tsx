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

/**
 * Plain GET form — submitting reloads /centres with new query params. No
 * client component/JS needed; consistent with this page being SSR-first.
 * `view` is preserved as a hidden field so changing search text doesn't
 * reset the grid/list toggle.
 */
export function CentreSearchBar({ filters }: { filters: CentrePaginatedSearch }) {
  return (
    <form action="/centres" method="get" className="mb-5 rounded-xl border bg-card p-4">
      <input type="hidden" name="view" value={filters.view} />
      {filters.area && <input type="hidden" name="area" value={filters.area} />}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted-foreground">Search by name or address</label>
          <Input id="q" name="q" defaultValue={filters.q ?? ''} placeholder="Search study spaces, areas…" />
        </div>

        <div className="w-24">
          <label htmlFor="minPrice" className="mb-1 block text-xs font-medium text-muted-foreground">Min price</label>
          <Input id="minPrice" name="minPrice" type="number" min={0} placeholder="₹ Min" defaultValue={filters.minPrice ?? ''} />
        </div>

        <div className="w-24">
          <label htmlFor="maxPrice" className="mb-1 block text-xs font-medium text-muted-foreground">Max price</label>
          <Input id="maxPrice" name="maxPrice" type="number" min={0} placeholder="₹ Max" defaultValue={filters.maxPrice ?? ''} />
        </div>

        <div className="w-40">
          <label htmlFor="spaceType" className="mb-1 block text-xs font-medium text-muted-foreground">Study type</label>
          <select id="spaceType" name="spaceType" defaultValue={filters.spaceType ?? ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {SPACE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="w-40">
          <label htmlFor="sort" className="mb-1 block text-xs font-medium text-muted-foreground">Sort by</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="rating">Top rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <Button type="submit">Search</Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Popular filters:</span>
        <a
          href={`/centres?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.area ? { area: filters.area } : {}), womenSafe: 'true', sort: filters.sort, view: filters.view }).toString()}`}
          className="rounded-full border px-3 py-1 text-xs font-semibold text-brand-plum hover:bg-brand-plum/5"
        >
          🛡 Women safe
        </a>
        <a
          href={`/centres?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.area ? { area: filters.area } : {}), spaceType: 'study_hall', sort: filters.sort, view: filters.view }).toString()}`}
          className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-secondary"
        >
          Study Hall
        </a>
        <a
          href={`/centres?${new URLSearchParams({ ...(filters.q ? { q: filters.q } : {}), ...(filters.area ? { area: filters.area } : {}), spaceType: 'coworking', sort: filters.sort, view: filters.view }).toString()}`}
          className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-secondary"
        >
          Coworking
        </a>
      </div>
    </form>
  );
}
