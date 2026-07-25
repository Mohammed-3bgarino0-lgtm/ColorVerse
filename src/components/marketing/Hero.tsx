import { ArrowLeft, ArrowRight, Rocket, Sparkles } from 'lucide-react';
import { BrandMark } from '../brand/BrandMark';

type HeroProps = { language: 'ar' | 'en' };

export function Hero({ language }: HeroProps) {
  const ar = language === 'ar';
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
        <div className="absolute -start-20 top-10 h-64 w-64 rounded-full bg-[var(--cv-yellow)] blur-3xl" />
        <div className="absolute -end-20 bottom-0 h-72 w-72 rounded-full bg-[var(--cv-blue)] blur-3xl" />
      </div>
      <div className="container relative grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
        <div className={ar ? 'text-right' : 'text-left'}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold shadow-sm">
            <Sparkles size={18} className="text-[var(--cv-orange)]" />
            {ar ? 'قصص وكتب تلوين بالذكاء الاصطناعي' : 'AI stories and coloring books'}
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.16] tracking-[-0.045em] text-[var(--cv-navy)] sm:text-5xl lg:text-6xl">
            {ar ? 'حوّل خيال طفلك إلى عالم ممتع قابل للتلوين' : "Turn your child's imagination into a colorful adventure"}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[var(--cv-muted)] sm:text-xl">
            {ar
              ? 'أنشئ كتابًا شخصيًا بالعربية أو الإنجليزية، بشخصيات ثابتة وصفحات جاهزة للطباعة خلال دقائق.'
              : 'Create a personalized Arabic or English book with consistent characters and print-ready pages in minutes.'}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a className="cv-primary-button" href="#create">
              <Rocket size={20} />
              {ar ? 'ابدأ إنشاء كتابك' : 'Create your book'}
              <Arrow size={20} />
            </a>
            <a href="#examples" className="rounded-full border border-[var(--cv-border)] bg-white px-6 py-3 font-extrabold shadow-sm">
              {ar ? 'شاهد أمثلة' : 'View examples'}
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-6 text-sm font-bold text-[var(--cv-muted)]">
            <span><b className="cv-metric-number text-xl text-[var(--cv-purple)]">2</b> {ar ? 'لغات' : 'languages'}</span>
            <span><b className="cv-metric-number text-xl text-[var(--cv-blue)]">10+</b> {ar ? 'قوالب' : 'templates'}</span>
            <span><b className="cv-metric-number text-xl text-[var(--cv-green)]">PDF</b> {ar ? 'جاهز للطباعة' : 'print ready'}</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="cv-hero-media-mask aspect-square bg-white p-8">
            <div className="grid h-full place-items-center rounded-[inherit] bg-[linear-gradient(145deg,#fff4cc,#ffe7ef_42%,#e7ddff)]">
              <BrandMark className="w-3/5 drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
