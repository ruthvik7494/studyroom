'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgressModal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string>('');

  useEffect(() => {
    // Hide progress bar when path/params change (navigation completes)
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank'
      ) {
        return;
      }

      try {
        const url = new URL(anchor.href, window.location.href);
        const isSamePage = url.pathname === window.location.pathname && url.search === window.location.search;
        if (!isSamePage && url.origin === window.location.origin) {
          setTargetUrl(url.pathname + url.search);
          setIsNavigating(true);
        }
      } catch {
        // ignore invalid URLs
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Top Animated Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#16a34a] animate-pulse z-50 shadow-sm" />

      {/* Center Floating Progress Modal with Cancel Button */}
      <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-w-sm w-full mx-4 text-center space-y-4 animate-in zoom-in-95 duration-150">
        {/* Cancel (X) Button */}
        <button
          type="button"
          onClick={() => setIsNavigating(false)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          title="Cancel navigation"
        >
          ✕
        </button>

        {/* Loading Spinner */}
        <div className="pt-2 flex justify-center">
          <div className="w-10 h-10 border-4 border-[#16a34a]/20 border-t-[#16a34a] rounded-full animate-spin" />
        </div>

        {/* Status Text */}
        <div className="space-y-1">
          <h4 className="text-base font-bold text-slate-900">Loading Page...</h4>
          <p className="text-xs text-slate-500 truncate max-w-[240px] mx-auto">
            {targetUrl ? `Navigating to ${targetUrl}` : 'Preparing your view...'}
          </p>
        </div>

        {/* Cancel Action Link */}
        <button
          type="button"
          onClick={() => setIsNavigating(false)}
          className="text-xs font-bold text-rose-600 hover:underline inline-block pt-1 cursor-pointer"
        >
          Cancel Navigation
        </button>
      </div>
    </div>
  );
}
