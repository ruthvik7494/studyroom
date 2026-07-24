'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { registerListingImage, setCentreCoverImage } from '../actions';

/** Storage bucket's server-side allowed types (see 0019_storage_hardening.sql) — kept in sync here so the client can give a precise message instead of a generic one. */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface UploadResult {
  ok: boolean;
  /** Precise reason on failure — surfaced to the user instead of a generic message. */
  error?: string;
  storagePath?: string;
}

/**
 * Upload one image to the `listing-images` Storage bucket under `<centreId>/…`
 * and register it as a `listing_images` row (optionally as the cover, which
 * also writes `centres.cover_url` via setCentreCoverImage).
 *
 * The centre row must already exist: Storage RLS checks the upload's folder
 * name against an existing `centres.id` owned by the caller (or admin), so
 * this can only run after the centre has been created — never before.
 */
export async function uploadCentreImage(centreId: string, file: File, isCover = false): Promise<UploadResult> {
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: `${file.type || 'That file type'} isn't supported — use JPEG, PNG, WebP, or AVIF.` };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: 'Image must be under 5 MB.' };
  }

  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${centreId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from('listing-images').upload(path, file, { upsert: false });
  if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

  const res = await registerListingImage({ centreId, storagePath: path, isCover });
  if (!res.ok) return { ok: false, error: res.error.message };

  if (isCover) {
    const coverRes = await setCentreCoverImage({ centreId, storagePath: path });
    if (!coverRes.ok) return { ok: false, error: coverRes.error.message };
  }

  return { ok: true, storagePath: path };
}

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
 * Self-contained uploader: pick a file, it uploads immediately. Used on the
 * owner's edit-listing page, where the centre already exists.
 */
export function ImageUploader({ centreId, isCover = false, multiple = false, label = 'Add a photo', onUploaded }: ImageUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setMessage(null);
    setStatus('uploading');

    let ok = 0;
    let lastError: string | undefined;
    for (const file of files) {
      const res = await uploadCentreImage(centreId, file, isCover);
      if (res.ok) { ok += 1; if (res.storagePath) onUploaded?.(res.storagePath); }
      else lastError = res.error;
    }

    e.target.value = ''; // allow re-selecting the same file again
    if (ok > 0) {
      setCount((c) => c + ok);
      setStatus('done');
      setMessage(ok === files.length ? `${ok} photo${ok > 1 ? 's' : ''} uploaded.` : `${ok} of ${files.length} uploaded — ${lastError}`);
    } else {
      setStatus('error');
      setMessage(lastError ?? 'Upload failed.');
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
