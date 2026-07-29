# StudyNook — Deployment Runbook & Rollback Plan

**Status:** Written at M25. Flagged as outstanding since the M16 release gate.
**Audience:** whoever performs the deploy and whoever is on call afterwards.

---

## ⚠️ The Most Important Thing On This Page

**Application rollback is fast and safe. Database rollback is not.**

Vercel can revert to a previous deployment in seconds. A Postgres migration that has dropped a column or rewritten data **cannot be undone by redeploying the old code** — the old code will then be talking to a schema it doesn't understand, which is usually worse than the original fault.

Therefore the golden rule:

> **Never deploy a destructive migration and application code in the same release.**
> Expand first, deploy, verify, then contract in a later release.

All 20 current migrations are additive/idempotent, so today's baseline is safe. This discipline matters for every release *after* the first.

---

## 1. Pre-Deployment Checklist

| # | Item | Done |
|---|---|---|
| 1 | CI green on the commit being deployed (typecheck · lint · test · build) | ⬜ |
| 2 | Git tag created (`v1.0.0`) and pushed — you cannot roll back to an unidentified commit | ⬜ |
| 3 | All environment variables set in the target environment (§2) | ⬜ |
| 4 | **Database backup taken immediately before migrating** (§4) | ⬜ |
| 5 | Migrations reviewed — confirm none are destructive (no `DROP`, no `ALTER … TYPE`, no data rewrites) | ⬜ |
| 6 | Razorpay keys correct for the environment (**test** for staging, live only for production) | ⬜ |
| 7 | Legal copy in `/privacy` and `/terms` completed (M22 §12) | ⬜ |
| 8 | Rollback owner identified and available for 1 hour post-deploy | ⬜ |

---

## 2. Environment Configuration

