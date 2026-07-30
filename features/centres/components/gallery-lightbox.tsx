'use client';
import { useEffect, useState } from 'react';

interface GalleryImage { id: string; url: string; alt: string }

export function GalleryLightbox({ images, previewCount = 6 }: { images: GalleryImage[]; previewCount?: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const preview = images.slice(0, previewCount);
  const overflow = images.length - preview.length;

  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  const next = () => setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [openIndex]);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {preview.map((img, idx) => {
          const isLast = idx === preview.length - 1 && overflow > 0;
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => setOpenIndex(idx)}
              className="relative aspect-[4/3] overflow-hidden rounded-lg"
              aria-label={isLast ? `View all ${images.length} photos` : `View photo: ${img.alt}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
              {isLast && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white">
                  <span className="text-lg font-bold">+{overflow}</span>
                  <span className="text-xs font-semibold">VIEW MORE</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button type="button" onClick={close} aria-label="Close" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20">
            ✕
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-6"
          >
            ‹
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIndex]!.url}
            alt={images[openIndex]!.alt}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-6"
          >
            ›
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">{openIndex + 1} / {images.length}</p>
        </div>
      )}
    </>
  );
}
