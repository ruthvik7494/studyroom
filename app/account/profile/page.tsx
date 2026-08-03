import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { ProfileForm } from '@/features/auth/components/profile-form';

export const metadata: Metadata = { title: 'Your profile', ...noindex };

export default async function ProfilePage() {
  const user = await requireUser();
  const db = await createClient();
  const { data: profile } = await db
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold">Your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This is the name study centres see on your bookings.
      </p>
      <Card className="mt-5 p-5">
        <ProfileForm defaults={{ fullName: profile?.full_name ?? '', phone: profile?.phone ?? '' }} />
      </Card>
    </main>
  );
}
