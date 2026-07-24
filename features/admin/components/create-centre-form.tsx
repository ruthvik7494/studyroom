'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminCentreCreateSchema, type AdminCentreCreate } from '@/features/centres/schema';
import { adminCreateCentre, adminUploadCentreImage } from '../actions';

interface Amenity { id: string; label: string; icon: string | null }

/**
 * Admin "Create Centre" — one form, one submit. Cover image and gallery files
 * are picked here but not uploaded yet; they're only sent up after
 * `adminCreateCentre` returns a real centre id (uploads are namespaced by
 * centre id). Uploading goes through `adminUploadCentreImage`, a server
 * action using the service-role client — not the browser's own session —
 * since the browser-session upload path hit a Storage RLS rejection right
 * after a centre was created. That sequencing all happens inside this one
 * click; nothing extra is shown to the admin.
 */
export function CreateCentreForm({ amenities }: { amenities: Amenity[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading'>('idle');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<AdminCentreCreate>({
    resolver: zodResolver(adminCentreCreateSchema),
    defaultValues: { seats: 10, amenityIds: [] },
  });

  const busy = phase !== 'idle';

  const uploadOne = async (centreId: string, file: File, isCover: boolean): Promise<string | null> => {
    const fd = new FormData();
    fd.set('centreId', centreId);
    fd.set('isCover', String(isCover));
    fd.set('file', file);
    const res = await adminUploadCentreImage(fd);
    return res.ok ? null : res.error.message;
  };

  const onSubmit = async (values: AdminCentreCreate) => {
    setServerError(null);

    setPhase('saving');
    const res = await adminCreateCentre(values);
    if (!res.ok) { setServerError(res.error.message); setPhase('idle'); return; }

    const coverFile = coverInputRef.current?.files?.[0] ?? null;
    const galleryFiles = Array.from(galleryInputRef.current?.files ?? []);

    if (coverFile || galleryFiles.length) {
      setPhase('uploading');
      const uploadErrors: string[] = [];

      if (coverFile) {
        const coverErr = await uploadOne(res.data.id, coverFile, true);
        if (coverErr) uploadErrors.push(`Cover image: ${coverErr}`);
      }
      for (const file of galleryFiles) {
        const galleryErr = await uploadOne(res.data.id, file, false);
        if (galleryErr) uploadErrors.push(`${file.name}: ${galleryErr}`);
      }

      if (uploadErrors.length) {
        // The centre itself was already created successfully — don't lose that.
        // Surface which photo(s) failed so the admin can retry just those from
        // the centre's edit page, instead of re-doing the whole form.
        setServerError(`Centre saved, but some photos didn't upload: ${uploadErrors.join('; ')}`);
        setPhase('idle');
        return;
      }
    }

    router.push('/admin/centres');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4" noValidate>
      <div>
        <Label htmlFor="name">Name of Centre</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" aria-invalid={!!errors.address} {...register('address')} />
        {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="price">Price (₹ / month)</Label>
          <Input id="price" type="number" min={1} aria-invalid={!!errors.price} {...register('price')} />
          {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div>
          <Label htmlFor="seats">Total seats</Label>
          <Input id="seats" type="number" min={1} aria-invalid={!!errors.seats} {...register('seats')} />
          {errors.seats && <p className="mt-1 text-xs text-destructive">{errors.seats.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="about">About Centre</Label>
        <textarea
          id="about"
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register('about')}
        />
        {errors.about && <p className="mt-1 text-xs text-destructive">{errors.about.message}</p>}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Popular Facilities</legend>
        <div className="grid grid-cols-2 gap-2">
          {amenities.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={a.id} {...register('amenityIds')} className="h-4 w-4 rounded border-input" />
              {a.icon ? `${a.icon} ` : ''}{a.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="cover">Header Image / Cover Image</Label>
        <input id="cover" ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block text-sm" />
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP, or AVIF — under 5 MB.</p>
      </div>

      <div>
        <Label htmlFor="gallery">Gallery</Label>
        <input id="gallery" ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="mt-1 block text-sm" />
        <p className="mt-1 text-xs text-muted-foreground">Select multiple photos at once. Same formats, under 5 MB each.</p>
      </div>

      {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}

      <Button type="submit" disabled={busy}>
        {phase === 'saving' ? 'Saving…' : phase === 'uploading' ? 'Uploading photos…' : 'Create Centre'}
      </Button>
    </form>
  );
}
