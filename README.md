# AetherProof

> **Voice + vision AI agent that lets artists prove their work is human-made.**

Built for the [Google Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/) — $25,000 Grand Prize | Deadline: March 16, 2026

[![Day 1 of 19](https://img.shields.io/badge/Day-1%20of%2019-blueviolet)](https://github.com/Mellowambience/aetherproof)
[![Built with Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20Live%20API-4285F4)](https://ai.google.dev/api/live)
[![Solana](https://img.shields.io/badge/Proof-Solana%20Chain-9945FF)](https://solana.com)

---

## What is AetherProof?

Artists are losing income and recognition to AI-generated look-alikes. AetherProof lets a human artist **speak to an agent, show their canvas, and receive a verifiable on-chain certificate** proving the work is human-made — in real time.

**How it works:**
1. Artist opens AetherProof and starts a live session
2. They speak naturally: *"I'm painting this landscape. Watch me work."*
3. Gemini Live API analyzes the audio + live canvas feed
4. Agent confirms human creation patterns (brushstroke analysis, real-time narration, process verification)
5. A **Human Touch Certificate** is minted on Solana devnet — timestamped, immutable, shareable

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript |
| Real-time audio/vision | [Gemini Live API](https://ai.google.dev/api/live) via Google GenAI SDK |
| Agent framework | Google ADK (Agent Development Kit) |
| Backend | Node.js + TypeScript on Google Cloud Run |
| Database | Firestore (session + certificate store) |
| On-chain proof | Solana (`@solana/web3.js`, devnet) |
| Deployment | Google Cloud Run + Cloud Build |

---

## Project Structure

```
aetherproof/
├── backend/          # Node.js/TypeScript — Gemini Live API + Cloud Run
│   ├── src/
│   │   ├── index.ts  # Express server entry point
│   │   ├── gemini.ts # Gemini Live API stream handler
│   │   └── solana.ts # Certificate minting on Solana
│   └── package.json
├── frontend/         # React/TypeScript — live audio UI
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── AudioWaveform.tsx
│   │   │   └── CertificateCard.tsx
│   │   └── hooks/
│   │       └── useGeminiStream.ts
│   └── package.json
├── docs/
│   └── architecture.md  # Architecture diagram (Devpost requirement)
└── README.md
```

---

## Getting Started

```bash
# Clone
git clone https://github.com/Mellowambience/aetherproof.git
cd aetherproof

# Backend
cd backend
npm install
cp .env.example .env  # Add your GEMINI_API_KEY
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

**Environment variables:**
```
GEMINI_API_KEY=your_gemini_api_key_here
SOLANA_NETWORK=devnet
PORT=8080
```

---

## Submission Checklist

- [ ] Text description on Devpost
- [ ] Public GitHub repo with spin-up instructions (this README)
- [ ] GCP Cloud Run deployment proof
- [ ] Architecture diagram (`docs/architecture.md`)
- [ ] Demo video <4 minutes
- [ ] Blog post with `#GeminiLiveAgentChallenge`
- [ ] Google Developer Group membership

---

## Build Log

| Day | Date | Milestone |
|-----|------|-----------|
| 1 | Feb 25 | Repo created, monorepo scaffold, Gemini Live API stub |
| ... | ... | ... |

---

*Built by [@1Aether1Rose1](https://x.com/1Aether1Rose1) — [mellowambience.github.io](https://mellowambience.github.io)*
