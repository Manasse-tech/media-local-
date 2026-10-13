'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { BarChart3, Activity, Disc, Grid3X3, Sparkles } from 'lucide-react';

export type DynamicVisualizerType = 'bars' | 'wave' | 'matrix' | 'circular';

interface DynamicFrequencyVisualizerProps {
  className?: string;
  initialType?: DynamicVisualizerType;
  showControls?: boolean;
  height?: number;
  barColorPreset?: 'cyberpunk' | 'emerald' | 'sunset' | 'ocean';
}

export function DynamicFrequencyVisualizer({
  className = '',
  initialType = 'bars',
  showControls = true,
  height = 110,
  barColorPreset = 'cyberpunk',
}: DynamicFrequencyVisualizerProps) {
  const [visType, setVisType] = useState<DynamicVisualizerType>(initialType);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let running = true;

    // Peak decay arrays for studio bars & matrix
    const numBars = 48;
    const peakValues = new Float32Array(numBars);
    const decaySpeed = 0.018;

    // Zero-allocation persistent typed arrays for frequency & waveform data
    const bufferLength = 256;
    const dataArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!running) return;
      animId = requestAnimationFrame(render);

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (w === 0 || h === 0) return;

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const hasAudioData = audioEngine.fillFrequencyData(dataArray);
      const time = Date.now() * 0.003;

      // Color palette schemes
      const getThemeGradients = (ctx: CanvasRenderingContext2D, h: number) => {
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        if (barColorPreset === 'cyberpunk') {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.85)'); // cyan
          grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.9)'); // blue
          grad.addColorStop(0.85, 'rgba(168, 85, 247, 0.95)'); // purple
          grad.addColorStop(1, 'rgba(236, 72, 153, 1)'); // magenta
        } else if (barColorPreset === 'sunset') {
          grad.addColorStop(0, 'rgba(234, 179, 8, 0.85)');
          grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.9)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 1)');
        } else if (barColorPreset === 'emerald') {
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
          grad.addColorStop(0.7, 'rgba(52, 211, 153, 0.95)');
          grad.addColorStop(1, 'rgba(110, 231, 183, 1)');
        } else {
          // ocean
          grad.addColorStop(0, 'rgba(37, 99, 235, 0.85)');
          grad.addColorStop(0.6, 'rgba(14, 165, 233, 0.95)');
          grad.addColorStop(1, 'rgba(56, 189, 248, 1)');
        }
        return grad;
      };

      if (visType === 'bars') {
        // ==========================================
        // 1. STUDIO FREQUENCY BARS WITH PEAK CAPS
        // ==========================================
        const barWidth = Math.max(2, (w / numBars) - 2.5);
        const grad = getThemeGradients(ctx, h);

        for (let i = 0; i < numBars; i++) {
          let energy = 0;
          if (hasAudioData && bufferLength > 0) {
            // Logarithmic mapping towards low/mid frequencies
            const binIdx = Math.min(
              bufferLength - 1,
              Math.floor(Math.pow(i / (numBars - 1), 1.6) * (bufferLength * 0.65))
            );
            const val = dataArray[binIdx] || 0;
            energy = val / 255;
          } else {
            // Idle organic breathing wave
            energy = 0.08 + Math.sin(i * 0.4 + time) * 0.05 + Math.cos(i * 0.2 - time * 0.8) * 0.03;
          }

          // Smooth peak decay
          if (energy >= peakValues[i]) {
            peakValues[i] = energy;
          } else {
            peakValues[i] = Math.max(0, peakValues[i] - decaySpeed);
          }

          const barH = Math.max(3, energy * (h - 12));
          const peakY = Math.max(2, h - peakValues[i] * (h - 12));
          const x = i * (barWidth + 2.5) + (w - (numBars * (barWidth + 2.5))) / 2;

          // Background subtle track slot
          ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
          ctx.beginPath();
          ctx.roundRect(x, 4, barWidth, h - 8, 2);
          ctx.fill();

          // Reactive Bar
          ctx.fillStyle = grad;
          ctx.shadowColor = energy > 0.5 ? 'rgba(59, 130, 246, 0.6)' : 'transparent';
          ctx.shadowBlur = energy > 0.5 ? 8 : 0;
          ctx.beginPath();
          ctx.roundRect(x, h - barH - 4, barWidth, barH, [2, 2, 0, 0]);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Glowing Peak Cap
          if (peakValues[i] > 0.06) {
            ctx.fillStyle = energy > 0.8 ? '#f43f5e' : '#38bdf8';
            ctx.shadowColor = energy > 0.8 ? '#f43f5e' : '#38bdf8';
            ctx.shadowBlur = 6;
            ctx.fillRect(x, peakY - 3, barWidth, 2);
            ctx.shadowBlur = 0;
          }
        }

      } else if (visType === 'wave') {
        // ==========================================
        // 2. FLUID OSCILLOGRAPHIC FREQUENCY WAVE
        // ==========================================
        const hasTimeData = audioEngine.fillTimeDomainData(timeArray);

        const centerY = h / 2;

        // Wave Fill Area Gradient
        const waveGrad = ctx.createLinearGradient(0, 0, 0, h);
        waveGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        waveGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
        waveGrad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');

        ctx.beginPath();
        ctx.moveTo(0, centerY);

        const sliceWidth = w / (timeArray.length - 1);
        for (let i = 0; i < timeArray.length; i++) {
          const v = hasTimeData ? timeArray[i] / 128.0 : 1.0 + Math.sin(i * 0.06 + time) * 0.25;
          const y = (v * (h - 20)) / 2 + 10;
          const x = i * sliceWidth;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Wave Stroke Line
        ctx.beginPath();
        for (let i = 0; i < timeArray.length; i++) {
          const v = hasTimeData ? timeArray[i] / 128.0 : 1.0 + Math.sin(i * 0.06 + time) * 0.25;
          const y = (v * (h - 20)) / 2 + 10;
          const x = i * sliceWidth;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (visType === 'matrix') {
        // ==========================================
        // 3. LED VU-METER MATRIX SPECTRUM
        // ==========================================
        const cols = 32;
        const rows = 12;
        const colW = Math.max(3, w / cols - 3);
        const rowH = Math.max(2, (h - 16) / rows - 2);

        for (let c = 0; c < cols; c++) {
          let energy = 0;
          if (dataArray && bufferLength > 0) {
            const binIdx = Math.min(
              bufferLength - 1,
              Math.floor(Math.pow(c / (cols - 1), 1.5) * (bufferLength * 0.6))
            );
            energy = (dataArray[binIdx] || 0) / 255;
          } else {
            energy = 0.12 + Math.sin(c * 0.5 + time) * 0.08;
          }

          const activeRows = Math.round(energy * rows);

          for (let r = 0; r < rows; r++) {
            const rowIndexFromBottom = rows - 1 - r;
            const x = c * (colW + 3) + (w - cols * (colW + 3)) / 2;
            const y = r * (rowH + 2) + 8;
            const isActive = rowIndexFromBottom <= activeRows;

            if (isActive) {
              if (rowIndexFromBottom >= rows - 2) {
                ctx.fillStyle = '#ef4444'; // Red peak
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 6;
              } else if (rowIndexFromBottom >= rows - 5) {
                ctx.fillStyle = '#f59e0b'; // Amber warning
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 4;
              } else {
                ctx.fillStyle = '#10b981'; // Green standard
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 2;
              }
            } else {
              ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
              ctx.shadowBlur = 0;
            }

            ctx.fillRect(x, y, colW, rowH);
            ctx.shadowBlur = 0;
          }
        }

      } else if (visType === 'circular') {
        // ==========================================
        // 4. RADIAL CIRCULAR PULSING SPECTRUM
        // ==========================================
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.32;
        const circularBars = 56;
        const maxLen = Math.min(w, h) * 0.22;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < circularBars; i++) {
          const angle = (i / circularBars) * Math.PI * 2 - Math.PI / 2;
          let energy = 0;

          if (dataArray && bufferLength > 0) {
            const binIdx = Math.floor(
              (Math.abs(i - circularBars / 2) / (circularBars / 2)) * (bufferLength * 0.5)
            );
            energy = (dataArray[binIdx] || 0) / 255;
          } else {
            energy = 0.15 + Math.sin(i * 0.4 + time) * 0.1;
          }

          const barLen = Math.max(3, energy * maxLen);
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const x1 = centerX + cos * radius;
          const y1 = centerY + sin * radius;
          const x2 = centerX + cos * (radius + barLen);
          const y2 = centerY + sin * (radius + barLen);

          const hue = 180 + (i / circularBars) * 140;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = Math.max(2, (w / circularBars) * 0.5);
          ctx.lineCap = 'round';
          ctx.strokeStyle = `hsla(${hue}, 95%, 60%, ${0.5 + energy * 0.5})`;
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [visType, barColorPreset]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col rounded-2xl bg-slate-950/70 border border-slate-800/80 p-3 shadow-xl backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Visualizer Canvas */}
      <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ height }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Interactive visualizer mode toolbar */}
      {showControls && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Visualiseur de Fréquences</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setVisType('bars')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                visType === 'bars'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Barres Studio FFT"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Barres</span>
            </button>

            <button
              onClick={() => setVisType('wave')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                visType === 'wave'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Onde Oscillographique"
            >
              <Activity className="w-3 h-3" />
              <span>Onde</span>
            </button>

            <button
              onClick={() => setVisType('matrix')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                visType === 'matrix'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Matrice LED VU-Meter"
            >
              <Grid3X3 className="w-3 h-3" />
              <span>Matrice</span>
            </button>

            <button
              onClick={() => setVisType('circular')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                visType === 'circular'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Spectre Circulaire Radial"
            >
              <Disc className="w-3 h-3" />
              <span>Circulaire</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
