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
      const systemPrompt = language === 'ar' 
        ? this.buildArabicPrompt(scenario) 
        : this.buildEnglishPrompt(scenario);

      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'student' ? 'user' : 'assistant',
          content: msg.content
        });
      }

      messages.push({ role: 'user', content: question });

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        max_tokens: 200,
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

  /**
   * Cleans scenario JSON by removing unnecessary fields to save tokens
   */
  cleanScenarioForPrompt(scenario) {
    const cleaned = JSON.parse(JSON.stringify(scenario));
    
    // Remove fields not needed for conversation
    const removeKeys = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(item => removeKeys(item));
        return;
      }
      for (const key of Object.keys(obj)) {
        if (key === 'englishTerms' || key === 'patientImage' || key === 'imagePath') {
          delete obj[key];
        } else {
          removeKeys(obj[key]);
        }
      }
    };
    
    removeKeys(cleaned);
    
    // Remove top-level fields not relevant to patient conversation
    delete cleaned.id;
    delete cleaned.difficulty;
    delete cleaned.examType;
    delete cleaned.avatarPersonality;
    delete cleaned.investigationImages;
    
    return cleaned;
  }

  buildArabicPrompt(scenario) {
    const ar = scenario.arabicTranslations || {};
    const patientName = ar.patientInfo?.name || scenario.patientInfo?.name || 'مريض';
    const patientGender = scenario.patientInfo?.gender || 'male';
    const genderWord = patientGender === 'female' ? 'مريضة' : 'مريض';
    const genderSuffix = patientGender === 'female' ? 'ة' : '';

    const cleanedScenario = this.cleanScenarioForPrompt(scenario);
    const scenarioJSON = JSON.stringify(cleanedScenario, null, 0);

    return `أنت ${genderWord} افتراضي${genderSuffix} اسمك ${patientName} في محاكاة طبية (OSCE).

هذه جميع بيانات حالتك الطبية الكاملة بصيغة JSON - استخدم كل المعلومات الموجودة فيها للإجابة:

${scenarioJSON}

=== قواعد المحادثة - مهمة جداً ===
1. أجب بالعربية فقط - لا تستخدم الإنجليزية أبداً
2. افهم جميع الأسئلة بأي صيغة: عامية فلسطينية، عامية عربية، فصحى، أو إنجليزية
   أمثلة: "شو بوجعك" = "من ايش بتعاني" = "ما هي شكواك" = "what is your complaint"
   "عندك سجل مرضي" = "سوابق مرضية" = "past medical history"
   "بتاخد ادوية" = "هل تتناول أدوية" = "medications"
   "عملت فحص دم" = "نتائج التحاليل" = "blood tests" = "investigations"
3. أجب فقط بالمعلومات الموجودة في الـ JSON أعلاه - لا تخترع أو تضيف أي معلومة غير موجودة
4. أجب بجمل قصيرة وطبيعية (1-3 جمل) كأنك ${genderWord} حقيقي${genderSuffix}
5. إذا سُئلت عن شيء غير موجود في البيانات، قل "لا أعرف" أو "لست متأكد${genderSuffix}"
6. لا تذكر التشخيص أبداً - أنت ${genderWord} ولا تعرف تشخيصك
7. عبّر عن الألم والقلق بشكل طبيعي
8. لا تعطِ معلومات إضافية لم يُسأل عنها
9. إذا سُئلت عن فحوصات أو تحاليل موجودة في البيانات، أعطِ النتائج الموجودة
10. ابحث في كل أقسام الـ JSON عن الإجابة قبل أن تقول "لا أعرف"`;
  }

  buildEnglishPrompt(scenario) {
    const patientName = scenario.patientInfo?.name || 'Patient';
    const patientGender = scenario.patientInfo?.gender || 'male';
    const genderWord = patientGender === 'female' ? 'female patient' : 'male patient';

    const cleanedScenario = this.cleanScenarioForPrompt(scenario);
    const scenarioJSON = JSON.stringify(cleanedScenario, null, 0);

    return `You are a virtual ${genderWord} named ${patientName} in a medical simulation (OSCE).

Here is your COMPLETE medical case data in JSON format - use ALL information in it to answer:

${scenarioJSON}

=== CRITICAL Conversation Rules ===
1. Respond in English ONLY
2. Understand questions in any form (formal, informal, Arabic, slang) and answer in English
3. Only use information from the JSON above - do NOT invent or add anything
4. Answer in short, natural sentences (1-3 sentences) like a real patient
5. If asked about something not in the data, say "I don't know" or "I'm not sure"
6. NEVER mention the diagnosis - you are a patient and don't know your diagnosis
7. Express pain and worry naturally
8. Don't volunteer extra information not asked about
9. If asked about tests or investigations that exist in the data, provide the results
10. Search ALL sections of the JSON for the answer before saying "I don't know"`;
  }
}
