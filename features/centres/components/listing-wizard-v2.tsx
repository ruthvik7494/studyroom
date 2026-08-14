'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { centreUpsertSchema, withHttps, type CentreUpsert } from '../schema';
import { createCentre, updateCentre, uploadCentreImage, uploadCentreLogo, submitForReview, removeCentreLogo, removeCentreCover } from '../actions';
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
  targetRedirectUrl?: string;
  photos?: { logoUrl: string | null; coverUrl: string | null; coverImageId: string | null; gallery: { id: string; url: string; category: string | null }[] };
}

export function ListingWizardV2(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxUnlocked, setMaxUnlocked] = useState(props.mode === 'edit' ? 6 : 0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'uploading' | 'published'>('idle');

  const [pinLoading, setPinLoading] = useState(false);
  const [amenityStyle, setAmenityStyle] = useState<'horizontal' | 'chips' | 'pills' | 'cards'>('horizontal');
  const [customTagInput, setCustomTagInput] = useState('');
  const [allCustomTags, setAllCustomTags] = useState<string[]>(props.defaults?.tags || []);
  const [extraSpaces, setExtraSpaces] = useState<Array<{ id: string; name: string; seats: string; prices: Record<string, string>; tags: string[] }>>((props.defaults?.extraSpaces as any) || []);
  const [copyHoursSourceDay, setCopyHoursSourceDay] = useState<number | null>(null);
  const [copyHoursTargets, setCopyHoursTargets] = useState<number[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<Record<string, File[]>>({});
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const submitIntent = useRef<'draft' | 'publish'>('draft');
  const isSilentAutoSave = useRef(false);

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

  const removeExtraFile = (indexToRemove: number) => {
    setExtraFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
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

  const [draftSaveSuccess, setDraftSaveSuccess] = useState<string | null>(null);

  const [createdCentreId, setCreatedCentreId] = useState<string | null>(props.centreId || null);

  const doSubmit = async (formValues: CentreUpsert) => {
    setServerError(null);
    setPhase('saving');
    try {
      const payload = { ...formValues, extraSpaces };
      const currentCentreId = createdCentreId || props.centreId;
      const res = props.mode === 'create' && !currentCentreId
        ? await createCentre(payload)
        : await updateCentre({ ...payload, centreId: currentCentreId! });
      if (!res.ok) { setServerError(res.error.message); setPhase('idle'); return; }

      const centreId = (props.mode === 'create' && !currentCentreId && 'id' in res.data) ? res.data.id : currentCentreId!;
      if (props.mode === 'create' && !createdCentreId && centreId) {
        setCreatedCentreId(centreId);
      }
      if (centreId) {
        setPhase('uploading');
        if (logoRemoved) await removeCentreLogo({ centreId });
        else if (logoFile) {
          const fd = new FormData();
          fd.set('centreId', centreId);
          fd.set('file', logoFile);
          await uploadCentreLogo(fd);
          setLogoFile(null);
        }

        if (coverRemoved) await removeCentreCover({ centreId });
        else if (coverFile) {
          const err = await uploadOne(centreId, coverFile, { isCover: true });
          if (!err) {
            setCoverFile(null);
            setCoverRemoved(false);
          }
        }

        const allGalleryFiles = [
          ...Object.entries(galleryFiles).flatMap(([slot, files]) => files.map((file) => ({ slot, file }))),
          ...extraFiles.map((file) => ({ slot: undefined as string | undefined, file })),
        ];

        for (const { slot, file } of allGalleryFiles) {
          await uploadOne(centreId, file, slot ? { category: slot } : {});
        }
        setGalleryFiles({});
        setExtraFiles([]);

        if (submitIntent.current === 'publish') {
          await submitForReview(centreId);
          setPhase('published');
          await new Promise((resolve) => setTimeout(resolve, 600));
          router.push(props.targetRedirectUrl || '/admin/centres/all');
          router.refresh();
          return;
        }
      }

      setPhase('idle');
      if (!isSilentAutoSave.current) {
        setDraftSaveSuccess('Draft saved successfully! All your progress has been stored.');
        router.refresh();
        setTimeout(() => setDraftSaveSuccess(null), 3000);
      }
      isSilentAutoSave.current = false;
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
      setPhase('idle');
      isSilentAutoSave.current = false;
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

    // Auto-save progress silently in backend on every step navigation
    submitIntent.current = 'draft';
    isSilentAutoSave.current = true;
    handleSubmit(doSubmit)();

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
            variant="outline"
            size="sm"
            disabled={phase !== 'idle'}
            onClick={() => { submitIntent.current = 'draft'; handleSubmit(doSubmit)(); }}
            className="text-xs font-semibold border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white rounded-xl cursor-pointer"
          >
            {phase === 'saving' ? 'Saving Draft...' : phase === 'uploading' ? 'Uploading Media...' : '💾 Save Draft'}
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


        {draftSaveSuccess && (
          <div className="mb-6 bg-[#dcfce7] text-[#15803d] p-4 rounded-xl text-sm font-semibold border border-[#86efac] flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-2">
            <span>✓</span>
            <span>{draftSaveSuccess}</span>
          </div>
        )}

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
                      rows={6}
                      placeholder="A brief overview of your space..."
                      className="w-full bg-[#f2f4f6] border border-[#bdcaba] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#16a34a] resize-y"
                      {...register('about')}
                    />
                    {errors.about && <p className="text-xs text-[#ba1a1a] mt-1">{errors.about.message}</p>}

                    {/* 5 Sample Description Suggestions */}
                    <div className="mt-3 space-y-2">
                      <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider block">
                        💡 Click a sample to auto-fill description:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          "Welcome to our premier study space designed for serious aspirants and professionals. We offer a 100% disturbance-free, fully air-conditioned environment equipped with ultra-fast fiber Wi-Fi, ergonomic executive seating, dedicated power sockets at every desk, and personal storage lockers. With 24/7 CCTV security, purified RO drinking water, clean washrooms, and a calm atmosphere, our center provides the ideal focus zone to maximize your daily productivity.",
                          "Our modern reading room is thoughtfully built to deliver an unmatched learning experience. Featuring spacious individual cubicles with anti-glare study lamps, full power backup, high-speed internet, and dedicated silent zones, students can study without any interruption. We also provide tea and coffee facilities, two-wheeler parking, and round-the-clock access so you can prepare comfortably for your exams.",
                          "Designed specifically for competitive exam preparation (UPSC, NEET, JEE, CA, Banking), our study hub combines peaceful ambient lighting with top-tier ergonomic setup. Every student gets a personal study desk with power outlets, high-speed Wi-Fi, reference book library access, and secure locker storage. Experience a disciplined community of like-minded learners committed to achieving excellence.",
                          "Enjoy a quiet, safe, and motivating study hall experience located right in your neighborhood. Our space features fully climatized interiors, ergonomic mesh chairs designed for long sitting hours, uninterrupted Wi-Fi, and individual charging points. Verified women-safe facilities, biometric access control, and dedicated washrooms ensure total peace of mind while you study.",
                          "Boost your study routine in a premium, quiet workspace engineered for deep concentration. We provide high-speed fiber connection, comfortable cushioned desks with personal lighting, RO water dispensers, and clean break areas. Operating 24x7 with strict noise control rules and security surveillance, our facility guarantees a productive, stress-free study session every day."
                        ].map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setValue('about', sample, { shouldValidate: true })}
                            className="bg-[#f8faf8] hover:bg-[#16a34a] hover:text-white hover:border-[#16a34a] border border-[#bdcaba] rounded-lg px-3.5 py-1.5 text-xs font-bold text-[#16a34a] transition-all cursor-pointer shadow-2xs select-none"
                          >
                            Sample {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
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
                  {/* Business Logo Preview */}
                  <div className="col-span-12 md:col-span-6">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#565e74]">
                        Business Logo <span className="text-[#ba1a1a]">*</span>
                      </label>
                      {(logoFile || (!logoRemoved && props.photos?.logoUrl)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoRemoved(true);
                          }}
                          className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          🗑️ Remove Logo
                        </button>
                      )}
                    </div>
                    <label className="h-[120px] w-full bg-[#f2f4f6] rounded-xl border border-[#bdcaba] hover:border-slate-400 transition-colors flex flex-col items-center justify-center cursor-pointer p-2 text-center relative overflow-hidden group">
                      {logoFile ? (
                        <img
                          src={URL.createObjectURL(logoFile)}
                          alt="Logo Preview"
                          className="absolute inset-0 w-full h-full object-contain p-2 bg-white"
                        />
                      ) : (!logoRemoved && props.photos?.logoUrl) ? (
                        <img
                          src={props.photos.logoUrl}
                          alt="Saved Logo"
                          className="absolute inset-0 w-full h-full object-contain p-2 bg-white"
                        />
                      ) : (
                        <>
                          <span className="text-xl mb-0.5">📷</span>
                          <span className="text-xs font-bold text-slate-700">Upload Logo</span>
                          <span className="text-[10px] text-[#565e74] mt-0.5">PNG, JPG, WebP — Max 5MB</span>
                        </>
                      )}
                      {(logoFile || (!logoRemoved && props.photos?.logoUrl)) && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1">
                          <span>🔄 Change Logo</span>
                          <span className="text-[10px] font-normal">{logoFile ? logoFile.name : 'Saved Image'}</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setLogoFile(e.target.files[0]);
                            setLogoRemoved(false);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Cover Image Preview */}
                  <div className="col-span-12 md:col-span-6">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#565e74]">
                        Cover Image <span className="text-[#ba1a1a]">*</span>
                      </label>
                      {(coverFile || (!coverRemoved && props.photos?.coverUrl)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCoverFile(null);
                            setCoverRemoved(true);
                          }}
                          className="text-xs font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          🗑️ Remove Cover
                        </button>
                      )}
                    </div>
                    <label className="h-[120px] w-full bg-[#f2f4f6] rounded-xl border border-[#bdcaba] hover:border-slate-400 transition-colors flex flex-col items-center justify-center cursor-pointer p-2 text-center relative overflow-hidden group">
                      {coverFile ? (
                        <img
                          src={URL.createObjectURL(coverFile)}
                          alt="Cover Preview"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (!coverRemoved && props.photos?.coverUrl) ? (
                        <img
                          src={props.photos.coverUrl}
                          alt="Saved Cover"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <span className="text-2xl mb-1">🖼️</span>
                          <span className="text-xs font-bold text-[#16a34a]">Upload Cover Image</span>
                          <span className="text-[10px] text-[#565e74] mt-1">1920x1080 recommended</span>
                        </>
                      )}
                      {(coverFile || (!coverRemoved && props.photos?.coverUrl)) && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1">
                          <span>🔄 Change Cover</span>
                          <span className="text-[10px] font-normal">{coverFile ? coverFile.name : 'Saved Image'}</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setCoverFile(e.target.files[0]);
                            setCoverRemoved(false);
                          }
                        }}
                      />
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

          {/* STEP 2 — Hours, Facilities & Dynamic Spaces */}
          {step === 1 && (
            <div className="space-y-8">
              {/* Row 1: Side-by-Side Operating Hours & Facilities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left Side: Operating Hours */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f2f4f6] pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Operating Hours</h3>
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
                        ⚡ All Days 06:00 - 22:00
                      </Button>
                    </div>

                    <div className="space-y-3 py-4">
                      {DAY_ORDER.map((dayIdx) => {
                        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx] ?? 'Sunday';
                        const dayShort = dayName.charAt(0);
                        const isOpen = values.hours?.[dayIdx]?.isOpen ?? true;

                        return (
                          <div key={dayIdx} className="flex items-center gap-3">
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
                                <button
                                  type="button"
                                  onClick={() => setValue(`hours.${dayIdx}.isOpen`, false)}
                                  title="Mark Unavailable"
                                  className="p-1.5 text-[#94a3b8] hover:text-[#ef4444] rounded-md transition-colors cursor-pointer"
                                >
                                  ✕
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
                </div>

                {/* Right Side: Facilities & Amenities + Women Safe */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="border-b border-[#f2f4f6] pb-3">
                      <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Facilities &amp; Amenities</h3>
                      <p className="text-xs text-[#565e74] mt-0.5">Select all facilities provided across your centre.</p>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {props.amenities.map((a) => {
                        const checked = values.amenityIds?.includes(a.id);
                        return (
                          <label
                            key={a.id}
                            className={cn(
                              "cursor-pointer px-4 py-2 rounded-full text-xs font-semibold border transition-all select-none flex items-center gap-2",
                              checked
                                ? "bg-[#16a34a] text-white border-[#16a34a] shadow-xs"
                                : "bg-[#f2f4f6] text-[#565e74] border-[#bdcaba] hover:bg-[#e6e8ea]"
                            )}
                          >
                            <input type="checkbox" value={a.id} className="sr-only" {...register('amenityIds')} />
                            <span>{checked ? `✓ ${a.label}` : `+ ${a.label}`}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-4 border-t border-[#f2f4f6]">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#191c1e] select-none hover:text-[#16a34a] transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-[#16a34a] rounded cursor-pointer"
                          {...register('womenSafeClaim')}
                        />
                        <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
                        <span>This centre has verified women-safe facilities</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Space Details (Simple Clean Row Layout with Prices & Tags) */}
              <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f2f4f6] pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#191c1e] font-['Lexend',sans-serif]">Space Details</h3>
                    <p className="text-xs text-[#565e74] mt-0.5">Specify room details, seat capacity, pricing rates, and facility tags.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setExtraSpaces((prev) => [
                        ...prev,
                        { id: Date.now().toString(), name: 'AC Room', seats: '', prices: {}, tags: ['AC', 'Library'] },
                      ]);
                    }}
                    className="bg-[#16a34a] hover:bg-[#16a34a]/90 text-white rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-xs"
                  >
                    + Add New Space
                  </Button>
                </div>

                {/* Primary Space Row */}
                <div className="space-y-4 border-b border-[#f2f4f6] pb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#16a34a] uppercase tracking-wider">Primary Space</span>
                  </div>

                  {/* Row 1: Room Name & Seats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#565e74] mb-1">Room Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Special AC Rooms"
                        className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#16a34a]"
                        {...register('roomName')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#565e74] mb-1">Seats</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="e.g. 43"
                        className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#16a34a]"
                        {...register('seats')}
                      />
                    </div>
                  </div>

                  {/* Row 2: All 7 Pricing Rates in 1 Single Row */}
                  <div>
                    <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">Pricing Rates</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Hourly</label>
                        <input
                          type="number"
                          placeholder="₹"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                          {...register('priceHourly')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Daily</label>
                        <input
                          type="number"
                          placeholder="₹"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                          {...register('priceDaily')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Weekly</label>
                        <input
                          type="number"
                          placeholder="₹"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                          {...register('priceWeekly')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Monthly</label>
                        <input
                          type="number"
                          placeholder="₹"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                          {...register('priceMonthly')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Quarterly</label>
                        <input
                          type="number"
                          placeholder="₹"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                          {...register('priceQuarterly')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Half Yearly</label>
                        <input
                          type="number"
                          placeholder="₹"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                          {...register('priceHalfYearly')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Yearly</label>
                        <input
                          type="number"
                          placeholder="₹"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                          {...register('priceYearly')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Facility Tags (Single line inline with title) */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-xs font-bold text-[#565e74] shrink-0">Facility Tags:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {Array.from(new Set(['AC', 'Library', 'Power Outlet', 'Ergo Seating', 'Silent Zone', 'CCTV', ...allCustomTags])).map((tag) => {
                        const isChecked = values.tags?.includes(tag);
                        const isBuiltin = ['AC', 'Library', 'Power Outlet', 'Ergo Seating', 'Silent Zone', 'CCTV'].includes(tag);

                        return (
                          <div
                            key={tag}
                            className={cn(
                              "inline-flex items-center rounded-full text-xs font-semibold border transition-all select-none overflow-hidden",
                              isChecked
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const list = values.tags || [];
                                if (isChecked) {
                                  setValue('tags', list.filter((t) => t !== tag));
                                } else {
                                  setValue('tags', [...list, tag]);
                                }
                              }}
                              className="px-3 py-1 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isChecked ? `✓ ${tag}` : `+ ${tag}`}</span>
                            </button>

                            {/* Delete Cross (Only for Custom Tags) */}
                            {!isBuiltin && (
                              <button
                                type="button"
                                title={`Delete "${tag}" tag`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Delete from form selection
                                  setValue('tags', (values.tags || []).filter((t) => t !== tag));
                                  // Delete from custom tag list
                                  setAllCustomTags((prev) => prev.filter((t) => t !== tag));
                                }}
                                className={cn(
                                  "px-2.5 py-1 hover:text-red-400 font-bold transition-colors cursor-pointer text-[11px] flex items-center justify-center border-l",
                                  isChecked ? "text-slate-300 border-slate-700 hover:bg-slate-800" : "text-slate-400 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Custom User Tag Input */}
                      <div className="flex items-center gap-1.5 ml-1">
                        <input
                          type="text"
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (customTagInput.trim()) {
                                const newTag = customTagInput.trim();
                                if (!allCustomTags.includes(newTag)) {
                                  setAllCustomTags((prev) => [...prev, newTag]);
                                }
                                const list = values.tags || [];
                                if (!list.includes(newTag)) {
                                  setValue('tags', [...list, newTag]);
                                }
                                setCustomTagInput('');
                              }
                            }
                          }}
                          placeholder="+ Add custom tag..."
                          className="bg-[#f8faf8] border border-[#bdcaba] rounded-full px-3 py-1 text-xs focus:outline-none focus:border-[#16a34a] w-36"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customTagInput.trim()) {
                              const newTag = customTagInput.trim();
                              if (!allCustomTags.includes(newTag)) {
                                setAllCustomTags((prev) => [...prev, newTag]);
                              }
                              const list = values.tags || [];
                              if (!list.includes(newTag)) {
                                setValue('tags', [...list, newTag]);
                              }
                              setCustomTagInput('');
                            }
                          }}
                          className="text-xs font-bold text-[#16a34a] hover:underline px-1 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamically Added Additional Spaces */}
                {extraSpaces.map((space, idx) => (
                  <div key={space.id} className="space-y-4 border-b border-[#f2f4f6] pb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Space {idx + 2}</span>
                      <button
                        type="button"
                        onClick={() => setExtraSpaces((prev) => prev.filter((s) => s.id !== space.id))}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        ✕ Remove Space
                      </button>
                    </div>

                    {/* Row 1: Room Name & Seats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Room Name</label>
                        <input
                          type="text"
                          value={space.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExtraSpaces((prev) => prev.map((s) => (s.id === space.id ? { ...s, name: val } : s)));
                          }}
                          placeholder="e.g. Non-AC Hall"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#16a34a]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#565e74] mb-1">Seats</label>
                        <input
                          type="number"
                          min={1}
                          value={space.seats}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExtraSpaces((prev) => prev.map((s) => (s.id === space.id ? { ...s, seats: val } : s)));
                          }}
                          placeholder="e.g. 20"
                          className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#16a34a]"
                        />
                      </div>
                    </div>

                    {/* Row 2: All 7 Price Rates */}
                    <div>
                      <label className="block text-xs font-bold text-[#191c1e] uppercase tracking-wider mb-2">Pricing Rates</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                        {[
                          { key: 'priceHourly', label: 'Hourly' },
                          { key: 'priceDaily', label: 'Daily' },
                          { key: 'priceWeekly', label: 'Weekly' },
                          { key: 'priceMonthly', label: 'Monthly' },
                          { key: 'priceQuarterly', label: 'Quarterly' },
                          { key: 'priceHalfYearly', label: 'Half Yearly' },
                          { key: 'priceYearly', label: 'Yearly' },
                        ].map((period) => (
                          <div key={period.key}>
                            <label className="block text-xs font-semibold text-[#565e74] mb-1">{period.label}</label>
                            <input
                              type="number"
                              placeholder="₹"
                              value={space.prices[period.key] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setExtraSpaces((prev) =>
                                  prev.map((s) =>
                                    s.id === space.id
                                      ? { ...s, prices: { ...s.prices, [period.key]: val } }
                                      : s
                                  )
                                );
                              }}
                              className="w-full bg-[#f8faf8] border border-[#bdcaba] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#16a34a]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Facility Tags (Single line inline with title) */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <span className="text-xs font-bold text-[#565e74] shrink-0">Facility Tags:</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {Array.from(new Set(['AC', 'Library', 'Power Outlet', 'Ergo Seating', 'Silent Zone', 'CCTV', ...allCustomTags])).map((tag) => {
                          const isChecked = space.tags?.includes(tag);
                          const isBuiltin = ['AC', 'Library', 'Power Outlet', 'Ergo Seating', 'Silent Zone', 'CCTV'].includes(tag);

                          return (
                            <div
                              key={tag}
                              className={cn(
                                "inline-flex items-center rounded-full text-xs font-semibold border transition-all select-none overflow-hidden",
                                isChecked
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setExtraSpaces((prev) =>
                                    prev.map((s) => {
                                      if (s.id !== space.id) return s;
                                      const currentTags = s.tags || [];
                                      const nextTags = isChecked
                                        ? currentTags.filter((t) => t !== tag)
                                        : [...currentTags, tag];
                                      return { ...s, tags: nextTags };
                                    })
                                  );
                                }}
                                className="px-3 py-1 flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isChecked ? `✓ ${tag}` : `+ ${tag}`}</span>
                              </button>

                              {/* Delete Cross (Only for Custom Tags) */}
                              {!isBuiltin && (
                                <button
                                  type="button"
                                  title={`Delete "${tag}" tag`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExtraSpaces((prev) =>
                                      prev.map((s) => ({
                                        ...s,
                                        tags: (s.tags || []).filter((t) => t !== tag),
                                      }))
                                    );
                                    setValue('tags', (values.tags || []).filter((t) => t !== tag));
                                    setAllCustomTags((prev) => prev.filter((t) => t !== tag));
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 hover:text-red-400 font-bold transition-colors cursor-pointer text-[11px] flex items-center justify-center border-l",
                                    isChecked ? "text-slate-300 border-slate-700 hover:bg-slate-800" : "text-slate-400 border-slate-200 hover:bg-slate-100"
                                  )}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Custom User Tag Input for Extra Space */}
                        <div className="flex items-center gap-1.5 ml-1">
                          <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customTagInput.trim()) {
                                  const newTag = customTagInput.trim();
                                  if (!allCustomTags.includes(newTag)) {
                                    setAllCustomTags((prev) => [...prev, newTag]);
                                  }
                                  setExtraSpaces((prev) =>
                                    prev.map((s) => {
                                      if (s.id !== space.id) return s;
                                      const currentTags = s.tags || [];
                                      return currentTags.includes(newTag) ? s : { ...s, tags: [...currentTags, newTag] };
                                    })
                                  );
                                  setCustomTagInput('');
                                }
                              }
                            }}
                            placeholder="+ Add custom tag..."
                            className="bg-[#f8faf8] border border-[#bdcaba] rounded-full px-3 py-1 text-xs focus:outline-none focus:border-[#16a34a] w-36"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customTagInput.trim()) {
                                const newTag = customTagInput.trim();
                                if (!allCustomTags.includes(newTag)) {
                                  setAllCustomTags((prev) => [...prev, newTag]);
                                }
                                setExtraSpaces((prev) =>
                                  prev.map((s) => {
                                    if (s.id !== space.id) return s;
                                    const currentTags = s.tags || [];
                                    return currentTags.includes(newTag) ? s : { ...s, tags: [...currentTags, newTag] };
                                  })
                                );
                                setCustomTagInput('');
                              }
                            }}
                            className="text-xs font-bold text-[#16a34a] hover:underline px-1 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {GALLERY_SLOTS.map((slot) => {
                  const existing = props.mode === 'edit' && props.photos
                    ? props.photos.gallery.filter((g) => {
                        if (!g.category || g.category === 'gallery') {
                          return slot === 'Reading Hall' || slot === 'Other Facilities';
                        }
                        const catLower = g.category.trim().toLowerCase();
                        const slotLower = slot.trim().toLowerCase();
                        return catLower === slotLower || catLower.includes(slotLower) || slotLower.includes(catLower);
                      })
                    : [];
                  const picked = galleryFiles[slot] ?? [];
                  const pickedUrls = picked.map((f) => URL.createObjectURL(f));
                  const existingUrls = existing.map((g) => g.url);
                  const allPreviews = [...pickedUrls, ...existingUrls];
                  const extraCount = Math.max(0, allPreviews.length - 2);

                  return (
                    <div key={slot} className="bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-xs flex flex-col justify-between">
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
                          className="relative flex h-[110px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-[#bdcaba] bg-[#f8fafc] hover:border-slate-400 transition-colors group"
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

                      <div className="mt-4 space-y-3">
                        {picked.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-[#16a34a] mb-2 flex items-center gap-1">
                              ✓ {picked.length} new photo{picked.length > 1 ? 's' : ''} selected:
                            </p>
                            <div className="flex flex-nowrap overflow-x-auto pb-2 gap-3 scrollbar-thin">
                              {picked.map((file, pIdx) => {
                                const url = pickedUrls[pIdx];
                                return (
                                  <div
                                    key={pIdx}
                                    onClick={() => url && setPreviewModalUrl(url)}
                                    className="relative h-28 w-28 md:h-32 md:w-32 border border-[#bdcaba] group shrink-0 shadow-sm cursor-pointer overflow-hidden bg-slate-900"
                                    title="Click to view full size"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={file.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                      🔍 View
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removePickedFile(slot, pIdx);
                                      }}
                                      className="absolute top-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors cursor-pointer"
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
                            <p className="text-xs font-semibold text-[#565e74] mb-2">Saved photos (Click to view big):</p>
                            <div className="flex flex-nowrap overflow-x-auto pb-2 gap-3 scrollbar-thin">
                              {existing.map((g) => (
                                <div
                                  key={g.id}
                                  onClick={() => setPreviewModalUrl(g.url)}
                                  className="relative h-28 w-28 md:h-32 md:w-32 border border-[#bdcaba] shrink-0 shadow-sm cursor-pointer overflow-hidden group bg-slate-900"
                                  title="Click to view full size"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={g.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                                    🔍 View
                                  </div>
                                  <DeletePhotoButton imageId={g.id} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!picked.length && !existing.length && <p className="text-xs text-[#8e99a8] italic">No photos in this category yet</p>}
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
                  <div className="flex flex-wrap gap-3">
                    {props.photos.gallery.filter((g) => !g.category || !GALLERY_SLOTS.includes(g.category)).map((g) => (
                      <div
                        key={g.id}
                        onClick={() => setPreviewModalUrl(g.url)}
                        className="relative h-28 w-28 md:h-32 md:w-32 border border-[#bdcaba] shrink-0 shadow-sm cursor-pointer overflow-hidden group bg-slate-900"
                        title="Click to view full size"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                          🔍 View
                        </div>
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

                {extraFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-[#16a34a] flex items-center gap-1">
                      ✓ {extraFiles.length} additional photo{extraFiles.length > 1 ? 's' : ''} selected:
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {extraFiles.map((file, idx) => {
                        const url = URL.createObjectURL(file);
                        return (
                          <div
                            key={idx}
                            onClick={() => setPreviewModalUrl(url)}
                            className="relative h-28 w-28 md:h-32 md:w-32 border border-[#bdcaba] group shrink-0 shadow-sm cursor-pointer overflow-hidden bg-slate-900"
                            title="Click to view full size"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={file.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                              🔍 View
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeExtraFile(idx);
                              }}
                              className="absolute top-1.5 right-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors cursor-pointer"
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

              {/* Grid 2: Spaces, Pricing & Facility Tags */}
              <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                  <div>
                    <h4 className="text-base font-bold text-[#191c1e] font-['Lexend',sans-serif]">Spaces, Pricing & Tags</h4>
                    <p className="text-xs text-[#565e74] mt-0.5">Review all configured study rooms, seating, rates, and facility tags.</p>
                  </div>
                  <button type="button" onClick={() => goto(1)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Spaces</button>
                </div>

                {/* Primary Space Details */}
                <div className="bg-[#f8faf8] p-5 rounded-2xl border border-[#e0e3e5] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#16a34a] uppercase tracking-wider">Primary Space</span>
                    <span className="text-xs font-bold bg-[#16a34a]/10 text-[#16a34a] px-3 py-1 rounded-full">
                      {values.seats} Seats
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="font-semibold text-[#565e74] block">Room Name:</span>
                    <span className="font-bold text-[#191c1e] text-sm">{values.roomName || 'Primary Study Hall'}</span>
                  </div>

                  {/* Primary Pricing Rates */}
                  <div>
                    <span className="text-xs font-bold text-[#565e74] block mb-2">Pricing Rates:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
                      {[
                        { label: 'Hourly', val: values.priceHourly },
                        { label: 'Daily', val: values.priceDaily },
                        { label: 'Weekly', val: values.priceWeekly },
                        { label: 'Monthly', val: values.priceMonthly },
                        { label: 'Quarterly', val: values.priceQuarterly },
                        { label: 'Half-Yearly', val: values.priceHalfYearly },
                        { label: 'Yearly', val: values.priceYearly },
                      ].map((p) => (
                        <div key={p.label} className="p-2 bg-white rounded-xl border border-[#e0e3e5] text-center">
                          <span className="text-[#565e74] text-[11px] block">{p.label}</span>
                          <span className="font-bold text-[#16a34a]">{p.val ? `₹${p.val}` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primary Space Facility Tags */}
                  <div>
                    <span className="text-xs font-bold text-[#565e74] block mb-1.5">Facility Tags:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {values.tags && values.tags.length > 0 ? (
                        values.tags.map((t) => (
                          <span key={t} className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                            ✓ {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#8e99a8] text-xs">No facility tags selected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Dynamic Spaces (Space 2, Space 3, etc.) */}
                {extraSpaces.map((space, idx) => (
                  <div key={space.id} className="bg-[#f8faf8] p-5 rounded-2xl border border-[#e0e3e5] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Space {idx + 2}</span>
                      <span className="text-xs font-bold bg-slate-200 text-slate-800 px-3 py-1 rounded-full">
                        {space.seats ? `${space.seats} Seats` : 'Capacity unspecified'}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="font-semibold text-[#565e74] block">Room Name:</span>
                      <span className="font-bold text-[#191c1e] text-sm">{space.name || `Space ${idx + 2}`}</span>
                    </div>

                    {/* Extra Space Pricing Rates */}
                    <div>
                      <span className="text-xs font-bold text-[#565e74] block mb-2">Pricing Rates:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                        {[
                          { label: 'Hourly', val: space.prices?.priceHourly },
                          { label: 'Daily', val: space.prices?.priceDaily },
                          { label: 'Weekly', val: space.prices?.priceWeekly },
                          { label: 'Monthly', val: space.prices?.priceMonthly },
                          { label: 'Half-Yearly', val: space.prices?.priceHalfYearly },
                          { label: 'Yearly', val: space.prices?.priceYearly },
                        ].map((p) => (
                          <div key={p.label} className="p-2 bg-white rounded-xl border border-[#e0e3e5] text-center">
                            <span className="text-[#565e74] text-[11px] block">{p.label}</span>
                            <span className="font-bold text-[#16a34a]">{p.val ? `₹${p.val}` : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Extra Space Tags */}
                    <div>
                      <span className="text-xs font-bold text-[#565e74] block mb-1.5">Facility Tags:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {space.tags && space.tags.length > 0 ? (
                          space.tags.map((t) => (
                            <span key={t} className="bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                              ✓ {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#8e99a8] text-xs">No tags configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid 3: Operating Hours & Centre Facilities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Operating Hours */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <div>
                      <h4 className="text-base font-bold text-[#191c1e] font-['Lexend',sans-serif]">Operating Hours</h4>
                      <p className="text-xs text-[#565e74] mt-0.5">Weekly Schedule</p>
                    </div>
                    <button type="button" onClick={() => goto(1)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Hours</button>
                  </div>

                  <div className="space-y-2 text-xs">
                    {DAY_ORDER.map((dayIdx) => {
                      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIdx] ?? 'Sunday';
                      const hourObj = values.hours?.[dayIdx];
                      const isOpen = hourObj?.isOpen ?? true;

                      return (
                        <div key={dayIdx} className="flex justify-between items-center py-1 border-b border-[#f8fafc]">
                          <span className="font-semibold text-[#565e74]">{dayName}:</span>
                          {isOpen ? (
                            <span className="font-bold text-[#16a34a] bg-[#16a34a]/10 px-2.5 py-0.5 rounded-md">
                              {hourObj?.openingTime || '09:00'} - {hourObj?.closingTime || '22:00'}
                            </span>
                          ) : (
                            <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md">Closed</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Centre Facilities & Amenities */}
                <div className="bg-white p-6 rounded-2xl border border-[#e0e3e5] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-3">
                    <div>
                      <h4 className="text-base font-bold text-[#191c1e] font-['Lexend',sans-serif]">Facilities & Amenities</h4>
                      <p className="text-xs text-[#565e74] mt-0.5">Centre-wide amenities</p>
                    </div>
                    <button type="button" onClick={() => goto(1)} className="text-xs font-bold text-[#16a34a] hover:underline">✏️ Edit Facilities</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-[#565e74] block mb-2">Selected Facilities:</span>
                      <div className="flex flex-wrap gap-2">
                        {values.amenityIds && values.amenityIds.length > 0 ? (
                          props.amenities.filter((a) => values.amenityIds.includes(a.id)).map((a) => (
                            <span key={a.id} className="bg-[#16a34a] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs">
                              ✓ {a.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#8e99a8] italic">No centre amenities selected</span>
                        )}
                      </div>
                    </div>
                    {values.womenSafeClaim && (
                      <div className="pt-2">
                        <span className="text-xs font-bold text-[#16a34a] bg-[#16a34a]/10 border border-[#16a34a]/20 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                          🛡️ This centre has verified women-safe facilities
                        </span>
                      </div>
                    )}
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
                    {/* Business Logo Preview */}
                    <div className="space-y-1">
                      <span className="font-semibold text-[#565e74] block">Business Logo:</span>
                      {logoFile ? (
                        <div className="h-16 w-16 rounded-xl border border-[#bdcaba] overflow-hidden bg-white shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(logoFile)} alt="Logo" className="h-full w-full object-contain p-1" />
                        </div>
                      ) : (!logoRemoved && props.photos?.logoUrl) ? (
                        <div className="h-16 w-16 rounded-xl border border-[#bdcaba] overflow-hidden bg-white shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={props.photos.logoUrl} alt="Saved Logo" className="h-full w-full object-contain p-1" />
                        </div>
                      ) : (
                        <span className="text-[#8e99a8] italic">No logo provided</span>
                      )}
                    </div>

                    {/* Cover Image Preview */}
                    <div className="space-y-1">
                      <span className="font-semibold text-[#565e74] block">Cover Image:</span>
                      {coverFile ? (
                        <div className="h-20 w-36 rounded-xl border border-[#bdcaba] overflow-hidden bg-slate-100 shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(coverFile)} alt="Cover" className="h-full w-full object-cover" />
                        </div>
                      ) : (!coverRemoved && props.photos?.coverUrl) ? (
                        <div className="h-20 w-36 rounded-xl border border-[#bdcaba] overflow-hidden bg-slate-100 shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={props.photos.coverUrl} alt="Saved Cover" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <span className="text-[#8e99a8] italic">No cover image provided</span>
                      )}
                    </div>

                    <div>
                      <span className="font-semibold text-[#565e74] block mb-2">Gallery Photos:</span>
                      <div className="flex flex-wrap gap-2">
                        {/* Freshly Selected Gallery Files */}
                        {Object.entries(galleryFiles).flatMap(([slot, files]) =>
                          files.map((file, idx) => (
                            <div key={`picked-${slot}-${idx}`} className="h-16 w-16 border border-[#bdcaba] overflow-hidden bg-slate-900 shadow-2xs relative group" title={`${slot}: ${file.name}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-bold text-white text-center py-0.5 truncate px-0.5">{slot}</span>
                            </div>
                          ))
                        )}
                        {/* Saved Database Gallery Photos */}
                        {props.photos?.gallery?.map((g) => (
                          <div key={`saved-${g.id}`} className="h-16 w-16 border border-[#bdcaba] overflow-hidden bg-slate-900 shadow-2xs relative group" title={g.category || 'Gallery'}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={g.url} alt="" className="h-full w-full object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-bold text-white text-center py-0.5 truncate px-0.5">{g.category || 'Gallery'}</span>
                          </div>
                        ))}
                        {!Object.keys(galleryFiles).length && !extraFiles.length && (!props.photos?.gallery || props.photos.gallery.length === 0) && (
                          <span className="text-[#8e99a8] italic">No gallery photos uploaded</span>
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
                disabled={phase !== 'idle'}
                onClick={() => { submitIntent.current = 'publish'; handleSubmit(doSubmit)(); }}
                className={`text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all disabled:cursor-not-allowed ${
                  phase === 'published'
                    ? 'bg-[#16a34a] hover:bg-[#16a34a]'
                    : 'bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-70'
                }`}
              >
                {phase === 'published' ? (
                  <span className="flex items-center gap-1.5 text-white font-bold">
                    ✓ Published!
                  </span>
                ) : phase !== 'idle' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Listing</span>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center pointer-events-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewModalUrl}
              alt="Enlarged photo preview"
              className="max-h-[85vh] max-w-full object-contain border-2 border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-rose-600 text-white font-bold text-lg transition-colors cursor-pointer"
              title="Close image"
            >
              ✕
            </button>
            <p className="text-white/70 text-xs font-semibold mt-3">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
