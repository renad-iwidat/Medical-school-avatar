import { ScenarioManager } from './scenario-manager.js';

export class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.scenarioManager = new ScenarioManager();
  }

  createSession(sessionId, scenarioId, studentName) {
    const scenario = this.scenarioManager.getScenario(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // Deep clone the evaluation checklist
    const evaluationChecklist = JSON.parse(JSON.stringify(scenario.evaluationChecklist));

    this.sessions.set(sessionId, {
      sessionId,
      scenarioId,
      studentName,
      startTime: new Date(),
      questions: [],
      evaluationChecklist,
      totalPoints: scenario.totalPoints,
      earnedPoints: 0
    });

    console.log(`📝 Created session ${sessionId} for ${studentName}`);
    return this.sessions.get(sessionId);
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  updateEvaluation(sessionId, question) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Record the question
    session.questions.push({
      question,
      timestamp: new Date()
    });

    // Check which checklist items were addressed
    const checklist = session.evaluationChecklist;
    const questionLower = question.toLowerCase();

    // History items (Arabic + English)
    if (questionLower.includes('شكوى') || questionLower.includes('مشكل') || 
        questionLower.includes('complaint') || questionLower.includes('problem') || questionLower.includes('issue')) {
      checklist.history.chiefComplaint.asked = true;
    }
    if (questionLower.includes('بدأ') || questionLower.includes('متى') || 
        questionLower.includes('when') || questionLower.includes('start') || questionLower.includes('began') || questionLower.includes('onset')) {
      checklist.history.onset.asked = true;
    }
    if (questionLower.includes('نوع') || questionLower.includes('طبيعة') || questionLower.includes('كيف') || 
        questionLower.includes('character') || questionLower.includes('type') || questionLower.includes('nature') || 
        questionLower.includes('describe') || questionLower.includes('feel')) {
      checklist.history.character.asked = true;
    }
    if (questionLower.includes('ينتشر') || questionLower.includes('يمتد') || questionLower.includes('وين') || 
        questionLower.includes('radiat') || questionLower.includes('spread') || questionLower.includes('where') || questionLower.includes('location')) {
      checklist.history.radiation.asked = true;
    }
    if (questionLower.includes('شدة') || questionLower.includes('قوة') || questionLower.includes('كم') || 
        questionLower.includes('severity') || questionLower.includes('how bad') || questionLower.includes('scale') || 
        questionLower.includes('intense') || questionLower.includes('strong')) {
      checklist.history.severity.asked = true;
    }
    if (questionLower.includes('أعراض') || questionLower.includes('معاه') || 
        questionLower.includes('symptom') || questionLower.includes('associated') || questionLower.includes('other') || 
        questionLower.includes('else') || questionLower.includes('accompan')) {
      checklist.history.associatedSymptoms.asked = true;
    }
    if (questionLower.includes('تدخين') || questionLower.includes('سكري') || questionLower.includes('ضغط') || 
        questionLower.includes('smok') || questionLower.includes('diabet') || questionLower.includes('hypertension') || 
        questionLower.includes('risk') || questionLower.includes('factor')) {
      checklist.history.riskFactors.asked = true;
    }
    if (questionLower.includes('سوابق') || questionLower.includes('أمراض سابقة') || 
        questionLower.includes('medical history') || questionLower.includes('past') || questionLower.includes('previous') || 
        questionLower.includes('disease') || questionLower.includes('condition')) {
      checklist.history.pastMedicalHistory.asked = true;
    }
    if (questionLower.includes('أدوية') || questionLower.includes('علاج') || 
        questionLower.includes('medication') || questionLower.includes('medicine') || questionLower.includes('drug') || 
        questionLower.includes('taking') || questionLower.includes('treatment')) {
      checklist.history.medications.asked = true;
    }
    if (questionLower.includes('عائلة') || questionLower.includes('عائلي') || 
        questionLower.includes('family') || questionLower.includes('father') || questionLower.includes('mother') || 
        questionLower.includes('parent') || questionLower.includes('relative')) {
      checklist.history.familyHistory.asked = true;
    }

    // Examination items (Arabic + English)
    if (questionLower.includes('ضغط') || questionLower.includes('نبض') || questionLower.includes('حرارة') || 
        questionLower.includes('pressure') || questionLower.includes('pulse') || questionLower.includes('heart rate') || 
        questionLower.includes('temperature') || questionLower.includes('vital') || questionLower.includes('bp')) {
      checklist.examination.vitals.asked = true;
    }
    if (questionLower.includes('قلب') || questionLower.includes('فحص القلب') || 
        questionLower.includes('heart') || questionLower.includes('cardiac') || questionLower.includes('cardiovascular') || 
        questionLower.includes('chest exam')) {
      checklist.examination.cardiovascular.asked = true;
    }
    if (questionLower.includes('صدر') || questionLower.includes('رئة') || questionLower.includes('تنفس') || 
        questionLower.includes('lung') || questionLower.includes('respiratory') || questionLower.includes('breath') || 
        questionLower.includes('chest')) {
      checklist.examination.respiratory.asked = true;
    }

    // Investigations (Arabic + English)
    if (questionLower.includes('تخطيط') || questionLower.includes('ecg') || questionLower.includes('إي سي جي') || 
        questionLower.includes('ekg') || questionLower.includes('electrocardiogram')) {
      checklist.investigations.ecg.asked = true;
    }
    if (questionLower.includes('تروبونين') || questionLower.includes('إنزيم') || questionLower.includes('troponin') || 
        questionLower.includes('cardiac marker') || questionLower.includes('enzyme') || questionLower.includes('blood test')) {
      checklist.investigations.cardiacMarkers.asked = true;
    }

    return checklist;
  }

  calculateScore(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    let earnedPoints = 0;
    const checklist = session.evaluationChecklist;

    // Calculate points from all categories
    Object.values(checklist).forEach(category => {
      Object.values(category).forEach(item => {
        if (item.asked) {
          earnedPoints += item.points;
        }
      });
    });

    session.earnedPoints = earnedPoints;

    return {
      earnedPoints,
      totalPoints: session.totalPoints,
      percentage: ((earnedPoints / session.totalPoints) * 100).toFixed(2)
    };
  }

  getEvaluation(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const score = this.calculateScore(sessionId);

    return {
      sessionId: session.sessionId,
      studentName: session.studentName,
      scenarioId: session.scenarioId,
      startTime: session.startTime,
      endTime: new Date(),
      questions: session.questions,
      evaluationChecklist: session.evaluationChecklist,
      score
    };
  }
}
