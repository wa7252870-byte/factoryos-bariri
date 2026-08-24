# FactoryOS Bariri

نظام إدارة المصنع المتكامل — مبني بـ Next.js 14 + Supabase + Arabic RTL

## المميزات

- **16 صفحة** متصلة بقاعدة بيانات Supabase الحقيقية (38 جدول)
- **9 أدوار مستخدمين** مع توجيه تلقائي حسب الدور
- **واجهة عربية RTL** كاملة مع خط Cairo
- **Realtime** للبوابات والإشعارات والدعم الفني
- **تقارير Excel** حقيقية بـ SheetJS
- **رفع الملفات** لـ 3 Storage Buckets

## النشر على Vercel (بنقرة واحدة)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/wa7252870-byte/factoryos-bariri&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)

## خطوات النشر اليدوي

### 1. افتح رابط النشر

انقر على الزر أعلاه أو افتح:
```
https://vercel.com/new/clone?repository-url=https://github.com/wa7252870-byte/factoryos-bariri&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. أضف متغيرات البيئة

عند النشر، ستطلب Vercel إدخال هذه المتغيرات:

| المتغير | القيمة |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kevaqxnayyvwhvyzhcox.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_B3tyxE6twuhl03cynZBahA_AylgFKD8` |

### 3. انتظر اكتمال البناء

Vercel ستقوم تلقائياً بـ:
- تثبيت الحزم (`npm install`)
- بناء المشروع (`npm run build`)
- نشره على رابط `.vercel.app`

### 4. بعد النشر

- **رابط التطبيق**: سيظهر في لوحة تحكم Vercel
- **تسجيل الدخول**: استخدم بيانات Supabase Auth
- **إضافة مستخدمين**: من Supabase Dashboard → Authentication

## الأدوار المتاحة

| الدور | الوصول |
|-------|--------|
| `super_admin` | صلاحيات كاملة |
| `platform_owner` | إدارة جميع المصانع |
| `general_manager` | إدارة مصنع واحد كاملاً |
| `factory_manager` | إدارة تشغيلية |
| `finance_manager` | الرواتب والمدفوعات |
| `gate_1_officer` | تسجيل دخول العمال |
| `gate_2_officer` | تأكيد الحضور |
| `production_supervisor` | تسجيل الإنتاج |
| `warehouse_manager` | إدارة المخزن |

## التطوير المحلي

```bash
# تثبيت الحزم
npm install

# إنشاء ملف البيئة
cp .env.example .env.local

# تشغيل التطوير
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

## التقنيات المستخدمة

- **Next.js 14** — App Router + Server Components
- **Supabase** — PostgreSQL + Auth + Storage + Realtime
- **Tailwind CSS** — Arabic RTL styling
- **TypeScript** — Full type safety
- **SheetJS (xlsx)** — Excel report generation
- **Cairo Font** — Arabic typography
