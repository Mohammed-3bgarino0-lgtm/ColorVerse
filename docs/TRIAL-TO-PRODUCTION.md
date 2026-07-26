# ColorVerse — من التجربة الآمنة إلى التشغيل الإنتاجي

الفرع: `feature/story-studio-integration`

## الوضع الحالي

ملف `.env.example` مضبوط للتجربة الآمنة:

```env
COLORVERSE_RUNTIME_MODE=trial
COLORVERSE_ENABLE_LIVE_AI=false
COLORVERSE_ENABLE_DRIVE_WRITES=false
```

في هذا الوضع:

- تعمل واجهات الاستوديو والمعاينة والاختبار الآمن.
- يمكن تحميل كتاب وهمي من 8 مشاهد داخل المتصفح.
- لا يرسل الخادم طلبات مدفوعة إلى Gemini.
- لا يرفع أو يعدل ملفات Google Drive.
- الصور التجريبية تحمل `productionReady: false`.
- PDF النهائي والحفظ النهائي في Drive يبقيان مغلقين.

## بدء التجربة محليًا

```bash
npm install
npm run setup:trial
npm run start:trial
```

ثم افتح:

```text
http://localhost:3000/system-readiness.html
```

نفّذ بالترتيب:

1. `تشغيل الاختبار الآمن`.
2. `تحميل بيانات التجربة`.
3. مراجعة القصة من `create-ai-review.html`.
4. مراجعة الصور من `image-review.html`.
5. فتح نسختي القصة والتلوين للمراجعة.

## البيانات التجريبية القابلة للتغيير

الملف:

```text
public/data/colorverse-trial-draft.json
```

يمكن تغيير البيانات غير السرية التالية بعد التجربة:

- `childName`
- `age`
- `heroName`
- `template`
- `childStory`
- `moral`
- عنوان القصة والمشاهد والنصوص والحوارات

لا تغيّر في ملف التجربة:

```json
"trialData": true,
"productionReady": false,
"imageReview": { "approved": false }
```

فهذه القيم تمنع اعتماد البيانات الوهمية ككتاب إنتاجي.

## التحويل إلى التشغيل الحقيقي

ضع القيم الحقيقية في ملف `.env` الخاص أو في Secrets الاستضافة فقط:

```env
GEMINI_API_KEY=<REAL_SERVER_KEY>
GOOGLE_DRIVE_CLIENT_EMAIL=<SERVICE_ACCOUNT_CLIENT_EMAIL>
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

شارك مجلد ColorVerse الرئيسي مع بريد حساب الخدمة بصلاحية محرر، ثم غيّر:

```env
COLORVERSE_ENABLE_LIVE_AI=true
COLORVERSE_ENABLE_DRIVE_WRITES=true
COLORVERSE_RUNTIME_MODE=production
```

يفضل تفعيل المفاتيح تدريجيًا:

1. فعّل `COLORVERSE_ENABLE_LIVE_AI=true` واختبر قصة واحدة من 8 مشاهد.
2. راجع الصور والتكلفة.
3. فعّل `COLORVERSE_ENABLE_DRIVE_WRITES=true` واختبر رفع ملف واحد.
4. بعد نجاح المسار كاملًا غيّر الوضع إلى `production`.

## القيم التي تبقى كما هي

معرّفات Drive الحالية جاهزة في `.env.example`، ومنها:

```text
المجلد الرئيسي: 1YuDr40M0bUeIiscayhIfPLWvuJ8uYdlO
نسخة القصة: 107zjrQY0tgrCMUMAH8c2onaZEMMaTd_y
نسخة التلوين: 15TQ-A6BfjiN1eKyRg2r_tWU2ltZWwYIc
أصول الصور: 1FHD5BQAixH2cIhlsIC54uBI-aLYwy0vm
المسودات: 1SAFqnb0vGIb-nlz1a2wgUQR8-iyNbDg0
الفهارس: 1hcd7BP2Vz_eCCs9S7tBg6K2z8Vu5q3KA
```

لا يلزم تغيير هذه المعرّفات إلا عند نقل المكتبة إلى مجلدات جديدة.

## الأمان

- `.env` و`.env.*` مستبعدة من Git، باستثناء `.env.example`.
- القيم الفارغة أو `CHANGE_AFTER_TRIAL` أو `CHANGE_ME` أو `REPLACE_ME` لا تُعامل كبيانات اعتماد حقيقية.
- الواجهة لا تستقبل المفتاح الخاص ولا تحفظه في `localStorage`.
- زر Drive النهائي يحتاج اعتماد ولي الأمر واعتماد الصور واكتمال الأصول الإنتاجية.
