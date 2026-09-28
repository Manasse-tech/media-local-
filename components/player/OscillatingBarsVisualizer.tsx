'use client';

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { Music2 } from 'lucide-react';

interface OscillatingBarsVisualizerProps {
  size: number;
  activeCover?: string;
  isPlaying: boolean;
}

export function OscillatingBarsVisualizer({ size, activeCover, isPlaying }: OscillatingBarsVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const analyser = audioEngine.getAnalyser();

    const barCount = 72;
    const peaks = new Float32Array(barCount);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Draw background disk with high visual fidelity and trailing phosphor effect
      ctx.fillStyle = 'rgba(10, 15, 26, 0.25)'; // slate-950 equivalent for deep dark aesthetics
      ctx.fillRect(0, 0, width, height);

      // Draw subtle concentric threshold lines representing professional audio decibel markers
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.12)'; // slate-700
      ctx.lineWidth = 1;
      for (let r = 0.35; r < 0.95; r += 0.2) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (width / 2) * r, 0, Math.PI * 2);
        ctx.stroke();
      }

      const bufferLength = analyser ? analyser.frequencyBinCount : 0;
      const dataArray = analyser ? new Uint8Array(bufferLength) : null;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      const time = Date.now() * 0.0025;
      
      // Calculate active sub-bass frequency energy to drive dynamic organic scaling / pulsing
      let bassEnergy = 0;
      if (dataArray) {
        for (let j = 0; j < 8; j++) {
          bassEnergy += dataArray[j] || 0;
        }
      }
      const bassPercent = dataArray ? bassEnergy / (8 * 255) : 0;
      const pulseScale = 1.0 + bassPercent * 0.06;

      const innerRadius = (width / 2) * 0.38 * pulseScale;
      const maxBarLength = (width / 2) * 0.55;

      // Draw dynamic radial bars
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;

        let percent = 0;
        if (dataArray && bufferLength > 0) {
          // Map circular indexes to lower/mid ranges where human ears perceive beat oscillation
          const sampleIndex = Math.floor((Math.abs(i - barCount / 2) / (barCount / 2)) * (bufferLength * 0.45));
          const val = dataArray[sampleIndex] || 0;
          percent = Math.min(1, val / 255);
        } else {
          // Elegant organic wave movement for standby / idle states
          percent = isPlaying
            ? 0.12 + Math.sin(i * 0.45 + time * 2.8) * 0.08 + Math.cos(i * 0.25 - time) * 0.04
            : 0.04 + Math.sin(i * 0.15 + time) * 0.02;
        }

        // Peak decay physics
        if (percent > peaks[i]) {
          peaks[i] = percent;
        } else {
          peaks[i] = Math.max(0, peaks[i] - 0.015);
        }

        const barLength = percent * maxBarLength;
        const peakLength = peaks[i] * maxBarLength;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const xStart = centerX + cosA * innerRadius;
        const yStart = centerY + sinA * innerRadius;
        const xEnd = centerX + cosA * (innerRadius + barLength);
        const yEnd = centerY + sinA * (innerRadius + barLength);

        // Multi-tone neon gradient shifting across the color wheel
        const hue = (195 + (i / barCount) * 150) % 360; // Cyan -> Sapphire -> Violet -> Rose Pink
        ctx.strokeStyle = `hsla(${hue}, 95%, 62%, ${0.5 + percent * 0.5})`;
        ctx.lineWidth = Math.max(2.0, (width / barCount) * 0.7);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();

        // Studio peak cap indicator dots
        if (peaks[i] > 0.06) {
          const xPeak = centerX + cosA * (innerRadius + peakLength + 3);
          const yPeak = centerY + sinA * (innerRadius + peakLength + 3);
          ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${0.75 + peaks[i] * 0.25})`;
          ctx.beginPath();
          ctx.arc(xPeak, yPeak, Math.max(1.0, width * 0.005), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render outer ring boundary
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.stroke();
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-full border border-slate-900 shadow-2xl" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute inset-0 pointer-events-none z-0"
      />
      
      {/* Central Rotating Album Artwork replicating premium CD/Record center sticker */}
      <div 
        className="relative rounded-full overflow-hidden border-2 border-slate-950 shadow-inner z-10 bg-slate-950 flex items-center justify-center transition-transform duration-500 hover:scale-105"
        style={{ 
          width: size * 0.35, 
          height: size * 0.35,
        }}
      >
        {activeCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeCover}
            alt=""
            className="w-full h-full object-cover"
            style={{ animation: isPlaying ? 'spin 32s linear infinite' : 'none' }}
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-blue-500/40">
            <Music2 className="w-6 h-6" />
          </div>
        )}
        
        {/* Record/CD spindle center hole */}
        <div className="absolute w-6 h-6 rounded-full bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center z-20">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
