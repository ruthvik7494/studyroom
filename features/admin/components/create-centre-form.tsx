'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUploader } from '@/features/centres/components/image-uploader';
import { adminCentreCreateSchema, type AdminCentreCreate } from '@/features/centres/schema';
import { adminCreateCentre } from '../actions';

interface Amenity { id: string; label: string; icon: string | null }

/**
 * Admin "Create Centre" — a single screen, but a two-part submit under the
 * hood: details save first (returns a centre id), then photo upload unlocks,
 * because Storage paths are namespaced by centre id and can't be written to
 * before the row exists. From the admin's point of view it's still one form,
 * one flow, top to bottom.
 */
export function CreateCentreForm({ amenities }: { amenities: Amenity[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; slug: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AdminCentreCreate>({
    resolver: zodResolver(adminCentreCreateSchema),
    defaultValues: { seats: 10, amenityIds: [] },
  });

  const onSubmit = async (values: AdminCentreCreate) => {
    setServerError(null);
    const res = await adminCreateCentre(values);
    if (!res.ok) { setServerError(res.error.message); return; }
    setCreated(res.data);
  };

  const finish = () => {
    router.push('/admin/centres');
    router.refresh();
  };

  if (created) {
    return (
      <div className="max-w-xl space-y-6">
        <p className="rounded-md bg-secondary p-3 text-sm text-brand-green">
          “{created.slug}” saved and live. Add photos below, or finish now and add them later.
        </p>
        <div>
          <h2 className="mb-2 font-display text-sm font-bold">Main image</h2>
          <ImageUploader centreId={created.id} isCover label="Upload the main/cover photo" />
        </div>
        <div>
          <h2 className="mb-2 font-display text-sm font-bold">Gallery</h2>
          <ImageUploader centreId={created.id} multiple label="Upload gallery photos (select several at once)" />
        </div>
        <Button type="button" onClick={finish}>Done</Button>
      </div>
    );
  }

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

      {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Create Centre'}
      </Button>
    </form>
  );
}
