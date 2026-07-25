import { BrandLogo } from '../brand/BrandLogo';

type Props = { language: 'ar' | 'en' };

export function Footer({ language }: Props) {
  return (
    <footer className="border-t border-[var(--cv-border)] bg-white py-10">
      <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
        <BrandLogo />
        <p className="text-sm font-semibold text-[var(--cv-muted)]">
          © {new Date().getFullYear()} ColorVerse. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
        </p>
      </div>
    </footer>
  );
}
