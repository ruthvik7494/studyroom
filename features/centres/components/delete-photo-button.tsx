'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteListingImage } from '../actions';

export function DeletePhotoButton({ imageId }: { imageId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      await deleteListingImage({ imageId });
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      aria-label="Remove photo"
      title="Remove photo"
      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white hover:bg-black/80 disabled:opacity-50"
    >
      {pending ? '…' : '✕'}
    </button>
  );
}
