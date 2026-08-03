'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Floating "back to top" button, shown site-wide once the page has been
 * scrolled past a threshold. Uses the same primary brand color as every
 * other call-to-action button (e.g. the hero "Search" button) so it reads
 * as part of the same design system rather than a bolted-on widget.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </button>
  );
}
