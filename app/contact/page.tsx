import type { Metadata } from 'next';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ContactForm } from '@/features/contact/components/contact-form';
import { createClient } from '@/lib/supabase/server';
import { getServiceArea } from '@/lib/service-area';
import { Reveal } from '@/components/motion/reveal';
import { LoadReveal } from '@/components/motion/load-reveal';
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger';

export const metadata: Metadata = {
  title: 'Contact StudyNook',
  description: 'Get in touch with the StudyNook team — support for students, and listing enquiries for study space owners.',
  alternates: { canonical: '/contact' },
};

// Same reasoning as the icons elsewhere in the app: these link to each
// platform's homepage, not a specific StudyNook account, since none are
// configured anywhere in the app yet. Swap the hrefs once real profiles exist.
const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.9c-.7.3-1.5.6-2.3.7.8-.5 1.4-1.3 1.7-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1a4.1 4.1 0 0 0 3.3 4 4.2 4.2 0 0 1-1.9.1 4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.9c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.2Z" /></svg>
  ) },
  { label: 'Instagram', href: 'https://instagram.com', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
  ) },
  { label: 'Facebook', href: 'https://facebook.com', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 8.5h2V5h-2a4 4 0 0 0-4 4v2H9v3.5h2V21h3.5v-6.5H17l.5-3.5h-3V9c0-.3.2-.5.5-.5Z" /></svg>
  ) },
  { label: 'WhatsApp', href: 'https://wa.me', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 18.5 3.5 20l1.2-3.5A8 8 0 1 1 6 18.5Z" /><path d="M9 10c0 3 2 5 5 5" strokeLinecap="round" /></svg>
  ) },
];

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default async function ContactPage() {
  const db = await createClient();
  const { city, state, coords } = await getServiceArea(db);
  const areaLabel = [city, state].filter(Boolean).join(', ');

  return (
    <main id="main-content" className="overflow-x-hidden">
      {/* Hero — full-bleed background photo behind the whole section, same
          treatment as the homepage hero: opaque where the text sits,
          fading to a fully visible photo on the right. */}
      <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen min-h-[480px] overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-background sm:min-h-[520px]">
        <div className="absolute inset-0 hidden sm:block">
          <Image src="/images/contact-office.png" alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background from-0% via-background via-45% to-transparent to-75%" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <LoadReveal>
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">💬 Get in Touch</span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              We&apos;re here to help you find the <span className="text-primary">perfect study space</span>.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Have questions, suggestions or need support? Reach out to us. We&apos;ll get back to you as soon as possible.
            </p>

            <StaggerGroup trigger="load" delay={0.15} className="mt-6 grid grid-cols-2 gap-4">
              <StaggerItem className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors duration-300 hover:bg-secondary/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>🎓</span>
                <div>
                  <p className="text-sm font-semibold">For Students</p>
                  <p className="text-xs text-muted-foreground">Booking, payment, refund or general queries.</p>
                </div>
              </StaggerItem>
              <StaggerItem className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors duration-300 hover:bg-secondary/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>🏢</span>
                <div>
                  <p className="text-sm font-semibold">For Space Owners</p>
                  <p className="text-xs text-muted-foreground">List your space or manage your listing.</p>
                </div>
              </StaggerItem>
              <StaggerItem className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors duration-300 hover:bg-secondary/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>🎧</span>
                <div>
                  <p className="text-sm font-semibold">Support</p>
                  <p className="text-xs text-muted-foreground">We&apos;re here to help between 9 AM – 9 PM everyday.</p>
                </div>
              </StaggerItem>
              <StaggerItem className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors duration-300 hover:bg-secondary/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>✉️</span>
                <div>
                  <p className="text-sm font-semibold">Quick Response</p>
                  <p className="text-xs text-muted-foreground">We usually reply within a few hours.</p>
                </div>
              </StaggerItem>
            </StaggerGroup>
          </div>
          </LoadReveal>

          {/* Floats on top of the photo, in its right-hand portion where
              the gradient has fully cleared — same treatment as the
              homepage hero's floating card. */}
          <LoadReveal delay={0.4} y={8} className="absolute bottom-8 right-6 hidden items-center gap-2 rounded-xl bg-background/95 px-3 py-2.5 shadow-md backdrop-blur sm:flex lg:right-10">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-base" aria-hidden>💚</span>
            <p className="max-w-[180px] text-xs font-medium">Happy to support students and space owners.</p>
          </LoadReveal>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12">

      {/* Green info panel + form */}
      <Reveal>
      <div className="mt-12 grid overflow-hidden rounded-2xl border shadow-sm lg:grid-cols-[1fr_1.3fr]">
        <div className="bg-[#1f4a37] p-8 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-display text-sm font-bold">S</span>
            <span className="text-xs font-bold uppercase tracking-wider">StudyNook</span>
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold leading-tight">
            Find your perfect study space{city ? <> in <span className="text-white/70">{city}</span></> : ''}
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Compare study halls, reading rooms and coworking desks — with real-time seats, verified reviews and transparent pricing.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {['Live seat availability', 'Verified reviews & ratings', 'Instant booking & secure payments', 'Women-safe verified spaces'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden>✓</span>{item}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
            <span className="text-xs font-semibold text-white/60">Follow us</span>
            {SOCIAL_LINKS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-white/40 hover:text-white">
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div className="p-8">
          <h2 className="font-display text-lg font-bold">Send us a message</h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </div>
      </Reveal>

      {/* Map + contact details */}
      <Reveal>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-3 font-display text-lg font-bold">Find us{city ? ` in ${city}` : ''}</h2>
          <div className="overflow-hidden rounded-2xl border">
            {MAPBOX_TOKEN && coords ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+2d6a4f(${coords.lng},${coords.lat})/${coords.lng},${coords.lat},11,0/900x320@2x?access_token=${MAPBOX_TOKEN}`}
                alt={`Map of StudyNook's service area${city ? ` in ${city}` : ''}`}
                className="h-80 w-full object-cover"
              />
            ) : (
              <div className="flex h-80 items-center justify-center bg-secondary/40 text-center text-sm text-muted-foreground">
                {coords ? 'Map unavailable right now.' : 'No study centres are listed yet — check back once centres are added.'}
              </div>
            )}
          </div>
        </div>

        <Card className="h-fit p-5">
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors duration-300 hover:bg-secondary/60">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10" aria-hidden>✉️</span>
              <div>
                <p className="font-semibold">Email</p>
                <a href="mailto:support@studynook.app" className="text-muted-foreground hover:underline">support@studynook.app</a>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors duration-300 hover:bg-secondary/60">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10" aria-hidden>📍</span>
              <div>
                <p className="font-semibold">Service Area</p>
                <p className="text-muted-foreground">{areaLabel || 'Not yet available'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      </Reveal>
      </div>
    </main>
  );
}
