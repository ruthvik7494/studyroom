'use server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { rateLimit, clientKey } from '@/lib/rate-limit';
import { sendEmail, getUserEmail } from '@/lib/email';
import type { Result } from '@/lib/result';
import { err } from '@/lib/result';
import { enquirySchema } from './schema';

/**
 * Submit an enquiry to a centre.
 *
 * Data flow (charter §form-to-db): validate (client) → validate (server, here) →
 * insert into `enquiries` → log the owner-notification email in `email_logs` →
 * return typed Result the form renders. Guests allowed (sender_id null).
 *
 * Anti-abuse: rate-limited per IP; DB dedupe index blocks identical spam.
 */
export async function submitEnquiry(raw: unknown): Promise<Result<{ id: string }>> {
  // Rate limit BEFORE validation work (charter §security: rate-limit forms).
  const h = await headers();
  const limit = await rateLimit(clientKey(h, 'enquiry'), 5, 60_000); // 5/min/IP
  if (!limit.success) return err('RATE_LIMITED', 'Too many enquiries. Please wait a minute and try again.');

  return action(enquirySchema, raw, async (input) => {
    const db = await createClient();
    const user = await getSessionUser(); // may be null (guest)

    const { data, error } = await db
      .from('enquiries')
      .insert({
        centre_id: input.centreId,
        sender_id: user?.id ?? null,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        message: input.message,
      })
      .select('id')
      .single();
    if (error) throw error;

    // Fetch centre + owner so we can notify. Fire-and-forget the emails so a mail
    // hiccup never fails the enquiry write (the row is what matters).
    const { data: centre } = await db
      .from('centres')
      .select('name, owner_id')
      .eq('id', input.centreId)
      .maybeSingle();

    const centreName = centre?.name ?? 'the centre';

    // Confirmation to the student
    // void sendEmail({
    //   to: input.email,
    //   template: 'enquiry_confirmation',
    //   subject: `Your enquiry to ${centreName}`,
    //   html: `<p>Hi ${escapeHtml(input.name)},</p><p>We’ve passed your enquiry to <strong>${escapeHtml(centreName)}</strong>. They’ll reply to you by email.</p><p style="color:#666">Your message: ${escapeHtml(input.message)}</p><p>— StudyNook</p>`,
    // });


    // Confirmation to the student
    console.log("About to send confirmation email:", input.email);

    const sent = await sendEmail({
      to: input.email,
      template: 'enquiry_confirmation',
      subject: `Your enquiry to ${centreName}`,
      html: `<p>Hi ${escapeHtml(input.name)},</p><p>We’ve passed your enquiry to <strong>${escapeHtml(centreName)}</strong>. They’ll reply to you by email.</p><p style="color:#666">Your message: ${escapeHtml(input.message)}</p><p>— StudyNook</p>`,
    });

    console.log("Confirmation email result:", sent);

    // Notification to the owner (look up their email via admin API)
    if (centre?.owner_id) {
      const ownerEmail = await getUserEmail(centre.owner_id);
      if (ownerEmail) {
        void sendEmail({
          to: ownerEmail,
          template: 'enquiry_owner_notification',
          subject: `New enquiry for ${centreName}`,
          html: `<p>You have a new enquiry for <strong>${escapeHtml(centreName)}</strong>.</p><p><strong>${escapeHtml(input.name)}</strong> (${escapeHtml(input.email)}${input.phone ? ', ' + escapeHtml(input.phone) : ''})</p><p>${escapeHtml(input.message)}</p><p>Reply directly to their email to respond.</p>`,
        });
      }
    }

    return { id: data.id };
  });
}

/** Minimal HTML escaping for user-supplied text in emails. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
