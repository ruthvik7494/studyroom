'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Resource {
  id: string;
  label: string;
  pricing: Record<string, number>;
  tags?: string[];
}

export function PricingPlans({ slug, resources, defaultTags = [] }: { slug: string; resources: Resource[]; defaultTags?: string[] }) {
  const [activeTab, setActiveTab] = useState(0);
  
  // If no resources have pricing, use the dummy resources from the design
  const hasAnyPricing = resources?.some(r => Object.keys(r.pricing || {}).length > 0);
  const displayResources = (resources?.length > 0 && hasAnyPricing) ? resources : [
    { id: 'dummy-1', label: 'Standard AC', pricing: {}, tags: ['AC', 'High-speed Wi-Fi', 'Silent Zone'] },
    { id: 'dummy-2', label: 'Standard Non-AC', pricing: {}, tags: ['Library', 'Power Outlet', 'Silent Zone'] },
    { id: 'dummy-3', label: 'Executive Luxury', pricing: {}, tags: ['AC', 'Ergo Seating', 'CCTV', 'High-speed Wi-Fi'] },
  ];

  const activeResource = displayResources[activeTab];

  if (!displayResources || displayResources.length === 0) return null;

  const resourcePricingTags = (activeResource?.pricing as Record<string, unknown> | undefined)?.tags;
  const currentResourceTags = (Array.isArray(resourcePricingTags) && resourcePricingTags.length > 0)
    ? (resourcePricingTags as string[])
    : ((activeResource?.tags && activeResource.tags.length > 0)
        ? activeResource.tags
        : (defaultTags.length > 0 ? defaultTags : ['AC', 'High-speed Wi-Fi', 'Silent Zone']));

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-4 overflow-x-auto pb-2 border-b border-[#bdcaba]/30">
          {displayResources.map((res, idx) => (
            <button 
              key={res.id} 
              onClick={() => setActiveTab(idx)}
              className={`px-6 py-2 border-b-2 ${idx === activeTab ? 'border-[#16a34a] text-[#16a34a]' : 'border-transparent text-[#565e74] hover:text-[#191c1e]'} text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors`}
            >
              {res.label || `Space ${idx + 1}`}
            </button>
          ))}
        </div>

        {/* Dynamic Facility & Custom Tags under the active Space Tab */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          {currentResourceTags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 bg-[#16a34a]/10 text-[#16a34a] font-semibold px-2.5 py-1 rounded-md border border-[#16a34a]/20">
              <svg className="w-3.5 h-3.5 text-[#16a34a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {activeResource && (
        <div className="flex flex-col border-t border-[#bdcaba]/30">
          {(() => {
            const ORDER = ['hour', 'day', 'week', 'month', 'quarter', 'half_year', 'year'];
            const LABELS: Record<string, string> = {
              hour: 'Hourly',
              day: 'Daily',
              week: 'Weekly',
              month: 'Monthly',
              quarter: 'Quarterly',
              half_year: 'Half Yearly',
              year: 'Yearly',
            };

            const entries = Object.entries(activeResource.pricing).filter(([period, price]) => price && period !== 'popular_period' && period !== 'tags');
            entries.sort((a, b) => {
              const idxA = ORDER.indexOf(a[0]);
              const idxB = ORDER.indexOf(b[0]);
              return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
            });

            return entries.map(([period, price]) => {
              const numPrice = typeof price === 'number' ? price : parseFloat(String(price));
              if (isNaN(numPrice)) return null;

              const periodLabel = LABELS[period] || (period.charAt(0).toUpperCase() + period.slice(1).replace('_', ' '));
              const popularPlanKey = (activeResource.pricing as Record<string, unknown>).popular_period || 'month';
              const isPopular = period === popularPlanKey;
              
              return (
                <div key={period} className={`flex flex-col md:flex-row justify-between items-start md:items-center py-6 border-b border-[#bdcaba]/30 gap-6 ${isPopular ? 'relative bg-[#f2f4f6]/50 -mx-6 px-6' : ''}`}>
                  {isPopular && (
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-[#16a34a] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm">Most Popular</div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-['Lexend',sans-serif] font-bold text-lg text-[#191c1e]">{periodLabel}</h3>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:min-w-[300px] md:justify-end">
                    <div className="md:text-right mb-2 md:mb-0">
                      <div className="font-['Lexend',sans-serif] font-bold text-2xl text-[#191c1e] flex items-baseline md:justify-end gap-1 whitespace-nowrap">
                        <span>₹{numPrice}</span>
                        <span className="text-sm font-normal text-[#565e74]">/{period.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <Link href={`/centres/${slug}/book?period=${period}&resource=${activeResource.id}`} className={`px-8 py-3 ${isPopular ? 'bg-[#16a34a] hover:bg-[#15803d] text-white hover:text-white' : 'border border-[#bdcaba] hover:border-[#191c1e] text-[#191c1e]'} text-xs font-bold rounded transition-colors w-full md:w-auto uppercase tracking-wider shadow-sm text-center`}>
                      {isPopular ? 'Book Now' : 'Select Plan'}
                    </Link>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
