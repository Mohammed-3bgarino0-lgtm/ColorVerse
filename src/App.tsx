import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Globe2,
  Grid2X2,
  Heart,
  Home,
  Image as ImageIcon,
  Library,
  LockKeyhole,
  Menu,
  Palette,
  Plus,
  Printer,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

type Language = 'ar' | 'en';

type ThemeCard = {
  titleAr: string;
  titleEn: string;
  ageAr: string;
  ageEn: string;
  image: string;
  accent: string;
};

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const themes: ThemeCard[] = [
  { titleAr: 'مغامرات الفضاء', titleEn: 'Space Adventure', ageAr: '4–8 سنوات', ageEn: 'Ages 4–8', image: asset('marketing/cover-space.webp'), accent: 'from-blue-600 to-indigo-800' },
  { titleAr: 'قصص الأميرات', titleEn: 'Princess Stories', ageAr: '4–8 سنوات', ageEn: 'Ages 4–8', image: asset('marketing/cover-princess.webp'), accent: 'from-pink-500 to-fuchsia-600' },
  { titleAr: 'حيوانات الغابة', titleEn: 'Jungle Friends', ageAr: '3–7 سنوات', ageEn: 'Ages 3–7', image: asset('marketing/cover-jungle.webp'), accent: 'from-emerald-500 to-green-700' },
  { titleAr: 'مغامرات البطل', titleEn: 'Little Hero', ageAr: '4–8 سنوات', ageEn: 'Ages 4–8', image: asset('marketing/cover-hero.webp'), accent: 'from-orange-500 to-rose-600' },
  { titleAr: 'رحلة مع اليونيكورن', titleEn: 'Unicorn Journey', ageAr: '3–7 سنوات', ageEn: 'Ages 3–7', image: asset('marketing/cover-unicorn.webp'), accent: 'from-violet-500 to-pink-500' },
];

