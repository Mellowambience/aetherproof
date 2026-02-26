// AetherProof — Day 3: Camera feed → analyzeFrame() pipeline
// File: frontend/src/video/camera-feed.ts
// Captures webcam frames at configurable interval, converts to base64 JPEG,
// and pipes into the Gemini Live session's analyzeFrame() method.

import type { GeminiLiveSession } from '../../../backend/src/gemini';

export interface CameraFeedOptions {
  frameIntervalMs?: number;   // how often to capture a frame (default: 3000ms)
  quality?: number;           // JPEG quality 0–1 (default: 0.8)
  maxWidth?: number;          // resize before encode (default: 640)
  maxHeight?: number;         // resize before encode (default: 480)
  onFrame?: (analysis: string) => void;  // called with each Gemini analysis
  onError?: (err: Error) => void;
}

export class CameraFeed {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private session: GeminiLiveSession | null = null;
  private options: Required<CameraFeedOptions>;
  private isRunning = false;
  private frameCount = 0;

  constructor(options: CameraFeedOptions = {}) {
    this.options = {
      frameIntervalMs: options.frameIntervalMs ?? 3000,
      quality: options.quality ?? 0.8,
      maxWidth: options.maxWidth ?? 640,
      maxHeight: options.maxHeight ?? 480,
      onFrame: options.onFrame ?? (() => {}),
      onError: options.onError ?? console.error,
    };
  }

  /** Start camera capture and bind to a Gemini Live session */
  async start(session: GeminiLiveSession): Promise<void> {
    if (this.isRunning) return;
    this.session = session;

    try {
      // Request webcam access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: this.options.maxWidth },
          height: { ideal: this.options.maxHeight },
          facingMode: 'user',
        },
        audio: false, // audio handled separately by AudioWorklet
      });

      // Set up off-screen video element
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.playsInline = true;
      this.video.muted = true;
      await this.video.play();

      // Set up off-screen canvas for frame capture
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.options.maxWidth;
      this.canvas.height = this.options.maxHeight;
      this.ctx = this.canvas.getContext('2d');

      this.isRunning = true;
      console.log(`[CameraFeed] Started — capturing every ${this.options.frameIntervalMs}ms`);

      // Begin frame capture loop
      this.intervalId = setInterval(() => this.captureAndAnalyze(), this.options.frameIntervalMs);

      // Capture first frame immediately
      await this.captureAndAnalyze();
    } catch (err) {
      this.options.onError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  /** Capture one frame and send to Gemini analyzeFrame() */
  private async captureAndAnalyze(): Promise<void> {
    if (!this.video || !this.canvas || !this.ctx || !this.session) return;
    if (this.video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

    try {
      // Draw current video frame to canvas
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

      // Export as base64 JPEG
      const dataUrl = this.canvas.toDataURL('image/jpeg', this.options.quality);
      const base64Jpeg = dataUrl.split(',')[1]; // strip "data:image/jpeg;base64,"

      this.frameCount++;
      console.log(`[CameraFeed] Frame ${this.frameCount} captured (${base64Jpeg.length} bytes b64)`);

      // Send to Gemini vision analysis
      const analysis = await this.session.analyzeFrame(base64Jpeg);
      this.options.onFrame(analysis);
    } catch (err) {
      this.options.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Pause frame capture (keeps stream open) */
  pause(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log(`[CameraFeed] Paused after ${this.frameCount} frames`);
    }
  }

  /** Resume frame capture */
  resume(): void {
    if (!this.isRunning || this.intervalId) return;
    this.intervalId = setInterval(() => this.captureAndAnalyze(), this.options.frameIntervalMs);
    console.log('[CameraFeed] Resumed');
  }

  /** Stop camera and release all resources */
  stop(): void {
    this.pause();
    this.isRunning = false;
    this.session = null;

    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.canvas = null;
    this.ctx = null;
    console.log(`[CameraFeed] Stopped. Total frames captured: ${this.frameCount}`);
  }

  get running(): boolean { return this.isRunning; }
  get frames(): number { return this.frameCount; }
}
