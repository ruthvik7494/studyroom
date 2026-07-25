'use client';
import { useState } from 'react';
import { uploadCentreImage } from '../actions';

/** Storage bucket's server-side allowed types (see 0019_storage_hardening.sql) — kept in sync here so the client can give a precise message instead of a generic one. */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

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
 *
 * Uploads go through the trusted `uploadCentreImage` server action (service-
 * role client) rather than a direct browser-to-storage call — a direct
 * browser-session upload hit a Storage RLS rejection ("new row violates row-
 * level security policy") on this exact page, the same failure mode found
 * earlier on the admin/owner create flows. Routing through the server action
 * sidesteps that layer entirely: ownership is verified server-side first,
 * then the write proceeds with elevated privileges.
 */
export function ImageUploader({ centreId, isCover = false, multiple = false, label = 'Add a photo', onUploaded }: ImageUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const uploadOne = async (file: File): Promise<{ ok: boolean; error?: string; storagePath?: string }> => {
    if (!ALLOWED_MIME.includes(file.type)) {
      return { ok: false, error: `${file.type || 'That file type'} isn't supported — use JPEG, PNG, WebP, or AVIF.` };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { ok: false, error: 'Image must be under 5 MB.' };
    }
    const fd = new FormData();
    fd.set('centreId', centreId);
    fd.set('isCover', String(isCover));
    fd.set('file', file);
    const res = await uploadCentreImage(fd);
    return res.ok ? { ok: true, storagePath: res.data.storagePath } : { ok: false, error: res.error.message };
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setMessage(null);
    setStatus('uploading');

    let ok = 0;
    let lastError: string | undefined;
    for (const file of files) {
      const res = await uploadOne(file);
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
