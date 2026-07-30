'use client';
import { useState } from 'react';

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* user cancelled */ }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-secondary"
    >
      <span aria-hidden>🔗</span>{copied ? 'Link copied!' : 'Share'}
    </button>
  );
}
