'use client';
import { useState } from 'react';

export function CopyBookingId({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" onClick={copy} aria-label="Copy booking ID" title="Copy booking ID" className="text-muted-foreground hover:text-foreground">
      {copied ? '✓' : '📋'}
    </button>
  );
}
