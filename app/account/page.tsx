import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/booking-status-badge';
import { ReviewActions } from '@/features/reviews/components/review-actions';
import { RemoveSavedButton } from '@/features/saved/components/remove-saved-button';
import { RemoveBookingButton } from '@/features/bookings/components/remove-booking-button';
import { CancelRequestModalButton } from '@/features/bookings/components/cancel-request-modal-button';
import { StudentBookingCalendar } from '@/features/bookings/components/student-booking-calendar';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'My account', ...noindex };

export default async function AccountPage() {
  const user = await requireUser();
  if (user.role === 'admin') redirect('/admin');
  if (user.role === 'owner') redirect('/owner');

  const db = await createClient();

  const [{ data: bookingsRaw }, { data: profile }, { data: saved }, { data: reviews }] = await Promise.all([
    db.from('bookings')
      .select('id, period, amount, status, payment, invoice_number, created_at, starts_at, ends_at, resource_id, expires_at, centres(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
    db.from('saved_listings')
      .select('centre_id, centres(name, slug, area, emoji, rating)')
      .eq('user_id', user.id)
      .limit(12),
    db.from('reviews')
      .select('id, rating, body, status, created_at, owner_response, owner_responded_at, centres(name, slug)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Same reasoning as the booking confirmation page: a lapsed reservation
  // hold should show as expired right away, not sit as stale "Pending
  // Payment" until the once-daily cron sweep gets to it.
  let bookings = bookingsRaw;
  const hasLapsedHold = (bookings ?? []).some((b) => b.status === 'pending' && b.expires_at && new Date(b.expires_at) < new Date());
  if (hasLapsedHold) {
    await admin.rpc('expire_pending_bookings');
    const { data: refreshed } = await db.from('bookings')
      .select('id, period, amount, status, payment, invoice_number, created_at, starts_at, ends_at, resource_id, expires_at, centres(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    bookings = refreshed;
  }

  const bookingIds = (bookings ?? []).map((b) => b.id);
  const { data: refundRows } = bookingIds.length
    ? await db.from('refunds').select('booking_id, amount, status, is_partial, created_at, processed_at').in('booking_id', bookingIds)
    : { data: [] as { booking_id: string; amount: number; status: string; is_partial: boolean; created_at: string; processed_at: string | null }[] };
  const refundsByBooking = new Map<string, NonNullable<typeof refundRows>>();
  (refundRows ?? []).forEach((r) => {
    const list = refundsByBooking.get(r.booking_id) ?? [];
    list.push(r);
    refundsByBooking.set(r.booking_id, list);
  });

  type BookingCategory = 'Pending Payment' | 'Upcoming' | 'Active' | 'Completed' | 'Cancelled' | 'Refunded' | 'Expired';
  function categorize(b: NonNullable<typeof bookings>[number]): BookingCategory {
    if (b.status === 'cancelled') return 'Cancelled';
    if (b.status === 'expired') return 'Expired';
    if (b.payment === 'refunded' || b.payment === 'partially_refunded' || b.payment === 'refund_pending') return 'Refunded';
    if (b.payment !== 'paid') return 'Pending Payment';
    const now = Date.now();
    const endsMs = new Date(b.ends_at).getTime();
    const startsMs = new Date(b.starts_at).getTime();
    if (b.status === 'completed' || endsMs < now) return 'Completed';
    if (startsMs <= now && now < endsMs) return 'Active';
    return 'Upcoming';
  }
  const CATEGORY_ORDER: BookingCategory[] = ['Pending Payment', 'Upcoming', 'Active', 'Completed', 'Cancelled', 'Refunded', 'Expired'];
  const grouped = new Map<BookingCategory, NonNullable<typeof bookings>>();
  (bookings ?? []).forEach((b) => {
    const cat = categorize(b);
    const list = grouped.get(cat) ?? [];
    list.push(b);
    grouped.set(cat, list);
  });

  // "Active subscription" — this app doesn't have a separate recurring-
  // billing subscription system; a currently-active Weekly/Monthly/etc.
  // pass is the closest real equivalent, so that's what's shown here,
  // labelled honestly as a pass rather than implying auto-renewal billing.
  const LONG_PERIODS = new Set(['week', 'fortnight', 'month', 'quarter', 'half_year', 'year']);
  const activeSubscription = (bookings ?? []).find((b) => categorize(b) === 'Active' && LONG_PERIODS.has(b.period)) ?? null;
  let subscriptionProgress: { totalDays: number; daysUsed: number; daysLeft: number } | null = null;
  if (activeSubscription) {
    const start = new Date(activeSubscription.starts_at).getTime();
    const end = new Date(activeSubscription.ends_at).getTime();
    const now = Date.now();
    const totalDays = Math.max(1, Math.round((end - start) / 86_400_000));
    const daysUsed = Math.min(totalDays, Math.max(0, Math.round((now - start) / 86_400_000)));
    subscriptionProgress = { totalDays, daysUsed, daysLeft: totalDays - daysUsed };
  }

  const pendingPaymentCount = grouped.get('Pending Payment')?.length ?? 0;
  const upcomingCount = grouped.get('Upcoming')?.length ?? 0;
  const activeCount = grouped.get('Active')?.length ?? 0;
  const completedCount = grouped.get('Completed')?.length ?? 0;
  const confirmedTotalCount = upcomingCount + activeCount + completedCount;

  const { count: unreadCount } = await db.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);

  // Recent activity — last few bookings regardless of category, for a quick glance.
  const recentActivity = (bookings ?? []).slice(0, 5);

  // Calendar items payload
  const calendarItems = (bookings ?? []).map((b) => {
    const c = b.centres as unknown as { name: string } | null;
    return {
      id: b.id,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      period: b.period,
      status: b.status,
      payment: b.payment,
      centreName: c?.name ?? 'Centre',
    };
  });

  return (
    <div className="max-w-3xl">
      {/* Personalized welcome */}
      <h1 className="font-display text-2xl font-bold">
        Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="capitalize">{profile?.role ?? 'student'}</span>
        {' · '}
        <a href="/account/profile" className="underline hover:no-underline">Edit profile</a>
        {' · '}
        <a href="/account/notifications" className="underline hover:no-underline">
          Notifications{unreadCount ? ` (${unreadCount})` : ''}
        </a>
      </p>

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/centres" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">Find a study space</Link>
        {pendingPaymentCount > 0 && (
          <Link href="#pending-payment" className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
            {pendingPaymentCount} payment{pendingPaymentCount === 1 ? '' : 's'} pending
          </Link>
        )}
        <Link href="/account/profile" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-secondary">My profile</Link>
        <Link href="/account/calendar" className="rounded-full border border-[#16a34a]/40 bg-[#16a34a]/10 px-4 py-2 text-xs font-bold text-[#16a34a] hover:bg-[#16a34a]/20 transition-colors">📅 Calendar</Link>
        <Link href="/account/notifications" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-secondary">Notifications</Link>
      </div>

      {/* Booking statistics summary */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Confirmed bookings', confirmedTotalCount, '📅', 'bg-emerald-100', 'text-emerald-700'],
          ['Upcoming', upcomingCount, '⏭️', 'bg-blue-100', 'text-blue-600'],
          ['Saved centres', saved?.length ?? 0, '❤️', 'bg-rose-100', 'text-rose-600'],
          ['Reviews written', reviews?.length ?? 0, '⭐', 'bg-amber-100', 'text-amber-600'],
        ].map(([label, value, icon, bg, fg]) => (
          <Card key={label as string} className="p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${bg} ${fg}`} aria-hidden>{icon}</span>
            <p className="mt-2 font-display text-xl font-extrabold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      {/* Active subscription (long-duration pass) */}
      {activeSubscription && (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-bold">Active pass</h2>
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Link href={`/centres/${(activeSubscription.centres as unknown as { slug: string } | null)?.slug ?? ''}`} className="font-display font-semibold hover:underline">
                  {(activeSubscription.centres as unknown as { name: string } | null)?.name ?? 'Centre'}
                </Link>
                <p className="mt-0.5 text-xs capitalize text-muted-foreground">{activeSubscription.period} pass · {formatINR(Number(activeSubscription.amount))}</p>
              </div>
              <Link href={`/centres/${(activeSubscription.centres as unknown as { slug: string } | null)?.slug ?? ''}/book`} className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
                Renew
              </Link>
            </div>
            {subscriptionProgress && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, (subscriptionProgress.daysUsed / subscriptionProgress.totalDays) * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {subscriptionProgress.daysLeft} of {subscriptionProgress.totalDays} days remaining
                </p>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Valid {new Date(activeSubscription.starts_at).toLocaleDateString('en-IN')} – {new Date(activeSubscription.ends_at).toLocaleDateString('en-IN')}
            </p>
          </Card>
        </section>
      )}

      {/* 1. My Bookings */}
      <section aria-labelledby="bookings-heading" className="mt-8" id="pending-payment">
        <h2 id="bookings-heading" className="mb-3 font-display text-lg font-bold">My bookings</h2>
        {!bookings || bookings.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
            <Link href="/centres" className="mt-3 inline-block text-sm font-semibold underline">Find a study space</Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {CATEGORY_ORDER.filter((cat) => (grouped.get(cat)?.length ?? 0) > 0).map((cat) => (
              <div key={cat}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat} ({grouped.get(cat)!.length})</h3>
                <div className="space-y-3">
                  {grouped.get(cat)!.map((b) => {
                    const c = b.centres as unknown as { name: string; slug: string } | null;
                    const canRebook = cat === 'Cancelled' || cat === 'Expired' || cat === 'Completed';
                    const refunds = refundsByBooking.get(b.id) ?? [];
                    return (
                      <Card key={b.id} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <Link href={(c ? `/centres/${c.slug}` : '#') as never} className="font-display font-semibold hover:underline">{c?.name ?? 'Centre'}</Link>
                            <p className="text-xs text-muted-foreground capitalize">{b.period} · {formatINR(b.amount)} · {new Date(b.created_at).toLocaleDateString('en-IN')}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <BookingStatusBadge status={b.status} />
                            <PaymentStatusBadge status={b.payment} />

                            {/* Pending Payments: Remove | Pay Now */}
                            {cat === 'Pending Payment' && c && (
                              <div className="flex items-center gap-2 ml-1">
                                <RemoveBookingButton bookingId={b.id} />
                                <Link
                                  href={`/centres/${c.slug}/book/confirmed?id=${b.id}`}
                                  className="rounded-full bg-[#16a34a] px-3.5 py-1 text-xs font-bold text-white uppercase tracking-wider hover:bg-[#15803d] transition-colors"
                                >
                                  Pay Now →
                                </Link>
                              </div>
                            )}

                            {/* Expired / Completed / Cancelled: Remove | Book Again */}
                            {canRebook && c && (
                              <div className="flex items-center gap-2 ml-1">
                                {(cat === 'Expired' || cat === 'Cancelled') && (
                                  <RemoveBookingButton bookingId={b.id} />
                                )}
                                <Link
                                  href={`/centres/${c.slug}/book?period=${b.period}${b.resource_id ? `&resource=${b.resource_id}` : ''}`}
                                  className="rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                  Book Again
                                </Link>
                              </div>
                            )}

                            {/* Upcoming / Confirmed Bookings: Cancel & Refund Request Modal */}
                            {(cat === 'Upcoming' || cat === 'Active' || b.status === 'confirmed') && b.status !== 'cancelled' && b.status !== 'expired' && c && (
                              <CancelRequestModalButton bookingId={b.id} />
                            )}

                            {b.payment === 'paid' && b.invoice_number && (
                              <Link href={`/account/bookings/${b.id}/invoice`} className="text-xs font-semibold underline hover:no-underline">
                                Invoice
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Payment history */}
                        {refunds.length > 0 && (
                          <div className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">Payment history</p>
                            {refunds.map((r) => (
                              <p key={r.created_at}>
                                Refund {r.is_partial ? '(partial) ' : ''}{formatINR(Number(r.amount))} — <span className="capitalize">{r.status}</span>
                                {r.processed_at && ` on ${new Date(r.processed_at).toLocaleDateString('en-IN')}`}
                              </p>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Favourite centres */}
      <section aria-labelledby="saved-heading" className="mt-8">
        <h2 id="saved-heading" className="mb-3 font-display text-lg font-bold">Favourite centres</h2>
        {!saved || saved.length === 0 ? (
          <Card className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No saved centres yet. Tap the heart on any listing to save it here.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {saved.map((s) => {
              const c = s.centres as unknown as { name: string; slug: string; area: string | null; emoji: string; rating: number } | null;
              if (!c) return null;
              return (
                <Card key={s.centre_id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="text-xl">{c.emoji}</span>
                    <div>
                      <Link href={`/centres/${c.slug}`} className="font-display font-semibold hover:underline">{c.name}</Link>
                      <p className="text-xs text-muted-foreground">{c.area ?? ''}{c.area ? ' · ' : ''}★ {c.rating}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/centres/${c.slug}/book`} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                      Book Now
                    </Link>
                    <RemoveSavedButton centreId={s.centre_id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Recent activity */}
      {recentActivity.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold">Recent activity</h2>
          <Card className="divide-y p-0">
            {recentActivity.map((b) => {
              const c = b.centres as unknown as { name: string; slug: string } | null;
              return (
                <div key={b.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span>
                    <span className="font-semibold">{c?.name ?? 'Centre'}</span>
                    <span className="text-muted-foreground"> · {new Date(b.created_at).toLocaleDateString('en-IN')}</span>
                  </span>
                  <BookingStatusBadge status={b.status} />
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* My reviews */}
      <section aria-labelledby="reviews-heading" className="mt-8">
        <h2 id="reviews-heading" className="mb-3 font-display text-lg font-bold">My reviews</h2>
        {!reviews || reviews.length === 0 ? (
          <Card className="py-8 text-center">
            <p className="text-sm text-muted-foreground">You haven&apos;t written any reviews yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const c = r.centres as unknown as { name: string; slug: string } | null;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <Link href={(c ? `/centres/${c.slug}` : '#') as never} className="font-display font-semibold hover:underline">{c?.name ?? 'Centre'}</Link>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-brand-gold2">{'★'.repeat(r.rating)}</span>
                      {r.status !== 'published' && <Badge variant="warning" className="capitalize">{r.status}</Badge>}
                    </div>
                  </div>
                  {r.body && <p className="mt-2 text-sm text-foreground/80">{r.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                  {r.owner_response && (
                    <div className="mt-2 rounded-lg bg-secondary/40 p-3 text-sm">
                      <p className="text-xs font-semibold text-muted-foreground">Response from the centre</p>
                      <p className="mt-1 text-foreground/90">{r.owner_response}</p>
                    </div>
                  )}
                  <div className="mt-2">
                    <ReviewActions reviewId={r.id} rating={r.rating} body={r.body} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
