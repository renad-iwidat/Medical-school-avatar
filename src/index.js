import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { ScenarioManager } from './scenario-manager.js';
import { SessionManager } from './session-manager.js';
import { MedicalAvatarAgent } from './agent.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(express.static('public'));

const scenarioManager = new ScenarioManager();
const sessionManager = new SessionManager();
const agent = new MedicalAvatarAgent();

// Get available scenarios
app.get('/api/scenarios', (req, res) => {
  const scenarios = scenarioManager.listScenarios();
  res.json(scenarios);
});

// Get scenario details
app.get('/api/scenarios/:id', (req, res) => {
  const scenario = scenarioManager.getScenario(req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }
  res.json(scenario);
});

// Start new session
app.post('/api/session/start', async (req, res) => {
  try {
    const { studentName, scenarioId, language } = req.body;
    
    if (!studentName || !scenarioId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}`;
    
    // Initialize session
    sessionManager.createSession(sessionId, scenarioId, studentName);
    
    // Initialize agent
    const agentInit = await agent.initializeSession(sessionId, scenarioId, language || 'ar');
    console.log(`🤖 ${agentInit.welcomeMessage}`);

    res.json({ 
      sessionId,
      welcomeMessage: agentInit.welcomeMessage,
      success: true
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Get session evaluation
app.get('/api/evaluation/:sessionId', (req, res) => {
  const evaluation = sessionManager.getEvaluation(req.params.sessionId);
  if (!evaluation) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(evaluation);
});

const PORT = process.env.PORT || 3000;

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Handle chat messages
  socket.on('chat-message', async (data) => {
    const { sessionId, message, language } = data;
    
    console.log('💬 Received message:', message);
    
    try {
      // Get agent response
      const response = await agent.processQuestion(sessionId, message);
      
      // Update evaluation
      sessionManager.updateEvaluation(sessionId, message);
      const score = sessionManager.calculateScore(sessionId);
      
      // Send response back
      socket.emit('chat-response', {
        response,
        score
      });
      
      console.log('✅ Response sent:', response);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      socket.emit('chat-error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Medical Avatar Server running on port ${PORT}`);
  console.log(`🔌 WebSocket enabled`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled (using fallback)'}`);
});
