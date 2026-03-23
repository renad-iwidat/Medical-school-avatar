import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ScenarioManager {
  constructor() {
    this.scenariosPath = path.join(__dirname, '../data/scenarios');
    this.scenarios = new Map();
    this.loadScenarios();
  }

  loadScenarios() {
    try {
      const files = fs.readdirSync(this.scenariosPath);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.scenariosPath, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const scenario = JSON.parse(data);
          this.scenarios.set(scenario.id, scenario);
        }
      });
      
      console.log(`✅ Loaded ${this.scenarios.size} scenarios`);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  }

  listScenarios() {
    const scenarios = Array.from(this.scenarios.values()).map(s => ({
      id: s.id,
      title: s.title,
      difficulty: s.difficulty,
      chiefComplaint: s.chiefComplaint
    }));
    
    console.log(`📋 Returning ${scenarios.length} scenarios:`, scenarios.map(s => s.id));
    
    return scenarios;
  }

  getScenario(id) {
    return this.scenarios.get(id);
  }

  getScenarioForStudent(id) {
    const scenario = this.scenarios.get(id);
    if (!scenario) return null;

    // Return only patient-facing information
    return {
      id: scenario.id,
      patientInfo: scenario.patientInfo,
      chiefComplaint: scenario.chiefComplaint,
      avatarPersonality: scenario.avatarPersonality
    };
  }
}
