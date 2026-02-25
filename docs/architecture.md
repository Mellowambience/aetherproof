# AetherProof — Architecture

> Required Devpost submission artifact — architecture diagram for the Gemini Live Agent Challenge.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AetherProof                              │
│              Human Art Verification Platform                    │
└─────────────────────────────────────────────────────────────────┘

  [Artist Browser]
       │
       │  Audio stream (WebSocket)
       │  Video frames (WebSocket)
       ▼
┌─────────────────────┐
│   React Frontend    │  ← TypeScript, React 18
│  (Vercel / GCS)     │    AudioWaveform component
│                     │    CertificateCard component
│  useGeminiStream    │    useGeminiStream hook
└────────┬────────────┘
         │ WebSocket (ws://)
         │
         ▼
┌────────────────────────────────────────┐
│        AetherProof Backend             │
│       (Google Cloud Run)               │
│                                        │
│  Express + WebSocketServer             │
│  ┌──────────────────────────────────┐  │
│  │      Gemini Live API Layer       │  │
│  │  model: gemini-2.0-flash-exp     │  │
│  │  - Audio stream processing       │  │
│  │  - Vision frame analysis         │  │
│  │  - Verdict generation            │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │      Solana Certificate Layer    │  │
│  │  network: devnet → mainnet       │  │
│  │  - Certificate payload encoding  │  │
│  │  - On-chain transaction          │  │
│  │  - Explorer link generation      │  │
│  └──────────────────────────────────┘  │
└────────┬─────────────────┬─────────────┘
         │                 │
         ▼                 ▼
┌─────────────┐   ┌────────────────────┐
│  Firestore  │   │  Solana Network    │
│  (GCP)      │   │  (devnet / mainnet)│
│  Sessions   │   │  Human Touch       │
│  Certs      │   │  Certificates      │
└─────────────┘   └────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Google Cloud Services      │
│  - Cloud Run (backend)      │
│  - Firestore (database)     │
│  - Cloud Build (CI/CD)      │
│  - Gemini API (AI)          │
└─────────────────────────────┘
```

## Data Flow

1. **Artist initiates session** → Frontend calls `POST /api/session/start` → Backend returns `sessionId` + WebSocket endpoint
2. **Live audio stream** → Browser MediaRecorder → WebSocket → Backend `gemini.ts` → `GoogleGenerativeAI` → Text response back via WebSocket
3. **Live video frames** → Browser canvas capture → WebSocket → Backend vision analysis → `analyzeFrame()` → Structured analysis back
4. **Verification complete** → `verify_complete` message → Backend `generateVerdict()` → Gemini generates VERIFIED/UNVERIFIED/INCONCLUSIVE with confidence score
5. **Certificate minting** → `POST /api/certificate/mint` → Backend `solana.ts` → Solana devnet transaction → Certificate object with explorer URL
6. **Certificate display** → Frontend `CertificateCard` component → Shareable link to Solana Explorer

## Google Cloud Services Used

| Service | Purpose |
|---------|---------|
| **Gemini Live API** (gemini-2.0-flash-exp) | Real-time audio + vision analysis |
| **Google GenAI SDK** | Gemini API integration |
| **Cloud Run** | Backend deployment (serverless, auto-scale) |
| **Firestore** | Session and certificate persistence |
| **Cloud Build** | CI/CD pipeline from GitHub |

## Why This Architecture Wins

- **Multimodal** — audio + vision combined in one agent session (40% of judging = innovation)
- **Real-time** — WebSocket streaming, not batch processing (Live Agent category requirement)
- **Differentiated** — Solana on-chain proof is a first-of-kind addition no other submission will have
- **GCP-native** — Cloud Run + Firestore + Cloud Build = full Google Cloud stack (30% of judging = technical)
- **Demo-ready** — 4-minute demo path: start session → narrate → show canvas → get certificate
