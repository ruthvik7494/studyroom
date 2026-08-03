'use client';
import { useEffect, useRef, useState } from 'react';

export interface TocSection {
  id: string;
  title: string;
}

interface PageTocNavProps {
  sections: TocSection[];
  /** Terms page style: small numbered circle before each label. */
  numbered?: boolean;
}

/**
 * "On this page" sidebar nav for the Privacy Policy / Terms & Conditions
 * pages. The link for whichever section is actually in view is highlighted
 * — via IntersectionObserver as the person scrolls, and instantly on click
 * so there's no lag waiting for the scroll to land. Previously this was
 * static markup that always highlighted the first link no matter what was
 * actually on screen.
 */
export function PageTocNav({ sections, numbered = false }: PageTocNavProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  // While a click-driven scroll is in flight, don't let the observer fight
  // it — it can briefly report the OLD section as "most visible" mid-scroll.
  const suppressObserver = useRef(false);
  const suppressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserver.current) return;
        // Pick the entry closest to the top of the viewport among those
        // currently intersecting — matches what a reader would call
        // "the section I'm looking at" better than just the first hit.
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        setActiveId(top.target.id);
      },
      // Trigger when a section's heading is within the top ~30% of the
      // viewport (accounting for the sticky header) rather than requiring
      // the whole section to be visible.
      { rootMargin: '-100px 0px -70% 0px', threshold: 0 },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (id: string) => {
    setActiveId(id);
    suppressObserver.current = true;
    if (suppressTimeout.current) clearTimeout(suppressTimeout.current);
    suppressTimeout.current = setTimeout(() => { suppressObserver.current = false; }, 800);
  };

  return (
    <nav className="mt-3 flex flex-col gap-1 border-l">
      {sections.map((s, i) => {
        const active = s.id === activeId;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => handleClick(s.id)}
            aria-current={active ? 'true' : undefined}
            className={`-ml-px flex items-center gap-2 border-l-2 px-3 py-1.5 text-sm transition-colors ${
              active
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent text-muted-foreground hover:border-secondary hover:text-foreground'
            }`}
          >
            {numbered && (
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {i + 1}
              </span>
            )}
            {s.title}
          </a>
        );
      })}
    </nav>
  );
}
