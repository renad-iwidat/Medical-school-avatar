# Docker Deployment Guide

## المتطلبات الأساسية

- Docker مثبت على الجهاز
- Docker Compose مثبت

## طريقة التشغيل

### 1. استنساخ المشروع

```bash
git clone https://github.com/renad-iwidat/Medical-school-avatar.git
cd Medical-school-avatar
```

### 2. إعداد المتغيرات البيئية

أنشئ ملف `.env` في المجلد الرئيسي:

```bash
PORT=3000
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. بناء وتشغيل الـ Container

```bash
# بناء الـ image
docker-compose build

# تشغيل الـ container
docker-compose up -d
```

### 4. التحقق من التشغيل

افتح المتصفح على: `http://localhost:3000`

## أوامر مفيدة

### عرض الـ logs
```bash
docker-compose logs -f
```

### إيقاف الـ container
```bash
docker-compose down
```

### إعادة بناء الـ image
```bash
docker-compose up -d --build
```

### الدخول إلى الـ container
```bash
docker exec -it medical-avatar-app sh
```

## التشغيل على سيرفر

### 1. رفع الكود على GitHub
```bash
git add .
git commit -m "Add Docker support"
git push origin main
```

### 2. على السيرفر
```bash
# استنساخ المشروع
git clone https://github.com/renad-iwidat/Medical-school-avatar.git
cd Medical-school-avatar

# إنشاء ملف .env
nano .env
# أضف المتغيرات البيئية

# تشغيل Docker
docker-compose up -d
```

## استخدام Docker Hub (اختياري)

### بناء ورفع الـ image
```bash
# بناء الـ image
docker build -t renad/medical-avatar:latest .

# تسجيل الدخول إلى Docker Hub
docker login

# رفع الـ image
docker push renad/medical-avatar:latest
```

### تشغيل من Docker Hub
```bash
docker run -d \
  -p 3000:3000 \
  -e OPENAI_API_KEY=your_key_here \
  --name medical-avatar \
  renad/medical-avatar:latest
```

## الأمان

- لا ترفع ملف `.env` على GitHub
- استخدم Docker secrets في بيئة الإنتاج
- قم بتحديث الـ dependencies بانتظام

## استكشاف الأخطاء

### المشكلة: الـ container لا يعمل
```bash
# عرض الـ logs
docker-compose logs

# التحقق من حالة الـ container
docker ps -a
```

### المشكلة: لا يمكن الوصول للتطبيق
- تأكد من أن البورت 3000 غير مستخدم
- تحقق من إعدادات الـ firewall
- تأكد من أن الـ container يعمل: `docker ps`

## الموارد المطلوبة

- RAM: 512 MB على الأقل
- CPU: 1 core
- Storage: 500 MB

## الدعم

للمزيد من المعلومات، راجع:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
