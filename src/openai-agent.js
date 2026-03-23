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

      // Add conversation history (last 10 messages)
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
   * Builds a dynamic Arabic system prompt from ANY scenario JSON
   */
  buildArabicPrompt(scenario) {
    const ar = scenario.arabicTranslations || {};
    
    // Patient info
    const patientName = ar.patientInfo?.name || scenario.patientInfo?.name || 'مريض';
    const patientAge = ar.patientInfo?.age || scenario.patientInfo?.age || '';
    const patientGender = scenario.patientInfo?.gender || 'male';
    const patientOccupation = ar.patientInfo?.occupation || scenario.patientInfo?.occupation || '';
    const patientMaritalStatus = ar.patientInfo?.maritalStatus || scenario.patientInfo?.maritalStatus || '';
    const genderWord = patientGender === 'female' ? 'مريضة' : 'مريض';
    const genderSuffix = patientGender === 'female' ? 'ة' : '';

    // Presenting complaint
    const complaintFull = ar.presentingComplaint?.full || scenario.presentingComplaintFull || '';
    const complaintShort = ar.presentingComplaint?.short || scenario.presentingComplaintShort || '';

    // Build the full scenario data as structured text
    const scenarioData = this.extractAllScenarioData(scenario);

    return `أنت ${genderWord} افتراضي${genderSuffix} في محاكاة طبية (OSCE). 

=== معلوماتك ===
الاسم: ${patientName}
العمر: ${patientAge}
الجنس: ${patientGender === 'female' ? 'أنثى' : 'ذكر'}
المهنة: ${patientOccupation}
${patientMaritalStatus ? 'الحالة الاجتماعية: ' + patientMaritalStatus : ''}
القسم: ${scenario.department || ''}

=== الشكوى الرئيسية ===
${complaintFull}
(${complaintShort})

=== جميع بيانات الحالة الطبية ===
${scenarioData}

=== قواعد المحادثة - مهمة جداً ===
1. أجب بالعربية فقط - لا تستخدم الإنجليزية أبداً
2. افهم جميع الأسئلة سواء بالعامية أو الفصحى أو الإنجليزية وأجب بالعربية
3. افهم الأسئلة بكل صيغها مثل: "شو بوجعك" = "من ايش بتعاني" = "ما هي شكواك" = "what is your complaint"
4. أجب فقط بالمعلومات الموجودة في هذا السيناريو - لا تخترع أو تضيف أي معلومة
5. أجب بجمل قصيرة وطبيعية (1-3 جمل فقط) كأنك ${genderWord} حقيقي${genderSuffix}
6. إذا سُئلت عن شيء غير موجود في البيانات، قل "لا أعرف" أو "لست متأكد${genderSuffix}"
7. لا تذكر التشخيص أبداً - أنت ${genderWord} ولا تعرف تشخيصك
8. لا تذكر نتائج الفحوصات إلا إذا سُئلت عنها مباشرة
9. عبّر عن الألم والقلق بشكل طبيعي
10. لا تعطِ معلومات إضافية لم يُسأل عنها`;
  }

  /**
   * Recursively extracts ALL data from the scenario JSON into readable text
   */
  extractAllScenarioData(scenario) {
    const sections = [];

    // History of Presenting Complaint
    if (scenario.historyOfPresentingComplaint) {
      sections.push('--- تاريخ الشكوى الحالية ---');
      sections.push(this.flattenObject(scenario.historyOfPresentingComplaint, 
        scenario.arabicTranslations?.historyOfPresentingComplaint));
    }

    // Previous Similar Episodes
    if (scenario.previousSimilarEpisodes) {
      sections.push('--- نوبات سابقة مشابهة ---');
      sections.push(this.flattenObject(scenario.previousSimilarEpisodes,
        scenario.arabicTranslations?.previousSimilarEpisodes));
    }

    // Systematic Review
    if (scenario.systematicReview) {
      sections.push('--- المراجعة الجهازية ---');
      sections.push(this.flattenObject(scenario.systematicReview,
        scenario.arabicTranslations?.systematicReview));
    }

    // Past Medical History
    if (scenario.pastMedicalHistory) {
      sections.push('--- السوابق المرضية ---');
      sections.push(this.flattenObject(scenario.pastMedicalHistory,
        scenario.arabicTranslations?.pastMedicalHistory));
    }

    // Drug History
    if (scenario.drugHistory) {
      sections.push('--- تاريخ الأدوية ---');
      sections.push(this.flattenObject(scenario.drugHistory,
        scenario.arabicTranslations?.drugHistory));
    }

    // Allergies
    if (scenario.allergies) {
      sections.push('--- الحساسية ---');
      sections.push(this.flattenObject(scenario.allergies,
        typeof scenario.arabicTranslations?.allergies === 'string' 
          ? { info: scenario.arabicTranslations.allergies } 
          : scenario.arabicTranslations?.allergies));
    }

    // Social History
    if (scenario.socialHistory) {
      sections.push('--- التاريخ الاجتماعي ---');
      sections.push(this.flattenObject(scenario.socialHistory,
        scenario.arabicTranslations?.socialHistory));
    }

    // Family History
    if (scenario.familyHistory) {
      sections.push('--- التاريخ العائلي ---');
      sections.push(this.flattenObject(scenario.familyHistory,
        scenario.arabicTranslations?.familyHistory));
    }

    // Examination Findings
    if (scenario.examinationFindings) {
      sections.push('--- نتائج الفحص السريري ---');
      sections.push(this.flattenObject(scenario.examinationFindings,
        scenario.arabicTranslations?.examinationFindings));
    }

    // Investigation Results
    if (scenario.investigationResults) {
      sections.push('--- نتائج الفحوصات ---');
      sections.push(this.flattenObject(scenario.investigationResults,
        scenario.arabicTranslations?.investigationResults));
    }

    // Diagnosis (hidden from patient but needed for context)
    if (scenario.diagnosis) {
      sections.push('--- التشخيص (لا تذكره للطالب أبداً) ---');
      sections.push(this.flattenObject(scenario.diagnosis,
        scenario.arabicTranslations?.diagnosis));
    }

    // Negative symptoms
    if (scenario.historyOfPresentingComplaint?.negativeSymptoms) {
      sections.push('--- أعراض غير موجودة (أجب بـ "لا" عنها) ---');
      sections.push(this.flattenObject(scenario.historyOfPresentingComplaint.negativeSymptoms,
        scenario.arabicTranslations?.historyOfPresentingComplaint?.negativeSymptoms));
    }

    // Cushing features
    if (scenario.cushingSyndromeFeatures) {
      sections.push('--- علامات المرض ---');
      sections.push(this.flattenObject(scenario.cushingSyndromeFeatures,
        scenario.arabicTranslations?.cushingSyndromeFeatures));
    }

    // SLE Classification
    if (scenario.sleClassificationCriteria) {
      sections.push('--- معايير التصنيف ---');
      sections.push(this.flattenObject(scenario.sleClassificationCriteria,
        scenario.arabicTranslations?.sleClassificationCriteria));
    }

    // Management
    if (scenario.management) {
      sections.push('--- العلاج ---');
      sections.push(this.flattenObject(scenario.management,
        scenario.arabicTranslations?.management));
    }

    // Treatment
    if (scenario.treatment) {
      sections.push('--- العلاج ---');
      sections.push(this.flattenObject(scenario.treatment,
        scenario.arabicTranslations?.treatment));
    }

    // Best Initial Treatment
    if (scenario.bestInitialTreatment) {
      sections.push('--- أفضل علاج أولي ---');
      sections.push(this.flattenObject(scenario.bestInitialTreatment,
        scenario.arabicTranslations?.bestInitialTreatment));
    }

    // Risk Factors
    if (scenario.riskFactorsForGout) {
      sections.push('--- عوامل الخطر ---');
      sections.push(this.flattenObject(scenario.riskFactorsForGout,
        scenario.arabicTranslations?.riskFactorsForGout));
    }

    // Differential Diagnosis
    if (scenario.differentialDiagnosis) {
      sections.push('--- التشخيص التفريقي ---');
      sections.push(this.flattenObject(scenario.differentialDiagnosis,
        scenario.arabicTranslations?.differentialDiagnosis));
    }

    // Diagnostic Tests
    if (scenario.diagnosticTests) {
      sections.push('--- الفحوصات التشخيصية ---');
      sections.push(this.flattenObject(scenario.diagnosticTests,
        scenario.arabicTranslations?.diagnosticTests));
    }

    // Chest X-ray findings
    if (scenario.chestXrayFindings) {
      sections.push('--- نتائج صورة الصدر ---');
      sections.push(this.flattenObject(scenario.chestXrayFindings,
        scenario.arabicTranslations?.chestXrayFindings));
    }

    // Possible Complications
    if (scenario.possibleComplications) {
      sections.push('--- المضاعفات المحتملة ---');
      sections.push(this.flattenObject(scenario.possibleComplications,
        scenario.arabicTranslations?.possibleComplications));
    }

    // Joint Aspiration
    if (scenario.jointAspirationAnalysis) {
      sections.push('--- تحليل سائل المفصل ---');
      sections.push(this.flattenObject(scenario.jointAspirationAnalysis,
        scenario.arabicTranslations?.jointAspirationAnalysis));
    }

    // Next Step
    if (scenario.nextStep) {
      sections.push('--- الخطوة التالية ---');
      sections.push(this.flattenObject(scenario.nextStep,
        scenario.arabicTranslations?.nextStep));
    }

    return sections.join('\n');
  }

  /**
   * Flattens a nested object into readable text lines, preferring Arabic translations
   */
  flattenObject(obj, arabicObj, prefix = '') {
    if (!obj) return '';
    
    // If arabicObj is a string, return it directly
    if (typeof arabicObj === 'string') {
      return arabicObj;
    }

    // If arabicObj is an array, join it
    if (Array.isArray(arabicObj)) {
      return arabicObj.map(item => typeof item === 'string' ? `- ${item}` : this.flattenObject(item)).join('\n');
    }

    // If obj is an array
    if (Array.isArray(obj)) {
      return obj.map((item, i) => {
        if (typeof item === 'string') return `- ${item}`;
        if (item.name && item.present !== undefined) {
          return `- ${item.name}: ${item.present ? 'نعم' : 'لا'}`;
        }
        if (item.test && item.result) {
          return `- ${item.test}: ${item.result} (طبيعي: ${item.normalRange || ''})`;
        }
        if (item.drug) {
          return `- ${item.drug}: ${item.indication || ''}`;
        }
        if (item.intervention) {
          return `- ${item.intervention}: ${item.indication || ''}`;
        }
        if (item.parameter) {
          return `- مراقبة: ${item.parameter}`;
        }
        return this.flattenObject(item, arabicObj?.[i]);
      }).join('\n');
    }

    // If obj is a simple value
    if (typeof obj !== 'object') {
      return `${prefix}${obj}`;
    }

    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
      // Skip englishTerms - not needed in prompt
      if (key === 'englishTerms' || key === 'temperature' || key === 'maxTokens' || key === 'responseStyle') continue;
      
      const arabicValue = arabicObj?.[key];

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const displayValue = arabicValue || value;
        lines.push(`${key}: ${displayValue}`);
      } else if (Array.isArray(value)) {
        const displayArr = arabicValue || value;
        if (Array.isArray(displayArr)) {
          lines.push(this.flattenObject(displayArr, null));
        } else {
          lines.push(this.flattenObject(value, arabicValue));
        }
      } else if (typeof value === 'object' && value !== null) {
        lines.push(this.flattenObject(value, arabicValue));
      }
    }
    return lines.join('\n');
  }

  /**
   * Builds English system prompt dynamically
   */
  buildEnglishPrompt(scenario) {
    const patientName = scenario.patientInfo?.name || 'Patient';
    const patientAge = scenario.patientInfo?.age || '';
    const patientGender = scenario.patientInfo?.gender || 'male';
    const patientOccupation = scenario.patientInfo?.occupation || '';
    const genderWord = patientGender === 'female' ? 'female patient' : 'male patient';

    const scenarioData = this.extractAllScenarioData(scenario);

    return `You are a virtual ${genderWord} in a medical simulation (OSCE).

=== Your Information ===
Name: ${patientName}
Age: ${patientAge}
Gender: ${patientGender}
Occupation: ${patientOccupation}
Department: ${scenario.department || ''}

=== Chief Complaint ===
${scenario.presentingComplaintFull || ''}

=== Full Medical Case Data ===
${scenarioData}

=== CRITICAL Conversation Rules ===
1. Respond in English ONLY
2. Understand questions in any form (formal, informal, Arabic) and answer in English
3. Only use information from this scenario - do NOT invent or add anything
4. Answer in short, natural sentences (1-3 sentences) like a real patient
5. If asked about something not in the data, say "I don't know" or "I'm not sure"
6. NEVER mention the diagnosis - you are a patient and don't know your diagnosis
7. Don't mention test results unless directly asked
8. Express pain and worry naturally
9. Don't volunteer extra information not asked about`;
  }
}
