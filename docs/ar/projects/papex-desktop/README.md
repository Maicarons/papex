# Papex Desktop

> ورشة بحث لسطح المكتب لمنصة الأدبيات الأكاديمية Papex — Windows · Linux · macOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24c8db.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

يحوّل Papex Desktop [Papex](https://github.com/Maicarons/papex) — منصة أدبيات أكاديمية مفتوحة المصدر — إلى **ورشة بحث** كاملة على سطح مكتبك: مكتبة محلية أولًا، وقراءة PDF عميقة مع تمييز وملاحظات، وإدارة الاقتباسات، والبحث في النص الكامل دون اتصال، والمزامنة السحابية.

مبني بـ **Tauri 2.x** (نواة Rust + WebView النظام) و**Vite + React 19**، يُوزَّع كتطبيق أصلي خفيف (مثبّت ≈5–15 MB، ذاكرة 30–50 MB).

> ⚠️ **الاعتماد**: يستهلك هذا التطبيق واجهة برمجة تطبيقات خادم Papex. انشر [خلفية Papex](https://github.com/Maicarons/papex) أولًا.

---

## الميزات

| الأولوية | الميزة | الحالة |
| --- | --- | --- |
| P0 | تسجيل الدخول / الخروج / الحسابات المتعددة (الرموز في مخزن نظام التشغيل) | مخطط |
| P0 | مكتبة ثلاثية الألواح: 257 فئة ثنائية اللغة / قائمة / تفاصيل، فلاتر وترتيب | مخطط |
| P0 | بحث الكلمات المفتاحية عبر الإنترنت + البحث الدلالي (`/api/search?semantic=1`) | مخطط |
| P0 | قارئ PDF (pdf.js): ترقيم، تكبير، بحث، إشارات، تقدّم، عكس داكن | مخطط |
| P0 | تمييز (متعدد الألوان) + ملاحظات نصية، SQLite محلي + مزامنة سحابية | مخطط |
| P0 | ذاكرة مؤقتة PDF دون اتصال، قراءة دون اتصال، إدارة الذاكرة المؤقتة | مخطط |
| P0 | رسم اقتباس تفاعلي (ECharts)، إشعارات الاشتراك | مخطط |
| P0 | صينية النظام، اختصارات عامة (Ctrl/Cmd+K)، قفل نسخة واحدة | مخطط |
| P1 | توليد الاقتباس (CSL: GB/T 7714، APA، MLA، …)، تصدير BibTeX / RIS | مخطط |
| P1 | تكامل LaTeX (`\cite{key}` + كتلة المراجع، عبر papex-latex) | مخطط |
| P1 | **رفع الملفات والصور**: إرسال الورقة، استيراد PDF محلي، الصورة الرمزية، غلاف الورقة | مخطط |
| P1 | عمليات بحث محفوظة (مجلدات ذكية)، وسوم جماعية، إحصاءات القراءة، قراءة بجزأين | مخطط |
| P2 | فهرس نص كامل محلي (tantivy)، بحث ميلي ثانية دون اتصال | مخطط |
| P2 | عرض التعاون (المراجعة المشتركة / التزكيات / التعليقات، للقراءة فقط) | مخطط |
| P3 | تضمينات محلية اختيارية (Ollama) للبحث الدلالي دون اتصال، نموذج إضافة أولي | مخطط |

> ميزات الإدارة/الإشراف مقصودة **عدم** إدراجها في عميل سطح المكتب — استخدم نسخة الويب لذلك.

---

## المنصات

| المنصة | الأداة | القناة |
| --- | --- | --- |
| Windows 10+ | NSIS / MSI | تنزيل من الموقع + winget (اختياري) |
| macOS 11+ | .dmg (معرّف المطوّر + التوثيق) | الموقع + App Store (اختياري) |
| Linux (WebKitGTK 2.44+) | .deb / AppImage / .rpm | الموقع + مستودعات التوزيعات (لاحقًا) |

---

## التثبيت

### الملفات التنفيذية المبنية مسبقًا

نزّل مثبّت منصتك من صفحة [الإصدارات](https://github.com/Maicarons/papex-desktop/releases) (بمجرد النشر).

### من المصدر

المتطلبات المسبقة:

- Node.js 20+ وpnpm 9+
- سلسلة أدوات Rust (مستقرة)
- Windows: WebView2 (مثبّت مسبقًا على Win10/11)؛ Linux: `libwebkit2gtk-4.1-dev` وغيرها (انظر أدناه)

```bash
git clone https://github.com/Maicarons/papex-desktop.git
cd papex-desktop
pnpm install

# توليد أنواع API من وثيقة OpenAPI لخادم Papex
pnpm gen:types

# تهيئة عنوان URL الأساسي للـ API
cp .env.example .env

# التطوير (HMR للواجهة + نافذة Tauri)
pnpm tauri dev

# البناء للمنصة الحالية
pnpm tauri build
```

اعتماديات Linux (Debian/Ubuntu):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

متغيرات البيئة (`.env`):

| المتغير | الوصف | الافتراضي |
| --- | --- | --- |
| `API_BASE_URL` | عنوان URL الأساسي لخادم Papex | `https://api.papex.example.com` |
| `I18N_FALLBACK` | لغة التراجع | `zh` |
| `CACHE_LIMIT_MB` | حد ذاكرة PDF المحلية المؤقتة (MB) | `2048` |

---

## التطوير

```bash
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # اختبارات وحدة الواجهة (Vitest، التغطية)
cargo test           # اختبارات وحدة Rust (في src-tauri)
cargo clippy         # فحوص Rust (CI يفرض -D warnings)
pnpm e2e             # Playwright E2E مقابل خلفية Papex محلية
pnpm gen:types       # إعادة توليد أنواع API من openapi.json
pnpm sync:i18n       # مزامنة قواميس zh/en من مستودع Papex
```

تغطية الاختبار: الواجهة ≥80% للعبارات على الوحدات الأساسية؛ Rust ≥85% على `commands/*` و`db/*` و`indexer/*`؛ ويغطي E2E تدفقات P0 (التوثيق ← المكتبة ← القراءة ← التعليق ← دون اتصال ← الرفع). تُغطى سيناريوهات الأجهزة المتعددة (سطح المكتب ↔ الجوال ↔ الويب) معًا مع عميل الجوال — انظر [خطة التطوير](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md).

---

## البنية (أبرز النقاط)

- **التوثيق**: رمز وصول (JWT، 15 دقيقة) + رمز تحديث (30 يومًا، دوّار، مرتبط بالجهاز). تعيش الرموز في مخزن نظام التشغيل: Windows Credential Manager / macOS Keychain / Linux Secret Service (تراجع للملف).
- **محلي أولًا**: SQLite `papex_local.db` للذاكرة المؤقتة / التعليقات / التقدّم / طابور المزامنة؛ tantivy لفهرس النص الكامل دون اتصال (P2).
- **الرفوعات**: إرسال واستيراد PDF، والصورة الرمزية، وغلاف الورقة — تُتحقق في Rust، وتُرفع إلى خادم Papex مع تقدّم وإعادة محاولة.
- **الأنواع**: مولّدة من `openapi.json` لخادم Papex — لا تُكتب يدويًا أبدًا.

طالع [`docs/development/papex-desktop.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-desktop.md) في مستودع Papex لخطة التطوير الكاملة.

---

## المشاريع ذات الصلة

- [Papex](https://github.com/Maicarons/papex) — منصة الخلفية (Next.js + PostgreSQL)
- [Papex App](https://github.com/Maicarons/papex-app) — عميل الجوال الرسمي (React Native + RNOH)

---

## الترخيص

[Apache-2.0](LICENSE) — حقوق الطبع والنشر 2026 لـ The Papex Authors.
