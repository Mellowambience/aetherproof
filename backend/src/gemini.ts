import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are AetherProof — a verification agent for human-made artwork.

Your role:
1. Listen to the artist describe their creative process in real-time
2. Analyze video frames showing their canvas, tools, and physical movements
3. Detect authentic human creation patterns: hesitation, correction, physical brushstroke evidence, emotional narration
4. Flag AI-generation indicators: perfect symmetry, instant completion, lack of process narration
5. Generate a final VERIFIED or UNVERIFIED verdict with confidence score (0-100)

You are honest, precise, and artist-supportive. A verified certificate carries real value.`;

interface GeminiSession {
  sendAudio: (audioData: string) => Promise<string>;
  analyzeFrame: (frameData: string) => Promise<string>;
  generateVerdict: () => Promise<{
    status: 'VERIFIED' | 'UNVERIFIED' | 'INCONCLUSIVE';
    confidence: number;
    reasoning: string;
    highlights: string[];
  }>;
  close: () => void;
}

export function createGeminiLiveSession(sessionId: string): GeminiSession {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    systemInstruction: SYSTEM_PROMPT,
  });

  const conversationHistory: Array<{ role: string; content: string }> = [];
  let frameAnalyses: string[] = [];
  let audioTranscripts: string[] = [];

  console.log(`[Gemini] Session ${sessionId} initialized with gemini-2.0-flash-exp`);

  return {
    async sendAudio(audioData: string): Promise<string> {
      // TODO: Wire to Gemini Live API streaming audio endpoint
      // For Day 1: text-based stub to verify the pipeline
      const transcript = `[Audio received - ${audioData.length} bytes] Processing...`;
      audioTranscripts.push(transcript);

      const chat = model.startChat({ history: [] });
      const response = await chat.sendMessage(
        `Artist audio narration (transcript): "${transcript}". Acknowledge receipt and provide brief verification note.`
      );

      const text = response.response.text();
      conversationHistory.push({ role: 'assistant', content: text });
      return text;
    },

    async analyzeFrame(frameData: string): Promise<string> {
      // TODO: Wire to Gemini vision with actual base64 frame
      // For Day 1: stub returning structured analysis format
      const analysis = `Frame ${frameAnalyses.length + 1}: Canvas activity detected. Human brushstroke patterns present.`;
      frameAnalyses.push(analysis);
      return analysis;
    },

    async generateVerdict() {
      const chat = model.startChat({ history: [] });

      const context = [
        `Session ID: ${sessionId}`,
        `Audio narrations captured: ${audioTranscripts.length}`,
        `Frame analyses: ${frameAnalyses.length}`,
        `Evidence: ${[...audioTranscripts, ...frameAnalyses].join(' | ')}`,
      ].join('\n');

      const response = await chat.sendMessage(
        `Based on this verification session, provide a JSON verdict:\n${context}\n\nReturn ONLY valid JSON with fields: status (VERIFIED/UNVERIFIED/INCONCLUSIVE), confidence (0-100), reasoning (string), highlights (string array).`
      );

      try {
        const text = response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('[Gemini] Verdict parse error:', e);
      }

      // Fallback verdict
      return {
        status: 'INCONCLUSIVE' as const,
        confidence: 50,
        reasoning: 'Insufficient data for definitive verification.',
        highlights: ['Session data captured', 'Manual review recommended'],
      };
    },

    close() {
      console.log(`[Gemini] Session ${sessionId} closed. Transcripts: ${audioTranscripts.length}, Frames: ${frameAnalyses.length}`);
    },
  };
}
