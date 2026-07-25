import { Check } from 'lucide-react';

type Props = { language: 'ar' | 'en' };

export function Pricing({ language }: Props) {
  const ar = language === 'ar';
  return (
    <section id="pricing" className="py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-black text-[var(--cv-green)]">{ar ? 'الأسعار' : 'PRICING'}</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">{ar ? 'ابدأ مجانًا وتوسع عند الحاجة' : 'Start free and grow when needed'}</h2>
        </div>
        <div className="mx-auto mt-12 max-w-md rounded-[var(--cv-radius-lg)] border border-[var(--cv-border)] bg-white p-8 shadow-[var(--cv-shadow)]">
          <h3 className="text-2xl font-black">{ar ? 'الباقة الأساسية' : 'Starter'}</h3>
          <div className="mt-5"><span className="cv-metric-number text-5xl text-[var(--cv-purple)]">0</span> <span className="font-bold text-[var(--cv-muted)]">{ar ? 'ر.س' : 'SAR'}</span></div>
          <ul className="mt-7 space-y-4">
            {[ar ? 'تجربة إنشاء كتاب' : 'Book creation trial', ar ? 'واجهة عربية وإنجليزية' : 'Arabic and English UI', ar ? 'معاينة قبل التصدير' : 'Preview before export'].map((item) => (
              <li key={item} className="flex items-center gap-3 font-bold"><Check className="text-[var(--cv-green)]" />{item}</li>
            ))}
          </ul>
          <button className="cv-primary-button mt-8 w-full">{ar ? 'ابدأ الآن' : 'Get started'}</button>
        </div>
      </div>
    </section>
  );
}
