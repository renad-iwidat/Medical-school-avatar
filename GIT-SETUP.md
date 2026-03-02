# دليل رفع المشروع على GitHub

## الخطوات

### 1. تهيئة Git (إذا لم يكن مهيأ)

```bash
git init
```

### 2. إضافة الريبو البعيد

```bash
git remote add origin https://github.com/renad-iwidat/Medical-school-avatar.git
```

### 3. التحقق من الملفات

تأكد من أن `.gitignore` يحتوي على:
```
node_modules/
.env
*.log
dist/
.DS_Store
```

### 4. إضافة جميع الملفات

```bash
git add .
```

### 5. عمل Commit

```bash
git commit -m "Initial commit: Medical Avatar OSCE Training System with Docker support"
```

### 6. رفع الكود

```bash
# إذا كان الريبو فارغ
git push -u origin main

# أو إذا كان فيه محتوى
git pull origin main --rebase
git push origin main
```

## التحديثات المستقبلية

```bash
# إضافة التغييرات
git add .

# عمل commit
git commit -m "وصف التغيير"

# رفع التحديث
git push origin main
```

## نصائح

1. **لا ترفع ملف `.env`** - يحتوي على معلومات حساسة
2. **استخدم `.env.example`** - كمثال للمستخدمين الآخرين
3. **اكتب commit messages واضحة** - لتسهيل التتبع

## بعد الرفع على GitHub

### تشغيل على سيرفر

```bash
# على السيرفر
git clone https://github.com/renad-iwidat/Medical-school-avatar.git
cd Medical-school-avatar

# إنشاء ملف .env
nano .env
# أضف:
# PORT=3000
# OPENAI_API_KEY=your_actual_key

# تشغيل بـ Docker
docker-compose up -d

# أو بدون Docker
npm install
npm start
```

### التحقق من التشغيل

افتح المتصفح على عنوان السيرفر:
```
http://your-server-ip:3000
```

## استكشاف الأخطاء

### المشكلة: git push يطلب username/password
**الحل**: استخدم Personal Access Token من GitHub

1. اذهب إلى: GitHub → Settings → Developer settings → Personal access tokens
2. أنشئ token جديد
3. استخدمه بدلاً من كلمة المرور

### المشكلة: الملفات الكبيرة
**الحل**: تأكد من أن `node_modules` في `.gitignore`

```bash
# إزالة node_modules إذا تم رفعه بالخطأ
git rm -r --cached node_modules
git commit -m "Remove node_modules"
git push
```
