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
      <div className="bg-white p-8 border border-[#bdcaba]/50 rounded-sm" role="status">
        <p className="font-['Lexend',sans-serif] text-xl font-bold text-[#16a34a] mb-2 uppercase tracking-wide">Enquiry sent ✓</p>
        <p className="text-sm text-[#565e74] mb-4">The centre will get back to you by email. We’ve sent you a confirmation too.</p>
        <button className="text-xs font-bold text-[#191c1e] underline uppercase tracking-wider" onClick={() => setSent(false)}>Send another</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 border border-[#bdcaba]/50 rounded-sm">
      <h3 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] mb-6 uppercase tracking-wide">Send us a message</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <input type="hidden" {...register('centreId')} />

        <div>
          <label className="block text-xs font-bold text-[#565e74] mb-2 uppercase tracking-wider" htmlFor="enq-name">Name</label>
          <input 
            id="enq-name" 
            autoComplete="name" 
            aria-invalid={!!errors.name} 
            placeholder="Your Name"
            className="w-full rounded-sm border border-[#bdcaba]/50 focus:border-[#191c1e] focus:ring-0 bg-white text-[#191c1e] text-sm p-3 outline-none transition-colors"
            {...register('name')} 
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[#565e74] mb-2 uppercase tracking-wider" htmlFor="enq-email">Email</label>
            <input 
              id="enq-email" 
              type="email" 
              autoComplete="email" 
              aria-invalid={!!errors.email} 
              placeholder="Your Email"
              className="w-full rounded-sm border border-[#bdcaba]/50 focus:border-[#191c1e] focus:ring-0 bg-white text-[#191c1e] text-sm p-3 outline-none transition-colors"
              {...register('email')} 
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#565e74] mb-2 uppercase tracking-wider" htmlFor="enq-phone">Phone</label>
            <input 
              id="enq-phone" 
              type="tel" 
              inputMode="numeric" 
              maxLength={10} 
              placeholder="Your Phone" 
              autoComplete="tel" 
              aria-invalid={!!errors.phone} 
              className="w-full rounded-sm border border-[#bdcaba]/50 focus:border-[#191c1e] focus:ring-0 bg-white text-[#191c1e] text-sm p-3 outline-none transition-colors"
              {...register('phone')} 
            />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#565e74] mb-2 uppercase tracking-wider" htmlFor="enq-message">Message</label>
          <textarea
            id="enq-message"
            rows={4}
            aria-invalid={!!errors.message}
            className="w-full rounded-sm border border-[#bdcaba]/50 focus:border-[#191c1e] focus:ring-0 bg-white text-[#191c1e] text-sm p-3 outline-none transition-colors"
            placeholder="How can we help you?"
            {...register('message')}
          />
          {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>}
        </div>

        {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-[#191c1e] text-white text-xs font-bold py-3.5 rounded-sm hover:bg-[#191c1e]/90 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
