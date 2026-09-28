'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Shuffle,
  ListPlus,
  Trash2,
  Plus,
  Music2,
  Film,
  ArrowUp,
  ArrowDown,
  Clock,
  X,
} from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { MediaItem } from '@/types/media';
import { formatTime } from '@/lib/metadata-parser';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';

interface PlaylistDetailViewProps {
  playlistId: string;
  onBack: () => void;
}

export function PlaylistDetailView({ playlistId, onBack }: PlaylistDetailViewProps) {
  const { playlists, mediaList, removeMediaFromPlaylist, reorderPlaylist, addMediaToPlaylist, deletePlaylist } = useLibrary();
  const { playMedia, addToQueue } = usePlayer();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const playlist = playlists.find((p) => p.id === playlistId);

  if (!playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-slate-400 text-sm mb-4">Playlist introuvable.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          Retour aux playlists
        </button>
      </div>
    );
  }

  // Resolve tracks in playlist order
  const tracks: MediaItem[] = playlist.mediaIds
    .map((id) => mediaList.find((m) => m.id === id))
    .filter(Boolean) as MediaItem[];

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  // Available library items not in playlist
  const availableToAdd = mediaList.filter((m) => !playlist.mediaIds.includes(m.id));

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      playMedia(tracks[0], tracks);
    }
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playMedia(shuffled[0], shuffled);
    }
  };

  const moveUp = (index: number) => {
    if (index > 0) reorderPlaylist(playlist.id, index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index < playlist.mediaIds.length - 1) reorderPlaylist(playlist.id, index, index + 1);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour aux playlists</span>
      </button>

      {/* Playlist Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800/80">
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-slate-950 shrink-0 shadow-2xl border border-slate-800 flex items-center justify-center">
          <MediaThumbnail
            thumbnail={tracks[0]?.thumbnail}
            type={tracks[0]?.type || 'audio'}
            title={playlist.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs uppercase font-bold tracking-wider text-blue-400">
            Playlist
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight truncate">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-xs sm:text-sm text-slate-300">{playlist.description}</p>
          )}
          <p className="text-xs text-slate-400">
            {tracks.length} élément(s) • Durée totale : {formatTime(totalDuration)}
          </p>

          {/* Action cluster */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
            <button
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Lire tout</span>
            </button>

            <button
              onClick={handleShuffle}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Aléatoire</span>
            </button>

            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter des titres</span>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-all cursor-pointer"
              title="Supprimer la playlist"
            >
              <Trash2 className="w-4 h-4" />
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

        {tracks.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <p className="text-sm">Cette playlist est vide.</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-3 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
            >
              Ajouter des éléments
            </button>
          </div>
        ) : (
          tracks.map((track, idx) => (
            <div
              key={`${track.id}_${idx}`}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-900/80 transition-colors cursor-pointer"
            >
              <div
                onClick={() => playMedia(track, tracks)}
                className="flex items-center gap-4 min-w-0 flex-1"
              >
                <span className="w-6 text-center text-xs text-slate-400 font-mono group-hover:hidden">
                  {idx + 1}
                </span>
                <div className="w-6 text-center hidden group-hover:flex items-center justify-center text-blue-400">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>

                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                  <MediaThumbnail
                    thumbnail={track.thumbnail}
                    type={track.type}
                    title={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                </div>
              </div>

              {/* Reordering & removal controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono mr-2">
                  {formatTime(track.duration)}
                </span>

                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded"
                  title="Monter"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === tracks.length - 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-20 rounded"
                  title="Descendre"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => removeMediaFromPlaylist(playlist.id, track.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded"
                  title="Retirer de la playlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Media Modal */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsAddOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base">Ajouter à {playlist.title}</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {availableToAdd.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  Tous les fichiers de votre bibliothèque sont déjà dans cette playlist.
                </p>
              ) : (
                availableToAdd.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 text-xs gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                      <MediaThumbnail
                        thumbnail={m.thumbnail}
                        type={m.type}
                        title={m.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{m.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.artist} • {formatTime(m.duration)}</p>
                    </div>
                    <button
                      onClick={() => addMediaToPlaylist(playlist.id, m.id)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] shrink-0"
                    >
                      Ajouter
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deletion */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-400 pb-2 border-b border-slate-800">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base">Supprimer la playlist</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer la playlist <strong className="text-white">&quot;{playlist.title}&quot;</strong> ? Cette action est irréversible. Les morceaux de votre bibliothèque ne seront pas supprimés.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePlaylist(playlist.id);
                  setShowDeleteConfirm(false);
                  onBack();
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
