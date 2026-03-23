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

    this.sessions.set(sessionId, {
      sessionId,
      scenarioId,
      studentName,
      startTime: new Date(),
      questions: []
    });

    console.log(`📝 Created session ${sessionId} for ${studentName}`);
    return this.sessions.get(sessionId);
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }


}
