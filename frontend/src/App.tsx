import React, { useState, useCallback } from 'react';
import AudioWaveform from './components/AudioWaveform';
import CertificateCard from './components/CertificateCard';
import { useGeminiStream } from './hooks/useGeminiStream';
import './App.css';

export interface Certificate {
  certificateId: string;
  transactionSignature: string;
  network: string;
  explorerUrl: string;
  issuedAt: string;
}

type SessionState = 'idle' | 'connecting' | 'recording' | 'verifying' | 'certified' | 'rejected';

function App() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [verificationLog, setVerificationLog] = useState<string[]>([]);
  const [artistWallet, setArtistWallet] = useState('');

  const addLog = useCallback((msg: string) => {
    setVerificationLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }, []);

  const { isStreaming, startStream, stopStream, geminiText } = useGeminiStream({
    onMessage: (msg) => addLog(`Gemini: ${msg}`),
    onVerdict: (verdict) => {
      addLog(`Verdict: ${verdict.status} (${verdict.confidence}% confidence)`);
      if (verdict.status === 'VERIFIED') {
        setSessionState('certified');
      } else {
        setSessionState('rejected');
      }
    },
  });

  const handleStartSession = async () => {
    setSessionState('connecting');
    addLog('Connecting to AetherProof verification agent...');
    await startStream();
    setSessionState('recording');
    addLog('Recording started. Speak naturally and show your work.');
  };

  const handleStopAndVerify = async () => {
    setSessionState('verifying');
    addLog('Submitting session for final verification...');
    await stopStream();
  };

  const handleMintCertificate = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/certificate/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `session_${Date.now()}`,
          artistWallet: artistWallet || 'demo_wallet',
          artworkMetadata: { title: 'My Artwork', description: 'Human-made artwork', medium: 'Digital' },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCertificate(data.certificate);
        addLog(`Certificate minted: ${data.certificate.certificateId}`);
      }
    } catch (e) {
      addLog('Certificate minting error — check backend connection');
    }
  };

  return (
    <div className="aetherproof-app">
      <header>
        <h1>⬡ AetherProof</h1>
        <p className="tagline">Prove your art is human-made. Get verified on-chain.</p>
      </header>

      <main>
        {sessionState === 'idle' && (
          <div className="start-panel">
            <p>Start a live verification session. Speak naturally about your creative process while you work. AetherProof will verify your human authorship and issue a Solana certificate.</p>
            <input
              type="text"
              placeholder="Your Solana wallet address (optional for devnet)"
              value={artistWallet}
              onChange={(e) => setArtistWallet(e.target.value)}
              className="wallet-input"
            />
            <button onClick={handleStartSession} className="btn-primary">
              Start Verification Session
            </button>
          </div>
        )}

        {(sessionState === 'recording' || sessionState === 'connecting') && (
          <div className="recording-panel">
            <div className="status-badge recording">● LIVE</div>
            <AudioWaveform isActive={isStreaming} />
            <p className="hint">Talk about your process. Show your canvas. Be yourself.</p>
            {geminiText && (
              <div className="gemini-response">
                <strong>Agent:</strong> {geminiText}
              </div>
            )}
            <button onClick={handleStopAndVerify} className="btn-secondary" disabled={!isStreaming}>
              Complete & Verify
            </button>
          </div>
        )}

        {sessionState === 'verifying' && (
          <div className="verifying-panel">
            <div className="spinner"></div>
            <p>Analyzing your session with Gemini Live API...</p>
          </div>
        )}

        {sessionState === 'certified' && (
          <div className="certified-panel">
            <div className="status-badge verified">✓ VERIFIED</div>
            {!certificate ? (
              <button onClick={handleMintCertificate} className="btn-primary">
                Mint Human Touch Certificate on Solana
              </button>
            ) : (
              <CertificateCard certificate={certificate} />
            )}
          </div>
        )}

        {sessionState === 'rejected' && (
          <div className="rejected-panel">
            <div className="status-badge rejected">✗ UNVERIFIED</div>
            <p>Verification could not be completed with sufficient confidence.</p>
            <button onClick={() => setSessionState('idle')} className="btn-secondary">
              Try Again
            </button>
          </div>
        )}

        <div className="verification-log">
          <h3>Verification Log</h3>
          {verificationLog.length === 0 ? (
            <p className="empty">Session events will appear here...</p>
          ) : (
            <ul>
              {verificationLog.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
