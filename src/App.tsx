import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Heart,
  Image as ImageIcon,
  Menu,
  Palette,
  Printer,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Wand2,
  X,
} from 'lucide-react';
import { BrandLogo } from './components/brand/BrandLogo';

type Language = 'ar' | 'en';

const copy = {
  ar: {
    nav: ['الرئيسية', 'كيف يعمل', 'نماذج الكتب', 'المميزات', 'الأسعار'],
    login: 'تسجيل الدخول',
    start: 'اصنع كتابك الآن',
    ai: 'مدعوم بالذكاء الاصطناعي',
    pdf: 'ملفات PDF جاهزة للطباعة',
    headingA: 'حوّل طفلك إلى',
    headingB: 'بطل قصة ملوّنة',
    sub: 'أنشئ قصة أطفال مخصصة باسم طفلك وصورته، مع رسومات ثابتة للشخصية وصفحات تلوين جاهزة للطباعة خلال دقائق.',
    examples: 'شاهد نماذج الكتب',
    trust: ['لغتان عربي وإنجليزي', 'دعم كامل للطباعة بأعلى جودة', 'موافقة وخصوصية كاملة للصور'],
    storyPage: 'صفحة قصة',
    colorPage: 'صفحة تلوين',
    fixed: 'شخصية ثابتة 100%',
    fixedSub: 'بين القصة والتلوين',
    sectionTitle: 'من فكرة بسيطة إلى كتاب كامل لطفلك',
    sectionSub: 'كل ما تحتاجه لإنشاء قصة شخصية وكتاب تلوين احترافي في تجربة سهلة وممتعة.',
    steps: [
      ['أدخل تفاصيل طفلك', 'الاسم والعمر والموضوع المفضل وصورة اختيارية.'],
      ['نصنع القصة والرسومات', 'الذكاء الاصطناعي ينشئ قصة متناسقة وشخصية ثابتة.'],
      ['حمّل الكتاب واطبعه', 'ملفات PDF للقصة والتلوين والنسخة المدمجة.'],
    ],
    showcase: 'نماذج كتب مصممة للأطفال',
    showcaseSub: 'مغامرات ممتعة، أبطال ثابتون، وصفحات تلوين واضحة وجاهزة للطباعة.',
    ctaTitle: 'جاهز لصناعة قصة لا ينساها طفلك؟',
    ctaSub: 'ابدأ الآن وأنشئ كتابًا شخصيًا يحمل اسم طفلك ويحوّل خياله إلى مغامرة حقيقية.',
    faq: 'أسئلة شائعة',
  },
  en: {
    nav: ['Home', 'How it works', 'Book samples', 'Features', 'Pricing'],
    login: 'Sign in',
    start: 'Create your book',
    ai: 'AI powered',
    pdf: 'Print-ready PDF files',
    headingA: 'Turn your child into',
    headingB: 'the hero of a colorful story',
    sub: 'Create a personalized children’s story using your child’s name and photo, with a consistent character and printable coloring pages in minutes.',
    examples: 'View book samples',
    trust: ['Arabic and English', 'High-quality print support', 'Consent and private images'],
    storyPage: 'Story page',
    colorPage: 'Coloring page',
    fixed: '100% consistent hero',
    fixedSub: 'Across story and coloring pages',
    sectionTitle: 'From one idea to a complete book',
    sectionSub: 'Everything you need to create a personal story and professional coloring book in one easy experience.',
    steps: [
      ['Add child details', 'Name, age, favorite theme and an optional photo.'],
      ['We create the story', 'AI builds a consistent story and recognizable hero.'],
      ['Download and print', 'Story, coloring and combined PDF editions.'],
    ],
    showcase: 'Book samples made for children',
    showcaseSub: 'Fun adventures, consistent heroes and clean printable coloring pages.',
    ctaTitle: 'Ready to create a story your child will remember?',
    ctaSub: 'Start now and turn your child’s imagination into a personalized adventure.',
    faq: 'Frequently asked questions',
  },
} as const;

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [menuOpen, setMenuOpen] = useState(false);
  const t = copy[language];
  const rtl = language === 'ar';
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} lang={language} className="min-h-screen overflow-x-hidden bg-[var(--cv-bg)] text-[var(--cv-navy)]">
      <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-[var(--cv-navy)] shadow-sm lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={23} /> : <Menu size={24} />}
          </button>

          <BrandLogo className={rtl ? '' : 'order-first'} />

          <nav className="hidden items-center gap-7 text-sm font-extrabold text-slate-600 lg:flex">
            {t.nav.map((item, index) => (
              <button
                key={item}
                type="button"
                className="transition hover:text-[var(--cv-orange)]"
                onClick={() => scrollTo(index === 0 ? 'hero' : index === 1 ? 'how' : index === 2 ? 'examples' : index === 3 ? 'features' : 'pricing')}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-[var(--cv-navy)] shadow-sm"
            >
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
            <button type="button" className="hidden rounded-xl px-3 py-2 text-sm font-extrabold text-slate-600 sm:block">
              {t.login}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {t.nav.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-xl px-4 py-3 font-extrabold hover:bg-orange-50 ${rtl ? 'text-right' : 'text-left'}`}
                  onClick={() => {
                    setMenuOpen(false);
                    scrollTo(index === 0 ? 'hero' : index === 1 ? 'how' : index === 2 ? 'examples' : index === 3 ? 'features' : 'pricing');
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="hero" className="relative overflow-hidden border-b border-orange-100 bg-[var(--cv-bg)] pb-16 pt-10 lg:pb-24 lg:pt-16">
          <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-orange-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-4 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#f6c76f 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.04fr_.96fr] lg:px-8">
            <div className={rtl ? 'text-right' : 'text-left'}>
              <div className="mb-7 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700">
                  <Sparkles size={16} /> {t.ai}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                  <Printer size={16} /> {t.pdf}
                </span>
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.22] tracking-[-0.025em] sm:text-5xl lg:text-[3.6rem]">
                {t.headingA}
                <span className="mx-2 inline-block bg-gradient-to-l from-[var(--cv-purple)] via-[var(--cv-red)] to-[var(--cv-orange)] bg-clip-text text-transparent">
                  {t.headingB}
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg font-medium leading-9 text-slate-600 sm:text-xl">{t.sub}</p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button type="button" onClick={() => scrollTo('create')} className="cv-primary-button group rounded-2xl px-8 py-4 text-lg font-black">
                  <Sparkles size={20} />
                  {t.start}
                  <Arrow size={20} className="transition group-hover:-translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('examples')}
                  className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-7 py-4 text-base font-black shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <BookOpen size={20} className="text-[var(--cv-blue)]" /> {t.examples}
                </button>
              </div>

              <div className="mt-8 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
                {t.trust.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs font-extrabold text-slate-600 ring-1 ring-white">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cv-green)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[570px]">
              <div className="absolute -right-3 -top-6 z-20 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-orange-100 sm:-right-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-8 w-8 text-[var(--cv-green)]" />
                  <div>
                    <div className="text-xs font-black">{t.fixed}</div>
                    <div className="mt-1 text-[11px] font-bold text-orange-600">{t.fixedSub}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[34px] bg-gradient-to-br from-pink-400 via-violet-500 to-blue-500 p-4 shadow-[0_34px_90px_rgba(21,34,76,.2)]">
                <div className="overflow-hidden rounded-[26px] bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black">معاينة صفحة الكتاب</span>
                    <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-rose-400" /></div>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <article className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-3">
                      <div className="mb-3 flex items-center justify-between"><span className="text-xs font-black text-sky-700">{t.storyPage}</span><ImageIcon size={17} className="text-sky-500" /></div>
                      <div className="grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br from-sky-200 via-violet-200 to-orange-100">
                        <div className="rounded-full bg-white p-5 shadow-lg"><Rocket className="h-10 w-10 text-[var(--cv-purple)]" /></div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200" /><div className="mt-2 h-2 w-4/5 rounded-full bg-slate-100" />
                    </article>
                    <article className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-3">
                      <div className="mb-3 flex items-center justify-between"><span className="text-xs font-black text-orange-700">{t.colorPage}</span><Palette size={17} className="text-orange-500" /></div>
                      <div className="grid aspect-[4/3] place-items-center rounded-xl bg-white ring-1 ring-orange-100">
                        <div className="relative grid h-24 w-24 place-items-center rounded-full border-[5px] border-slate-700">
                          <Rocket className="h-10 w-10 text-slate-700" />
                          <span className="absolute -right-3 top-1 h-3 w-3 rounded-full bg-yellow-300" />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2"><span className="h-5 flex-1 rounded-full bg-rose-400" /><span className="h-5 flex-1 rounded-full bg-sky-400" /><span className="h-5 flex-1 rounded-full bg-emerald-400" /></div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700"><Wand2 size={16} /> ColorVerse</span>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">{t.sectionTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">{t.sectionSub}</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {t.steps.map(([title, description], index) => {
                const icons = [ImageIcon, Sparkles, Download];
                const Icon = icons[index];
                return (
                  <article key={title} className="relative rounded-3xl border border-slate-200 bg-[var(--cv-bg)] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
                    <span className="absolute left-5 top-5 font-latin text-5xl font-black text-slate-100">0{index + 1}</span>
                    <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg"><Icon size={26} /></div>
                    <h3 className="relative mt-6 text-xl font-black">{title}</h3>
                    <p className="relative mt-3 leading-7 text-slate-600">{description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="examples" className="border-y border-orange-100 bg-[var(--cv-bg)] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h2 className="text-3xl font-black sm:text-4xl">{t.showcase}</h2>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">{t.showcaseSub}</p>
              </div>
              <button type="button" onClick={() => scrollTo('create')} className="inline-flex items-center gap-2 font-black text-[var(--cv-purple)]">{t.start}<Arrow size={18} /></button>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                ['مغامرة الفضاء', 'from-sky-400 via-blue-500 to-violet-600', Rocket],
                ['حديقة الحيوانات', 'from-emerald-400 via-teal-400 to-sky-500', Heart],
                ['أميرة النجوم', 'from-orange-300 via-rose-400 to-pink-500', Star],
              ].map(([title, gradient, Icon]) => (
                <article key={String(title)} className="overflow-hidden rounded-3xl border border-white bg-white shadow-soft">
                  <div className={`grid aspect-[4/3] place-items-center bg-gradient-to-br ${gradient}`}>
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-white/90 shadow-xl"><Icon className="h-12 w-12 text-[var(--cv-purple)]" /></div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between"><h3 className="text-xl font-black">{title}</h3><span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black text-orange-600">قصة + تلوين</span></div>
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500"><Check size={16} className="text-emerald-500" /> 10 صفحات جاهزة للطباعة</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [ShieldCheck, 'خصوصية وحماية', 'صور الأطفال تبقى خاصة ولا تستخدم خارج إنشاء الكتاب.'],
                [Palette, 'صفحات تلوين واضحة', 'خطوط نظيفة ومساحات مناسبة لأعمار الأطفال.'],
                [Printer, 'جودة طباعة عالية', 'مقاسات مناسبة للطباعة المنزلية والمطابع.'],
                [BookOpen, 'قصة ثنائية اللغة', 'إنشاء الكتاب بالعربية أو الإنجليزية بسهولة.'],
              ].map(([Icon, title, description]) => (
                <article key={String(title)} className="rounded-3xl border border-slate-200 p-6">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[var(--cv-orange)]"><Icon size={24} /></div>
                  <h3 className="mt-5 text-lg font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="create" className="relative overflow-hidden bg-[var(--cv-navy)] py-20 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20"><Sparkles size={30} className="text-[var(--cv-yellow)]" /></div>
            <h2 className="mt-6 text-3xl font-black sm:text-5xl">{t.ctaTitle}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">{t.ctaSub}</p>
            <button type="button" className="mt-8 inline-flex min-h-[58px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-[var(--cv-orange)] to-[var(--cv-red)] px-9 py-4 text-lg font-black shadow-2xl transition hover:-translate-y-1">
              <Rocket size={21} /> {t.start} <Arrow size={21} />
            </button>
          </div>
        </section>

        <section id="pricing" className="bg-[var(--cv-bg)] py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-black">{t.faq}</h2>
            <div className="mt-8 space-y-3">
              {['هل أحتاج خبرة في التصميم؟', 'هل يمكنني الطباعة في المنزل؟', 'هل صورة الطفل محفوظة بأمان؟'].map((question) => (
                <details key={question} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-black"><span>{question}</span><ChevronDown className="transition group-open:rotate-180" size={20} /></summary>
                  <p className="mt-4 leading-7 text-slate-600">لا تحتاج أي خبرة. اختر البيانات الأساسية وسيجهز النظام القصة والرسومات وملفات الطباعة بصورة تلقائية.</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:px-6 md:flex-row lg:px-8">
          <BrandLogo />
          <p className="text-sm font-bold text-slate-500">© 2026 ColorVerse — عالم التلوين</p>
        </div>
      </footer>
    </div>
  );
}
