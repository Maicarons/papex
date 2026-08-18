# دليل الإرسال

يشرح هذا الدليل طريقتي إرسال الأوراق اللتين يدعمهما Papex، ويقدّم مرجعًا كاملاً لـ **إرسال حزمة المصدر** مع ملف البيان `papex.json` وسلسلة أدوات XeLaTeX.

---

## 1. نظرة عامة

يوفّر Papex مدخلين للإرسال لسير عمل مختلفة:

| الطريقة | المدخل | الجمهور | الخصائص |
| --- | --- | --- | --- |
| **الإرسال عبر النموذج** | صفحة الويب "إرسال → نموذج" / `POST /api/papers` | المُرسِلون العرضيون | تعبئة العنوان والملخص والمؤلفين وغيرها في المتصفح؛ **رفع ملف PDF النص الكامل مباشرة** (≤50MB) |
| **رفع حزمة المصدر** | صفحة الويب "إرسال → حزمة مصدر" / `POST /api/submit/archive` | مؤلفو LaTeX | غلّف مصادرك مع ملف بيان `papex.json` في ملف `tar.gz`؛ تقوم المنصة **بإنشاء الورقة وربط الاقتباسات وبناء PDF** تلقائيًا |

> تتشارك الطريقتان نفس منطق الإدراج (`createSubmission` + `addCitation`).
> يختلفان فقط في مصدر البيانات الوصفية وكيفية إنتاج المتن/PDF.

> **تفضّل ألّا تلمس سطر الأوامر؟** يمكنك أيضًا استخدام وحدة [التأليف عبر المتصفح](/en/guide/writespace) المدمجة لتعديل `papex.json` بصريًا، وكتابة المتن،
> و"تصدير `tar.gz`" أو "النشر بنقرة واحدة" مباشرة في المتصفح — الأرشيف الذي تنتجه
> مكافئ تمامًا لرفع حزمة مصدر.

---

## 2. الطريقة الأولى: الإرسال عبر النموذج

انقر **إرسال** في شريط التنقل العلوي، اختر تبويب **النموذج**، املأ الحقول
وانقر "إرسال الورقة":

- **العنوان**، **الملخص**
- **الفئة الأساسية** (مطلوبة، رمز من شجرة الفئات مثل `cs.LG`)،
  **الفئات المتقاطعة** (مفصولة بفواصل، اختيارية)
- **المؤلفون** (أضف ما يحتاجه عدد؛ الترتيب هو ترتيب المؤلفين)
- **رفع PDF** (اختياري): اسحب وأفلت أو اختر ملف PDF (≤50MB)؛ تخزّنه المنصة
> وتربط المراجع تلقائيًا. **DOI** (اختياري)، **الترخيص** (افتراضي `CC-BY-4.0`)،
  **ملاحظة الإصدار** (اختيارية)

تدخل الورقة حينها إلى قائمة المراجعة. يُرسَل الإرسال عبر النموذج كـ `multipart/form-data`:
يمثل `meta` سلسلة JSON للبيانات الوصفية، ويمثل `pdf` ملف PDF الاختياري.

```http
POST /api/papers
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="meta"

{"title":"…","abstract":"…","primaryCategoryId":"cs.LG","secondaryCategoryIds":["stat.ML"],"authors":[{"name":"Ming Zhang","order":0}],"doi":"","license":"CC-BY-4.0","comments":"","basePaperId":null}
--boundary
Content-Disposition: form-data; name="pdf"; filename="paper.pdf"
Content-Type: application/pdf

<binary PDF data>
--boundary--
```

> ملف PDF اختياري. عند توفيره، يخزّن الطرف نقاطه مقابل إصدار الورقة،
> ويحلل المتن، ويربط الاقتباسات داخل المنصة، ويعيد
> `{ pdfUrl, pages, referencesExtracted, referencesLinked }`. يرسل النموذج الويب هذا
> تلقائيًا؛ ويمكن لعملاء API إرسال JSON عادي (بدون `pdf`).

---

## 3. الطريقة الثانية: رفع حزمة المصدر

رفع حزمة المصدر هو **سير عمل خاص بالمؤلف**: تكتب الورقة بلغة LaTeX، وتصف
البيانات الوصفية والمراجع في ملف منظّم `papex.json`، وتغلّف كل شيء في ملف
`tar.gz` وترفعه في خطوة واحدة. يتولّى الخلفية "فك الحزم ← التحقق ← الإدراج ←
ربط الاقتباسات ← بناء PDF" من البداية إلى النهاية.

### 3.1 بنية الحزمة

