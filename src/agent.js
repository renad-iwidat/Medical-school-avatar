import dotenv from 'dotenv';
import { ScenarioManager } from './scenario-manager.js';
import { OpenAIAgent } from './openai-agent.js';

dotenv.config();

export class MedicalAvatarAgent {
  constructor() {
    this.scenarioManager = new ScenarioManager();
    this.openaiAgent = new OpenAIAgent();
    this.activeSessions = new Map();
  }

  async initializeSession(roomName, scenarioId, language = 'ar') {
    try {
      const scenario = this.scenarioManager.getScenario(scenarioId);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      console.log(`🤖 Agent initialized for room: ${roomName} (Language: ${language})`);

      // Store session info
      this.activeSessions.set(roomName, {
        scenario,
        conversationHistory: [],
        startTime: new Date(),
        language
      });

      return {
        success: true,
        welcomeMessage: this.getWelcomeMessage(scenario, language)
      };
    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    }
  }

  getWelcomeMessage(scenario, language = 'ar') {
    const patientName = scenario.patientInfo.name;
    const patientLabel = scenario.patientInfo.gender === 'male' ? 'المريض الافتراضي الخاص' : 'المريضة الافتراضية الخاصة';
    
    if (language === 'ar') {
      return `مرحباً، أنا ${patientName}، ${patientLabel} بك اليوم. تفضل اسألني يلي بدك ياه.`;
    } else {
      return `Hello, I'm ${patientName}, your virtual patient today. Feel free to ask me anything.`;
    }
  }

  async processQuestion(roomName, question) {
    const session = this.activeSessions.get(roomName);
    if (!session) {
      return 'عذراً، الجلسة غير موجودة';
    }

    const scenario = session.scenario;
    
    // Add to conversation history
    session.conversationHistory.push({
      role: 'student',
      content: question,
      timestamp: new Date()
    });

    let response;

    // Try OpenAI first if available
    if (this.openaiAgent.isEnabled()) {
      console.log('🤖 Using OpenAI for response...');
      response = await this.openaiAgent.generateResponse(
        scenario, 
        question, 
        session.conversationHistory,
        session.language || 'ar'
      );
    }

    // Fallback to rule-based if OpenAI fails or not available
    if (!response) {
      console.log('� Using rule-based response...');
      response = this.generateResponse(scenario, question);
    }
    
    session.conversationHistory.push({
      role: 'avatar',
      content: response,
      timestamp: new Date()
    });

    console.log(`💬 Q: ${question}`);
    console.log(`💬 A: ${response}`);

    return response;
  }

