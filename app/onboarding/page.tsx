import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Users, Star, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { RoleSelect } from '@/features/auth/components/role-select';
import { noindex } from '@/lib/seo';

export const metadata: Metadata = { title: 'Get started', ...noindex };

interface PageProps { searchParams: Promise<{ next?: string }> }

const TRUST_POINTS = [
  { Icon: Star, title: 'Trusted by Students', body: 'Real reviews & ratings' },
  { Icon: ShieldCheck, title: 'Verified Spaces', body: 'Quality you can trust' },
  { Icon: ClipboardCheck, title: 'Book with Confidence', body: 'Secure & easy booking' },
];

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  await requireUser();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const { data: ob } = await db.from('onboarding_progress').select('completed').eq('user_id', user!.id).maybeSingle();
  if (ob?.completed) redirect(next ?? '/'); // already onboarded

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-gradient-to-b from-secondary/40 to-background px-6 py-12">
      {/* Decorative leaf illustrations — purely visual, hidden from assistive tech */}
      <svg aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-56 w-56 text-primary/10 sm:h-72 sm:w-72" viewBox="0 0 200 200" fill="currentColor">
        <path d="M100 10c50 20 80 60 80 110-40 10-90 0-110-40C55 50 70 25 100 10Z" />
        <path d="M40 120c30 5 55 25 60 55-25 10-55 5-72-18-10-14-8-30 12-37Z" />
      </svg>
      <svg aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 text-primary/10 sm:h-72 sm:w-72" viewBox="0 0 200 200" fill="currentColor">
        <path d="M100 10c50 20 80 60 80 110-40 10-90 0-110-40C55 50 70 25 100 10Z" />
        <path d="M160 120c-30 5-55 25-60 55 25 10 55 5 72-18 10-14 8-30-12-37Z" />
      </svg>

      <div className="relative w-full max-w-lg">
        <div className="rounded-3xl bg-card p-8 shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden>
            <Users className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-center font-display text-2xl font-bold">
            How will you use <span className="text-primary">StudyNook</span>?
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            You can&rsquo;t change this to admin — pick what fits you.
          </p>

          <RoleSelect next={next ?? '/'} />
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-center gap-x-8 gap-y-4 px-2">
          {TRUST_POINTS.map(({ Icon, title, body }) => (
            <div key={title} className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <p className="text-xs text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
