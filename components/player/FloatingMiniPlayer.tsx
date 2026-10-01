'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Sliders,
  Pin,
  PinOff,
  Move,
  Film,
  Music2,
  Heart,
  Dock,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { formatTime } from '@/lib/metadata-parser';
import { MiniVisualizerBar } from './MiniVisualizerBar';

export function FloatingMiniPlayer() {
  const {
    currentMedia,
    isPlaying,
    position,
    duration,
    volume,
    isMuted,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setIsNowPlayingOpen,
    setIsVideoPlayerOpen,
    setIsEqualizerOpen,
    isFloatingMiniPlayerOpen,
    setIsFloatingMiniPlayerOpen,
    stopPlayback,
    toggleFavorite,
  } = usePlayer();

  const [isCompact, setIsCompact] = useState(false);
  const [isPinned, setIsPinned] = useState(true);

  if (!isFloatingMiniPlayerOpen || !currentMedia) return null;

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const handleOpenFull = () => {
    if (currentMedia.type === 'video') {
      setIsVideoPlayerOpen(true);
    } else {
      setIsNowPlayingOpen(true);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`fixed z-50 right-4 bottom-20 md:bottom-24 bg-slate-950/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.25)] select-none transition-all ${
          isCompact ? 'w-72 p-2.5' : 'w-84 sm:w-92 p-3.5'
        }`}
      >
        {/* Header Bar: Status Badge, Drag handle & Window controls */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isPlaying ? 'bg-emerald-400' : 'bg-slate-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isPlaying ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </span>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider truncate flex items-center gap-1">
              <Pin className="w-2.5 h-2.5 text-blue-400" />
              Toujours visible
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            {/* Dock back button */}
            <button
              onClick={() => setIsFloatingMiniPlayerOpen(false)}
              className="p-1 hover:text-white hover:bg-slate-800/80 rounded-md transition-colors"
              title="Ancrer en bas (Mode barre standard)"
            >
              <Dock className="w-3.5 h-3.5" />
            </button>

            {/* Compact / Expand toggle */}
            <button
              onClick={() => setIsCompact(!isCompact)}
              className="p-1 hover:text-white hover:bg-slate-800/80 rounded-md transition-colors"
              title={isCompact ? 'Agrandir le mini-lecteur' : 'Mode ultra-compact'}
            >
              {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Expand to full player modal */}
            <button
              onClick={handleOpenFull}
              className="p-1 hover:text-white hover:bg-slate-800/80 rounded-md transition-colors"
              title="Ouvrir le lecteur plein écran"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            </button>

            {/* Close */}
            <button
              onClick={() => setIsFloatingMiniPlayerOpen(false)}
              className="p-1 hover:text-rose-400 hover:bg-slate-800/80 rounded-md transition-colors"
              title="Fermer le mini-lecteur flottant"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Media Info & Artwork */}
        <div className="flex items-center gap-3">
          <div
            onClick={handleOpenFull}
            className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 shadow-md cursor-pointer group"
          >
            <MediaThumbnail
              thumbnail={currentMedia.thumbnail}
              type={currentMedia.type}
              title={currentMedia.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
              {currentMedia.type === 'video' ? (
                <Film className="w-4 h-4 text-white/80" />
              ) : (
                <Music2 className="w-4 h-4 text-white/80" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4
              onClick={handleOpenFull}
              className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:text-blue-400 transition-colors"
              title={currentMedia.title}
            >
              {currentMedia.title}
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-slate-400 truncate">
                {currentMedia.artist || 'Artiste inconnu'}
              </p>
              {currentMedia.type === 'audio' && (
                <MiniVisualizerBar isPlaying={isPlaying} barCount={6} height={12} />
              )}
            </div>
          </div>

          <button
            onClick={() => toggleFavorite(currentMedia.id)}
            className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ${
              currentMedia.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-white'
            }`}
            title={currentMedia.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={`w-3.5 h-3.5 ${currentMedia.isFavorite ? 'fill-current text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="mt-2.5 space-y-1">
          <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer group">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={position}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Essential Transport Controls */}
        <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-1">
            {/* Seek -5s */}
            <button
              onClick={() => seekRelative(-5)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reculer de 5s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Previous */}
            <button
              onClick={playPrevious}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Piste précédente"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-blue-600/40 cursor-pointer"
            title={isPlaying ? 'Pause (Espace)' : 'Lecture (Espace)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <div className="flex items-center gap-1">
            {/* Next */}
            <button
              onClick={playNext}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Piste suivante"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Seek +5s */}
            <button
              onClick={() => seekRelative(5)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Avancer de 5s"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Volume & Equalizer footer (shown if not ultra-compact) */}
        {!isCompact && (
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/[0.05]">
            <div className="flex items-center gap-1.5 flex-1 max-w-[130px]">
              <button
                onClick={toggleMute}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title={isMuted ? 'Rétablir le son' : 'Couper le son (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                title={`Volume : ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            <button
              onClick={() => setIsEqualizerOpen(true)}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Ouvrir l'égaliseur audio Web Audio API"
            >
              <Sliders className="w-3 h-3 text-emerald-400" />
              <span>Égaliseur</span>
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
