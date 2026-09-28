'use client';

import React, { useRef } from 'react';
import {
  X,
  Disc3,
  Eye,
  Image as ImageIcon,
  Sliders,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
} from 'lucide-react';

interface DisplayCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayMode: 'vinyl' | 'cover' | 'immersion';
  onSelectDisplayMode: (mode: 'vinyl' | 'cover' | 'immersion') => void;
  activeCover: string;
  songTitle: string;
  customBgImage: string | null;
  customBgBlur: number;
  customBgOpacity: number;
  onBlurChange: (blur: number) => void;
  onOpacityChange: (opacity: number) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetBg: () => void;
}

export function DisplayCustomizerModal({
  isOpen,
  onClose,
  displayMode,
  onSelectDisplayMode,
  activeCover,
  songTitle,
  customBgImage,
  customBgBlur,
  customBgOpacity,
  onBlurChange,
  onOpacityChange,
  onBgUpload,
  onResetBg,
}: DisplayCustomizerModalProps) {
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Studio de Personnalisation de l’Affichage
              </h2>
              <p className="text-xs text-slate-400">
                Choisissez votre style visuel de lecture et ajustez la netteté et la densité de l’image
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Section 1: Main 2 Display Modes (Vinyl vs Full Immersion) */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              1. Sélectionnez votre mode de lecture principal
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Mode Disque Vinyle Dynamique */}
              <div
                onClick={() => onSelectDisplayMode('vinyl')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                  displayMode === 'vinyl'
                    ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/40 shadow-xl shadow-blue-500/10'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                {displayMode === 'vinyl' && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-md">
                    <Check className="w-3 h-3" />
                    <span>Actif</span>
                  </span>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Disc3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mode Disque Vinyle</h3>
                    <p className="text-xs text-slate-400">Spectre audio & diagrammes LED</p>
                  </div>
                </div>

                {/* Visual Preview Box */}
                <div className="h-36 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden relative mb-3">
                  <div className="relative w-24 h-24 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeCover} alt="" className="w-full h-full object-cover rounded-full" />
                    <div className="absolute w-4 h-4 rounded-full bg-slate-950 border border-slate-600" />
                  </div>
                  {/* Surrounding equalizer dots/bars representation */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 rounded-full border border-dashed border-cyan-400/40 animate-spin" />
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Affiche le disque vinyle rotatif rétro au centre avec ses barres d’égaliseur réactives en temps réel sur fond sobre.
                </p>
              </div>

              {/* Option B: Mode Fond Immersif Plein Écran */}
              <div
                onClick={() => onSelectDisplayMode('immersion')}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between group ${
                  displayMode === 'immersion'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                {displayMode === 'immersion' && (
                  <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-md">
                    <Check className="w-3 h-3" />
                    <span>Actif</span>
                  </span>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mode Fond Immersif</h3>
                    <p className="text-xs text-slate-400">Image en grand format plein écran</p>
                  </div>
                </div>

                {/* Visual Preview Box */}
                <div className="h-36 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeCover}
                    alt=""
                    className="w-full h-full object-cover transition-all"
                    style={{
                      filter: customBgBlur > 0 ? `blur(${customBgBlur}px)` : 'none',
                      opacity: customBgOpacity,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex items-end p-3">
                    <div className="text-left">
                      <p className="text-xs font-bold text-white truncate">{songTitle}</p>
                      <p className="text-[10px] text-slate-300">Image nette & immersive</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  L&apos;image de la chanson remplit toute la page <strong>parfaitement nette</strong>. Le vinyle est masqué pour laisser place au visuel.
                </p>
              </div>
            </div>

            {/* Option C: Mode Pochette Studio HD (Discreet Button) */}
            <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">Mode Pochette Studio Carrée</span>
                  <span className="text-[11px] text-slate-400">Affiche la pochette album au centre au format carré HD</span>
                </div>
              </div>

              <button
                onClick={() => onSelectDisplayMode('cover')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  displayMode === 'cover'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {displayMode === 'cover' ? 'Sélectionné' : 'Choisir ce mode'}
              </button>
            </div>
          </div>

          {/* Section 2: Image Quality & Blur / Opacity Controls */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>2. Réglage de la netteté et de l’intensité de l’image</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Blur Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Netteté / Flou de l&apos;image</span>
                  <span className="font-mono text-cyan-400 text-xs font-bold">
                    {customBgBlur === 0 ? '0px (100% Net)' : `${customBgBlur}px (Flouté)`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="1"
                  value={customBgBlur}
                  onChange={(e) => onBlurChange(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onBlurChange(0)}
                    className={`text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      customBgBlur === 0
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    Image Nette (0px)
                  </button>
                  <button
                    onClick={() => onBlurChange(12)}
                    className={`text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      customBgBlur === 12
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    Flou doux (12px)
                  </button>
                  <button
                    onClick={() => onBlurChange(24)}
                    className={`text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      customBgBlur === 24
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white bg-slate-800'
                    }`}
                  >
                    Flou artistique (24px)
                  </button>
                </div>
              </div>

              {/* Opacity Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Densité & Opacité du fond</span>
                  <span className="font-mono text-blue-400 text-xs font-bold">
                    {Math.round(customBgOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1"
                  step="0.05"
                  value={customBgOpacity}
                  onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Subtil (20%)</span>
                  <span>Équilibré (70%)</span>
                  <span>Intense (100%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-colors cursor-pointer"
          >
            Appliquer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
