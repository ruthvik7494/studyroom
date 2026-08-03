'use client';
import { useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ownerProfileSchema, type OwnerProfileInput } from '../schema';
import { updateOwnerProfile, uploadOwnerAvatar } from '../actions';

// Storage bucket's server-side allowed types — kept in sync with
// uploadOwnerAvatar in features/auth/actions.ts so the client can give a
// precise message instead of a generic one.
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

interface OwnerProfileFormProps {
  defaults: { bio: string; publicEmail: string };
  avatarUrl: string | null;
  fullName: string;
}

/**
 * Public-facing owner profile: photo, about text, and a public contact
 * email — shown to students on the "Centre Owner" card on every one of this
 * owner's centre listing pages. Name and phone are reused from the shared
 * Personal Details card above this one (profiles.full_name / profiles.phone).
 */
export function OwnerProfileForm({ defaults, avatarUrl, fullName }: OwnerProfileFormProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OwnerProfileInput>({
    resolver: zodResolver(ownerProfileSchema),
    defaultValues: defaults,
  });

  const onSubmit = async (values: OwnerProfileInput) => {
    setServerError(null); setNotice(null);
    const res = await updateOwnerProfile(values);
    if (!res.ok) { setServerError(res.error.message); return; }
    setNotice('Public profile saved.');
    router.refresh();
  };

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setAvatarStatus('error');
      setAvatarError(`${file.type || 'That file type'} isn't supported — use JPEG, PNG, WebP, or AVIF.`);
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarStatus('error');
      setAvatarError('Image must be under 5 MB.');
      e.target.value = '';
      return;
    }

    setAvatarStatus('uploading');
    setAvatarError(null);
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadOwnerAvatar(fd);
    e.target.value = '';

    if (!res.ok) { setAvatarStatus('error'); setAvatarError(res.error.message); return; }
    setPreview(res.data.url);
    setAvatarStatus('idle');
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-primary" aria-hidden>{fullName ? fullName.charAt(0).toUpperCase() : '👤'}</span>
          )}
        </span>
        <div>
          <label className="inline-flex cursor-pointer items-center rounded-full border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
            {avatarStatus === 'uploading' ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/*" onChange={onAvatarChange} disabled={avatarStatus === 'uploading'} className="hidden" />
          </label>
          {avatarError && <p className="mt-1 text-xs text-destructive">{avatarError}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">Shown to students on your listing pages. JPEG/PNG/WebP, under 5 MB.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-3" noValidate>
        <div>
          <Label htmlFor="bio">About you <span className="text-muted-foreground">(optional)</span></Label>
          <textarea
            id="bio"
            rows={4}
            placeholder="Tell students a bit about yourself and your centres…"
            aria-invalid={!!errors.bio}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register('bio')}
          />
          {errors.bio && <p className="mt-1 text-xs text-destructive">{errors.bio.message}</p>}
        </div>
        <div>
          <Label htmlFor="publicEmail">Public contact email <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="publicEmail" type="email" placeholder="you@example.com" autoComplete="email" aria-invalid={!!errors.publicEmail} {...register('publicEmail')} />
          {errors.publicEmail && <p className="mt-1 text-xs text-destructive">{errors.publicEmail.message}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">Shown to students instead of your login email. Leave blank to hide it.</p>
        </div>

        {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}
        {notice && <p className="text-sm text-brand-green" role="status">{notice}</p>}

        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save public profile'}</Button>
      </form>
    </div>
  );
}
