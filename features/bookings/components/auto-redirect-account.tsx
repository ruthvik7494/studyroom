'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AutoRedirectAccount() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    if (seconds <= 0) {
      router.push('/account');
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, router]);

  return (
    <div className="mt-4 flex flex-col items-center gap-2 p-4 rounded-xl bg-[#16a34a]/10 border border-[#16a34a]/30">
      <p className="text-xs font-bold text-[#16a34a] uppercase tracking-wider">
        Redirecting to your account dashboard in <span className="text-sm underline">{seconds}s</span>...
      </p>
      <button
        onClick={() => router.push('/account')}
        className="text-xs text-[#191c1e] font-semibold underline hover:text-[#16a34a] cursor-pointer"
      >
        Click here if not redirected automatically →
      </button>
    </div>
  );
}
