'use client';
import { useState } from 'react';
import { subscribeNewsletter } from '../actions';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending'); setMessage(null);
    const res = await subscribeNewsletter({ email });
    if (!res.ok) { setState('error'); setMessage(res.error.message); return; }
    setState('done');
    setMessage('Subscribed ✓');
    setEmail('');
  };

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <div className="flex items-center rounded-full border border-white/15 bg-white/5 py-1 pl-4 pr-1.5 transition-all duration-300 focus-within:border-white/40 focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-white/20">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-label="Your email address"
          disabled={state === 'sending'}
          className="h-9 w-full min-w-0 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          aria-label="Subscribe"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-50"
        >
          {state === 'sending' ? (
            <span className="text-xs">…</span>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          )}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${state === 'error' ? 'text-red-300' : 'text-white/60'}`} role="status">{message}</p>
      )}
    </form>
  );
}