const copy = {
  ar: {
    nav: ['الرئيسية', 'كيف يعمل', 'نماذج الكتب', 'المميزات', 'الأسعار'],
    signIn: 'تسجيل الدخول',
    lang: 'English',
    startFree: 'ابدأ الآن مجانًا',
    badgeAi: 'مدعوم بالذكاء الاصطناعي',
    badgePdf: 'ملفات PDF جاهزة للطباعة',
    heroA: 'حوّل خيال طفلك إلى',
    heroB: 'بطل قصة ملوّنة',
    heroText: 'أنشئ قصة أطفال مخصصة باسم طفلك وصورته، مع شخصية ثابتة بين القصة وصفحات التلوين، وملفات عالية الجودة جاهزة للطباعة خلال دقائق.',
    samples: 'شاهد نماذج الكتب',
    trust: ['لغتان عربي وإنجليزي', 'جودة طباعة عالية', 'خصوصية كاملة للصور'],
    fixed: 'شخصية ثابتة 100%',
    fixedSub: 'بين القصة والتلوين',
    howTitle: 'كيف يعمل عالم التلوين؟',
    howSub: 'أربع خطوات بسيطة تحوّل فكرة طفلك إلى كتاب حقيقي يمكن قراءته وتلوينه وطباعته.',
    examplesTitle: 'نماذج كتب جاهزة تلهم طفلك',
    examplesSub: 'اختر عالم القصة المناسب، ثم خصّص الاسم والشخصية والمغامرة.',
    whyTitle: 'لماذا تختار ColorVerse؟',
    pricingTitle: 'خطط تناسب كل عائلة',
    faqTitle: 'الأسئلة الشائعة',
    ctaTitle: 'جاهز لتحويل خيال طفلك إلى مغامرة ملوّنة؟',
    ctaSub: 'ابدأ الآن وأنشئ أول قصة مخصصة لطفلك خلال دقائق.',
    createTitle: 'أنشئ قصة جديدة لطفلك',
    chooseTheme: 'اختر فكرة القصة',
    next: 'التالي',
    close: 'إغلاق',
  },
  en: {
    nav: ['Home', 'How it works', 'Books', 'Features', 'Pricing'],
    signIn: 'Sign in',
    lang: 'العربية',
    startFree: 'Start for free',
    badgeAi: 'AI-powered',
    badgePdf: 'Print-ready PDF files',
    heroA: "Turn your child's imagination into",
    heroB: 'a colorful story hero',
    heroText: 'Create a personalized story using your child’s name and photo, with a consistent character across story and coloring pages and high-quality printable files in minutes.',
    samples: 'View book samples',
    trust: ['Arabic and English', 'High print quality', 'Private child images'],
    fixed: '100% consistent character',
    fixedSub: 'Across story and coloring pages',
    howTitle: 'How does ColorVerse work?',
    howSub: 'Four simple steps turn your child’s idea into a real book to read, color and print.',
    examplesTitle: 'Ready-made worlds to inspire your child',
    examplesSub: 'Choose a story world, then personalize the name, character and adventure.',
    whyTitle: 'Why choose ColorVerse?',
    pricingTitle: 'Plans for every family',
    faqTitle: 'Frequently asked questions',
    ctaTitle: 'Ready to turn imagination into a colorful adventure?',
    ctaSub: 'Create your child’s first personalized book in minutes.',
    createTitle: 'Create a new story',
    chooseTheme: 'Choose the story idea',
    next: 'Next',
    close: 'Close',
  },
} as const;

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export default function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const rtl = language === 'ar';
  const t = copy[language];
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const dir = rtl ? 'rtl' : 'ltr';

  const steps = useMemo(
    () => rtl
      ? [
          ['اختر فكرة القصة', 'اختر عالمًا يحبه طفلك من النماذج الجاهزة.', Grid2X2],
          ['أضف التفاصيل', 'أدخل الاسم والعمر والصورة والموضوع المفضل.', UserRound],
          ['نصنع القصة', 'ينشئ الذكاء الاصطناعي قصة ورسومات متناسقة.', Wand2],
          ['احصل على كتابك', 'حمّل قصة وكتاب تلوين بصيغة PDF عالية الجودة.', Download],
        ]
      : [
          ['Choose a story', 'Pick a world your child loves.', Grid2X2],
          ['Add details', 'Enter name, age, photo and preferences.', UserRound],
          ['We create it', 'AI creates a consistent story and artwork.', Wand2],
          ['Get the book', 'Download story and coloring PDFs.', Download],
        ],
    [rtl],
  );

  const features = rtl
    ? [
        ['شخصيات ثابتة', 'نفس البطل في القصة وصفحات التلوين.', UserRound, 'text-pink-600 bg-pink-50'],
        ['أمن وخصوصية', 'صور طفلك وبياناته محمية ولا تستخدم خارج المشروع.', LockKeyhole, 'text-blue-600 bg-blue-50'],
        ['جودة احترافية', 'رسومات وملفات PDF عالية الدقة للطباعة.', Palette, 'text-orange-600 bg-orange-50'],
        ['سهولة وسرعة', 'تجربة واضحة وكتاب جاهز خلال دقائق.', Rocket, 'text-violet-600 bg-violet-50'],
        ['دعم لغتين', 'إنشاء القصص بالعربية أو الإنجليزية.', Globe2, 'text-emerald-600 bg-emerald-50'],
      ]
    : [
        ['Consistent characters', 'The same hero across story and coloring pages.', UserRound, 'text-pink-600 bg-pink-50'],
        ['Safe and private', 'Child photos and data stay protected.', LockKeyhole, 'text-blue-600 bg-blue-50'],
        ['Professional quality', 'High-resolution illustrations and PDFs.', Palette, 'text-orange-600 bg-orange-50'],
        ['Fast and easy', 'A clear experience with results in minutes.', Rocket, 'text-violet-600 bg-violet-50'],
        ['Two languages', 'Create stories in Arabic or English.', Globe2, 'text-emerald-600 bg-emerald-50'],
      ];

  const plans = rtl
    ? [
        { name: 'أساسي', price: '19', note: 'للبداية والتجربة', items: ['كتاب واحد شهريًا', 'قصة شخصية', 'ملف PDF للطباعة', 'دعم أساسي'], gradient: 'from-blue-500 to-indigo-600' },
        { name: 'بريميوم', price: '59', note: 'الأكثر شعبية', items: ['5 كتب شهريًا', 'شخصية ثابتة 100%', 'قصة + كتاب تلوين', 'جودة طباعة عالية', 'دعم أولوية'], gradient: 'from-violet-600 to-fuchsia-600', popular: true },
        { name: 'عائلة', price: '99', note: 'أفضل قيمة', items: ['10 كتب شهريًا', 'شخصيات متعددة', 'جميع النماذج', 'تنزيلات غير محدودة', 'دعم عائلي'], gradient: 'from-orange-500 to-rose-500' },
      ]
    : [
        { name: 'Basic', price: '19', note: 'Great for starting', items: ['1 book monthly', 'Personal story', 'Printable PDF', 'Basic support'], gradient: 'from-blue-500 to-indigo-600' },
        { name: 'Premium', price: '59', note: 'Most popular', items: ['5 books monthly', '100% consistent character', 'Story + coloring book', 'High print quality', 'Priority support'], gradient: 'from-violet-600 to-fuchsia-600', popular: true },
        { name: 'Family', price: '99', note: 'Best value', items: ['10 books monthly', 'Multiple characters', 'All templates', 'Unlimited downloads', 'Family support'], gradient: 'from-orange-500 to-rose-500' },
      ];

  const faqs = rtl
    ? [
        ['كيف يتم إنشاء كتاب طفلي؟', 'اختر القالب وأدخل بيانات الطفل ثم راجع القصة والرسومات قبل تنزيل الملفات.'],
        ['هل تبقى الشخصية ثابتة بين الصفحات؟', 'نعم، يستخدم النظام مرجعًا موحدًا للشخصية للحفاظ على ملامحها وملابسها عبر القصة والتلوين.'],
        ['هل صور الأطفال آمنة؟', 'نعم، نعتمد مبدأ الخصوصية أولًا، ولا تستخدم الصور خارج عملية إنشاء الكتاب.'],
        ['هل الملفات جاهزة للطباعة؟', 'تحصل على ملفات PDF مرتبة بمقاسات مناسبة للطباعة المنزلية أو الاحترافية.'],
        ['هل يدعم العربية والإنجليزية؟', 'نعم، يمكن إنشاء الكتاب كاملًا بأي من اللغتين والتبديل بينهما بسهولة.'],
      ]
    : [
        ['How is the book created?', 'Choose a template, add child details, review the result and download the files.'],
        ['Does the character stay consistent?', 'Yes. A unified character reference preserves appearance across story and coloring pages.'],
        ['Are child photos private?', 'Yes. Privacy comes first and photos are used only to create the book.'],
        ['Are files print-ready?', 'You receive organized PDFs suitable for home or professional printing.'],
        ['Is Arabic and English supported?', 'Yes. Create the full book in either language and switch easily.'],
      ];

  return (
    <div dir={dir} lang={language} className="min-h-screen overflow-x-hidden bg-white text-[#10204c]">
      <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => scrollTo('home')} className="shrink-0">
            <img src={asset('brand/colorverse-logo-full.webp')} alt="ColorVerse عالم التلوين" className="h-16 w-auto object-contain" />
          </button>

          <nav className="hidden items-center gap-7 text-sm font-extrabold text-slate-700 lg:flex">
            {t.nav.map((item, index) => {
              const ids = ['home', 'how', 'examples', 'features', 'pricing'];
              return (
                <button key={item} type="button" onClick={() => scrollTo(ids[index])} className="relative py-2 transition hover:text-violet-600 first:text-violet-600">
                  {item}
                  {index === 0 && <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500" />}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button type="button" onClick={() => setLanguage(rtl ? 'en' : 'ar')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black shadow-sm hover:bg-slate-50">
              <Globe2 size={16} /> {t.lang}
            </button>
            <button type="button" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black hover:bg-violet-50">{t.signIn}</button>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-orange-500 via-pink-500 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-500/20 transition hover:-translate-y-0.5">
              <Star size={16} fill="currentColor" /> {t.startFree}
            </button>
          </div>

          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm lg:hidden" aria-label="Menu">
            {menuOpen ? <X size={23} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-violet-100 bg-white px-4 py-4 shadow-xl lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {t.nav.map((item, index) => {
                const ids = ['home', 'how', 'examples', 'features', 'pricing'];
                return <button key={item} type="button" onClick={() => { setMenuOpen(false); scrollTo(ids[index]); }} className="rounded-xl px-4 py-3 text-start font-black hover:bg-violet-50">{item}</button>;
              })}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setLanguage(rtl ? 'en' : 'ar')} className="rounded-xl border border-slate-200 px-4 py-3 font-black">{t.lang}</button>
                <button type="button" onClick={() => { setMenuOpen(false); setCreateOpen(true); }} className="rounded-xl bg-gradient-to-l from-orange-500 to-violet-600 px-4 py-3 font-black text-white">{t.startFree}</button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="relative overflow-hidden bg-[#fffaf7] pb-16 pt-10 lg:pb-20 lg:pt-14">
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(#ffcaa5_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="pointer-events-none absolute -right-28 top-12 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-28 bottom-0 h-96 w-96 rounded-full bg-violet-300/20 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 xl:grid-cols-[1.02fr_.98fr] xl:px-8">
            <div className="order-2 space-y-6 text-center xl:order-1 xl:text-start">
              <div className="flex flex-wrap justify-center gap-3 xl:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-4 py-2 text-xs font-black text-orange-700"><Sparkles size={16} /> {t.badgeAi}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700"><Printer size={16} /> {t.badgePdf}</span>
              </div>

              <h1 className="mx-auto max-w-3xl text-4xl font-black leading-[1.15] tracking-[-0.04em] sm:text-5xl xl:mx-0 xl:text-[4rem]">
                {t.heroA}
                <span className="mt-2 block bg-gradient-to-l from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">{t.heroB}</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg font-medium leading-8 text-slate-600 sm:text-xl xl:mx-0">{t.heroText}</p>

              <div className="flex flex-col justify-center gap-4 sm:flex-row xl:justify-start">
                <button type="button" onClick={() => setCreateOpen(true)} className="group inline-flex min-h-[58px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-orange-500 via-pink-500 to-violet-600 px-8 text-lg font-black text-white shadow-xl shadow-pink-500/20 transition hover:-translate-y-1">
                  <Sparkles size={21} /> {t.startFree} <Arrow size={20} className="transition group-hover:-translate-x-1" />
                </button>
                <button type="button" onClick={() => scrollTo('examples')} className="inline-flex min-h-[58px] items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-8 text-base font-black shadow-sm hover:border-violet-300 hover:bg-violet-50">
                  <BookOpen size={21} className="text-violet-600" /> {t.samples}
                </button>
              </div>

              <div className="grid gap-3 border-t border-slate-200/80 pt-5 sm:grid-cols-3">
                {t.trust.map((item) => <div key={item} className="flex items-center justify-center gap-2 rounded-xl bg-white/70 px-3 py-3 text-xs font-extrabold text-slate-600 xl:justify-start"><CheckCircle2 size={16} className="text-emerald-500" />{item}</div>)}
              </div>
            </div>

            <div className="order-1 mx-auto w-full max-w-[620px] xl:order-2">
              <div className="relative">
                <img src={asset('marketing/hero-book.webp')} alt="قصة ملونة وصفحة تلوين" className="w-full rounded-[32px] object-cover shadow-[0_30px_90px_rgba(62,45,120,.22)]" />
                <div className="absolute -top-5 start-4 flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-xl sm:start-8">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck size={23} /></div>
                  <div className="text-start"><div className="text-xs font-black">{t.fixed}</div><div className="mt-1 text-[11px] font-bold text-orange-600">{t.fixedSub}</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700"><Wand2 size={16} /> ColorVerse</span>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">{t.howTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">{t.howSub}</p>
            </div>
            <div className="relative mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {steps.map(([title, description, Icon], index) => (
                <article key={String(title)} className="group relative rounded-3xl border border-violet-100 bg-white p-7 text-center shadow-[0_12px_40px_rgba(76,52,140,.08)] transition hover:-translate-y-2">
                  <span className="absolute end-5 top-5 grid h-7 w-7 place-items-center rounded-full bg-violet-600 font-latin text-sm font-black text-white">{index + 1}</span>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 text-violet-600 ring-1 ring-violet-100"><Icon size={30} /></div>
                  <h3 className="mt-6 text-lg font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="examples" className="border-y border-violet-100 bg-[#fffaf7] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 text-center md:flex-row md:items-end md:justify-between md:text-start">
              <div><h2 className="text-3xl font-black sm:text-4xl">{t.examplesTitle}</h2><p className="mt-3 text-lg text-slate-600">{t.examplesSub}</p></div>
              <button type="button" onClick={() => setCreateOpen(true)} className="mx-auto inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-5 py-3 font-black text-violet-700 shadow-sm md:mx-0">{rtl ? 'عرض جميع النماذج' : 'View all'} <Grid2X2 size={17} /></button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {themes.map((theme, index) => (
                <button key={theme.titleAr} type="button" onClick={() => { setSelectedTheme(index); setCreateOpen(true); }} className="group overflow-hidden rounded-3xl border border-white bg-white text-start shadow-[0_16px_45px_rgba(39,31,91,.12)] transition hover:-translate-y-2 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden"><img src={theme.image} alt={rtl ? theme.titleAr : theme.titleEn} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /><div className={`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t ${theme.accent} opacity-80`} /></div>
                  <div className="p-4"><h3 className="font-black">{rtl ? theme.titleAr : theme.titleEn}</h3><p className="mt-1 text-xs font-bold text-slate-500">{rtl ? theme.ageAr : theme.ageEn}</p></div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-black sm:text-4xl">{t.whyTitle}</h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {features.map(([title, description, Icon, style]) => (
                <article key={String(title)} className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${style}`}><Icon size={27} /></div>
                  <h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-violet-100 bg-[#fffaf7] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-black sm:text-4xl">{t.pricingTitle}</h2>
            <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <article key={plan.name} className={`relative rounded-[28px] border-2 bg-white p-7 shadow-sm ${plan.popular ? 'border-violet-500 shadow-[0_22px_65px_rgba(124,58,237,.18)] lg:-translate-y-3' : 'border-slate-200'}`}>
                  {plan.popular && <span className="absolute -top-4 start-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-2 text-xs font-black text-white">{plan.note}</span>}
                  <div className="flex items-center justify-between"><div><h3 className="text-2xl font-black">{plan.name}</h3>{!plan.popular && <p className="mt-1 text-xs font-bold text-slate-500">{plan.note}</p>}</div><Star className="text-orange-400" fill="currentColor" /></div>
                  <div className="mt-6 flex items-end gap-2"><span className="font-latin text-5xl font-black">{plan.price}</span><span className="pb-1 text-sm font-bold text-slate-500">{rtl ? 'ر.س / شهريًا' : 'SAR / month'}</span></div>
                  <div className="mt-7 space-y-3">{plan.items.map((item) => <div key={item} className="flex items-center gap-3 text-sm font-bold text-slate-700"><Check size={18} className="shrink-0 text-emerald-500" />{item}</div>)}</div>
                  <button type="button" onClick={() => setCreateOpen(true)} className={`mt-8 w-full rounded-xl bg-gradient-to-r ${plan.gradient} px-5 py-3.5 font-black text-white shadow-lg`}>{rtl ? 'ابدأ الآن' : 'Start now'}</button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_280px] lg:px-8">
            <div><h2 className="text-3xl font-black sm:text-4xl">{t.faqTitle}</h2><div className="mt-8 space-y-3">{faqs.map(([q, a], index) => <article key={q} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => setFaqOpen(faqOpen === index ? null : index)} className="flex w-full items-center justify-between gap-5 px-5 py-4 text-start font-black"><span>{q}</span><ChevronDown className={`shrink-0 transition ${faqOpen === index ? 'rotate-180 text-violet-600' : ''}`} /></button>{faqOpen === index && <p className="border-t border-slate-100 px-5 py-4 leading-7 text-slate-600">{a}</p>}</article>)}</div></div>
            <div className="mx-auto max-w-[260px]"><img src={asset('marketing/faq-dragon.webp')} alt="ColorVerse dragon" className="w-full drop-shadow-2xl" /></div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-l from-orange-500 via-pink-500 to-violet-700 px-6 py-10 text-center text-white shadow-2xl sm:px-10 lg:py-12">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:20px_20px]" />
            <img src={asset('marketing/cta-boy.webp')} alt="طفل يقرأ" className="absolute bottom-0 start-3 hidden h-[150px] object-contain md:block" />
            <div className="relative mx-auto max-w-2xl"><h2 className="text-3xl font-black sm:text-4xl">{t.ctaTitle}</h2><p className="mt-3 text-lg text-white/90">{t.ctaSub}</p><button type="button" onClick={() => setCreateOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-black text-violet-700 shadow-lg"><Sparkles size={19} />{t.startFree}</button></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-[#0d1b46] pb-24 pt-12 text-white md:pb-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="md:col-span-1"><img src={asset('brand/colorverse-logo-full.webp')} alt="ColorVerse" className="h-24 w-auto object-contain" /><p className="mt-4 text-sm leading-7 text-white/70">{rtl ? 'منصة تحول خيال الأطفال إلى قصص وكتب تلوين شخصية ممتعة وآمنة.' : 'A safe platform that turns imagination into personalized stories and coloring books.'}</p></div>
          {[rtl ? ['المنتج', 'كيف يعمل', 'نماذج الكتب', 'المميزات', 'الأسعار'] : ['Product', 'How it works', 'Books', 'Features', 'Pricing'], rtl ? ['الشركة', 'من نحن', 'المدونة', 'الخصوصية', 'الشروط'] : ['Company', 'About', 'Blog', 'Privacy', 'Terms'], rtl ? ['الدعم', 'مركز المساعدة', 'تواصل معنا', 'الأسئلة الشائعة', 'سياسة الاسترجاع'] : ['Support', 'Help center', 'Contact', 'FAQ', 'Refunds']].map((group) => <div key={group[0]}><h3 className="font-black">{group[0]}</h3><div className="mt-4 space-y-3 text-sm text-white/65">{group.slice(1).map((item) => <button type="button" key={item} className="block hover:text-white">{item}</button>)}</div></div>)}
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-white/10 px-4 pt-6 text-center text-xs text-white/50 sm:px-6 md:flex-row md:justify-between lg:px-8"><span>© 2026 ColorVerse | عالم التلوين</span><span>{rtl ? 'صُنع بحب للأطفال والعائلات' : 'Made with love for children and families'}</span></div>
      </footer>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-violet-100 bg-white/95 px-3 py-2 shadow-[0_15px_50px_rgba(30,20,80,.2)] backdrop-blur-xl md:hidden">
        {[Home, Heart, Plus, Library, UserRound].map((Icon, index) => <button key={index} type="button" onClick={() => index === 2 ? setCreateOpen(true) : index === 0 ? scrollTo('home') : undefined} className={`grid h-11 w-11 place-items-center rounded-xl ${index === 2 ? '-mt-7 h-14 w-14 bg-gradient-to-br from-violet-600 to-pink-500 text-white shadow-lg' : index === 0 ? 'text-violet-600' : 'text-slate-500'}`}><Icon size={index === 2 ? 27 : 21} /></button>)}
      </nav>

      {createOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#0b1230]/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setCreateOpen(false); }}>
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-[#fffdfb] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-violet-100 bg-white/95 px-5 py-4 backdrop-blur-xl">
              <button type="button" onClick={() => setCreateOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200"><X size={20} /></button>
              <h2 className="text-xl font-black">{t.createTitle}</h2>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white"><Sparkles size={20} /></span>
            </div>
            <div className="p-5 sm:p-7">
              <div className="mb-8 flex items-center justify-between gap-2">
                {[1, 2, 3, 4].map((step, index) => <div key={step} className="flex flex-1 items-center"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-latin text-sm font-black ${index === 0 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{step}</div>{index < 3 && <span className="mx-2 h-0.5 flex-1 bg-slate-200" />}</div>)}
              </div>
              <h3 className="text-center text-2xl font-black">{t.chooseTheme}</h3>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {themes.slice(0, 4).map((theme, index) => <button key={theme.titleAr} type="button" onClick={() => setSelectedTheme(index)} className={`flex items-center gap-4 rounded-2xl border-2 bg-white p-3 text-start shadow-sm transition ${selectedTheme === index ? 'border-violet-600 ring-4 ring-violet-100' : 'border-slate-200 hover:border-violet-300'}`}><img src={theme.image} alt="" className="h-20 w-24 rounded-xl object-cover" /><div className="flex-1"><h4 className="font-black">{rtl ? theme.titleAr : theme.titleEn}</h4><p className="mt-1 text-xs text-slate-500">{rtl ? theme.ageAr : theme.ageEn}</p></div><span className={`h-5 w-5 rounded-full border-2 ${selectedTheme === index ? 'border-violet-600 bg-violet-600 ring-2 ring-white' : 'border-slate-300'}`} /></button>)}
              </div>
              <button type="button" className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-orange-500 via-pink-500 to-violet-600 px-6 py-4 text-lg font-black text-white shadow-xl"><span>{t.next}</span><Arrow size={21} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
