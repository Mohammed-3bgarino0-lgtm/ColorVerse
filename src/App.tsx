import { useMemo, useState } from 'react';
import { LandingPage } from './components/marketing/LandingPage';
import { Navbar } from './components/Navbar';

export default function App() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const direction = useMemo(() => (language === 'ar' ? 'rtl' : 'ltr'), [language]);

  return (
    <div dir={direction} lang={language} className="min-h-screen bg-[var(--cv-bg)] text-[var(--cv-navy)]">
      <Navbar language={language} onLanguageChange={setLanguage} />
      <LandingPage language={language} />
    </div>
  );
}