| Variable | Purpose | Public? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth key (RLS-protected) | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key | **NO — never expose** |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin (canonicals, OG, redirects) | yes |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments | secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC verification | secret |
| `RESEND_API_KEY` | Transactional email | secret |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps/location search | yes (restrict by URL in Mapbox's token settings) |
| `CRON_SECRET` | Bearer token for `/api/cron/*` | secret |

**Validation:** `lib/env.ts` throws on any missing required variable, so a misconfigured environment **fails at startup rather than silently misbehaving**. That is intentional — a failed deploy is better than a half-working one.

**Restrict the Maps key** by HTTP referrer to your domains, or it can be scraped and billed against your account.

---

## 3. Deployment Procedure

```bash
# 1. Verify locally / in CI
npm ci
npm run typecheck && npm run lint && npm test && npm run build

# 2. Tag the release (required for rollback)
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# 3. Back up the database BEFORE migrating (see §4)

# 4. Apply migrations
npx supabase link --project-ref <project-ref>
npm run db:push

# 5. Regenerate types from the linked project (replaces the sandbox-generated file)
npm run db:types
# If this changes types/database.types.ts, re-run the build before deploying.

# 6. Deploy
vercel --prod        # or merge to main if Vercel Git integration is enabled
```

### Post-deploy smoke test (do not skip — 5 minutes)

```bash
curl -sS https://<domain>/api/health          # expect 200 {"status":"healthy"}
curl -sSI https://<domain>/ | head -20        # expect 200 + security headers + HSTS
curl -sS https://<domain>/robots.txt
curl -sS https://<domain>/sitemap.xml | head
```

Then manually: load homepage → search → open a centre → log in → make a **test-mode** booking and payment → confirm the email arrives → check the booking appears in the owner dashboard.

---

## 4. Backup & Restore

**Before every migration:**
- Supabase Dashboard → Database → Backups → take a manual backup, **or**
- `pg_dump "postgresql://…" -Fc -f studynook-$(date +%F-%H%M).dump`

**Verified restore path** (tested at M19: 0 errors, exact row-count match):
```bash
pg_restore -d "<target-connection-string>" studynook-<timestamp>.dump
```

**Enable Point-in-Time Recovery** on Supabase Pro. PITR is the only thing that saves you from a data-corrupting bug discovered hours later, and it must be enabled *before* you need it.

---

## 5. Rollback Procedures

### 5.1 Decision guide

| Symptom | Action |
|---|---|
| App errors, DB schema unchanged | **§5.2 App rollback** (seconds) |
| Bad deploy + additive migration applied | **§5.2** — additive migrations are backward-compatible; leave them |
| Bad deploy + destructive migration applied | **§5.3** — hard case |
| Data corrupted by a bug | **§5.4 PITR** |
| Only one feature is broken | **§5.5** — fix forward, don't roll back |

### 5.2 Application rollback (primary path — under 1 minute)

Vercel Dashboard → Deployments → select the last known-good deployment → **Promote to Production**.

Or: `vercel rollback <deployment-url>`

Git equivalent: `git revert <bad-commit> && git push origin main`

**Safe because** all 20 current migrations are additive — older application code runs correctly against the newer schema. It ignores columns it doesn't know about.

### 5.3 Rollback with a destructive migration applied (avoid needing this)

There is no clean automated path. Options, in order of preference:

1. **Fix forward.** Usually correct — write a new migration that restores the needed structure, deploy it. Faster and less risky than restoring.
2. **Restore from backup**, accepting loss of all writes since the backup. Requires taking the app offline (Vercel → maintenance/paused) to prevent writes during restore.
3. **Point-in-Time Recovery** to just before the migration, if PITR is enabled.

**Prevention beats all three:** use the expand/contract pattern. Release N adds the new column and writes to both. Release N+1, once verified, stops using the old one. Release N+2 drops it. Each release is independently reversible.

### 5.4 Data corruption

Supabase Dashboard → Database → Point-in-Time Recovery → select a timestamp before the corrupting event. Pause the application first so no further writes occur.

### 5.5 Fix forward (usually the right call)

If a single non-critical feature is broken and core journeys (search, booking, payment) work, **do not roll back**. Patch, run CI, redeploy. Rollback carries its own risk and disrupts users mid-session.

---

## 6. Rollback Verification

After **any** rollback, re-run §3's smoke test, plus:

| # | Check |
|---|---|
| 1 | `/api/health` returns 200 |
| 2 | A user can log in |
| 3 | Search returns results |
| 4 | An existing booking is still visible and correct |
| 5 | A new **test-mode** payment completes end-to-end |
| 6 | No spike in error logs |
| 7 | Record in the incident log: what broke, what was done, what to change |

---

## 7. Monitoring & Alerting

| Concern | Tool | Status |
|---|---|---|
| Health endpoint | `/api/health` | ✅ **built at M25** |
| Uptime alerting | UptimeRobot / Better Uptime polling `/api/health` | ⬜ configure |
| App analytics + Web Vitals | Vercel Analytics + Speed Insights | ✅ wired |
| Runtime logs | Vercel → Logs | ✅ available |
| Database metrics | Supabase Dashboard | ✅ available |
| Slow query analysis | `pg_stat_statements` | ⬜ enable |
| **Error tracking** | Sentry or similar | ⬜ **not installed — see below** |

**On error tracking:** I deliberately did **not** install Sentry. It adds a dependency, requires an account and DSN, and sends data to a third party — that is your decision, not mine to make silently. Current error visibility is `console.error` surfaced in Vercel logs, plus `audit_logs` and `email_logs` in the database. That is workable at launch scale but will not alert you proactively. **Recommendation: add error tracking before or shortly after go-live.**

---

## 8. What Could Not Be Verified From Development

Honest boundary — these require the actual environment and credentials:

- Staging deployment itself, DNS, SSL/TLS certificate issuance, CDN behaviour
- Live third-party integrations: Google OAuth, Maps, Places, Razorpay, Resend
- Cross-browser and real-device testing
- Monitoring dashboards and alert delivery
- **Rollback drill** — §5.2 must be rehearsed once on staging before production. A rollback plan that has never been executed is a hypothesis, not a plan.

**Do the rollback drill.** Deploy something to staging, roll it back, time it, confirm §6 passes. It takes fifteen minutes and it is the difference between a plan and a document.

---

## 9. Version Tagging & Environment Isolation

- Tag every release: `v<major>.<minor>.<patch>`. Rollback targets a tag, not "the one from Tuesday".
- **Staging and production must use separate Supabase projects.** Sharing one means staging test data, test bookings and test payments land in production — and a staging migration mistake takes production down.
- Use Razorpay **test** keys in staging. Live keys belong only in production.
