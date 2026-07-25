import { BrandMark } from './BrandMark';

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`} aria-label="ColorVerse عالم التلوين">
      <BrandMark className="h-12 w-12 shrink-0" />
      {!compact && (
        <div className="leading-none">
          <div className="font-latin text-xl font-black tracking-[-0.04em] text-[var(--cv-navy)]">ColorVerse</div>
          <div className="mt-1 text-sm font-extrabold text-[var(--cv-purple)]">عالم التلوين</div>
        </div>
      )}
    </div>
  );
}
