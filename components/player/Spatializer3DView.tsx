'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Headphones,
  RotateCw,
  Power,
  Volume2,
  Compass,
  Layers,
  Sparkles,
  Info,
  Maximize2,
} from 'lucide-react';
import {
  audioEngine,
  RoomAcousticPreset,
  Spatial3DConfig,
} from '@/lib/audio-engine';

const ROOM_PRESETS: {
  id: RoomAcousticPreset;
  title: string;
  desc: string;
  rt60: string;
  color: string;
}[] = [
  {
    id: 'Off',
    title: 'Désactivé',
    desc: 'Son anéchoïque direct sans réverbération',
    rt60: '0.0s',
    color: 'border-slate-800 text-slate-400',
  },
  {
    id: 'Studio',
    title: 'Studio Pro',
    desc: 'Cabine traitée, acoustique ultra-précise et percutante',
    rt60: '0.35s',
    color: 'border-blue-500/40 text-blue-400',
  },
  {
    id: 'Living Room',
    title: 'Salon Hi-Fi',
    desc: 'Chaleur domestique et diffraction naturelle',
    rt60: '0.75s',
    color: 'border-amber-500/40 text-amber-400',
  },
  {
    id: 'Concert Hall',
    title: 'Salle de Concert',
    desc: 'Ampleur symphonique et profondeur spatiale riche',
    rt60: '2.2s',
    color: 'border-purple-500/40 text-purple-400',
  },
  {
    id: 'Cathedral',
    title: 'Cathédrale',
    desc: 'Réverbération monumentale et sensation d’immensité',
    rt60: '3.8s',
    color: 'border-rose-500/40 text-rose-400',
  },
  {
    id: 'Binaural 360',
    title: 'Binaural 360°',
    desc: 'Holographie sonore enveloppante hors de la tête',
    rt60: '1.1s',
    color: 'border-emerald-500/40 text-emerald-400',
  },
];

