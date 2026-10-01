'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';
import {
  Film,
  Play,
  ArrowUpDown,
  Search,
  Heart,
  MoreVertical,
  Info,
  Trash2,
  FilePlus,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { MediaItem } from '@/types/media';
import { formatTime, formatBytes } from '@/lib/metadata-parser';

type VideoSortField = 'title' | 'duration' | 'addedAt' | 'size' | 'resolution';

export function VideosView() {
  const { mediaList, toggleFavorite, removeMedia, importFiles, importDirectory, loadDemoSamples } = useLibrary();
  const { playMedia, setActiveMediaInfoItem } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<VideoSortField>('addedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Portal state for context menu dropdown overlay
  const [menuAnchor, setMenuAnchor] = useState<{ rect: DOMRect; video: MediaItem } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const videoList = useMemo(() => mediaList.filter((m) => m.type === 'video'), [mediaList]);

  const filteredVideos = useMemo(() => {
    return videoList
      .filter((v) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          v.filename.toLowerCase().includes(q) ||
          (v.folder && v.folder.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'title') cmp = a.title.localeCompare(b.title);
        else if (sortField === 'duration') cmp = a.duration - b.duration;
        else if (sortField === 'addedAt') cmp = a.addedAt - b.addedAt;
        else if (sortField === 'size') cmp = a.size - b.size;
        else if (sortField === 'resolution') cmp = (a.width || 0) * (a.height || 0) - (b.width || 0) * (b.height || 0);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [videoList, searchQuery, sortField, sortOrder]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await importFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Film className="w-7 h-7 text-amber-400" />
            <span>Vidéos locales</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {videoList.length} vidéo(s) disponible(s)
          </p>
        </div>

        {/* Search, Sort, Import */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher une vidéo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as VideoSortField)}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer"
            >
              <option value="addedAt" className="bg-slate-900">Récents</option>
              <option value="title" className="bg-slate-900">Nom</option>
              <option value="duration" className="bg-slate-900">Durée</option>
              <option value="size" className="bg-slate-900">Taille</option>
              <option value="resolution" className="bg-slate-900">Résolution</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="ml-1 text-blue-400 font-bold"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Ajouter vidéos</span>
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="py-20 text-center text-slate-500 max-w-md mx-auto space-y-4">
          <Film className="w-16 h-16 stroke-1 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">Aucune vidéo trouvée</h3>
          <p className="text-xs text-slate-400">
            Importez vos fichiers vidéo MP4, WebM, MKV ou MOV pour les lire avec le lecteur plein écran.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              Choisir des vidéos
            </button>
            <button
              onClick={() => loadDemoSamples()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Charger démo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video) => {
            const resumePct = video.duration > 0 && video.resumePosition
              ? (video.resumePosition / video.duration) * 100
              : 0;

            return (
              <div
                key={video.id}
                onClick={() => playMedia(video)}
                className="group flex flex-col p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer relative"
              >
                {/* Video Thumbnail with duration & progress bar */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 mb-2.5 flex items-center justify-center border border-slate-800/80">
                  <MediaThumbnail
                    thumbnail={video.thumbnail}
                    type="video"
                    title={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Play overlay button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Badges: Format & Duration */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-bold uppercase text-white/90">
                    {video.extension}
                  </span>

                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono text-white">
                    {formatTime(video.duration)}
                  </span>

                  {/* Resume Progress Bar at bottom of thumbnail */}
                  {resumePct > 0 && (
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${resumePct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Metadata & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatBytes(video.size)}</span>
                      {video.width && video.height && (
                        <span>• {video.width}×{video.height}</span>
                      )}
                    </div>
                    {video.resumePosition && video.resumePosition > 5 && (
                      <p className="text-[10px] text-amber-400 mt-0.5 font-medium">
                        Reprendre à {formatTime(video.resumePosition)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(video.id);
                      }}
                      className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
                        video.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Favori"
                    >
                      <Heart className={`w-4 h-4 ${video.isFavorite ? 'fill-current' : ''}`} />
                    </button>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuAnchor({ rect, video });
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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

      {/* React Portal for Videos Context Menu */}
      {isMounted && menuAnchor && createPortal(
        <>
          {/* Fullscreen transparent backdrop to catch click-outside */}
          <div
            className="fixed inset-0 z-[9998] bg-transparent pointer-events-auto"
            onClick={() => setMenuAnchor(null)}
          />

          <div
            className="fixed z-[9999] w-48 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1 text-xs text-slate-300 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
            style={{
              top: `${menuAnchor.rect.bottom + 220 > window.innerHeight
                ? Math.max(12, menuAnchor.rect.top - 220 - 6)
                : menuAnchor.rect.bottom + 6}px`,
              left: `${Math.max(12, Math.min(window.innerWidth - 200, menuAnchor.rect.left - 160))}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                playMedia(menuAnchor.video);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white text-left transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-blue-400" />
              <span>Lire la vidéo</span>
            </button>

            <button
              onClick={() => {
                toggleFavorite(menuAnchor.video.id);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white text-left transition-colors cursor-pointer"
            >
              <Heart className={`w-3.5 h-3.5 ${menuAnchor.video.isFavorite ? 'text-rose-500 fill-current' : 'text-slate-400'}`} />
              <span>{menuAnchor.video.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
            </button>

            <button
              onClick={() => {
                setActiveMediaInfoItem(menuAnchor.video);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-800 hover:text-white text-left transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Informations</span>
            </button>

            <div className="border-t border-slate-800 my-1" />

            <button
              onClick={() => {
                removeMedia(menuAnchor.video.id);
                setMenuAnchor(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-950/40 text-left transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Retirer de la bibliothèque</span>
            </button>
          </div>
        </>
      , document.body)}
    </div>
  );
}
