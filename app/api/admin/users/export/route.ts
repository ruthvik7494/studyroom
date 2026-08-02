import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/rbac';

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Export the user list as CSV. Admin only. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const role = new URL(req.url).searchParams.get('role');
  const db = await createClient();
  let query = db
    .from('profiles')
    .select('id, full_name, role, home_area, account_status, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (role && ['student', 'owner', 'admin'].includes(role)) {
    query = query.eq('role', role as 'student' | 'owner' | 'admin');
  }
  const { data: rows } = await query;

  const header = ['Name', 'Role', 'Area', 'Status', 'Joined'];
  const lines = [header.join(',')];
  for (const r of rows ?? []) {
    lines.push([
      csvCell(r.full_name ?? ''),
      csvCell(r.role),
      csvCell(r.home_area ?? ''),
      csvCell(r.account_status),
      csvCell(new Date(r.created_at).toISOString().slice(0, 10)),
    ].join(','));
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join('\n'), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="users-${date}.csv"` },
  });
}
