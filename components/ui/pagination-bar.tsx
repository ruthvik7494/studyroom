import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  /** Builds the href for a given page number, keeping the other query params. */
  hrefForPage: (page: number) => string;
}

/**
 * Numbered pagination: Prev, a window of page numbers around the current
 * page, Next. Plain links (not buttons) so it works without JS and each page
 * is directly navigable/shareable — consistent with this page being a
 * server-rendered route reading `page` from the URL.
 */
export function PaginationBar({ page, totalPages, hrefForPage }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const windowSize = 2;
  const start = Math.max(1, page - windowSize);
  const end = Math.min(totalPages, page + windowSize);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const linkClass = (active: boolean) =>
    cn(
      'flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors',
      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    );
  const navClass = 'flex h-9 items-center justify-center rounded-full border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary';
  const disabledClass = 'flex h-9 items-center justify-center rounded-full border px-3 text-sm font-semibold text-muted-foreground/40 pointer-events-none';

  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={navClass} aria-label="Previous page">‹ Prev</Link>
      ) : (
        <span className={disabledClass} aria-hidden>‹ Prev</span>
      )}

      {start > 1 && (
        <>
          <Link href={hrefForPage(1)} className={linkClass(false)}>1</Link>
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link key={p} href={hrefForPage(p)} className={linkClass(p === page)} aria-current={p === page ? 'page' : undefined}>
          {p}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link href={hrefForPage(totalPages)} className={linkClass(false)}>{totalPages}</Link>
        </>
      )}

      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={navClass} aria-label="Next page">Next ›</Link>
      ) : (
        <span className={disabledClass} aria-hidden>Next ›</span>
      )}
    </nav>
  );
}
