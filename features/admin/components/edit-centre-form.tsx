'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminUpdateCentre, adminUploadCentreImage } from '../actions';
import type { AdminCentreEditDetail } from '../services/admin.service';

const galleryUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;

export function EditCentreForm({ centre }: { centre: AdminCentreEditDetail }) {
  const router = useRouter();
  const [name, setName] = useState(centre.name);
  const [address, setAddress] = useState(centre.address ?? '');
  const [about, setAbout] = useState(centre.description ?? '');
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading'>('idle');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const busy = phase !== 'idle';

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
    const res = await adminUpdateCentre({ centreId: centre.id, name, address, about });
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

      {centre.cover_url && (
        <div>
          <p className="mb-1 text-sm font-medium">Current cover</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={centre.cover_url} alt="" className="h-32 w-full rounded-md object-cover" />
        </div>
      )}
      <div>
        <Label htmlFor="cover">Replace Header Image / Cover Image</Label>
        <input id="cover" ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block text-sm" />
      </div>

      {centre.gallery.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Current gallery ({centre.gallery.length})</p>
          <div className="grid grid-cols-4 gap-2">
            {centre.gallery.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={galleryUrl(img.storage_path)} alt="" className="h-16 w-full rounded object-cover" />
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
