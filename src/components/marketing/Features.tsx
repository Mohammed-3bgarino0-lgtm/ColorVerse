import { BookOpen, Languages, Palette, Printer, ShieldCheck, WandSparkles } from 'lucide-react';

type Props = { language: 'ar' | 'en' };

export function Features({ language }: Props) {
  const ar = language === 'ar';
  const items = [
    [WandSparkles, ar ? 'إنشاء ذكي' : 'Smart generation', ar ? 'حوّل الفكرة إلى قصة وصفحات تلوين مترابطة.' : 'Turn one idea into a connected story and coloring pages.'],
    [Languages, ar ? 'عربي وإنجليزي' : 'Arabic & English', ar ? 'واجهة ومحتوى ثنائي اللغة مع اتجاه صحيح.' : 'Bilingual interface and content with correct direction.'],
    [Palette, ar ? 'شخصيات ثابتة' : 'Consistent characters', ar ? 'حافظ على ملامح البطل في جميع الصفحات.' : 'Keep the hero recognizable on every page.'],
    [Printer, ar ? 'جاهز للطباعة' : 'Print ready', ar ? 'صدّر الكتاب كملف PDF عالي الجودة.' : 'Export a high-quality PDF book.'],
    [BookOpen, ar ? 'قوالب تعليمية' : 'Educational themes', ar ? 'موضوعات مناسبة للأعمار والمهارات المختلفة.' : 'Age-appropriate themes and learning goals.'],
    [ShieldCheck, ar ? 'مصمم للأطفال' : 'Made for children', ar ? 'تجربة واضحة وآمنة ومحتوى قابل للمراجعة.' : 'Clear, safe workflow with reviewable content.'],
  ] as const;

  return (
    <section id="features" className="py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-black text-[var(--cv-purple)]">{ar ? 'المميزات' : 'FEATURES'}</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">{ar ? 'كل ما تحتاجه لصناعة كتاب مميز' : 'Everything needed for a special book'}</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(([Icon, title, text]) => (
            <article key={title} className="rounded-[var(--cv-radius-md)] border border-[var(--cv-border)] bg-white p-6 shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--cv-bg)] text-[var(--cv-orange)]"><Icon /></div>
              <h3 className="mt-5 text-xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-[var(--cv-muted)]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
