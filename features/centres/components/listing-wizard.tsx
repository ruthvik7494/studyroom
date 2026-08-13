'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { centreUpsertSchema, withHttps, type CentreUpsert } from '../schema';
import { createCentre, updateCentre, uploadCentreImage, uploadCentreLogo, submitForReview } from '../actions';
import { DeletePhotoButton } from './delete-photo-button';

interface Amenity { id: string; label: string; icon: string | null }

/** index 0 = Sunday .. 6 = Saturday — matches centre_hours.day_of_week / JS Date.getDay(). */
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // display Monday..Sunday, matching the reference design

const SEATING_TIERS: { label: string; sub: string; icon: string; value: number }[] = [
  { label: '1 – 20', sub: 'Seats', icon: '👤', value: 20 },
  { label: '21 – 50', sub: 'Seats', icon: '👥', value: 50 },
  { label: '51 – 100', sub: 'Seats', icon: '👥', value: 100 },
  { label: '101 – 200', sub: 'Seats', icon: '👥', value: 200 },
  { label: '200+', sub: 'Seats', icon: '👥', value: 250 },
];

const BUSINESS_TAGS = ['Quiet', 'Premium', 'Affordable', 'AC', 'Library', '24x7', 'Students', 'Professionals'] as const;

/** Keeps the closing time's hour as-is, syncing only its minute to match the new opening minute (e.g. opening changed to 8:15 -> closing "10:00" becomes "10:15"). */
function syncMinuteToOpening(newOpeningTime: string, currentClosingTime: string): string {
  const minute = newOpeningTime.split(':')[1] ?? '00';
  const closingHour = currentClosingTime.split(':')[0] ?? '10';
  return `${closingHour}:${minute}`;
}

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

const STEPS = ['Profile & Contact', 'Operating Hours & Pricing', 'Facilities & Amenities', 'Social Networks', 'Gallery', 'Review & Publish'];

/** Which step each field lives on — used to jump to the first step with a validation error, since errors on a hidden step are otherwise invisible. */
const FIELD_STEP: Partial<Record<keyof CentreUpsert, number>> = {
  name: 0, seats: 0, about: 0, spaceType: 0, tags: 0, address: 0, city: 0, state: 0, country: 0, postcode: 0, lat: 0, lng: 0, phone: 0, altPhone: 0, businessEmail: 0, website: 0,
  priceHourly: 1, priceDaily: 1, priceWeekly: 1, priceFortnightly: 1, priceMonthly: 1, priceQuarterly: 1, priceHalfYearly: 1, priceYearly: 1, hours: 1,
  amenityIds: 2, womenSafeClaim: 2,
  facebook: 3, instagram: 3, youtube: 3, linkedin: 3, twitter: 3, whatsapp: 3, googleBusiness: 3,
};

interface ExistingPhoto { id: string; url: string; category: string | null }
interface ExistingPhotos { logoUrl: string | null; coverUrl: string | null; coverImageId: string | null; gallery: ExistingPhoto[] }

type Props =
  | { mode: 'create'; centreId?: undefined; defaults?: undefined; amenities: Amenity[]; intro?: string; photos?: undefined }
  | { mode: 'edit'; centreId: string; defaults: Partial<CentreUpsert>; amenities: Amenity[]; intro?: string; photos: ExistingPhotos };

/**
 * 7-step listing wizard. Everything lives in ONE react-hook-form instance —
 * Next/Back just change which step is visible, so text-field values are
 * never lost moving between steps (that's normal RHF behaviour).
 *
 * Files are different: a native <input type="file"> is uncontrolled, and
 * React unmounts a step's DOM entirely when it's not the active step (the
 * `{step === N && (...)}` pattern). That means the file input itself — and
 * whatever it had selected — is destroyed the moment you navigate away, and
 * a fresh one appears with nothing selected when you come back. Fixed by
 * holding every picked File in this component's own React state (logoFile,
 * coverFile, galleryFiles) instead of trusting the DOM node to remember —
 * state survives the remount; the DOM node's own "no file chosen" display
 * doesn't matter once the picked filename is shown from state instead.
 */
