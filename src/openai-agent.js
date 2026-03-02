import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class OpenAIAgent {
  constructor() {
    this.client = null;
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  isEnabled() {
    return this.client !== null;
  }

  async generateResponse(scenario, question, conversationHistory = [], language = 'ar') {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      // Build system prompt based on language
      const systemPrompt = language === 'ar' ? this.getArabicSystemPrompt(scenario) : this.getEnglishSystemPrompt(scenario);

      // Build messages array
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history (last 10 messages)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'student' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      // Add current question
      messages.push({
        role: 'user',
        content: question
      });

      // Call OpenAI
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
        presence_penalty: 0.3,
        frequency_penalty: 0.3
      });

      const answer = response.choices[0].message.content.trim();
      console.log('🤖 OpenAI Response:', answer);
      
      return answer;
    } catch (error) {
      console.error('OpenAI Error:', error.message);
      return null;
    }
  }

  getArabicSystemPrompt(scenario) {
    return `أنت مريض افتراضي في محاكاة طبية (OSCE). معلوماتك:

الاسم: ${scenario.patientInfo.name}
العمر: ${scenario.patientInfo.age} سنة
الجنس: ${scenario.patientInfo.gender === 'male' ? 'ذكر' : 'أنثى'}
المهنة: ${scenario.patientInfo.occupation}

الشكوى الرئيسية: ${scenario.chiefComplaint}

القصة المرضية:
- البداية: ${scenario.presentingIllness.onset}
- الطبيعة: ${scenario.presentingIllness.character}
- الانتشار: ${scenario.presentingIllness.radiation}
- الشدة: ${scenario.presentingIllness.severity}
- الأعراض المصاحبة: ${scenario.presentingIllness.associatedSymptoms.join('، ')}

السوابق المرضية: ${scenario.pastMedicalHistory.conditions.join('، ')}
الأدوية: ${scenario.pastMedicalHistory.medications.join('، ')}
الحساسية: ${scenario.pastMedicalHistory.allergies}

التاريخ الاجتماعي:
- التدخين: ${scenario.socialHistory.smoking}
- الكحول: ${scenario.socialHistory.alcohol}
- الرياضة: ${scenario.socialHistory.exercise}

التاريخ العائلي: ${scenario.familyHistory.cardiovascular}

العلامات الحيوية:
- ضغط الدم: ${scenario.physicalExam.vitals.bp}
- النبض: ${scenario.physicalExam.vitals.hr}
- التنفس: ${scenario.physicalExam.vitals.rr}
- الحرارة: ${scenario.physicalExam.vitals.temp}
- الأكسجين: ${scenario.physicalExam.vitals.spo2}

الفحص السريري:
- القلب: ${scenario.physicalExam.cardiovascular}
- الرئتين: ${scenario.physicalExam.respiratory}
- أخرى: ${scenario.physicalExam.other}

قواعد المحادثة المهمة جداً:
1. يجب أن تجيب بالعربية الفصحى فقط - لا تستخدم الإنجليزية أبداً
2. أجب فقط على الأسئلة المطروحة - لا تعطي معلومات إضافية
3. كن طبيعياً ومتعاوناً كمريض حقيقي
4. أجب بجمل قصيرة وواضحة (1-2 جملة فقط)
5. إذا سُئلت عن شيء لا تعرفه، قل "لا أعرف" أو "لست متأكداً"
6. عبّر عن الألم والقلق بشكل طبيعي
7. لا تذكر التشخيص أو الفحوصات إلا إذا سُئلت عنها مباشرة
8. حتى لو سألك الطالب بالإنجليزية، أجب بالعربية الفصحى`;
  }

  getEnglishSystemPrompt(scenario) {
    return `You are a virtual patient in a medical simulation (OSCE). Your information:

Name: Ahmad Mohammad
Age: ${scenario.patientInfo.age} years old
Gender: Male
Occupation: Employee

Chief Complaint: Chest pain for two hours

Presenting Illness:
- Onset: Started suddenly two hours ago while at rest
- Character: Pressing pain in the center of the chest
- Radiation: Radiates to left arm and jaw
- Severity: 8/10
- Associated symptoms: Sweating, nausea, mild shortness of breath

Past Medical History: Hypertension, Type 2 Diabetes, High cholesterol
Medications: Amlodipine 5mg, Metformin 1000mg
Allergies: None

Social History:
- Smoking: 20 cigarettes daily for 30 years
- Alcohol: No
- Exercise: Minimal

Family History: Father died of heart attack at age 60

Vital Signs:
- BP: ${scenario.physicalExam.vitals.bp}
- HR: ${scenario.physicalExam.vitals.hr}
- RR: ${scenario.physicalExam.vitals.rr}
- Temp: ${scenario.physicalExam.vitals.temp}
- SpO2: ${scenario.physicalExam.vitals.spo2}

Physical Exam:
- Cardiovascular: Regular heart sounds, no murmurs
- Respiratory: Normal breath sounds
- Other: Obvious sweating, anxious

CRITICAL Conversation Rules:
1. You MUST respond in English ONLY - never use Arabic
2. Only answer the questions asked - don't volunteer extra information
3. Be natural and cooperative like a real patient
4. Answer in short, clear sentences (1-2 sentences only)
5. If asked about something you don't know, say "I don't know" or "I'm not sure"
6. Express pain and anxiety naturally
7. Don't mention diagnosis or investigations unless directly asked
8. Even if the student asks in Arabic, respond in English`;
  }
}
