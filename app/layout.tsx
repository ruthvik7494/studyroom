import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono, Lexend } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { QueryProvider } from '@/lib/query/provider';
import { ThemeProvider } from '@/components/theme-provider';
import { MotionRoot } from '@/components/motion/motion-root';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { BackToTop } from '@/components/back-to-top';
import { Suspense } from 'react';
import { NavigationProgressModal } from '@/components/navigation-progress-modal';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

// Runs before hydration (in <head>, blocking) so the page never flashes the
// wrong theme: defaults to light mode for everyone unless explicitly set to 'dark' in localStorage.
const NO_FLASH_THEME_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('studynook-theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://studynook.app'),
  title: { default: 'StudyNook — find & book study spaces near you', template: '%s · StudyNook' },
  description: 'Discover, compare and book verified study halls, reading rooms and coworking seats. Live availability, verified reviews, and one pass across halls.',
  openGraph: { type: 'website', siteName: 'StudyNook', locale: 'en_IN' },
  // Twitter/X Card — also consumed by LinkedIn and WhatsApp link previews.
  // summary_large_image pairs with app/opengraph-image.tsx.
  twitter: {
    card: 'summary_large_image',
    title: 'StudyNook — find & book study spaces near you',
    description: 'Discover, compare and book verified study halls, reading rooms and coworking seats.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable} ${jakarta.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen font-sans">
        {/* Skip link — WCAG 2.4.1 Bypass Blocks. Visible on keyboard focus. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <MotionRoot>
            <QueryProvider>
              <SiteHeader />
              <div id="main-content">{children}</div>
              <SiteFooter />
              <Suspense fallback={null}>
                <NavigationProgressModal />
              </Suspense>
            </QueryProvider>
            <BackToTop />
          </MotionRoot>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
