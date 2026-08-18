# API

يكشف Papex مجموعة من واجهات HTTP JSON تحت `/api`.

## المرجع التفاعلي

مواصفة **OpenAPI 3.1** كاملة قابلة للقراءة الآلية تُخدَّم على
[`/api/openapi.json`](/api/openapi.json)، ومستكشف تفاعلي قادر على التجربة
(مدعوم بـ [Scalar](https://scalar.com)) متاح على
**[/api-docs](/api-docs)**. افتحه لتتصفّح كل طرف، وتفحص مخططات الطلب والاستجابة، وترسل طلبات حية من متصفحك.

## إبقاء التوثيق متزامنًا (أولوية للكود)

تُولَّد وثيقة OpenAPI **من الكود**، لا تُكتب يدويًا. يملك كل مسار جزءًا شقيقًا `route.openapi.ts`
وهو المصدر الوحيد لحقيقة توثيق ذلك الطرف. الجزء الثابت (info، `components/schemas`،
`components/responses`، security) يعيش في `src/lib/openapi/base.ts`.

يقوم المولّد (`src/lib/openapi/generate.ts`) بمسح كل جزء، ودمجه في الأساس، وكتابة `src/lib/openapi/spec.generated.ts` — الملف الذي يخدمه `/api/openapi.json`.

```bash
# إعادة التوليد بعد تحرير جزء (/api/openapi.json + تحديث /api-docs)
npm run openapi:generate
```

هذا موصول في `predev` و`prebuild`، فتُعاد بناء المواصفة دائمًا قبل
`next dev` / `next build`. **لا تُحرّر `spec.generated.ts` يدويًا أبدًا** — يُكتب فوقه في كل تشغيل.

### توثيق طرف جديد

عند إضافة معالج مسار `src/app/api/foo/bar/route.ts`، أنشئ جزءًا شقيقًا
`route.openapi.ts`:

```ts
export default {
  "/api/foo/bar": {
    get: {
      tags: ["Discovery"],
      summary: "Describe what it does",
      // security: []            // احذف للطرف العام
      responses: {
        200: { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
      },
    },
  },
} as const;
```

شغّل `npm run openapi:generate` (أو فقط ابدأ/ابنِ) فيظهر الطرف في
`/api/openapi.json` و`/api-docs` تلقائيًا. المخططات المشتركة تعيش في
`src/lib/openapi/base.ts` (مثل `#/components/schemas/PaperListItem`).

## التوثيق

هناك طريقتان للتوثيق:

1. **ملف تعريف ارتباط الجلسة** (`papex_session`) — يُصدر عند تسجيل الدخول ويستخدمه
   المتصفح. يُرسل تلقائيًا للطلبات من نفس المصدر.
2. **مفتاح API** (`Authorization: Bearer pk_…`) — للنصوص البرمجية و
   التكاملات الخارجية. أنشئ المفاتيح من **الإعدادات ← مفاتيح API**
   (`/settings/api-keys`). يُربط المفتاح بحسابك ويرث صلاحيات RBAC
   لدورك، فكل طرف يعمل مع ملف تعريف الارتباط يعمل مع مفتاح API أيضًا. يُعرض السر الخام
   **مرة واحدة فقط** عند الإنشاء؛ ويُخزَّن فقط تجزئته SHA-256.

مثال طلب بمفتاح API:

```bash
curl -H "Authorization: Bearer pk_live_xxxx" https://your-host/api/papers?pageSize=1
```

الطرق العامة (غير الموثّقة) — مثل سرد الأوراق والبحث والفئات والمؤلفين والفحص الصحي —
تعمل للمتصلين المجهولين وملفات تعريف الارتباط ومفاتيح API على حد سواء.

## Auth

- `POST /api/auth/register` — تسجيل `{username, email, displayName, password}`
- `POST /api/auth/login` — تسجيل دخول `{identifier, password}`
- `POST /api/auth/logout` — تسجيل خروج
- `GET /api/auth/me` — المستخدم الحالي

## مفاتيح API

- `GET /api/settings/api-keys` — سرد مفاتيحك
- `POST /api/settings/api-keys` — إنشاء مفتاح `{name, scopes?:["read"|"write"], environment?:"live"|"test", expiresAt?:ISODate|null}`
- `DELETE /api/settings/api-keys?id=<keyId>` — إبطال مفتاح

## الأوراق (Papers)

- `GET /api/papers` — سرد. معاملات الاستعلام: `q` (نص كامل أو مسبوق بـ `title:`/`au:`/`abs:`/`cat:`)، `category`، `tag`، `sort` (`new` | `updated` | `by_citations`)، `from` (تاريخ ISO، أوراق أنشئت في/بعد فقط)، `page`، `pageSize`. الصفوف تتضمن `citationCount` محسومًا.
- `GET /api/papers/:id` — التفاصيل (تتضمن `submitter` و`tags` و`commentCount`)
- `GET /api/papers/:id/comments` — التعليقات
- `GET /api/papers/:id/citations` — رسم الاقتباس `{ outgoing, incoming }`
- `GET /api/papers/:id/tags` — وسوم الورقة
- `POST /api/papers` — إرسال (يتطلب توثيقًا، يحتاج `paper:publish`)؛ يقبل JSON أو متعدد الأجزاء (meta + ملف `pdf` اختياري)
- `POST /api/papers/:id/moderate` — إشراف `{action:"approve"|"reject"|"withdraw", reason?}` (يحتاج `paper:moderate`)
- `POST /api/papers/:id/citations` — إضافة اقتباس `{targetArxivId?|targetDoi?|targetTitle?}` (المالك/المشرف/المدير)
- `POST /api/papers/:id/tags` / `DELETE /api/papers/:id/tags` — إلحاق/فصل وسم `{tagId|name}` (المالك/المشرف/المدير؛ ينشئ الوسم إن كان الاسم جديدًا)
- `POST /api/submit/archive` — رفع حزمة مصدر `tar.gz` للإدراج التلقائي، وربط الاقتباسات، وبناء PDF (يتطلب توثيقًا؛ انظر [دليل الإرسال](/en/guide/submission))

## الفئات (Categories)

- `GET /api/categories` — شجرة الفئات

## الوسوم (Tags)

- `GET /api/tags` — كل الوسوم مع أعداد الاستخدام (مرتبة حسب الشيوع)
- `POST /api/tags` — إنشاء وسم `{name}` (يتطلب توثيقًا؛ ثابت بالاسم)

## الاشتراكات (Subscriptions)

- `GET /api/subscriptions` — سرد اشتراكاتي، **مُثراة** (أسماء الفئة/المؤلف/الورقة محسومة إلى `title` + رابط عميق `href`)
- `POST /api/subscriptions` — اشتراك / إلغاء اشتراك (تبديل) `{type:"category"|"author"|"paper", refId}`
- `DELETE /api/subscriptions` — إلغاء اشتراك `{type, refId}`

## التغذية والإشعارات

تُولَّد الإعلانات عند دخول ورقة ضمن أحد اشتراكاتك (جديد في فئة، جديد من مؤلف)، أو عند رد أحدهم على تعليقك، أو عبر بث من المدير.

- `GET /api/feed` — إعلانات المستخدم الحالي (`?markRead=1` تُعلّمها كلها مقروءة أيضًا)
- `POST /api/feed` — تعليم إعلان واحد مقروءًا `{id}`

جرس الترويسة (`FeedBell`) يعرض شارة غير مقروء مباشرة تبقى متزامنة عبر متجر Zustand، فالقراءة في أي مكان تحدّث الشارة فورًا.

## الإشارات المرجعية (Bookmarks)

- `GET /api/bookmarks` — سرد إشاراتي (كل منها محسوم إلى عنوان الورقة و`groupName`)؛ مرّر `?paperId=` للحصول بدلًا من ذلك على `{ bookmarked: boolean }` لورقة واحدة
- `POST /api/bookmarks` — تبديل إشارة `{paperId, group?}` (يعيد `{ bookmarked: true|false }`)
- `PATCH /api/bookmarks/:paperId` — نقل إشارة إلى مجموعة `{group}` (القيمة null تُمسحها)
- `DELETE /api/bookmarks` — إزالة إشارة `{paperId}`

## الرسائل (Messages)

تُصنَّف الرسائل بـ `kind` إلى 8 فئات: `system`، `ticket_reply`، `announcement`، `review_result`، `co_review_request`، `co_review_result`، `admin_message`، `community_reply`.

- `GET /api/messages` — رسائل المستخدم الحالي + عدّاد غير المقروء (يدعم فلتر `?kind=`)
- `GET /api/messages/stats` — إحصاءات غير المقروء
- `POST /api/messages/:id/read` — تعليم مقروء
- `POST /api/messages` — `{action:"read-all"}` تعليم الكل مقروءًا

## التذاكر (Tickets)

- `GET /api/tickets` — تذاكري (`?scope=all` للمدير فقط)
- `POST /api/tickets` — إنشاء `{subject, type, priority, message}`
- `GET /api/tickets/:id` — التفاصيل
- `POST /api/tickets/:id` — رد
- `PATCH /api/tickets/:id` — تحديث حالة/أولوية من المدير

## التعليقات (Feedback)

- `POST /api/feedback` — إرسال تعليق (يتطلب توثيقًا، ينشئ تذكرة تلقائيًا)

## المراجعة المشتركة (Co-review)

- `GET /api/co-reviews?scope=mine|all` — سرد (ملكي / الكل، صلاحية مناظرة مطلوبة)
- `POST /api/co-reviews` — تعيين `{paperId, reviewerId, note?}` (يحتاج `co_review:assign`)
- `GET /api/co-reviews/:id` — التفاصيل
- `POST /api/co-reviews/:id/respond` — رد المراجع `{accepted:boolean}`
- `POST /api/co-reviews/:id/submit` — تقديم رأي `{decision:"approve"|"reject"|"revise", comment}`

## الإدارة (Admin)

طرف الإدارة يتطلب دورًا أساسيًا `moderator` / `admin` ويُصرَّح بصلاحية دقيقة لكل حالة.

- `GET /api/admin/users` — قائمة المستخدمين (ترقيم صفحات / بحث، يحتاج `user:manage`)
- `PATCH /api/admin/users/:id` — تعيين أدوار `{roleKeys:string[]}` أو تجاوز `{permission:{key:string, grant:boolean|null}}` (يحتاج `user:manage` / `permission:manage`)
- `GET /api/admin/roles` — قائمة الأدوار (يحتاج `role:manage`)
- `PUT /api/admin/roles/:id` — تعيين صلاحيات الدور `{permissionKeys:string[]}`
- `POST /api/admin/messages` — بث `{scope:"all"|"role"|"userIds", role?, userIds?, kind:"announcement"|"system"|"admin_message", title, body, link?}` (يحتاج `message:broadcast`)
- `GET /api/admin/stats` — إحصاءات المنصة
