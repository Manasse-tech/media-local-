'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sliders,
  RotateCcw,
  Volume2,
  Power,
  Sparkles,
  Save,
  Trash2,
  Plus,
  Radio,
  Check,
  Activity,
  Headphones,
  Info,
} from 'lucide-react';
import {
  audioEngine,
  FREQUENCY_BANDS,
  EQUALIZER_PRESETS,
  EqualizerPresetName,
} from '@/lib/audio-engine';
import { Spatializer3DView } from './Spatializer3DView';

interface CustomPreset {
  name: string;
  bands: number[];
  bass: number;
  treble: number;
  preamp: number;
}

const STORAGE_KEY_CUSTOM_PRESETS = 'local_media_custom_eq_presets';

export function EqualizerStudio({ onClose }: { onClose?: () => void }) {
  const [activePreset, setActivePreset] = useState<string>('Flat');
  const [bandValues, setBandValues] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [bassGain, setBassGain] = useState<number>(0);
  const [trebleGain, setTrebleGain] = useState<number>(0);
  const [preampGain, setPreampGain] = useState<number>(() => audioEngine.getPreampGain());
  const [balance, setBalance] = useState<number>(0);
  const [isBypassed, setIsBypassed] = useState<boolean>(() => audioEngine.getBypassState());
  const [qFactor, setQFactor] = useState<number>(1.4);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<'eq' | 'spatial' | 'presets'>('eq');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update band gain
  const handleBandChange = useCallback((index: number, val: number) => {
    setBandValues((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
    audioEngine.setBandGain(index, val);
    setActivePreset('Personnalisé');
  }, []);

  // Reset single band to 0 dB
  const resetBand = useCallback((index: number) => {
    handleBandChange(index, 0);
  }, [handleBandChange]);

  const handleBassChange = useCallback((val: number) => {
    setBassGain(val);
    audioEngine.setBassGain(val);
    setActivePreset('Personnalisé');
  }, []);

  const handleTrebleChange = useCallback((val: number) => {
    setTrebleGain(val);
    audioEngine.setTrebleGain(val);
    setActivePreset('Personnalisé');
  }, []);

  const handlePreampChange = useCallback((val: number) => {
    setPreampGain(val);
    audioEngine.setPreampGain(val);
  }, []);

  const handleBalanceChange = useCallback((val: number) => {
    setBalance(val);
    audioEngine.setBalance(val);
  }, []);

  const handleQFactorChange = useCallback((q: number) => {
    setQFactor(q);
    audioEngine.setFilterQ(q);
  }, []);

  const toggleBypass = useCallback(() => {
    setIsBypassed((prev) => {
      const next = !prev;
      audioEngine.setBypass(next);
      return next;
    });
  }, []);

  // Apply predefined preset
  const applyPreset = useCallback((preset: EqualizerPresetName) => {
    setActivePreset(preset);
    const gains = EQUALIZER_PRESETS[preset] || EQUALIZER_PRESETS.Flat;
    setBandValues([...gains]);
    audioEngine.applyPreset(preset);
  }, []);

  // Apply custom preset
  const applyCustomPreset = useCallback((preset: CustomPreset) => {
    setActivePreset(preset.name);
    setBandValues([...preset.bands]);
    preset.bands.forEach((g, i) => audioEngine.setBandGain(i, g));
    setBassGain(preset.bass);
    audioEngine.setBassGain(preset.bass);
    setTrebleGain(preset.treble);
    audioEngine.setTrebleGain(preset.treble);
    setPreampGain(preset.preamp);
    audioEngine.setPreampGain(preset.preamp);
  }, []);

  // Save new custom preset
  const saveCustomPreset = useCallback(() => {
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    const newPreset: CustomPreset = {
      name: trimmed,
      bands: [...bandValues],
      bass: bassGain,
      treble: trebleGain,
      preamp: preampGain,
    };
    const updated = [...customPresets.filter((p) => p.name !== trimmed), newPreset];
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setActivePreset(trimmed);
    setNewPresetName('');
    setShowSaveModal(false);
  }, [newPresetName, bandValues, bassGain, trebleGain, preampGain, customPresets]);

  // Delete custom preset
  const deleteCustomPreset = useCallback((presetName: string) => {
    const updated = customPresets.filter((p) => p.name !== presetName);
    setCustomPresets(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (activePreset === presetName) {
      applyPreset('Flat');
    }
  }, [customPresets, activePreset, applyPreset]);

  // Reset all
  const resetAll = useCallback(() => {
    applyPreset('Flat');
    handleBassChange(0);
    handleTrebleChange(0);
    handlePreampChange(0);
    handleBalanceChange(0);
    if (isBypassed) {
      toggleBypass();
    }
  }, [applyPreset, handleBassChange, handleTrebleChange, handlePreampChange, handleBalanceChange, isBypassed, toggleBypass]);

  // Real-time canvas curve & live FFT spectrum rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const numPoints = 180;
    const minFreq = 20;
    const maxFreq = 20000;

    // Generate logarithmically spaced frequencies
    const freqList = new Float32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      const ratio = i / (numPoints - 1);
      freqList[i] = minFreq * Math.pow(maxFreq / minFreq, ratio);
    }

    const render = () => {
      animId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;

      // 0dB baseline
      const zeroY = height / 2;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, zeroY);
      ctx.lineTo(width, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // +12dB and -12dB lines
      const dbScale = (height / 2 - 16) / 12; // pixels per dB
      const plus12Y = zeroY - 12 * dbScale;
      const minus12Y = zeroY + 12 * dbScale;

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, plus12Y);
      ctx.lineTo(width, plus12Y);
      ctx.moveTo(0, minus12Y);
      ctx.lineTo(width, minus12Y);
      ctx.stroke();

      // Draw real-time FFT spectrum in the background if audio is playing
      const analyser = audioEngine.getAnalyser();
      if (analyser && !isBypassed) {
        const binCount = analyser.frequencyBinCount;
        const freqData = new Uint8Array(binCount);
        analyser.getByteFrequencyData(freqData);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        const barWidth = width / 64;
        for (let b = 0; b < 64; b++) {
          const sampleIndex = Math.floor((b / 64) * (binCount * 0.75));
          const val = freqData[sampleIndex] || 0;
          const barHeight = (val / 255) * (height - 20);
          ctx.fillRect(b * barWidth, height - barHeight, barWidth - 1, barHeight);
        }
      }

      // Calculate exact frequency response curve from Web Audio API nodes
      const dbResponses = audioEngine.getCombinedFrequencyResponse(freqList);

      // Draw frequency response filled area
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let i = 0; i < numPoints; i++) {
        const x = (i / (numPoints - 1)) * width;
        const db = isBypassed ? 0 : dbResponses[i];
        // clamp to viewport
        const clampedDb = Math.max(-18, Math.min(18, db));
        const y = zeroY - clampedDb * dbScale;
        if (i === 0) {
          ctx.lineTo(0, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
      fillGrad.addColorStop(0, isBypassed ? 'rgba(148, 163, 184, 0.15)' : 'rgba(16, 185, 129, 0.25)');
      fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Draw EQ response line
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const x = (i / (numPoints - 1)) * width;
        const db = isBypassed ? 0 : dbResponses[i];
        const clampedDb = Math.max(-18, Math.min(18, db));
        const y = zeroY - clampedDb * dbScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isBypassed ? '#94a3b8' : '#10b981';
      ctx.stroke();

      // Draw frequency band control points on curve
      FREQUENCY_BANDS.forEach((freq, idx) => {
        // Logarithmic x position
        const ratio = Math.log(freq / minFreq) / Math.log(maxFreq / minFreq);
        const x = ratio * width;
        const val = isBypassed ? 0 : (bandValues[idx] || 0) + (isBypassed ? 0 : preampGain);
        const y = zeroY - Math.max(-18, Math.min(18, val)) * dbScale;

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = isBypassed ? '#64748b' : '#34d399';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [bandValues, bassGain, trebleGain, preampGain, isBypassed, qFactor]);

  const factoryPresetList = useMemo(() => {
    return Object.keys(EQUALIZER_PRESETS) as EqualizerPresetName[];
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-100">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Égaliseur Studio Web Audio
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isBypassed
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isBypassed ? 'Bypass' : 'Actif'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              10 bandes biquad IIR • Analyse spectrale FFT en temps réel
            </p>
          </div>
        </div>

        {/* Global actions: Bypass, Reset, Tab toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bypass (A/B Test) */}
          <button
            onClick={toggleBypass}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isBypassed
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
            title="Désactiver temporairement l'égaliseur pour écouter le son original (Test A/B)"
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isBypassed ? 'Bypass Activé' : 'Bypass'}</span>
          </button>

          {/* Reset All */}
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors cursor-pointer"
            title="Réinitialiser tous les réglages"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Tab toggle: EQ vs Spatial 3D vs Presets */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewTab('eq')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewTab === 'eq'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Faders & Courbe
            </button>
            <button
              onClick={() => setViewTab('spatial')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewTab === 'spatial'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Spatial 3D</span>
            </button>
            <button
              onClick={() => setViewTab('presets')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewTab === 'presets'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Presets ({factoryPresetList.length + customPresets.length})
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {viewTab === 'eq' ? (
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(88vh-80px)]">
          {/* Real-time Web Audio API Frequency Response & FFT Curve */}
          <div className="relative bg-slate-950 rounded-xl p-3 border border-slate-800/90 shadow-inner overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                Courbe de Réponse DSP (20 Hz - 20 kHz)
              </span>
              <div className="flex items-center gap-4">
                <span>+12 dB</span>
                <span className="text-slate-500">0 dB</span>
                <span>-12 dB</span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={720}
              height={150}
              className="w-full h-36 rounded-lg bg-slate-950/80 block"
            />

            {/* Quick Frequency markers */}
            <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1 px-1">
              <span>20 Hz</span>
              <span>100 Hz</span>
              <span>500 Hz</span>
              <span>1 kHz</span>
              <span>5 kHz</span>
              <span>10 kHz</span>
              <span>20 kHz</span>
            </div>
          </div>

          {/* Top Parameters Bar (Preamp Gain, Q Factor, Bass, Treble, Pan) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Preamp Gain (Prevents Clipping) */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-slate-300">Pré-ampli</span>
                <span className={`font-mono ${preampGain > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {preampGain > 0 ? `+${preampGain.toFixed(1)}` : preampGain.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={preampGain}
                onChange={(e) => handlePreampChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Anti-écrêtage</span>
            </div>

            {/* Bass Lowshelf 100Hz */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-slate-300">Graves (Bass)</span>
                <span className="font-mono text-emerald-400">
                  {bassGain > 0 ? `+${bassGain.toFixed(1)}` : bassGain.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="12"
                step="0.5"
                value={bassGain}
                onChange={(e) => handleBassChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Lowshelf 100Hz</span>
            </div>

            {/* Treble Highshelf 8kHz */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-slate-300">Aigus (Treble)</span>
                <span className="font-mono text-emerald-400">
                  {trebleGain > 0 ? `+${trebleGain.toFixed(1)}` : trebleGain.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="12"
                step="0.5"
                value={trebleGain}
                onChange={(e) => handleTrebleChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Highshelf 8kHz</span>
            </div>

            {/* Stereo Balance / Pan */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-slate-300">Balance L/R</span>
                <span className="font-mono text-emerald-400">
                  {balance === 0 ? 'Centre' : balance < 0 ? `L ${Math.abs(Math.round(balance * 100))}%` : `R ${Math.round(balance * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={balance}
                onChange={(e) => handleBalanceChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Stereo Panner</span>
            </div>

            {/* Q-Factor Bandwidth */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <div className="flex justify-between text-[11px] font-semibold mb-1">
                <span className="text-slate-300">Facteur Q</span>
                <span className="font-mono text-emerald-400">{qFactor}</span>
              </div>
              <div className="flex gap-1">
                {[
                  { label: 'Large', q: 0.7 },
                  { label: 'Std', q: 1.4 },
                  { label: 'Fin', q: 2.8 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleQFactorChange(item.q)}
                    className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors ${
                      qFactor === item.q
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="text-[9px] text-slate-500 block mt-1">Largeur de bande</span>
            </div>
          </div>

          {/* 10-Band Graphic Fader Rack */}
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">
                Faders 10 Bandes Studio (-12 dB à +12 dB)
              </span>
              <span className="text-[11px] text-slate-500">
                Double-cliquez sur un curseur pour le réinitialiser à 0 dB
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 items-center justify-items-center">
              {FREQUENCY_BANDS.map((freq, idx) => {
                const freqLabel = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
                const val = bandValues[idx] || 0;
                return (
                  <div
                    key={freq}
                    className="flex flex-col items-center justify-between h-48 w-full bg-slate-900/40 p-2 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors group"
                  >
                    {/* Gain Value Label */}
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        val > 0
                          ? 'text-emerald-400'
                          : val < 0
                          ? 'text-cyan-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                    </span>

                    {/* Vertical Slider */}
                    <div className="relative flex-1 flex items-center justify-center my-1 w-full">
                      {/* Zero baseline guide */}
                      <div className="absolute w-full h-[1px] bg-slate-700/80 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={val}
                        onDoubleClick={() => resetBand(idx)}
                        onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl',
                          WebkitAppearance: 'slider-vertical',
                        }}
                        className="h-28 w-5 appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                        title={`Bande ${freqLabel}Hz : ${val} dB`}
                      />
                    </div>

                    {/* Frequency Band Title */}
                    <div className="flex flex-col items-center mt-1">
                      <span className="text-[11px] font-bold text-slate-300 font-mono">
                        {freqLabel}
                      </span>
                      <span className="text-[9px] text-slate-500">Hz</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : viewTab === 'spatial' ? (
        <Spatializer3DView />
      ) : (
        /* Presets Management View */
        <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(88vh-80px)]">
          {/* Custom User Presets Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Vos Préréglages Personnalisés
              </h3>
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enregistrer la courbe actuelle</span>
              </button>
            </div>

            {showSaveModal && (
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center gap-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Nom du preset (ex: Mon Bass Boost HQ)..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={saveCustomPreset}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  Sauvegarder
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-2 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:text-white"
                >
                  Annuler
                </button>
              </div>
            )}

            {customPresets.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500">
                Aucun préréglage personnalisé pour le moment. Modifiez vos curseurs et cliquez sur &quot;Enregistrer la courbe actuelle&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {customPresets.map((preset) => (
                  <div
                    key={preset.name}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      activePreset === preset.name
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-semibold'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => applyCustomPreset(preset)}
                      className="flex-1 text-left flex items-center gap-2 truncate cursor-pointer"
                    >
                      {activePreset === preset.name && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      <span className="truncate text-xs">{preset.name}</span>
                    </button>
                    <button
                      onClick={() => deleteCustomPreset(preset.name)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                      title="Supprimer ce preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Factory Presets Catalog */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-blue-400" />
              Catalogue de Préréglages Studio ({factoryPresetList.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {factoryPresetList.map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    activePreset === preset
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{preset}</span>
                  {activePreset === preset && <Check className="w-4 h-4 text-slate-950" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info & Hint */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 px-4">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          Web Audio API IIR Biquad Filters • Normalisation EBU R128 • Échantillonnage natif 48kHz
        </span>
        <span className="font-mono text-slate-400">Preset : {activePreset}</span>
      </div>
    </div>
  );
}
