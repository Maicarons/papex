# البدء

يرشدك هذا الدليل إلى تشغيل Papex محليًا.

## المتطلبات

- Node.js ≥ 18.18
- PostgreSQL ≥ 16 (يُنصح بـ Docker)
- npm أو pnpm

## 1. تثبيت الاعتماديات

```bash
npm install
```

## 2. تجهيز قاعدة البيانات

شغّل Postgres عبر `docker-compose.yml` المرفق:

```bash
docker compose up -d db
```

انسخ ملف البيئة واملأه:

```bash
cp .env.example .env
# عيّن على الأقل DATABASE_URL و AUTH_SECRET
```

## 3. تشغيل التهجيرات والتعبئة الأولية

```bash
npm run db:migrate
npm run db:seed
```

يكتب `db:seed` شجرة التصنيفات الكاملة، وأوراقًا تجريبية، وحساب مدير.

## 4. تشغيل خادم التطوير

```bash
npm run dev
```

افتح http://localhost:3000.

## الحسابات الافتراضية

| الدور | اسم المستخدم | كلمة المرور |
| --- | --- | --- |
| مدير (Admin) | `admin` | `admin123456` |
| مؤلف (تجريبي) | `demo` | `password123` |

> غيّر كلمات المرور الافتراضية في بيئة الإنتاج، واستخدم `AUTH_SECRET` عشوائيًا طويلًا.
