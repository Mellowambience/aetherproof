import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { createGeminiLiveSession } from './gemini';
import { mintHumanTouchCertificate } from './solana';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Health check — required for GCP Cloud Run
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'aetherproof-backend', timestamp: new Date().toISOString() });
});

// Start a new verification session
app.post('/api/session/start', async (req, res) => {
  try {
    const { artistId, artworkDescription } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    console.log(`[AetherProof] Starting verification session ${sessionId} for artist ${artistId}`);

    res.json({
      sessionId,
      message: 'Verification session started. Connect via WebSocket to begin.',
      wsEndpoint: `/ws/verify/${sessionId}`,
    });
  } catch (error) {
    console.error('[AetherProof] Session start error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Issue Human Touch Certificate
app.post('/api/certificate/mint', async (req, res) => {
  try {
    const { sessionId, artistWallet, artworkMetadata } = req.body;

    console.log(`[AetherProof] Minting certificate for session ${sessionId}`);

    const certificate = await mintHumanTouchCertificate({
      sessionId,
      artistWallet,
      artworkMetadata,
      verifiedAt: new Date().toISOString(),
    });

    res.json({ success: true, certificate });
  } catch (error) {
    console.error('[AetherProof] Certificate mint error:', error);
    res.status(500).json({ error: 'Failed to mint certificate' });
  }
});

// HTTP server + WebSocket upgrade
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws/verify' });

wss.on('connection', (ws, req) => {
  const sessionId = req.url?.split('/').pop() || 'unknown';
  console.log(`[AetherProof] WebSocket connected: session ${sessionId}`);

  // Initialize Gemini Live API session
  const geminiSession = createGeminiLiveSession(sessionId);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'audio_chunk') {
        // Forward audio to Gemini Live API
        const response = await geminiSession.sendAudio(message.audioData);
        ws.send(JSON.stringify({ type: 'gemini_response', text: response }));
      } else if (message.type === 'video_frame') {
        // Forward video frame to Gemini for vision analysis
        const analysis = await geminiSession.analyzeFrame(message.frameData);
        ws.send(JSON.stringify({ type: 'frame_analysis', analysis }));
      } else if (message.type === 'verify_complete') {
        // Agent makes final determination
        const verdict = await geminiSession.generateVerdict();
        ws.send(JSON.stringify({ type: 'verdict', verdict }));
      }
    } catch (error) {
      console.error('[AetherProof] WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Processing error' }));
    }
  });

  ws.on('close', () => {
    console.log(`[AetherProof] WebSocket closed: session ${sessionId}`);
    geminiSession.close();
  });
});

httpServer.listen(PORT, () => {
  console.log(`[AetherProof] Backend running on port ${PORT}`);
  console.log(`[AetherProof] WebSocket server ready at ws://localhost:${PORT}/ws/verify`);
  console.log(`[AetherProof] Health: http://localhost:${PORT}/health`);
});

export default app;
