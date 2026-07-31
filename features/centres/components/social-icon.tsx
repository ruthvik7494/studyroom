export type SocialPlatform = 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'whatsapp' | 'googleBusiness' | 'website';

/** Real brand-coloured icon per platform. Always rendered in true colour — the
 * grayscale/hover effect lives in SocialIcon below via a CSS filter, so a
 * single icon definition works whether it's shown gray or in color. */
function IconGlyph({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case 'website':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1a73e8" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
          <path d="M15 8.5h2V5h-2a4 4 0 0 0-4 4v2H9v3.5h2V21h3.5v-6.5H17l.5-3.5h-3V9c0-.3.2-.5.5-.5Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#E1306C" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#E1306C" stroke="none" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FF0000" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="#FF0000" stroke="none" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#0A66C2">
          <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#0A66C2" strokeWidth="1.5" />
          <circle cx="8" cy="8.5" r="1.2" />
          <path d="M7 11h2v7H7zM11 11h2v1.3c.5-.8 1.3-1.5 2.6-1.5 2 0 2.9 1.3 2.9 3.7V18h-2v-3.1c0-1.1-.4-1.9-1.4-1.9-.8 0-1.3.6-1.5 1.1-.1.2-.1.5-.1.8V18h-2v-7Z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="#000000">
          <path d="M4 4l7.5 9.5L4.3 20H6l6.2-5.9L17 20h3l-8-9.9L19 4h-1.7l-5.6 5.4L7 4H4Z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#25D366" strokeWidth="1.8">
          <path d="M6 18.5 3.5 20l1.2-3.5A8 8 0 1 1 6 18.5Z" /><path d="M9 10c0 3 2 5 5 5" strokeLinecap="round" />
        </svg>
      );
    case 'googleBusiness':
      return (
        <svg viewBox="0 0 18 18" width="16" height="16">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
      );
  }
}

/** Gray by default, reveals the platform's real brand color on hover/focus. */
export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  return (
    <span className="grayscale transition-[filter] duration-150 group-hover:grayscale-0 group-focus-visible:grayscale-0">
      <IconGlyph platform={platform} />
    </span>
  );
}
