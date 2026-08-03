import type { Metadata } from 'next';
import { noindex } from '@/lib/seo';
import { SettingsPageContent } from '@/components/settings-page-content';

export const metadata: Metadata = { title: 'Settings · Owner', ...noindex };

export default function OwnerSettingsPage() {
  return <SettingsPageContent />;
}
