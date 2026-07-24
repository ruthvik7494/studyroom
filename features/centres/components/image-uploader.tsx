'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { registerListingImage, setCentreCoverImage } from '../actions';

interface ImageUploaderProps {
  centreId: string;
  /** Mark uploads as the listing's main/hero image (writes centres.cover_url too). */
  isCover?: boolean;
  /** Allow selecting several files at once, uploading each in sequence (for a gallery). */
  multiple?: boolean;
  /** Label above the input. Defaults to the original owner-flow copy. */
  label?: string;
  onUploaded?: (storagePath: string) => void;
}

/**
 * Uploads an image to the `listing-images` Storage bucket under `<centreId>/…`
 * (Storage RLS enforces the owner can only write to their own centre folder),
 * then registers the object as a `listing_images` row. Client validation:
 * type + size; server + Storage policies are the real gate.
 */
export function ImageUploader({ centreId, isCover = false, multiple = false, label = 'Add a photo', onUploaded }: ImageUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const uploadOne = async (file: File): Promise<boolean> => {
    if (!file.type.startsWith('image/')) { setMessage('Please choose an image file.'); return false; }
    if (file.size > 5 * 1024 * 1024) { setMessage('Image must be under 5 MB.'); return false; }

    const supabase = createClient();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${centreId}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('listing-images').upload(path, file, { upsert: false });
    if (upErr) { setMessage('Upload failed. Please try again.'); return false; }

    const res = await registerListingImage({ centreId, storagePath: path, isCover });
    if (!res.ok) { setMessage(res.error.message); return false; }

    if (isCover) {
      const coverRes = await setCentreCoverImage({ centreId, storagePath: path });
      if (!coverRes.ok) { setMessage(coverRes.error.message); return false; }
    }

    onUploaded?.(path);
    return true;
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setMessage(null);
    setStatus('uploading');

    let ok = 0;
    for (const file of files) {
      if (await uploadOne(file)) ok += 1;
    }

    e.target.value = ''; // allow re-selecting the same file again
    if (ok > 0) {
      setCount((c) => c + ok);
      setStatus('done');
      setMessage(ok === files.length ? `${ok} photo${ok > 1 ? 's' : ''} uploaded.` : `${ok} of ${files.length} uploaded — see error above.`);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="rounded-lg border border-dashed p-4">
      <label className="block text-sm font-medium">{label}</label>
      <input type="file" accept="image/*" multiple={multiple} onChange={onChange} disabled={status === 'uploading'} className="mt-2 block text-sm" />
      {status === 'uploading' && <p className="mt-2 text-xs text-muted-foreground">Uploading…</p>}
      {message && <p className={`mt-2 text-xs ${status === 'error' ? 'text-destructive' : 'text-brand-green'}`} role="status">{message}</p>}
      {count > 0 && <p className="mt-1 text-xs text-muted-foreground">{count} uploaded so far.</p>}
    </div>
  );
}