export function Spatializer3DView() {
  const [config, setConfig] = useState<Spatial3DConfig>(() => audioEngine.getSpatialConfig());
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Sync with audio engine
  const handleToggleEnable = useCallback(() => {
    setConfig((prev) => {
      const next = !prev.enabled;
      audioEngine.setSpatialEnabled(next);
      return { ...prev, enabled: next };
    });
  }, []);

  const handleAzimuthChange = useCallback((azimuth: number) => {
    setConfig((prev) => {
      audioEngine.setSpatialAzimuth(azimuth);
      return { ...prev, azimuth };
    });
  }, []);

  const handleElevationChange = useCallback((elevation: number) => {
    setConfig((prev) => {
      audioEngine.setSpatialElevation(elevation);
      return { ...prev, elevation };
    });
  }, []);

  const handleDistanceChange = useCallback((distance: number) => {
    setConfig((prev) => {
      audioEngine.setSpatialDistance(distance);
      return { ...prev, distance };
    });
  }, []);

  const handleCrossfeedChange = useCallback((crossfeed: number) => {
    setConfig((prev) => {
      audioEngine.setSpatialCrossfeed(crossfeed);
      return { ...prev, crossfeed };
    });
  }, []);

  const handleRoomPresetChange = useCallback((roomPreset: RoomAcousticPreset) => {
    setConfig((prev) => {
      audioEngine.setSpatialRoomPreset(roomPreset);
      return { ...prev, roomPreset };
    });
  }, []);

  const handleReverbWetChange = useCallback((reverbWet: number) => {
    setConfig((prev) => {
      audioEngine.setSpatialReverbWet(reverbWet);
      return { ...prev, reverbWet };
    });
  }, []);

  // 360 Auto-orbit demo animation
  useEffect(() => {
    if (!isOrbiting) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setConfig((prev) => {
        // Rotate 45 degrees per second
        let nextAzimuth = prev.azimuth + dt * 45;
        if (nextAzimuth > 180) nextAzimuth -= 360;
        audioEngine.setSpatialAzimuth(nextAzimuth);
        return { ...prev, azimuth: nextAzimuth };
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOrbiting]);

  // Interactive 3D Canvas Radar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY) - 24;

      ctx.clearRect(0, 0, width, height);

      // Radar Concentric Circles (Distances)
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (maxRadius / 3) * r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.moveTo(centerX, 8);
      ctx.lineTo(centerX, height - 8);
      ctx.moveTo(8, centerY);
      ctx.lineTo(width - 8, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cardinal Labels
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DEVANT (0°)', centerX, 14);
      ctx.fillText('DERRIÈRE (180°)', centerX, height - 12);
      ctx.textAlign = 'left';
      ctx.fillText('DROITE (+90°)', width - 68, centerY);
      ctx.textAlign = 'right';
      ctx.fillText('GAUCHE (-90°)', 68, centerY);

      // Listener Avatar (Head + Headphones) in Center
      const headRadius = 22;
      // Head
      ctx.beginPath();
      ctx.arc(centerX, centerY, headRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = config.enabled ? '#3b82f6' : '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Nose pointing forward (up)
      ctx.beginPath();
      ctx.moveTo(centerX - 4, centerY - headRadius + 2);
      ctx.lineTo(centerX, centerY - headRadius - 6);
      ctx.lineTo(centerX + 4, centerY - headRadius + 2);
      ctx.fillStyle = config.enabled ? '#60a5fa' : '#64748b';
      ctx.fill();

      // Headphones headband & earcups
      // Headband
      ctx.beginPath();
      ctx.arc(centerX, centerY, headRadius + 4, Math.PI * 0.9, Math.PI * 0.1, false);
      ctx.strokeStyle = config.enabled ? '#38bdf8' : '#64748b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Left earcup
      ctx.beginPath();
      ctx.roundRect(centerX - headRadius - 7, centerY - 8, 7, 16, 3);
      ctx.fillStyle = config.enabled ? '#0284c7' : '#475569';
      ctx.fill();

      // Right earcup
      ctx.beginPath();
      ctx.roundRect(centerX + headRadius, centerY - 8, 7, 16, 3);
      ctx.fillStyle = config.enabled ? '#0284c7' : '#475569';
      ctx.fill();

      // Sound Source Position in Radar
      // Azimuth 0 is Up, +90 is Right, -90 is Left, 180 is Down
      const rad = ((config.azimuth - 90) * Math.PI) / 180;
      // Map distance (0.5m to 5.0m) to radius
      const normDist = Math.max(0.1, Math.min(1, (config.distance - 0.5) / 4.5));
      const sourceDistPx = headRadius + 18 + normDist * (maxRadius - headRadius - 24);

      const sourceX = centerX + Math.cos(rad) * sourceDistPx;
      const sourceY = centerY + Math.sin(rad) * sourceDistPx;

      // Draw sound beam connecting source to listener
      if (config.enabled) {
        const beamGrad = ctx.createLinearGradient(sourceX, sourceY, centerX, centerY);
        beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(centerX, centerY);
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Sound wave acoustic rings around source
        const timePulse = (performance.now() / 600) % 1;
        for (let wave = 0; wave < 2; wave++) {
          const waveR = 8 + ((timePulse + wave * 0.5) % 1) * 20;
          const alpha = 1 - ((timePulse + wave * 0.5) % 1);
          ctx.beginPath();
          ctx.arc(sourceX, sourceY, waveR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.4})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Sound source marker
      ctx.beginPath();
      ctx.arc(sourceX, sourceY, 11, 0, Math.PI * 2);
      ctx.fillStyle = config.enabled ? '#38bdf8' : '#64748b';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(sourceX, sourceY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [config]);

  // Pointer drag to position sound source
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees from top (0 deg is top, clockwise is positive)
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg > 180) deg -= 360;

    const distPx = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = Math.min(centerX, centerY) - 24;
    const normDist = Math.max(0, Math.min(1, distPx / maxRadius));
    const distanceMeters = 0.5 + normDist * 4.5;

    handleAzimuthChange(Math.round(deg));
    handleDistanceChange(parseFloat(distanceMeters.toFixed(1)));
  };

  return (
    <div className="space-y-4 p-4 overflow-y-auto max-h-[calc(88vh-80px)] text-slate-100">
      {/* 3D Engine Header Toggle & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              config.enabled
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-lg shadow-blue-500/10'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Moteur Binaural 3D & Espace Virtuel
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  config.enabled
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {config.enabled ? '3D Activé' : 'Stéréo Classique'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Modèle HRTF certifié W3C • Crossfeed audiophile anti-fatigue • Convolver acoustique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 360 Orbit Demo Button */}
          <button
            onClick={() => {
              if (!config.enabled) handleToggleEnable();
              setIsOrbiting((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isOrbiting
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
            title="Faire tourner le son en 360 degrés autour de votre tête"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isOrbiting ? 'animate-spin' : ''}`} />
            <span>{isOrbiting ? 'Orbite Active' : 'Démo 360°'}</span>
          </button>

          {/* Master Enable Button */}
          <button
            onClick={handleToggleEnable}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
              config.enabled
                ? 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-500'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{config.enabled ? 'Actif' : 'Activer 3D'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Grid: Radar on Left, Fine Controls on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Interactive Radar Canvas (5 Cols) */}
        <div className="md:col-span-6 bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Compass className="w-4 h-4 text-blue-400" />
              Position de la Source Sonore
            </span>
            <span className="text-[11px] font-mono text-blue-400">
              {config.azimuth > 0 ? `+${config.azimuth}°` : `${config.azimuth}°`} • {config.distance}m
            </span>
          </div>

          <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center select-none">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              onPointerDown={(e) => {
                isDraggingRef.current = true;
                handlePointerMove(e);
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={() => (isDraggingRef.current = false)}
              onPointerLeave={() => (isDraggingRef.current = false)}
              className="w-full h-full rounded-2xl bg-slate-900/60 border border-slate-800/80 cursor-grab active:cursor-grabbing touch-none"
            />
          </div>

          {/* Quick Positioning Presets */}
          <div className="w-full grid grid-cols-4 gap-1.5 mt-3">
            {[
              { label: 'Face (0°)', az: 0, dist: 1.5 },
              { label: 'Gauche (-90°)', az: -90, dist: 1.8 },
              { label: 'Droite (+90°)', az: 90, dist: 1.8 },
              { label: 'Arrière (180°)', az: 180, dist: 2.0 },
            ].map((pos) => (
              <button
                key={pos.label}
                onClick={() => {
                  handleAzimuthChange(pos.az);
                  handleDistanceChange(pos.dist);
                }}
                className={`py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                  config.azimuth === pos.az
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* DSP Spatial Settings (6 Cols) */}
        <div className="md:col-span-6 space-y-3 flex flex-col justify-between">
          {/* Audiophile Crossfeed (Bauer / Chu Moy) */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">
                  Crossfeed Audiophile (Anti-Fatigue)
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {Math.round(config.crossfeed * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Mélange interaural avec retard de 0.4ms et coupure à 700Hz imitant la diffraction crânienne naturelle des haut-parleurs.
            </p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.crossfeed}
              onChange={(e) => handleCrossfeedChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Isolé (0%)</span>
              <span>Naturel (35%)</span>
              <span>Enceintes (100%)</span>
            </div>
          </div>

          {/* Elevation (Hauteur 3D) */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Élévation Sonore (Hauteur)</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {config.elevation > 0 ? `+${config.elevation}°` : `${config.elevation}°`}
              </span>
            </div>
            <input
              type="range"
              min="-60"
              max="60"
              step="5"
              value={config.elevation}
              onChange={(e) => handleElevationChange(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Sous les pieds (-60°)</span>
              <span>Hauteur d&apos;oreille (0°)</span>
              <span>Au-dessus (+60°)</span>
            </div>
          </div>

          {/* Reverb Wet/Dry Mix */}
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Immersion Réverbération (Wet)</span>
              <span className="text-xs font-mono text-purple-400 font-bold">
                {Math.round(config.reverbWet * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={config.reverbWet}
              onChange={(e) => handleReverbWetChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Sec (Direct)</span>
              <span>Équilibré (25%)</span>
              <span>Enveloppant (80%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acoustic Room Convolver Presets */}
      <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Environnements Acoustiques Convolutifs (Impulse Response)
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Preset : {config.roomPreset}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {ROOM_PRESETS.map((room) => {
            const isSelected = config.roomPreset === room.id;
            return (
              <button
                key={room.id}
                onClick={() => handleRoomPresetChange(room.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10 font-semibold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white mb-0.5">{room.title}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {room.desc}
                  </div>
                </div>
                <div className="text-[9px] font-mono text-cyan-400 mt-2">
                  RT60 : {room.rt60}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Audiophile Headphone Tip */}
      <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl flex items-center gap-3 text-xs text-blue-300">
        <Info className="w-5 h-5 text-blue-400 shrink-0" />
        <span>
          <strong>Conseil d&apos;écoute :</strong> Utilisez un casque ou des écouteurs intra-auriculaires pour apprécier pleinement la spatialisation 3D binaurale et le crossfeed naturel.
        </span>
      </div>
    </div>
  );
}
