'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Building2, ArrowRight } from 'lucide-react';
import { chooseRole } from '../actions';

const OPTIONS = [
  { role: 'student' as const, Icon: GraduationCap, title: 'I\u2019m a student', desc: 'Find, book and review study spaces.' },
  { role: 'owner' as const, Icon: Building2, title: 'I run a study space', desc: 'List and manage my centre.' },
];

export function RoleSelect({ next }: { next: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<'student' | 'owner' | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () =>
    start(async () => {
      if (!selected) return;
      setError(null);
      const res = await chooseRole({ role: selected });
      if (!res.ok) { setError(res.error.message); return; }
      router.push(selected === 'owner' ? '/owner/centres' : next);
      router.refresh();
    });

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map(({ role, Icon, title, desc }) => {
          const active = selected === role;
          return (
            <button key={role} onClick={() => setSelected(role)} className="text-left" aria-pressed={active}>
              <div
                className={`rounded-2xl border-2 p-5 text-center transition-all duration-200 ${
                  active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30 hover:shadow-sm'
                }`}
              >
                <span
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/70'
                  }`}
                  aria-hidden
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-3 font-display font-bold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-center text-sm text-destructive" role="alert">{error}</p>}

      <button
        onClick={confirm}
        disabled={!selected || pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 font-display text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
      >
        {pending ? 'Setting up…' : (<>Continue <ArrowRight className="h-4 w-4" /></>)}
      </button>
    </div>
  );
}