أبسط تخطيط للحزمة وأكثره موصى به:

```
my-paper.tar.gz
├── papex.json            # مطلوب: بيان الورقة (بيانات وصفية + أقسام + مراجع)
├── papex-template.tex    # المستند الرئيسي (استخدم papex-template.tex المرفق مع المستودع)
├── papex.cls             # صنف المستند (اختياري؛ ينسخه الخادم من PAPEX_LATEX_DIR إن غاب)
├── references.bib        # اختياري: BibTeX مكتوب يدويًا؛ وإلا يُولَّد تلقائيًا من المراجع
└── sections/             # أقسام المتن (مقاطع .tex، المشار إليها بالترتيب في papex.json)
    ├── 00-intro.tex
    ├── 01-related.tex
    └── …
```

> يجب أن تحتوي الحزمة على **`papex.json`**؛ وإلا يُرفض الرفع (HTTP 400).

### 3.2 مرجع حقول `papex.json`

مخطط JSON الكامل موجود في [`papex-latex/papex.schema.json`](https://github.com/).
الحقول الأساسية وأهدافها:

| الحقل | النوع | مطلوب | ملاحظات / هدف قاعدة البيانات |
| --- | --- | --- | --- |
| `paper.id` | سلسلة (`YYMM.NNNNN`) | لا | إن طابق **ورقتك (أو مدير) الموجودة** → تُرسَل كإصدار جديد؛ وإلا يُسنَد معرّف ورقة جديد |
| `paper.title` | سلسلة | نعم | ← `papers.title` / `paper_versions.title` |
| `paper.abstract` | سلسلة | نعم | ← `paper_versions.abstract` |
| `paper.keywords` | string[] | لا | يُعرض بعد الملخص في PDF (لا يُخزَّن منفصلًا) |
| `paper.primaryCategoryId` | سلسلة | نعم | ← `papers.primaryCategoryId`؛ **يجب أن توجد** في جدول الفئات وإلا 400 |
| `paper.secondaryCategoryIds` | string[] | لا | ← `paper_categories` (غير الأساسية) |
| `paper.doi` | سلسلة | لا | ← `paper_versions.doi`، ويُكتب أيضًا في رسم الاقتباس (`target_doi`) |
| `paper.license` | سلسلة | لا | ← `paper_versions.license`، افتراضي `CC-BY-4.0` |
| `paper.versionNote` | سلسلة | لا | ← `paper_versions.comments` |
| `paper.subtitle` | سلسلة | لا | يُعرض أسفل العنوان في PDF |
| `paper.venue` | سلسلة | لا | يُعرض في كتلة العنوان (مثل المؤتمر/المجلة) |
| `authors[].name` | سلسلة | نعم | ← `authors` + `paper_authors` (مرتبة حسب `order`) |
| `authors[].orcid` | سلسلة | لا | حاشية سفلية للمؤلف |
| `authors[].email` | سلسلة | لا | يُستخدم كجهة اتصال للمؤلف المراسل |
| `authors[].affiliation` | سلسلة | لا | **سلسلة** ← تُحل إلى `affiliations.id` عبر `findOrCreateAffiliation` |
| `authors[].corresponding` | boolean | لا | حاشية سفلية "المؤلف المراسل" |
| `authors[].equalContribution` | boolean | لا | حاشية سفلية "مساهمة متساوية" |
| `authors[].footnote` | سلسلة | لا | حاشية سفلية نصية حرة |
| `references[].key` | سلسلة | نعم | مفتاح اقتباس BibTeX |
| `references[].doi` / `arxivId` | سلسلة | لا | يُحل إلى ورقة داخل المنصة عبر `resolveTarget`؛ وإلا يذهب `url`/`title` إلى `citations` |
| `references[].url` / `title` / `authors` / `year` / `venue` | سلسلة | لا | يملأ `citations` و`references.bib` المولَّد تلقائيًا |
| `sections[]` | string[] | نعم | قائمة مرتبة بمسارات أقسام `.tex`؛ **تقود LaTeX فقط، لا تُخزَّن في الجداول** |
| `appendices[]` | string[] | لا | قائمة مرتبة بمسارات ملاحق `.tex` |
| `acknowledgments` / `funding` | سلسلة | لا | يُعرض في قسم الشكر/التمويل في PDF |
| `build` | كائن | لا | خيارات البناء: `style` (numeric/authoryear)، `fontset` (fandol/windows/mac/ubuntu)، `passthrough` (حقول معفاة من التهريب)، إلخ. |

> **الفرق عن الإرسال عبر النموذج**: يستخدم `papex.json` قيمة `affiliation` **نصية**
> بدل `affiliationId` رقمية؛ تبحث طبقة الربط عن صف `affiliations` أو تنشئه.
> ويضيف أيضًا حقولًا خاصة بـ LaTeX هي `sections` و`references` و
> `appendices` و`build`.

### 3.3 سلسلة أدوات XeLaTeX (`papex-latex/`)

تُشحن سلسلة أدوات XeLaTeX مخصصة في [`papex-latex/`](https://github.com/):

```
papex-latex/
├── papex.cls              # صنف المستند (ctex + authblk + biblatex، صيني+إنجليزي، أوامر بيانات وصفية، ترويسات/تذييلات)
├── papex-template.tex     # المستند الرئيسي، يُدخل تلقائيًا ملفات _papex_*.tex المولَّدة والأقسام
├── papex-build.py         # بانٍ بلا اعتماديات (مكتبة قياسية فقط؛ jsonschema اختياري)
├── papex.schema.json      # عقد مخطط draft-07
├── latexmkrc              # إعداد latexmk اختياري
├── README.md              # استخدام سلسلة الأدوات
└── example/               # حزمة مثال كاملة (ورقة صينية + 5 أقسام + ملحق)
```

**أبرز ما في `papex.cls`**

- **صيني + إنجليزي**: مبنية على `ctex` (`scheme=plain`)، افتراضي `fontset=fandol` (مرفق
  مع TeX Live، يُجمَّع على الخادم مباشرة)؛ بدّل محليًا عبر
  `windows` / `mac` / `ubuntu`.
- **المؤلفون/الانتماءات**: `authblk` مع انتماءات مشتركة، وحواشٍ للمؤلف المراسل
  والمساهمة المتساوية.
- **المراجع**: `biblatex` + `biber`، قابل للاختيار بين `numeric` / `authoryear`.
- **أوامر البيانات الوصفية**: `\papexPaperId` (معرف الورقة فوق العنوان)، `\papexSubtitle`،
  `\papexVenue`، `\papexDoi` (رابط doi.org تلقائي)، `\papexVersionNote`، `\papexKeywords`
  (بعد الملخص)، `\papexLicense` (التذييل)، `\papexRunningTitle` (الترويسة).
- **مستقلة عن العلامة التجارية**: لا عبارات *preprints / arXiv*، بما يتفق مع
  اتفاقية المنتج "الخالي من arXiv".

**سير عمل `papex-build.py`**

1. اقرأ `papex.json` (قد يكون مُدخَله دليلًا / ملف json مفردًا / `.tar.gz`).
2. تحقق (يفضّل `jsonschema`، وإلا فحوصات مدمجة).
3. هرّب حقول النص العادي (`title` / `abstract` / `authors` / `affiliation` /
   `keywords` / `acknowledgments` …)، مولِّدًا `_papex_meta.tex` و`_papex_abstract.tex` و
   `_papex_sections.tex` و`_papex_backmatter.tex` و`_papex_appendices.tex` و
   `references.bib` (تُتخطى إن كان الأرشيف يرفق `references.bib` مسبقًا).
4. جمّع بـ `latexmk -xelatex` (`--emit-only` يُصدر الوسائط الوسيطة فقط،
   `--validate` يتحقق فقط).
5. تكتب ملفات القسم `.tex` يدويًا من المؤلف وتدعم LaTeX كاملاً
   (بما في ذلك الرياضيات)؛ وهي **غير مُهرَّبة**. استخدم `build.passthrough` لإعفاء
   حقول النص JSON من التهريب.

### 3.4 معاينة وبناء محليان

```bash
# ادخل حزمة المثال
cd papex-latex/example

# أصدر ملفات .tex/.bib الوسيطة فقط (لا يحتاج TeX — مفيد لفحص التهريب/البنية)
python3 ../papex-build.py . --emit-only

# تحقق من papex.json فقط
python3 ../papex-build.py . --validate

# ولّد وجمّع PDF (يتطلب TeX Live محليًا)
python3 ../papex-build.py .
```

غلّف وأرسل:

```bash
tar -czf my-paper.tar.gz papex.json papex-template.tex references.bib sections/
```

### 3.5 الرفع على الموقع

1. بعد تسجيل الدخول، انقر **إرسال** في شريط التنقل العلوي واختر
   تبويب **حزمة المصدر**.
2. اسحب ملف `tar.gz` إلى منطقة الإفلات، أو انقر لاختيار ملف (فقط `.tar.gz` /
   `.tgz`، ≤ 50MB).
3. انقر "رفع وإرسال"؛ تعيد المنصة معرّف الورقة والإصدار، مع
   ملاحظات المعالجة (مثل بناء PDF في الخلفية).
4. انقر "عرض الورقة" للانتقال إلى صفحة الورقة التي أُنشئت.

---

## 4. المعالجة من البداية إلى النهاية (الخلفية)

بعد الرفع، تعالج الخلفية الحزمة كما يلي (المصدر تحت
`src/lib/latex/`):

```
author ──tar.gz──> POST /api/submit/archive (multipart: file)
                         │
                         ▼
                  ① unpack (tar.ts)
                     gunzip بلا اعتماديات + محلل ustar/GNU/PAX، حارس منع تجاوز المسار
                         │
                         ▼
                  ② اقرأ papex.json ← coerceManifest() يتحقق من الحقول المطلوبة
                         │
                         ▼
                  ③ mapToCreatePaperInput()
                     · primaryCategoryId يجب أن توجد (وإلا 400)
                     · سلسلة affiliation ← affiliations.id (findOrCreateAffiliation)
                     · paper.id يطابق ورقة خاصة/ذات صلاحية ← إصدار جديد
                         │
                         ▼
                  ④ createSubmission() يُدرج (يعيد استخدام المعاملة الحالية)
                         │
                         ▼
                  ⑤ mapReferencesToCitations() ← addCitation() يربط رسم الاقتباس
                         │
                         ▼
                  ⑥ بناء XeLaTeX اختياري (latexmk الخادم)
                     ← savePdfBuffer() يخزّن ← يحدّث paper_versions.pdfUrl
                     (غياب latexmk ← تحذير فقط، لا يتأثر الإدراج)
                         │
                         ▼
                 يعيد { paperId, version, warnings, pdfUrl? }
```

**الوحدات الرئيسية**

| الملف | المسؤولية |
| --- | --- |
| `src/lib/latex/tar.ts` | `gunzip` بلا اعتماديات + `parseTar` (ustar / أسماء GNU الطويلة / ترويسات PAX الموسّعة)، `writeEntries` مع حارس منع تجاوز المسار |
| `src/lib/latex/papex-json.ts` | أنواع `PapexManifest`، `coerceManifest`، `mapToCreatePaperInput`، `mapReferencesToCitations` |
| `src/lib/latex/papex-archive.ts` | تنسيق `processSubmissionArchive`؛ `buildAndStorePdf` يكشف `latexmk` ويجمّع/يخزّن PDF |
| `src/app/api/submit/archive/route.ts` | يقبل `multipart/form-data` `file` (≤50MB)، يوثّق، يربط الأخطاء بحالة HTTP |

**تعيين رموز الخطأ (HTTP)**

| الخطأ الداخلي | HTTP | المعنى |
| --- | --- | --- |
| `MANIFEST_MISSING` | 400 | الأرشيف يفتقر إلى `papex.json` |
| `MANIFEST_JSON_INVALID` | 400 | `papex.json` ليس JSON صالحًا |
| `MANIFEST_INVALID:…` | 400 | حقل مطلوب مفقود (title/abstract/primaryCategoryId/authors/sections) |
| `CATEGORY_NOT_FOUND:cs.X` | 400 | رمز الفئة غير موجود |
| `ARCHIVE_PARSE_FAILED` / `ARCHIVE_EMPTY` | 400 | الأرشيف تالف أو فارغ |
| `FORBIDDEN` | 403 | غير مسموح بإرسال إصدار جديد من تلك الورقة |
| `PAPER_NOT_FOUND` | 404 | الورقة الهدف المعلنة للإصدار الجديد غير موجودة |
| غير ذلك | 500 | خطأ داخلي (بما في ذلك `ID_GENERATION_FAILED`) |

---

## 5. مرجع API

### `POST /api/papers`

طرف إرسال النموذج. الطلب `multipart/form-data` (انظر
[القسم 2](#2-method-1-form-submission)): الحقل `meta` سلسلة JSON للبيانات الوصفية،
والحقل `pdf` هو ملف PDF الاختياري (≤50MB). يتطلب توثيقًا. يعيد `{ paperId, version }`،
وعند رفع PDF، إضافة `pdf: { pdfUrl, pages, referencesExtracted, referencesLinked }`.
ويمكن لعملاء API إرسال JSON عادي (بدون `pdf`).

### `POST /api/submit/archive`

طرف حزمة المصدر.

- **التوثيق**: مطلوب (ملف تعريف ارتباط).
- **الطلب**: `multipart/form-data`، الحقل `file` هو `tar.gz` (≤ 50MB).
- **النجاح (201)**:

  ```json
  {
    "paperId": "2608.00007",
    "version": 1,
    "warnings": [],
    "pdfUrl": "https://…/api/papers/2608.00007/pdf/1"
  }
  ```

- **الفشل**: JSON برسالة الخطأ المناظرة؛ حالات الخطأ وفق
  [جدول الأخطاء](#4-end-to-end-processing-backend).

---

## 6. النشر والعمليات

- **TeX Live**: يحتاج الخادم إلى `texlive` (مع `xelatex` و`biber` و`latexmk`) و
  `collection-langchinese` ليكون خط `fandol` متاحًا.
- **متغيرات البيئة**:
  - `PAPEX_LATEX_BIN`: مسار latexmk (افتراضي `PATH`).
  - `PAPEX_LATEX_DIR`: الدليل الحاوي لـ `papex.cls`؛ يُنسخ عندما تغفله الحزمة.
- **الصندوق المعزول والموارد**: شغّل تجميع LaTeX في بيئة معزولة بحدود
  CPU/ذاكرة/مهلة، وعطّل **`\write18` (الهروب إلى الصدفة)** والوصول للشبكة
  لمنع المصادر الخبيثة من تنفيذ الأوامر.
- **غير متزامن**: التجميع بطيء؛ في الإنتاج يُفضَّل **طابور غير متزامن** (يعيد
  `paperId` فورًا، ويعاود الاتصال لتحديث `pdfUrl` عند جاهزية PDF) لتفادي
  حجب الطلب.
- **التدهور عند الغياب**: إن تعذّر `latexmk`، يسجّل `processSubmissionArchive`
  تحذيرات ويتخطى بناء PDF؛ ويظل الإدراج وربط الاقتباسات يعملان.
- **تخزين PDF**: يعيد استخدام `savePdfBuffer` (مسار البث
  `/api/papers/{id}/pdf/{version}`)؛ لا حاجة لطبقة تخزين جديدة.

---

## 7. الأمان

- **تجاوز المسار**: يتحقق `writeEntries` من المسار الحقيقي لكل مدخل بـ
  `path.relative`، مرفوضًا `..` والمسارات المطلقة؛ و`parseTar` يزيل `./` البادئة.
- **حد الحجم**: يحدّ الطرف `file` عند ≤ 50MB.
- **إساءة استخدام الموارد**: للتجميع حدود مهلة/موارد؛ ضع في الاعتبار تحديد المعدل لكل مستخدم.
- **الهروب إلى الصدفة**: أمر التجميع لا يمرّر `-shell-escape`، مانعًا المصادر من تنفيذ أوامر النظام.

---

## 8. الأسئلة الشائعة

**س: هل تكرر حزمة المصدر بيانات إرسال النموذج؟**
لا. كلاهما يشارك نفس منطق الإدراج؛ يختلف فقط مصدر البيانات الوصفية.

**س: هل يجب أن أستخدم قالب XeLaTeX؟**
يحدد `papex.cls` و`papex-template.tex` تخطيط PDF النهائي؛ أنت تكتب فقط
ملفات القسم `.tex` و`papex.json`. إن غفلت الحزمة `papex.cls`، يستخدم الخادم
النسخة من `PAPEX_LATEX_DIR`.

**س: هل يمكنني استخدام الرياضيات والأشكال والأوامر المخصصة في الأقسام؟**
نعم. تُكتب ملفات القسم `.tex` يدويًا وتدعم LaTeX كاملاً، **غير مُهرَّبة**. ضع
أوامر الديباجة المخصصة في ملفات الأقسام أو `papex-template.tex`.

**س: لا أرى PDF مباشرة بعد الإرسال؟**
إن لم يُهيّأ TeX Live على جانب الخادم، يكون `pdfUrl` فارغًا وتشير الصفحة إلى "يُبنى PDF في الخلفية". هيئه وأعد الإرسال؛ وفي الإنتاج اقترنه بطابور غير متزامن.

**س: كيف أرسل إصدارًا جديدًا من ورقة؟**
عيّن `paper.id` في `papex.json` إلى معرّف ورقتك الموجودة (ويجب أن تكون لديك صلاحية إرسال عليها)؛ فتُدرجها المنصة كإصدار جديد.

**س: كيف تُربط الاقتباسات تلقائيًا؟**
تُحل `doi` / `arxivId` في مصفوفة `references` إلى أوراق داخل المنصة عبر
`resolveTarget` وتُنشأ حافة اقتباس؛ وتُخزَّن المدخلات الأخرى كـ
`url` / `title` في رسم الاقتباس.
