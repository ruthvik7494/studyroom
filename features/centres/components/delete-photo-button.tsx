'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteListingImage } from '../actions';

export function DeletePhotoButton({ imageId }: { imageId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      className="absolute top-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-80"
    >
      {pending ? (
        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
      ) : (
        <span className="text-xs font-black leading-none">✕</span>
      )}
    </button>
  );
}
