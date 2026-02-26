// AetherProof — Day 2: AudioWorklet processor
// File: frontend/src/audio/pcm-processor.js
// Captures mic input as PCM 16kHz mono and forwards chunks to main thread via postMessage

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._chunkSize = 4096; // ~256ms at 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    // input[0] is Float32 at whatever sampleRate the AudioContext runs at
    // We resample down to 16kHz by decimation if needed (handled in main thread)
    const channelData = input[0]; // mono

    // Convert Float32 → Int16 PCM
    const pcm16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this._buffer.push(...pcm16);

    // Emit chunk when buffer is full
    if (this._buffer.length >= this._chunkSize) {
      const chunk = new Int16Array(this._buffer.splice(0, this._chunkSize));
      this.port.postMessage({ type: 'chunk', buffer: chunk.buffer }, [chunk.buffer]);
    }

    return true; // keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
