# مرحلة ربط القصة المعتمدة بقالب الكتاب وPDF

الفرع: `feature/story-studio-integration`

## الهدف

قراءة `generatedStory` بعد موافقة ولي الأمر، وإنشاء كتاب A4 يحتوي صفحة قصة وصفحة تلوين مطابقة لكل مشهد، مع فصل نسخة المراجعة عن النسخة النهائية.

## الملفات

- `book-print-ai-review.html`
- `public/css/book-print-v3.css`
- `public/js/book-print-v3-runtime.js`
- `public/js/story-pdf-link-runtime.js`
- `scripts/validate-book-print-review.mjs`

## قواعد الاعتماد

- لا يظهر الكتاب عند غياب `generatedStory`.
- لا يمكن التصدير قبل `parentReview.approved === true`.
- يجب أن يساوي عدد المشاهد 8 أو 12 أو 16 حسب اختيار الكتاب.
- PDF المراجعة يعمل مع أماكن الصور ووصف الإنتاج.
- PDF النهائي يبقى معطلًا حتى تكتمل صورة كل مشهد وصفحة التلوين المطلوبة.
- ملاحظات الإنتاج لا تظهر في الطباعة، وتُخفى دائمًا في PDF النهائي.

## بنية المشهد المدعومة

```json
{
  "sceneNumber": 1,
  "title": "...",
  "storyText": "...",
  "dialogue": ["..."],
  "illustrationPrompt": "...",
  "coloringPrompt": "...",
  "imageUrl": "optional",
  "coloringImageUrl": "optional"
}
```

يمكن أيضًا تخزين الصور في:

```json
{
  "generatedImages": {
    "1": {
      "story": "https://...",
      "coloring": "https://..."
    }
  }
}
```

## عدد صفحات الكتاب

- الغلاف: صفحة واحدة.
- صفحة التعريف والاعتماد: صفحة واحدة.
- قصة فقط: صفحة لكل مشهد.
- قصة وتلوين: صفحتان لكل مشهد.
- الخاتمة والتوقيع: صفحة واحدة.

كتاب من 8 مشاهد مع التلوين ينتج 19 صفحة.

## الفحص

```bash
node --check public/js/book-print-v3-runtime.js
node --check public/js/story-pdf-link-runtime.js
node scripts/validate-book-print-review.mjs
```

## ما بقي

- ربط محرك الصور الفعلي.
- رفع الصور إلى Firebase Storage أو مخزن ملفات.
- حفظ روابط الصور في `generatedImages`.
- اختبار PDF مرئيًا بعد توليد صور حقيقية.
