import type { Metadata } from 'next';
import { BrandPanel } from '@/components/brand-panel';
import { ContactForm } from '@/features/contact/components/contact-form';

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

// General Warangal-city centre — the same coordinates already seeded for
// "Warangal City" (supabase/migrations/0003_directory.sql). There's no single
// registered business address stored anywhere in the app yet, so this shows
// the service area rather than a fabricated street address.
const MAP_LAT = 17.9689;
const MAP_LNG = 79.5941;
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function ContactPage() {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Left — brand panel (stands in for a photo; see BrandPanel's own note) */}
        <BrandPanel className="hidden min-h-[520px] rounded-2xl lg:block" />

        {/* Right — the form */}
        <div>
          <h1 className="font-display text-3xl font-extrabold">Let's Connect!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Have questions, need help finding a study space, or just want to say hello?
            Fill out the form below, or email{' '}
            <a className="underline" href="mailto:support@studynook.app">support@studynook.app</a>.
          </p>

          <div className="mt-6 space-y-1 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Students —</span> booking, payment or refund questions.</p>
            <p><span className="font-semibold text-foreground">Study space owners —</span> want to list your space? Email <a className="underline" href="mailto:owners@studynook.app">owners@studynook.app</a>.</p>
          </div>

          <div className="mt-8">
            <ContactForm />
          </div>

          <div className="mt-8 flex items-center gap-3 border-t pt-6">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Map — our Warangal service area (Mapbox static image, no JS needed) */}
      <section className="mt-12" aria-labelledby="map-heading">
        <h2 id="map-heading" className="mb-3 font-display text-lg font-bold">Find us in Warangal</h2>
        <div className="overflow-hidden rounded-2xl border">
          {MAPBOX_TOKEN ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+2d6a4f(${MAP_LNG},${MAP_LAT})/${MAP_LNG},${MAP_LAT},11,0/1200x320@2x?access_token=${MAPBOX_TOKEN}`}
              alt="Map of StudyNook's Warangal service area"
              className="h-80 w-full object-cover"
            />
          ) : (
            <div className="flex h-80 items-center justify-center bg-secondary/40 text-sm text-muted-foreground">
              Map unavailable right now.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
