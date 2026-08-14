'use client';
import { useState } from 'react';
import { ReviewForm } from '@/features/reviews/components/review-form';

interface ReviewItem {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  author: { full_name: string | null } | null;
}

interface ReviewsSectionProps {
  centreId: string;
  centreSlug: string;
  rating: number;
  reviewsCount: number;
  reviews: ReviewItem[];
  isPublic: boolean;
  canReview: boolean;
  isOwner?: boolean;
  isLoggedIn?: boolean;
}

const SAMPLE_REVIEWS: ReviewItem[] = [
  {
    id: 'sample-1',
    rating: 5.0,
    created_at: '2024-02-15T00:00:00.000Z',
    author: { full_name: 'Ananya Sharma' },
    body: 'Extremely peaceful environment! Perfect place to study for UPSC exams without any distractions. The high-speed Wi-Fi and ergonomic chairs are top-notch.',
  },
  {
    id: 'sample-2',
    rating: 4.5,
    created_at: '2024-02-10T00:00:00.000Z',
    author: { full_name: 'Rahul Varma' },
    body: 'Great facility with dedicated charging outlets on every desk. Clean washrooms and 24x7 water dispenser. Highly recommended for long study sessions!',
  },
  {
    id: 'sample-3',
    rating: 5.0,
    created_at: '2024-01-28T00:00:00.000Z',
    author: { full_name: 'Pooja Reddy' },
    body: 'The silent AC cabin is super comfortable! Temperature is well-maintained and management is very supportive. Best study room in this area.',
  },
  {
    id: 'sample-4',
    rating: 4.0,
    created_at: '2024-01-20T00:00:00.000Z',
    author: { full_name: 'Vikram Singh' },
    body: 'Spacious desks and personal lockers make it super convenient to leave reference books safely overnight. Great value for money.',
  },
  {
    id: 'sample-5',
    rating: 5.0,
    created_at: '2024-01-12T00:00:00.000Z',
    author: { full_name: 'Sneha Patel' },
    body: 'CCTV surveillance and 24x7 access make it very safe for female aspirants preparing late into the night. Highly satisfied!',
  },
  {
    id: 'sample-6',
    rating: 4.5,
    created_at: '2023-12-29T00:00:00.000Z',
    author: { full_name: 'Karthik Rao' },
    body: 'Clean ambiance, zero noise level, and unlimited tea/coffee facility in the pantry area. Helped me crack my GATE exam!',
  },
  {
    id: 'sample-7',
    rating: 5.0,
    created_at: '2023-12-18T00:00:00.000Z',
    author: { full_name: 'Meera Iyer' },
    body: 'Excellent lighting on every desk! Doesn’t strain your eyes during 8-10 hour study streaks. Very disciplined management.',
  },
  {
    id: 'sample-8',
    rating: 4.0,
    created_at: '2023-12-05T00:00:00.000Z',
    author: { full_name: 'Aditya Gupta' },
    body: 'Clean washrooms and ample bike parking space available right outside the lounge premises. Really happy with the service.',
  },
  {
    id: 'sample-9',
    rating: 5.0,
    created_at: '2023-11-22T00:00:00.000Z',
    author: { full_name: 'Divya Teja' },
    body: 'Super fast optical fiber internet. Never faced lag while streaming online video lectures or downloading large test PDFs.',
  },
  {
    id: 'sample-10',
    rating: 4.5,
    created_at: '2023-11-10T00:00:00.000Z',
    author: { full_name: 'Suresh Kumar' },
    body: 'Comfortable cushions and posture-support chairs. If you are serious about competitive exams, this is the ideal study nook.',
  },
];

export function ReviewsSection({
  centreId,
  centreSlug,
  rating,
  reviewsCount,
  reviews,
  isOwner,
  isLoggedIn,
}: ReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="pt-12 border-t border-[#bdcaba]/30" id="reviews">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 pb-6 border-b border-[#bdcaba]/30">
        <h2 className="font-['Lexend',sans-serif] text-xl font-bold text-[#191c1e] uppercase tracking-wide">
          ★ {reviews.length > 0 ? rating.toFixed(1) : '0.0'} · {reviewsCount} Review{reviewsCount !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="border border-[#bdcaba] text-[#191c1e] text-xs font-bold px-6 py-3 rounded-sm hover:border-[#191c1e] transition-colors uppercase tracking-widest self-start md:self-auto cursor-pointer"
        >
          {showForm ? 'Close' : 'Write a Review'}
        </button>
      </div>

      {/* Review Form Drawer/Inline container */}
      {showForm && (
        <div className="mb-8 p-6 border border-[#16a34a]/30 bg-[#f8faf8] rounded-xl shadow-xs transition-all">
          {isOwner ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-md">
              Note: Owners cannot review their own centre.
            </p>
          ) : !isLoggedIn ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#191c1e]">Please sign in to write a review.</p>
              <a
                href={`/login?redirect=/centres/${centreSlug}#reviews`}
                className="inline-block bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold px-5 py-2.5 rounded-md uppercase tracking-wider transition-colors"
              >
                Sign In / Register
              </a>
            </div>
          ) : (
            <ReviewForm centreId={centreId} />
          )}
        </div>
      )}

      {/* Reviews Feed Grid */}
      {reviews.length === 0 ? (
        <div className="p-8 border border-dashed border-[#bdcaba]/60 rounded-xl text-center bg-[#fcfdfc] space-y-2">
          <p className="text-sm font-semibold text-[#191c1e]">No reviews submitted yet</p>
          <p className="text-xs text-[#565e74]">Be the first student to share your study experience at this centre!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((rv) => {
            const authorName = rv.author?.full_name ?? 'Student';
            const initial = authorName.charAt(0).toUpperCase();
            const dateStr = new Date(rv.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return (
              <div key={rv.id} className="border border-[#bdcaba]/40 p-6 rounded-xl bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#16a34a]/10 text-[#16a34a] rounded-full flex items-center justify-center font-['Lexend',sans-serif] text-sm font-bold">
                        {initial}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#191c1e] tracking-wide">{authorName}</div>
                        <div className="text-[11px] text-[#565e74]">{dateStr}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#16a34a]/10 text-[#16a34a] px-2 py-0.5 rounded text-xs font-bold">
                      <span>★</span>
                      <span>{rv.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="border-t border-[#f2f4f6] pt-4">
                    {rv.body ? (
                      <p className="text-xs text-[#565e74] leading-relaxed">{rv.body}</p>
                    ) : (
                      <p className="text-xs text-[#565e74] leading-relaxed italic">No written feedback provided.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