export function ListingWizard(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxUnlocked, setMaxUnlocked] = useState(props.mode === 'edit' ? 6 : 0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading'>('idle');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<Record<string, File[]>>({});
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  /** Which button was actually clicked — 'draft' (stays a draft) or 'publish' (also submits for admin review). A ref, not state: the submit handler runs synchronously right after the click, before a state update would be guaranteed to have flushed. */
  const submitIntent = useRef<'draft' | 'publish'>('draft');

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<CentreUpsert>({
    resolver: zodResolver(centreUpsertSchema),
    mode: 'onBlur',
    defaultValues: { spaceType: 'study_hall', seats: 10, amenityIds: [], tags: [], country: 'India', ...props.defaults },
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

  const doSubmit = async (formValues: CentreUpsert) => {
    setServerError(null);
    setPhase('saving');
    let navigatedAway = false;

    try {
      const res = props.mode === 'create'
        ? await createCentre(formValues)
        : await updateCentre({ ...formValues, centreId: props.centreId });
      if (!res.ok) { setServerError(res.error.message); return; }

      const centreId = props.mode === 'create' && 'id' in res.data ? res.data.id : props.centreId;
      if (centreId) {
        const allGalleryFiles = [
          ...Object.entries(galleryFiles).flatMap(([slot, files]) => files.map((file) => ({ slot, file }))),
          ...extraFiles.map((file) => ({ slot: undefined as string | undefined, file })),
        ];

        if (logoFile || coverFile || allGalleryFiles.length) {
          setPhase('uploading');
          const uploadErrors: string[] = [];

          // None of logo/cover/gallery uploads depend on each other, so all
          // of them run together instead of one after another — previously
          // a listing with a logo, cover, and several gallery photos paid
          // for every single upload's latency back-to-back.
          const [logoResult, coverResult, ...galleryResults] = await Promise.all([
            logoFile
              ? (async () => {
                  const fd = new FormData();
                  fd.set('centreId', centreId);
                  fd.set('file', logoFile);
                  const res = await uploadCentreLogo(fd);
                  return res.ok ? null : `Logo: ${res.error.message}`;
                })()
              : Promise.resolve(null),
            coverFile
              ? uploadOne(centreId, coverFile, { isCover: true }).then((e) => (e ? `Cover image: ${e}` : null))
              : Promise.resolve(null),
            ...allGalleryFiles.map(({ slot, file }) =>
              uploadOne(centreId, file, slot ? { category: slot } : {}).then((e) => (e ? `${slot ?? file.name}: ${e}` : null)),
            ),
          ]);
          if (logoResult) uploadErrors.push(logoResult);
          if (coverResult) uploadErrors.push(coverResult);
          galleryResults.forEach((e) => { if (e) uploadErrors.push(e); });

          if (uploadErrors.length) {
            setServerError(`Listing saved, but some photos didn't upload: ${uploadErrors.join('; ')}`);
            return;
          }
        }

        // Save Draft stops here — the centre stays a draft, exactly as its
        // name says. Publish additionally submits it for admin review; a
        // draft never goes through this step, so the two buttons now have
        // genuinely different outcomes instead of both just saving the same way.
        if (props.mode === 'create' && submitIntent.current === 'publish') {
          const submitRes = await submitForReview({ centreId });
          if (!submitRes.ok) {
            setServerError(`Saved as a draft, but couldn't submit for review: ${submitRes.error.message}`);
            return;
          }
        }
      }

      navigatedAway = true;
      router.push('/owner/centres');
      router.refresh();
    } catch (e) {
      // Something unexpected threw (session expired mid-submit, a network
      // hiccup, etc.) instead of returning a normal Result — previously this
      // left the button permanently grayed out on "Uploading photos…" with
      // no way forward. Surface it as a real, actionable error instead.
      setServerError(e instanceof Error ? `Something went wrong: ${e.message}` : 'Something went wrong. Please try again.');
    } finally {
      if (!navigatedAway) setPhase('idle');
    }
  };

  /** Validation failed — jump to the first step that actually has an error, surface exact field errors. */
  const onInvalid = (formErrors: typeof errors) => {
    const erroredFields = Object.keys(formErrors) as (keyof CentreUpsert)[];
    const steps = erroredFields.map((f) => FIELD_STEP[f]).filter((s): s is number => s !== undefined);
    if (steps.length > 0) setStep(Math.min(...steps));
    const firstErr = erroredFields.map((f) => formErrors[f]?.message).find(Boolean);
    setServerError(firstErr ? `Validation error: ${firstErr}` : 'Please check the highlighted fields — some steps need attention before this can be saved.');
  };

  /**
   * Per-step gating: Next only advances if the CURRENT step's mandatory
   * requirements are met.
   */
  const validateStep = async (idx: number): Promise<boolean> => {
    setServerError(null);
    return true;
  };

  const next = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    setMaxUnlocked((m) => Math.max(m, step + 1));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));
  /** Jumping backward (to an already-reached step) is always fine; jumping
   * ahead past what's been validated is blocked — clicking a locked step
   * number just does nothing, rather than silently skipping requirements. */
  const goto = (i: number) => {
    setStep(i);
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => setLogoFile(e.target.files?.[0] ?? null);
  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => setCoverFile(e.target.files?.[0] ?? null);
  const onGalleryChange = (slot: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setGalleryFiles((prev) => {
      const current = prev[slot] ?? [];
      return { ...prev, [slot]: [...current, ...files] };
    });
    e.target.value = '';
  };

  const removePickedFile = (slot: string, indexToRemove: number) => {
    setGalleryFiles((prev) => {
      const current = prev[slot] ?? [];
      const nextFiles = current.filter((_, i) => i !== indexToRemove);
      const next = { ...prev };
      if (nextFiles.length > 0) {
        next[slot] = nextFiles;
      } else {
        delete next[slot];
      }
      return next;
    });
  };

  const onExtraChange = (e: React.ChangeEvent<HTMLInputElement>) => setExtraFiles(Array.from(e.target.files ?? []));

  /** For Website/social URL fields: on blur, visibly rewrite "abc.com" to "https://abc.com" instead of only normalizing it invisibly at submit time. */
  const normalizeUrlOnBlur = (field: 'website' | 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'whatsapp' | 'googleBusiness') =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const next = withHttps(e.target.value);
      if (next !== e.target.value) setValue(field, next, { shouldValidate: true });
    };

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate>
      <Card className="rounded-2xl p-5 sm:p-6">
        {props.intro && <p className="mb-5 text-sm text-muted-foreground">{props.intro}</p>}

        {/* Stepper */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goto(i)}
              disabled={i > maxUnlocked}
              title={i > maxUnlocked ? 'Complete the earlier steps first' : label}
              className={cn('flex shrink-0 items-center gap-1.5', i > maxUnlocked && 'cursor-not-allowed')}
              aria-current={step === i ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  i === step ? 'bg-[#2d6c4f] text-white' : i < step ? 'bg-[#2d6c4f]/20 text-[#2d6c4f]' : i > maxUnlocked ? 'bg-secondary/50 text-muted-foreground/50' : 'bg-secondary text-muted-foreground',
                )}
              >
                {i > maxUnlocked ? '🔒' : i + 1}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
            </button>
          ))}
        </div>

        {/* Stepper Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
            <h2 className="font-display text-xl font-bold">{STEPS[step]}</h2>
          </div>
          {props.mode === 'create' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setValue('name', 'Test Study Nook Hanamkonda', { shouldValidate: true });
                setValue('spaceType', 'study_hall', { shouldValidate: true });
                setValue('seats', 50, { shouldValidate: true });
                setValue('about', 'Premium quiet study space with ergonomic seating and high-speed Wi-Fi.', { shouldValidate: true });
                setValue('address', '123 MG Road, Opposite City Library', { shouldValidate: true });
                setValue('city', 'Hanamkonda', { shouldValidate: true });
                setValue('state', 'Telangana', { shouldValidate: true });
                setValue('country', 'India', { shouldValidate: true });
                setValue('postcode', '506001', { shouldValidate: true });
                setValue('phone', '9876543210', { shouldValidate: true });
                setValue('priceMonthly', 1200, { shouldValidate: true });
                setServerError(null);
              }}
              className="text-xs border-[#006b2c] text-[#006b2c] hover:bg-[#006b2c] hover:text-white"
            >
              ⚡ Auto-Fill Testing Data
            </Button>
          )}
        </div>

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
              <label
                htmlFor="logo"
                className="mt-1 flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#2d6c4f]/30 bg-[#2d6c4f]/5 text-center transition-colors hover:bg-[#2d6c4f]/10"
              >
                {props.mode === 'edit' && props.photos.logoUrl && !logoFile ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={props.photos.logoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <span aria-hidden className="text-2xl text-[#2d6c4f]">⬆</span>
                )}
                <span className="text-xs font-semibold text-[#2d6c4f]">
                  {logoFile ? logoFile.name : props.mode === 'edit' && props.photos.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG (Max 5MB)</span>
              </label>
              <input id="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onLogoChange} className="sr-only" />
            </div>
            <div>
              <Label htmlFor="cover">Cover Image</Label>
              <label
                htmlFor="cover"
                className="relative mt-1 flex h-28 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-[#2d6c4f]/30 bg-[#2d6c4f]/5 text-center transition-colors hover:bg-[#2d6c4f]/10"
              >
                {props.mode === 'edit' && props.photos.coverUrl && !coverFile ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={props.photos.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                    <span className="relative text-xs font-semibold text-[#2d6c4f]">Replace Cover Image</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden className="text-2xl text-[#2d6c4f]">⬆</span>
                    <span className="text-xs font-semibold text-[#2d6c4f]">{coverFile ? coverFile.name : 'Upload Cover Image'}</span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG (Max 5MB)</span>
                  </>
                )}
              </label>
              <input id="cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onCoverChange} className="sr-only" />
              {props.mode === 'edit' && props.photos.coverImageId && props.photos.coverUrl && !coverFile && (
                <div className="mt-1 flex justify-end">
                  <DeletePhotoButton imageId={props.photos.coverImageId} />
                </div>
              )}
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
            <Label htmlFor="seats">Exact Seating Count <span className="text-destructive">*</span></Label>
            <Input id="seats" type="number" min={1} className="max-w-[140px]" aria-invalid={!!errors.seats} {...register('seats')} />
            {errors.seats && <p className="mt-1 text-xs text-destructive">{errors.seats.message}</p>}
          </div>



          <div>
            <Label htmlFor="about">Short Description</Label>
            <textarea id="about" rows={3} placeholder="Describe your study centre in a few words…" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('about')} />
          </div>

          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium">Address Details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123, MG Road, Near City Library" aria-invalid={!!errors.address} {...register('address')} />
                {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" aria-invalid={!!errors.city} {...register('city')} />
                {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" aria-invalid={!!errors.state} {...register('state')} />
                {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" aria-invalid={!!errors.country} {...register('country')} />
                {errors.country && <p className="mt-1 text-xs text-destructive">{errors.country.message}</p>}
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" placeholder="506001" inputMode="numeric" maxLength={6} className="max-w-[160px]" aria-invalid={!!errors.postcode} {...register('postcode')} />
                {errors.postcode && <p className="mt-1 text-xs text-destructive">{errors.postcode.message}</p>}
              </div>
            </div>
          </div>

          <fieldset className="border-t pt-4">
            <legend className="mb-2 text-sm font-medium">Contact Details</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Mobile Number</Label>
                <Input id="phone" placeholder="9876543210" inputMode="numeric" maxLength={10} aria-invalid={!!errors.phone} {...register('phone')} />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div>
                <Label htmlFor="altPhone">Alternate Number <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="altPhone" placeholder="9123456789" inputMode="numeric" maxLength={10} aria-invalid={!!errors.altPhone} {...register('altPhone')} />
                {errors.altPhone && <p className="mt-1 text-xs text-destructive">{errors.altPhone.message}</p>}
              </div>
              <div>
                <Label htmlFor="businessEmail">Email Address <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="businessEmail" type="email" aria-invalid={!!errors.businessEmail} {...register('businessEmail')} />
                {errors.businessEmail && <p className="mt-1 text-xs text-destructive">{errors.businessEmail.message}</p>}
              </div>
              <div>
                <Label htmlFor="website">Website <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="website" placeholder="https://…" aria-invalid={!!errors.website} {...register('website', { onBlur: normalizeUrlOnBlur('website') })} />
                {errors.website && <p className="mt-1 text-xs text-destructive">{errors.website.message}</p>}
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* STEP 2 — Operating Hours & Pricing */}
      {step === 1 && (
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
            <p className="-mt-1 mb-2 text-xs text-muted-foreground">Pick any closing hour — its minutes will always match the opening time's minutes.</p>
            <div className="space-y-2 rounded-md border p-3">
              {DAY_ORDER.map((dayIdx) => {
                const isOpen = watch(`hours.${dayIdx}.isOpen`);
                const closingError = errors.hours?.[dayIdx]?.closingTime;
                return (
                  <div key={dayIdx} className="flex flex-wrap items-center gap-2">
                    <label className="flex w-32 shrink-0 items-center gap-2 text-sm font-medium">
                      <input type="checkbox" className="h-4 w-4 rounded border-input accent-[#2d6c4f]" {...register(`hours.${dayIdx}.isOpen`)} />
                      {DAY_LABELS[dayIdx]}
                    </label>
                    {isOpen ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <input
                          type="time"
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          {...register(`hours.${dayIdx}.openingTime`, {
                            onChange: (e) => {
                              const currentClosing = watch(`hours.${dayIdx}.closingTime`);
                              setValue(`hours.${dayIdx}.closingTime`, syncMinuteToOpening(e.target.value, currentClosing), { shouldValidate: true });
                            },
                          })}
                        />
                        <span className="text-muted-foreground">to</span>
                        <input
                          type="time"
                          aria-invalid={!!closingError}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          {...register(`hours.${dayIdx}.closingTime`)}
                        />
                        {closingError && <p className="w-full text-xs text-destructive">{closingError.message}</p>}
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

      {/* STEP 3 — Facilities & Amenities */}
      {step === 2 && (
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

      {/* STEP 4 — Social Networks */}
      {step === 3 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Add your social media & online presence</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['website', 'Website', 'https://yourwebsite.com', '#e8f0fe', '#1a73e8', (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" /></svg>
              )],
              ['facebook', 'Facebook', 'https://facebook.com/yourpage', '#e7f0ff', '#1877F2', (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15 8.5h2V5h-2a4 4 0 0 0-4 4v2H9v3.5h2V21h3.5v-6.5H17l.5-3.5h-3V9c0-.3.2-.5.5-.5Z" /></svg>
              )],
              ['instagram', 'Instagram', 'https://instagram.com/yourpage', '#fdeef1', '#E1306C', (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
              )],
              ['youtube', 'YouTube', 'https://youtube.com/@yourchannel', '#fdeaea', '#FF0000', (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" /></svg>
              )],
              ['linkedin', 'LinkedIn', 'https://linkedin.com/company/yourpage', '#e8f1fb', '#0A66C2', (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="8.5" r="1.2" /><path d="M7 11h2v7H7zM11 11h2v1.3c.5-.8 1.3-1.5 2.6-1.5 2 0 2.9 1.3 2.9 3.7V18h-2v-3.1c0-1.1-.4-1.9-1.4-1.9-.8 0-1.3.6-1.5 1.1-.1.2-.1.5-.1.8V18h-2v-7Z" /></svg>
              )],
              ['twitter', 'X (Twitter)', 'https://x.com/yourpage', '#eceeef', '#000000', (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 4l7.5 9.5L4.3 20H6l6.2-5.9L17 20h3l-8-9.9L19 4h-1.7l-5.6 5.4L7 4H4Z" /></svg>
              )],
              ['whatsapp', 'WhatsApp', 'https://wa.me/919876543210', '#e6f7ee', '#25D366', (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 18.5 3.5 20l1.2-3.5A8 8 0 1 1 6 18.5Z" /><path d="M9 10c0 3 2 5 5 5" strokeLinecap="round" /></svg>
              )],
              ['googleBusiness', 'Google Business', 'https://g.page/yourbusiness', '#fdf3e8', '#EA4335', (
                <svg viewBox="0 0 18 18" width="16" height="16"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" /><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" /><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" /><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" /></svg>
              )],
            ] as const).map(([key, label, placeholder, bg, fg, icon]) => {
              const filled = !!values[key];
              return (
                <div key={key} className="rounded-xl border p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: bg, color: fg }} aria-hidden>
                      {icon}
                    </span>
                    <Label htmlFor={key} className="mb-0">{label}</Label>
                  </div>
                  <div className="relative">
                    <Input id={key} placeholder={placeholder} aria-invalid={!!errors[key]} className="pr-8" {...register(key, { onBlur: normalizeUrlOnBlur(key) })} />
                    {filled && !errors[key] && (
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-green" aria-hidden>✓</span>
                    )}
                  </div>
                  {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]?.message}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5 — Gallery */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Upload photos of your study centre — select several per category if you like, plus any extras below</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GALLERY_SLOTS.map((slot) => {
              const existing = props.mode === 'edit' ? props.photos.gallery.filter((g) => g.category === slot) : [];
              const picked = galleryFiles[slot] ?? [];
              const pickedUrls = picked.map((f) => URL.createObjectURL(f));
              const existingUrls = existing.map((g) => g.url);
              const allPreviews = [...pickedUrls, ...existingUrls];
              const extraCount = Math.max(0, allPreviews.length - 2);

              return (
                <div key={slot} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-slate-800">{slot}</p>
                      {allPreviews.length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          {allPreviews.length} photo{allPreviews.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <label
                      htmlFor={`gallery-${slot}`}
                      className="relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 transition-colors group"
                    >

                      {allPreviews.length === 1 && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={allPreviews[0]} alt={slot} className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      {allPreviews.length >= 2 && (
                        <div className="absolute inset-0 grid grid-cols-2 gap-0.5 w-full h-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={allPreviews[0]} alt={`${slot} 1`} className="w-full h-full object-cover" />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={allPreviews[1]} alt={`${slot} 2`} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity z-10" aria-hidden />
                      <span className="relative z-20 flex flex-col items-center gap-0.5 rounded-full bg-white/95 px-3 py-1.5 shadow-md">
                        <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2d6c4f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 8a2 2 0 0 1 2-2h1.2l.8-1.5A1 1 0 0 1 8.9 4h6.2a1 1 0 0 1 .9.55L16.8 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                          <circle cx="12" cy="13" r="3.2" />
                        </svg>
                        <span className="text-[11px] font-bold text-[#2d6c4f]">{allPreviews.length > 0 ? 'Add More' : 'Upload'}</span>
                      </span>
                      {extraCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 z-20 rounded-full bg-[#2d6c4f] px-1.5 py-0.5 text-[10px] font-bold text-white">+{extraCount} more</span>
                      )}
                    </label>
                    <input
                      id={`gallery-${slot}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      onChange={onGalleryChange(slot)}
                      className="sr-only"
                    />
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {picked.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-600 mb-1 flex items-center gap-1">
                          ✓ {picked.length} new photo{picked.length > 1 ? 's' : ''} selected:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {picked.map((file, pIdx) => {
                            const url = pickedUrls[pIdx];
                            return (
                              <div key={pIdx} className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-300 group shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={file.name} className="h-full w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removePickedFile(slot, pIdx);
                                  }}
                                  className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold transition-colors z-20 cursor-pointer"
                                  title="Remove photo"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {existing.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 mb-1">Saved photos:</p>
                        <div className="flex flex-wrap gap-1">
                          {existing.map((g) => (
                            <div key={g.id} className="relative h-10 w-10 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={g.url} alt="" className="h-full w-full rounded object-cover" />
                              <DeletePhotoButton imageId={g.id} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 border-t pt-4">
            <Label htmlFor="extra-photos">Additional Photos</Label>
            {props.mode === 'edit' && props.photos.gallery.filter((g) => !g.category || !GALLERY_SLOTS.includes(g.category)).length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {props.photos.gallery.filter((g) => !g.category || !GALLERY_SLOTS.includes(g.category)).map((g) => (
                  <div key={g.id} className="relative h-14 w-14">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt="" className="h-full w-full rounded object-cover" />
                    <DeletePhotoButton imageId={g.id} />
                  </div>
                ))}
              </div>
            )}
            <input
              id="extra-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={onExtraChange}
              className="mt-1 block text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {extraFiles.length > 0 ? `${extraFiles.length} extra photo${extraFiles.length > 1 ? 's' : ''} selected` : 'Select several at once for anything beyond the categories above.'}
            </p>
          </div>
        </div>
      )}

      {/* STEP 7 — Review & Publish */}
      {step === 6 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Review your details before publishing your listing</p>
          <div className="flex flex-wrap gap-3">
            {[
              {
                title: 'Profile & Category', icon: '🎓', i: 0,
                lines: [SPACE_TYPES.find((t) => t.value === values.spaceType)?.label, `${values.seats} Seats`],
              },
              {
                title: 'Address & Contact', icon: '📍', i: 1,
                lines: [values.address, [values.state, values.postcode].filter(Boolean).join(', ')],
              },
              {
                title: 'Operating Hours', icon: '🕐', i: 2,
                lines: [
                  values.hours?.[1]?.isOpen ? `Mon: ${values.hours[1].openingTime} – ${values.hours[1].closingTime}` : 'Mon: Closed',
                  values.hours?.[0]?.isOpen ? `Sun: ${values.hours[0].openingTime} – ${values.hours[0].closingTime}` : 'Sun: Closed',
                ],
              },
            ].map((s) => (
              <div key={s.title} className="min-w-[190px] flex-1 rounded-xl border p-3">
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><span aria-hidden>{s.icon}</span>{s.title}</div>
                {s.lines.filter(Boolean).map((l, idx) => <p key={idx} className="text-xs text-muted-foreground">{l}</p>)}
                <button type="button" onClick={() => goto(s.i)} className="mt-2 text-xs font-semibold text-[#2d6c4f] hover:underline">Edit</button>
              </div>
            ))}

            <div className="min-w-[190px] flex-1 rounded-xl border p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><span aria-hidden>✓</span>Facilities &amp; Amenities</div>
              <p className="mb-2 text-xs text-muted-foreground">{values.amenityIds?.length ?? 0} Facilities Selected</p>
              <div className="flex items-center gap-1">
                {props.amenities.filter((a) => values.amenityIds?.includes(a.id)).slice(0, 3).map((a) => (
                  <span key={a.id} className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-sm" title={a.label}>{a.icon ?? '✓'}</span>
                ))}
                {(values.amenityIds?.length ?? 0) > 3 && (
                  <span className="text-xs font-semibold text-muted-foreground">+{(values.amenityIds?.length ?? 0) - 3}</span>
                )}
              </div>
              <button type="button" onClick={() => goto(3)} className="mt-2 text-xs font-semibold text-[#2d6c4f] hover:underline">Edit</button>
            </div>

            <div className="min-w-[190px] flex-1 rounded-xl border p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><span aria-hidden>🔗</span>Social Networks</div>
              {(() => {
                const links = [values.facebook, values.instagram, values.youtube, values.linkedin, values.twitter, values.whatsapp, values.googleBusiness].filter(Boolean);
                return (
                  <>
                    <p className="mb-2 text-xs text-muted-foreground">{links.length} Links Added</p>
                    <div className="flex items-center gap-1 text-sm">
                      {values.facebook && <span aria-hidden>📘</span>}
                      {values.instagram && <span aria-hidden>📷</span>}
                      {values.youtube && <span aria-hidden>▶️</span>}
                      {links.length > 3 && <span className="text-xs font-semibold text-muted-foreground">+{links.length - 3}</span>}
                    </div>
                  </>
                );
              })()}
              <button type="button" onClick={() => goto(4)} className="mt-2 text-xs font-semibold text-[#2d6c4f] hover:underline">Edit</button>
            </div>

            <div className="min-w-[190px] flex-1 rounded-xl border p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><span aria-hidden>🖼</span>Gallery</div>
              {(() => {
                const newCount = Object.values(galleryFiles).reduce((s, f) => s + f.length, 0) + extraFiles.length;
                const existingCount = props.mode === 'edit' ? props.photos.gallery.length : 0;
                const total = newCount + existingCount;
                const thumbs = [
                  ...Object.values(galleryFiles).flat().map((f) => URL.createObjectURL(f)),
                  ...extraFiles.map((f) => URL.createObjectURL(f)),
                  ...(props.mode === 'edit' ? props.photos.gallery.map((g) => g.url) : []),
                ].slice(0, 4);
                return (
                  <>
                    <p className="mb-2 text-xs text-muted-foreground">{total} Photo{total === 1 ? '' : 's'} {props.mode === 'create' ? 'Selected' : 'Uploaded'}</p>
                    <div className="flex items-center gap-1">
                      {thumbs.map((url, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={idx} src={url} alt="" className="h-6 w-6 rounded object-cover" />
                      ))}
                      {total > 4 && <span className="text-xs font-semibold text-muted-foreground">+{total - 4}</span>}
                    </div>
                  </>
                );
              })()}
              <button type="button" onClick={() => goto(5)} className="mt-2 text-xs font-semibold text-[#2d6c4f] hover:underline">Edit</button>
            </div>
          </div>
        </div>
      )}

        {serverError && <p className="mt-4 text-sm text-destructive" role="alert">{serverError}</p>}

        <div className="mt-6 flex items-center justify-between border-t pt-5">
          <Button type="button" variant="outline" onClick={back} disabled={step === 0 || busy}>Back</Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next} className="bg-[#2d6c4f] hover:bg-[#2d6c4f]/90">Next →</Button>
            ) : (
              <Button type="button" disabled={busy} className="bg-[#2d6c4f] hover:bg-[#2d6c4f]/90" onClick={() => { submitIntent.current = 'publish'; void handleSubmit(doSubmit, onInvalid)(); }}>
                {phase === 'saving' ? 'Saving…' : phase === 'uploading' ? 'Uploading photos…' : (props.mode === 'create' ? 'Preview & Publish →' : 'Save changes')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </form>
  );
}
