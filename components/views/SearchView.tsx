'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Music2, Film, Disc3, Users, ListMusic, Play, X, Zap } from 'lucide-react';
import { useLibrary } from '@/context/LibraryContext';
import { usePlayer } from '@/context/PlayerContext';
import { MediaItem } from '@/types/media';
import { formatTime } from '@/lib/metadata-parser';
import { searchEngine } from '@/lib/search-engine';
import { MediaThumbnail } from '@/components/media/MediaThumbnail';

interface SearchViewProps {
  onOpenAlbum: (albumName: string) => void;
  onOpenArtist: (artistName: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
}

export function SearchView({ onOpenAlbum, onOpenArtist, onOpenPlaylist }: SearchViewProps) {
  const { mediaList, playlists, searchQuery, setSearchQuery, filterMedia } = useLibrary();
  const { playMedia } = usePlayer();

  const query = searchQuery;
  const setQuery = setSearchQuery;

  // Update FlexSearch index when mediaList changes
  useEffect(() => {
    searchEngine.updateIndex(mediaList);
  }, [mediaList]);

  const q = query.trim();

  // FlexSearch Fuzzy Search Results
  const flexSearchResults = useMemo(() => {
    if (!q) return [];
    return searchEngine.search(q, 100);
  }, [q]);

  const matchingTracks = useMemo(() => {
    return flexSearchResults.filter((m) => m.type === 'audio');
  }, [flexSearchResults]);

  const matchingVideos = useMemo(() => {
    return flexSearchResults.filter((m) => m.type === 'video');
  }, [flexSearchResults]);

  const matchingAlbums = useMemo(() => {
    if (!q) return [];
    const map = new Map<string, { album: string; artist: string; cover?: string; tracks: MediaItem[] }>();
    mediaList.forEach((m) => {
      if (m.type === 'audio' && m.album && m.album.toLowerCase().includes(q)) {
        if (!map.has(m.album)) {
          map.set(m.album, { album: m.album, artist: m.artist, cover: m.thumbnail, tracks: [] });
        }
        map.get(m.album)!.tracks.push(m);
      }
    });
    return Array.from(map.values());
  }, [mediaList, q]);

  const matchingArtists = useMemo(() => {
    if (!q) return [];
    const map = new Map<string, { artist: string; count: number }>();
    mediaList.forEach((m) => {
      if (m.type === 'audio' && m.artist && m.artist.toLowerCase().includes(q)) {
        if (!map.has(m.artist)) {
          map.set(m.artist, { artist: m.artist, count: 0 });
        }
        map.get(m.artist)!.count += 1;
      }
    });
    return Array.from(map.values());
  }, [mediaList, q]);

  const matchingPlaylists = useMemo(() => {
    if (!q) return [];
    return playlists.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [playlists, q]);

  const totalResults =
    matchingTracks.length +
    matchingVideos.length +
    matchingAlbums.length +
    matchingArtists.length +
    matchingPlaylists.length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Search Input Bar */}
      <div className="relative max-w-2xl">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          placeholder="Rechercher morceaux, vidéos, albums, artistes, playlists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-sm text-white placeholder-slate-500 outline-none shadow-xl transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1.5 text-slate-400 hover:text-white absolute right-3 top-1/2 -translate-y-1/2 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!q ? (
        <div className="py-20 text-center text-slate-500 max-w-sm mx-auto space-y-3">
          <Search className="w-12 h-12 stroke-1 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">Recherche instantanée</h3>
          <p className="text-xs text-slate-400">
            Saisissez un nom de morceau, un album, un artiste ou une vidéo pour filtrer en temps réel.
          </p>
        </div>
      ) : totalResults === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <p className="text-sm">Aucun résultat trouvé pour &quot;{query}&quot;</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Results: Tracks */}
          {matchingTracks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Music2 className="w-4 h-4 text-blue-400" />
                <span>Morceaux ({matchingTracks.length})</span>
              </h2>

              <div className="space-y-1">
                {matchingTracks.slice(0, 6).map((track) => (
                  <div
                    key={track.id}
                    onClick={() => playMedia(track, matchingTracks)}
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-900/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <MediaThumbnail
                        thumbnail={track.thumbnail}
                        type="audio"
                        title={track.title}
                        className="w-10 h-10 rounded-lg shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {track.artist} • {track.album}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs text-slate-400 font-mono">
                      {formatTime(track.duration)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Videos */}
          {matchingVideos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Vidéos ({matchingVideos.length})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {matchingVideos.map((video) => (
                  <div
                    key={video.id}
                    onClick={() => playMedia(video)}
                    className="group flex flex-col p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 mb-2 flex items-center justify-center">
                      <MediaThumbnail
                        thumbnail={video.thumbnail}
                        type="video"
                        title={video.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {formatTime(video.duration)}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400">
                      {video.title}
                    </h4>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {matchingAlbums.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-purple-400" />
                <span>Albums ({matchingAlbums.length})</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {matchingAlbums.map((alb) => (
                  <div
                    key={alb.album}
                    onClick={() => onOpenAlbum(alb.album)}
                    className="group flex flex-col p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer"
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-950 mb-2 flex items-center justify-center">
                      {alb.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={alb.cover} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Disc3 className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400">
                      {alb.album}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{alb.artist}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {matchingArtists.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Artistes ({matchingArtists.length})</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {matchingArtists.map((art) => (
                  <div
                    key={art.artist}
                    onClick={() => onOpenArtist(art.artist)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-950 flex items-center justify-center text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400">
                        {art.artist}
                      </h4>
                      <p className="text-[10px] text-slate-400">{art.count} titre(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Playlists */}
          {matchingPlaylists.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-emerald-400" />
                <span>Playlists ({matchingPlaylists.length})</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {matchingPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => onOpenPlaylist(pl.id)}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 transition-all cursor-pointer group"
                  >
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400">
                      {pl.title}
                    </h4>
                    <p className="text-[10px] text-slate-400">{pl.mediaIds.length} titre(s)</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
