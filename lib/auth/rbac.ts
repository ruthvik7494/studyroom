import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

export type Role = Database['public']['Enums']['user_role']; // 'student' | 'owner' | 'admin'

export interface SessionUser {
  id: string;
  email: string | null;
  role: Role;
  accountStatus: 'active' | 'suspended' | 'deleted';
}

/**
 * Resolve the current authenticated user + role, or null.
 * Role comes from profiles.role (single source of truth, enforced in RLS too).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? null,
      role: (profile?.role ?? 'student') as Role,
      accountStatus: (profile?.account_status ?? 'active') as 'active' | 'suspended' | 'deleted',
    };
  } catch {
    return null;
  }
}

class AuthError extends Error {
  constructor(public code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'SUSPENDED' | 'DELETED') {
    super(code);
    this.name = 'AuthError';
  }
}

/** Throws AuthError('UNAUTHENTICATED') if not signed in, AuthError('SUSPENDED')
 * if suspended, or AuthError('DELETED') if the account was deleted by an
 * admin — all real, enforced blocks, not cosmetic. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('UNAUTHENTICATED');
  if (user.accountStatus === 'deleted') throw new AuthError('DELETED');
  if (user.accountStatus === 'suspended') throw new AuthError('SUSPENDED');
  return user;
}

/**
 * Defense-in-depth: server-side role gate on top of RLS.
 * admin satisfies any role requirement.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin' && !roles.includes(user.role)) {
    throw new AuthError('FORBIDDEN');
  }
  return user;
}

export { AuthError };
