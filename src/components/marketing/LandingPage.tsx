import { Hero } from './Hero';
import { Features } from './Features';
import { HowItWorks } from './HowItWorks';
import { Pricing } from './Pricing';
import { Footer } from './Footer';

type LandingPageProps = { language: 'ar' | 'en' };

export function LandingPage({ language }: LandingPageProps) {
  return (
    <main className={language === 'ar' ? 'font-arabic' : 'font-latin'}>
      <Hero language={language} />
      <Features language={language} />
      <HowItWorks language={language} />
      <Pricing language={language} />
      <Footer language={language} />
    </main>
  );
}
