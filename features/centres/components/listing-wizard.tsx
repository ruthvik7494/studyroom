'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { centreUpsertSchema, type CentreUpsert } from '../schema';
import { createCentre, updateCentre, uploadCentreImage, uploadCentreLogo } from '../actions';

interface Amenity { id: string; label: string; icon: string | null }

/** index 0 = Sunday .. 6 = Saturday — matches centre_hours.day_of_week / JS Date.getDay(). */
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // display Monday..Sunday, matching the reference design

const SPACE_TYPES: { value: CentreUpsert['spaceType']; label: string; icon: string }[] = [
  { value: 'study_hall', label: 'Study Centre', icon: '🎓' },
  { value: 'reading_room', label: 'Reading Room', icon: '📖' },
  { value: 'coworking', label: 'Coworking Space', icon: '💼' },
  { value: 'both', label: 'Study + Coworking', icon: '🏢' },
];

const PRICE_FIELDS: { key: keyof CentreUpsert; label: string }[] = [
  { key: 'priceHourly', label: 'Hourly' },
  { key: 'priceDaily', label: 'Daily' },
  { key: 'priceWeekly', label: 'Weekly' },
  { key: 'priceFortnightly', label: 'Fortnightly' },
  { key: 'priceMonthly', label: 'Monthly' },
  { key: 'priceQuarterly', label: 'Quarterly' },
  { key: 'priceHalfYearly', label: 'Half-yearly' },
  { key: 'priceYearly', label: 'Yearly' },
];

const GALLERY_SLOTS = ['Exterior View', 'Reception', 'Reading Hall', 'Seating Area', 'Private Cabins', 'Cafeteria', 'Parking Area', 'Other Facilities'];

const STEPS = ['Profile & Category', 'Address & Contact', 'Operating Hours', 'Facilities & Amenities', 'Social Networks', 'Gallery', 'Review & Publish'];

type Props =
  | { mode: 'create'; centreId?: undefined; defaults?: undefined; amenities: Amenity[] }
  | { mode: 'edit'; centreId: string; defaults: Partial<CentreUpsert>; amenities: Amenity[] };

/**
 * 7-step listing wizard. Everything lives in ONE react-hook-form instance —
 * Next/Back just change which step is visible, so nothing is lost moving
 * between steps. Photos (logo, cover, gallery) are picked as files here but
 * only actually uploaded once the centre is saved on the final step — the
 * same reasoning as the old single-page form: Storage needs a real centre id
 * to upload into, which only exists after the text fields are saved.
 */
