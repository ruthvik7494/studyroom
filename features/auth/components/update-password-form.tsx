'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword } from '../actions';
import { newPasswordSchema, type NewPassword } from '../schema';

export function UpdatePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NewPassword>({ resolver: zodResolver(newPasswordSchema) });

  const onSubmit = async (values: NewPassword) => {
    setError(null);
    const res = await updatePassword(values);
    if (!res.ok) { setError(res.error.message); return; }
    router.push('/'); router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div>
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
        {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        <p className="mt-1 text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Update password'}</Button>
    </form>
  );
}
