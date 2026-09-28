'use client';

import React from 'react';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { ArrowLeft, Play, Shuffle, ListPlus, Heart, Disc3, Music2, Clock } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/metadata-parser';

interface AlbumDetailViewProps {
  albumName: string;
  onBack: () => void;
  onOpenArtist?: (artistName: string) => void;
}

export function AlbumDetailView({ albumName, onBack, onOpenArtist }: AlbumDetailViewProps) {
  const { mediaList, toggleFavorite, toggleAlbumFavorite } = useLibrary();
  const { playMedia, addToQueue } = usePlayer();

  const albumTracks = mediaList.filter(
    (m) => m.type === 'audio' && (m.album || 'Album inconnu') === albumName
  );

  const isAllFavorited = albumTracks.length > 0 && albumTracks.every((t) => t.isFavorite);
  const artist = albumTracks[0]?.artist || 'Artiste inconnu';
  const year = albumTracks.find((t) => t.year)?.year;
  const cover = albumTracks.find((t) => t.thumbnail)?.thumbnail;
  const totalDuration = albumTracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayAll = () => {
    if (albumTracks.length > 0) {
      playMedia(albumTracks[0], albumTracks);
    }
  };

  const handleShuffle = () => {
    if (albumTracks.length > 0) {
      const shuffled = [...albumTracks].sort(() => Math.random() - 0.5);
      playMedia(shuffled[0], shuffled);
    }
  };

  const handleQueueAll = () => {
    albumTracks.forEach((t) => addToQueue(t));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour aux albums</span>
      </button>

      {/* Album Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800/80">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden bg-slate-950 shrink-0 shadow-2xl border border-slate-800 flex items-center justify-center">
          <MediaThumbnail thumbnail={cover} type="audio" title={albumName} className="w-full h-full object-cover" />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
            Album
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight truncate">
            {albumName}
          </h1>
          <p
            onClick={() => onOpenArtist?.(artist)}
            className="text-sm sm:text-base text-slate-300 font-medium hover:text-blue-400 cursor-pointer transition-colors"
          >
            {artist} {year ? `• ${year}` : ''} • {albumTracks.length} titre(s)
          </p>
          <p className="text-xs text-slate-400">
            Durée totale : {formatTime(totalDuration)}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Lire tout</span>
            </button>

            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Aléatoire</span>
            </button>

            <button
              onClick={handleQueueAll}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Ajouter tout à la file"
            >
              <ListPlus className="w-4 h-4" />
            </button>

            <button
              id="album-favorite-btn"
              onClick={() => toggleAlbumFavorite(albumName)}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${
                isAllFavorited
                  ? 'bg-rose-950/80 text-rose-500 border border-rose-800/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isAllFavorited ? "Retirer l'album des favoris" : "Ajouter tout l'album aux favoris"}
            >
              <Heart className={`w-4 h-4 ${isAllFavorited ? 'fill-current text-rose-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-2 border-b border-slate-800 font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-4">
            <span className="w-6 text-center">#</span>
            <span>Titre</span>
          </div>
          <div className="flex items-center gap-4">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {albumTracks.map((track, idx) => (
          <div
            key={track.id}
            onClick={() => playMedia(track, albumTracks)}
            className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-900/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <span className="w-6 text-center text-xs text-slate-400 font-mono group-hover:hidden">
                {idx + 1}
              </span>
              <div className="w-6 text-center hidden group-hover:flex items-center justify-center text-blue-400">
                <Play className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {track.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">
                {formatTime(track.duration)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(track.id);
                }}
                className={`p-1 hover:scale-110 transition-transform ${
                  track.isFavorite ? 'text-rose-500' : 'text-slate-500 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
