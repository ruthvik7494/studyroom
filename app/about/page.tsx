import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About StudyNook',
  description: 'StudyNook helps students find, compare and book verified study spaces — study halls, reading rooms, libraries and coworking desks.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:px-16 overflow-hidden border-b border-[#bdcaba]/30">
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-[#7ffc97]/20 to-transparent blur-3xl rounded-full translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-[#dae2fd]/30 to-transparent blur-3xl rounded-full -translate-x-1/4 translate-y-1/4"></div>
        </div>
        <div className="max-w-[1280px] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            {/* Text Content */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#006b2c]/10 text-[#006b2c] font-['Inter'] text-sm font-semibold border border-[#006b2c]/20 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  100% Verified Platform
                </span>
                <div className="flex items-center gap-1 text-[#f59e0b]">
                  <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="text-[#3e4a3d] font-['Inter'] text-xs font-medium ml-1">(4.7/5 Average)</span>
                </div>
              </div>
              <h1 className="font-['Lexend'] text-3xl md:text-5xl text-[#191c1e] mb-6 tracking-tight font-bold">
                India&apos;s trusted platform to <br className="hidden md:block"/>
                <span className="text-[#006b2c] font-bold">discover and book</span> study spaces
              </h1>
              <p className="font-['Inter'] text-lg text-[#3e4a3d] mb-8 max-w-xl">
                Find the perfect environment for deep cognitive work. We connect serious students and professionals with curated, premium study centres.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link href="/centres" className="bg-[#006b2c] text-white px-8 py-4 rounded-xl font-['Inter'] text-sm font-semibold hover:bg-[#006e2d] transition-all shadow-[0_4px_12px_rgba(0,107,44,0.2)] hover:shadow-[0_6px_16px_rgba(0,107,44,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  Search Centres
                </Link>
              </div>
              {/* Trust Badges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#ffffff] p-6 rounded-2xl border border-[#bdcaba]/30 shadow-sm">
                <div className="flex flex-col gap-1 text-[#191c1e]">
                  <span className="material-symbols-outlined text-[#006b2c] text-[24px]">verified</span>
                  <span className="font-['Inter'] text-xs font-bold">Verified Centres</span>
                </div>
                <div className="flex flex-col gap-1 text-[#191c1e]">
                  <span className="material-symbols-outlined text-[#006b2c] text-[24px]">event_seat</span>
                  <span className="font-['Inter'] text-xs font-bold">Live Availability</span>
                </div>
                <div className="flex flex-col gap-1 text-[#191c1e]">
                  <span className="material-symbols-outlined text-[#006b2c] text-[24px]">bolt</span>
                  <span className="font-['Inter'] text-xs font-bold">Instant Booking</span>
                </div>
                <div className="flex flex-col gap-1 text-[#191c1e]">
                  <span className="material-symbols-outlined text-[#006b2c] text-[24px]">lock</span>
                  <span className="font-['Inter'] text-xs font-bold">Secure Payments</span>
                </div>
              </div>
            </div>
            {/* Hero Image/Bento */}
            <div className="relative hidden lg:block h-[600px] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Premium Study Space" className="absolute inset-0 w-full h-full object-cover rounded-[2rem] shadow-2xl z-10 border-4 border-[#f7f9fb]" src="/images/AboutImages/mainImg.jpg" />
              {/* Floating Stat Card */}
              <div className="absolute bottom-10 -left-10 z-20 bg-[#f7f9fb] border border-[#bdcaba]/20 p-6 rounded-2xl w-72 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-[#006b2c] rounded-full flex items-center justify-center text-white">
                    <span className="material-symbols-outlined fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-[#191c1e] m-0">4.7/5</p>
                    <p className="font-['Inter'] text-xs text-[#3e4a3d] font-medium">Average Platform Rating</p>
                  </div>
                </div>
                <div className="flex items-center -space-x-3 mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="w-8 h-8 rounded-full border-2 border-[#f7f9fb] bg-[#e0e3e5]" src="/images/AboutImages/reviewimg1.jpg" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="w-8 h-8 rounded-full border-2 border-[#f7f9fb] bg-[#e0e3e5]" src="/images/AboutImages/reviewimg2.jpg" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="w-8 h-8 rounded-full border-2 border-[#f7f9fb] bg-[#e0e3e5]" src="/images/AboutImages/reviewimg3.jpg" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#f7f9fb] bg-[#e6e8ea] flex items-center justify-center text-[10px] font-bold text-[#191c1e]">+1k</div>
                </div>
              </div>
              {/* Live Availability Badge */}
              <div className="absolute top-10 -right-8 z-20 bg-[#f7f9fb] border border-[#bdcaba]/20 py-3 px-5 rounded-full shadow-lg flex items-center gap-2">
                <span className="w-3 h-3 bg-[#10b981] rounded-full animate-pulse"></span>
                <span className="font-['Inter'] text-sm font-semibold text-[#191c1e]">542 seats currently available</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-20 px-4 md:px-16 bg-[#006b2c] text-white shadow-[inset_0_4px_24px_rgba(0,0,0,0.1)]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/20 text-center">
            <div className="px-4">
              <p className="text-5xl md:text-6xl font-bold font-['Lexend'] mb-2 tracking-tighter">10+</p>
              <p className="font-['Inter'] text-sm font-semibold text-[#f7fff2]/80 uppercase tracking-widest">Verified Centres</p>
            </div>
            <div className="px-4">
              <p className="text-5xl md:text-6xl font-bold font-['Lexend'] mb-2 tracking-tighter">1k+</p>
              <p className="font-['Inter'] text-sm font-semibold text-[#f7fff2]/80 uppercase tracking-widest">Registered Students</p>
            </div>
            <div className="px-4">
              <p className="text-5xl md:text-6xl font-bold font-['Lexend'] mb-2 tracking-tighter">5k+</p>
              <p className="font-['Inter'] text-sm font-semibold text-[#f7fff2]/80 uppercase tracking-widest">Bookings Completed</p>
            </div>
            <div className="px-4 border-r-0">
              <p className="text-5xl md:text-6xl font-bold font-['Lexend'] mb-2 tracking-tighter">4.7</p>
              <div className="flex justify-center items-center gap-1 mb-1 text-[#fcd34d]">
                <span className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
              </div>
              <p className="font-['Inter'] text-sm font-semibold text-[#f7fff2]/80 uppercase tracking-widest">Average Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Why Choose Us */}
      <section className="py-20 px-4 md:px-16 bg-[#f7f9fb] border-y border-[#bdcaba]/20">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="font-['Lexend'] text-3xl md:text-4xl text-[#191c1e] mb-4 font-bold">Helping students find better places to focus and grow.</h2>
            <p className="font-['Inter'] text-lg text-[#3e4a3d]">We believe in transparency and trust, providing a curated marketplace of high-quality study environments.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto">
            {/* Large Card */}
            <div className="bg-[#2d3133] rounded-2xl p-8 md:col-span-2 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#006b2c]/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/4"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-[#006b2c]/20 text-[#62df7d] px-3 py-1 rounded-full font-['Inter'] text-xs font-semibold border border-[#006b2c]/30 mb-6">
                  <span className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                  <span>Our Core Promise</span>
                </div>
                <h3 className="font-['Lexend'] text-[#eff1f3] mb-3 text-2xl font-semibold">Verified Centres Only</h3>
                <p className="font-['Inter'] text-base text-[#eff1f3]/80 max-w-md">Every study centre on our platform undergoes a rigorous 40-point quality check to ensure a premium, quiet, and safe environment for deep work.</p>
              </div>
            </div>
            {/* Regular Cards */}
            <div className="bg-[#ffffff] border border-[#bdcaba]/30 rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300 shadow-sm">
              <div className="w-12 h-12 bg-[#dae2fd] rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#565e74]">event_seat</span>
              </div>
              <h3 className="font-['Lexend'] text-[#191c1e] mb-3 text-xl font-semibold">Live Availability</h3>
              <p className="font-['Inter'] text-base text-[#3e4a3d]">Check real-time seat availability before you step out.</p>
            </div>
            <div className="bg-[#ffffff] border border-[#bdcaba]/30 rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300 shadow-sm">
              <div className="w-12 h-12 bg-[#d5e3fd]/30 rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#4f5d72]">bolt</span>
              </div>
              <h3 className="font-['Lexend'] text-[#191c1e] mb-3 text-xl font-semibold">Instant Booking</h3>
              <p className="font-['Inter'] text-base text-[#3e4a3d]">Reserve your spot instantly with zero waiting time.</p>
            </div>
            <div className="bg-[#ffffff] border border-[#bdcaba]/30 rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300 shadow-sm">
              <div className="w-12 h-12 bg-[#ffdad6]/50 rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#ba1a1a]">shield_person</span>
              </div>
              <h3 className="font-['Lexend'] text-[#191c1e] mb-3 text-xl font-semibold">Women-Safe Spaces</h3>
              <p className="font-['Inter'] text-base text-[#3e4a3d]">Dedicated safe zones and well-lit environments.</p>
            </div>
            <div className="bg-[#ffffff] border border-[#bdcaba]/30 rounded-2xl p-8 hover:-translate-y-1 transition-transform duration-300 shadow-sm">
              <div className="w-12 h-12 bg-[#006b2c]/10 rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#006b2c]">payments</span>
              </div>
              <h3 className="font-['Lexend'] text-[#191c1e] mb-3 text-xl font-semibold">Affordable Pricing</h3>
              <p className="font-['Inter'] text-base text-[#3e4a3d]">Transparent pricing with no hidden fees.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 md:px-16 bg-[#f2f4f6]">
        <div className="max-w-[1280px] mx-auto">
          <h2 className="font-['Lexend'] text-3xl md:text-4xl text-center text-[#191c1e] mb-16 font-bold">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-1/4 left-[12.5%] right-[12.5%] h-0.5 bg-[#bdcaba]/30 -z-10 w-3/4 mx-auto"></div>
            
            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#f7f9fb] to-[#f2f4f6] border border-[#006b2c]/30 text-[#006b2c] rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-xl relative group transition-all duration-300 hover:shadow-[#006b2c]/20 hover:-translate-y-1">
                <div className="absolute inset-0 bg-[#006b2c]/5 rounded-[2rem] blur-md group-hover:bg-[#006b2c]/10 transition-colors"></div>
                <span className="material-symbols-outlined text-[36px] fill-current relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
              </div>
              <h4 className="font-['Lexend'] text-[#191c1e] mb-2 text-xl font-semibold">1. Search</h4>
              <p className="font-['Inter'] text-sm text-[#3e4a3d]">Find centres near your location.</p>
            </div>
            
            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#f7f9fb] to-[#f2f4f6] border border-[#006b2c]/30 text-[#006b2c] rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-xl relative group transition-all duration-300 hover:shadow-[#006b2c]/20 hover:-translate-y-1">
                <div className="absolute inset-0 bg-[#006b2c]/5 rounded-[2rem] blur-md group-hover:bg-[#006b2c]/10 transition-colors"></div>
                <span className="material-symbols-outlined text-[36px] fill-current relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>compare_arrows</span>
              </div>
              <h4 className="font-['Lexend'] text-[#191c1e] mb-2 text-xl font-semibold">2. Compare</h4>
              <p className="font-['Inter'] text-sm text-[#3e4a3d]">Review amenities and pricing.</p>
            </div>
            
            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#f7f9fb] to-[#f2f4f6] border border-[#006b2c]/30 text-[#006b2c] rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-xl relative group transition-all duration-300 hover:shadow-[#006b2c]/20 hover:-translate-y-1">
                <div className="absolute inset-0 bg-[#006b2c]/5 rounded-[2rem] blur-md group-hover:bg-[#006b2c]/10 transition-colors"></div>
                <span className="material-symbols-outlined text-[36px] fill-current relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>bookmark_added</span>
              </div>
              <h4 className="font-['Lexend'] text-[#191c1e] mb-2 text-xl font-semibold">3. Book</h4>
              <p className="font-['Inter'] text-sm text-[#3e4a3d]">Secure your seat instantly.</p>
            </div>
            
            <div className="text-center relative">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#f7f9fb] to-[#f2f4f6] border border-[#006b2c]/30 text-[#006b2c] rounded-[2rem] mx-auto flex items-center justify-center mb-6 shadow-xl relative group transition-all duration-300 hover:shadow-[#006b2c]/20 hover:-translate-y-1">
                <div className="absolute inset-0 bg-[#006b2c]/5 rounded-[2rem] blur-md group-hover:bg-[#006b2c]/10 transition-colors"></div>
                <span className="material-symbols-outlined text-[36px] fill-current relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
              </div>
              <h4 className="font-['Lexend'] text-[#191c1e] mb-2 text-xl font-semibold">4. Study</h4>
              <p className="font-['Inter'] text-sm text-[#3e4a3d]">Focus in a premium environment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 md:px-16 bg-[#f7f9fb] border-t border-[#bdcaba]/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-['Lexend'] text-3xl md:text-4xl text-[#191c1e] mb-4 font-bold">Loved by students across Hyderabad</h2>
          <p className="font-['Inter'] text-lg text-[#3e4a3d] mb-12">Don&apos;t just take our word for it. See what our community says.</p>
          <div className="bg-[#ffffff] border border-[#bdcaba]/30 rounded-2xl p-10 md:p-16 relative shadow-lg">
            <span className="material-symbols-outlined absolute top-8 left-8 text-[64px] text-[#006b2c]/10 -z-10" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
            <div className="flex justify-center items-center gap-1 mb-8 text-[#f59e0b]">
              <span className="material-symbols-outlined text-[28px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="material-symbols-outlined text-[28px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="material-symbols-outlined text-[28px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="material-symbols-outlined text-[28px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="material-symbols-outlined text-[28px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <p className="font-['Lexend'] text-[#191c1e] font-normal mb-8 relative z-10 text-xl leading-relaxed">
              &quot;StudyNook made finding a quiet place to prepare for my civil services exams so easy. The live availability feature saved me countless trips to full libraries. Truly a game-changer for serious students.&quot;
            </p>
            <div className="flex items-center justify-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Admin User Avatar" className="w-14 h-14 rounded-full border-2 border-[#006b2c] p-0.5 object-cover" src="/images/AboutImages/riviewerimg.jpg" />
              <div className="text-left">
                <p className="font-['Inter'] text-[#191c1e] text-lg font-semibold flex items-center gap-1">
                  Admin User
                  <span className="material-symbols-outlined text-[#006b2c] text-[18px] fill-current" title="Verified Reviewer" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </p>
                <p className="font-['Inter'] text-sm text-[#3e4a3d]">Civil Services Aspirant • 42 Bookings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 md:px-16 bg-[#006b2c] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-['Lexend'] text-3xl md:text-5xl font-bold mb-6">Ready to find your perfect study space?</h2>
          <p className="font-['Inter'] text-lg text-[#f7fff2]/90 mb-10 max-w-2xl mx-auto">Join thousands of students who have upgraded their study environment with StudyNook&apos;s verified network.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/centres" className="bg-[#f7f9fb] text-[#006b2c] px-8 py-4 rounded-xl font-['Inter'] text-sm hover:bg-[#eceef0] transition-all shadow-lg font-bold text-lg">
              Explore Study Centres
            </Link>
            <Link href="/owner/centres/new" className="bg-transparent text-white border-2 border-white px-8 py-4 rounded-xl font-['Inter'] text-sm hover:bg-white/10 transition-colors font-bold text-lg">
              List Your Centre
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-[#f7fff2]/80 text-sm">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span>Secure 256-bit encrypted bookings</span>
          </div>
        </div>
      </section>
    </>
  );
}
