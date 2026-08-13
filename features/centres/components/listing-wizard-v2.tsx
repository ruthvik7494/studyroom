'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { centreUpsertSchema, withHttps, type CentreUpsert } from '../schema';
import { createCentre, updateCentre, uploadCentreImage, submitForReview } from '../actions';
import { DeletePhotoButton } from './delete-photo-button';
import {
  Wifi,
  Snowflake,
  Zap,
  Lock,
  Camera,
  Droplets,
  Bath,
  Bike,
  BookOpen,
  VolumeX,
  Coffee,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';

interface Amenity { id: string; label: string; icon: string | null }

const AMENITY_LUCIDE_MAP: Record<string, React.ReactNode> = {
  'High-speed Wi-Fi': <Wifi className="w-6 h-6 text-[#16a34a]" />,
  'Air conditioning': <Snowflake className="w-6 h-6 text-[#0284c7]" />,
  'Power at every desk': <Zap className="w-6 h-6 text-[#eab308]" />,
  'Personal lockers': <Lock className="w-6 h-6 text-[#6366f1]" />,
  'CCTV secured': <Camera className="w-6 h-6 text-[#0d9488]" />,
  'RO drinking water': <Droplets className="w-6 h-6 text-[#3b82f6]" />,
  'Separate washrooms': <Bath className="w-6 h-6 text-[#8b5cf6]" />,
  'Two-wheeler parking': <Bike className="w-6 h-6 text-[#f97316]" />,
  'Reference library': <BookOpen className="w-6 h-6 text-[#a855f7]" />,
  'Dedicated silent zone': <VolumeX className="w-6 h-6 text-[#64748b]" />,
  'Tea & coffee counter': <Coffee className="w-6 h-6 text-[#b45309]" />,
  '24×7 access': <Clock className="w-6 h-6 text-[#10b981]" />,
};

const INDIA_STATES_CITIES: Record<string, string[]> = {
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Tirupati', 'Rajahmundry', 'Kadapa', 'Anantapur'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Pimpri-Chinchwad', 'Nashik', 'Kalyan-Dombivli', 'Vasai-Virar', 'Aurangabad', 'Navi Mumbai', 'Solapur', 'Kolhapur'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Erode', 'Vellore', 'Tirunelveli', 'Thanjavur'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Bareilly', 'Aligarh', 'Gorakhpur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Kharagpur', 'Bardhaman', 'Malda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sikar'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur', 'Kannur', 'Alappuzha', 'Kottayam'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif'],
};

const POSTCODE_PREFIX_MAP: Record<string, { state: string; city: string }> = {
  '506': { state: 'Telangana', city: 'Warangal' },
  '500': { state: 'Telangana', city: 'Hyderabad' },
  '560': { state: 'Karnataka', city: 'Bengaluru' },
  '400': { state: 'Maharashtra', city: 'Mumbai' },
  '411': { state: 'Maharashtra', city: 'Pune' },
  '110': { state: 'Delhi', city: 'New Delhi' },
  '600': { state: 'Tamil Nadu', city: 'Chennai' },
  '201': { state: 'Uttar Pradesh', city: 'Noida' },
  '700': { state: 'West Bengal', city: 'Kolkata' },
  '380': { state: 'Gujarat', city: 'Ahmedabad' },
  '302': { state: 'Rajasthan', city: 'Jaipur' },
};
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const SEATING_TIERS = [
  { label: '1 - 10', value: 10 },
  { label: '10 - 50', value: 50 },
  { label: '50 - 100+', value: 100 },
];

const BUSINESS_TAGS = ['Quiet', 'Premium', 'Affordable', 'AC', 'Library', '24x7', 'Students', 'Professionals'] as const;

const SPACE_TYPES: { value: CentreUpsert['spaceType']; label: string }[] = [
  { value: 'study_hall', label: 'Study Centre' },
  { value: 'reading_room', label: 'Reading Room' },
  { value: 'coworking', label: 'Coworking Space' },
  { value: 'both', label: 'Hybrid (Study & Coworking)' },
];

const PRICE_FIELDS: { key: keyof CentreUpsert; label: string }[] = [
  { key: 'priceHourly', label: 'Hourly' },
  { key: 'priceDaily', label: 'Daily' },
  { key: 'priceWeekly', label: 'Weekly' },
  { key: 'priceFortnightly', label: 'Fortnightly' },
  { key: 'priceMonthly', label: 'Monthly' },
  { key: 'priceQuarterly', label: 'Quarterly' },
  { key: 'priceHalfYearly', label: 'Half-yearly' },
  { key: 'priceYearly', label: 'Yearly' },
];

const GALLERY_SLOTS = ['Exterior View', 'Reception', 'Reading Hall', 'Seating Area', 'Private Cabins', 'Cafeteria', 'Parking Area', 'Other Facilities'];
const STEPS = ['Profile', 'Hours & Amenities', 'Social', 'Gallery', 'Review'];

const STEP_DESCRIPTIONS = [
  'Set up the basic identity, location address, and contact details of your study space.',
  'Set your study centre timings, pricing structure, and facilities.',
  'Add your website and social media presence.',
  'Upload high-quality photos of your study space.',
  'Review all details and publish your listing.',
];

