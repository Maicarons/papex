# النشر

يمكن نشر Papex على Vercel، أو أي بيئة Docker، أو خادم مستضاف ذاتيًا.

## Vercel

1. استورد المستودع إلى Vercel.
2. عيّن متغيرات البيئة: `DATABASE_URL`، `AUTH_SECRET`.
3. أمر البناء: `npm run build` (المخرجات يتولّاها Next.js).
4. اربط Postgres عبر Vercel Storage، أو املأ `DATABASE_URL` خارجيًا.
5. شغّل التهجيرات مرة واحدة بعد النشر: `npm run db:migrate`.
6. **تخزين PDF**: نظام ملفات Vercel للقراءة فقط وقت التشغيل، لذا عيّن
   `STORAGE_DRIVER=s3` ومتغيرات `PAPEX_S3_*` (انظر
   [الإعداد ← التخزين](./configuration.md)). حينها
   يعيد المسار البثّي التوجيه إلى رابط كائن مُوقَّع مسبقًا بدل خدمة البايتات من القرص.

## Docker / الاستضافة الذاتية

استخدم `docker-compose.yml` الجذري لتشغيل التطبيق + قاعدة البيانات معًا:

```bash
docker compose up -d
```

أو شغّل Postgres فقط في Docker وابنِ صورة Next.js بنفسك:

```bash
docker build -t papex .
docker run -e DATABASE_URL=... -e AUTH_SECRET=... -p 3000:3000 papex
```

## موقع التوثيق

يُبنى التوثيق بـ VitePress إلى `public/docs` ويُخدَّم من التطبيق الرئيسي على `/docs`:

```bash
npm run docs:build
```
