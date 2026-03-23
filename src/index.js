import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { ScenarioManager } from './scenario-manager.js';
import { SessionManager } from './session-manager.js';
import { MedicalAvatarAgent } from './agent.js';
import { HedraService } from './hedra-service.js';
import { TTSService } from './tts-service.js';

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
app.use('/data', express.static('data'));

// Add cache-busting headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const scenarioManager = new ScenarioManager();
const sessionManager = new SessionManager();
const agent = new MedicalAvatarAgent();
const hedraService = new HedraService();
const ttsService = new TTSService();

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
  res.json({ success: true });
});

// Generate video with Hedra API
app.post('/api/generate-video', async (req, res) => {
  try {
    const { text, imageUrl, voiceId } = req.body;
    
    if (!text || !imageUrl) {
      return res.status(400).json({ error: 'Missing text or imageUrl' });
    }

    console.log('🎬 Generating video with Hedra...');
    console.log('📝 Text:', text.substring(0, 50) + '...');
    console.log('🖼️ Image URL:', imageUrl);
    console.log('🔑 Hedra API Key configured:', !!process.env.HEDRA_API_KEY);
    
    const videoData = await hedraService.generateVideoWithLipSync(text, imageUrl, voiceId);
    
    if (!videoData) {
      console.error('❌ Hedra service returned null');
      // Return fallback response with image
      return res.json({
        status: 'fallback',
        imageUrl: imageUrl,
        message: 'Hedra API unavailable, using static image'
      });
    }

    console.log('✅ Video data received:', videoData.status);
    res.json(videoData);
  } catch (error) {
    console.error('❌ Error generating video:', error);
    res.json({
      status: 'fallback',
      imageUrl: req.body.imageUrl,
      message: 'Error generating video, using static image'
    });
  }
});

// Check Hedra API status
app.get('/api/hedra-status', (req, res) => {
  res.json({ 
    enabled: hedraService.isEnabled(),
    message: hedraService.isEnabled() ? 'Hedra API is enabled' : 'Hedra API is not configured'
  });
});

// Generate TTS audio
app.post('/api/tts', async (req, res) => {
  try {
    const { text, gender } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const audioBuffer = await ttsService.generateSpeech(text, gender || 'female');
    
    if (!audioBuffer) {
      return res.json({ status: 'fallback', message: 'TTS not available' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('❌ TTS endpoint error:', error);
    res.json({ status: 'fallback', message: 'TTS error' });
  }
});

// Check TTS status
app.get('/api/tts-status', (req, res) => {
  res.json({ 
    enabled: ttsService.isEnabled(),
    message: ttsService.isEnabled() ? 'OpenAI TTS enabled' : 'TTS not configured'
  });
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
      
      // Send response back
      socket.emit('chat-response', {
        response
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
