import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { ProfileForm } from '@/features/auth/components/profile-form';
import { DeleteAccountSection } from '@/features/account/components/delete-account-section';
import { getMyDeletionRequest } from '@/features/account/actions';

export const metadata: Metadata = { title: 'Your profile', ...noindex };

export default async function ProfilePage() {
  const user = await requireUser();
  const db = await createClient();
  const [{ data: profile }, deletionRequest] = await Promise.all([
    db.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    getMyDeletionRequest(),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This is the name study centres see on your bookings.
      </p>
      <Card className="mt-5 p-5">
        <ProfileForm defaults={{ fullName: profile?.full_name ?? '', phone: profile?.phone ?? '' }} />
      </Card>

      <h2 className="mt-8 font-display text-lg font-bold text-destructive">Danger zone</h2>
      <div className="mt-3">
        <DeleteAccountSection initialRequest={deletionRequest} />
      </div>
    </div>
  );
}
