import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Calendar,
  Building2,
  FolderOpen,
  CreditCard,
  PieChart,
  Users,
  Clock,
  UserRound,
  Lock,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageTocNav } from '@/components/page-toc-nav';
import { Reveal } from '@/components/motion/reveal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How StudyNook collects, uses and protects your personal data.',
  alternates: { canonical: '/privacy' },
};

/**
 * NOTE FOR THE CLIENT / LEGAL REVIEW
 * ----------------------------------
 * This page provides the required STRUCTURE and the factual technical detail about
 * what the application actually does with data (which is accurate as built).
 * The bracketed [ ... ] items must be completed by the operating business, and the
 * whole document should be reviewed by a qualified lawyer before launch.
 * A payment provider (Razorpay) will typically require a published privacy policy.
 */

const SECTIONS = [
  {
    id: 'who-we-are',
    icon: Building2,
    title: 'Who we are',
    body: (
      <p>
        StudyNook is operated by [LEGAL ENTITY NAME], [REGISTERED ADDRESS]. For any privacy
        question, contact [PRIVACY CONTACT EMAIL].
      </p>
    ),
  },
  {
    id: 'what-we-collect',
    icon: FolderOpen,
    title: 'What we collect',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Account details you provide: name, email address, and optionally a phone number.</li>
        <li>Booking records: which space you booked, when, and the amount paid.</li>
        <li>Reviews and enquiries you submit.</li>
        <li>Approximate location, only when you choose to use &quot;search near me&quot;.</li>
        <li>Basic technical and usage data for security and analytics.</li>
      </ul>
    ),
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payments',
    body: (
      <p>
        Card and payment details are handled entirely by our payment provider, Razorpay. We never
        receive or store your full card details.
      </p>
    ),
  },
  {
    id: 'how-we-use-your-data',
    icon: PieChart,
    title: 'How we use your data',
    body: (
      <p>
        To create and manage your account, process bookings and refunds, send booking
        notifications, display reviews, prevent fraud and abuse, and meet legal obligations.
      </p>
    ),
  },
  {
    id: 'who-we-share-it-with',
    icon: Users,
    title: 'Who we share it with',
    body: (
      <p>
        Study space owners see the booking details necessary to honour your booking. We also use
        service providers: Supabase (database and authentication), Razorpay (payments), Resend
        (transactional email) and Vercel (hosting and analytics). We do not sell your data.
      </p>
    ),
  },
  {
    id: 'retention',
    icon: Clock,
    title: 'Retention',
    body: (
      <p>
        We keep booking and payment records for [RETENTION PERIOD — set per applicable
        tax/accounting law]. You can request deletion of your account at any time.
      </p>
    ),
  },
  {
    id: 'your-rights',
    icon: UserRound,
    title: 'Your rights',
    body: (
      <p>
        You can request access to, correction of, or deletion of your personal data by contacting
        [PRIVACY CONTACT EMAIL]. [Add the specific statutory rights and complaint route that apply
        in your operating jurisdiction.]
      </p>
    ),
  },
  {
    id: 'contact-us',
    icon: Mail,
    title: 'Contact us',
    body: (
      <p>
        Questions about this policy or your data? Reach us at{' '}
        <a href="mailto:support@studynook.app" className="font-medium text-primary hover:underline">
          support@studynook.app
        </a>{' '}
        or via our <Link href="/contact" className="font-medium text-primary hover:underline">Contact Us</Link> page.
      </p>
    ),
  },
] as const;

export default function PrivacyPage() {
  return (
    <main id="main-content">
      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-secondary/40 via-background to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Your privacy, our priority
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Privacy Policy</h1>
            <p className="mt-4 max-w-lg text-muted-foreground">
              At StudyNook, we respect your privacy and are committed to protecting your personal
              data. This policy explains how we collect, use, share and safeguard your
              information.
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" aria-hidden />
              Last updated: May 10, 2025
            </p>
          </div>

          <div className="relative mx-auto hidden h-56 w-56 items-center justify-center lg:flex" aria-hidden>
            <div className="absolute inset-0 rounded-full bg-primary/5" />
            <div className="absolute inset-6 rounded-full bg-primary/10" />
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-primary/15">
              <Lock className="h-12 w-12 text-primary" />
            </div>
            <span className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-2xl border bg-background shadow-sm">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </span>
            <span className="absolute bottom-4 left-0 flex h-9 w-9 items-center justify-center rounded-2xl border bg-background shadow-sm">
              <UserRound className="h-4 w-4 text-primary" />
            </span>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <p className="text-sm font-bold">On this page</p>
            <PageTocNav sections={SECTIONS.map((s) => ({ id: s.id, title: s.title }))} />

            <Card className="mt-6 flex flex-col items-center gap-2 border-none bg-secondary/40 p-5 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </span>
              <p className="font-display text-sm font-bold">Have questions?</p>
              <p className="text-xs text-muted-foreground">We&apos;re here to help you.</p>
              <Link
                href="/contact"
                className="mt-1 inline-flex items-center gap-1 rounded-full border bg-background px-4 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                Contact Us <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          </aside>

          {/* Sections */}
          <div className="space-y-5 text-muted-foreground">
            {SECTIONS.map((s) => (
              <Reveal key={s.id} id={s.id} margin="-100px" className="scroll-mt-24">
              <Card className="p-6">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold text-foreground">{s.title}</h2>
                    <div className="mt-1.5 text-sm leading-relaxed">{s.body}</div>
                  </div>
                </div>
              </Card>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Trust banner */}
        <Reveal className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-secondary/40 p-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-display font-bold">Your trust matters</p>
              <p className="text-sm text-muted-foreground">
                We use industry-standard security measures to protect your data and keep it safe
                at all times.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Learn more about security <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
