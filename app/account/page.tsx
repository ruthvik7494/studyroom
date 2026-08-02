import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { noindex } from '@/lib/seo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/booking-status-badge';
import { formatINR } from '@/lib/utils';

export const metadata: Metadata = { title: 'My account', ...noindex };

export default async function AccountPage() {
  const user = await requireUser();
  const db = await createClient();

  const [{ data: bookings }, { data: profile }, { data: saved }, { data: reviews }] = await Promise.all([
    db.from('bookings')
      .select('id, period, amount, status, payment, invoice_number, created_at, starts_at, ends_at, resource_id, centres(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('profiles').select('full_name, role').eq('id', user.id).maybeSingle(),
    db.from('saved_listings')
      .select('centre_id, centres(name, slug, area, emoji, rating)')
      .eq('user_id', user.id)
      .limit(12),
    db.from('reviews')
      .select('id, rating, body, status, created_at, centres(name, slug)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

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
    if (b.payment === 'refunded' || b.payment === 'partially_refunded' || b.payment === 'refund_pending') return 'Refunded';
    if (b.status === 'cancelled') return 'Cancelled';
    if (b.status === 'expired') return 'Expired';
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

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">My account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {profile?.full_name ?? 'Student'} · <span className="capitalize">{profile?.role ?? 'student'}</span>
        {' · '}
        <a href="/account/profile" className="underline hover:no-underline">Edit profile</a>
        {' · '}
        <a href="/account/notifications" className="underline hover:no-underline">Notifications</a>
      </p>

      <section aria-labelledby="bookings-heading" className="mt-8">
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
                            {b.payment === 'paid' && b.invoice_number && (
                              <Link href={`/account/bookings/${b.id}/invoice`} className="text-xs font-semibold underline hover:no-underline">
                                Invoice
                              </Link>
                            )}
                            {canRebook && c && (
                              <Link
                                href={`/centres/${c.slug}/book?period=${b.period}${b.resource_id ? `&resource=${b.resource_id}` : ''}`}
                                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                              >
                                Book Again
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Payment history — real refund records for this booking, if any */}
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

      {/* Favourite centres */}
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
                </Card>
              );
            })}
          </div>
        )}
      </section>

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
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
