'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { enquirySchema, type EnquiryInput } from '../schema';
import { submitEnquiry } from '../actions';

/**
 * Contact-a-centre form. Uses the SAME Zod schema as the server action, so
 * client and server validation can never drift. Renders success + error states.
 */
export function EnquiryForm({ centreId }: { centreId: string }) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { centreId },
  });

  const onSubmit = async (values: EnquiryInput) => {
    setServerError(null);
    const res = await submitEnquiry(values);
    if (res.ok) { setSent(true); reset({ centreId }); return; }
    // surface field errors from the server Result, else a general message
    if (res.error.fields) {
      for (const [field, messages] of Object.entries(res.error.fields)) {
        if (messages?.[0]) setError(field as keyof EnquiryInput, { message: messages[0] });
      }
    } else {
      setServerError(res.error.message);
    }
  };

  if (sent) {
    return (
      <div className="rounded-md bg-accent p-4 text-sm" role="status">
        <p className="font-semibold text-brand-green">Enquiry sent ✓</p>
        <p className="mt-1 text-muted-foreground">The centre will get back to you by email. We’ve sent you a confirmation too.</p>
        <button className="mt-2 text-sm font-semibold underline" onClick={() => setSent(false)}>Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <input type="hidden" {...register('centreId')} />

      <div>
        <Label htmlFor="enq-name">Name</Label>
        <Input id="enq-name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="enq-email">Email</Label>
        <Input id="enq-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="enq-phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="enq-phone" type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div>
        <Label htmlFor="enq-message">Message</Label>
        <textarea
          id="enq-message"
          rows={4}
          aria-invalid={!!errors.message}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Hi, I’d like to know about availability and monthly plans…"
          {...register('message')}
        />
        {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send enquiry'}
      </Button>
    </form>
  );
}
