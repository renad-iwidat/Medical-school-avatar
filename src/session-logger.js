import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export class SessionLogger {
  constructor() {
    this.activeLogs = new Map();
  }

  startLog(sessionId, { studentName, department, session: sessionPeriod, scenarioId }) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const logData = {
      sessionId,
      studentName,
      department,
      session: sessionPeriod,
      scenarioId,
      startTime: now.toISOString(),
      endTime: null,
      conversation: []
    };

    // File name: date_studentName_department_session.json
    const safeName = studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
    const fileName = `${dateStr}_${timeStr}_${safeName}.json`;
    const filePath = path.join(LOGS_DIR, fileName);

    this.activeLogs.set(sessionId, { filePath, logData });
    this._save(sessionId);

    console.log(`📋 Log started: ${fileName}`);
    return filePath;
  }

  logMessage(sessionId, role, message) {
    const entry = this.activeLogs.get(sessionId);
    if (!entry) return;

    entry.logData.conversation.push({
      role,
      message,
      timestamp: new Date().toISOString()
    });

    this._save(sessionId);
  }

  endLog(sessionId) {
    const entry = this.activeLogs.get(sessionId);
    if (!entry) return;

    entry.logData.endTime = new Date().toISOString();
    this._save(sessionId);

    console.log(`📋 Log ended: ${path.basename(entry.filePath)}`);
    this.activeLogs.delete(sessionId);
  }

  _save(sessionId) {
    const entry = this.activeLogs.get(sessionId);
    if (!entry) return;

    try {
      fs.writeFileSync(entry.filePath, JSON.stringify(entry.logData, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Failed to save log:', err.message);
    }
  }
}
