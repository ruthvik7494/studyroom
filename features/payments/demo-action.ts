'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/rbac';
import { action } from '@/lib/auth/action';
import { ActionError, type Result } from '@/lib/result';
import { notifyBooking, notifyOwnerOfBooking } from '@/features/notifications/notify';
import { getUserEmail } from '@/lib/email';
import { z } from 'zod';

import { admin } from '@/lib/supabase/admin';

const demoPaySchema = z.object({
  bookingId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
}).refine((v) => !!v.bookingId !== !!v.groupId, { message: 'Provide exactly one of bookingId or groupId' });

/** Demo payment action: Marks booking as paid and confirmed directly upon user click without Razorpay */
export async function confirmDemoPayment(raw: unknown): Promise<Result<{ ok: true }>> {
  return action(demoPaySchema, raw, async (input) => {
    const user = await requireUser();
    const db = await createClient();

    const demoPaymentId = `pay_demo_${Date.now()}`;

    let query = admin
      .from('bookings')
      .update({ payment: 'paid', status: 'confirmed', razorpay_payment_id: demoPaymentId })
      .eq('user_id', user.id);

    query = input.groupId ? query.eq('booking_group_id', input.groupId) : query.eq('id', input.bookingId!);

    const { data: updated, error } = await query.select('user_id, centre_id, centres(name, owner_id)');
    if (error) throw error;

    if (updated && updated.length > 0) {
      try {
        const email = await getUserEmail(user.id);
        await notifyBooking(user.id, 'confirmed', { email });

        const centre = updated[0]!.centres as unknown as { name: string; owner_id: string | null } | null;
        if (centre?.owner_id) {
          const [ownerEmail, { data: studentProfile }] = await Promise.all([
            getUserEmail(centre.owner_id),
            db.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          ]);
          await notifyOwnerOfBooking(centre.owner_id, 'confirmed', {
            email: ownerEmail,
            studentName: studentProfile?.full_name ?? 'A student',
            centreName: centre.name,
          });
        }
      } catch (e) {
        console.error('Demo payment notification error (suppressed):', e);
      }
    }
    revalidatePath('/account');
    return { ok: true as const };
  });
}