export function ListingWizard(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading'>('idle');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CentreUpsert>({
    resolver: zodResolver(centreUpsertSchema),
    defaultValues: { spaceType: 'study_hall', seats: 10, amenityIds: [], country: 'India', ...props.defaults },
  });

  const busy = phase !== 'idle';
  const values = watch();

  const uploadOne = async (centreId: string, file: File, opts: { isCover?: boolean; category?: string } = {}): Promise<string | null> => {
    const fd = new FormData();
    fd.set('centreId', centreId);
    fd.set('isCover', String(!!opts.isCover));
    if (opts.category) fd.set('category', opts.category);
    fd.set('file', file);
    const res = await uploadCentreImage(fd);
    return res.ok ? null : res.error.message;
  };

  const onSubmit = async (formValues: CentreUpsert) => {
    setServerError(null);
    setPhase('saving');

    const res = props.mode === 'create'
      ? await createCentre(formValues)
      : await updateCentre({ ...formValues, centreId: props.centreId });
    if (!res.ok) { setServerError(res.error.message); setPhase('idle'); return; }

    const centreId = props.mode === 'create' && 'id' in res.data ? res.data.id : props.centreId;
    if (centreId) {
      const logoFile = logoInputRef.current?.files?.[0] ?? null;
      const coverFile = coverInputRef.current?.files?.[0] ?? null;
      const galleryFiles = GALLERY_SLOTS
        .map((slot) => ({ slot, file: galleryRefs.current[slot]?.files?.[0] ?? null }))
        .filter((g): g is { slot: string; file: File } => !!g.file);

      if (logoFile || coverFile || galleryFiles.length) {
        setPhase('uploading');
        const uploadErrors: string[] = [];

        if (logoFile) {
          const fd = new FormData();
          fd.set('centreId', centreId);
          fd.set('file', logoFile);
          const logoRes = await uploadCentreLogo(fd);
          if (!logoRes.ok) uploadErrors.push(`Logo: ${logoRes.error.message}`);
        }
        if (coverFile) {
          const e = await uploadOne(centreId, coverFile, { isCover: true });
          if (e) uploadErrors.push(`Cover image: ${e}`);
        }
        for (const { slot, file } of galleryFiles) {
          const e = await uploadOne(centreId, file, { category: slot });
          if (e) uploadErrors.push(`${slot}: ${e}`);
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

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const goto = (i: number) => setStep(i);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => goto(i)}
            className="flex shrink-0 items-center gap-1.5"
            aria-current={step === i ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                i === step ? 'bg-[#2d6c4f] text-white' : i < step ? 'bg-[#2d6c4f]/20 text-[#2d6c4f]' : 'bg-secondary text-muted-foreground',
              )}
            >
              {i + 1}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
          </button>
        ))}
      </div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
      <h2 className="mb-1 font-display text-xl font-bold">{STEPS[step]}</h2>

      {/* STEP 1 — Profile & Category */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Tell us about your study centre</p>

          <div>
            <Label htmlFor="name">Centre Name</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="logo">Business Logo</Label>
              <input id="logo" ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block text-sm" />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG (max 5MB)</p>
            </div>
            <div>
              <Label htmlFor="cover">Cover Image</Label>
              <input id="cover" ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block text-sm" />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG (max 5MB)</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Select Category</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SPACE_TYPES.map((t) => (
                <label key={t.value} className={cn('flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 text-center text-xs font-medium', values.spaceType === t.value && 'border-[#2d6c4f] bg-[#2d6c4f]/5')}>
                  <input type="radio" value={t.value} className="sr-only" {...register('spaceType')} />
                  <span className="text-xl" aria-hidden>{t.icon}</span>
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="seats">Seating Capacity</Label>
            <Input id="seats" type="number" min={1} aria-invalid={!!errors.seats} {...register('seats')} />
            {errors.seats && <p className="mt-1 text-xs text-destructive">{errors.seats.message}</p>}
          </div>

          <div>
            <Label htmlFor="about">Short Description</Label>
            <textarea id="about" rows={3} placeholder="Describe your study centre in a few words…" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('about')} />
          </div>
        </div>
      )}

      {/* STEP 2 — Address & Contact */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Add your study centre location and contact details</p>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="123, MG Road, Near City Library" aria-invalid={!!errors.address} {...register('address')} />
            {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} />
            </div>
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input id="postcode" {...register('postcode')} />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
            </div>
          </div>

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

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Contact Details</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Mobile Number</Label>
                <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
              </div>
              <div>
                <Label htmlFor="altPhone">Alternate Number</Label>
                <Input id="altPhone" placeholder="+91 91234 56789" {...register('altPhone')} />
              </div>
              <div>
                <Label htmlFor="businessEmail">Email Address</Label>
                <Input id="businessEmail" type="email" aria-invalid={!!errors.businessEmail} {...register('businessEmail')} />
                {errors.businessEmail && <p className="mt-1 text-xs text-destructive">{errors.businessEmail.message}</p>}
              </div>
              <div>
                <Label htmlFor="website">Website (Optional)</Label>
                <Input id="website" placeholder="https://…" aria-invalid={!!errors.website} {...register('website')} />
                {errors.website && <p className="mt-1 text-xs text-destructive">{errors.website.message}</p>}
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* STEP 3 — Operating Hours */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">Set your study centre timing and pricing</p>

          <div>
            <p className="mb-2 text-sm font-medium">Pricing</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRICE_FIELDS.map((p) => (
                <div key={p.key}>
                  <Label htmlFor={p.key}>{p.label} (₹)</Label>
                  <Input id={p.key} type="number" min={1} {...register(p.key as 'priceHourly')} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Fill in whichever durations you offer — at least one.</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Weekly Timings</p>
            <div className="space-y-2 rounded-md border p-3">
              {DAY_ORDER.map((dayIdx) => {
                const isOpen = watch(`hours.${dayIdx}.isOpen`);
                return (
                  <div key={dayIdx} className="flex flex-wrap items-center gap-2">
                    <label className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium">
                      <input type="checkbox" className="h-4 w-4 rounded border-input accent-[#2d6c4f]" {...register(`hours.${dayIdx}.isOpen`)} />
                      {DAY_LABELS[dayIdx]}
                    </label>
                    {isOpen ? (
                      <div className="flex items-center gap-2 text-sm">
                        <input type="time" className="h-9 rounded-md border border-input bg-background px-2 text-sm" {...register(`hours.${dayIdx}.openingTime`)} />
                        <span className="text-muted-foreground">to</span>
                        <input type="time" className="h-9 rounded-md border border-input bg-background px-2 text-sm" {...register(`hours.${dayIdx}.closingTime`)} />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 — Facilities & Amenities */}
      {step === 3 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Select all the facilities available at your centre</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {props.amenities.map((a) => {
              const checked = values.amenityIds?.includes(a.id);
              return (
                <label key={a.id} className={cn('flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs font-medium', checked && 'border-[#2d6c4f] bg-[#2d6c4f]/5')}>
                  <input type="checkbox" value={a.id} className="sr-only" {...register('amenityIds')} />
                  <span className="text-lg" aria-hidden>{a.icon ?? '✓'}</span>
                  {a.label}
                </label>
              );
            })}
          </div>

          <label className="mt-4 flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 rounded border-input accent-[#2d6c4f]" {...register('womenSafeClaim')} />
            🛡 This centre has women-safe access/facilities
          </label>
          <p className="mt-1 text-xs text-muted-foreground">Reviewed by our team as part of approving your listing.</p>
        </div>
      )}

      {/* STEP 5 — Social Networks */}
      {step === 4 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Add your social media & online presence</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['facebook', 'Facebook', 'https://facebook.com/yourpage'],
              ['instagram', 'Instagram', 'https://instagram.com/yourpage'],
              ['youtube', 'YouTube', 'https://youtube.com/@yourchannel'],
              ['linkedin', 'LinkedIn', 'https://linkedin.com/company/yourpage'],
              ['twitter', 'X (Twitter)', 'https://x.com/yourpage'],
              ['whatsapp', 'WhatsApp', 'https://wa.me/91XXXXXXXXXX'],
              ['googleBusiness', 'Google Business', 'https://g.page/yourbusiness'],
            ] as const).map(([key, label, placeholder]) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input id={key} placeholder={placeholder} aria-invalid={!!errors[key]} {...register(key)} />
                {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]?.message}</p>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Website is set in Address & Contact (step 2) — it's the same field.</p>
        </div>
      )}

      {/* STEP 6 — Gallery */}
      {step === 5 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Upload photos of your study centre</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GALLERY_SLOTS.map((slot) => (
              <div key={slot}>
                <Label htmlFor={`gallery-${slot}`}>{slot}</Label>
                <input
                  id={`gallery-${slot}`}
                  ref={(el) => { galleryRefs.current[slot] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="mt-1 block w-full text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 7 — Review & Publish */}
      {step === 6 && (
        <div className="space-y-3">
          <p className="mb-2 text-sm text-muted-foreground">Review your details before publishing your listing</p>
          {[
            { title: 'Profile & Category', i: 0, lines: [values.name, SPACE_TYPES.find((t) => t.value === values.spaceType)?.label, `${values.seats} seats`] },
            { title: 'Address & Contact', i: 1, lines: [values.address, [values.city, values.state, values.postcode].filter(Boolean).join(', '), values.phone] },
            { title: 'Operating Hours', i: 2, lines: [PRICE_FIELDS.filter((p) => values[p.key]).map((p) => `${p.label}: ₹${values[p.key]}`).join(' · ') || 'No prices set'] },
            { title: 'Facilities & Amenities', i: 3, lines: [`${values.amenityIds?.length ?? 0} facilities selected`] },
            { title: 'Social Networks', i: 4, lines: [[values.facebook, values.instagram, values.youtube, values.linkedin, values.twitter, values.whatsapp, values.googleBusiness].filter(Boolean).length + ' links added'] },
            { title: 'Gallery', i: 5, lines: ['Photos picked above will upload once you publish'] },
          ].map((s) => (
            <div key={s.title} className="flex items-start justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                {s.lines.filter(Boolean).map((l, idx) => <p key={idx} className="text-xs text-muted-foreground">{l}</p>)}
              </div>
              <button type="button" onClick={() => goto(s.i)} className="text-xs font-semibold text-[#2d6c4f] hover:underline">Edit</button>
            </div>
          ))}
        </div>
      )}

      {serverError && <p className="mt-4 text-sm text-destructive" role="alert">{serverError}</p>}

      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="outline" onClick={back} disabled={step === 0 || busy}>Back</Button>
        <div className="flex gap-2">
          {step === STEPS.length - 1 && (
            <Button type="submit" variant="outline" disabled={busy}>
              {phase === 'saving' ? 'Saving…' : 'Save Draft'}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} className="bg-[#2d6c4f] hover:bg-[#2d6c4f]/90">Next →</Button>
          ) : (
            <Button type="submit" disabled={busy} className="bg-[#2d6c4f] hover:bg-[#2d6c4f]/90">
              {phase === 'saving' ? 'Saving…' : phase === 'uploading' ? 'Uploading photos…' : (props.mode === 'create' ? 'Preview & Publish →' : 'Save changes')}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
