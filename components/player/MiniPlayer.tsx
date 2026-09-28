'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Maximize2,
  X,
  Sliders,
  Film,
  Music2,
  Heart,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { formatTime } from '@/lib/metadata-parser';
import { MiniVisualizerBar } from './MiniVisualizerBar';

export function MiniPlayer() {
  const {
    currentMedia,
    isPlaying,
    position,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    queue,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setIsNowPlayingOpen,
    setIsVideoPlayerOpen,
    setIsQueueOpen,
    setIsEqualizerOpen,
    stopPlayback,
    toggleFavorite,
  } = usePlayer();

  if (!currentMedia) return null;

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const handleOpenPlayer = (e: React.MouseEvent) => {
    // If clicked on controls, don't open
    if ((e.target as HTMLElement).closest('button, input')) return;

    if (currentMedia.type === 'video') {
      setIsVideoPlayerOpen(true);
    } else {
      setIsNowPlayingOpen(true);
    }
  };

  return (
    <div
      id="mini-player-container"
      onClick={handleOpenPlayer}
      className="w-full bg-slate-950/90 border-t border-white/[0.08] px-3 md:px-5 py-2.5 z-40 select-none shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.6)] backdrop-blur-2xl relative transition-all cursor-pointer group"
    >
      {/* Top micro progress bar (always active) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/60 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-150 ease-linear rounded-r-full"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Thumbnail & Metadata */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:w-1/4 md:flex-initial">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50 flex items-center justify-center shadow-md">
            <MediaThumbnail
              thumbnail={currentMedia.thumbnail}
              type={currentMedia.type}
              title={currentMedia.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
          </div>

          <div className="min-w-0 pr-2 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {currentMedia.title}
              </h4>
              {currentMedia.type === 'audio' && (
                <MiniVisualizerBar isPlaying={isPlaying} barCount={8} height={14} className="hidden sm:block" />
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {currentMedia.artist}
              {currentMedia.album && currentMedia.album !== 'Album inconnu' && ` • ${currentMedia.album}`}
            </p>
          </div>

          <button
            id="mini-player-favorite-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(currentMedia.id);
            }}
            className={`p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ${
              currentMedia.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-white'
            }`}
            title={currentMedia.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={`w-4 h-4 ${currentMedia.isFavorite ? 'fill-current text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Center: Controls & Timeline (Desktop) */}
        <div className="hidden md:flex flex-col items-center flex-1 max-w-xl px-4">
          <div className="flex items-center gap-3 mb-1">
            <button
              id="mini-player-shuffle-btn"
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full hover:bg-slate-800 transition-colors ${
                shuffle ? 'text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title={shuffle ? 'Aléatoire activé' : 'Activer la lecture aléatoire'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              id="mini-player-prev-btn"
              onClick={playPrevious}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Précédent"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              id="mini-player-toggle-btn"
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              id="mini-player-next-btn"
              onClick={playNext}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Suivant"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              id="mini-player-repeat-btn"
              onClick={cycleRepeat}
              className={`p-1.5 rounded-full hover:bg-slate-800 transition-colors ${
                repeat !== 'off' ? 'text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title={`Répétition : ${repeat}`}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="w-full flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-10 text-right tabular-nums">{formatTime(position)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={position}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
            />
            <span className="w-10 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mobile quick controls */}
        <div className="flex items-center gap-1.5 md:hidden">
          <button
            id="mobile-mini-play-btn"
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>
          <button
            id="mobile-mini-next-btn"
            onClick={playNext}
            className="p-2 text-slate-400 hover:text-white rounded-full"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Extra Controls (Desktop) */}
        <div className="hidden md:flex items-center gap-2 md:w-1/4 justify-end">
          <button
            id="mini-player-equalizer-btn"
            onClick={() => setIsEqualizerOpen(true)}
            className="p-2 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Égaliseur"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            id="mini-player-queue-btn"
            onClick={() => setIsQueueOpen(true)}
            className="relative p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800/80 transition-colors"
            title="File d'attente"
          >
            <ListMusic className="w-4 h-4" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                {queue.length}
              </span>
            )}
          </button>

          {/* Volume slider */}
          <div
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) setVolume(Math.min(1, volume + 0.05));
              else setVolume(Math.max(0, volume - 0.05));
            }}
            className="flex items-center gap-1.5 ml-1"
          >
            <button
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={isMuted ? 'Rétablir le son' : `Couper le son (${Math.round(volume * 100)}%)`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-blue-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              title={`Volume : ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              className="w-16 lg:w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <button
            id="mini-player-expand-btn"
            onClick={() => {
              if (currentMedia.type === 'video') setIsVideoPlayerOpen(true);
              else setIsNowPlayingOpen(true);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            title="Agrandir"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            id="mini-player-close-btn"
            onClick={stopPlayback}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Fermer la lecture"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
