'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { reviewSchema, type ReviewInput } from '../schema';
import { submitReview } from '../actions';

/**
 * Write-a-review form. Signed-in students only (the page passes canReview);
 * the server still enforces auth + one-per-centre + no-self-review.
 */
export function ReviewForm({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [hover, setHover] = useState(0);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<ReviewInput>({ resolver: zodResolver(reviewSchema), defaultValues: { centreId, rating: 0, body: '' } });

  const rating = watch('rating');

  const onSubmit = async (values: ReviewInput) => {
    setServerError(null);
    const res = await submitReview(values);
    if (res.ok) {
      setDone(true);
      // The centre's star rating/review count (and the review list) are
      // rendered server-side higher up this page — refresh so they reflect
      // this review immediately instead of waiting for a manual reload.
      router.refresh();
      return;
    }
    setServerError(res.error.message);
  };

  if (done) {
    return <p className="rounded-md bg-accent p-3 text-sm font-medium text-brand-green" role="status">Thanks — your review has been posted.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border p-4" noValidate>
      <input type="hidden" {...register('centreId')} />
      <p className="mb-2 font-display text-sm font-semibold">Write a review</p>

      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="text-2xl leading-none"
            style={{ color: (hover || rating) >= n ? '#D4960E' : '#D6CCBD' }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setValue('rating', n, { shouldValidate: true })}
          >
            ★
          </button>
        ))}
      </div>
      {errors.rating && <p className="mt-1 text-xs text-destructive">{errors.rating.message}</p>}

      <textarea
        rows={3}
        className="mt-3 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Share what your experience was like (optional)"
        {...register('body')}
      />
      {serverError && <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>}

      <Button type="submit" size="sm" className="mt-3" disabled={isSubmitting}>
        {isSubmitting ? 'Posting…' : 'Post review'}
      </Button>
    </form>
  );
}
