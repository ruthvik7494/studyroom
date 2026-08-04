import { redirect } from 'next/navigation';

/**
 * "Approvals" was merged into the "All Centres" page as a Pending Review
 * tab (same moderation actions — Approve/Reject — now shown inline for any
 * pending_review row there), so the two menu items that overlapped in
 * purpose are back to one. This route stays only so old bookmarks/links
 * still land somewhere sensible.
 */
export default function AdminCentresRedirect() {
  redirect('/admin/centres/all?tab=pending');
}
