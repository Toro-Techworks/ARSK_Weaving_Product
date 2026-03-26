import React from 'react';

function ArskLogo() {
  return (
    <svg width="80" height="92" viewBox="0 0 80 92" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
      <path d="M40 0L80 23V69L40 92L0 69V23L40 0Z" fill="currentColor" fillOpacity="0.9" />
      <text x="40" y="52" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="Inter, sans-serif">A</text>
    </svg>
  );
}

export default function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-2/5 min-h-screen bg-[#312E81] flex-col relative">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <ArskLogo />
        <div className="mt-6 text-center">
          <p className="text-2xl md:text-3xl font-bold tracking-widest text-white leading-tight">ARSK</p>
          <p className="text-2xl md:text-3xl font-bold tracking-widest text-white leading-tight">PRODUCTION</p>
        </div>
      </div>
      <p className="absolute bottom-6 left-6 text-sm text-white/60">Product by Toro Tech</p>
    </div>
  );
}
