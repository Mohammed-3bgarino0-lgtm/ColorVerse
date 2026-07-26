# تخزين ColorVerse على Google Drive

الفرع: `feature/story-studio-integration`

آخر تحديث: 26 يوليو 2026

## المجلد الرئيسي المعتمد

```text
مكتبة_الأطفال_والناشئة_ColorVerse
ID: 1YuDr40M0bUeIiscayhIfPLWvuJ8uYdlO
```

هذا المجلد خاص وغير منشور للعامة.

## مكتبة المراجع

```text
Google_Drive_Children_Library
ID: 1rTIbIYwA9JtI0Ls8q9am-pag6Ca8PfCu
```

كتالوج الملفات الحالي:

```text
Google_Drive_Catalog.json
ID: 1D-fWm8J_X0RETu-KgatsoAVUOOkOXLSK
```

المراجع تُستخدم لاستخراج البناء العام والإيقاع ومستوى القراءة والقيمة التربوية فقط. لا يسمح بنسخ النصوص أو الشخصيات أو ترتيب المشاهد أو الرسومات.

الكتالوج الحالي يسجل أسماء الملفات وتصنيفاتها، لكنه لا يحتوي بعد على التحليل الدلالي الكامل لكل قصة. لذلك يلزم لاحقًا تشغيل مرحلة استخراج وفهرسة تضيف العمر والموضوع والقيمة والبنية السردية لكل مرجع قبل استخدامه تلقائيًا في التوليد.

## الكتب الناتجة

```text
ColorVerse_الكتب_المنتجة
ID: 1-Kcu6dJUJiIQK0ms5xSgUuS_hQ_KSLx2
```

المجلدات الفرعية:

| الاستخدام | المجلد | ID |
|---|---|---|
| PDF نسخة القصة النهائية | `01_نسخة_القصة` | `107zjrQY0tgrCMUMAH8c2onaZEMMaTd_y` |
| PDF نسخة التلوين النهائية | `02_نسخة_التلوين` | `15TQ-A6BfjiN1eKyRg2r_tWU2ltZWwYIc` |
| شخصية البطل والغلاف وصور المشاهد والتلوين | `03_أصول_الصور` | `1FHD5BQAixH2cIhlsIC54uBI-aLYwy0vm` |
| ملفات المراجعة والمسودات | `04_المسودات_والمراجعات` | `1SAFqnb0vGIb-nlz1a2wgUQR8-iyNbDg0` |
| JSON وفهارس الكتب | `05_البيانات_والفهارس` | `1hcd7BP2Vz_eCCs9S7tBg6K2z8Vu5q3KA` |

ملف إعداد Drive المحفوظ داخل مجلد البيانات:

```text
ColorVerse_Drive_Config.json
ID: 1BpxVV3rqTgSw3DyrZ8phd8wdleNV46jY
```

## ما يحفظه النظام

### أثناء إنتاج الصور

عند ضبط Google Drive على الخادم، تحفظ طبقة `GoogleDriveStoryImageStorage` مباشرة:

- صورة البطل الثابتة.
- الغلاف.
- صورة القصة الملونة لكل مشهد.
- رسمة التلوين المطابقة لكل مشهد.

وتعيد الواجهة الصور عبر مسار خادم خاص:

```text
/api/drive/files/<FILE_ID>/content
```

المسار يمنع الوصول إلى أي ملف خارج مجلدات ColorVerse المعتمدة.

### بعد اكتمال الكتاب

يظهر زر:

```text
حفظ في Drive
```

ويعمل فقط عندما:

- وافق ولي الأمر.
- اكتملت الأصول الإنتاجية.
- أصبح زر PDF النهائي مفعّلًا.

المسارات:

```http
POST /api/drive/books/:bookId/story/final
POST /api/drive/books/:bookId/coloring/final
POST /api/drive/books/:bookId/manifest
```

نسخة القصة ونسخة التلوين تحفظان في مجلدين منفصلين. يحفظ ملف manifest بيانات الطفل والقصة والمراجعة وملف Drive الناتج من دون تخزين مفتاح API في المتصفح.

## تشغيل حساب الخدمة

أضف على الخادم:

```env
GOOGLE_DRIVE_CLIENT_EMAIL=<service-account-email>
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

ثم شارك المجلد الرئيسي التالي مع بريد حساب الخدمة بصلاحية **محرر**:

```text
1YuDr40M0bUeIiscayhIfPLWvuJ8uYdlO
```

لا تضع المفتاح الخاص داخل GitHub أو ملفات المتصفح. يوضع فقط في Secrets أو إعدادات خدمة الاستضافة.

## التراجع الآمن

عند غياب بيانات اعتماد Drive:

- الصور تعود إلى تخزين الخادم المحلي `generated-assets`.
- تنزيل PDF المحلي يبقى ممكنًا.
- زر الحفظ في Drive يعرض أن الخادم غير مربوط.
- لا تتسرب أي بيانات اعتماد إلى المتصفح.

## الفحص

```bash
npm run validate:drive-storage
npm run quality:stories
```

الفحص ثابت ولا يتصل بحساب Drive ولا يستهلك Gemini. التشغيل الحقيقي يحتاج بيانات اعتماد وحساب خدمة مشتركًا معه المجلد.
