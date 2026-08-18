# الإعداد

يُهيّأ Papex عبر متغيرات البيئة.

## قاعدة البيانات

```bash
DATABASE_URL=postgres://papex:papex@localhost:5432/papex
```

## التوثيق

```bash
# السر المستخدم للتوقيع على JWT. يجب أن يكون سلسلة عشوائية طويلة في الإنتاج (≥ 16 حرفًا).
AUTH_SECRET=change-me-to-a-long-random-string
# مدة بقاء الجلسة بالثواني (افتراضي 7 أيام)
AUTH_SESSION_TTL=604800
```

### مفاتيح API

تتيح مفاتيح API للنصوص البرمجية والتكاملات استدعاء API دون جلسة متصفح.
تُنشأ من **الإعدادات ← مفاتيح API** (`/settings/api-keys`)؛ يُعرض السر
الخام مرة واحدة فقط. يُجزّأ المفتاح بـ SHA-256 ويُربط بحسابك،
فيرث صلاحيات RBAC لدورك — دون حاجة لإعداد إضافي. أرسله كالتالي:

```http
Authorization: Bearer pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

الطرق العامة (الأوراق، والبحث، والفئات، والمؤلفون، والفحص الصحي) تقبل الطلبات المجهولة أيضًا.

## البريد (اختياري)

لا يتطلب نظاما الرسائل والتذاكر بريدًا إلكترونيًا. لإرسال رسائل إشعار بالبريد، هيئ SMTP:

```bash
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## التخزين (خلفية PDF)

تُخزَّن ملفات PDF المرفوعة عبر خلفية قابلة للتبديل، تُحدَّد بـ `STORAGE_DRIVER`.

### `local` (افتراضي)

يدير الخادم ملفات PDF على نظام ملفاته الخاص تحت `PAPEX_STORAGE_DIR`
(افتراضي `./storage`). تُعاد البايتات عبر المسار
`/api/papers/{id}/pdf/{version}`. استخدم هذا لـ Docker / الاستضافة الذاتية / التطوير.

```bash
STORAGE_DRIVER=local
PAPEX_STORAGE_DIR=./storage
```

### `s3` (تخزين كائنات متوافق مع S3)

تذهب الرفعات إلى حاوية متوافقة مع S3 (AWS S3، وMinIO، وCloudflare R2، وDigitalOcean
Spaces). ثم يعيد المسار البثّي توجيهًا `302` إلى رابط كائن **مُوقَّع مسبقًا** (أو
عام)، فيُخدَّم PDF من مخزن الكائنات ولا يمر أبدًا عبر الخادم — وهو مطلوب على منصات
للقراءة فقط/بلا خادم مثل Vercel.

```bash
STORAGE_DRIVER=s3
PAPEX_S3_BUCKET=papex-pdfs
PAPEX_S3_REGION=auto            # us-east-1 لـ AWS؛ و"auto" لـ Cloudflare R2
PAPEX_S3_ENDPOINT=https://s3.amazonaws.com   # مطلوب لـ R2 / MinIO / Spaces
PAPEX_S3_ACCESS_KEY_ID=...
PAPEX_S3_SECRET_ACCESS_KEY=...
PAPEX_S3_FORCE_PATH_STYLE=true  # true لـ MinIO/R2/Spaces؛ false للمُستضاف افتراضيًا في AWS
# اختياري: إن كانت الحاوية/CDN عامة، عيّن عنوان URL الأساس هذا لتخطي التوقيع:
# PAPEX_S3_PUBLIC_BASE=https://cdn.example.com
```

بغض النظر عن الخلفية، يشير `pdfUrl` المخزّن على كل إصدار ورقة دائمًا إلى
المسار البثّي، فتظل الواجهة وAPI محايدين تجاه الخلفية.
