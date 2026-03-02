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
    if (language === 'ar') {
      return `مرحباً، أنا أحمد، المريض الافتراضي الخاص بك اليوم.

تم تطويري من قبل وحدة ليمينال في مركز الإعلام بجامعة النجاح الوطنية لتدريبك على مهاراتك السريرية بأمان وثقة.

لا تقلق، أنا صديقك اليوم وسأساعدك على الإجابة عن أي سؤال يخطر ببالك.

هيا نبدأ رحلتنا معاً بطريقة مريحة وممتعة!`;
    } else {
      return `Hello, I'm Ahmed, your virtual patient today.

I was developed by the Liminal Unit at the Media Center of An-Najah National University to help you practice your clinical skills safely and confidently.

Don't worry, I'm your friend today and I'll help you answer any questions you have.

Let's start our journey together in a comfortable and fun way!`;
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
    
    // Rule-based responses for common questions
    if (questionLower.includes('اسم') || questionLower.includes('شو اسمك')) {
      return `اسمي ${scenario.patientInfo.name}`;
    }
    
    if (questionLower.includes('عمر') || questionLower.includes('كم عمرك')) {
      return `عمري ${scenario.patientInfo.age} سنة`;
    }
    
    if (questionLower.includes('شكوى') || questionLower.includes('مشكلة') || questionLower.includes('شو عندك')) {
      return scenario.chiefComplaint;
    }
    
    if (questionLower.includes('بدأ') || questionLower.includes('متى') || questionLower.includes('وقت')) {
      return scenario.presentingIllness.onset;
    }
    
    if (questionLower.includes('نوع') || questionLower.includes('طبيعة') || questionLower.includes('كيف الألم')) {
      return scenario.presentingIllness.character;
    }
    
    if (questionLower.includes('ينتشر') || questionLower.includes('يمتد') || questionLower.includes('وين بيروح') || questionLower.includes('وين')) {
      return scenario.presentingIllness.radiation;
    }
    
    if (questionLower.includes('شدة') || questionLower.includes('قوة') || questionLower.includes('كم درجة')) {
      return `الألم شديد، حوالي ${scenario.presentingIllness.severity}`;
    }
    
    if (questionLower.includes('أعراض') || questionLower.includes('معاه') || questionLower.includes('شي تاني')) {
      return `نعم، عندي ${scenario.presentingIllness.associatedSymptoms.join('، ')}`;
    }
    
    if (questionLower.includes('تدخين') || questionLower.includes('سجائر') || questionLower.includes('دخان')) {
      return scenario.socialHistory.smoking;
    }
    
    if (questionLower.includes('سكري') || questionLower.includes('ضغط') || questionLower.includes('أمراض سابقة')) {
      return `نعم، عندي ${scenario.pastMedicalHistory.conditions.join('، ')}`;
    }
    
    if (questionLower.includes('أدوية') || questionLower.includes('علاج') || questionLower.includes('دوا')) {
      return `آخذ ${scenario.pastMedicalHistory.medications.join('، ')}`;
    }
    
    if (questionLower.includes('عائلة') || questionLower.includes('أهل') || questionLower.includes('والد')) {
      return scenario.familyHistory.cardiovascular;
    }
    
    if (questionLower.includes('ضغط الدم') || questionLower.includes('قياس')) {
      return `ضغطي ${scenario.physicalExam.vitals.bp}`;
    }

    if (questionLower.includes('نبض') || questionLower.includes('دقات القلب')) {
      return `نبضي ${scenario.physicalExam.vitals.hr}`;
    }

    if (questionLower.includes('حرارة')) {
      return `حرارتي ${scenario.physicalExam.vitals.temp}`;
    }
    
    // Default response
    return 'معذرة، ممكن تعيد السؤال بطريقة أوضح؟';
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
