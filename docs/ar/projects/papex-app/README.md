# تطبيق Papex

> العميل الرسمي للجوال لمنصة الأدبيات الأكاديمية Papex — Android · HarmonyOS · iOS

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20HarmonyOS%20%7C%20iOS-lightgrey.svg)]()
[![React Native](https://img.shields.io/badge/React%20Native-0.82-61dafb.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

تطبيق Papex هو العميل الرسمي للجوال لـ [Papex](https://github.com/Maicarons/papex)، وهي منصة أدبيات أكاديمية مفتوحة المصدر. صُمّم كـ **بديل جوال للنسخة الويب**: اقرأ الأوراق، وأدر حسابك، وابقَ على اطلاع — في أي مكان.

مبني بـ **React Native 0.82 + RNOH 0.82.30** (تكيّف HarmonyOS)، يتشارك قاعدة كود واحدة عبر Android وHarmonyOS وiOS (~95% من كود العمل مشترك).

> ⚠️ **الاعتماد**: يستهلك هذا التطبيق واجهة برمجة تطبيقات خادم Papex. انشر [خلفية Papex](https://github.com/Maicarons/papex) أولًا.

---

## الميزات

| الأولوية | الميزة | الحالة |
| --- | --- | --- |
| P0 | تسجيل الدخول / التسجيل / الخروج، تبديل الحسابات المتعددة، إدارة الأجهزة (إبطال عن بُعد) | مخطط |
| P0 | التغذية الرئيسية، شجرة الفئات (257 فئة ثنائية اللغة)، ترقيم الصفحات | مخطط |
| P0 | البحث بالكلمات المفتاحية + البحث الدلالي (`/api/search?semantic=1`) | مخطط |
| P0 | تفاصيل الورقة، تبديل الإصدار، قراءة PDF مع تذكّر التقدّم | مخطط |
| P0 | الإشارات المرجعية، الاشتراكات، الرسائل/التذاكر/التعليقات داخل التطبيق | مخطط |
| P0 | الملف الشخصي، التزكيات، واجهة ثنائية اللغة (zh/en)، الوضع الداكن | مخطط |
| P1 | تنزيل PDF دون اتصال، تخزين البيانات الوصفية المؤقت، التصفّح دون اتصال | مخطط |
| P1 | مزامنة تقدّم القراءة عبر الأجهزة، إشعارات الدفع (FCM / APNs / PushKit) | مخطط |
| P1 | فتح بالبصمة، إدارة مفاتيح API، حالات الهيكل العظمي/الخطأ/الفارغ | مخطط |
| P2 | التعليقات، التزكيات، التوصيات، ورقة المشاركة النظامية، إحصاءات القراءة | مخطط |
| P3 | تسجيل الدخول عبر رمز QR (ويب ↔ تطبيق)، تخطيط للوحي، عرض التعليقات للقراءة فقط | مخطط |

> ميزات الإدارة/الإشراف مقصودة **عدم** إدراجها في عميل الجوال — استخدم نسخة الويب لذلك.

---

## المنصات

| المنصة | القناة | الحالة |
| --- | --- | --- |
| Android (minSdk 24+) | Google Play / متاجر الصين | مخطط |
| iOS (15+) | App Store | مخطط |
| HarmonyOS (API 12+) | AppGallery | مخطط |

---

## التثبيت

### الملفات التنفيذية المبنية مسبقًا

نزّل من صفحة [الإصدارات](https://github.com/Maicarons/papex-app/releases) (بمجرد النشر)، أو ثبّت من متجر اختيارك.

### من المصدر

المتطلبات المسبقة:

- Node.js 20+
- Android SDK (minSdk 24) لبناء Android
- Xcode 15+ (macOS) لبناء iOS
- DevEco Studio 5.x (API 12+) + مشروع AGC لبناء HarmonyOS

```bash
git clone https://github.com/Maicarons/papex-app.git
cd papex-app
npm install

# توليد أنواع API من وثيقة OpenAPI لخادم Papex
npm run gen:types

# تهيئة عنوان URL الأساسي للـ API
cp .env.example .env

# التشغيل على Android
npm run android

# التشغيل على iOS (macOS فقط)
cd ios && pod install && cd ..
npm run ios

# التشغيل على HarmonyOS: افتح harmony/ في DevEco Studio، ووقّع عبر AGC، وشغّل على جهاز/محاكي
```

متغيرات البيئة (`.env`):

| المتغير | الوصف | الافتراضي |
| --- | --- | --- |
| `API_BASE_URL` | عنوان URL الأساسي لخادم Papex | `https://api.papex.example.com` |
| `PUSH_ENABLED` | تفعيل تسجيل الدفع | `true` |
| `I18N_FALLBACK` | لغة التراجع | `zh` |

---

## التطوير

```bash
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm test              # اختبارات الوحدة (Jest + RNTL، التغطية)
npm run e2e:ios       # Detox E2E (محاكي iOS)
npm run e2e:android   # Detox E2E (محاكي Android)
npm run gen:types     # إعادة توليد أنواع API من openapi.json
npm run sync:i18n     # مزامنة قواميس zh/en من مستودع Papex
```

تغطية الاختبار: تستهدف اختبارات الوحدة تغطية ≥80% للعبارات على الوحدات الأساسية (`lib/api` و`lib/security` و`lib/storage` والمتاجر)؛ ويغطي E2E تدفقات P0 (التوثيق ← التصفّح ← القراءة ← الإشارة المرجعية ← الاشتراك ← الأجهزة). تُغطى سيناريوهات الأجهزة المتعددة معًا مع عميل سطح المكتب (انظر [خطة التطوير](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md)).

---

## البنية (أبرز النقاط)

- **التوثيق**: رمز وصول (JWT، 15 دقيقة) + رمز تحديث (30 يومًا، دوّار، مرتبط بالجهاز). تعيش الرموز في تخزين نظام التشغيل الآمن: Keychain (iOS) / Keystore (Android) / HUKS (HarmonyOS).
- **البيانات**: MMKV لجلسة/تفضيلات/ذاكرة التخزين المؤقت؛ ملفات PDF مخزّنة مؤقتًا في صندوق الرمل للتطبيق مع إخلاء LRU.
- **التعريب**: i18next، قواميس zh/en المزامنة من مستودع Papex.
- **الأنواع**: مولّدة من `openapi.json` لخادم Papex — لا تُكتب يدويًا أبدًا.

طالع [`docs/development/papex-app.md`](https://github.com/Maicarons/papex/blob/main/docs/development/papex-app.md) في مستودع Papex لخطة التطوير الكاملة.

---

## المشاريع ذات الصلة

- [Papex](https://github.com/Maicarons/papex) — منصة الخلفية (Next.js + PostgreSQL)
- [Papex Desktop](https://github.com/Maicarons/papex-desktop) — ورشة بحث لسطح المكتب (Tauri 2)

---

## الترخيص

[Apache-2.0](LICENSE) — حقوق الطبع والنشر 2026 لـ The Papex Authors.
