# دليل النشر - Deployment Guide

## الخيار 1: LiveKit Cloud (الأسهل - موصى به للبداية)

### الخطوات:

1. **إنشاء حساب على LiveKit Cloud**
   - اذهب إلى: https://cloud.livekit.io/
   - اضغط "Sign Up" وأنشئ حساب

2. **إنشاء مشروع جديد**
   ```
   - اضغط "Create Project"
   - اختر اسم للمشروع: medical-avatar-osce
   - اختر المنطقة الأقرب لك
   ```

3. **الحصول على بيانات الاتصال**
   بعد إنشاء المشروع، ستحصل على:
   ```
   API Key: APxxxxxxxxxxxx
   API Secret: xxxxxxxxxxxxxxxxxxxxxxxx
   WebSocket URL: wss://medical-avatar-xxxxx.livekit.cloud
   ```

4. **إضافة البيانات لملف .env**
   ```bash
   cp .env.example .env
   ```
   
   ثم عدّل `.env`:
   ```env
   LIVEKIT_API_KEY=APxxxxxxxxxxxx
   LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   LIVEKIT_URL=wss://medical-avatar-xxxxx.livekit.cloud
   PORT=3000
   ```

5. **تشغيل المشروع**
   ```bash
   npm install
   npm start
   ```

---

## الخيار 2: LiveKit Server محلي (للتطوير)

### الخطوات:

1. **تثبيت LiveKit CLI**
   
   **Windows:**
   ```bash
   # باستخدام Chocolatey
   choco install livekit
   
   # أو تحميل مباشر
   # https://github.com/livekit/livekit-cli/releases
   ```
   
   **Linux/Mac:**
   ```bash
   brew install livekit
   ```

2. **تشغيل LiveKit Server**
   ```bash
   livekit-server --dev
   ```
   
   سيعطيك:
   ```
   API Key: devkey
   API Secret: secret
   WebSocket URL: ws://localhost:7880
   ```

3. **تعديل .env**
   ```env
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=secret
   LIVEKIT_URL=ws://localhost:7880
   PORT=3000
   ```

4. **تشغيل المشروع**
   ```bash
   npm install
   npm start
   ```

---

## الخيار 3: Deploy على خادم خاص (Production)

### متطلبات:

- خادم Linux (Ubuntu 20.04+)
- Docker و Docker Compose
- Domain name مع SSL

### الخطوات:

1. **تثبيت LiveKit Server**
   ```bash
   # إنشاء مجلد
   mkdir livekit-server
   cd livekit-server
   
   # تحميل config
   wget https://raw.githubusercontent.com/livekit/livekit/master/config-sample.yaml -O config.yaml
   ```

2. **تعديل config.yaml**
   ```yaml
   port: 7880
   rtc:
     port_range_start: 50000
     port_range_end: 60000
     use_external_ip: true
   
   keys:
     your_api_key: your_api_secret
   ```

3. **تشغيل باستخدام Docker**
   ```bash
   docker run -d \
     --name livekit \
     -p 7880:7880 \
     -p 50000-60000:50000-60000/udp \
     -v $(pwd)/config.yaml:/etc/livekit.yaml \
     livekit/livekit-server \
     --config /etc/livekit.yaml
   ```

4. **إعداد SSL مع Nginx**
   ```nginx
   server {
       listen 443 ssl;
       server_name livekit.yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:7880;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

---

## نشر تطبيق Node.js

### على Heroku:

```bash
# تسجيل دخول
heroku login

# إنشاء تطبيق
heroku create medical-avatar-app

# إضافة متغيرات البيئة
heroku config:set LIVEKIT_API_KEY=your_key
heroku config:set LIVEKIT_API_SECRET=your_secret
heroku config:set LIVEKIT_URL=wss://your-url

# نشر
git push heroku main
```

### على Railway:

1. اذهب إلى: https://railway.app/
2. اضغط "New Project" → "Deploy from GitHub"
3. اختر المستودع
4. أضف Environment Variables
5. Deploy!

### على Vercel (للـ Frontend فقط):

```bash
npm install -g vercel
vercel
```

---

## اختبار الاتصال

بعد التشغيل، اختبر:

```bash
# اختبار السيرفر
curl http://localhost:3000/api/scenarios

# اختبار LiveKit
livekit-cli test --url YOUR_LIVEKIT_URL --api-key YOUR_KEY --api-secret YOUR_SECRET
```

---

## الخطوة التالية: إنشاء Agent

بعد تشغيل السيرفر، نحتاج لإنشاء Agent يتعامل مع:
1. استقبال الصوت من الطالب
2. تحويله لنص (Speech-to-Text)
3. معالجة السؤال
4. توليد رد مناسب
5. تحويل الرد لصوت (Text-to-Speech)

سنقوم بذلك في الخطوة التالية!
