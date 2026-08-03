'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profileSchema, type ProfileInput } from '../schema';
import { updateProfile } from '../actions';

/** Edit your own name + phone. Reuses the updateProfile Server Action. */
export function ProfileForm({ defaults }: { defaults: { fullName: string; phone: string } }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });

  const onSubmit = async (values: ProfileInput) => {
    setServerError(null); setNotice(null);
    const res = await updateProfile(values);
    if (!res.ok) { setServerError(res.error.message); return; }
    setNotice('Profile saved.');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 max-w-sm space-y-3" noValidate>
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" type="text" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
        {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="phone" type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" autoComplete="tel" aria-invalid={!!errors.phone} {...register('phone')} />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}
      {notice && <p className="text-sm text-brand-green" role="status">{notice}</p>}

      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save profile'}</Button>
    </form>
  );
}
