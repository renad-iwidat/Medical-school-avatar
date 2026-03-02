# 🏥 Medical Avatar - OSCE Training System

نظام تدريب طبي تفاعلي باستخدام الذكاء الاصطناعي لممارسة الـ OSCE (Objective Structured Clinical Examination).

تم تطويره من قبل **وحدة ليمينال** في **مركز الإعلام بجامعة النجاح الوطنية**.

## ✨ المميزات

- 🎤 **تفاعل صوتي**: التعرف على الصوت والنطق بالعربية والإنجليزية
- 🤖 **ذكاء اصطناعي**: استخدام OpenAI لتوليد أجوبة طبيعية
- 📊 **تقييم تلقائي**: تقييم أداء الطالب بناءً على الأسئلة المطروحة
- 🌐 **ثنائي اللغة**: دعم كامل للعربية والإنجليزية
- ⚡ **سريع**: استخدام WebSocket للتواصل الفوري
- 🎯 **سيناريوهات طبية**: حالات طبية واقعية للتدريب

## 🚀 التقنيات المستخدمة

- **Backend**: Node.js + Express
- **Real-time Communication**: Socket.IO (WebSocket)
- **AI**: OpenAI GPT-4o-mini
- **Voice**: Web Speech API
- **Deployment**: Docker

## 📋 المتطلبات

- Node.js 18+ أو Docker
- مفتاح OpenAI API (اختياري - يعمل بدونه بأجوبة جاهزة)

## 🛠️ التثبيت والتشغيل

### الطريقة 1: باستخدام Docker (موصى به)

```bash
# استنساخ المشروع
git clone https://github.com/renad-iwidat/Medical-school-avatar.git
cd Medical-school-avatar

# إنشاء ملف .env
echo "PORT=3000" > .env
echo "OPENAI_API_KEY=your_key_here" >> .env

# تشغيل Docker
docker-compose up -d
```

افتح المتصفح على: `http://localhost:3000`

### الطريقة 2: بدون Docker

```bash
# استنساخ المشروع
git clone https://github.com/renad-iwidat/Medical-school-avatar.git
cd Medical-school-avatar

# تثبيت المكتبات
npm install

# إنشاء ملف .env
cp .env.example .env
# عدّل الملف وأضف مفتاح OpenAI

# تشغيل السيرفر
npm start
```

## 📖 دليل الاستخدام

1. **اختر اللغة**: عربي أو إنجليزي
2. **أدخل اسمك** واختر السيناريو الطبي
3. **ابدأ الجلسة** وتحدث مع المريض الافتراضي
4. **اطرح الأسئلة**: استخدم الميكروفون أو الكتابة
5. **أنهِ الجلسة** واحصل على التقييم

## 🎯 السيناريوهات المتاحة

- ألم في الصدر (Chest Pain) - احتشاء عضلة القلب

## 📊 معايير التقييم

- القصة المرضية (History Taking)
- الفحص السريري (Physical Examination)
- الفحوصات المطلوبة (Investigations)
- التشخيص (Diagnosis)
- الخطة العلاجية (Management)

## 🌐 متطلبات المتصفح

للحصول على أفضل تجربة:
- **Chrome** أو **Edge** على Windows/Android
- **Safari** على iOS (الصوت محدود)
- **Firefox** (لا يدعم التعرف على الصوت)

## 🐳 Docker Deployment

راجع ملف [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) للتفاصيل الكاملة.

## 💰 التكاليف

- **Web Speech API**: مجاني
- **Socket.IO**: مجاني
- **OpenAI GPT-4o-mini**: ~$5-10/شهر (اختياري)

## 🔒 الأمان

- لا ترفع ملف `.env` على GitHub
- استخدم متغيرات بيئية آمنة في الإنتاج
- قم بتحديث المكتبات بانتظام

## 📝 الترخيص

MIT License

## 👥 المطورون

**وحدة ليمينال** - مركز الإعلام - جامعة النجاح الوطنية

## 🤝 المساهمة

نرحب بالمساهمات! يرجى فتح Issue أو Pull Request.

## 📧 التواصل

للاستفسارات والدعم، يرجى التواصل مع وحدة ليمينال.

---

Made with ❤️ by Liminal Unit - An-Najah National University
