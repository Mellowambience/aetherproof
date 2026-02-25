import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
}

export default function AudioWaveform({ isActive }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let stream: MediaStream;
    let audioCtx: AudioContext;

    navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
      stream = s;
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function draw() {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas!.width, canvas!.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#8b5cf6';
        ctx.beginPath();

        const sliceWidth = canvas!.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas!.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas!.width, canvas!.height / 2);
        ctx.stroke();
      }
      draw();
    });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      stream?.getTracks().forEach(t => t.stop());
      audioCtx?.close();
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={100}
      className="audio-waveform"
      style={{ width: '100%', height: '100px', borderRadius: '8px', background: '#0a0a0f' }}
    />
  );
}
