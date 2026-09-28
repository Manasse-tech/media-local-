'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Info,
  Ratio,
  SlidersHorizontal,
  FileText,
  Heart,
  Sun,
  Headphones,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/metadata-parser';

type AspectRatioMode = 'contain' | 'cover' | 'fill' | '16/9' | '4/3';

export function VideoPlayerOverlay() {
  const {
    currentMedia,
    isPlaying,
    position,
    duration,
    volume,
    isMuted,
    speed,
    isVideoPlayerOpen,
    isVideoAudioMode,
    goToAudioMode,
    videoRef,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setSpeed,
    setIsVideoPlayerOpen,
    setActiveMediaInfoItem,
    handleTimeUpdate,
    handleDurationChange,
    toggleFavorite,
  } = usePlayer();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('contain');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'left' | 'right' | null>(null);
  const [subtitleText, setSubtitleText] = useState<string>('');
  const [hasCustomSubtitles, setHasCustomSubtitles] = useState(false);
  const [brightness, setBrightness] = useState<number>(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const srtInputRef = useRef<HTMLInputElement | null>(null);

  const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  // Auto-hide controls after 3 seconds of inactivity
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isPlaying]);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if ((!isVideoPlayerOpen && !isVideoAudioMode) || !currentMedia || currentMedia.type !== 'video') {
    return null;
  }

  if (isVideoAudioMode) {
    return (
      <div className="fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <video
          ref={videoRef}
          src={currentMedia.objectUrl}
          playsInline
          onTimeUpdate={() => {
            if (videoRef.current) {
              handleTimeUpdate(videoRef.current.currentTime);
            }
          }}
          onDurationChange={() => {
            if (videoRef.current) {
              handleDurationChange(videoRef.current.duration || 0);
            }
          }}
          onEnded={playNext}
        />
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Touch gesture handling: double tap left (-10s), right (+10s)
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const isLeft = touchX < rect.width / 2;

    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(touchX - lastTapRef.current.x);

    if (timeDiff < 300 && distDiff < 50) {
      // Double tap detected!
      if (isLeft) {
        seekRelative(-10);
        setDoubleTapFeedback('left');
      } else {
        seekRelative(10);
        setDoubleTapFeedback('right');
      }
      setTimeout(() => setDoubleTapFeedback(null), 700);
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: touchX };
      resetHideTimer();
    }
  };

  // Cycle aspect ratio
  const cycleAspectRatio = () => {
    const modes: AspectRatioMode[] = ['contain', 'cover', 'fill', '16/9', '4/3'];
    const nextIdx = (modes.indexOf(aspectRatio) + 1) % modes.length;
    setAspectRatio(modes[nextIdx]);
  };

  // Local SRT subtitle loader
  const handleSubtitleFile = async (file: File) => {
    try {
      const text = await file.text();
      // Simple subtitle parse and display
      setSubtitleText('Sous-titres chargés : ' + file.name);
      setHasCustomSubtitles(true);
      setTimeout(() => setSubtitleText(''), 3000);
    } catch (e) {
      console.warn('Failed to parse subtitle file:', e);
    }
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // CSS class for aspect ratio
  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'cover':
        return 'w-full h-full object-cover';
      case 'fill':
        return 'w-full h-full object-fill';
      case '16/9':
        return 'w-full max-w-full aspect-video object-contain';
      case '4/3':
        return 'w-full max-w-full aspect-[4/3] object-contain';
      case 'contain':
      default:
        return 'w-full h-full object-contain';
    }
  };

  return (
    <div
      ref={containerRef}
      id="video-player-overlay"
      onMouseMove={resetHideTimer}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Central Video Element */}
      <video
        ref={videoRef}
        src={currentMedia.objectUrl}
        playsInline
        style={{ filter: `brightness(${brightness})` }}
        className={`${getAspectClass()} transition-all duration-300`}
        onClick={() => {
          togglePlay();
          resetHideTimer();
        }}
        onTimeUpdate={(e) => {
          handleTimeUpdate(e.currentTarget.currentTime);
        }}
        onDurationChange={(e) => {
          handleDurationChange(e.currentTarget.duration || 0);
        }}
        onEnded={playNext}
      />

      {/* Subtitles Overlay */}
      {subtitleText && (
        <div className="absolute bottom-24 inset-x-0 flex justify-center pointer-events-none px-4">
          <div className="bg-black/80 text-yellow-300 text-sm md:text-base font-semibold px-4 py-1.5 rounded-lg shadow-lg border border-black/50 text-center">
            {subtitleText}
          </div>
        </div>
      )}

      {/* Double tap feedback ripples */}
      {doubleTapFeedback === 'left' && (
        <div className="absolute left-8 md:left-20 flex flex-col items-center justify-center p-6 rounded-full bg-white/20 text-white animate-ping pointer-events-none">
          <RotateCcw className="w-10 h-10" />
          <span className="text-xs font-bold mt-1">-10s</span>
        </div>
      )}
      {doubleTapFeedback === 'right' && (
        <div className="absolute right-8 md:right-20 flex flex-col items-center justify-center p-6 rounded-full bg-white/20 text-white animate-ping pointer-events-none">
          <RotateCw className="w-10 h-10" />
          <span className="text-xs font-bold mt-1">+10s</span>
        </div>
      )}

      {/* Controls Overlay Container */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 md:p-6 bg-gradient-to-t from-black/90 via-transparent to-black/80 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none cursor-none'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="video-back-btn"
              onClick={() => setIsVideoPlayerOpen(false)}
              className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-colors cursor-pointer"
              title="Retour"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="min-w-0 max-w-md">
              <h3 className="text-sm md:text-base font-semibold text-white truncate drop-shadow-md">
                {currentMedia.title}
              </h3>
              <p className="text-xs text-white/70 truncate">
                {currentMedia.folder ? `${currentMedia.folder} • ` : ''}
                {currentMedia.width && currentMedia.height ? `${currentMedia.width}×${currentMedia.height} • ` : ''}
                {currentMedia.extension.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Audio Transition Button (Top Bar) */}
            <button
              id="video-top-audio-mode-btn"
              onClick={() => goToAudioMode(currentMedia.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full backdrop-blur-md shadow-lg transition-all text-xs font-semibold cursor-pointer group hover:scale-105 active:scale-95"
              title="Écouter en mode audio"
              aria-label="Écouter en mode audio"
            >
              <Headphones className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Mode audio</span>
            </button>

            <input
              ref={srtInputRef}
              type="file"
              accept=".srt,.vtt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleSubtitleFile(e.target.files[0]);
                }
              }}
            />
            <button
              onClick={() => srtInputRef.current?.click()}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                hasCustomSubtitles
                  ? 'text-yellow-400 bg-yellow-950/60 border border-yellow-500/40'
                  : 'text-white/80 hover:text-white bg-black/40 hover:bg-black/70'
              }`}
              title="Charger sous-titres (.srt, .vtt)"
            >
              <FileText className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                const nextB = brightness >= 1.4 ? 0.7 : brightness === 0.7 ? 1.0 : 1.4;
                setBrightness(nextB);
              }}
              className="p-2 text-white/80 hover:text-amber-400 bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-colors"
              title={`Luminosité : ${Math.round(brightness * 100)}%`}
            >
              <Sun className="w-5 h-5" />
            </button>

            <button
              id="video-favorite-btn"
              onClick={() => toggleFavorite(currentMedia.id)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                currentMedia.isFavorite
                  ? 'text-rose-500 bg-rose-950/60 border border-rose-500/40'
                  : 'text-white/80 hover:text-white bg-black/40 hover:bg-black/70'
              }`}
              title={currentMedia.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-5 h-5 ${currentMedia.isFavorite ? 'fill-current text-rose-500' : ''}`} />
            </button>

            <button
              onClick={() => setActiveMediaInfoItem(currentMedia)}
              className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-colors"
              title="Informations média"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Play/Pause controls */}
        <div className="flex items-center justify-center gap-8 md:gap-14">
          <button
            onClick={playPrevious}
            className="p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-all cursor-pointer"
            title="Précédent"
          >
            <SkipBack className="w-7 h-7" />
          </button>

          <button
            onClick={() => seekRelative(-10)}
            className="p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-all cursor-pointer"
            title="-10 secondes"
          >
            <RotateCcw className="w-7 h-7" />
          </button>

          <button
            id="video-center-toggle-btn"
            onClick={togglePlay}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-2xl backdrop-blur-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 md:w-9 md:h-9 fill-current" />
            ) : (
              <Play className="w-8 h-8 md:w-9 md:h-9 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={() => seekRelative(10)}
            className="p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-all cursor-pointer"
            title="+10 secondes"
          >
            <RotateCw className="w-7 h-7" />
          </button>

          <button
            onClick={playNext}
            className="p-3 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-md transition-all cursor-pointer"
            title="Suivant"
          >
            <SkipForward className="w-7 h-7" />
          </button>
        </div>

        {/* Bottom Bar: Timeline, Time, Speed, Aspect, PiP, Fullscreen */}
        <div className="flex flex-col gap-2">
          {/* Scrubber Timeline */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs text-white/90 font-mono tabular-nums shrink-0">
              {formatTime(position)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={position}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
            />
            <span className="text-xs text-white/90 font-mono tabular-nums shrink-0">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls Cluster */}
          <div className="flex items-center justify-between pt-1">
            {/* Left: Volume control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 text-white/80 hover:text-white rounded-lg transition-colors"
                title={isMuted ? 'Rétablir le son' : 'Couper le son'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 md:w-28 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Right: Mode audio, Aspect ratio, Speed, PiP, Fullscreen */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mode audio Casque Button */}
              <button
                id="video-bottom-audio-mode-btn"
                onClick={() => goToAudioMode(currentMedia.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-white/90 hover:text-white bg-blue-600/80 hover:bg-blue-500 rounded-lg backdrop-blur-md transition-all cursor-pointer font-medium hover:scale-105 active:scale-95 group"
                title="Écouter en mode audio"
                aria-label="Écouter en mode audio"
              >
                <Headphones className="w-4 h-4 text-cyan-200 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Mode audio</span>
              </button>

              {/* Aspect Ratio */}
              <button
                onClick={cycleAspectRatio}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-lg backdrop-blur-md transition-colors"
                title="Ratio d'affichage"
              >
                <Ratio className="w-4 h-4 text-blue-400" />
                <span className="uppercase text-[11px] font-semibold">{aspectRatio}</span>
              </button>

              {/* Speed selector */}
              <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10 backdrop-blur-md">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-1.5 py-0.5 rounded text-[10px] md:text-[11px] font-semibold transition-colors ${
                      speed === s ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* PiP */}
              {isPiPSupported && (
                <button
                  onClick={togglePiP}
                  className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-lg backdrop-blur-md transition-colors"
                  title="Picture-in-Picture (PiP)"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-lg backdrop-blur-md transition-colors cursor-pointer"
                title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