interface Props {
  mode: 'create' | 'edit';
  centreId?: string;
  defaults?: Partial<CentreUpsert>;
  amenities: Amenity[];
  intro?: string;
  photos?: { logoUrl: string | null; coverUrl: string | null; coverImageId: string | null; gallery: { id: string; url: string; category: string | null }[] };
}

export function ListingWizardV2(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxUnlocked, setMaxUnlocked] = useState(props.mode === 'edit' ? 6 : 0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading'>('idle');

  const [pinLoading, setPinLoading] = useState(false);
  const [amenityStyle, setAmenityStyle] = useState<'horizontal' | 'chips' | 'pills' | 'cards'>('horizontal');
  const [copyHoursSourceDay, setCopyHoursSourceDay] = useState<number | null>(null);
  const [copyHoursTargets, setCopyHoursTargets] = useState<number[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<Record<string, File[]>>({});
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const submitIntent = useRef<'draft' | 'publish'>('draft');

  const onGalleryChange = (slot: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setGalleryFiles((prev) => {
      const current = prev[slot] ?? [];
      return { ...prev, [slot]: [...current, ...files] };
    });
    e.target.value = '';
  };

  const removePickedFile = (slot: string, indexToRemove: number) => {
    setGalleryFiles((prev) => {
      const current = prev[slot] ?? [];
      const nextFiles = current.filter((_, i) => i !== indexToRemove);
      const next = { ...prev };
      if (nextFiles.length > 0) {
        next[slot] = nextFiles;
      } else {
        delete next[slot];
      }
      return next;
    });
  };

  const onExtraChange = (e: React.ChangeEvent<HTMLInputElement>) => setExtraFiles(Array.from(e.target.files ?? []));

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<CentreUpsert>({
    resolver: zodResolver(centreUpsertSchema),
    mode: 'onBlur',
    defaultValues: { spaceType: 'study_hall', seats: 10, amenityIds: [], tags: [], country: 'India', ...props.defaults },
  });

  const values = watch();

  const uploadOne = async (centreId: string, file: File, opts: { isCover?: boolean; category?: string } = {}) => {
    const fd = new FormData();
    fd.set('centreId', centreId);
    fd.set('isCover', String(!!opts.isCover));
    if (opts.category) fd.set('category', opts.category);
    fd.set('file', file);
    const res = await uploadCentreImage(fd);
    return res.ok ? null : res.error.message;
  };

  const doSubmit = async (formValues: CentreUpsert) => {
    setServerError(null);
    setPhase('saving');
    try {
      const res = props.mode === 'create'
        ? await createCentre(formValues)
        : await updateCentre({ ...formValues, centreId: props.centreId! });
      if (!res.ok) { setServerError(res.error.message); setPhase('idle'); return; }

      const centreId = props.mode === 'create' && 'id' in res.data ? res.data.id : props.centreId!;
      if (centreId) {
        setPhase('uploading');
        if (coverFile) await uploadOne(centreId, coverFile, { isCover: true });
        if (logoFile) await uploadOne(centreId, logoFile);

        const allGalleryFiles = [
          ...Object.entries(galleryFiles).flatMap(([slot, files]) => files.map((file) => ({ slot, file }))),
          ...extraFiles.map((file) => ({ slot: undefined as string | undefined, file })),
        ];

        for (const { slot, file } of allGalleryFiles) {
          await uploadOne(centreId, file, slot ? { category: slot } : {});
        }

        if (submitIntent.current === 'publish') {
          await submitForReview(centreId);
        }
      }

      router.push('/owner/centres');
      router.refresh();
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
      setPhase('idle');
    }
  };

  const validateStep = async (idx: number): Promise<boolean> => {
    setServerError(null);
    return true;
  };

  const goto = async (target: number) => {
    setServerError(null);
    if (target > step) {
      const stepFields: (keyof CentreUpsert)[][] = [
        ['name', 'about', 'phone', 'altPhone', 'businessEmail', 'website', 'address', 'postcode', 'city', 'state'],
        [],
        [],
        [],
        []
      ];
      const fieldsToValidate = stepFields[step];
      if (fieldsToValidate && fieldsToValidate.length > 0) {
        const isValid = await trigger(fieldsToValidate);
        if (!isValid) return;
      }
    }
    setMaxUnlocked((m) => Math.max(m, target));
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen text-[#191c1e] font-['Inter',sans-serif] pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <h1 className="text-xl font-bold text-[#16a34a] font-['Lexend',sans-serif]">StudyNook Partner Onboarding</h1>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { submitIntent.current = 'draft'; handleSubmit(doSubmit)(); }}
            className="text-sm font-semibold text-[#16a34a]"
          >
            Save Draft
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Horizontal Stepper matching code.html */}
        <div className="mb-10 w-full overflow-x-auto pb-4">
          <div className="flex items-center justify-between min-w-max gap-4 max-w-4xl mx-auto">
            {STEPS.map((label, idx) => {
              const active = idx === step;
              const completed = idx < step;
              return (
                <div key={label} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => goto(idx)}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <span className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all",
                      active ? "bg-[#16a34a] text-white shadow-sm" : completed ? "bg-[#16a34a]/20 text-[#16a34a]" : "border-2 border-[#e0e3e5] text-[#565e74] bg-white"
                    )}>
                      {idx + 1}
                    </span>
                    <span className={cn("text-xs font-semibold whitespace-nowrap", active ? "text-[#16a34a]" : "text-[#565e74]")}>
                      {label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 min-w-[24px] h-[2px] bg-[#e0e3e5] mx-2 -mt-5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>


        {serverError && (
          <div className="mb-6 bg-[#ffdad6] text-[#93000a] p-4 rounded-xl text-sm font-semibold border border-[#ba1a1a]/20">
            ⚠️ {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(doSubmit)} noValidate className="space-y-8">
          {/* STEP 1 — Profile */}
          {step === 0 && (
            <div className="space-y-8">
              {/* Basic Info Group */}
              <div className="grid grid-cols-12 gap-6 bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs">
                <div className="col-span-12 lg:col-span-4">
                  <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Basic Info</h3>
                  <p className="text-xs text-[#565e74] mt-1">The primary details identifying your business on the platform.</p>
                </div>
                <div className="col-span-12 lg:col-span-8 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="name">
                      Centre Name <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Enter your business name"
                      className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]"
                      {...register('name')}
                    />
                    {errors.name && <p className="text-xs text-[#ba1a1a] mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="about">
                      Short Description <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <textarea
                      id="about"
                      rows={3}
                      placeholder="A brief overview of your space..."
                      className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a] resize-none"
                      {...register('about')}
                    />
                    {errors.about && <p className="text-xs text-[#ba1a1a] mt-1">{errors.about.message}</p>}
                  </div>
                </div>
              </div>

              {/* Visuals Group */}
              <div className="grid grid-cols-12 gap-6 bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs">
                <div className="col-span-12 lg:col-span-4">
                  <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Visuals</h3>
                  <p className="text-xs text-[#565e74] mt-1">Logos and cover images that represent your brand.</p>
                </div>
                <div className="col-span-12 lg:col-span-8 grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5">
                      Business Logo <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <label className="h-[150px] w-full bg-[#f2f4f6] rounded-xl border-2 border-dashed border-[#bdcaba] hover:border-[#16a34a] transition-colors flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                      <span className="text-2xl mb-1">📷</span>
                      <span className="text-xs font-bold text-[#16a34a]">{logoFile ? logoFile.name : 'Logo'}</span>
                      <span className="text-[10px] text-[#565e74] mt-1">Max 5MB</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5">
                      Cover Image <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <label className="h-[150px] w-full bg-[#f2f4f6] rounded-xl border-2 border-dashed border-[#bdcaba] hover:border-[#16a34a] transition-colors flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                      <span className="text-2xl mb-1">🖼️</span>
                      <span className="text-xs font-bold text-[#16a34a]">{coverFile ? coverFile.name : 'Cover Image'}</span>
                      <span className="text-[10px] text-[#565e74] mt-1">1920x1080 recommended</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Address & Contact Details */}
              <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Address & Contact Details</h3>
                    <p className="text-xs text-[#565e74] mt-0.5">Provide the contact info and location for your study centre.</p>
                  </div>
                  {pinLoading && <span className="text-xs text-[#16a34a] font-semibold animate-pulse">🔍 Fetching location from Pincode...</span>}
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="phone">
                      Mobile Number <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input id="phone" placeholder="9876543210" maxLength={10} className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]" {...register('phone')} />
                    {errors.phone && <p className="text-xs text-[#ba1a1a] mt-1">{errors.phone.message}</p>}
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="altPhone">Alternate Number <span className="text-xs font-normal text-[#565e74]">(optional)</span></label>
                    <input id="altPhone" placeholder="9123456789" maxLength={10} className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]" {...register('altPhone')} />
                    {errors.altPhone && <p className="text-xs text-[#ba1a1a] mt-1">{errors.altPhone.message}</p>}
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="businessEmail">Email Address <span className="text-xs font-normal text-[#565e74]">(optional)</span></label>
                    <input id="businessEmail" type="email" placeholder="contact@studycentre.com" className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]" {...register('businessEmail')} />
                    {errors.businessEmail && <p className="text-xs text-[#ba1a1a] mt-1">{errors.businessEmail.message}</p>}
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="website">Website <span className="text-xs font-normal text-[#565e74]">(optional)</span></label>
                    <input id="website" placeholder="studycentre.com" className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]" {...register('website')} />
                    {errors.website && <p className="text-xs text-[#ba1a1a] mt-1">{errors.website.message}</p>}
                  </div>

                  {/* Address first */}
                  <div className="col-span-12">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="address">Address</label>
                    <input id="address" placeholder="123, MG Road, Near City Library" className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]" {...register('address')} />
                  </div>

                  {/* Postcode second */}
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="postcode">
                      Postcode <span className="text-[#ba1a1a]">*</span> <span className="text-[10px] text-[#16a34a] font-semibold lowercase">(Auto-fetches city & state)</span>
                    </label>
                    <input
                      id="postcode"
                      placeholder="e.g. 506001"
                      maxLength={6}
                      className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]"
                      {...register('postcode', {
                        onChange: async (e) => {
                          const code = e.target.value.trim();
                          if (code.length === 6 && /^\d{6}$/.test(code)) {
                            setPinLoading(true);
                            let state = '';
                            let city = '';

                            try {
                              const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
                              const data = await res.json();
                              if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
                                const po = data[0].PostOffice[0];
                                state = po.State || '';
                                city = po.District || po.Block || po.Circle || po.Name || '';
                              }
                            } catch {
                              // API failed
                            }

                            if (!state || !city) {
                              try {
                                const res2 = await fetch(`https://api.zippopotam.us/in/${code}`);
                                if (res2.ok) {
                                  const data2 = await res2.json();
                                  if (data2?.places?.length > 0) {
                                    state = data2.places[0].state || '';
                                    city = data2.places[0]['place name'] || data2.places[0].state || '';
                                  }
                                }
                              } catch {
                                // Fallback failed
                              }
                            }

                            if (!state || !city) {
                              const prefix = code.substring(0, 3);
                              if (POSTCODE_PREFIX_MAP[prefix]) {
                                state = POSTCODE_PREFIX_MAP[prefix].state;
                                city = POSTCODE_PREFIX_MAP[prefix].city;
                              }
                            }

                            if (state) setValue('state', state, { shouldValidate: true, shouldDirty: true });
                            if (city) setValue('city', city, { shouldValidate: true, shouldDirty: true });

                            setPinLoading(false);
                          }
                        }
                      })}
                    />
                    {errors.postcode && <p className="text-xs text-[#ba1a1a] mt-1">{errors.postcode.message}</p>}
                  </div>

                  <div className="col-span-6 md:col-span-4">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="city">City / District</label>
                    <input id="city" placeholder="Auto-filled from PIN" className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]" {...register('city')} />
                  </div>

                  <div className="col-span-6 md:col-span-4">
                    <label className="block text-xs font-semibold text-[#565e74] mb-1.5" htmlFor="state">State</label>
                    <input id="state" placeholder="Auto-filled from PIN" className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]" {...register('state')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Operating Hours & Pricing */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Pricing Structure */}
              <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Pricing Structure</h3>
                  <p className="text-xs text-[#565e74] mt-0.5">Fill in the rates for the membership plans you offer.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Short Pass */}
                  <div className="p-4 bg-[#f8faf8] rounded-2xl border border-[#e0e3e5] space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#191c1e] uppercase tracking-wider block">Short-Term Passes</span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#565e74]">Hourly Pass (₹)</label>
                        <input type="number" placeholder="e.g. 50" className="w-full bg-white border border-[#bdcaba] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16a34a]" {...register('priceHourly')} />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#565e74]">Day Pass / Daily (₹)</label>
                        <input type="number" placeholder="e.g. 300" className="w-full bg-white border border-[#bdcaba] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16a34a]" {...register('priceDaily')} />
                      </div>
                    </div>
                  </div>

                  {/* Standard Plans */}
                  <div className="p-4 bg-[#f8faf8] rounded-2xl border border-[#e0e3e5] space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#191c1e] uppercase tracking-wider block">Regular Plans</span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#565e74]">Monthly Plan (₹)</label>
                        <input type="number" placeholder="e.g. 3500" className="w-full bg-white border border-[#bdcaba] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16a34a]" {...register('priceMonthly')} />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#565e74]">Weekly Plan (₹)</label>
                        <input type="number" placeholder="e.g. 1200" className="w-full bg-white border border-[#bdcaba] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16a34a]" {...register('priceWeekly')} />
                      </div>
                    </div>
                  </div>

                  {/* Long Term */}
                  <div className="p-4 bg-[#f8faf8] rounded-2xl border border-[#e0e3e5] space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#191c1e] uppercase tracking-wider block">Long-Term Bundles</span>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#565e74]">Quarterly (₹)</label>
                        <input type="number" placeholder="e.g. 9000" className="w-full bg-white border border-[#bdcaba] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16a34a]" {...register('priceQuarterly')} />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#565e74]">Half-Yearly (₹)</label>
                        <input type="number" placeholder="e.g. 16000" className="w-full bg-white border border-[#bdcaba] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16a34a]" {...register('priceHalfYearly')} />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-[#565e74]">Yearly (₹)</label>
                        <input type="number" placeholder="e.g. 30000" className="w-full bg-white border border-[#bdcaba] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#16a34a]" {...register('priceYearly')} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Container for Opening Hours & Space Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Operating Hours Table */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs h-full flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f2f4f6] pb-4 shrink-0">
                    <div>
                      <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Opening Hours</h3>
                      <p className="text-xs text-[#565e74] mt-0.5">Set daily operating hours or copy timings across days.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        DAY_ORDER.forEach((dayIdx) => {
                          setValue(`hours.${dayIdx}.isOpen`, true);
                          setValue(`hours.${dayIdx}.openingTime`, '06:00');
                          setValue(`hours.${dayIdx}.closingTime`, '22:00');
                        });
                      }}
                      className="text-xs border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white rounded-xl font-bold"
                    >
                      ⚡ Set All Days to 06:00 - 22:00
                    </Button>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-3 py-4">
                    {DAY_ORDER.map((dayIdx) => {
                      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx] ?? 'Sunday';
                      const dayShort = dayName.charAt(0);
                      const isOpen = values.hours?.[dayIdx]?.isOpen ?? true;

                      return (
                        <div key={dayIdx} className="flex items-center gap-3">
                          {/* Day Circle */}
                          <button
                            type="button"
                            onClick={() => setValue(`hours.${dayIdx}.isOpen`, !isOpen)}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer shrink-0 select-none",
                              isOpen ? "bg-[#0b192c] text-white" : "bg-[#f1f5f9] text-[#94a3b8]"
                            )}
                          >
                            {dayShort}
                          </button>

                          {/* Timing inputs or Unavailable / + button */}
                          {isOpen ? (
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <input
                                type="time"
                                className="bg-[#f8fafc] border-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                                {...register(`hours.${dayIdx}.openingTime`)}
                              />
                              <span className="text-xs text-[#94a3b8] font-medium">-</span>
                              <input
                                type="time"
                                className="bg-[#f8fafc] border-0 rounded-lg px-3 py-2 text-xs font-semibold text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#16a34a]"
                                {...register(`hours.${dayIdx}.closingTime`)}
                              />
                              
                              {/* Actions: Close (Disable) & Copy */}
                              <button
                                type="button"
                                onClick={() => setValue(`hours.${dayIdx}.isOpen`, false)}
                                title="Mark Unavailable"
                                className="p-1.5 text-[#94a3b8] hover:text-[#ef4444] rounded-md transition-colors cursor-pointer"
                              >
                                ✕
                              </button>
                              <button
                                type="button"
                                title={`Copy ${dayName} hours to other days`}
                                onClick={() => {
                                  setCopyHoursSourceDay(dayIdx);
                                  setCopyHoursTargets(DAY_ORDER.filter((d) => d !== dayIdx));
                                }}
                                className="p-1.5 text-[#94a3b8] hover:text-[#16a34a] rounded-md transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#64748b]">Unavailable</span>
                              <button
                                type="button"
                                onClick={() => setValue(`hours.${dayIdx}.isOpen`, true)}
                                title="Add Hours"
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] border border-[#cbd5e1] cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* COPY HOURS MODAL */}
                {copyHoursSourceDay !== null && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#e0e3e5] space-y-4">
                      <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                        <div>
                          <span className="text-xs font-bold text-[#16a34a] uppercase tracking-wider block">COPY TIMES TO...</span>
                          <span className="text-sm font-bold text-[#191c1e]">
                            Source: {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][copyHoursSourceDay]}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCopyHoursSourceDay(null)}
                          className="text-[#565e74] hover:text-black font-bold text-lg cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {DAY_ORDER.map((dIdx) => {
                          if (dIdx === copyHoursSourceDay) return null;
                          const dName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dIdx];
                          const checked = copyHoursTargets.includes(dIdx);
                          return (
                            <label key={dIdx} className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8faf8] cursor-pointer">
                              <span className="text-sm font-semibold text-[#191c1e]">{dName}</span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) setCopyHoursTargets((prev) => [...prev, dIdx]);
                                  else setCopyHoursTargets((prev) => prev.filter((i) => i !== dIdx));
                                }}
                                className="w-4 h-4 accent-[#16a34a] rounded cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCopyHoursSourceDay(null)}
                          className="flex-1 rounded-xl font-bold text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            const srcOpen = values.hours?.[copyHoursSourceDay]?.isOpen ?? true;
                            const srcStart = values.hours?.[copyHoursSourceDay]?.openingTime ?? '06:00';
                            const srcEnd = values.hours?.[copyHoursSourceDay]?.closingTime ?? '22:00';

                            copyHoursTargets.forEach((targetIdx) => {
                              setValue(`hours.${targetIdx}.isOpen`, srcOpen);
                              setValue(`hours.${targetIdx}.openingTime`, srcStart);
                              setValue(`hours.${targetIdx}.closingTime`, srcEnd);
                            });
                            setCopyHoursSourceDay(null);
                          }}
                          className="flex-1 bg-[#16a34a] hover:bg-[#16a34a]/90 text-white rounded-xl font-bold text-xs shadow-sm"
                        >
                          Apply to Selected
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Right Column: Combined Space Details & Facilities Card */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs h-full flex flex-col">
                  <div className="shrink-0">
                    <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Space Details</h3>
                    <p className="text-xs text-[#565e74] mt-0.5">Classify your space and select available facilities.</p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-5 py-2">
                    {/* Space Type */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#565e74]" htmlFor="spaceType">
                        Space Type <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <select
                        id="spaceType"
                        className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]"
                        {...register('spaceType')}
                      >
                        {SPACE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Exact Seating Count */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#565e74]" htmlFor="seats">
                        Exact Seating Count <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <input
                        id="seats"
                        type="number"
                        min={1}
                        className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#16a34a]"
                        {...register('seats')}
                      />
                    </div>

                    {/* Facilities & Amenities */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#565e74]">
                        Facilities &amp; Amenities
                      </label>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {props.amenities.map((a) => {
                          const checked = values.amenityIds?.includes(a.id);
                          const lucideIcon = AMENITY_LUCIDE_MAP[a.label];
                          return (
                            <label
                              key={a.id}
                              className={cn(
                                "cursor-pointer px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none flex items-center gap-1.5",
                                checked
                                  ? "bg-[#16a34a] text-white border-[#16a34a] shadow-xs"
                                  : "bg-[#f2f4f6] text-[#565e74] border-[#bdcaba] hover:bg-[#e6e8ea]"
                              )}
                            >
                              <input type="checkbox" value={a.id} className="sr-only" {...register('amenityIds')} />
                              <span className="shrink-0 flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5">
                                {lucideIcon}
                              </span>
                              <span>{checked ? `✓ ${a.label}` : `+ ${a.label}`}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Women-Safe Access */}
                    <div className="pt-2 border-t border-[#f2f4f6]">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#191c1e] select-none hover:text-[#16a34a] transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-[#16a34a] rounded cursor-pointer"
                          {...register('womenSafeClaim')}
                        />
                        <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
                        <span>This centre has women-safe facilities</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* STEP 3 — Social Networks */}
          {step === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Social Networks</h3>
                  <p className="text-xs text-[#565e74] mt-0.5">Add your social media &amp; online presence</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'website', label: 'Website', prefix: 'https://', placeholder: 'yourwebsite.com', bg: '#e8f0fe', fg: '#1a73e8' },
                  { key: 'facebook', label: 'Facebook', prefix: 'https://facebook.com/', placeholder: 'facebook.com/yourpage', bg: '#e7f0ff', fg: '#1877F2' },
                  { key: 'instagram', label: 'Instagram', prefix: 'https://instagram.com/', placeholder: 'instagram.com/yourhandle', bg: '#fdeef1', fg: '#E1306C' },
                  { key: 'youtube', label: 'YouTube', prefix: 'https://youtube.com/@', placeholder: 'youtube.com/@yourchannel', bg: '#fdeaea', fg: '#FF0000' },
                  { key: 'linkedin', label: 'LinkedIn', prefix: 'https://linkedin.com/in/', placeholder: 'linkedin.com/in/yourpage', bg: '#e8f1fb', fg: '#0A66C2' },
                  { key: 'twitter', label: 'X (Twitter)', prefix: 'https://x.com/', placeholder: 'x.com/yourhandle', bg: '#eceeef', fg: '#000000' },
                  { key: 'whatsapp', label: 'WhatsApp', prefix: 'https://wa.me/91', placeholder: 'wa.me/919876543210', bg: '#e6f7ee', fg: '#25D366' },
                  { key: 'googleBusiness', label: 'Google Business', prefix: 'https://g.page/', placeholder: 'g.page/yourbusiness', bg: '#fdf3e8', fg: '#EA4335' },
                ].map((item) => {
                  const fieldKey = item.key as keyof CentreUpsert;
                  const fieldReg = register(fieldKey);
                  return (
                    <div key={item.key} className="space-y-1.5 p-3.5 bg-[#f8fafc] rounded-2xl border border-[#e0e3e5]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fg }} />
                        <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider">{item.label}</label>
                      </div>
                      <input
                        type="text"
                        placeholder={item.placeholder}
                        className="w-full bg-white border border-[#bdcaba] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#16a34a]"
                        {...fieldReg}
                        onFocus={(e) => {
                          if (!e.target.value) {
                            setValue(fieldKey, item.prefix as any, { shouldValidate: false });
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4 — Gallery (step === 3) */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-[24px] p-8 border border-[#e0e3e5] shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Gallery Photos</h3>
                  <p className="text-sm text-[#565e74] mt-1">Upload clear, high-resolution photos of your study hall.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {GALLERY_SLOTS.map((slot) => {
                  const existing = props.mode === 'edit' && props.photos ? props.photos.gallery.filter((g) => g.category === slot) : [];
                  const picked = galleryFiles[slot] ?? [];
                  const pickedUrls = picked.map((f) => URL.createObjectURL(f));
                  const existingUrls = existing.map((g) => g.url);
                  const allPreviews = [...pickedUrls, ...existingUrls];
                  const extraCount = Math.max(0, allPreviews.length - 2);

                  return (
                    <div key={slot} className="bg-white p-4 rounded-2xl border border-[#e0e3e5] shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-[#191c1e]">{slot}</p>
                          {allPreviews.length > 0 && (
                            <span className="text-[11px] font-bold text-[#16a34a] bg-[#dcfce7] px-2 py-0.5 rounded-full">
                              {allPreviews.length} photo{allPreviews.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <label
                          htmlFor={`gallery-v2-${slot}`}
                          className="relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#bdcaba] bg-[#f8fafc] hover:border-[#16a34a] transition-colors group"
                        >


                          {allPreviews.length === 1 && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={allPreviews[0]} alt={slot} className="absolute inset-0 h-full w-full object-cover" />
                          )}

                          {allPreviews.length >= 2 && (
                            <div className="absolute inset-0 grid grid-cols-2 gap-0.5 w-full h-full">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={allPreviews[0]} alt={`${slot} 1`} className="w-full h-full object-cover" />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={allPreviews[1]} alt={`${slot} 2`} className="w-full h-full object-cover" />
                            </div>
                          )}

                          <span className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity z-10" aria-hidden />
                          <span className="relative z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-sm text-xs font-semibold text-[#16a34a]">
                            <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 8a2 2 0 0 1 2-2h1.2l.8-1.5A1 1 0 0 1 8.9 4h6.2a1 1 0 0 1 .9.55L16.8 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
                              <circle cx="12" cy="13" r="3.2" />
                            </svg>
                            {allPreviews.length > 0 ? 'Add More' : 'Upload'}
                          </span>
                          {extraCount > 0 && (
                            <span className="absolute right-2 top-2 z-20 rounded-full bg-[#16a34a] px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">+{extraCount} more</span>
                          )}
                        </label>
                        <input
                          id={`gallery-v2-${slot}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          multiple
                          onChange={onGalleryChange(slot)}
                          className="sr-only"
                        />
                      </div>

                      <div className="mt-3 space-y-2">
                        {picked.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-[#16a34a] mb-1.5 flex items-center gap-1">
                              ✓ {picked.length} new photo{picked.length > 1 ? 's' : ''} selected:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {picked.map((file, pIdx) => {
                                const url = pickedUrls[pIdx];
                                return (
                                  <div key={pIdx} className="relative h-12 w-12 rounded-lg overflow-hidden border border-[#bdcaba] group shrink-0 shadow-2xs">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={file.name} className="h-full w-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removePickedFile(slot, pIdx);
                                      }}
                                      className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold transition-colors z-20 cursor-pointer"
                                      title="Remove photo"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {existing.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-[#565e74] mb-1">Saved photos:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {existing.map((g) => (
                                <div key={g.id} className="relative h-12 w-12 rounded-lg overflow-hidden border border-[#bdcaba] shrink-0 shadow-2xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={g.url} alt="" className="h-full w-full rounded object-cover" />
                                  <DeletePhotoButton imageId={g.id} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!picked.length && !existing.length && <p className="text-[11px] text-[#8e99a8]">No file chosen</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-3">
                <div>
                  <label htmlFor="extra-photos-v2" className="block text-sm font-bold text-[#191c1e]">Additional Photos</label>
                  <p className="text-xs text-[#565e74] mt-0.5">Select several at once for anything beyond the categories above.</p>
                </div>
                {props.mode === 'edit' && props.photos && props.photos.gallery.filter((g) => !g.category || !GALLERY_SLOTS.includes(g.category)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {props.photos.gallery.filter((g) => !g.category || !GALLERY_SLOTS.includes(g.category)).map((g) => (
                      <div key={g.id} className="relative h-14 w-14">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt="" className="h-full w-full rounded object-cover" />
                        <DeletePhotoButton imageId={g.id} />
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id="extra-photos-v2"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={onExtraChange}
                  className="block w-full text-xs text-[#565e74] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#16a34a]/10 file:text-[#16a34a] hover:file:bg-[#16a34a]/20 cursor-pointer"
                />

                {extraFiles.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-semibold text-[#16a34a] flex items-center gap-1">
                      ✓ {extraFiles.length} additional photo{extraFiles.length > 1 ? 's' : ''} selected:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {extraFiles.map((file, idx) => {
                        const url = URL.createObjectURL(file);
                        return (
                          <div key={idx} className="relative h-16 w-16 rounded-xl overflow-hidden border border-[#bdcaba] group shrink-0 shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={file.name} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExtraFiles((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-1 right-1 bg-black/75 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold transition-colors z-20 cursor-pointer shadow-xs"
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#8e99a8]">No file chosen</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 5 — Review & Publish (step === 4) */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-[#16a34a] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold font-['Lexend',sans-serif]">Review Your Listing Details</h3>
                  <p className="text-xs text-white/90 mt-1">Check everything below before publishing. You can jump back to edit any section.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-xs">
                    Ready to Publish
                  </span>
                </div>
              </div>

              {/* Grid 1: Basic Info & Address/Contact */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <h4 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">Basic Details</h4>
                    <button type="button" onClick={() => goto(0)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Profile</button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-[#565e74] block">Centre Name</span>
                      <span className="font-bold text-[#191c1e]">{values.name || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#565e74] block">About</span>
                      <p className="text-xs text-[#191c1e] bg-[#f8fafc] p-3 rounded-xl border border-[#e0e3e5] mt-1">{values.about || 'No description added.'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact & Location */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <h4 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">Address & Contact</h4>
                    <button type="button" onClick={() => goto(0)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Address/Contact</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-[#565e74] block">Mobile Number</span>
                      <span className="font-bold text-[#191c1e]">{values.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#565e74] block">Alternate Number</span>
                      <span className="font-bold text-[#191c1e]">{values.altPhone || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#565e74] block">Email Address</span>
                      <span className="font-bold text-[#191c1e]">{values.businessEmail || '-'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#565e74] block">Postcode / City</span>
                      <span className="font-bold text-[#191c1e]">{values.postcode ? `${values.postcode} (${values.city || ''}, ${values.state || ''})` : '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-[#565e74] block">Full Address</span>
                      <span className="font-bold text-[#191c1e]">{values.address || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Pricing & Operating Hours */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pricing Overview */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <h4 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">Pricing Plans</h4>
                    <button type="button" onClick={() => goto(1)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Pricing</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Hourly', val: values.priceHourly },
                      { label: 'Daily', val: values.priceDaily },
                      { label: 'Weekly', val: values.priceWeekly },
                      { label: 'Fortnightly', val: values.priceFortnightly },
                      { label: 'Monthly', val: values.priceMonthly },
                      { label: 'Quarterly', val: values.priceQuarterly },
                      { label: 'Half-Yearly', val: values.priceHalfYearly },
                      { label: 'Yearly', val: values.priceYearly },
                    ].map((p) => (
                      <div key={p.label} className="p-2.5 bg-[#f8faf8] rounded-xl border border-[#e0e3e5] flex justify-between items-center">
                        <span className="text-[#565e74] font-medium">{p.label}:</span>
                        <span className="font-bold text-[#16a34a]">{p.val ? `₹${p.val}` : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Space & Amenities */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <h4 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">Space & Amenities</h4>
                    <button type="button" onClick={() => goto(1)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Details</button>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#565e74]">Space Type:</span>
                      <span className="font-bold text-[#191c1e] capitalize">{values.spaceType ? values.spaceType.replace('_', ' ') : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#565e74]">Seating Capacity:</span>
                      <span className="font-bold text-[#16a34a]">{values.seats} seats</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#565e74]">Women-Safe Access:</span>
                      <span className="font-bold text-[#191c1e]">{values.womenSafeClaim ? 'Yes ✅' : 'No'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#565e74] block mb-1.5">Selected Facilities:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {values.amenityIds && values.amenityIds.length > 0 ? (
                          props.amenities.filter((a) => values.amenityIds.includes(a.id)).map((a) => (
                            <span key={a.id} className="bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/20 text-[11px] font-bold px-2.5 py-1 rounded-full">
                              ✓ {a.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#8e99a8]">No amenities selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Networks & Photos summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Social Presence */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <h4 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">Social Presence</h4>
                    <button type="button" onClick={() => goto(2)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Social</button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Website', val: values.website },
                      { label: 'Facebook', val: values.facebook },
                      { label: 'Instagram', val: values.instagram },
                      { label: 'YouTube', val: values.youtube },
                      { label: 'LinkedIn', val: values.linkedin },
                      { label: 'X (Twitter)', val: values.twitter },
                      { label: 'WhatsApp', val: values.whatsapp },
                      { label: 'Google Business', val: values.googleBusiness },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between items-center py-1 border-b border-[#f8fafc]">
                        <span className="text-[#565e74] font-medium">{s.label}:</span>
                        <span className="font-bold text-[#191c1e] truncate max-w-[200px]">{s.val || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Uploaded Photos summary */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <h4 className="text-sm font-bold text-[#191c1e] uppercase tracking-wider">Photos Summary</h4>
                    <button type="button" onClick={() => goto(3)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Gallery</button>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#565e74]">Business Logo:</span>
                      <span className="font-bold text-[#16a34a]">{logoFile ? `✓ Selected (${logoFile.name})` : props.photos?.logoUrl ? '✓ Saved' : 'Not uploaded'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#565e74]">Cover Image:</span>
                      <span className="font-bold text-[#16a34a]">{coverFile ? `✓ Selected (${coverFile.name})` : props.photos?.coverUrl ? '✓ Saved' : 'Not uploaded'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#565e74] block mb-1">Gallery Categories Picked:</span>
                      <div className="space-y-1">
                        {Object.entries(galleryFiles).map(([slot, files]) => (
                          <div key={slot} className="flex justify-between text-[#191c1e]">
                            <span>{slot}:</span>
                            <span className="font-bold">{files.length} photo{files.length > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                        {extraFiles.length > 0 && (
                          <div className="flex justify-between text-[#191c1e]">
                            <span>Additional Photos:</span>
                            <span className="font-bold">{extraFiles.length} photo{extraFiles.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {!Object.keys(galleryFiles).length && !extraFiles.length && (
                          <span className="text-[#8e99a8]">No gallery photos selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pt-6 border-t border-[#e0e3e5]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (step > 0) {
                  setStep(step - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              disabled={step === 0}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            >
              Previous
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => goto(step + 1)}
                className="bg-[#16a34a] hover:bg-[#16a34a]/90 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-md"
              >
                Next Step →
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => { submitIntent.current = 'publish'; handleSubmit(doSubmit)(); }}
                className="bg-[#16a34a] hover:bg-[#16a34a]/90 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-md"
              >
                Publish Listing
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
