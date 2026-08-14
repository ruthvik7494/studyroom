import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Contact Us - StudyNook',
  description: 'Get in touch with the StudyNook team.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
        <Image 
          alt="Premium executive study hall" 
          className="absolute inset-0 w-full h-full object-cover" 
          src="/images/screen.png" 
          fill
          priority
        />
        <div className="absolute inset-0 bg-black/40 flex items-center">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16 w-full">
            <div className="max-w-2xl">
              <h1 className="font-['Lexend'] text-4xl md:text-5xl font-bold text-white mb-4">Get in Touch</h1>
              <p className="font-['Inter'] text-lg text-white/90">We&apos;re here to help you find your perfect focus zone. Reach out with any questions about memberships, locations, or enterprise solutions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-20 px-4 md:px-16 max-w-[1280px] mx-auto w-full">
        {/* Header Section */}
        <section className="mb-16 text-center md:text-left max-w-3xl">
          <h1 className="font-['Lexend'] text-3xl md:text-5xl text-[#006b2c] mb-4 font-bold">How can we help?</h1>
          <p className="font-['Inter'] text-lg text-[#3e4a3d]">We&apos;re committed to providing you with the best executive study environments. Our support team is highly responsive and ready to assist you.</p>
        </section>

        {/* Social Proof Ribbon */}
        <section className="mb-16 bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_10px_30px_-10px_rgba(86,94,116,0.15)] rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-around gap-8">
          <div className="flex items-center gap-4">
            <div className="bg-[#006b2c]/10 p-3 rounded-full text-[#006b2c]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <div>
              <div className="font-['Lexend'] text-2xl font-semibold text-[#191c1e]">4.9/5</div>
              <div className="font-['Inter'] text-xs font-medium text-[#3e4a3d] uppercase tracking-wider">Support Satisfaction</div>
            </div>
          </div>
          <div className="hidden md:block w-px h-12 bg-[#bdcaba]/30"></div>
          <div className="flex items-center gap-4">
            <div className="bg-[#006b2c]/10 p-3 rounded-full text-[#006b2c]">
              <span className="material-symbols-outlined">timer</span>
            </div>
            <div>
              <div className="font-['Lexend'] text-2xl font-semibold text-[#191c1e]">&lt; 5 hours</div>
              <div className="font-['Inter'] text-xs font-medium text-[#3e4a3d] uppercase tracking-wider">Average Response Time</div>
            </div>
          </div>
          <div className="hidden md:block w-px h-12 bg-[#bdcaba]/30"></div>
          <div className="flex items-center gap-4">
            <div className="bg-[#006b2c]/10 p-3 rounded-full text-[#006b2c]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <div className="font-['Lexend'] text-2xl font-semibold text-[#191c1e]">98%</div>
              <div className="font-['Inter'] text-xs font-medium text-[#3e4a3d] uppercase tracking-wider">Resolution Rate</div>
            </div>
          </div>
        </section>

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Direct Help & Locations */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Direct Help */}
            <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_10px_30px_-10px_rgba(86,94,116,0.15)] rounded-[24px] p-8 flex-grow">
              <h2 className="font-['Lexend'] text-2xl font-semibold text-[#006b2c] mb-6">Direct Help</h2>
              <div className="mb-8">
                <h3 className="font-['Inter'] text-sm font-semibold text-[#191c1e] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#565e74]">school</span>
                  For Students &amp; Researchers
                </h3>
                <p className="font-['Inter'] text-sm text-[#3e4a3d] mb-3">Questions about your membership, bookings, or amenities.</p>
                <a className="font-['Inter'] text-sm font-semibold text-[#006b2c] hover:text-[#006e2d] flex items-center gap-1 transition-colors" href="#">
                  support@studynook.com
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>
              <div>
                <h3 className="font-['Inter'] text-sm font-semibold text-[#191c1e] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#565e74]">business_center</span>
                  For Partners &amp; Business
                </h3>
                <p className="font-['Inter'] text-sm text-[#3e4a3d] mb-3">Inquiries regarding corporate packages or establishing a new Nook.</p>
                <a className="font-['Inter'] text-sm font-semibold text-[#006b2c] hover:text-[#006e2d] flex items-center gap-1 transition-colors" href="#">
                  partners@studynook.com
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>
            </div>

            {/* Locations */}
            <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_10px_30px_-10px_rgba(86,94,116,0.15)] rounded-[24px] p-8">
              <h2 className="font-['Lexend'] text-2xl font-semibold text-[#006b2c] mb-6">Our Locations</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#565e74] mt-1">location_on</span>
                  <div>
                    <div className="font-['Inter'] text-sm font-semibold text-[#191c1e]">Headquarters (Hyderabad)</div>
                    <div className="font-['Inter'] text-sm text-[#3e4a3d]">Cyber Towers, Hitech City<br/>Hyderabad, TG 500081</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#565e74] mt-1">location_on</span>
                  <div>
                    <div className="font-['Inter'] text-sm font-semibold text-[#191c1e]">Regional Office (Secunderabad)</div>
                    <div className="font-['Inter'] text-sm text-[#3e4a3d]">SD Road, Paradise Circle<br/>Secunderabad, TG 500003</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-8 bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_10px_30px_-10px_rgba(86,94,116,0.15)] rounded-[24px] p-8 md:p-12">
            <h2 className="font-['Lexend'] text-3xl font-semibold text-[#006b2c] mb-8">Send us a message</h2>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-['Inter'] text-sm font-semibold text-[#191c1e] mb-2" htmlFor="firstName">First Name</label>
                  <input className="w-full bg-[#f2f4f6] border border-[#bdcaba]/50 rounded-xl px-4 py-3 font-['Inter'] text-base text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b2c] focus:border-transparent transition-shadow" id="firstName" placeholder="Jane" type="text"/>
                </div>
                <div>
                  <label className="block font-['Inter'] text-sm font-semibold text-[#191c1e] mb-2" htmlFor="lastName">Last Name</label>
                  <input className="w-full bg-[#f2f4f6] border border-[#bdcaba]/50 rounded-xl px-4 py-3 font-['Inter'] text-base text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b2c] focus:border-transparent transition-shadow" id="lastName" placeholder="Doe" type="text"/>
                </div>
              </div>
              <div>
                <label className="block font-['Inter'] text-sm font-semibold text-[#191c1e] mb-2" htmlFor="email">Email Address</label>
                <input className="w-full bg-[#f2f4f6] border border-[#bdcaba]/50 rounded-xl px-4 py-3 font-['Inter'] text-base text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b2c] focus:border-transparent transition-shadow" id="email" placeholder="jane.doe@example.com" type="email"/>
              </div>
              <div>
                <label className="block font-['Inter'] text-sm font-semibold text-[#191c1e] mb-2" htmlFor="topic">Topic</label>
                <select className="w-full bg-[#f2f4f6] border border-[#bdcaba]/50 rounded-xl px-4 py-3 font-['Inter'] text-base text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b2c] focus:border-transparent transition-shadow appearance-none" id="topic" defaultValue="">
                  <option disabled value="">Select a topic...</option>
                  <option value="membership">Membership Support</option>
                  <option value="booking">Booking Issue</option>
                  <option value="partnership">Partnership Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-['Inter'] text-sm font-semibold text-[#191c1e] mb-2" htmlFor="message">Message</label>
                <textarea className="w-full bg-[#f2f4f6] border border-[#bdcaba]/50 rounded-xl px-4 py-3 font-['Inter'] text-base text-[#191c1e] focus:outline-none focus:ring-2 focus:ring-[#006b2c] focus:border-transparent transition-shadow resize-none" id="message" placeholder="How can we help you today?" rows={5}></textarea>
              </div>
              <div className="pt-4">
                <button className="w-full md:w-auto bg-[#006b2c] text-white px-8 py-3 rounded-xl font-['Inter'] text-sm font-semibold hover:bg-[#006e2d] transition-colors shadow-[0_4px_14px_0_rgba(0,107,44,0.2)] active:scale-95 duration-200" type="button">Send Message</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
