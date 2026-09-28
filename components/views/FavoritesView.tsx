'use client';

import React, { useState } from 'react';
import { Heart, Music2, Film, Disc3, Play, ListMusic, Shuffle } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/metadata-parser';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';

type FavSubTab = 'all' | 'audio' | 'video' | 'albums';

export function FavoritesView({ onOpenAlbum }: { onOpenAlbum: (albumName: string) => void }) {
  const { mediaList, toggleFavorite } = useLibrary();
  const { playMedia } = usePlayer();

  const [activeTab, setActiveTab] = useState<FavSubTab>('all');

  const favorites = mediaList.filter((m) => m.isFavorite);
  const favAudio = favorites.filter((m) => m.type === 'audio');
  const favVideo = favorites.filter((m) => m.type === 'video');

  // Favorite albums (albums that have at least one favorited track)
  const favAlbumsMap = new Map<string, { album: string; artist: string; cover?: string; count: number }>();
  favAudio.forEach((t) => {
    const alb = t.album || 'Album inconnu';
    if (!favAlbumsMap.has(alb)) {
      favAlbumsMap.set(alb, { album: alb, artist: t.artist, cover: t.thumbnail, count: 0 });
    }
    const entry = favAlbumsMap.get(alb)!;
    entry.count += 1;
    if (!entry.cover && t.thumbnail) entry.cover = t.thumbnail;
  });
  const favAlbums = Array.from(favAlbumsMap.values());

  const displayedList =
    activeTab === 'audio'
      ? favAudio
      : activeTab === 'video'
      ? favVideo
      : favorites;

  const handlePlayAll = () => {
    if (displayedList.length > 0) {
      playMedia(displayedList[0], displayedList);
    }
  };

  const handleShuffleAll = () => {
    if (displayedList.length > 0) {
      const shuffled = [...displayedList].sort(() => Math.random() - 0.5);
      playMedia(shuffled[0], shuffled);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Heart className="w-7 h-7 text-rose-500 fill-current" />
            <span>Favoris</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {favorites.length} élément(s) favori(s)
          </p>

          {displayedList.length > 0 && activeTab !== 'albums' && (
            <div className="flex items-center gap-2 mt-3">
              <button
                id="fav-play-all-btn"
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Lire tout</span>
              </button>
              <button
                id="fav-shuffle-all-btn"
                onClick={handleShuffleAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Aléatoire</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'audio' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Musique ({favAudio.length})
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'video' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Vidéos ({favVideo.length})
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              activeTab === 'albums' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Albums ({favAlbums.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'albums' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {favAlbums.map((alb) => (
            <div
              key={alb.album}
              onClick={() => onOpenAlbum(alb.album)}
              className="group flex flex-col p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
            >
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-950 mb-2 flex items-center justify-center border border-slate-800">
                <MediaThumbnail
                  thumbnail={alb.cover}
                  type="audio"
                  title={alb.album}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {alb.album}
              </h4>
              <p className="text-[11px] text-slate-400">{alb.artist}</p>
            </div>
          ))}
        </div>
      ) : displayedList.length === 0 ? (
        <div className="py-20 text-center text-slate-500 max-w-sm mx-auto space-y-3">
          <Heart className="w-12 h-12 stroke-1 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">Aucun favori dans cette catégorie</h3>
          <p className="text-xs text-slate-400">
            Cliquez sur l&apos;icône en forme de cœur sur vos morceaux et vidéos pour les retrouver ici.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {displayedList.map((item) => (
            <div
              key={item.id}
              onClick={() => playMedia(item, displayedList)}
              className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                  <MediaThumbnail
                    thumbnail={item.thumbnail}
                    type={item.type}
                    title={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{item.artist}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">
                  {formatTime(item.duration)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  className="p-1.5 text-rose-500 hover:scale-110 transition-transform"
                  title="Retirer des favoris"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
