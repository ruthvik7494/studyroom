import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { Card } from '@/components/ui/card';
import { ProfileForm } from '@/features/auth/components/profile-form';
import { UpdatePasswordForm } from '@/features/auth/components/update-password-form';

/**
 * Shared between /admin/settings and /owner/settings — same personal-detail
 * and password-change capability students already have via /account/profile,
 * just placed here since admin/owner have their own sidebar area instead.
 */
export async function SettingsPageContent() {
  const user = await requireUser();
  const db = await createClient();

  const [{ data: profile }, { data: authUser }] = await Promise.all([
    db.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    db.auth.getUser(),
  ]);

  // Real check, not a guess: does this account have an actual email/password
  // credential, or did it only ever sign in via an OAuth provider (Google,
  // etc.)? Supabase links every sign-in method used as an "identity" on the
  // account — if 'email' isn't among them, there is no password to change,
  // only one to *set* for the first time.
  const identities = authUser.user?.identities ?? [];
  const hasPasswordIdentity = identities.some((i) => i.provider === 'email');
  const oauthProviders = identities.filter((i) => i.provider !== 'email').map((i) => i.provider);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal details and password.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-display font-semibold">Personal details</h2>
        <p className="mt-1 text-xs text-muted-foreground">This is the name and phone number on your account.</p>
        <div className="mt-4">
          <ProfileForm defaults={{ fullName: profile?.full_name ?? '', phone: profile?.phone ?? '' }} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display font-semibold">{hasPasswordIdentity ? 'Change password' : 'Set a password'}</h2>
        {!hasPasswordIdentity && oauthProviders.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            You signed in with {oauthProviders.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')} — there&apos;s no password on this account yet.
            Setting one here won&apos;t remove your {oauthProviders[0]} sign-in; it just adds email + password as an <em>additional</em> way to sign in.
          </p>
        )}
        <div className="mt-4">
          <UpdatePasswordForm redirectHome={false} />
        </div>
      </Card>
    </div>
  );
}
