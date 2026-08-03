'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contactSchema, type ContactInput } from '../schema';
import { submitContactMessage } from '../actions';
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger';
import { EASE_OUT, DURATION } from '@/lib/motion';

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (values: ContactInput) => {
    setServerError(null);
    const res = await submitContactMessage(values);
    if (!res.ok) { setServerError(res.error.message); return; }
    setSent(true);
    reset();
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        className="rounded-xl bg-secondary p-6 text-sm"
      >
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT, delay: 0.1 }}
          className="inline-flex items-center gap-2 font-display text-lg font-bold text-brand-green"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden /> Message sent
        </motion.span>
        <p className="mt-1 text-muted-foreground">Thanks for reaching out — we'll get back to you by email soon.</p>
        <button className="mt-3 text-sm font-semibold underline" onClick={() => setSent(false)}>Send another</button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <StaggerGroup className="space-y-4" margin="-20px">
      <StaggerItem className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium">First name</label>
          <Input id="firstName" autoComplete="given-name" placeholder="First name" aria-invalid={!!errors.firstName} {...register('firstName')} />
          {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium">Last name</label>
          <Input id="lastName" autoComplete="family-name" placeholder="Last name" aria-invalid={!!errors.lastName} {...register('lastName')} />
          {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </StaggerItem>

      <StaggerItem>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!errors.email} {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </StaggerItem>

      <StaggerItem>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium">Phone <span className="text-muted-foreground">(optional)</span></label>
        <Input id="phone" type="tel" inputMode="numeric" maxLength={10} autoComplete="tel" placeholder="9876543210" aria-invalid={!!errors.phone} {...register('phone')} />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
      </StaggerItem>

      <StaggerItem>
        <label htmlFor="message" className="mb-1 block text-sm font-medium">Message</label>
        <textarea
          id="message"
          rows={4}
          placeholder="Leave us a message…"
          aria-invalid={!!errors.message}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register('message')}
        />
        {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>}
      </StaggerItem>

      <StaggerItem>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-input" {...register('agreePrivacy')} />
          <span>You agree to our <a href="/privacy" className="underline hover:text-foreground">privacy policy</a>.</span>
        </label>
        {errors.agreePrivacy && <p className="mt-1 text-xs text-destructive">{errors.agreePrivacy.message}</p>}
      </StaggerItem>

      {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}

      <StaggerItem>
        <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…
            </span>
          ) : (
            'Send message'
          )}
        </Button>
      </StaggerItem>
      </StaggerGroup>
    </form>
  );
}