  generateResponse(scenario, question) {
    const questionLower = question.toLowerCase();
    
    // Helper function to check if question contains any of the terms
    const containsAny = (terms) => terms.some(term => questionLower.includes(term.toLowerCase()));
    
    // === PATIENT INFO ===
    if (containsAny(['اسم', 'شو اسمك', 'name', 'what is your name'])) {
      return `اسمي ${scenario.patientInfo.name}`;
    }
    
    if (containsAny(['عمر', 'كم عمرك', 'age', 'how old'])) {
      return `عمري ${scenario.patientInfo.age} سنة`;
    }
    
    if (containsAny(['مهنة', 'شغل', 'occupation', 'job', 'work'])) {
      return `أنا ${scenario.patientInfo.occupation}`;
    }
    
    if (containsAny(['حالة اجتماعية', 'متزوجة', 'married', 'marital'])) {
      return `أنا ${scenario.patientInfo.maritalStatus}`;
    }
    
    // === PRESENTING COMPLAINT ===
    if (containsAny(['شكوى', 'مشكلة', 'شو عندك', 'complaint', 'problem', 'issue', 'presenting'])) {
      return scenario.presentingComplaintFull;
    }
    
    // === FATIGUE ===
    if (containsAny(['إرهاق', 'تعب', 'إرهاق', 'fatigue', 'tired', 'exhaustion', 'weakness', 'how long'])) {
      return `أشعر بالتعب منذ ${scenario.historyOfPresentingComplaint.fatigue.duration}، والحالة تزداد سوءاً`;
    }
    
    // === JOINT PAIN ===
    if (containsAny(['ألم مفاصل', 'ألم يد', 'ألم معصم', 'joint pain', 'arthralgia', 'arthritis', 'hand pain', 'wrist pain'])) {
      return `نعم، أشعر بألم في المفاصل الصغيرة في يدي والمعصمين، وهو ${scenario.historyOfPresentingComplaint.jointPain.pattern}`;
    }
    
    if (containsAny(['تورم', 'احمرار', 'swelling', 'redness', 'inflammation'])) {
      return `نعم، هناك ${scenario.historyOfPresentingComplaint.jointPain.swelling} و${scenario.historyOfPresentingComplaint.jointPain.redness}`;
    }
    
    if (containsAny(['تيبس صباح', 'morning stiffness', 'stiffness'])) {
      return `نعم، أشعر بتيبس في الصباح يستمر ${scenario.historyOfPresentingComplaint.jointPain.morningStiffness}`;
    }
    
    if (containsAny(['تشوه', 'deformity', 'deformities'])) {
      return `${scenario.historyOfPresentingComplaint.jointPain.deformities}`;
    }
    
    // === FACIAL RASH ===
    if (containsAny(['طفح', 'حمامي', 'رash', 'rash', 'malar', 'facial rash', 'cheeks', 'nose'])) {
      return `نعم، لدي طفح على وجهي يظهر بعد التعرض للشمس، على الخدين والأنف`;
    }
    
    if (containsAny(['حساسية ضوء', 'photosensitivity', 'sun exposure', 'light sensitivity'])) {
      return `نعم، أشعر بحساسية من الضوء والشمس`;
    }
    
    // === ORAL ULCERS ===
    if (containsAny(['قرح فم', 'قرح', 'oral ulcers', 'mouth ulcers', 'ulcers'])) {
      return `نعم، لدي قرح متكررة في الفم وهي غير مؤلمة`;
    }
    
    // === HAIR LOSS ===
    if (containsAny(['تساقط شعر', 'hair loss', 'alopecia'])) {
      return `نعم، أعاني من تساقط الشعر`;
    }
    
    // === FEVER ===
    if (containsAny(['حمى', 'حرارة', 'fever', 'temperature'])) {
      return `نعم، لدي ${scenario.historyOfPresentingComplaint.fever.type}`;
    }
    
    // === LEG SWELLING ===
    if (containsAny(['تورم ساق', 'تورم رجل', 'leg swelling', 'edema', 'lower limb'])) {
      return `نعم، ${scenario.historyOfPresentingComplaint.legSwelling.description}`;
    }
    
    // === SYSTEMATIC REVIEW ===
    if (containsAny(['ظاهرة رينود', 'raynaud', 'pale fingers', 'cold'])) {
      return `${scenario.systematicReview.raynaudsPhenomenon.answer}`;
    }
    
    if (containsAny(['ألم صدر', 'chest pain', 'pleuritic', 'pleurisy'])) {
      return `${scenario.systematicReview.chestPain.answer}`;
    }
    
    if (containsAny(['ضيق نفس', 'سعال', 'shortness of breath', 'dyspnea', 'cough', 'respiratory'])) {
      return `لا، لا أعاني من ضيق النفس أو السعال`;
    }
    
    if (containsAny(['تغيير بول', 'بول رغوي', 'urine changes', 'frothy urine', 'hematuria', 'dysuria'])) {
      return `نعم، ${scenario.systematicReview.urineChanges.description}`;
    }
    
    if (containsAny(['نوبات', 'ذهان', 'seizures', 'psychosis', 'neurological'])) {
      return `لا، لا أعاني من نوبات أو أعراض نفسية`;
    }
    
    if (containsAny(['إجهاض', 'حمل', 'miscarriage', 'pregnancy', 'obstetric'])) {
      return `${scenario.systematicReview.miscarriages.history}`;
    }
    
    // === PAST MEDICAL HISTORY ===
    if (containsAny(['سوابق مرضية', 'أمراض سابقة', 'past medical history', 'pmh', 'chronic illness'])) {
      return `${scenario.pastMedicalHistory.chronicIllness}`;
    }
    
    // === DRUG HISTORY ===
    if (containsAny(['أدوية', 'علاج', 'دوا', 'medication', 'medicine', 'drug', 'taking'])) {
      return `${scenario.drugHistory.medications}`;
    }
    
    // === ALLERGIES ===
    if (containsAny(['حساسية', 'allergy', 'allergies', 'nkda'])) {
      return `${scenario.allergies.drugAllergies}`;
    }
    
    // === SOCIAL HISTORY ===
    if (containsAny(['تدخين', 'smoking', 'smoke', 'cigarette'])) {
      return `${scenario.socialHistory.smoking}`;
    }
    
    if (containsAny(['كحول', 'alcohol', 'drink'])) {
      return `لا أشرب الكحول`;
    }
    
    if (containsAny(['مخدرات', 'recreational', 'drugs'])) {
      return `${scenario.socialHistory.recreationalDrugs}`;
    }
    
    // === FAMILY HISTORY ===
    if (containsAny(['عائلة', 'أهل', 'والد', 'والدة', 'family', 'father', 'mother', 'aunt', 'relative'])) {
      return `${scenario.familyHistory.rheumatologicalDisease}`;
    }
    
    // === INVESTIGATIONS ===
    if (containsAny(['فحوصات', 'تحاليل', 'investigations', 'tests', 'blood test', 'lab'])) {
      return `تم إجراء عدة فحوصات دم وتحليل بول`;
    }
    
    if (containsAny(['هيموجلوبين', 'hemoglobin', 'hb', 'anemia'])) {
      return `الهيموجلوبين 10.2 g/dL`;
    }
    
    if (containsAny(['كريات دم بيضاء', 'wbc', 'white blood cells', 'leukocytes'])) {
      return `كريات الدم البيضاء 3.2 ×10⁹/L`;
    }
    
    if (containsAny(['صفائح', 'platelets', 'thrombocytes'])) {
      return `الصفائح الدموية 110 ×10⁹/L`;
    }
    
    if (containsAny(['كرياتينين', 'creatinine', 'renal function', 'kidney'])) {
      return `الكرياتينين 1.9 mg/dL`;
    }
    
    if (containsAny(['يوريا', 'urea', 'bun'])) {
      return `اليوريا 60 mg/dL`;
    }
    
    if (containsAny(['ana', 'antinuclear antibody'])) {
      return `ANA إيجابي`;
    }
    
    if (containsAny(['anti-dsna', 'anti-dsdna', 'dsdna'])) {
      return `Anti-dsDNA 1:320`;
    }
    
    if (containsAny(['complement', 'c3', 'c4'])) {
      return `C3 و C4 منخفضة`;
    }
    
    if (containsAny(['بروتين', 'protein', 'proteinuria'])) {
      return `البروتين في البول +++`;
    }
    
    if (containsAny(['دم بول', 'blood', 'hematuria'])) {
      return `الدم في البول ++`;
    }
    
    // === DIAGNOSIS ===
    if (containsAny(['تشخيص', 'diagnosis', 'sle', 'lupus', 'systemic lupus'])) {
      return `التشخيص هو الذئبة الحمراء الجهازية مع التهاب الكلى الذئبي`;
    }
    
    // === MANAGEMENT ===
    if (containsAny(['علاج', 'management', 'treatment', 'medication'])) {
      return `العلاج يشمل هيدروكسي كلوروكين والكورتيكوستيرويدات والعلاج المثبط للمناعة`;
    }
    
    if (containsAny(['حماية شمس', 'sun protection', 'uv'])) {
      return `يجب تجنب التعرض للشمس والأشعة فوق البنفسجية`;
    }
    
    if (containsAny(['روماتيزم', 'rheumatology', 'specialist'])) {
      return `نعم، يجب إحالتي إلى أخصائي الروماتيزم`;
    }
    
    // === CUSHING SYNDROME SPECIFIC ===
    if (containsAny(['كسر', 'fracture', 'radius', 'ulnar', 'trauma', 'fall', 'bone'])) {
      return `نعم، كسرت ذراعي بعد سقوط بسيط في البيت منذ أسبوع`;
    }
    
    if (containsAny(['وزن', 'weight gain', 'obesity', 'central obesity', 'abdominal'])) {
      return `نعم، اكتسبت حوالي 10 كيلوغرامات على مدى سنتين، معظمها حول البطن`;
    }
    
    if (containsAny(['إرهاق', 'fatigue', 'tired', 'tiredness', 'exhaustion', 'weakness'])) {
      return `نعم، أشعر بالإرهاق منذ سنة أو سنتين`;
    }
    
    if (containsAny(['ضعف عضلات', 'muscle weakness', 'proximal weakness', 'climbing stairs'])) {
      return `نعم، أشعر بصعوبة في صعود السلالم`;
    }
    
    if (containsAny(['حب شباب', 'acne', 'skin lesions'])) {
      return `نعم، ظهر لدي حب شباب مؤخراً`;
    }
    
    if (containsAny(['كدمات', 'easy bruising', 'bruising'])) {
      return `لا، لا أعاني من كدمات سهلة`;
    }
    
    if (containsAny(['خطوط أرجوانية', 'purple striae', 'striae'])) {
      return `لا، لا توجد خطوط أرجوانية`;
    }
    
    if (containsAny(['شعر زائد', 'hirsutism'])) {
      return `لا، لا أعاني من شعر زائد`;
    }
    
    if (containsAny(['دورة شهرية', 'irregular menstruation', 'menstrual'])) {
      return `لا، دورتي الشهرية منتظمة`;
    }
    
    if (containsAny(['صوت', 'voice changes', 'voice deepening'])) {
      return `لا، صوتي لم يتغير`;
    }
    
    if (containsAny(['ضغط دم', 'hypertension', 'blood pressure', 'bp'])) {
      return `نعم، تم تشخيصي بارتفاع ضغط الدم قبل بضعة أشهر`;
    }
    
    if (containsAny(['أملوديبين', 'amlodipine'])) {
      return `نعم، أتناول أملوديبين لارتفاع ضغط الدم`;
    }
    
    if (containsAny(['كورتيكوستيرويد', 'steroid', 'oral steroid', 'inhaled steroid', 'topical steroid'])) {
      return `لا، لم أتناول أي كورتيكوستيرويدات`;
    }
    
    if (containsAny(['وجه قمري', 'moon face'])) {
      return `قد يكون وجهي مستديراً قليلاً`;
    }
    
    if (containsAny(['تهيج', 'irritability', 'mood changes'])) {
      return `نعم، أشعر بتهيج خفيف أحياناً`;
    }
    
    if (containsAny(['سعال', 'cough', 'respiratory'])) {
      return `لا، لا أعاني من سعال`;
    }
    
    if (containsAny(['ضيق نفس', 'shortness of breath', 'dyspnea'])) {
      return `لا، لا أعاني من ضيق النفس`;
    }
    
    if (containsAny(['حرارة', 'fever', 'temperature'])) {
      return `لا، لا أعاني من حمى`;
    }
    
    if (containsAny(['عرق ليلي', 'night sweats'])) {
      return `لا، لا أعاني من عرق ليلي`;
    }
    
    if (containsAny(['ألم صدر', 'chest pain'])) {
      return `لا، لا أعاني من ألم في الصدر`;
    }
    
    if (containsAny(['خفقان', 'palpitations'])) {
      return `لا، لا أعاني من خفقان`;
    }
    
    if (containsAny(['تبول كثير', 'polyuria'])) {
      return `لا، لا أعاني من تبول كثير`;
    }
    
    if (containsAny(['عطش', 'polydipsia'])) {
      return `لا، لا أعاني من عطش شديد`;
    }
    
    if (containsAny(['ألم بطن', 'abdominal pain'])) {
      return `لا، لا أعاني من ألم في البطن`;
    }
    
    if (containsAny(['براز', 'bowel habits'])) {
      return `لا، لم تتغير عادات الإخراج لدي`;
    }
    
    if (containsAny(['صداع', 'headaches'])) {
      return `لا، لا أعاني من صداع`;
    }
    
    if (containsAny(['رؤية', 'visual disturbances'])) {
      return `لا، لا أعاني من مشاكل في الرؤية`;
    }
    
    if (containsAny(['اكتئاب', 'depression'])) {
      return `لا، لا أعاني من اكتئاب`;
    }
    
    if (containsAny(['سكري', 'diabetes'])) {
      return `لا، لا أعاني من السكري`;
    }
    
    if (containsAny(['غدة درقية', 'thyroid disease'])) {
      return `لا، لا أعاني من أمراض الغدة الدرقية`;
    }
    
    if (containsAny(['تدخين', 'smoking', 'smoke'])) {
      return `لا، أنا لا أدخن`;
    }
    
    if (containsAny(['كحول', 'alcohol'])) {
      return `لا، لا أشرب الكحول`;
    }
    
    if (containsAny(['مخدرات', 'drug use', 'drugs'])) {
      return `لا، لا أستخدم أي مخدرات`;
    }
    
    if (containsAny(['عائلة', 'family history', 'aunt', 'relative'])) {
      return `لا، لا توجد أمراض غدية أو هشاشة عظام في العائلة`;
    }
    
    if (containsAny(['فحوصات', 'tests', 'investigations', 'blood test'])) {
      return `لم يتم إجراء فحوصات تفصيلية حتى الآن`;
    }
    
    if (containsAny(['cortisol', 'كورتيزول'])) {
      return `لا أعرف مستويات الكورتيزول لدي`;
    }
    
    if (containsAny(['acth', 'أكث'])) {
      return `لا أعرف مستويات ACTH لدي`;
    }
    
    if (containsAny(['dexamethasone', 'ديكساميثازون'])) {
      return `لم أجري اختبار ديكساميثازون`;
    }
    
    if (containsAny(['dexa', 'bone density', 'كثافة عظام'])) {
      return `لم أجري فحص DEXA`;
    }
    
    if (containsAny(['hba1c', 'glucose', 'سكر الدم'])) {
      return `لا أعرف مستويات السكر لدي`;
    }
    
    if (containsAny(['lipid', 'كوليسترول'])) {
      return `لا أعرف مستويات الكوليسترول لدي`;
    }
    
    if (containsAny(['electrolytes', 'potassium', 'بوتاسيوم'])) {
      return `لا أعرف مستويات الأملاح لدي`;
    }
    
    if (containsAny(['cushing', 'كوشينج'])) {
      return `لا أعرف ما هو متلازمة كوشينج`;
    }
    
    if (containsAny(['osteoporosis', 'هشاشة عظام'])) {
      return `قد يكون لدي هشاشة عظام بسبب الكسر`;
    }
    
    if (containsAny(['pathological fracture', 'كسر مرضي'])) {
      return `الطبيب قال أن الكسر غير متوقع من سقوط بسيط`;
    }
    
    // === SARCOIDOSIS SPECIFIC ===
    if (containsAny(['سعال', 'cough', 'dry cough', 'bad cough'])) {
      return `نعم، لدي سعال جاف سيء منذ شهر، يزداد سوءاً`;
    }
    
    if (containsAny(['ضيق نفس', 'shortness of breath', 'dyspnea', 'exertional'])) {
      return `نعم، أشعر بضيق النفس خاصة عند بذل مجهود`;
    }
    
    if (containsAny(['طفح', 'rash', 'erythema nodosum', 'skin rash'])) {
      return `نعم، لاحظت طفح على ساقي`;
    }
    
    if (containsAny(['حمى', 'fever', 'feverish', 'temperature'])) {
      return `نعم، أشعر بحمى أحياناً، درجة الحرارة وصلت إلى 38 درجة`;
    }
    
    if (containsAny(['إمساك', 'constipation'])) {
      return `نعم، أعاني من إمساك`;
    }
    
    if (containsAny(['سفر', 'travel', 'infections', 'عدوى'])) {
      return `لا، لم أسافر ولم أتعرض لعدوى مؤخراً`;
    }
    
    if (containsAny(['تدخين', 'smoking', 'smoke'])) {
      return `لا، أنا لا أدخن`;
    }
    
    if (containsAny(['شراب سعال', 'cough syrup'])) {
      return `جربت شراب السعال لكنه لم يساعد`;
    }
    
    if (containsAny(['عدوى تنفسية', 'upper respiratory', 'URI'])) {
      return `نعم، أحياناً أصاب بعدوى تنفسية عليا تزول في أسبوع`;
    }
    
    if (containsAny(['إرهاق', 'fatigue', 'tired'])) {
      return `نعم، أشعر بالإرهاق`;
    }
    
    if (containsAny(['وزن', 'overweight', 'weight'])) {
      return `نعم، أنا أعاني من زيادة الوزن`;
    }
    
    if (containsAny(['لحم أحمر', 'red meat', 'diet'])) {
      return `أتناول اللحم الأحمر أحياناً والمشروبات السكرية`;
    }
    
    if (containsAny(['كحول', 'alcohol'])) {
      return `لا، لا أشرب الكحول`;
    }
    
    if (containsAny(['مخدرات', 'recreational drugs'])) {
      return `لا، لا أستخدم أي مخدرات`;
    }
    
    if (containsAny(['ضغط دم', 'hypertension', 'blood pressure'])) {
      return `نعم، لدي ارتفاع في ضغط الدم`;
    }
    
    if (containsAny(['ألم صدر', 'chest pain'])) {
      return `لا، لا أعاني من ألم في الصدر`;
    }
    
    if (containsAny(['ألم بطن', 'abdominal pain'])) {
      return `لا، لا أعاني من ألم في البطن`;
    }
    
    if (containsAny(['أعراض بولية', 'urinary symptoms'])) {
      return `لا، لا أعاني من أعراض بولية`;
    }
    
    if (containsAny(['أعراض عصبية', 'neurological symptoms'])) {
      return `لا، لا أعاني من أعراض عصبية`;
    }
    
    if (containsAny(['فقدان وزن', 'weight loss'])) {
      return `لا، لم أفقد وزناً`;
    }
    
    if (containsAny(['ild', 'interstitial lung disease', 'مرض الرئة'])) {
      return `قد يكون لدي مرض رئوي خلالي`;
    }
    
    if (containsAny(['tb', 'tuberculosis', 'سل'])) {
      return `لا أعرف إن كان لدي سل`;
    }
    
    if (containsAny(['viral', 'fungal', 'فيروسي', 'فطري'])) {
      return `قد تكون العدوى فيروسية أو فطرية`;
    }
    
    if (containsAny(['foreign body', 'جسم غريب'])) {
      return `لا أعتقد أنني استنشقت جسماً غريباً`;
    }
    
    if (containsAny(['cbc', 'complete blood count', 'تعداد دم'])) {
      return `لم أجري تعداد دم كامل`;
    }
    
    if (containsAny(['crp', 'c-reactive protein', 'بروتين سي'])) {
      return `لا أعرف مستوى بروتين سي التفاعلي`;
    }
    
    if (containsAny(['abg', 'arterial blood gas', 'غاز دم'])) {
      return `لم أجري فحص غاز الدم`;
    }
    
    if (containsAny(['calcium', 'vitamin d', 'كالسيوم', 'فيتامين د'])) {
      return `لا أعرف مستويات الكالسيوم وفيتامين د`;
    }
    
    if (containsAny(['chest ct', 'ct scan', 'تصوير مقطعي'])) {
      return `لم أجري تصوير مقطعي للصدر`;
    }
    
    if (containsAny(['bilateral hilar', 'تضخم عقد', 'lymphadenopathy'])) {
      return `قد يكون لدي تضخم في العقد اللمفاوية`;
    }
    
    if (containsAny(['reticular infiltrates', 'تسللات شبكية'])) {
      return `قد تكون هناك تسللات شبكية في الرئتين`;
    }
    
    if (containsAny(['sarcoidosis', 'ساركويدوسيس'])) {
      return `لا أعرف ما هي الساركويدوسيس`;
    }
    
    if (containsAny(['lung biopsy', 'خزعة رئة'])) {
      return `لم أجري خزعة رئة`;
    }
    
    if (containsAny(['arthralgia', 'joint pain', 'ألم مفاصل'])) {
      return `لا، لا أعاني من ألم في المفاصل`;
    }
    
    if (containsAny(['neck swelling', 'تورم رقبة'])) {
      return `لا، لا توجد تورم في الرقبة`;
    }
    
    if (containsAny(['uveitis', 'التهاب العنبية'])) {
      return `لا، لا أعاني من مشاكل في العيون`;
    }
    
    if (containsAny(['splenomegaly', 'تضخم الطحال'])) {
      return `لا أعرف إن كان الطحال متضخماً`;
    }
    
    if (containsAny(['hypercalcemia', 'ارتفاع كالسيوم'])) {
      return `لا أعرف إن كان لدي ارتفاع في الكالسيوم`;
    }
    
    if (containsAny(['corticosteroids', 'steroids', 'كورتيكوستيرويد'])) {
      return `لم أتناول أي كورتيكوستيرويدات`;
    }
    
    if (containsAny(['fibrosis', 'تليف', 'pulmonary hypertension'])) {
      return `أتمنى ألا أصاب بمضاعفات خطيرة`;
    }
    
    if (containsAny(['bronchiectasis', 'توسع الشعب'])) {
      return `لا أعرف إن كان لدي توسع في الشعب الهوائية`;
    }
    
    if (containsAny(['arrhythmias', 'heart failure', 'عدم انتظام ضربات'])) {
      return `لا، لا أعاني من مشاكل في القلب`;
    }
    
    if (containsAny(['glaucoma', 'cataracts', 'blindness', 'جلوكوما'])) {
      return `لا، لا أعاني من مشاكل في الرؤية`;
    }
    
    if (containsAny(['cranial nerve palsy', 'seizures', 'neuropathy', 'شلل عصبي'])) {
      return `لا، لا أعاني من أعراض عصبية`;
    }
    
    if (containsAny(['kidney stones', 'renal failure', 'حصى كلى'])) {
      return `لا، لا أعاني من مشاكل في الكلى`;
    }
    
    // === GOUT SPECIFIC ===
    if (containsAny(['ألم ركبة', 'knee pain', 'right knee', 'severe pain'])) {
      return `نعم، ألم شديد جداً في الركبة اليمنى، استيقظني من النوم الساعة الثانية صباحاً`;
    }
    
    if (containsAny(['تورم', 'swelling', 'swollen'])) {
      return `نعم، الركبة متورمة وحمراء وساخنة`;
    }
    
    if (containsAny(['دفء', 'warmth', 'warm'])) {
      return `نعم، الركبة دافئة جداً`;
    }
    
    if (containsAny(['احمرار', 'redness', 'erythematous'])) {
      return `نعم، هناك احمرار واضح على الركبة`;
    }
    
    if (containsAny(['صعوبة المشي', 'difficulty walking', 'walking'])) {
      return `نعم، لا أستطيع المشي بسبب الألم الشديد`;
    }
    
    if (containsAny(['حركة', 'movement', 'motion'])) {
      return `أي حركة تزيد الألم بشكل كبير`;
    }
    
    if (containsAny(['لمس', 'touch', 'touching'])) {
      return `حتى لمس الركبة بخفة يسبب ألماً شديداً`;
    }
    
    if (containsAny(['صدمة', 'trauma', 'injury'])) {
      return `لا، لم أتعرض لأي صدمة أو إصابة`;
    }
    
    if (containsAny(['إصبع القدم', 'big toe', 'podagra', 'toe'])) {
      return `نعم، قبل سنة تقريباً كان لدي ألم وتورم في قاعدة إصبع القدم الكبير الأيسر`;
    }
    
    if (containsAny(['حمى', 'fever', 'feverish'])) {
      return `أشعر بحمى خفيفة`;
    }
    
    if (containsAny(['وزن', 'overweight', 'obesity'])) {
      return `نعم، أنا أعاني من زيادة الوزن`;
    }
    
    if (containsAny(['لحم أحمر', 'red meat'])) {
      return `أتناول اللحم الأحمر أحياناً`;
    }
    
    if (containsAny(['مشروبات سكرية', 'sugary beverages'])) {
      return `نعم، أشرب المشروبات السكرية بانتظام`;
    }
    
    if (containsAny(['رامبريل', 'ramipril', 'ace inhibitor'])) {
      return `نعم، أتناول رامبريل لارتفاع ضغط الدم`;
    }
    
    if (containsAny(['هيدروكلوروثيازيد', 'hydrochlorothiazide', 'hctz', 'diuretic'])) {
      return `نعم، أتناول هيدروكلوروثيازيد أيضاً`;
    }
    
    if (containsAny(['ضغط دم', 'hypertension', 'blood pressure'])) {
      return `نعم، لدي ارتفاع في ضغط الدم منذ 5 سنوات`;
    }
    
    if (containsAny(['سعال', 'cough'])) {
      return `لا، لا أعاني من سعال`;
    }
    
    if (containsAny(['ألم صدر', 'chest pain'])) {
      return `لا، لا أعاني من ألم في الصدر`;
    }
    
    if (containsAny(['ألم بطن', 'abdominal pain'])) {
      return `لا، لا أعاني من ألم في البطن`;
    }
    
    if (containsAny(['إسهال', 'diarrhea'])) {
      return `لا، لا أعاني من إسهال`;
    }
    
    if (containsAny(['أعراض بولية', 'urinary symptoms'])) {
      return `لا، لا أعاني من أعراض بولية`;
    }
    
    if (containsAny(['طفح', 'rash'])) {
      return `لا، لا يوجد طفح`;
    }
    
    if (containsAny(['فقدان وزن', 'weight loss'])) {
      return `لا، لم أفقد وزناً`;
    }
    
    if (containsAny(['تدخين', 'smoking'])) {
      return `لا، لا أدخن`;
    }
    
    if (containsAny(['كحول', 'alcohol'])) {
      return `لا، لا أشرب الكحول`;
    }
    
    if (containsAny(['سفر', 'travel'])) {
      return `لا، لم أسافر مؤخراً`;
    }
    
    if (containsAny(['عدوى', 'infection'])) {
      return `لا، لم أتعرض لعدوى مؤخراً`;
    }
    
    if (containsAny(['ibuprofen', 'إيبوبروفين'])) {
      return `نعم، تحسنت الحالة بعد تناول الإيبوبروفين في المرة السابقة`;
    }
    
    if (containsAny(['joint aspiration', 'شفط المفصل', 'synovial fluid'])) {
      return `لم أجري شفط للمفصل بعد`;
    }
    
    if (containsAny(['cell count', 'wbc', 'تعداد خلايا'])) {
      return `لا أعرف تعداد الخلايا`;
    }
    
    if (containsAny(['gram stain', 'culture', 'بكتيريا'])) {
      return `لا أعرف نتائج الزراعة`;
    }
    
    if (containsAny(['crystal analysis', 'polarized light', 'بلورات'])) {
      return `لا أعرف عن تحليل البلورات`;
    }
    
    if (containsAny(['septic arthritis', 'عدوى المفصل'])) {
      return `آمل ألا تكون عدوى في المفصل`;
    }
    
    if (containsAny(['gout', 'gouty arthritis', 'نقرس'])) {
      return `لا أعرف ما هو النقرس`;
    }
    
    if (containsAny(['hyperuricemia', 'uric acid', 'حمض اليوريك'])) {
      return `لا أعرف مستويات حمض اليوريك لدي`;
    }
    
    if (containsAny(['metabolic syndrome', 'renal failure', 'kidney'])) {
      return `لا أعرف إن كان لدي مشاكل في الكلى`;
    }
    
    if (containsAny(['thiazide', 'tumor lysis', 'عوامل الخطر'])) {
      return `لا أعرف عوامل الخطر`;
    }
    
    if (containsAny(['allopurinol', 'febuxostat', 'probenecid'])) {
      return `لم أتناول أي من هذه الأدوية`;
    }
    
    if (containsAny(['colchicine', 'كولشيسين'])) {
      return `لا أعرف عن الكولشيسين`;
    }
    
    if (containsAny(['nsaids', 'indomethacin', 'naproxen'])) {
      return `أتناول الإيبوبروفين أحياناً للألم`;
    }
    
    if (containsAny(['corticosteroids', 'steroids', 'كورتيكوستيرويد'])) {
      return `لم أتناول أي كورتيكوستيرويدات`;
    }
    
    if (containsAny(['bmi', 'body mass index', 'مؤشر كتلة'])) {
      return `وزني 106 كيلوغرام وطولي 170 سنتيمتر`;
    }
    
    if (containsAny(['effusion', 'تجمع سائل'])) {
      return `نعم، هناك تجمع سائل في الركبة`;
    }
    
    if (containsAny(['range of motion', 'حركة المفصل'])) {
      return `حركة الركبة محدودة جداً بسبب الألم والتورم`;
    }
    
    // Default response
    return 'معذرة، ممكن تعيدي السؤال بطريقة أوضح؟';
  }

  getConversationHistory(roomName) {
    const session = this.activeSessions.get(roomName);
    return session ? session.conversationHistory : [];
  }

  endSession(roomName) {
    const session = this.activeSessions.get(roomName);
    if (session) {
      const duration = new Date() - session.startTime;
      console.log(`👋 Session ended: ${roomName} (Duration: ${Math.round(duration/1000)}s)`);
      this.activeSessions.delete(roomName);
      return true;
    }
    return false;
  }
}
