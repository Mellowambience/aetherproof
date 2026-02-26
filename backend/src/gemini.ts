// AetherProof — Day 2: Gemini Live API wiring
// Replaces the Day 1 stub in backend/src/gemini.ts
// Uses @google/genai (new SDK) client.live.connect() with PCM 16kHz mono audio

import { GoogleGenAI, type LiveSession } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_PROMPT = `You are AetherProof — a verification agent for human-made artwork.

Your role:
1. Listen to the artist describe their creative process in real-time
2. Analyze video frames showing their canvas, tools, and physical movements
3. Detect authentic human creation patterns: hesitation, correction, physical brushstroke evidence, emotional narration
4. Flag AI-generation indicators: perfect symmetry, instant completion, lack of process narration
5. Generate a final VERIFIED or UNVERIFIED verdict with confidence score (0-100)

You are honest, precise, and artist-supportive. A verified certificate carries real value.`;

export interface GeminiLiveSession {
  sendAudioChunk: (pcm16Data: ArrayBuffer) => Promise<void>;
  analyzeFrame: (base64Jpeg: string) => Promise<string>;
  generateVerdict: () => Promise<{
    status: 'VERIFIED' | 'UNVERIFIED' | 'INCONCLUSIVE';
    confidence: number;
    reasoning: string;
    highlights: string[];
  }>;
  onTranscript: (handler: (text: string) => void) => void;
  close: () => void;
}

export async function createGeminiLiveSession(sessionId: string): Promise<GeminiLiveSession> {
  let liveSession: LiveSession | null = null;
  let transcriptHandler: ((text: string) => void) | null = null;
  const frameAnalyses: string[] = [];
  const audioTranscripts: string[] = [];

  // Connect to Gemini Live API with PCM 16kHz mono config
  liveSession = await client.live.connect({
    model: 'gemini-2.0-flash-live-001',
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseModalities: ['TEXT'],
      inputAudioConfig: {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 16000,
      },
    },
    callbacks: {
      onopen: () => {
        console.log(`[Gemini Live] Session ${sessionId} connected`);
      },
      onmessage: (message) => {
        // Stream text responses back as they arrive
        const text = message.serverContent?.modelTurn?.parts
          ?.filter((p) => p.text)
          ?.map((p) => p.text)
          ?.join('');

        if (text) {
          audioTranscripts.push(text);
          transcriptHandler?.(text);
        }
      },
      onerror: (err) => {
        console.error(`[Gemini Live] Session ${sessionId} error:`, err);
      },
      onclose: () => {
        console.log(`[Gemini Live] Session ${sessionId} closed`);
      },
    },
  });

  console.log(`[Gemini Live] Session ${sessionId} initialized — model: gemini-2.0-flash-live-001, PCM 16kHz mono`);

  return {
    // Send raw PCM 16kHz mono audio chunk from AudioWorklet
    async sendAudioChunk(pcm16Data: ArrayBuffer): Promise<void> {
      if (!liveSession) throw new Error('Session not connected');

      // Convert ArrayBuffer to base64 for the API
      const uint8 = new Uint8Array(pcm16Data);
      const b64 = Buffer.from(uint8).toString('base64');

      await liveSession.sendRealtimeInput({
        audio: {
          data: b64,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    },

    // Send a base64-encoded JPEG frame for vision analysis
    async analyzeFrame(base64Jpeg: string): Promise<string> {
      if (!liveSession) throw new Error('Session not connected');

      // Send frame inline as a vision turn
      const response = await liveSession.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Jpeg,
                },
              },
              {
                text: 'Analyze this canvas frame for human vs AI creation indicators. Focus on brushstroke patterns, tools visible, and signs of physical creation process.',
              },
            ],
          },
        ],
        turnComplete: true,
      });

      const analysis = response?.serverContent?.modelTurn?.parts
        ?.filter((p) => p.text)
        ?.map((p) => p.text)
        ?.join('') ?? `Frame ${frameAnalyses.length + 1}: Analysis received`;

      frameAnalyses.push(analysis);
      return analysis;
    },

    // Generate final verification verdict using accumulated session data
    async generateVerdict() {
      if (!liveSession) throw new Error('Session not connected');

      const context = [
        `Session ID: ${sessionId}`,
        `Audio narrations captured: ${audioTranscripts.length}`,
        `Frame analyses: ${frameAnalyses.length}`,
        `Evidence: ${[...audioTranscripts, ...frameAnalyses].join(' | ')}`,
      ].join('\n');

      const response = await liveSession.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `Based on this complete verification session, provide your final JSON verdict:\n${context}\n\nReturn ONLY valid JSON with fields: status (VERIFIED/UNVERIFIED/INCONCLUSIVE), confidence (0-100), reasoning (string), highlights (string array).`,
              },
            ],
          },
        ],
        turnComplete: true,
      });

      const text = response?.serverContent?.modelTurn?.parts
        ?.filter((p) => p.text)
        ?.map((p) => p.text)
        ?.join('') ?? '';

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('[Gemini Live] Verdict parse error:', e);
      }

      return {
        status: 'INCONCLUSIVE' as const,
        confidence: 50,
        reasoning: 'Insufficient data for definitive verification.',
        highlights: ['Session data captured', 'Manual review recommended'],
      };
    },

    onTranscript(handler: (text: string) => void) {
      transcriptHandler = handler;
    },

    close() {
      liveSession?.close();
      liveSession = null;
      console.log(`[Gemini Live] Session ${sessionId} closed. Transcripts: ${audioTranscripts.length}, Frames: ${frameAnalyses.length}`);
    },
  };
}
