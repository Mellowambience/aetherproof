import { useState, useCallback, useRef } from 'react';

interface Verdict {
  status: 'VERIFIED' | 'UNVERIFIED' | 'INCONCLUSIVE';
  confidence: number;
  reasoning: string;
  highlights: string[];
}

interface UseGeminiStreamOptions {
  onMessage: (msg: string) => void;
  onVerdict: (verdict: Verdict) => void;
}

export function useGeminiStream({ onMessage, onVerdict }: UseGeminiStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [geminiText, setGeminiText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string>('');

  const startStream = useCallback(async () => {
    try {
      // Start backend session
      const sessionRes = await fetch('http://localhost:8080/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId: `artist_${Date.now()}`, artworkDescription: 'Live session' }),
      });
      const sessionData = await sessionRes.json();
      sessionIdRef.current = sessionData.sessionId;

      // Connect WebSocket
      const ws = new WebSocket(`ws://localhost:8080/ws/verify/${sessionData.sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AetherProof] WebSocket connected');
        setIsStreaming(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'gemini_response') {
          setGeminiText(message.text);
          onMessage(message.text);
        } else if (message.type === 'verdict') {
          onVerdict(message.verdict);
        }
      };

      ws.onclose = () => setIsStreaming(false);
      ws.onerror = (e) => console.error('[AetherProof] WebSocket error:', e);

      // Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Send audio chunks every 2 seconds
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (ws.readyState === WebSocket.OPEN && event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            ws.send(JSON.stringify({
              type: 'audio_chunk',
              audioData: reader.result as string,
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };
      mediaRecorder.start(2000);
    } catch (error) {
      console.error('[AetherProof] Stream start error:', error);
      setIsStreaming(false);
    }
  }, [onMessage]);

  const stopStream = useCallback(async () => {
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'verify_complete' }));
    }

    setIsStreaming(false);
  }, []);

  return { isStreaming, startStream, stopStream, geminiText };
}
