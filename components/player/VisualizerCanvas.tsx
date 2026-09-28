'use client';

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { VisualizerMode } from '@/types/media';

interface VisualizerCanvasProps {
  mode: VisualizerMode;
  className?: string;
  size?: number; // Size for circular spectrum (defaults to responsive)
}

export function VisualizerCanvas({ mode, className = '', size }: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isCircular = mode === 'circular-spectrum';
  const width = isCircular ? (size || 380) : 480;
  const height = isCircular ? (size || 380) : 90;

  useEffect(() => {
    if (mode === 'off') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const analyser = audioEngine.getAnalyser();

    // Frequency peak decay state for diagram visualizer
    const barCount = 72;
    const peaks = new Float32Array(barCount);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      if (mode === 'circular-spectrum') {
        const centerX = width / 2;
        const centerY = height / 2;
        // The base radius fits right outside the rotating vinyl (approx 68% of half-width)
        const baseRadius = (width / 2) * 0.69;
        const maxBarHeight = (width / 2) * 0.28;

        const bufferLength = analyser ? analyser.frequencyBinCount : 0;
        const dataArray = analyser ? new Uint8Array(bufferLength) : null;
        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
        }

        const time = Date.now() * 0.003;

        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
          
          let percent = 0;
          if (dataArray && bufferLength > 0) {
            // Map index around circle symmetrically or circularly
            const binIdx = Math.floor((Math.abs(i - barCount / 2) / (barCount / 2)) * (bufferLength * 0.45));
            const val = dataArray[binIdx] || 0;
            percent = Math.min(1, Math.max(0, val / 255));
          } else {
            // Smooth natural pulsing idle animation when paused or starting
            percent = 0.15 + Math.sin(i * 0.35 + time * 2) * 0.1 + Math.cos(i * 0.2 - time) * 0.08;
          }

          // Peak decay update
          if (percent > peaks[i]) {
            peaks[i] = percent;
          } else {
            peaks[i] = Math.max(0, peaks[i] - 0.02);
          }

          const barLen = Math.max(4, percent * maxBarHeight);
          const peakLen = Math.max(barLen, peaks[i] * maxBarHeight);

          // Calculate start & end coordinates for equalizer diagram bar
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          const xStart = centerX + cosA * baseRadius;
          const yStart = centerY + sinA * baseRadius;
          const xEnd = centerX + cosA * (baseRadius + barLen);
          const yEnd = centerY + sinA * (baseRadius + barLen);

          // Equalizer Diagram Bar: Dynamic color gradient (Cyan -> Electric Blue -> Purple -> Magenta)
          const hue = 190 + (i / barCount) * 120; // 190 (Cyan) to 310 (Magenta)
          
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(xStart, yStart);
          ctx.lineTo(xEnd, yEnd);
          ctx.lineWidth = Math.max(2.5, width * 0.008);
          ctx.lineCap = 'round';
          ctx.strokeStyle = `hsla(${hue}, 95%, 60%, ${0.45 + percent * 0.55})`;
          ctx.shadowColor = `hsla(${hue}, 100%, 50%, 0.8)`;
          ctx.shadowBlur = percent > 0.4 ? 8 : 2;
          ctx.stroke();

          // Peak indicator dot / cap for professional studio look
          if (peaks[i] > 0.1) {
            const xPeak = centerX + cosA * (baseRadius + peakLen + 3);
            const yPeak = centerY + sinA * (baseRadius + peakLen + 3);
            ctx.beginPath();
            ctx.arc(xPeak, yPeak, Math.max(1.2, width * 0.004), 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, 100%, 75%, ${0.7 + peaks[i] * 0.3})`;
            ctx.shadowBlur = 4;
            ctx.fill();
          }

          ctx.restore();
        }
        return;
      }

      if (!analyser) {
        // Fallback subtle idle wave
        const time = Date.now() * 0.002;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.02 + time) * 6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      if (mode === 'wave') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2.5;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(0.5, '#06b6d4');
        grad.addColorStop(1, '#a855f7');
        ctx.strokeStyle = grad;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (mode === 'spectrum') {
        analyser.getByteFrequencyData(dataArray);
        const specCount = 48;
        const barWidth = width / specCount;

        for (let i = 0; i < specCount; i++) {
          const sampleIndex = Math.floor((i / specCount) * (bufferLength / 2));
          const val = dataArray[sampleIndex] || 0;
          const percent = val / 255;
          const barHeight = percent * height;

          const hue = 210 + i * 2.5; // Blue to Cyan to Purple
          ctx.fillStyle = `hsla(${hue}, 85%, 60%, ${0.3 + percent * 0.7})`;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1.5, barHeight);
        }
      } else {
        // Bars mode
        analyser.getByteFrequencyData(dataArray);
        const bCount = 32;
        const barWidth = (width / bCount) * 0.75;
        const gap = (width / bCount) * 0.25;

        for (let i = 0; i < bCount; i++) {
          const sampleIndex = Math.floor((i / bCount) * (bufferLength / 3));
          const val = dataArray[sampleIndex] || 0;
          const percent = val / 255;
          const barHeight = Math.max(3, percent * (height - 6));

          const grad = ctx.createLinearGradient(0, height - barHeight, 0, height);
          grad.addColorStop(0, '#60a5fa');
          grad.addColorStop(1, '#3b82f6');

          ctx.fillStyle = grad;
          const x = i * (barWidth + gap) + gap / 2;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode, width, height]);

  if (mode === 'off') return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`pointer-events-none ${className}`}
    />
  );
}
