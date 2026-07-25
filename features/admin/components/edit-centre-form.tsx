'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminUpdateCentre, adminUploadCentreImage } from '../actions';
import { deleteListingImage } from '@/features/centres/actions';
import type { AdminCentreEditDetail } from '../services/admin.service';

const galleryUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;

export function EditCentreForm({ centre }: { centre: AdminCentreEditDetail }) {
  const router = useRouter();
  const [name, setName] = useState(centre.name);
  const [address, setAddress] = useState(centre.address ?? '');
  const [about, setAbout] = useState(centre.description ?? '');
  const [isVerified, setIsVerified] = useState(centre.is_verified);
  const [womenSafe, setWomenSafe] = useState(centre.women_safe_verified);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading'>('idle');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const busy = phase !== 'idle';

  const [deleting, setDeleting] = useState<string | null>(null);
  const removePhoto = async (imageId: string) => {
    setDeleting(imageId);
    await deleteListingImage({ imageId });
    router.refresh();
    setDeleting(null);
  };

  const uploadOne = async (file: File, isCover: boolean): Promise<string | null> => {
    const fd = new FormData();
    fd.set('centreId', centre.id);
    fd.set('isCover', String(isCover));
    fd.set('file', file);
    const res = await adminUploadCentreImage(fd);
    return res.ok ? null : res.error.message;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null); setNotice(null);

    setPhase('saving');
    const res = await adminUpdateCentre({ centreId: centre.id, name, address, about, isVerified, womenSafe });
    if (!res.ok) { setServerError(res.error.message); setPhase('idle'); return; }

    const coverFile = coverInputRef.current?.files?.[0] ?? null;
    const galleryFiles = Array.from(galleryInputRef.current?.files ?? []);

    if (coverFile || galleryFiles.length) {
      setPhase('uploading');
      const uploadErrors: string[] = [];
      if (coverFile) {
        const coverErr = await uploadOne(coverFile, true);
        if (coverErr) uploadErrors.push(`Cover image: ${coverErr}`);
      }
      for (const file of galleryFiles) {
        const galleryErr = await uploadOne(file, false);
        if (galleryErr) uploadErrors.push(`${file.name}: ${galleryErr}`);
      }
      if (uploadErrors.length) {
        setServerError(`Saved, but some photos didn't upload: ${uploadErrors.join('; ')}`);
        setPhase('idle');
        return;
      }
    }

    setPhase('idle');
    setNotice('Saved.');
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4" noValidate>
      <div>
        <Label htmlFor="name">Name of Centre</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="about">About Centre</Label>
        <textarea
          id="about"
          rows={4}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-md border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 rounded border-input" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
          ✓ Verified — StudyNook has confirmed this listing is legitimate
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 rounded border-input" checked={womenSafe} onChange={(e) => setWomenSafe(e.target.checked)} />
          🛡 Women-safe — confirmed to have women-safe access/facilities
        </label>
      </div>

      {centre.cover_url && (() => {
        const coverImg = centre.gallery.find((g) => g.is_cover);
        return (
          <div>
            <p className="mb-1 text-sm font-medium">Current cover</p>
            <div className="relative h-32 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={centre.cover_url} alt="" className="h-full w-full rounded-md object-cover" />
              {coverImg && (
                <button
                  type="button"
                  onClick={() => removePhoto(coverImg.id)}
                  disabled={deleting === coverImg.id}
                  aria-label="Remove cover photo"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white hover:bg-black/80 disabled:opacity-50"
                >
                  {deleting === coverImg.id ? '…' : '✕'}
                </button>
              )}
            </div>
          </div>
        );
      })()}
      <div>
        <Label htmlFor="cover">Replace Header Image / Cover Image</Label>
        <input id="cover" ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block text-sm" />
      </div>

      {centre.gallery.filter((img) => !img.is_cover).length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Current gallery ({centre.gallery.filter((img) => !img.is_cover).length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {centre.gallery.filter((img) => !img.is_cover).map((img) => (
              <div key={img.id} className="relative h-16 w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={galleryUrl(img.storage_path)} alt="" className="h-full w-full rounded object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(img.id)}
                  disabled={deleting === img.id}
                  aria-label="Remove photo"
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white hover:bg-black/80 disabled:opacity-50"
                >
                  {deleting === img.id ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="gallery">Add more Gallery photos</Label>
        <input id="gallery" ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="mt-1 block text-sm" />
      </div>

      {serverError && <p className="text-sm text-destructive" role="alert">{serverError}</p>}
      {notice && <p className="text-sm text-brand-green" role="status">{notice}</p>}

      <Button type="submit" disabled={busy}>
        {phase === 'saving' ? 'Saving…' : phase === 'uploading' ? 'Uploading photos…' : 'Save changes'}
      </Button>
    </form>
  );
}
