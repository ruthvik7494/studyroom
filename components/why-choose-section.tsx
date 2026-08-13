import Link from 'next/link';
import Image from 'next/image';

interface WhyChooseSectionProps {
  city?: string;
}

export function WhyChooseSection({ city = 'Hanamkonda' }: WhyChooseSectionProps) {
  return (
    <section className="py-20 px-6 md:px-16 max-w-[1280px] mx-auto flex flex-col gap-16 font-['Inter',sans-serif]">
      {/* 1. SECTION HEADER */}
      <div className="text-center flex flex-col gap-3">
        <h2 className="text-3xl sm:text-4xl font-bold text-[#191c1e] font-['Lexend',sans-serif] tracking-tight">
          Why Choose StudyNook?
        </h2>
        <p className="text-base text-[#565e74] max-w-2xl mx-auto">
          Everything you need for a productive and comfortable study experience.
        </p>
      </div>

      {/* 2. 4-COLUMN BENEFIT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-7 rounded-[20px] border border-[#e0e3e5] shadow-xs flex flex-col gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-[#e6f4ea] flex items-center justify-center text-[#006b2c] text-xl font-bold">
            ✓
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif] mb-1.5">
              Verified &amp; Trusted
            </h3>
            <p className="text-sm text-[#565e74] leading-relaxed">
              All centres are verified for quality, safety &amp; reliability.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-7 rounded-[20px] border border-[#e0e3e5] shadow-xs flex flex-col gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-[#e6f4ea] flex items-center justify-center text-[#006b2c] text-xl">
            📡
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif] mb-1.5">
              Real-time Availability
            </h3>
            <p className="text-sm text-[#565e74] leading-relaxed">
              Check live seat availability before you book.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-7 rounded-[20px] border border-[#e0e3e5] shadow-xs flex flex-col gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-[#fef7e0] flex items-center justify-center text-[#b8780a] text-xl font-bold">
            ⚡
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif] mb-1.5">
              Easy &amp; Quick Booking
            </h3>
            <p className="text-sm text-[#565e74] leading-relaxed">
              Book your seat in just a few clicks.
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-7 rounded-[20px] border border-[#e0e3e5] shadow-xs flex flex-col gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-[#fef7e0] flex items-center justify-center text-[#b8780a] text-xl font-bold">
            💰
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif] mb-1.5">
              Affordable for Everyone
            </h3>
            <p className="text-sm text-[#565e74] leading-relaxed">
              Choose from a wide range of prices that fit your budget.
            </p>
          </div>
        </div>
      </div>

      {/* 3. BUILT FOR STUDENTS FEATURE SHOWCASE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-[#f7f9fb] rounded-[32px] p-6 md:p-10 border border-[#e0e3e5]">
        {/* Left Side: Photo */}
        <div className="lg:col-span-6 relative h-[360px] md:h-[420px] w-full rounded-[24px] overflow-hidden shadow-lg border-2 border-white">
          <Image
            className="w-full h-full object-cover"
            alt="Everything you need to study better"
            src="/images/focus-study-room.png"
            fill
          />
        </div>

        {/* Right Side: Text & Checklist */}
        <div className="lg:col-span-6 flex flex-col items-start gap-6">
          <div>
            <span className="text-xs font-bold text-[#006b2c] uppercase tracking-wider block mb-2">Built for Students, Designed for Focus</span>
            <h2 className="text-[1.7rem] sm:text-[2.25rem] font-bold text-[#191c1e] font-['Lexend',sans-serif] leading-tight tracking-tight">
              Everything you need to study better.
            </h2>
          </div>
          <p className="text-base text-[#565e74] leading-relaxed">
            Whether you&apos;re preparing for competitive exams or completing daily assignments, access spaces crafted specifically for uninterrupted concentration.
          </p>

          <ul className="flex flex-col gap-3 text-sm font-semibold text-[#191c1e]">
            {[
              'Quiet, comfortable environments',
              'High-speed WiFi',
              'Power backup',
              'AC / climate-controlled spaces',
              'Lockers where available',
              'Clean and hygienic facilities',
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[#e6f4ea] text-[#006b2c] flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/centres"
            className="mt-2 inline-flex items-center justify-center bg-[#006b2c] text-white font-bold text-sm px-8 py-3.5 rounded-2xl hover:bg-[#00873a] transition-all shadow-md"
          >
            Explore Study Centres
          </Link>
        </div>
      </div>

      {/* 4. OWNER CTA BANNER */}
      <div className="bg-white rounded-[24px] p-8 border border-[#e0e3e5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-[#191c1e] font-['Lexend',sans-serif] mb-1">
            Own a study space?
          </h3>
          <p className="text-sm text-[#565e74]">
            List your centre on StudyNook and reach students actively looking for a place to study.
          </p>
        </div>
        <Link
          href="/owner/centres/new"
          className="shrink-0 inline-flex items-center gap-2 border-2 border-[#006b2c] text-[#006b2c] font-bold text-sm px-6 py-3 rounded-2xl hover:bg-[#006b2c] hover:text-white transition-all"
        >
          <span>List Your Centre</span>
          <span>→</span>
        </Link>
      </div>

      {/* 5. EXPLORE STUDY CENTRES CTA BANNER */}
      <div className="relative min-h-[220px] overflow-hidden rounded-[24px] bg-[#1f4a37]">
        <Image src="/images/study-cta.png" alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
        <div className="absolute inset-0 bg-[#1f4a37]/25" />
        <div className="relative flex h-full min-h-[220px] flex-col justify-center gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-white">
            <p className="font-['Lexend',sans-serif] text-2xl font-bold drop-shadow-sm">Ready to find your perfect study space?</p>
            <p className="mt-1 text-sm text-white/90 drop-shadow-sm">Join students who study better with StudyNook.</p>
          </div>
          <div className="shrink-0">
            <Link href="/centres" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#1f4a37] transition-colors hover:bg-white/90">
              Explore Study Centres <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
