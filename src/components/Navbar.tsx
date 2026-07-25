import { BrandLogo } from './brand/BrandLogo';

type NavbarProps = {
  language: 'ar' | 'en';
  onLanguageChange: (language: 'ar' | 'en') => void;
};

export function Navbar({ language, onLanguageChange }: NavbarProps) {
  const isArabic = language === 'ar';
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--cv-border)] bg-white/85 backdrop-blur-xl">
      <div className="container flex min-h-20 items-center justify-between gap-6">
        <BrandLogo />
        <nav className="hidden items-center gap-7 font-bold text-[var(--cv-navy)] md:flex">
          <a href="#features">{isArabic ? 'المميزات' : 'Features'}</a>
          <a href="#how">{isArabic ? 'كيف يعمل' : 'How it works'}</a>
          <a href="#pricing">{isArabic ? 'الأسعار' : 'Pricing'}</a>
        </nav>
        <button
          type="button"
          className="rounded-full border border-[var(--cv-border)] bg-white px-4 py-2 font-bold"
          onClick={() => onLanguageChange(isArabic ? 'en' : 'ar')}
        >
          {isArabic ? 'English' : 'العربية'}
        </button>
      </div>
    </header>
  );
}
