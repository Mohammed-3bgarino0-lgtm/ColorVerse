import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  LogIn,
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

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    ['الرئيسية', 'hero'],
    ['كيف يعمل؟', 'how-it-works'],
    ['نماذج الكتب', 'examples'],
    ['المميزات', 'features'],
    ['الأسعار', 'pricing'],
  ] as const;

  const navigate = (id: string) => {
    setMenuOpen(false);
    scrollToSection(id);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-amber-100/80 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate('hero')} className="focus:outline-none">
            <BrandLogo />
          </button>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-700 2xl:flex">
            {navLinks.map(([label, id]) => (
              <button key={id} type="button" onClick={() => navigate(id)} className="py-2 transition-colors hover:text-amber-600">
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 2xl:flex">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-amber-50 hover:text-amber-600">
              <LogIn className="h-4 w-4" />
              تسجيل الدخول
            </button>
            <button type="button" onClick={() => navigate('create')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 transition hover:scale-[1.02]">
              <Sparkles className="h-4 w-4" />
              ابدأ كتابك
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 2xl:hidden"
            aria-label="القائمة"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-amber-100 bg-white px-4 pb-6 pt-3 shadow-xl 2xl:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-2">
              {navLinks.map(([label, id]) => (
                <button key={id} type="button" onClick={() => navigate(id)} className="rounded-xl px-4 py-3 text-right font-bold text-slate-800 transition hover:bg-amber-50 hover:text-amber-600">
                  {label}
                </button>
              ))}
              <button type="button" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700">
                <LogIn className="h-4 w-4" /> تسجيل الدخول
              </button>
            </nav>
          </div>
        )}
      </header>

      <main>
        <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-amber-50/60 via-white to-slate-50 pb-16 pt-8 2xl:py-20">
          <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 left-10 h-96 w-96 rounded-full bg-rose-300/20 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-size:16px_16px] [background-image:radial-gradient(#e2e8f0_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_55%_55%_at_50%_50%,#000_70%,transparent_100%)]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 2xl:grid-cols-12">
              <div className="space-y-6 text-right 2xl:col-span-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-100/80 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-600" />
                    مدعوم بالذكاء الاصطناعي
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-100/80 px-3.5 py-1.5 text-xs font-bold text-emerald-900 shadow-sm">
                    <Printer className="h-3.5 w-3.5 text-emerald-600" />
                    ملفات PDF جاهزة للطباعة
                  </span>
                </div>

                <h1 className="max-w-4xl text-4xl font-black leading-[1.15] tracking-tight text-slate-900 sm:text-5xl 2xl:text-6xl">
                  حوّل طفلك إلى <br className="hidden sm:block" />
                  <span className="bg-gradient-to-l from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                    بطل قصة ملوّنة
                  </span>
                </h1>

                <p className="max-w-2xl text-lg font-medium leading-relaxed text-slate-600 sm:text-xl">
                  أنشئ قصة أطفال مخصصة باسم طفلك وصورته، مع رسومات ثابتة للشخصية وصفحات تلوين جاهزة للطباعة خلال دقائق.
                </p>

                <div className="flex flex-col items-stretch gap-4 pt-2 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => navigate('create')} className="group flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-rose-500 via-orange-500 to-amber-500 px-8 py-4 text-lg font-extrabold text-white shadow-lg shadow-orange-500/25 transition hover:scale-[1.02] hover:shadow-xl">
                    <Sparkles className="h-5 w-5" />
                    <span>اصنع كتابك الآن</span>
                    <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                  </button>
                  <button type="button" onClick={() => navigate('examples')} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50/50">
                    <BookOpen className="h-5 w-5 text-amber-500" />
                    شاهد نماذج الكتب
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200/60 pt-4 text-xs font-bold text-slate-500">
                  {['لغتان (عربي / إنجليزي)', 'دعم كامل للطباعة بأعلى جودة', 'موافقة وخصوصية كاملة للصور'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-xl 2xl:col-span-5">
                <div className="absolute -right-3 -top-6 z-20 flex items-center gap-3 rounded-2xl border border-amber-100 bg-white p-3.5 shadow-xl sm:-right-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-rose-400 to-violet-500 text-white shadow-md">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900">شخصية ثابتة 100%</div>
                    <div className="text-[10px] font-bold text-amber-600">بين القصة والتلوين</div>
                  </div>
                </div>

                <div className="relative rotate-1 rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-500 p-3 shadow-2xl transition-transform duration-500 hover:rotate-0 sm:p-4">
                  <div className="space-y-4 rounded-2xl bg-white p-4 sm:p-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-400" />
                        <span className="h-3 w-3 rounded-full bg-amber-400" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">معاينة صفحة الكتاب</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2 text-right">
                        <div className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-tr from-sky-400 via-indigo-300 to-amber-200 p-2 shadow-inner">
                          <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-white/40 bg-white/30 p-2 text-center backdrop-blur-sm">
                            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-amber-300 text-2xl shadow-md">🚀</div>
                            <span className="text-xs font-black text-slate-900">سارة في الفضاء</span>
                            <span className="text-[10px] font-bold text-slate-700">المشهد الملون</span>
                          </div>
                          <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-white">صفحة 1</span>
                        </div>
                        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-slate-700">انطلقت سارة في مركبتها العجيبة نحو كوكب الألوان الضاحكة...</p>
                      </div>

                      <div className="space-y-2 text-right">
                        <div className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white p-2 shadow-sm">
                          <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-2xl grayscale shadow-sm">🖍️</div>
                            <span className="text-xs font-black text-slate-800">لون مع سارة</span>
                            <span className="text-[10px] font-bold text-amber-600">صفحة تلوين</span>
                          </div>
                          <span className="absolute bottom-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white">تلوين</span>
                        </div>
                        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-slate-500">استخدم أقلامك الخشبية لتلوين نجمة الفضاء المحبوبة!</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1 text-amber-600"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> جودة طباعة عالية</span>
                      <span>ColorVerse</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700"><Wand2 className="h-4 w-4" /> ColorVerse</span>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">من فكرة بسيطة إلى كتاب كامل لطفلك</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">كل ما تحتاجه لإنشاء قصة شخصية وكتاب تلوين احترافي في تجربة سهلة وممتعة.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                [ImageIcon, 'أدخل تفاصيل طفلك', 'الاسم والعمر والموضوع المفضل وصورة اختيارية.'],
                [Sparkles, 'نصنع القصة والرسومات', 'الذكاء الاصطناعي ينشئ قصة متناسقة وشخصية ثابتة.'],
                [Download, 'حمّل الكتاب واطبعه', 'ملفات PDF للقصة والتلوين والنسخة المدمجة.'],
              ].map(([Icon, title, description], index) => {
                const StepIcon = Icon as typeof ImageIcon;
                return (
                  <article key={String(title)} className="relative rounded-3xl border border-slate-200 bg-amber-50/30 p-7 shadow-sm">
                    <span className="absolute left-5 top-5 text-5xl font-black text-slate-100">0{index + 1}</span>
                    <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-lg"><StepIcon className="h-6 w-6" /></div>
                    <h3 className="relative mt-6 text-xl font-black">{String(title)}</h3>
                    <p className="relative mt-3 leading-7 text-slate-600">{String(description)}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="examples" className="border-y border-amber-100 bg-amber-50/30 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-black sm:text-4xl">نماذج كتب مصممة للأطفال</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {['مغامرة الفضاء', 'حديقة الحيوانات', 'أميرة النجوم'].map((title, index) => (
                <article key={title} className="overflow-hidden rounded-3xl border border-white bg-white shadow-lg">
                  <div className={`grid aspect-[4/3] place-items-center bg-gradient-to-br ${index === 0 ? 'from-sky-400 via-blue-500 to-violet-600' : index === 1 ? 'from-emerald-400 via-teal-400 to-sky-500' : 'from-orange-300 via-rose-400 to-pink-500'}`}>
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-white/90 shadow-xl"><Rocket className="h-12 w-12 text-violet-600" /></div>
                  </div>
                  <div className="p-6"><h3 className="text-xl font-black">{title}</h3></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              [ShieldCheck, 'خصوصية وحماية'],
              [Palette, 'صفحات تلوين واضحة'],
              [Printer, 'جودة طباعة عالية'],
              [BookOpen, 'قصة ثنائية اللغة'],
            ].map(([Icon, title]) => {
              const FeatureIcon = Icon as typeof ShieldCheck;
              return <article key={String(title)} className="rounded-3xl border border-slate-200 p-6"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-500"><FeatureIcon className="h-6 w-6" /></div><h3 className="mt-5 text-lg font-black">{String(title)}</h3></article>;
            })}
          </div>
        </section>

        <section id="pricing" className="bg-slate-900 py-20 text-white"><div className="mx-auto max-w-4xl px-4 text-center"><h2 className="text-3xl font-black sm:text-4xl">اختر الباقة المناسبة لكتاب طفلك</h2></div></section>
        <section id="create" className="bg-gradient-to-l from-amber-500 via-orange-500 to-rose-500 py-20 text-white"><div className="mx-auto max-w-4xl px-4 text-center"><h2 className="text-3xl font-black sm:text-4xl">جاهز لصناعة قصة لا ينساها طفلك؟</h2><button type="button" className="mt-8 rounded-2xl bg-white px-8 py-4 text-lg font-black text-slate-900 shadow-xl">ابدأ إنشاء الكتاب</button></div></section>
      </main>
    </div>
  );
}
