-- 0050_log_retention_cleanup.sql
-- email_logs and audit_logs had no retention policy — rows accumulated
-- forever. Adds a function that deletes rows older than 60 days from both,
-- called daily by a Vercel Cron job (see app/api/cron/cleanup-logs/route.ts
-- and vercel.json). security definer since neither table grants regular
-- users delete access (email_logs: admin-read-only; audit_logs: same) —
-- this function is only ever invoked by the cron route, which authenticates
-- via CRON_SECRET and calls it through the service-role client.

create or replace function cleanup_old_logs(p_days int default 60)
returns table(deleted_email_logs bigint, deleted_audit_logs bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_cutoff timestamptz := now() - (p_days || ' days')::interval;
  v_email_count bigint;
  v_audit_count bigint;
begin
  delete from email_logs where created_at < v_cutoff;
  get diagnostics v_email_count = row_count;

  delete from audit_logs where created_at < v_cutoff;
  get diagnostics v_audit_count = row_count;

  return query select v_email_count, v_audit_count;
end; $$;

grant execute on function cleanup_old_logs(int) to service_role;
