import Link from 'next/link';
import { NewsletterForm } from '@/features/newsletter/components/newsletter-form';

/**
 * Site footer. Beyond the obvious UX role, this carries the internal links to
 * the static pages (about/contact/privacy/terms) so they aren't orphaned —
 * orphan pages get crawled late and rank poorly.
 *
 * Social icons link to each platform's homepage, not a specific StudyNook
 * account — there are no real StudyNook social profiles configured anywhere
 * in the app yet. Swap these hrefs for the real profile URLs once they exist,
 * rather than leaving them pointed at the generic platform.
 */
const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
  ) },
  { label: 'Facebook', href: 'https://facebook.com', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 8.5h2V5h-2a4 4 0 0 0-4 4v2H9v3.5h2V21h3.5v-6.5H17l.5-3.5h-3V9c0-.3.2-.5.5-.5Z" /></svg>
  ) },
  { label: 'YouTube', href: 'https://youtube.com', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" /></svg>
  ) },
  { label: 'WhatsApp', href: 'https://wa.me', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 18.5 3.5 20l1.2-3.5A8 8 0 1 1 6 18.5Z" /><path d="M9 10c0 3 2 5 5 5" strokeLinecap="round" /></svg>
  ) },
];

/**
 * Underline grows in from the left on hover (a scaled-up pseudo-element,
 * not a layout-affecting border) — pure CSS, so the footer can stay a
 * server component. "w-fit" keeps the underline no wider than the text.
 */
const footerLinkClass =
  'relative inline-block w-fit transition-colors duration-300 hover:text-white ' +
  "after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 px-4 pb-6 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#2d6c4f] px-8 py-10 text-[#F7F5F0] sm:px-12 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.7fr_auto]">
          {/* Brand + tagline + newsletter */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 font-display font-bold">S</div>
              <span className="font-display text-sm font-bold uppercase tracking-wider">StudyNook</span>
            </div>

            <h2 className="mt-6 font-display text-3xl font-bold leading-tight">
              Find your space<br />
              <span className="text-[#F7F5F0]/50">to focus and grow.</span>
            </h2>

            <p className="mt-6 text-sm font-semibold">Subscribe to our newsletter</p>
            <NewsletterForm />
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
            <nav aria-label="Explore">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#F7F5F0]/40">Explore</h3>
              <ul className="space-y-3.5 text-sm text-[#F7F5F0]/80">
                <li><Link href="/centres" className={footerLinkClass}>All study spaces</Link></li>
                <li><Link href="/about" className={footerLinkClass}>How it works</Link></li>
              </ul>
            </nav>
            <nav aria-label="For Students">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#F7F5F0]/40">For Students</h3>
              <ul className="space-y-3.5 text-sm text-[#F7F5F0]/80">
                <li><Link href="/saved" className={footerLinkClass}>Saved centres</Link></li>
                <li><Link href="/login" className={footerLinkClass}>Sign in</Link></li>
              </ul>
            </nav>
            <nav aria-label="For Owners">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#F7F5F0]/40">For Owners</h3>
              <ul className="space-y-3.5 text-sm text-[#F7F5F0]/80">
                <li><Link href="/owner/centres/new" className={footerLinkClass}>List your centre</Link></li>
                <li><Link href="/login" className={footerLinkClass}>Owner login</Link></li>
              </ul>
            </nav>
            <nav aria-label="Company">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#F7F5F0]/40">Company</h3>
              <ul className="space-y-3.5 text-sm text-[#F7F5F0]/80">
                <li><Link href="/about" className={footerLinkClass}>About Us</Link></li>
                <li><Link href="/contact" className={footerLinkClass}>Contact</Link></li>
                <li><Link href="/privacy" className={footerLinkClass}>Privacy Policy</Link></li>
                <li><Link href="/terms" className={footerLinkClass}>Terms &amp; Conditions</Link></li>
              </ul>
            </nav>
          </div>

          {/* Social icons */}
          <div className="flex items-start gap-6 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="flex flex-row gap-3 lg:flex-col">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[#F7F5F0]/80 transition-all duration-300 hover:-translate-y-0.5 hover:scale-110 hover:border-white/30 hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-xs text-[#F7F5F0]/40">
          © {year} StudyNook. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
