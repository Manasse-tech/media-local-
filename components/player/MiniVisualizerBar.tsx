'use client';

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio-engine';

interface MiniVisualizerBarProps {
  isPlaying: boolean;
  barCount?: number;
  className?: string;
  height?: number;
}

export function MiniVisualizerBar({
  isPlaying,
  barCount = 14,
  className = '',
  height = 20,
}: MiniVisualizerBarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = canvas.width;
    const h = canvas.height;
    const barWidth = Math.max(2, Math.floor((width - (barCount - 1) * 2) / barCount));

    const render = () => {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, h);

      const analyser = audioEngine.getAnalyser();
      let dataArray: Uint8Array<ArrayBuffer> | null = null;
      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
        analyser.getByteFrequencyData(dataArray);
      }

      const time = Date.now() * 0.005;

      for (let i = 0; i < barCount; i++) {
        let percent = 0;
        if (dataArray && isPlaying) {
          const bin = Math.floor((i / barCount) * (dataArray.length * 0.55));
          const val = dataArray[bin] || 0;
          percent = Math.min(1, Math.max(0.12, val / 255));
        } else if (isPlaying) {
          percent = 0.2 + Math.sin(time * 2 + i * 0.6) * 0.15;
        } else {
          percent = 0.08;
        }

        const barH = Math.max(2.5, percent * h);
        const x = i * (barWidth + 2);
        const y = h - barH;

        // Gradient from electric blue to cyan to indigo
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#2563eb');
        grad.addColorStop(0.6, '#38bdf8');
        grad.addColorStop(1, '#a855f7');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barH, 1.5);
        } else {
          ctx.rect(x, y, barWidth, barH);
        }
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 4 + (barCount - 1) * 2}
      height={height}
      className={`shrink-0 pointer-events-none transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-40'} ${className}`}
      title="Spectre audio Web Audio réactif"
    />
  );
}
