'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MediaItem, Playlist, PlayHistoryItem, LyricSegment, LyricsStatus } from '@/types/media';
import {
  getAllMediaFromDB,
  saveMediaBatchToDB,
  updateMediaInDB,
  deleteMediaFromDB,
  clearAllMediaFromDB,
  getAllPlaylistsFromDB,
  savePlaylistToDB,
  deletePlaylistFromDB,
  getHistoryFromDB,
  addHistoryToDB,
  clearHistoryFromDB,
  saveStoredDirectoryHandle,
  getStoredDirectoryHandle,
  updateMediaLyricsInDB,
  deleteMediaLyricsFromDB,
} from '@/lib/db';
import { processLocalFile } from '@/lib/metadata-parser';
import { createDemoAudioTracks, createDemoVideoClip } from '@/lib/demo-samples';
import { transcribeAudioWithGemini } from '@/lib/gemini-transcription';

export interface SmartPlaylistOptions {
  byGenre?: boolean;
  byYear?: boolean;
  byDecade?: boolean;
  byPlayCount?: boolean;
  byRecent?: boolean;
  byFavorites?: boolean;
  minTracks?: number;
}

interface LibraryContextType {
  mediaList: MediaItem[];
  playlists: Playlist[];
  history: PlayHistoryItem[];
  isLoading: boolean;
  isScanning: boolean;
  hasStoredDirectory: boolean;
  importFiles: (files: FileList | File[]) => Promise<number>;
  importDirectory: () => Promise<number>;
  reconnectStoredDirectory: () => Promise<number>;
  loadDemoSamples: () => Promise<number>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleAlbumFavorite: (albumName: string) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  clearAllLibrary: () => Promise<void>;
  createPlaylist: (title: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addMediaToPlaylist: (playlistId: string, mediaId: string) => Promise<void>;
  removeMediaFromPlaylist: (playlistId: string, mediaId: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>;
  clearPlayHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  recordPlayback: (media: MediaItem, position: number, completed?: boolean) => Promise<void>;
  updateResumePosition: (id: string, position: number) => Promise<void>;
  refreshLibraryAccess: () => Promise<void>;
  transcribeMediaLyrics: (id: string, force?: boolean) => Promise<boolean>;
  updateMediaLyrics: (id: string, segments: LyricSegment[]) => Promise<void>;
  deleteMediaLyrics: (id: string) => Promise<void>;
  updateMediaMetadata: (id: string, title: string, artist: string, album: string) => Promise<void>;
  autoGeneratePlaylists: (options?: SmartPlaylistOptions) => Promise<Playlist[]>;
  // Real-time search and filter functionality
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredMediaList: MediaItem[];
  filterMedia: (query: string, options?: { genre?: string; type?: 'audio' | 'video' }) => MediaItem[];
  genres: string[];
}

const LibraryContext = createContext<LibraryContextType | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [history, setHistory] = useState<PlayHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [hasStoredDirectory, setHasStoredDirectory] = useState(false);

  const mediaListRef = useRef<MediaItem[]>([]);
  useEffect(() => {
    mediaListRef.current = mediaList;
  }, [mediaList]);

  // Transcription functions
  const transcribeMediaLyrics = useCallback(async (id: string, force = false): Promise<boolean> => {
    const target = mediaListRef.current.find((m) => m.id === id);
    if (!target) return false;

    // Skip if already transcribed and not forced
    if (!force && target.lyrics && target.lyrics.length > 0 && target.lyricsStatus === 'completed') {
      return true;
    }

    // Set processing status
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lyricsStatus: 'processing', lyricsError: undefined } : m))
    );
    await updateMediaInDB(id, { lyricsStatus: 'processing', lyricsError: undefined });

    try {
      let fileBlob: Blob | File | null = target.file || null;
      if (!fileBlob && target.objectUrl) {
        try {
          const res = await fetch(target.objectUrl);
          fileBlob = await res.blob();
        } catch (fetchErr) {
          console.warn('Failed to fetch objectUrl blob:', fetchErr);
        }
      }

      if (!fileBlob) {
        throw new Error('Fichier audio non accessible pour la transcription.');
      }

      const result = await transcribeAudioWithGemini(
        fileBlob,
        target.title,
        target.artist,
        target.duration
      );

      await updateMediaLyricsInDB(
        id,
        result.segments,
        result.status,
        result.language,
        result.error
      );

      setMediaList((prev) =>
        prev.map((m) => {
          if (m.id === id) {
            return {
              ...m,
              lyrics: result.segments,
              lyricsStatus: result.status,
              lyricsLanguage: result.language,
              lyricsGeneratedAt: result.generatedAt || Date.now(),
              lyricsError: result.error,
            };
          }
          return m;
        })
      );
      return true;
    } catch (err) {
      const errMsg = (err as Error).message || 'Erreur transcription';
      await updateMediaInDB(id, { lyricsStatus: 'failed', lyricsError: errMsg });
      setMediaList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, lyricsStatus: 'failed', lyricsError: errMsg } : m))
      );
      return false;
    }
  }, []);

  const updateMediaLyrics = useCallback(async (id: string, segments: LyricSegment[]): Promise<void> => {
    await updateMediaLyricsInDB(id, segments, 'completed');
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, lyrics: segments, lyricsStatus: 'completed' } : m))
    );
  }, []);

  const deleteMediaLyrics = useCallback(async (id: string): Promise<void> => {
    await deleteMediaLyricsFromDB(id);
    setMediaList((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              lyrics: [],
              lyricsStatus: 'idle',
              lyricsLanguage: undefined,
              lyricsGeneratedAt: undefined,
              lyricsError: undefined,
            }
          : m
      )
    );
  }, []);

  const updateMediaMetadata = useCallback(async (id: string, title: string, artist: string, album: string): Promise<void> => {
    await updateMediaInDB(id, { title, artist, album });
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, title, artist, album } : m))
    );
  }, []);

  // Check stored directory handle
  useEffect(() => {
    getStoredDirectoryHandle().then((handle) => {
      setHasStoredDirectory(Boolean(handle));
    });
  }, []);

  // Load from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [savedMedia, savedPlaylists, savedHistory] = await Promise.all([
          getAllMediaFromDB(),
          getAllPlaylistsFromDB(),
          getHistoryFromDB(),
        ]);

        if (!isMounted) return;

        // Restore objectUrls from stored native File objects
        const hydratedMedia: MediaItem[] = savedMedia.map((item) => {
          if (item.file) {
            try {
              const objectUrl = URL.createObjectURL(item.file);
              return { ...item, objectUrl, isAccessible: true };
            } catch {
              return { ...item, isAccessible: false };
            }
          }
          return { ...item, isAccessible: false };
        });

        setMediaList(hydratedMedia);
        setPlaylists(savedPlaylists);
        setHistory(savedHistory);
      } catch (err) {
        console.error('Failed to load library from IndexedDB:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Import files
  const importFiles = useCallback(async (files: FileList | File[]): Promise<number> => {
    setIsScanning(true);
    try {
      const fileArray = Array.from(files);
      const mediaFiles = fileArray.filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        return ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'mp4', 'webm', 'mkv', 'mov', 'm4v'].includes(ext);
      });

      if (mediaFiles.length === 0) return 0;

      const newItems: MediaItem[] = [];
      for (const file of mediaFiles) {
        try {
          const item = await processLocalFile(file, (file as unknown as { webkitRelativePath?: string }).webkitRelativePath);
          newItems.push(item);
        } catch (err) {
          console.warn('Failed to parse file:', file.name, err);
        }
      }

      if (newItems.length > 0) {
        // Tag audio tracks with pending transcription status if not already present
        const itemsWithStatus = newItems.map((item) => {
          if (item.type === 'audio' && (!item.lyrics || item.lyrics.length === 0)) {
            return { ...item, lyricsStatus: 'pending' as LyricsStatus };
          }
          return item;
        });

        await saveMediaBatchToDB(itemsWithStatus);
        setMediaList((prev) => [...prev, ...itemsWithStatus]);

        // Background non-blocking auto-transcription queue for newly imported audio tracks
        const audioTracksToTranscribe = itemsWithStatus.filter((i) => i.type === 'audio');
        if (audioTracksToTranscribe.length > 0) {
          setTimeout(async () => {
            for (const item of audioTracksToTranscribe) {
              try {
                await transcribeMediaLyrics(item.id);
              } catch (e) {
                console.warn('Background auto-transcription failed for', item.title, e);
              }
            }
          }, 200);
        }
      }

      return newItems.length;
    } finally {
      setIsScanning(false);
    }
  }, [transcribeMediaLyrics]);

  // Import directory using File System Access API or directory input fallback
  const importDirectory = useCallback(async (): Promise<number> => {
    if (typeof window === 'undefined') return 0;

    // Feature detection for showDirectoryPicker
    if (typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        const files: File[] = [];

        async function readDir(handle: FileSystemDirectoryHandle, path = '') {
          for await (const entry of (handle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
            if (entry.kind === 'file') {
              const file = await (entry as FileSystemFileHandle).getFile();
              const ext = file.name.split('.').pop()?.toLowerCase() || '';
              if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'mp4', 'webm', 'mkv', 'mov'].includes(ext)) {
                // Attach path
                Object.defineProperty(file, 'webkitRelativePath', {
                  value: `${path}${file.name}`,
                  writable: true,
                });
                files.push(file);
              }
            } else if (entry.kind === 'directory') {
              await readDir(entry as FileSystemDirectoryHandle, `${path}${entry.name}/`);
            }
          }
        }

        await readDir(dirHandle);
        try {
          await saveStoredDirectoryHandle(dirHandle);
          setHasStoredDirectory(true);
        } catch {
          // ignore handle store failure
        }
        return await importFiles(files);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return 0;
        console.warn('Directory picker fallback needed:', err);
      }
    }

    // Fallback: trigger hidden input with webkitdirectory
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.onchange = async () => {
        if (input.files && input.files.length > 0) {
          const count = await importFiles(input.files);
          resolve(count);
        } else {
          resolve(0);
        }
      };
      input.click();
    });
  }, [importFiles]);

  // Reconnect and scan stored directory with permissions
  const reconnectStoredDirectory = useCallback(async (): Promise<number> => {
    try {
      const handle = await getStoredDirectoryHandle();
      if (!handle) return 0;

      const queryPerm = await (handle as unknown as { queryPermission?: (opts: { mode: string }) => Promise<string> }).queryPermission?.({ mode: 'read' });
      if (queryPerm !== 'granted') {
        const reqPerm = await (handle as unknown as { requestPermission?: (opts: { mode: string }) => Promise<string> }).requestPermission?.({ mode: 'read' });
        if (reqPerm !== 'granted') return 0;
      }

      const files: File[] = [];
      async function readDir(dir: FileSystemDirectoryHandle, path = '') {
        for await (const entry of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
          if (entry.kind === 'file') {
            const file = await (entry as FileSystemFileHandle).getFile();
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'mp4', 'webm', 'mkv', 'mov'].includes(ext)) {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: `${path}${file.name}`,
                writable: true,
              });
              files.push(file);
            }
          } else if (entry.kind === 'directory') {
            await readDir(entry as FileSystemDirectoryHandle, `${path}${entry.name}/`);
          }
        }
      }

      await readDir(handle);
      return await importFiles(files);
    } catch (err) {
      console.warn('Could not reconnect stored directory:', err);
      return 0;
    }
  }, [importFiles]);

  // Load demo samples
  const loadDemoSamples = useCallback(async (): Promise<number> => {
    const [audioDemos, videoDemo] = await Promise.all([
      createDemoAudioTracks(),
      createDemoVideoClip(),
    ]);

    const allDemos = [...audioDemos];
    if (videoDemo) allDemos.push(videoDemo);

    if (allDemos.length > 0) {
      await saveMediaBatchToDB(allDemos);
      setMediaList((prev) => [...prev, ...allDemos]);
    }

    return allDemos.length;
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (id: string) => {
    setMediaList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, isFavorite: !item.isFavorite };
          updateMediaInDB(id, { isFavorite: updated.isFavorite });
          return updated;
        }
        return item;
      })
    );
  }, []);

  // Toggle favorite for an entire album
  const toggleAlbumFavorite = useCallback(async (albumName: string) => {
    setMediaList((prev) => {
      const albumTracks = prev.filter((m) => (m.album || 'Album inconnu') === albumName);
      const allFavorited = albumTracks.length > 0 && albumTracks.every((m) => m.isFavorite);
      const targetState = !allFavorited;

      return prev.map((item) => {
        if ((item.album || 'Album inconnu') === albumName) {
          updateMediaInDB(item.id, { isFavorite: targetState });
          return { ...item, isFavorite: targetState };
        }
        return item;
      });
    });
  }, []);

  // Remove media
  const removeMedia = useCallback(async (id: string) => {
    await deleteMediaFromDB(id);
    setMediaList((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.objectUrl) {
        URL.revokeObjectURL(item.objectUrl);
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  // Clear entire library
  const clearLibrary = useCallback(async () => {
    await clearAllMediaFromDB();
    mediaList.forEach((m) => {
      if (m.objectUrl) URL.revokeObjectURL(m.objectUrl);
    });
    setMediaList([]);
  }, [mediaList]);

  // Playlists
  const createPlaylist = useCallback(async (title: string, description?: string): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      description,
      mediaIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await savePlaylistToDB(newPlaylist);
    setPlaylists((prev) => [...prev, newPlaylist]);
    return newPlaylist;
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    await deletePlaylistFromDB(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addMediaToPlaylist = useCallback(async (playlistId: string, mediaId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId && !p.mediaIds.includes(mediaId)) {
          const updated = {
            ...p,
            mediaIds: [...p.mediaIds, mediaId],
            updatedAt: Date.now(),
          };
          savePlaylistToDB(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  const removeMediaFromPlaylist = useCallback(async (playlistId: string, mediaId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          const updated = {
            ...p,
            mediaIds: p.mediaIds.filter((id) => id !== mediaId),
            updatedAt: Date.now(),
          };
          savePlaylistToDB(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  // Play history & resume
  const recordPlayback = useCallback(async (media: MediaItem, position: number, completed = false) => {
    const historyItem: PlayHistoryItem = {
      id: `history_${Date.now()}`,
      mediaId: media.id,
      mediaTitle: media.title,
      mediaArtist: media.artist,
      mediaType: media.type,
      thumbnail: media.thumbnail,
      duration: media.duration,
      position,
      playedAt: Date.now(),
      completed,
    };
    await addHistoryToDB(historyItem);
    setHistory((prev) => [historyItem, ...prev.filter((h) => h.mediaId !== media.id)].slice(0, 50));

    // Update play count & lastPlayedAt
    updateMediaInDB(media.id, {
      playCount: (media.playCount || 0) + 1,
      lastPlayedAt: Date.now(),
      resumePosition: position,
    });
    setMediaList((prev) =>
      prev.map((m) =>
        m.id === media.id
          ? { ...m, playCount: (m.playCount || 0) + 1, lastPlayedAt: Date.now(), resumePosition: position }
          : m
      )
    );
  }, []);

  const updateResumePosition = useCallback(async (id: string, position: number) => {
    await updateMediaInDB(id, { resumePosition: position });
    setMediaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, resumePosition: position } : m))
    );
  }, []);

  const reorderPlaylist = useCallback(async (playlistId: string, fromIndex: number, toIndex: number) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          const newMediaIds = [...p.mediaIds];
          const [moved] = newMediaIds.splice(fromIndex, 1);
          if (moved) {
            newMediaIds.splice(toIndex, 0, moved);
          }
          const updated = {
            ...p,
            mediaIds: newMediaIds,
            updatedAt: Date.now(),
          };
          savePlaylistToDB(updated);
          return updated;
        }
        return p;
      })
    );
  }, []);

  const refreshLibraryAccess = useCallback(async () => {
    setMediaList((prev) =>
      prev.map((item) => {
        if (item.file) {
          try {
            if (item.objectUrl) {
              URL.revokeObjectURL(item.objectUrl);
            }
            const objectUrl = URL.createObjectURL(item.file);
            return { ...item, objectUrl, isAccessible: true };
          } catch {
            return { ...item, isAccessible: false };
          }
        }
        return item;
      })
    );
  }, []);

  const clearPlayHistory = useCallback(async () => {
    await clearHistoryFromDB();
    setHistory([]);
  }, []);

  const autoGeneratePlaylists = useCallback(
    async (
      options: SmartPlaylistOptions = {
        byGenre: true,
        byYear: true,
        byPlayCount: true,
        byRecent: true,
        byFavorites: true,
        minTracks: 1,
      }
    ): Promise<Playlist[]> => {
      const newPlaylists: Playlist[] = [];
      const currentList = mediaListRef.current;
      const existingTitles = new Set(playlists.map((p) => p.title.toLowerCase()));
      const minTracks = options.minTracks || 1;

      // 1. Playlists par Genres musicaux
      if (options.byGenre !== false) {
        const genreMap = new Map<string, string[]>();
        currentList.forEach((m) => {
          if (m.type === 'audio' && m.genre && m.genre.trim() && m.genre.toLowerCase() !== 'inconnu') {
            const g = m.genre.trim();
            if (!genreMap.has(g)) genreMap.set(g, []);
            genreMap.get(g)!.push(m.id);
          }
        });

        for (const [genre, ids] of genreMap.entries()) {
          const title = `Mix ${genre}`;
          if (!existingTitles.has(title.toLowerCase()) && ids.length >= minTracks) {
            const pl: Playlist = {
              id: `playlist_genre_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title,
              description: `Playlist intelligente basée sur le genre musical ${genre} (${ids.length} titres)`,
              mediaIds: ids,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isSmart: true,
              smartType: 'genre',
              smartCriteria: genre,
            };
            await savePlaylistToDB(pl);
            newPlaylists.push(pl);
            existingTitles.add(title.toLowerCase());
          }
        }
      }

      // 2. Playlists par Année de sortie et Décennie
      if (options.byYear || options.byDecade) {
        const decadeMap = new Map<string, string[]>();
        const yearMap = new Map<number, string[]>();

        currentList.forEach((m) => {
          let yr = m.year;
          // Fallback: look for 4-digit year in filename or title
          if (!yr) {
            const match = (m.title + ' ' + (m.filename || '')).match(/\b(19\d\d|20\d\d)\b/);
            if (match) {
              const parsed = parseInt(match[1], 10);
              if (parsed >= 1950 && parsed <= 2030) yr = parsed;
            }
          }

          if (yr && yr >= 1950 && yr <= 2030) {
            // Group by year
            if (!yearMap.has(yr)) yearMap.set(yr, []);
            yearMap.get(yr)!.push(m.id);

            // Group by decade
            let decadeKey = '';
            if (yr >= 2020) decadeKey = 'Années 2020';
            else if (yr >= 2010) decadeKey = 'Années 2010';
            else if (yr >= 2000) decadeKey = 'Années 2000';
            else if (yr >= 1990) decadeKey = 'Années 90s';
            else if (yr >= 1980) decadeKey = 'Années 80s';
            else decadeKey = 'Classiques Rétro';

            if (!decadeMap.has(decadeKey)) decadeMap.set(decadeKey, []);
            decadeMap.get(decadeKey)!.push(m.id);
          }
        });

        // Add decade playlists
        for (const [decade, ids] of decadeMap.entries()) {
          const title = `Rétrospective ${decade}`;
          if (!existingTitles.has(title.toLowerCase()) && ids.length >= minTracks) {
            const pl: Playlist = {
              id: `playlist_decade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title,
              description: `Playlist intelligente regroupant les morceaux des ${decade} (${ids.length} titres)`,
              mediaIds: ids,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isSmart: true,
              smartType: 'year',
              smartCriteria: decade,
            };
            await savePlaylistToDB(pl);
            newPlaylists.push(pl);
            existingTitles.add(title.toLowerCase());
          }
        }

        // Add prominent specific year playlists (if >= minTracks)
        for (const [yr, ids] of yearMap.entries()) {
          if (ids.length >= Math.max(2, minTracks)) {
            const title = `Sélection ${yr}`;
            if (!existingTitles.has(title.toLowerCase())) {
              const pl: Playlist = {
                id: `playlist_year_${yr}_${Date.now()}`,
                title,
                description: `Morceaux sortis en ${yr} (${ids.length} titres)`,
                mediaIds: ids,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isSmart: true,
                smartType: 'year',
                smartCriteria: `${yr}`,
              };
              await savePlaylistToDB(pl);
              newPlaylists.push(pl);
              existingTitles.add(title.toLowerCase());
            }
          }
        }
      }

      // 3. Playlists par Nombre d'écoutes (Play Count)
      if (options.byPlayCount) {
        // A) Les plus écoutés (Top Hits)
        const mostPlayed = currentList
          .filter((m) => (m.playCount || 0) > 0)
          .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
          .slice(0, 30);

        const topTitle = 'Top Hits (Les Plus Écoutés)';
        if (!existingTitles.has(topTitle.toLowerCase()) && mostPlayed.length >= minTracks) {
          const pl: Playlist = {
            id: `playlist_top_hits_${Date.now()}`,
            title: topTitle,
            description: 'Vos morceaux favoris les plus fréquemment écoutés selon vos statistiques locales',
            mediaIds: mostPlayed.map((m) => m.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: true,
            smartType: 'playCount',
            smartCriteria: 'most_played',
          };
          await savePlaylistToDB(pl);
          newPlaylists.push(pl);
          existingTitles.add(topTitle.toLowerCase());
        }

        // B) Découvertes (Jamais Écoutés)
        const unplayed = currentList
          .filter((m) => !m.playCount || m.playCount === 0)
          .slice(0, 30);

        const unplayedTitle = 'Découvertes & Jamais Écoutés';
        if (!existingTitles.has(unplayedTitle.toLowerCase()) && unplayed.length >= minTracks) {
          const pl: Playlist = {
            id: `playlist_unplayed_${Date.now()}`,
            title: unplayedTitle,
            description: 'Redécouvrez des titres de votre bibliothèque que vous n\'avez pas encore écoutés',
            mediaIds: unplayed.map((m) => m.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: true,
            smartType: 'playCount',
            smartCriteria: 'unplayed',
          };
          await savePlaylistToDB(pl);
          newPlaylists.push(pl);
          existingTitles.add(unplayedTitle.toLowerCase());
        }

        // C) En boucle (Heavy Rotation >= 3 plays)
        const heavyRotation = currentList
          .filter((m) => (m.playCount || 0) >= 3)
          .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
          .slice(0, 25);

        const heavyTitle = 'En Boucle (Heavy Rotation)';
        if (!existingTitles.has(heavyTitle.toLowerCase()) && heavyRotation.length >= minTracks) {
          const pl: Playlist = {
            id: `playlist_heavy_${Date.now()}`,
            title: heavyTitle,
            description: 'Morceaux écoutés en boucle plusieurs fois récemment',
            mediaIds: heavyRotation.map((m) => m.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: true,
            smartType: 'playCount',
            smartCriteria: 'heavy_rotation',
          };
          await savePlaylistToDB(pl);
          newPlaylists.push(pl);
          existingTitles.add(heavyTitle.toLowerCase());
        }
      }

      // 4. Playlists des Derniers Ajouts (Récents)
      if (options.byRecent) {
        const sortedByAdded = [...currentList].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 30);
        const title = 'Derniers ajouts';
        if (!existingTitles.has(title.toLowerCase()) && sortedByAdded.length >= minTracks) {
          const pl: Playlist = {
            id: `playlist_recent_${Date.now()}`,
            title,
            description: 'Sélection automatique des derniers titres ajoutés à la bibliothèque locale',
            mediaIds: sortedByAdded.map((m) => m.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: true,
            smartType: 'recent',
            smartCriteria: 'latest',
          };
          await savePlaylistToDB(pl);
          newPlaylists.push(pl);
          existingTitles.add(title.toLowerCase());
        }
      }

      // 5. Playlists des Coups de Cœur (Favoris)
      if (options.byFavorites) {
        const favs = currentList.filter((m) => m.isFavorite);
        const title = 'Coups de Cœur';
        if (!existingTitles.has(title.toLowerCase()) && favs.length >= minTracks) {
          const pl: Playlist = {
            id: `playlist_favs_${Date.now()}`,
            title,
            description: 'Tous vos morceaux et médias préférés marqués comme favoris',
            mediaIds: favs.map((m) => m.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isSmart: true,
            smartType: 'favorites',
            smartCriteria: 'favorites',
          };
          await savePlaylistToDB(pl);
          newPlaylists.push(pl);
          existingTitles.add(title.toLowerCase());
        }
      }

      if (newPlaylists.length > 0) {
        setPlaylists((prev) => [...newPlaylists, ...prev]);
      }
      return newPlaylists;
    },
    [playlists]
  );

  // Real-time search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique genres across all media
  const genres = useMemo(() => {
    const set = new Set<string>();
    mediaList.forEach((m) => {
      if (m.genre && m.genre.trim()) {
        set.add(m.genre.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mediaList]);

  // Real-time filtering function supporting title, artist, album, genre, filename
  const filterMedia = useCallback(
    (query: string, options?: { genre?: string; type?: 'audio' | 'video' }): MediaItem[] => {
      const q = (query || '').trim().toLowerCase();
      return mediaList.filter((item) => {
        if (options?.type && item.type !== options.type) {
          return false;
        }
        if (options?.genre && options.genre !== 'all') {
          const itemGenre = (item.genre || '').toLowerCase();
          if (itemGenre !== options.genre.toLowerCase()) {
            return false;
          }
        }
        if (!q) return true;
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const artistMatch = (item.artist || '').toLowerCase().includes(q);
        const albumMatch = (item.album || '').toLowerCase().includes(q);
        const genreMatch = (item.genre || '').toLowerCase().includes(q);
        const filenameMatch = (item.filename || '').toLowerCase().includes(q);
        return titleMatch || artistMatch || albumMatch || genreMatch || filenameMatch;
      });
    },
    [mediaList]
  );

  // Real-time filtered media list reactive to searchQuery
  const filteredMediaList = useMemo(() => {
    if (!searchQuery.trim()) return mediaList;
    return filterMedia(searchQuery);
  }, [mediaList, searchQuery, filterMedia]);

  return (
    <LibraryContext.Provider
      value={{
        mediaList,
        playlists,
        history,
        isLoading,
        isScanning,
        hasStoredDirectory,
        importFiles,
        importDirectory,
        reconnectStoredDirectory,
        loadDemoSamples,
        toggleFavorite,
        toggleAlbumFavorite,
        removeMedia,
        clearLibrary,
        clearAllLibrary: clearLibrary,
        createPlaylist,
        deletePlaylist,
        addMediaToPlaylist,
        removeMediaFromPlaylist,
        reorderPlaylist,
        clearPlayHistory,
        clearHistory: clearPlayHistory,
        recordPlayback,
        updateResumePosition,
        refreshLibraryAccess,
        transcribeMediaLyrics,
        updateMediaLyrics,
        deleteMediaLyrics,
        updateMediaMetadata,
        autoGeneratePlaylists,
        searchQuery,
        setSearchQuery,
        filteredMediaList,
        filterMedia,
        genres,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
