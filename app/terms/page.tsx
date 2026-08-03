import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ScrollText,
  Calendar,
  FileText,
  Building2,
  UserRound,
  CreditCard,
  RefreshCcw,
  Star,
  Store,
  ShieldCheck,
  Scale,
  Lock,
  CheckCircle2,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageTocNav } from '@/components/page-toc-nav';
import { PrintPageButton } from '@/components/print-page-button';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that apply when you use StudyNook to find and book study spaces.',
  alternates: { canonical: '/terms' },
};

/**
 * NOTE FOR THE CLIENT / LEGAL REVIEW
 * ----------------------------------
 * Structure and platform-accurate operational terms are provided below.
 * All bracketed [ ... ] items are business decisions that must be filled in, and the
 * document must be reviewed by a qualified lawyer before launch.
 */

const SECTIONS = [
  {
    id: 'about-these-terms',
    icon: FileText,
    title: 'About these terms',
    body: (
      <p>
        These terms govern your use of StudyNook, operated by [LEGAL ENTITY NAME]. By creating an
        account or making a booking you agree to them.
      </p>
    ),
  },
  {
    id: 'what-studynook-is',
    icon: Building2,
    title: 'What StudyNook is',
    body: (
      <p>
        StudyNook is a marketplace connecting students with independently operated study spaces.
        The booking contract for the space itself is between you and the space owner. We are
        responsible for the platform and payment handling, not for the condition or operation of a
        venue.
      </p>
    ),
  },
  {
    id: 'accounts',
    icon: UserRound,
    title: 'Accounts',
    body: (
      <p>
        You must provide accurate details and keep your login secure. You are responsible for
        activity on your account. Accounts may be suspended for abuse, fraud, or breach of these
        terms.
      </p>
    ),
  },
  {
    id: 'bookings-payment',
    icon: CreditCard,
    title: 'Bookings & payment',
    body: (
      <p>
        Prices are shown before you pay and are calculated by StudyNook at the time of booking. A
        booking is confirmed only once payment is successfully processed. You will receive a
        booking confirmation and an invoice number.
      </p>
    ),
  },
  {
    id: 'cancellations-refunds',
    icon: RefreshCcw,
    title: 'Cancellations & refunds',
    body: (
      <p>
        [CANCELLATION WINDOW AND REFUND POLICY — e.g. full refund if cancelled more than X hours
        before the start time; no refund thereafter. This must match what the platform enforces
        and what you agree with owners.] Approved refunds are returned via the original payment
        method.
      </p>
    ),
  },
  {
    id: 'reviews-content',
    icon: Star,
    title: 'Reviews & content',
    body: (
      <p>
        Reviews must be honest and based on genuine experience. We may remove content that is
        abusive, misleading, or unlawful. You retain ownership of what you post but grant us a
        licence to display it on the platform.
      </p>
    ),
  },
  {
    id: 'owner-obligations',
    icon: Store,
    title: 'Owner obligations',
    body: (
      <p>
        Owners must hold the right to list their space, keep availability and pricing accurate,
        honour confirmed bookings, and comply with applicable safety and licensing requirements.
      </p>
    ),
  },
  {
    id: 'liability',
    icon: ShieldCheck,
    title: 'Liability',
    body: <p>[LIABILITY AND LIMITATION CLAUSES — must be drafted for your jurisdiction.]</p>,
  },
  {
    id: 'governing-law',
    icon: Scale,
    title: 'Governing law',
    body: (
      <p>
        These terms are governed by the laws of [JURISDICTION], and disputes are subject to the
        courts of [JURISDICTION].
      </p>
    ),
  },
] as const;

const FAQS = [
  {
    q: 'Can I cancel my booking?',
    a: 'Yes — cancellations are allowed within the window set out in the Cancellations & refunds section above. Cancel from your account\u2019s booking history before that window closes for a refund.',
  },
  {
    q: 'How do refunds work?',
    a: 'Approved refunds are returned automatically to your original payment method. Processing time depends on your bank or card issuer once we initiate it.',
  },
  {
    q: 'What if an owner cancels my booking?',
    a: 'If a study space owner cancels a confirmed booking, you\u2019ll be notified immediately and receive a full refund, regardless of the standard cancellation window.',
  },
  {
    q: 'How are disputes handled?',
    a: 'Most issues can be resolved by contacting our support team directly. If a dispute can\u2019t be resolved that way, it is subject to the governing law and courts named above.',
  },
] as const;

export default function TermsPage() {
  return (
    <main id="main-content">
      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-secondary/40 via-background to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-primary">
              <ScrollText className="h-3.5 w-3.5" aria-hidden />
              LEGAL
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Terms &amp; Conditions</h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              These terms govern your use of StudyNook. Please read them carefully.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden />
                Last updated: 1 August 2026
              </span>
              <PrintPageButton />
            </div>
          </div>

          <div className="relative mx-auto hidden h-56 w-56 items-center justify-center lg:flex" aria-hidden>
            <div className="absolute inset-0 rounded-full bg-primary/5" />
            <div className="absolute inset-6 rounded-full bg-primary/10" />
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/15">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <span className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-2xl border bg-background shadow-sm">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </span>
            <span className="absolute bottom-4 left-0 flex h-9 w-9 items-center justify-center rounded-2xl border bg-background shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </span>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <p className="text-sm font-bold">On this page</p>
            <PageTocNav sections={SECTIONS.map((s) => ({ id: s.id, title: s.title }))} numbered />

            <Card className="mt-6 flex flex-col items-center gap-2 border-none bg-secondary/40 p-5 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </span>
              <p className="font-display text-sm font-bold">Need help understanding these terms?</p>
              <p className="text-xs text-muted-foreground">Our support team is here to help.</p>
              <Link
                href="/contact"
                className="mt-1 inline-flex items-center gap-1 rounded-full border bg-background px-4 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                Contact Support
              </Link>
            </Card>
          </aside>

          {/* Sections */}
          <div className="space-y-5 text-muted-foreground">
            {SECTIONS.map((s, i) => (
              <Card key={s.id} id={s.id} className="scroll-mt-24 p-6">
                <div className="flex gap-4">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-foreground">{s.title}</h2>
                    <div className="mt-1.5 text-sm leading-relaxed">{s.body}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-display text-sm font-bold">Your trust matters</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We use industry-standard security measures to protect your data and keep it safe
                at all times.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-display text-sm font-bold">Fair &amp; transparent</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We believe in clear policies, no hidden clauses and a fair experience for
                everyone.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-display text-sm font-bold">For students &amp; owners</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                These terms apply to all users whether you are a student or a study space owner.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-foreground">Frequently asked questions</h2>
            <p className="text-sm text-muted-foreground">
              Can&apos;t find your answer?{' '}
              <Link href="/contact" className="font-semibold text-primary hover:underline">
                Contact us →
              </Link>
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-xl border bg-card p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-foreground">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
