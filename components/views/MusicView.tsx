'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'motion/react';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { searchEngine } from '@/lib/search-engine';
import { EditMetadataModal } from '@/components/media/EditMetadataModal';
import {
  Music2,
  Play,
  MoreVertical,
  Heart,
  Plus,
  ArrowUpDown,
  Search,
  Filter,
  Disc3,
  Users,
  Radio,
  FolderOpen,
  ListMusic,
  Info,
  Trash2,
  CornerDownRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import { LibraryListSkeleton } from '@/components/ui/Skeleton';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { MediaItem, MusicSubTab, SortField, SortOrder, AppRoute } from '@/types/media';
import { formatTime, formatBytes } from '@/lib/metadata-parser';

interface MusicViewProps {
  initialTab?: MusicSubTab;
  onTabChange?: (tab: MusicSubTab) => void;
  onOpenAlbum: (albumName: string) => void;
  onOpenArtist: (artistName: string) => void;
  onOpenGenre: (genreName: string) => void;
  onOpenFolder: (folderName: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onRouteChange: (route: AppRoute) => void;
}

export function MusicView({
  initialTab = 'tracks',
  onTabChange,
  onOpenAlbum,
  onOpenArtist,
  onOpenGenre,
  onOpenFolder,
  onOpenPlaylist,
  onRouteChange,
}: MusicViewProps) {
  const {
    mediaList,
    playlists,
    isLoading,
    toggleFavorite,
    removeMedia,
    addMediaToPlaylist,
    transcribeMediaLyrics,
    deleteMediaLyrics,
  } = useLibrary();
  const { playMedia, addToQueue, addToQueueNext, setActiveMediaInfoItem } = usePlayer();

  const [activeTab, setActiveTab] = useState<MusicSubTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [playlistTargetMedia, setPlaylistTargetMedia] = useState<MediaItem | null>(null);
  const [editingTrack, setEditingTrack] = useState<MediaItem | null>(null);

  // Portal overlay anchors
  const [menuAnchor, setMenuAnchor] = useState<{ rect: DOMRect; track: MediaItem } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update real-time search engine index from IndexedDB-backed mediaList
  useEffect(() => {
    searchEngine.updateIndex(mediaList);
  }, [mediaList]);

  const parentRef = useRef<HTMLDivElement | null>(null);

  // Filter audio items only
  const allAudio = useMemo(() => mediaList.filter((m) => m.type === 'audio'), [mediaList]);

  // Unique genres & formats for filtering
  const genres = useMemo(() => {
    const set = new Set<string>();
    allAudio.forEach((m) => {
      if (m.genre) set.add(m.genre);
    });
    return Array.from(set);
  }, [allAudio]);

  const formats = useMemo(() => {
    const set = new Set<string>();
    allAudio.forEach((m) => {
      if (m.extension) set.add(m.extension.toLowerCase());
    });
    return Array.from(set);
  }, [allAudio]);

  // Filtered and Sorted Tracks using indexing search engine fallback
  const filteredTracks = useMemo(() => {
    let list = allAudio;

    if (searchQuery.trim()) {
      // IndexedDB query matching in real-time
      list = searchEngine.search(searchQuery, 2000).filter((m) => m.type === 'audio');
    }

    return list
      .filter((track) => {
        if (selectedGenre !== 'all' && track.genre !== selectedGenre) return false;
        if (selectedFormat !== 'all' && track.extension.toLowerCase() !== selectedFormat) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'title') cmp = a.title.localeCompare(b.title);
        else if (sortField === 'artist') cmp = a.artist.localeCompare(b.artist);
        else if (sortField === 'album') cmp = a.album.localeCompare(b.album);
        else if (sortField === 'duration') cmp = a.duration - b.duration;
        else if (sortField === 'addedAt') cmp = a.addedAt - b.addedAt;
        else if (sortField === 'size') cmp = a.size - b.size;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [allAudio, selectedGenre, selectedFormat, searchQuery, sortField, sortOrder]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  // Grouped by Album with search indexing filters
  const albumsMap = useMemo(() => {
    const map = new Map<string, { album: string; artist: string; count: number; cover?: string; tracks: MediaItem[] }>();
    allAudio.forEach((track) => {
      const albumKey = track.album || 'Album inconnu';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.album.toLowerCase().includes(q);
        if (!matchesSearch) return;
      }

      if (!map.has(albumKey)) {
        map.set(albumKey, {
          album: albumKey,
          artist: track.artist || 'Artiste inconnu',
          count: 0,
          cover: track.thumbnail,
          tracks: [],
        });
      }
      const entry = map.get(albumKey)!;
      entry.count += 1;
      entry.tracks.push(track);
      if (!entry.cover && track.thumbnail) entry.cover = track.thumbnail;
    });
    return Array.from(map.values()).sort((a, b) => a.album.localeCompare(b.album));
  }, [allAudio, searchQuery]);

  // Grouped by Artist with search indexing filters
  const artistsMap = useMemo(() => {
    const map = new Map<string, { artist: string; count: number; tracks: MediaItem[] }>();
    allAudio.forEach((track) => {
      const artistKey = track.artist || 'Artiste inconnu';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.album.toLowerCase().includes(q);
        if (!matchesSearch) return;
      }

      if (!map.has(artistKey)) {
        map.set(artistKey, { artist: artistKey, count: 0, tracks: [] });
      }
      const entry = map.get(artistKey)!;
      entry.count += 1;
      entry.tracks.push(track);
    });
    return Array.from(map.values()).sort((a, b) => a.artist.localeCompare(b.artist));
  }, [allAudio, searchQuery]);

  // Grouped by Genre with search indexing filters
  const genresMap = useMemo(() => {
    const map = new Map<string, { genre: string; count: number; tracks: MediaItem[] }>();
    allAudio.forEach((track) => {
      const genreKey = track.genre || 'Inconnu';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.album.toLowerCase().includes(q) ||
          genreKey.toLowerCase().includes(q);
        if (!matchesSearch) return;
      }

      if (!map.has(genreKey)) {
        map.set(genreKey, { genre: genreKey, count: 0, tracks: [] });
      }
      const entry = map.get(genreKey)!;
      entry.count += 1;
      entry.tracks.push(track);
    });
    return Array.from(map.values()).sort((a, b) => a.genre.localeCompare(b.genre));
  }, [allAudio, searchQuery]);

  // Grouped by Folder with search indexing filters
  const foldersMap = useMemo(() => {
    const map = new Map<string, { folder: string; count: number; tracks: MediaItem[] }>();
    allAudio.forEach((track) => {
      const folderKey = track.folder || 'Dossier principal';

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          track.album.toLowerCase().includes(q) ||
          folderKey.toLowerCase().includes(q);
        if (!matchesSearch) return;
      }

      if (!map.has(folderKey)) {
        map.set(folderKey, { folder: folderKey, count: 0, tracks: [] });
      }
      const entry = map.get(folderKey)!;
      entry.count += 1;
      entry.tracks.push(track);
    });
    return Array.from(map.values()).sort((a, b) => a.folder.localeCompare(b.folder));
  }, [allAudio, searchQuery]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const q = searchQuery.toLowerCase();
    return playlists.filter(
      (pl) =>
        pl.title.toLowerCase().includes(q) ||
        (pl.description && pl.description.toLowerCase().includes(q))
    );
  }, [playlists, searchQuery]);

  const tabs: { id: MusicSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'tracks', label: 'Titres', icon: Music2 },
    { id: 'albums', label: 'Albums', icon: Disc3 },
    { id: 'artists', label: 'Artistes', icon: Users },
    { id: 'genres', label: 'Genres', icon: Radio },
    { id: 'folders', label: 'Dossiers', icon: FolderOpen },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 md:p-8 space-y-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Musique
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {allAudio.length} piste(s) audio indexée(s)
          </p>
        </div>

        {/* Global actions: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer les morceaux..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer"
            >
              <option value="title" className="bg-slate-900">Titre</option>
              <option value="artist" className="bg-slate-900">Artiste</option>
              <option value="album" className="bg-slate-900">Album</option>
              <option value="duration" className="bg-slate-900">Durée</option>
              <option value="addedAt" className="bg-slate-900">Date d&apos;ajout</option>
              <option value="size" className="bg-slate-900">Taille</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="ml-1 text-blue-400 hover:text-blue-300 font-bold"
              title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Genre filter */}
          {genres.length > 0 && (
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Tous genres</option>
              {genres.map((g) => (
                <option key={g} value={g} className="bg-slate-900">
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800/80 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onTabChange?.(tab.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-white bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: TITRES (Compact virtualized list for 10k+ items) */}
      {activeTab === 'tracks' && (
        <div
          ref={parentRef}
          className="flex-1 min-h-0 overflow-y-auto pr-2"
        >
          {isLoading ? (
            <LibraryListSkeleton count={8} />
          ) : filteredTracks.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Music2 className="w-12 h-12 stroke-1 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">Aucun titre correspondant trouvé</p>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const track = filteredTracks[virtualRow.index];
                const idx = virtualRow.index;
                return (
                  <div
                    key={track.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pr-1"
                  >
                    <div
                      onClick={() => playMedia(track, filteredTracks)}
                      className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition-all cursor-pointer select-none"
                    >
                      {/* Left: Index/Play, Artwork, Title, Artist, Album */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-5 text-center text-xs text-slate-500 font-mono group-hover:hidden">
                          {idx + 1}
                        </div>
                        <div className="w-5 text-center hidden group-hover:flex items-center justify-center text-blue-400">
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>

                        <MediaThumbnail thumbnail={track.thumbnail} type="audio" title={track.title} className="w-10 h-10 rounded-lg shrink-0" />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                              {track.title}
                            </p>
                            {/* Lyrics Status Badges */}
                            {track.lyricsStatus === 'processing' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-950/90 border border-cyan-800/60 px-1.5 py-0.5 rounded-full font-medium shrink-0 animate-pulse">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />
                                <span>Analyse des paroles...</span>
                              </span>
                            ) : track.lyricsStatus === 'completed' || (track.lyrics && track.lyrics.length > 0) ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded-full font-medium shrink-0" title="Paroles synchronisées disponibles">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Paroles disponibles</span>
                              </span>
                            ) : track.lyricsStatus === 'needs_review' ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>Transcription à vérifier</span>
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      {/* Center/Desktop: Album */}
                      <div className="hidden md:block w-48 text-xs text-slate-400 truncate px-2">
                        {track.album}
                      </div>

                      {/* Right: Duration, Favorite, Menu */}
                      <div className="flex items-center gap-2 relative">
                        <span className="text-xs text-slate-400 font-mono tabular-nums">
                          {formatTime(track.duration)}
                        </span>

                        <button
                          id={`track-fav-btn-${track.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track.id);
                          }}
                          className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
                            track.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                          }`}
                          title={track.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Heart className={`w-4 h-4 ${track.isFavorite ? 'fill-current text-rose-500' : ''}`} />
                        </button>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuAnchor({ rect, track });
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Menu d'actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ALBUMS */}
      {activeTab === 'albums' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
            {albumsMap.map((alb) => (
            <div
              key={alb.album}
              onClick={() => onOpenAlbum(alb.album)}
              className="group flex flex-col p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
            >
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 mb-3 flex items-center justify-center border border-slate-800">
                <MediaThumbnail
                  thumbnail={alb.cover}
                  type="audio"
                  title={alb.album}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (alb.tracks.length > 0) playMedia(alb.tracks[0], alb.tracks);
                    }}
                    className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105"
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {alb.album}
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {alb.artist} • {alb.count} titre(s)
              </p>
            </div>
          ))}
          </div>
        </div>
      )}
      {activeTab === 'artists' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
            {artistsMap.map((art) => (
            <div
              key={art.artist}
              onClick={() => onOpenArtist(art.artist)}
              className="group flex flex-col items-center text-center p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 mb-3 flex items-center justify-center border border-slate-700/60 shadow-lg group-hover:scale-105 transition-transform">
                <Users className="w-10 h-10 text-indigo-400" />
              </div>
              <h4 className="text-xs font-semibold text-white truncate w-full group-hover:text-blue-400 transition-colors">
                {art.artist}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">{art.count} titre(s)</p>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: GENRES */}
      {activeTab === 'genres' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
            {genresMap.map((gen) => (
            <div
              key={gen.genre}
              onClick={() => onOpenGenre(gen.genre)}
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer group"
            >
              <div className="p-3 rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Radio className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {gen.genre}
                </h4>
                <p className="text-[11px] text-slate-400">{gen.count} morceau(x)</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DOSSIERS */}
      {activeTab === 'folders' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pb-4">
            {foldersMap.map((fol) => (
            <div
              key={fol.folder}
              onClick={() => onOpenFolder(fol.folder)}
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer group"
            >
              <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {fol.folder}
                </h4>
                <p className="text-[11px] text-slate-400">{fol.count} élément(s)</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PLAYLISTS */}
      {activeTab === 'playlists' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4 pb-4">
          <div className="flex justify-end">
            <button
              onClick={() => onRouteChange('playlists')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Gérer les playlists</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredPlaylists.map((pl) => {
              const firstMediaId = pl.mediaIds.length > 0 ? pl.mediaIds[0] : null;
              const firstMedia = firstMediaId ? mediaList.find((m) => m.id === firstMediaId) : undefined;
              return (
                <div
                  key={pl.id}
                  onClick={() => onOpenPlaylist(pl.id)}
                  className="group flex flex-col p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
                >
                  <div className="aspect-square w-full rounded-xl bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 mb-2 flex items-center justify-center border border-slate-800 overflow-hidden relative">
                    <MediaThumbnail
                      thumbnail={firstMedia?.thumbnail}
                      type={firstMedia?.type || 'audio'}
                      title={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {pl.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{pl.mediaIds.length} titre(s)</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add To Playlist Modal */}
      {playlistTargetMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPlaylistTargetMedia(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 text-white shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold">Ajouter à une playlist</h3>
            <p className="text-xs text-slate-400 truncate">
              {playlistTargetMedia.title}
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {playlists.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Aucune playlist existante. Créez-en une depuis l&apos;onglet Playlists.
                </p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      addMediaToPlaylist(pl.id, playlistTargetMedia.id);
                      setPlaylistTargetMedia(null);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-950 hover:bg-blue-600/30 text-xs font-medium text-left transition-colors"
                  >
                    <span>{pl.title}</span>
                    <span className="text-[10px] text-slate-500">{pl.mediaIds.length} titres</span>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setPlaylistTargetMedia(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* React Portal for Context Menu (prevents stacking & virtualized clipping bugs) */}
      {isMounted && menuAnchor && createPortal(
        <>
          {/* Fullscreen transparent backdrop to catch click-outside */}
          <div
            className="fixed inset-0 z-[9998] bg-transparent pointer-events-auto"
            onClick={() => setMenuAnchor(null)}
          />

          <div
            className="fixed z-[9999] w-52 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1 text-xs text-slate-300 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            style={{
              top: `${menuAnchor.rect.bottom + 320 > window.innerHeight
                ? Math.max(12, menuAnchor.rect.top - 320 - 6)
                : menuAnchor.rect.bottom + 6}px`,
              left: `${Math.max(12, Math.min(window.innerWidth - 220, menuAnchor.rect.left - 170))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                playMedia(menuAnchor.track, filteredTracks);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <Play className="w-3.5 h-3.5 text-blue-400" />
              <span>Lire maintenant</span>
            </button>

            <button
              onClick={() => {
                toggleFavorite(menuAnchor.track.id);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <Heart className={`w-3.5 h-3.5 ${menuAnchor.track.isFavorite ? 'text-rose-500 fill-current' : 'text-slate-400'}`} />
              <span>{menuAnchor.track.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
            </button>

            <button
              onClick={() => {
                addToQueueNext(menuAnchor.track);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lire juste après</span>
            </button>

            <button
              onClick={() => {
                addToQueue(menuAnchor.track);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ajouter à la file</span>
            </button>

            <button
              onClick={() => {
                setPlaylistTargetMedia(menuAnchor.track);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <ListMusic className="w-3.5 h-3.5 text-amber-400" />
              <span>Ajouter à une playlist</span>
            </button>

            <button
              onClick={() => {
                setActiveMediaInfoItem(menuAnchor.track);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Informations du fichier</span>
            </button>

            <button
              onClick={() => {
                setEditingTrack(menuAnchor.track);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors text-left"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Modifier les métadonnées</span>
            </button>

            <div className="border-t border-slate-800 my-1" />

            <button
              onClick={() => {
                transcribeMediaLyrics(menuAnchor.track.id, true);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-950/50 hover:text-cyan-300 text-cyan-400 transition-colors text-left"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transcrire avec Gemini IA</span>
            </button>

            {menuAnchor.track.lyrics && menuAnchor.track.lyrics.length > 0 && (
              <button
                onClick={() => {
                  deleteMediaLyrics(menuAnchor.track.id);
                  setMenuAnchor(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer les paroles</span>
              </button>
            )}

            <div className="border-t border-slate-800 my-1" />

            <button
              onClick={() => {
                removeMedia(menuAnchor.track.id);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-950/40 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Retirer de la bibliothèque</span>
            </button>
          </div>
        </>
      , document.body)}

      {editingTrack && (
        <EditMetadataModal
          track={editingTrack}
          isOpen={Boolean(editingTrack)}
          onClose={() => setEditingTrack(null)}
        />
      )}
    </div>
  );
}
