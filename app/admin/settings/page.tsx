import type { Metadata } from 'next';
import { noindex } from '@/lib/seo';
import { SettingsPageContent } from '@/components/settings-page-content';

export const metadata: Metadata = { title: 'Settings · Admin', ...noindex };

export default function AdminSettingsPage() {
  return <SettingsPageContent />;
}
