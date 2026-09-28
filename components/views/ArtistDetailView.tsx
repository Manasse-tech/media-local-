'use client';

import React from 'react';
import { ArrowLeft, Play, Shuffle, Users, Disc3, Clock } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { formatTime } from '@/lib/metadata-parser';

interface ArtistDetailViewProps {
  artistName: string;
  onBack: () => void;
  onOpenAlbum?: (albumName: string) => void;
}

export function ArtistDetailView({ artistName, onBack, onOpenAlbum }: ArtistDetailViewProps) {
  const { mediaList } = useLibrary();
  const { playMedia } = usePlayer();

  const artistTracks = mediaList.filter(
    (m) => m.type === 'audio' && (m.artist || 'Artiste inconnu') === artistName
  );

  // Group artist albums
  const albumsMap = new Map<string, { album: string; count: number; cover?: string }>();
  artistTracks.forEach((t) => {
    const alb = t.album || 'Album inconnu';
    if (!albumsMap.has(alb)) {
      albumsMap.set(alb, { album: alb, count: 0, cover: t.thumbnail });
    }
    const entry = albumsMap.get(alb)!;
    entry.count += 1;
    if (!entry.cover && t.thumbnail) entry.cover = t.thumbnail;
  });
  const albums = Array.from(albumsMap.values());

  const handlePlayAll = () => {
    if (artistTracks.length > 0) {
      playMedia(artistTracks[0], artistTracks);
    }
  };

  const handleShuffle = () => {
    if (artistTracks.length > 0) {
      const shuffled = [...artistTracks].sort(() => Math.random() - 0.5);
      playMedia(shuffled[0], shuffled);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Retour aux artistes</span>
      </button>

      {/* Artist Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-950 border border-slate-800/80">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-900 to-blue-900 shrink-0 shadow-2xl border-4 border-slate-800 flex items-center justify-center">
          <Users className="w-20 h-20 text-indigo-400" />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
            Artiste
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight truncate">
            {artistName}
          </h1>
          <p className="text-sm text-slate-300">
            {artistTracks.length} morceau(x) • {albums.length} album(s)
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Lecture complète</span>
            </button>

            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
              <span>Aléatoire</span>
            </button>
          </div>
        </div>
      </div>

      {/* Artist Albums */}
      {albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-white">Albums ({albums.length})</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {albums.map((alb) => (
              <div
                key={alb.album}
                onClick={() => onOpenAlbum?.(alb.album)}
                className="group flex flex-col p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-950 mb-2 flex items-center justify-center border border-slate-800">
                  {alb.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={alb.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <Disc3 className="w-10 h-10 text-slate-600" />
                  )}
                </div>
                <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                  {alb.album}
                </h4>
                <p className="text-[11px] text-slate-400">{alb.count} titre(s)</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Artist Tracks */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">Titres ({artistTracks.length})</h2>
        <div className="space-y-1">
          {artistTracks.map((track, idx) => (
            <div
              key={track.id}
              onClick={() => playMedia(track, artistTracks)}
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
                  <p className="text-[11px] text-slate-400 truncate">{track.album}</p>
                </div>
              </div>

              <span className="text-xs text-slate-400 font-mono">
                {formatTime(track.duration)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
