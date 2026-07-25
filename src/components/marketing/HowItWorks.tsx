type Props = { language: 'ar' | 'en' };

export function HowItWorks({ language }: Props) {
  const ar = language === 'ar';
  const steps = ar
    ? ['اختر عمر الطفل وموضوع الكتاب', 'أضف اسم البطل وتفاصيله', 'راجع القصة والشخصية', 'نزّل الكتاب وابدأ التلوين']
    : ['Choose age and theme', 'Add the hero details', 'Review story and character', 'Download and start coloring'];

  return (
    <section id="how" className="bg-white py-20">
      <div className="container">
        <div className="text-center">
          <span className="font-black text-[var(--cv-blue)]">{ar ? 'كيف يعمل' : 'HOW IT WORKS'}</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">{ar ? 'أربع خطوات بسيطة' : 'Four simple steps'}</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-[var(--cv-radius-md)] border border-[var(--cv-border)] bg-[var(--cv-bg)] p-6">
              <div className="cv-metric-number grid h-11 w-11 place-items-center rounded-full bg-[var(--cv-navy)] text-white">{index + 1}</div>
              <p className="mt-5 text-lg font-extrabold leading-7">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
