'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Sliders,
  Volume2,
  VolumeX,
  Volume1,
  Plus,
  Minus,
  ListMusic,
  Music2,
  Info,
  Video,
  Headphones,
  Sparkles,
  Palette,
  Eye,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/metadata-parser';
import { VisualizerCanvas } from './VisualizerCanvas';
import { LyricsPanel } from './LyricsPanel';
import { useDefaultAudioCover, DEFAULT_AUDIO_COVER_SVG } from '@/lib/cover-manager';
import { DisplayCustomizerModal } from './DisplayCustomizerModal';
import { OscillatingBarsVisualizer } from './OscillatingBarsVisualizer';

export function NowPlayingModal() {
  const {
    currentMedia,
    isPlaying,
    position,
    duration,
    volume,
    isMuted,
    speed,
    shuffle,
    repeat,
    queue,
    isNowPlayingOpen,
    isVideoAudioMode,
    goToVideoMode,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setSpeed,
    toggleShuffle,
    cycleRepeat,
    setIsNowPlayingOpen,
    setIsQueueOpen,
    setIsEqualizerOpen,
    setActiveMediaInfoItem,
    toggleFavorite,
  } = usePlayer();

  const [mobileTab, setMobileTab] = useState<'player' | 'lyrics'>('player');
  const [showLyrics, setShowLyrics] = useState(false);
  const [displayMode, setDisplayMode] = useState<'vinyl' | 'cover' | 'immersion'>('vinyl');
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Background & Immersion adjustments
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);
  const [customBgOpacity, setCustomBgOpacity] = useState<number>(0.85);
  const [customBgBlur, setCustomBgBlur] = useState<number>(0);

  const defaultCover = useDefaultAudioCover();

  // Load and subscribe to background settings
  useEffect(() => {
    const syncBg = () => {
      const savedBg = localStorage.getItem('app_custom_bg') || null;
      setCustomBgImage(savedBg);

      const savedOpacity = localStorage.getItem('app_bg_opacity');
      if (savedOpacity !== null) {
        const op = parseFloat(savedOpacity);
        if (!isNaN(op)) setCustomBgOpacity(op);
      }

      const savedBlur = localStorage.getItem('app_bg_blur');
      if (savedBlur !== null) {
        const bl = parseFloat(savedBlur);
        if (!isNaN(bl)) setCustomBgBlur(bl);
      } else {
        setCustomBgBlur(0);
      }
    };

    syncBg();
    window.addEventListener('storage', syncBg);
    window.addEventListener('app-theme-changed', syncBg);
    return () => {
      window.removeEventListener('storage', syncBg);
      window.removeEventListener('app-theme-changed', syncBg);
    };
  }, []);

  // Hardware / Physical Keyboard volume adjustment listener
  useEffect(() => {
    if (!isNowPlayingOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowUp' || e.code === 'AudioVolumeUp' || e.code === 'VolumeUp' || e.key === '+' || e.code === 'NumpadAdd') {
        e.preventDefault();
        setVolume(Math.min(1, Math.round((volume + 0.05) * 100) / 100));
      } else if (e.key === 'ArrowDown' || e.code === 'AudioVolumeDown' || e.code === 'VolumeDown' || e.key === '-' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        setVolume(Math.max(0, Math.round((volume - 0.05) * 100) / 100));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNowPlayingOpen, volume, setVolume]);

  if (!isNowPlayingOpen || !currentMedia) return null;

  const speedOptions = [0.75, 1, 1.25, 1.5, 2];

  // Effective artwork (embedded or user default)
  const isDefaultOrEmpty = !currentMedia.thumbnail || currentMedia.thumbnail === DEFAULT_AUDIO_COVER_SVG;
  const activeCover: string = (!isDefaultOrEmpty && currentMedia.thumbnail ? currentMedia.thumbnail : defaultCover) || DEFAULT_AUDIO_COVER_SVG;

  const handleVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setVolume(Math.min(1, Math.round((volume + 0.05) * 100) / 100));
    } else {
      setVolume(Math.max(0, Math.round((volume - 0.05) * 100) / 100));
    }
  };

  const handleStepVolume = (direction: 'up' | 'down') => {
    if (direction === 'up') {
      setVolume(Math.min(1, Math.round((volume + 0.05) * 100) / 100));
    } else {
      setVolume(Math.max(0, Math.round((volume - 0.05) * 100) / 100));
    }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        try {
          localStorage.setItem('app_custom_bg', reader.result);
        } catch {
          console.warn('Storage quota limit reached');
        }
        setCustomBgImage(reader.result);
        setCustomBgBlur(0);
        localStorage.setItem('app_bg_blur', '0');
        window.dispatchEvent(new Event('app-theme-changed'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetCustomBg = () => {
    localStorage.removeItem('app_custom_bg');
    localStorage.removeItem('app_bg_blur');
    localStorage.removeItem('app_bg_opacity');
    setCustomBgImage(null);
    setCustomBgBlur(0);
    setCustomBgOpacity(0.85);
    window.dispatchEvent(new Event('app-theme-changed'));
  };

  const handleBlurChange = (val: number) => {
    setCustomBgBlur(val);
    localStorage.setItem('app_bg_blur', String(val));
    window.dispatchEvent(new Event('app-theme-changed'));
  };

  const handleOpacityChange = (val: number) => {
    setCustomBgOpacity(val);
    localStorage.setItem('app_bg_opacity', String(val));
    window.dispatchEvent(new Event('app-theme-changed'));
  };

  return (
    <div
      id="now-playing-overlay"
      className="fixed inset-0 z-50 bg-slate-950 text-white overflow-hidden animate-in fade-in duration-300 select-none flex flex-col justify-between h-[100dvh] max-h-[100dvh]"
    >
      {/* Background Layer: When immersion mode is active, show the image across the full screen CLEARLY & SHARPLY */}
      {displayMode === 'immersion' && activeCover && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-all duration-700 bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeCover}
            alt=""
            className="w-full h-full object-cover transition-all duration-500 scale-100"
            style={{
              filter: customBgBlur > 0 ? `blur(${customBgBlur}px)` : 'none',
              opacity: customBgOpacity,
            }}
          />
          {/* Subtle bottom gradient to guarantee crisp control readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/20" />
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 border-b border-white/[0.08] shrink-0 relative z-20 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNowPlayingOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Réduire le lecteur"
          >
            <X className="w-5 h-5 rotate-90" />
          </button>

          {/* Mobile / Tablet Tab Switcher */}
          <div className="flex lg:hidden items-center gap-3 font-semibold text-sm">
            <button
              onClick={() => setMobileTab('player')}
              className={`transition-colors cursor-pointer ${
                mobileTab === 'player'
                  ? 'text-white border-b-2 border-blue-500 pb-0.5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lecteur
            </button>
            <button
              onClick={() => setMobileTab('lyrics')}
              className={`transition-colors cursor-pointer flex items-center gap-1.5 ${
                mobileTab === 'lyrics'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 pb-0.5'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Paroles</span>
            </button>
          </div>

          <span className="hidden lg:inline text-xs uppercase tracking-widest text-slate-400 font-bold">
            En cours de lecture
          </span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Toggle synchronized lyrics (Desktop) */}
          <button
            onClick={() => setShowLyrics((prev) => !prev)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              showLyrics
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
            title="Afficher/Masquer les paroles synchronisées"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paroles</span>
          </button>

          {/* Equalizer Toggle */}
          <button
            id="now-playing-equalizer-btn"
            onClick={() => setIsEqualizerOpen(true)}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
            title="Ouvrir l'égaliseur"
          >
            <Sliders className="w-5 h-5" />
          </button>

          {/* Display & Backdrop customizer full modal button */}
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              displayMode === 'immersion'
                ? 'text-indigo-400 bg-indigo-950/80 ring-1 ring-indigo-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Personnalisation de l'affichage & Fond"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Media Info Inspector */}
          <button
            id="now-playing-info-btn"
            onClick={() => setActiveMediaInfoItem(currentMedia)}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
            title="Détails & Métadonnées"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Queue Drawer Button */}
          <button
            id="now-playing-queue-btn"
            onClick={() => setIsQueueOpen(true)}
            className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
            title="File d'attente"
          >
            <ListMusic className="w-5 h-5" />
            {queue.length > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-full min-w-4 text-center">
                {queue.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Video to Audio Mode Notification Banner */}
      {isVideoAudioMode && (
        <div className="flex items-center justify-between px-4 sm:px-8 py-2 bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-purple-950/90 border-b border-blue-500/30 text-xs shrink-0 relative z-10">
          <div className="flex items-center gap-2 text-blue-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <Headphones className="w-3.5 h-3.5 text-cyan-300" />
            <span className="font-semibold text-[11px]">Mode Audio actif</span>
          </div>
          <button
            onClick={goToVideoMode}
            className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all text-[11px] cursor-pointer"
          >
            <Video className="w-3 h-3" />
            <span>Vidéo</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col justify-between px-4 sm:px-8 pt-4 sm:pt-6 pb-2 relative z-10 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Mobile View */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col justify-between py-1">
          {mobileTab === 'lyrics' ? (
            <div className="h-[65vh] flex flex-col">
              <LyricsPanel currentMedia={currentMedia} position={position} onSeek={seek} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col justify-between items-center text-center">
              {/* Center Artwork / Visualizer (Only shown when mode !== 'immersion') */}
              <div className="flex-1 min-h-0 flex items-center justify-center my-auto">
                {displayMode === 'cover' ? (
                  <div className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeCover} alt={currentMedia.title} className="w-full h-full object-cover" />
                  </div>
                ) : displayMode === 'vinyl' ? (
                  /* Circular vinyl layout with dynamic equalizing diagram bars and internal oscillating bars visualizer */
                  <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <VisualizerCanvas mode="circular-spectrum" size={300} />
                    </div>
                    <div className="relative z-10">
                      <OscillatingBarsVisualizer size={210} activeCover={activeCover} isPlaying={isPlaying} />
                    </div>
                  </div>
                ) : (
                  /* Immersion Mode: Clean open space allowing unobstructed view of background artwork */
                  <div className="flex-1" />
                )}
              </div>

              {/* Lower Controls block */}
              <div className="w-full max-w-md pb-1 pt-1 flex flex-col items-center shrink-0">
                {/* Title & Artist */}
                <div className="w-full mb-1.5 text-center">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate drop-shadow-md">{currentMedia.title}</h2>
                  <p className="text-xs sm:text-sm text-slate-300 truncate mt-0.5 drop-shadow">{currentMedia.artist}</p>
                </div>

                {/* Timeline Scrubber */}
                <div className="w-full mb-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.5"
                    value={position}
                    onChange={(e) => seek(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-300 mt-1 font-mono">
                    <span>{formatTime(position)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-4 mb-2.5">
                  <button
                    onClick={toggleShuffle}
                    className={`p-2 rounded-full ${shuffle ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400'}`}
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>
                  <button onClick={playPrevious} className="p-2 text-slate-300 hover:text-white">
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>
                  <button
                    id="mobile-play-btn"
                    onClick={togglePlay}
                    className="w-13 h-13 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  <button onClick={playNext} className="p-2 text-slate-300 hover:text-white">
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>
                  <button
                    onClick={cycleRepeat}
                    className={`p-2 rounded-full ${repeat !== 'off' ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400'}`}
                  >
                    {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                  </button>
                </div>

                {/* Mobile Volume Control with + / - buttons */}
                <div
                  onWheel={handleVolumeWheel}
                  className="flex items-center justify-between gap-2 w-full max-w-xs mb-1 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-md"
                >
                  <button
                    onClick={toggleMute}
                    className="p-1 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                    title={isMuted ? 'Rétablir le son' : 'Couper le son'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-blue-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleStepVolume('down')}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs shrink-0 cursor-pointer"
                    title="Diminuer (-5%)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />

                  <button
                    onClick={() => handleStepVolume('up')}
                    className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs shrink-0 cursor-pointer"
                    title="Augmenter (+5%)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-[10px] font-mono text-slate-300 w-7 text-right shrink-0">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Layout */}
        <div className={`hidden lg:grid ${showLyrics ? 'grid-cols-12 gap-8' : 'grid-cols-1 flex flex-col items-center'} w-full h-full min-h-0 transition-all duration-500`}>
          {/* Player Controls Panel: vertically balanced and strictly inside viewport */}
          <div className={`${showLyrics ? 'col-span-6' : 'max-w-xl mx-auto'} flex flex-col justify-between items-center text-center h-full min-h-0 py-1 transition-all duration-500`}>
            
            {/* Top Artwork / Vinyl (Only shown when mode !== 'immersion') */}
            <div className="flex-1 min-h-0 flex items-center justify-center my-auto select-none">
              {displayMode === 'cover' ? (
                <div className="w-[260px] h-[260px] sm:w-[290px] sm:h-[290px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-900 group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeCover} alt={currentMedia.title} className="w-full h-full object-cover" />
                </div>
              ) : displayMode === 'vinyl' ? (
                /* Circular vinyl layout with radiating frequency spectrum diagrams and internal oscillating bars visualizer */
                <div className="relative w-[320px] h-[320px] sm:w-[350px] sm:h-[350px] flex items-center justify-center shrink-0 select-none">
                  {/* Circular Frequency Equalizer Spectrum Diagram */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <VisualizerCanvas mode="circular-spectrum" size={350} />
                  </div>
                  {/* Oscillating Bars Visualizer Disk */}
                  <div className="relative z-10">
                    <OscillatingBarsVisualizer size={250} activeCover={activeCover} isPlaying={isPlaying} />
                  </div>
                </div>
              ) : (
                /* Immersion Mode: Clean open space allowing unobstructed view of background artwork */
                <div className="flex-1" />
              )}
            </div>

            {/* Lower Controls Block: Descended smoothly for comfortable reading & interaction */}
            <div className="w-full max-w-md pb-2 pt-1 flex flex-col items-center shrink-0">
              {/* Title, Artist & Favorite */}
              <div className="mb-2.5 w-full">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-left min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate drop-shadow-md">
                      {currentMedia.title}
                    </h2>
                    <p className="text-sm text-slate-300 font-medium truncate mt-0.5 drop-shadow">
                      {currentMedia.artist}
                    </p>
                  </div>
                  <button
                    id="now-playing-favorite-btn"
                    onClick={() => toggleFavorite(currentMedia.id)}
                    className={`p-2.5 rounded-full hover:bg-slate-900/80 transition-colors cursor-pointer shrink-0 ${
                      currentMedia.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                    }`}
                    title={currentMedia.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Heart className={`w-6 h-6 ${currentMedia.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Scrubber Bar */}
              <div className="w-full mb-2.5">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.5"
                  value={position}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                />
                <div className="flex justify-between items-center text-xs text-slate-300 mt-1 font-mono">
                  <span>{formatTime(position)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
                <button
                  onClick={toggleShuffle}
                  className={`p-2.5 rounded-full hover:bg-slate-900 transition-colors cursor-pointer ${
                    shuffle ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400 hover:text-white'
                  }`}
                  title={shuffle ? 'Désactiver aléatoire' : 'Activer aléatoire'}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={() => seekRelative(-10)}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
                  title="-10 secondes"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={playPrevious}
                  className="p-3 text-slate-300 hover:text-white hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
                  title="Précédent"
                >
                  <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                </button>

                <button
                  id="now-playing-play-btn"
                  onClick={togglePlay}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Lecture'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current ml-1" />
                  )}
                </button>

                <button
                  onClick={playNext}
                  className="p-3 text-slate-300 hover:text-white hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
                  title="Suivant"
                >
                  <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                </button>

                <button
                  onClick={() => seekRelative(10)}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors cursor-pointer"
                  title="+10 secondes"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                <button
                  onClick={cycleRepeat}
                  className={`p-2.5 rounded-full hover:bg-slate-900 transition-colors cursor-pointer ${
                    repeat !== 'off' ? 'text-blue-400 bg-blue-950/60' : 'text-slate-400 hover:text-white'
                  }`}
                  title={
                    repeat === 'off'
                      ? 'Répéter tout'
                      : repeat === 'all'
                      ? 'Répéter un morceau'
                      : 'Désactiver répétition'
                  }
                >
                  {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              {/* Volume & Speed Controls with + / - physical step buttons */}
              <div
                onWheel={handleVolumeWheel}
                className="flex items-center justify-between w-full max-w-md pt-2 border-t border-white/10 gap-3"
              >
                {/* Direct Volume control */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                    title={isMuted ? 'Rétablir le son' : 'Couper le son'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-blue-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleStepVolume('down')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title="Diminuer le volume (-5%)"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    title={`Volume : ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                  />

                  <button
                    onClick={() => handleStepVolume('up')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                    title="Augmenter le volume (+5%)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  <span className="text-[11px] font-mono text-slate-300 w-8 text-right shrink-0">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>

                {/* Speed buttons */}
                <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg p-1 border border-slate-800 shrink-0">
                  {speedOptions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        speed === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Sliding Synchronized Lyrics) */}
          {showLyrics && (
            <div className="lg:col-span-6 h-[480px] xl:h-[520px] flex flex-col transition-all duration-500 animate-in slide-in-from-right duration-300">
              <LyricsPanel currentMedia={currentMedia} position={position} onSeek={seek} />
            </div>
          )}
        </div>
      </div>

      {/* Full-Page Studio Customizer Modal */}
      <DisplayCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        displayMode={displayMode}
        onSelectDisplayMode={(m) => setDisplayMode(m)}
        activeCover={activeCover}
        songTitle={currentMedia.title}
        customBgImage={customBgImage}
        customBgBlur={customBgBlur}
        customBgOpacity={customBgOpacity}
        onBlurChange={handleBlurChange}
        onOpacityChange={handleOpacityChange}
        onBgUpload={handleCustomBgUpload}
        onResetBg={handleResetCustomBg}
      />

      {/* Styled inline rotation animation */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
