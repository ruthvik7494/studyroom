import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CentrePaginatedSearch } from '../schema';

/**
 * Plain GET form — submitting reloads /centres with new query params. No
 * client component/JS needed; consistent with this page being SSR-first.
 * `view` and `sort` are preserved as hidden fields so changing the search
 * text doesn't reset them.
 */
export function CentreSearchBar({ filters }: { filters: CentrePaginatedSearch }) {
  return (
    <form action="/centres" method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <input type="hidden" name="view" value={filters.view} />

      <div className="min-w-[200px] flex-1">
        <label htmlFor="q" className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
        <Input id="q" name="q" defaultValue={filters.q ?? ''} placeholder="Name or address" />
      </div>

      <div className="w-28">
        <label htmlFor="minPrice" className="mb-1 block text-xs font-medium text-muted-foreground">Min ₹/mo</label>
        <Input id="minPrice" name="minPrice" type="number" min={0} defaultValue={filters.minPrice ?? ''} />
      </div>

      <div className="w-28">
        <label htmlFor="maxPrice" className="mb-1 block text-xs font-medium text-muted-foreground">Max ₹/mo</label>
        <Input id="maxPrice" name="maxPrice" type="number" min={0} defaultValue={filters.maxPrice ?? ''} />
      </div>

      <div className="w-44">
        <label htmlFor="sort" className="mb-1 block text-xs font-medium text-muted-foreground">Sort by</label>
        <select
          id="sort"
          name="sort"
          defaultValue={filters.sort}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="rating">Top rated</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <Button type="submit">Search</Button>
    </form>
  );
}
