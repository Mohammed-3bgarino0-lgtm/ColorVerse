type BrandMarkProps = { className?: string };

export function BrandMark({ className = '' }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="0 0 96 96" role="img" aria-label="ColorVerse">
      <defs>
        <linearGradient id="planet" x1="15" y1="10" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFC928" />
          <stop offset="0.32" stopColor="#FF8A00" />
          <stop offset="0.62" stopColor="#FF3D5A" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="27" fill="url(#planet)" />
      <path d="M20 55c7 13 47 21 64 7 10-8-3-16-15-18" fill="none" stroke="#159FEA" strokeWidth="7" strokeLinecap="round" />
      <path d="M17 45c11-11 40-16 61-5 14 7 11 15 0 21" fill="none" stroke="#22C978" strokeWidth="5" strokeLinecap="round" />
      <path d="m73 18 8 11-6 4-8-11z" fill="#FF3D5A" />
      <path d="m76 14 8 11-3 4-8-11z" fill="#FFC928" />
      <circle cx="31" cy="37" r="5" fill="#fff" fillOpacity=".84" />
    </svg>
  );
}
