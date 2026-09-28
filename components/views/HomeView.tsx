'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  FilePlus,
  FolderPlus,
  Sparkles,
  Music2,
  Clock,
  ListMusic,
  ChevronRight,
  ChevronDown,
  Search,
  Settings,
  HardDrive,
  Info,
} from 'lucide-react';
import { ImportManager } from '@/components/media/ImportManager';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { MediaItem, AppRoute } from '@/types/media';
import { formatTime } from '@/lib/metadata-parser';

interface HomeViewProps {
  onRouteChange: (route: AppRoute) => void;
  onOpenAlbum?: (albumName: string) => void;
  onOpenPlaylist?: (playlistId: string) => void;
}

export function HomeView({ onRouteChange, onOpenAlbum, onOpenPlaylist }: HomeViewProps) {
  const { mediaList, playlists, history, importFiles, importDirectory, loadDemoSamples } = useLibrary();
  const { playMedia } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(true);

  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const infoButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isInfoOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (infoButtonRef.current && !infoButtonRef.current.contains(e.target as Node)) {
        setIsInfoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInfoOpen]);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  // Derived sections
  const audioList = mediaList.filter((m) => m.type === 'audio');
  const videoList = mediaList.filter((m) => m.type === 'video');

  // Resume item (last played video or audio with resume position)
  const resumeItems = mediaList
    .filter((m) => m.resumePosition && m.resumePosition > 5 && m.resumePosition < (m.duration - 5))
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 3);

  // Recently added
  const recentlyAdded = [...mediaList]
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, 8);

  // Recently played
  const recentlyPlayed = history.slice(0, 6).map((h) => {
    return mediaList.find((m) => m.id === h.mediaId) || {
      id: h.mediaId,
      title: h.mediaTitle,
      artist: h.mediaArtist || 'Inconnu',
      type: h.mediaType,
      duration: h.duration,
      thumbnail: h.thumbnail,
      resumePosition: h.position,
    } as Partial<MediaItem>;
  });

  // If library is completely empty, show First Launch ImportManager
  if (mediaList.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center min-h-[80vh]">
        <ImportManager variant="full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Bar for Mobile & Quick Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Accueil
          </h1>

          {/* Collapsible Info Dropdown Button */}
          <div className="relative" ref={infoButtonRef}>
            <button
              onClick={(e) => {
                createRipple(e);
                setIsInfoOpen((prev) => !prev);
              }}
              className="relative overflow-hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 transition-all active:scale-95 cursor-pointer"
              title="Afficher les détails de la bibliothèque"
            >
              {ripples.map((ripple) => (
                <span
                  key={ripple.id}
                  className="absolute bg-white/25 rounded-full pointer-events-none animate-ripple"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: '50px',
                    height: '50px',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xs:inline">Infos ({mediaList.length})</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                  isInfoOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isInfoOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 mt-2 z-50 w-60 p-3 rounded-2xl bg-slate-950 border border-slate-700/80 shadow-2xl backdrop-blur-xl animate-in fade-in space-y-2 text-xs pointer-events-auto"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                    Statistiques locales
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono font-semibold">
                    {mediaList.length} fichiers
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Morceaux audio :</span>
                    <span className="font-semibold text-white">{audioList.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Vidéos :</span>
                    <span className="font-semibold text-white">{videoList.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Playlists créées :</span>
                    <span className="font-semibold text-white">{playlists.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="home-btn-import"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            title="Importer des fichiers ou dossiers"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Importer</span>
          </button>
          <button
            onClick={() => onRouteChange('search')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Rechercher"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRouteChange('settings')}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECTION: Continuer la lecture (Resume items) */}
      {resumeItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsResumeOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-xs font-semibold text-white transition-all cursor-pointer group"
              title={isResumeOpen ? 'Masquer' : 'Afficher'}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Continuer la lecture ({resumeItems.length})</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isResumeOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {isResumeOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
              {resumeItems.map((item) => {
                const progressPct = item.duration > 0 ? ((item.resumePosition || 0) / item.duration) * 100 : 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => playMedia(item)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                      <MediaThumbnail
                        thumbnail={item.thumbnail}
                        type={item.type}
                        title={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-blue-600/50 flex items-center justify-center transition-colors">
                        <Play className="w-5 h-5 fill-white text-white opacity-80 group-hover:opacity-100" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{item.artist}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-amber-400 font-mono">
                          {formatTime(item.resumePosition || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECTION: Récemment ajoutés */}
      {recentlyAdded.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsRecentOpen((prev) => !prev)}
              className="flex items-center gap-2 group cursor-pointer text-left"
              title={isRecentOpen ? 'Masquer' : 'Afficher'}
            >
              <h2 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                <span>Récemment ajoutés</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
                  {recentlyAdded.length}
                </span>
              </h2>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 ${
                  isRecentOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              onClick={() => onRouteChange('music')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isRecentOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-in fade-in duration-150">
              {recentlyAdded.map((item) => (
                <div
                  key={item.id}
                  onClick={() => playMedia(item, recentlyAdded)}
                  className="group flex flex-col p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-800 mb-2 flex items-center justify-center">
                    <MediaThumbnail
                      thumbnail={item.thumbnail}
                      type={item.type}
                      title={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                      {formatTime(item.duration)}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.artist}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION: Playlists */}
      {playlists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-blue-400" />
              <span>Vos playlists</span>
            </h2>
            <button
              onClick={() => onRouteChange('playlists')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>Voir tout</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {playlists.map((pl) => {
              const firstMediaId = pl.mediaIds.length > 0 ? pl.mediaIds[0] : null;
              const firstMedia = firstMediaId ? mediaList.find((m) => m.id === firstMediaId) : undefined;
              return (
                <div
                  key={pl.id}
                  onClick={() => onOpenPlaylist?.(pl.id)}
                  className="group flex flex-col p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
                >
                  <div className="aspect-square w-full rounded-lg bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 mb-2 flex items-center justify-center border border-slate-800/80 overflow-hidden relative">
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
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {pl.mediaIds.length} titre(s)
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recurrent Import Modal Dialog */}
      {showImportModal && (
        <ImportManager
          variant="modal"
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}
