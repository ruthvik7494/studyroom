'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { centreUpsertSchema, type CentreUpsert } from '../schema';
import { createCentre, updateCentre, uploadCentreImage } from '../actions';

interface Amenity { id: string; label: string; icon: string | null }

type Props =
  | { mode: 'create'; centreId?: undefined; defaults?: undefined; amenities: Amenity[] }
  | { mode: 'edit'; centreId: string; defaults: Partial<CentreUpsert>; amenities?: undefined };

/**
 * Create or edit a listing. Same Zod schema client + server, and — for
 * create — the same single-form pattern as the admin quick-create form:
 * details save first (one click), then the already-selected photos upload
 * right after, using the returned centre id. Nothing extra is shown to the
 * owner; it's still one form, one "Create listing" button.
 */
export function ListingForm(props: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading'>('idle');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CentreUpsert>({
    resolver: zodResolver(centreUpsertSchema),
    defaultValues: { emoji: '📖', spaceType: 'study_hall', seats: 10, amenityIds: [], ...props.defaults },
  });

  const busy = phase !== 'idle';

  const uploadOne = async (centreId: string, file: File, isCover: boolean): Promise<string | null> => {
    const fd = new FormData();
    fd.set('centreId', centreId);
    fd.set('isCover', String(isCover));
    fd.set('file', file);
    const res = await uploadCentreImage(fd);
    return res.ok ? null : res.error.message;
  };

  const onSubmit = async (values: CentreUpsert) => {
    setServerError(null);
    setPhase('saving');

    const res = props.mode === 'create'
      ? await createCentre(values)
      : await updateCentre({ ...values, centreId: props.centreId });
    if (!res.ok) { setServerError(res.error.message); setPhase('idle'); return; }

    // Photos only apply on create — the edit page has its own Photos section.
    if (props.mode === 'create' && 'id' in res.data) {
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
          setServerError(`Listing saved, but some photos didn't upload: ${uploadErrors.join('; ')}`);
          setPhase('idle');
          return;
        }
      }
    }

    router.push('/owner/centres');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4" noValidate>
      <div>
        <Label htmlFor="name">Centre name</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="area">Area</Label>
        <Input id="area" placeholder="e.g. Hanamkonda" aria-invalid={!!errors.area} {...register('area')} />
        {errors.area && <p className="mt-1 text-xs text-destructive">{errors.area.message}</p>}
      </div>

      <div>
        <Label htmlFor="spaceType">Type</Label>
        <select id="spaceType" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('spaceType')}>
          <option value="study_hall">Study hall</option>
          <option value="reading_room">Reading room</option>
          <option value="coworking">Coworking</option>
          <option value="both">Study + coworking</option>
        </select>
      </div>

      {props.mode === 'create' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="priceDaily">Price (₹ / day)</Label>
              <Input id="priceDaily" type="number" min={1} aria-invalid={!!errors.priceDaily} {...register('priceDaily')} />
              {errors.priceDaily && <p className="mt-1 text-xs text-destructive">{errors.priceDaily.message}</p>}
            </div>
            <div>
              <Label htmlFor="priceMonthly">Price (₹ / month)</Label>
              <Input id="priceMonthly" type="number" min={1} aria-invalid={!!errors.priceMonthly} {...register('priceMonthly')} />
              {errors.priceMonthly && <p className="mt-1 text-xs text-destructive">{errors.priceMonthly.message}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Fill in at least one — daily, monthly, or both.</p>

          <div>
            <Label htmlFor="seats">Total seats</Label>
            <Input id="seats" type="number" min={1} aria-invalid={!!errors.seats} {...register('seats')} />
            {errors.seats && <p className="mt-1 text-xs text-destructive">{errors.seats.message}</p>}
          </div>

          <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('womenSafeClaim')} />
            🛡 This centre has women-safe access/facilities
          </label>
          <p className="-mt-2 text-xs text-muted-foreground">
            Reviewed by our team as part of approving your listing — it won't show publicly until then.
          </p>
        </>
      )}

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

      {props.mode === 'create' && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Popular Facilities</legend>
          <div className="grid grid-cols-2 gap-2">
            {props.amenities.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={a.id} {...register('amenityIds')} className="h-4 w-4 rounded border-input" />
                {a.icon ? `${a.icon} ` : ''}{a.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lat">Latitude</Label>
          <Input id="lat" type="number" step="any" aria-invalid={!!errors.lat} {...register('lat', { valueAsNumber: true })} />
          {errors.lat && <p className="mt-1 text-xs text-destructive">{errors.lat.message}</p>}
        </div>
        <div>
          <Label htmlFor="lng">Longitude</Label>
          <Input id="lng" type="number" step="any" aria-invalid={!!errors.lng} {...register('lng', { valueAsNumber: true })} />
          {errors.lng && <p className="mt-1 text-xs text-destructive">{errors.lng.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="emoji">Icon</Label>
        <Input id="emoji" className="w-20" maxLength={4} {...register('emoji')} />
      </div>

      {props.mode === 'create' && (
        <>
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
        </>
      )}

      {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}

      <Button type="submit" disabled={busy}>
        {phase === 'saving' ? 'Saving…' : phase === 'uploading' ? 'Uploading photos…' : props.mode === 'create' ? 'Create listing' : 'Save changes'}
      </Button>
    </form>
  );
}
