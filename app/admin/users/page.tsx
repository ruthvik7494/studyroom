import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleSelect } from '@/features/admin/components/role-select';

export const metadata: Metadata = { title: 'Users', ...noindex };

const ROLE_VARIANT: Record<string, 'default' | 'secondary' | 'success'> = {
  admin: 'default', owner: 'success', student: 'secondary',
};

/**
 * Admin user management. Lists all users (admins can read all profiles via the
 * "profiles admin read" RLS policy) with an inline role selector backed by the
 * guarded admin_set_user_role() function. ?role= filters by role.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  await requireRole('admin');
  const db = await createClient();
  const { role: roleFilter } = await searchParams;

  let query = db
    .from('profiles')
    .select('id, full_name, role, home_area, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (roleFilter && ['student', 'owner', 'admin'].includes(roleFilter)) {
    query = query.eq('role', roleFilter as 'student' | 'owner' | 'admin');
  }
  const { data: users } = await query;

  const counts = { total: users?.length ?? 0 };

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-xl font-bold">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage roles across the platform. {counts.total} shown.
      </p>

      {/* Role filter */}
      <div className="mt-4 flex gap-2 text-sm">
        {['all', 'student', 'owner', 'admin'].map((r) => (
          <a
            key={r}
            href={(r === 'all' ? '/admin/users' : `/admin/users?role=${r}`) as never}
            className={`rounded-lg border border-border px-3 py-1.5 capitalize hover:bg-muted ${
              (roleFilter ?? 'all') === r ? 'bg-muted font-semibold' : ''
            }`}
          >
            {r}
          </a>
        ))}
      </div>

      <Card className="mt-4 overflow-x-auto">
        {!users || users.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Area</th>
                <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                <th scope="col" className="px-4 py-3 font-semibold">Current</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{u.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.home_area ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[u.role] ?? 'secondary'} className="capitalize">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect userId={u.id} current={u.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}
