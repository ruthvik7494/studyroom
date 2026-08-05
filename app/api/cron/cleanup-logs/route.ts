import { NextResponse, type NextRequest } from 'next/server';
import { admin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * Scheduled job: keeps email_logs and audit_logs at a 60-day rolling
 * window by calling cleanup_old_logs() (0050_log_retention_cleanup.sql).
 * Invoked by Vercel Cron (see vercel.json). Protected by CRON_SECRET so
 * only the scheduler can trigger it — same pattern as expire-bookings.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { data, error } = await admin.rpc('cleanup_old_logs', { p_days: 60 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = data?.[0];
  return NextResponse.json({
    ok: true,
    deletedEmailLogs: row?.deleted_email_logs ?? 0,
    deletedAuditLogs: row?.deleted_audit_logs ?? 0,
  });
}
