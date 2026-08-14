'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Resource {
  id: string;
  label: string;
  pricing: Record<string, number>;
}

export function PricingPlans({ slug, resources }: { slug: string; resources: Resource[] }) {
  const [activeTab, setActiveTab] = useState(0);
  
  // If no resources have pricing, use the dummy resources from the design
  const hasAnyPricing = resources?.some(r => Object.keys(r.pricing || {}).length > 0);
  const displayResources = (resources?.length > 0 && hasAnyPricing) ? resources : [
    { id: 'dummy-1', label: 'Standard AC', pricing: {} },
    { id: 'dummy-2', label: 'Standard Non-AC', pricing: {} },
    { id: 'dummy-3', label: 'Executive Luxury', pricing: {} },
  ];

  const activeResource = displayResources[activeTab];

  if (!displayResources || displayResources.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 border-b border-[#bdcaba]/30">
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

      {activeResource && (
        <div className="flex flex-col border-t border-[#bdcaba]/30">
          {Object.entries(activeResource.pricing || {}).filter(([_, p]) => !!p).length === 0 ? (
            // Dummy Data Fallback
            [
              { period: 'month', price: 22000, label: 'Monthly' },
              { period: 'fortnight', price: 12000, label: 'Fortnightly', isPopular: true },
              { period: 'quarter', price: 60000, label: 'Quarterly' },
              { period: 'half_year', price: 110000, label: 'Half-Yearly' },
            ].map(({ period, price, label, isPopular }, index) => (
              <div key={period} className={`flex flex-col md:flex-row justify-between items-start md:items-center py-8 border-b border-[#bdcaba]/30 gap-6 ${isPopular ? 'relative bg-[#f2f4f6]/50 -mx-6 px-6' : ''}`}>
                {isPopular && (
                  <div className="absolute top-0 left-6 -translate-y-1/2 bg-[#16a34a] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm">Most Popular</div>
                )}
                <div className="flex-1">
                  <h3 className="font-['Lexend',sans-serif] font-bold text-lg text-[#191c1e] mb-4">{label}</h3>
                  {period !== 'half_year' && (
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-[#565e74]">
                      <span className="flex items-center gap-2"><svg className="text-[#16a34a]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> High-speed Wi-Fi & AC</span>
                      <span className="flex items-center gap-2"><svg className="text-[#16a34a]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Better value</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:min-w-[300px] md:justify-end">
                  <div className="md:text-right mb-4 md:mb-0">
                    <div className="font-['Lexend',sans-serif] font-bold text-2xl text-[#191c1e]">₹{price}</div>
                    {period !== 'half_year' && <div className="text-xs text-[#565e74]">/{period.replace('_', ' ')}</div>}
                  </div>
                  <Link href={`/centres/${slug}/book?period=${period}&resource=${activeResource.id}`} className={`px-8 py-3 ${isPopular ? 'bg-[#16a34a] hover:bg-[#15803d] text-white' : 'border border-[#bdcaba] hover:border-[#191c1e] text-[#191c1e]'} text-xs font-bold rounded transition-colors w-full md:w-auto uppercase tracking-wider shadow-sm text-center`}>
                    {period === 'half_year' ? 'View Details' : isPopular ? 'Book Now' : 'Select Plan'}
                  </Link>
                </div>
              </div>
            ))
          ) : (
            Object.entries(activeResource.pricing).map(([period, price], index) => {
              if (!price) return null;
              const periodLabel = period.charAt(0).toUpperCase() + period.slice(1).replace('_', ' ');
              const isPopular = period === 'fortnight' || period === 'month';
              
              return (
                <div key={period} className={`flex flex-col md:flex-row justify-between items-start md:items-center py-8 border-b border-[#bdcaba]/30 gap-6 ${isPopular && index === 1 ? 'relative bg-[#f2f4f6]/50 -mx-6 px-6' : ''}`}>
                  {isPopular && index === 1 && (
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-[#16a34a] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm">Most Popular</div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-['Lexend',sans-serif] font-bold text-lg text-[#191c1e] mb-4">{periodLabel}</h3>
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-[#565e74]">
                      <span className="flex items-center gap-2"><svg className="text-[#16a34a]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> High-speed Wi-Fi & AC</span>
                      <span className="flex items-center gap-2"><svg className="text-[#16a34a]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Better value</span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:min-w-[300px] md:justify-end">
                    <div className="md:text-right mb-4 md:mb-0">
                      <div className="font-['Lexend',sans-serif] font-bold text-2xl text-[#191c1e]">₹{price}</div>
                      <div className="text-xs text-[#565e74]">/{period.replace('_', ' ')}</div>
                    </div>
                    <Link href={`/centres/${slug}/book?period=${period}&resource=${activeResource.id}`} className={`px-8 py-3 ${isPopular && index === 1 ? 'bg-[#16a34a] hover:bg-[#15803d] text-white' : 'border border-[#bdcaba] hover:border-[#191c1e] text-[#191c1e]'} text-xs font-bold rounded transition-colors w-full md:w-auto uppercase tracking-wider shadow-sm text-center`}>
                      {isPopular && index === 1 ? 'Book Now' : 'Select Plan'}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
