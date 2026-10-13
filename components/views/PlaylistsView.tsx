'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  X,
  Sparkles,
  Wand2,
  Calendar,
  Flame,
  Radio,
  Clock,
  Heart,
  SlidersHorizontal,
} from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { Playlist } from '@/types/media';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';

interface PlaylistsViewProps {
  onOpenPlaylist: (playlistId: string) => void;
}

export function PlaylistsView({ onOpenPlaylist }: PlaylistsViewProps) {
  const { playlists, createPlaylist, deletePlaylist, mediaList, autoGeneratePlaylists } = useLibrary();
  const { playMedia } = usePlayer();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGenToast, setAutoGenToast] = useState<string | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'smart' | 'custom'>('all');

  // Smart playlist configuration options
  const [smartConfig, setSmartConfig] = useState({
    byGenre: true,
    byYear: true,
    byDecade: true,
    byPlayCount: true,
    byRecent: true,
    byFavorites: true,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const pl = await createPlaylist(newTitle.trim(), newDescription.trim());
    setNewTitle('');
    setNewDescription('');
    setIsCreateOpen(false);
    onOpenPlaylist(pl.id);
  };

  const handleExecuteSmartGen = async () => {
    setIsAutoGenerating(true);
    try {
      const generated = await autoGeneratePlaylists({
        byGenre: smartConfig.byGenre,
        byYear: smartConfig.byYear,
        byDecade: smartConfig.byDecade,
        byPlayCount: smartConfig.byPlayCount,
        byRecent: smartConfig.byRecent,
        byFavorites: smartConfig.byFavorites,
        minTracks: 1,
      });

      if (generated.length > 0) {
        setAutoGenToast(`${generated.length} playlist(s) intelligente(s) générée(s) et indexée(s) !`);
      } else {
        setAutoGenToast('Toutes les playlists correspondantes existent déjà.');
      }
      setTimeout(() => setAutoGenToast(null), 4000);
      setIsSmartModalOpen(false);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const isSmartPlaylist = (pl: Playlist) => {
    return (
      pl.isSmart ||
      pl.id.startsWith('playlist_genre_') ||
      pl.id.startsWith('playlist_decade_') ||
      pl.id.startsWith('playlist_year_') ||
      pl.id.startsWith('playlist_top_') ||
      pl.id.startsWith('playlist_unplayed_') ||
      pl.id.startsWith('playlist_heavy_') ||
      pl.id.startsWith('playlist_recent_') ||
      pl.id.startsWith('playlist_favs_')
    );
  };

  const filteredPlaylists = useMemo(() => {
    if (filterTab === 'smart') {
      return playlists.filter(isSmartPlaylist);
    }
    if (filterTab === 'custom') {
      return playlists.filter((pl) => !isSmartPlaylist(pl));
    }
    return playlists;
  }, [playlists, filterTab]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {autoGenToast && (
        <div className="p-3.5 rounded-2xl bg-indigo-950/90 border border-indigo-700/80 text-indigo-200 text-xs font-semibold flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
            <span>{autoGenToast}</span>
          </div>
          <button onClick={() => setAutoGenToast(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <ListMusic className="w-7 h-7 text-blue-400" />
            <span>Playlists</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {playlists.length} playlist(s) • Indexées localement dans IndexedDB
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {mediaList.length > 0 && (
            <button
              onClick={() => setIsSmartModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              title="Générer des playlists intelligentes par genre, année ou écoutes"
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Smart Playlists ⚡</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle playlist</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      {playlists.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Toutes ({playlists.length})
          </button>
          <button
            onClick={() => setFilterTab('smart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'smart'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-purple-300 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Smart Playlists ({playlists.filter(isSmartPlaylist).length})</span>
          </button>
          <button
            onClick={() => setFilterTab('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'custom'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Personnalisées ({playlists.filter((pl) => !isSmartPlaylist(pl)).length})
          </button>
        </div>
      )}

      {/* Grid */}
      {filteredPlaylists.length === 0 ? (
        <div className="py-20 text-center text-slate-500 max-w-md mx-auto space-y-4">
          <ListMusic className="w-16 h-16 stroke-1 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">
            {filterTab === 'smart' ? 'Aucune Smart Playlist' : 'Aucune playlist pour le moment'}
          </h3>
          <p className="text-xs text-slate-400">
            {filterTab === 'smart'
              ? 'Générez automatiquement des sélections basées sur le genre, l\'année ou le nombre d\'écoutes.'
              : 'Créez des sélections personnalisées à partir de vos fichiers audio et vidéo locaux.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {filterTab === 'smart' ? (
              <button
                onClick={() => setIsSmartModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md"
              >
                Générer des Smart Playlists
              </button>
            ) : (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
              >
                Créer ma première playlist
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPlaylists.map((pl, plIdx) => {
            const firstMediaId = pl.mediaIds.length > 0 ? pl.mediaIds[0] : null;
            const firstMedia = firstMediaId ? mediaList.find((m) => m.id === firstMediaId) : undefined;
            const smart = isSmartPlaylist(pl);

            return (
              <motion.div
                key={pl.id}
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(0.2, plIdx * 0.04) }}
                onClick={() => onOpenPlaylist(pl.id)}
                className={`group flex flex-col p-3 rounded-2xl bg-slate-900/60 border hover:bg-slate-800/70 transition-all cursor-pointer relative ${
                  smart
                    ? 'border-purple-800/40 hover:border-purple-500/60 shadow-[0_4px_20px_rgba(147,51,234,0.08)]'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="aspect-square w-full rounded-xl bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 mb-3 flex items-center justify-center border border-slate-800 relative overflow-hidden">
                  <MediaThumbnail
                    thumbnail={firstMedia?.thumbnail}
                    type={firstMedia?.type || 'audio'}
                    title={pl.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />

                  {/* Smart Playlist indicator badge */}
                  {smart && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-purple-950/80 backdrop-blur-md border border-purple-500/50 text-[10px] font-bold text-purple-300 flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                      <span>Smart</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const tracks = pl.mediaIds
                          .map((id) => mediaList.find((m) => m.id === id))
                          .filter(Boolean) as any[];
                        if (tracks.length > 0) playMedia(tracks[0], tracks);
                      }}
                      className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105"
                    >
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {pl.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {pl.mediaIds.length} titre(s)
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistToDelete(pl);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 rounded transition-opacity"
                    title="Supprimer la playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Smart Playlists Generator Modal */}
      {isSmartModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsSmartModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-purple-500/40 rounded-3xl w-full max-w-lg p-6 text-white shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    Générateur de Smart Playlists
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700/60">
                      IndexedDB
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Créez automatiquement des sélections basées sur vos métadonnées locales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSmartModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Criteria options */}
            <div className="space-y-3">
              <label
                onClick={() => setSmartConfig((prev) => ({ ...prev, byGenre: !prev.byGenre }))}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={smartConfig.byGenre}
                  onChange={() => {}}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-purple-400" />
                    Par Genres Musicaux
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Génère des mixes automatiques pour chaque genre répertorié (ex: Mix Afrobeats, Mix Pop, etc.).
                  </p>
                </div>
              </label>

              <label
                onClick={() => setSmartConfig((prev) => ({ ...prev, byYear: !prev.byYear, byDecade: !prev.byYear }))}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={smartConfig.byYear}
                  onChange={() => {}}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    Par Années de Sortie & Décennies
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Regroupe vos morceaux par décennies (Années 2020, 2010, 90s) et par années majeures.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setSmartConfig((prev) => ({ ...prev, byPlayCount: !prev.byPlayCount }))}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={smartConfig.byPlayCount}
                  onChange={() => {}}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Par Nombre d&apos;Écoutes (Statistiques locales)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Génère « Top Hits » (les plus écoutés), « En Boucle » (Heavy Rotation) et « Découvertes » (jamais écoutés).
                  </p>
                </div>
              </label>

              <label
                onClick={() => setSmartConfig((prev) => ({ ...prev, byRecent: !prev.byRecent }))}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={smartConfig.byRecent}
                  onChange={() => {}}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Derniers Ajouts
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Sélection des morceaux et vidéos ajoutés récemment à votre bibliothèque.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setSmartConfig((prev) => ({ ...prev, byFavorites: !prev.byFavorites }))}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={smartConfig.byFavorites}
                  onChange={() => {}}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Coups de Cœur (Favoris)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Playlist réunissant tous vos titres marqués comme favoris.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSmartModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isAutoGenerating}
                onClick={handleExecuteSmartGen}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isAutoGenerating ? 'animate-spin' : ''}`} />
                <span>{isAutoGenerating ? 'Génération...' : 'Générer les playlists'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deletion */}
      {playlistToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPlaylistToDelete(null)}
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
              Êtes-vous sûr de vouloir supprimer la playlist <strong className="text-white">&quot;{playlistToDelete.title}&quot;</strong> ? Cette action est irréversible. Les morceaux de votre bibliothèque ne seront pas supprimés.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPlaylistToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePlaylist(playlistToDelete.id);
                  setPlaylistToDelete(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsCreateOpen(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base">Créer une playlist</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Titre de la playlist *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Ma sélection acoustique"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description (optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Description..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
