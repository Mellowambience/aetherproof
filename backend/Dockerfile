# AetherProof Backend — Cloud Run Dockerfile
# Multi-stage build: compile TypeScript, then run slim Node image

# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 2: Run ────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Only production deps
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Cloud Run injects PORT at runtime (default 8080)
ENV PORT=8080
EXPOSE 8080

# GEMINI_API_KEY must be set as a Cloud Run env var (never bake into image)
# SOLANA_NETWORK defaults to devnet if not set
ENV SOLANA_NETWORK=devnet

CMD ["node", "dist/index.js"]
